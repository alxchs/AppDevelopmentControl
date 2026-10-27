import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { computeHealthStatus, computeSddMaturityScore } from './evaluator.js';

const GIT_ENV = {
  ...process.env,
  GIT_CONFIG_GLOBAL: 'NUL',
  GIT_CONFIG_SYSTEM: 'NUL'
};

export class ProjectScanner {
  constructor(db, baseDir = 'c:\\desenv\\utils') {
    this.db = db;
    this.baseDir = baseDir;
  }

  scanAll() {
    const mainProjects = new Map(); // name -> { name, path, worktrees: [] }
    const candidateWorktrees = [];

    // 1. Ler todas as subpastas da pasta base
    if (fs.existsSync(this.baseDir)) {
      const entries = fs.readdirSync(this.baseDir, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        if (entry.name.startsWith('.') || entry.name.startsWith('_')) continue;
        if (entry.name === 'AppDevelopmentControl' || entry.name === 'ProjectsDashboard') continue;

        const pPath = path.join(this.baseDir, entry.name);
        const gitPath = path.join(pPath, '.git');

        let isWorktree = false;
        let targetMainName = null;

        if (fs.existsSync(gitPath)) {
          const stat = fs.statSync(gitPath);
          if (!stat.isDirectory()) {
            // É worktree git pelo arquivo .git
            isWorktree = true;
            try {
              const gitdirContent = fs.readFileSync(gitPath, 'utf8').trim();
              const match = gitdirContent.match(/gitdir:\s*(.+)/i);
              if (match) {
                const rawGitDir = match[1].replace(/\\/g, '/');
                const mainRepoMatch = rawGitDir.match(/(.*?)\/\.git/i);
                if (mainRepoMatch) {
                  targetMainName = path.basename(mainRepoMatch[1]);
                }
              }
            } catch (e) {}
          }
        }

        if (isWorktree) {
          candidateWorktrees.push({ name: entry.name, path: pPath, targetMainName });
        } else {
          mainProjects.set(entry.name, {
            name: entry.name,
            path: pPath,
            worktrees: []
          });
        }
      }
    }

    // 2. Associar as worktrees aos projetos principais
    for (const wt of candidateWorktrees) {
      let mainName = wt.targetMainName;
      if (!mainName || !mainProjects.has(mainName)) {
        const prefixMatch = wt.name.match(/^([a-zA-Z0-9]+)[-_]/);
        if (prefixMatch && mainProjects.has(prefixMatch[1])) {
          mainName = prefixMatch[1];
        }
      }

      if (mainName && mainProjects.has(mainName)) {
        mainProjects.get(mainName).worktrees.push(wt);
      } else {
        // Se não tem pai correspondente, trata como projeto autônomo
        mainProjects.set(wt.name, {
          name: wt.name,
          path: wt.path,
          worktrees: []
        });
      }
    }

    // 3. Pastas sem git com padrão <NomePrincipal>-<sufixo> também são vinculadas como worktrees/cópias
    for (const [name, p] of Array.from(mainProjects.entries())) {
      const prefixMatch = name.match(/^([a-zA-Z0-9]+)[-_]/);
      if (prefixMatch && mainProjects.has(prefixMatch[1]) && prefixMatch[1] !== name) {
        const parent = mainProjects.get(prefixMatch[1]);
        parent.worktrees.push({ name, path: p.path, targetMainName: prefixMatch[1] });
        mainProjects.delete(name);
      }
    }

    // 4. Incorporar caminhos customizados monitorados
    const customPaths = this.db.getMonitoredPaths();
    for (const cp of customPaths) {
      if (fs.existsSync(cp.path)) {
        const name = cp.label || path.basename(cp.path);
        if (!mainProjects.has(name)) {
          mainProjects.set(name, {
            name,
            path: cp.path,
            worktrees: [],
            isCustom: true
          });
        }
      }
    }

    // Limpar projetos legados no SQLite que eram apenas worktrees soltas
    const canonicalNames = Array.from(mainProjects.keys());
    this.db.clearNonCanonicalProjects(canonicalNames);

    // 5. Escanear cada projeto principal consolidado
    const results = [];
    for (const [name, projectDef] of mainProjects) {
      const info = this.scanCanonicalProject(projectDef);
      if (info) results.push(info);
    }

    return results;
  }

  scanCanonicalProject(projectDef) {
    try {
      const { name, path: projectPath, worktrees = [], isCustom = false } = projectDef;
      const gitPath = path.join(projectPath, '.git');
      const hasGit = fs.existsSync(gitPath);

      // Descobrir branches das worktrees
      const enrichedWorktrees = worktrees.map(wt => {
        let branch = 'worktree';
        try {
          const headPath = path.join(wt.path, '.git');
          if (fs.existsSync(headPath)) {
            // Se for arquivo .git, lê a ref
            const gitdirContent = fs.readFileSync(headPath, 'utf8').trim();
            const match = gitdirContent.match(/gitdir:\s*(.+)/i);
            if (match) {
              const headFile = path.join(match[1].trim(), 'HEAD');
              if (fs.existsSync(headFile)) {
                const headText = fs.readFileSync(headFile, 'utf8').trim();
                const refMatch = headText.match(/ref:\s*refs\/heads\/(.+)/);
                if (refMatch) branch = refMatch[1];
              }
            }
          }
        } catch (e) {}

        let lastModified = null;
        try {
          const stat = fs.statSync(wt.path);
          lastModified = stat.mtime.toISOString();
        } catch (e) {}

        return {
          name: wt.name,
          path: wt.path,
          branch,
          last_modified: lastModified
        };
      });

      // Extrair propósito (do projeto principal, ou fallback de alguma worktree)
      let { purpose, purposeSource } = this.extractPurpose(projectPath);
      if ((!purpose || purpose === 'Propósito não documentado') && worktrees.length > 0) {
        for (const wt of worktrees) {
          const wtPurpose = this.extractPurpose(wt.path);
          if (wtPurpose.purpose && wtPurpose.purpose !== 'Propósito não documentado') {
            purpose = wtPurpose.purpose;
            purposeSource = `${wtPurpose.purposeSource} (${wt.name})`;
            break;
          }
        }
      }

      // Extrair métricas Git a partir do projeto principal (evita duplicação!)
      const gitMetrics = hasGit ? this.extractGitMetrics(projectPath) : this.extractFsMetrics(projectPath);

      // Consolidar specs e ações do Alexandre do principal e de todas as worktrees
      const allPathsToScan = [{ path: projectPath, label: 'Principal' }, ...worktrees.map(w => ({ path: w.path, label: w.name }))];
      const { specs, alexandreActions } = this.consolidateSpecsAndActions(allPathsToScan, name);

      const totalSpecs = specs.length;
      const doneSpecs = specs.filter(s => s.status === 'done').length;
      const pendingSpecs = totalSpecs - doneSpecs;

      const projectRecord = {
        name,
        path: projectPath,
        type: 'main',
        purpose: purpose || 'Propósito não documentado',
        purpose_source: purposeSource,
        has_git: hasGit,
        created_local: gitMetrics.created_local,
        created_github: gitMetrics.created_github,
        github_url: gitMetrics.github_url,
        changes_24h: gitMetrics.changes_24h,
        changes_7d: gitMetrics.changes_7d,
        changes_30d: gitMetrics.changes_30d,
        changes_total: gitMetrics.changes_total,
        max_inactive_days: gitMetrics.max_inactive_days,
        days_since_last_change: gitMetrics.days_since_last_change,
        last_commit_date: gitMetrics.last_commit_date,
        last_commit_message: gitMetrics.last_commit_message,
        last_tag: gitMetrics.last_tag || null,
        last_tag_date: gitMetrics.last_tag_date || null,
        last_agent: gitMetrics.last_agent || null,
        total_specs: totalSpecs,
        done_specs: doneSpecs,
        pending_specs: pendingSpecs,
        alexandre_pending_count: alexandreActions.length,
        worktrees_count: enrichedWorktrees.length,
        is_custom: isCustom
      };

      // Avaliação de Saúde e Maturidade SDD
      const health = computeHealthStatus(projectRecord);
      const maturity = computeSddMaturityScore(projectRecord);

      projectRecord.health_status = health.status;
      projectRecord.health_reason = health.reason;
      projectRecord.sdd_score = maturity.score;

      // Persistir no SQLite
      this.db.upsertProject(projectRecord);
      this.db.saveWorktrees(name, enrichedWorktrees);
      this.db.saveSpecs(name, specs);
      this.db.saveAlexandreActions(name, alexandreActions);
      this.db.updateFtsIndex(name, projectRecord.purpose, specs, alexandreActions, enrichedWorktrees);

      return { ...projectRecord, worktrees: enrichedWorktrees };
    } catch (err) {
      console.error(`Erro ao escanear projeto ${projectDef.name}:`, err.message);
      return null;
    }
  }

  extractPurpose(projectPath) {
    const readmeCandidates = ['README.md', 'readme.md', 'Readme.md'];
    for (const r of readmeCandidates) {
      const rPath = path.join(projectPath, r);
      if (fs.existsSync(rPath)) {
        try {
          const content = fs.readFileSync(rPath, 'utf8');
          const lines = content.split('\n')
            .map(l => l.trim())
            .filter(l => l && !l.startsWith('#') && !l.startsWith('!') && !l.startsWith('[') && !l.startsWith('`') && !l.startsWith('---'));
          if (lines.length > 0) {
            return { purpose: lines[0].slice(0, 300), purposeSource: r };
          }
        } catch (e) {}
      }
    }

    const pkgPath = path.join(projectPath, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        if (pkg.description && typeof pkg.description === 'string' && pkg.description.trim()) {
          return { purpose: pkg.description.trim(), purposeSource: 'package.json' };
        }
      } catch (e) {}
    }

    const pubspecPath = path.join(projectPath, 'pubspec.yaml');
    if (fs.existsSync(pubspecPath)) {
      try {
        const content = fs.readFileSync(pubspecPath, 'utf8');
        const match = content.match(/^description:\s*(.+)$/m);
        if (match && match[1]) {
          return { purpose: match[1].trim(), purposeSource: 'pubspec.yaml' };
        }
      } catch (e) {}
    }

    try {
      const files = fs.readdirSync(projectPath);
      const csproj = files.find(f => f.endsWith('.csproj'));
      if (csproj) {
        const content = fs.readFileSync(path.join(projectPath, csproj), 'utf8');
        const descMatch = content.match(/<Description>([^<]+)<\/Description>/i);
        if (descMatch && descMatch[1]) {
          return { purpose: descMatch[1].trim(), purposeSource: csproj };
        }
      }
    } catch (e) {}

    return { purpose: 'Propósito não documentado', purposeSource: '' };
  }

  extractGitMetrics(projectPath) {
    const metrics = {
      created_local: null,
      created_github: null,
      github_url: null,
      changes_24h: 0,
      changes_7d: 0,
      changes_30d: 0,
      changes_total: 0,
      max_inactive_days: 0,
      days_since_last_change: 0,
      last_commit_date: null,
      last_commit_message: null,
      last_tag: null,
      last_tag_date: null,
      last_agent: null
    };

    try {
      try {
        const remote = execSync('git config --get remote.origin.url', {
          cwd: projectPath,
          encoding: 'utf8',
          env: GIT_ENV,
          stdio: ['ignore', 'pipe', 'ignore']
        }).trim();
        if (remote) metrics.github_url = remote;
      } catch (e) {}

      // Tags
      try {
        const tag = execSync('git describe --tags --abbrev=0', {
          cwd: projectPath,
          encoding: 'utf8',
          env: GIT_ENV,
          stdio: ['ignore', 'pipe', 'ignore']
        }).trim();
        if (tag) {
          metrics.last_tag = tag;
          try {
            const tagDate = execSync(`git log -1 --format=%aI ${tag}`, {
              cwd: projectPath,
              encoding: 'utf8',
              env: GIT_ENV,
              stdio: ['ignore', 'pipe', 'ignore']
            }).trim();
            if (tagDate) metrics.last_tag_date = tagDate;
          } catch (e) {}
        }
      } catch (e) {
        try {
          const tagList = execSync('git tag --sort=-creatordate', {
            cwd: projectPath,
            encoding: 'utf8',
            env: GIT_ENV,
            stdio: ['ignore', 'pipe', 'ignore']
          }).trim().split('\n').filter(t => t.trim());
          if (tagList.length > 0) {
            metrics.last_tag = tagList[0].trim();
          }
        } catch (err) {}
      }

      // Último agente / autor relevante
      try {
        const recentAuthors = execSync('git log -n 5 --format="%an %s"', {
          cwd: projectPath,
          encoding: 'utf8',
          env: GIT_ENV,
          stdio: ['ignore', 'pipe', 'ignore']
        });
        if (/claude/i.test(recentAuthors)) {
          metrics.last_agent = 'Claude Code';
        } else if (/antigravity|agy/i.test(recentAuthors)) {
          metrics.last_agent = 'Antigravity';
        } else if (/alexandre|alxch/i.test(recentAuthors)) {
          metrics.last_agent = 'Alexandre';
        } else {
          metrics.last_agent = 'Desenvolvedor';
        }
      } catch (e) {}

      try {
        const first = execSync('git log --reverse --format=%aI -n 1', {
          cwd: projectPath,
          encoding: 'utf8',
          env: GIT_ENV,
          stdio: ['ignore', 'pipe', 'ignore']
        }).trim();
        if (first) metrics.created_local = first;
      } catch (e) {}

      if (metrics.github_url) {
        try {
          const remoteFirst = execSync('git log --reverse --format=%aI origin/main -n 1', {
            cwd: projectPath,
            encoding: 'utf8',
            env: GIT_ENV,
            stdio: ['ignore', 'pipe', 'ignore']
          }).trim();
          if (remoteFirst) metrics.created_github = remoteFirst;
        } catch (e) {
          metrics.created_github = metrics.created_local;
        }
      }

      try {
        const lastOut = execSync('git log -n 1 --format=%aI%x1f%s', {
          cwd: projectPath,
          encoding: 'utf8',
          env: GIT_ENV,
          stdio: ['ignore', 'pipe', 'ignore']
        }).trim();
        if (lastOut) {
          const parts = lastOut.split('\x1f');
          metrics.last_commit_date = parts[0] || null;
          metrics.last_commit_message = parts[1] || null;
        }
      } catch (e) {}

      try {
        const allTimestampsStr = execSync('git log --format=%at', {
          cwd: projectPath,
          encoding: 'utf8',
          env: GIT_ENV,
          stdio: ['ignore', 'pipe', 'ignore']
        }).trim();

        if (allTimestampsStr) {
          const rawList = allTimestampsStr.split('\n')
            .map(t => parseInt(t.trim(), 10))
            .filter(t => !isNaN(t));

          metrics.changes_total = rawList.length;

          const nowSec = Math.floor(Date.now() / 1000);
          const sec24h = 24 * 3600;
          const sec7d = 7 * sec24h;
          const sec30d = 30 * sec24h;

          metrics.changes_24h = rawList.filter(t => (nowSec - t) <= sec24h).length;
          metrics.changes_7d = rawList.filter(t => (nowSec - t) <= sec7d).length;
          metrics.changes_30d = rawList.filter(t => (nowSec - t) <= sec30d).length;

          const chronological = [...rawList].reverse();
          let maxGapSec = 0;
          for (let i = 1; i < chronological.length; i++) {
            const gap = chronological[i] - chronological[i - 1];
            if (gap > maxGapSec) {
              maxGapSec = gap;
            }
          }
          metrics.max_inactive_days = Math.floor(maxGapSec / sec24h);

          if (metrics.last_commit_date) {
            const lastMs = new Date(metrics.last_commit_date).getTime();
            metrics.days_since_last_change = Math.max(0, Math.floor((Date.now() - lastMs) / (1000 * 86400)));
          }
        }
      } catch (e) {}
    } catch (err) {
      console.error(`Erro nas métricas git de ${projectPath}:`, err.message);
    }

    return metrics;
  }

  extractFsMetrics(projectPath) {
    try {
      const stat = fs.statSync(projectPath);
      const created = (stat.birthtime || stat.ctime || new Date()).toISOString();
      const lastModified = (stat.mtime || new Date()).toISOString();
      const daysSince = Math.max(0, Math.floor((Date.now() - new Date(lastModified).getTime()) / (1000 * 86400)));

      return {
        created_local: created,
        created_github: null,
        github_url: null,
        changes_24h: 0,
        changes_7d: 0,
        changes_30d: 0,
        changes_total: 0,
        max_inactive_days: 0,
        days_since_last_change: daysSince,
        last_commit_date: lastModified,
        last_commit_message: 'Diretório sem Git'
      };
    } catch (e) {
      return {
        created_local: null,
        created_github: null,
        github_url: null,
        changes_24h: 0,
        changes_7d: 0,
        changes_30d: 0,
        changes_total: 0,
        max_inactive_days: 0,
        days_since_last_change: 0,
        last_commit_date: null,
        last_commit_message: null
      };
    }
  }

  consolidateSpecsAndActions(pathsToScan, projectName) {
    const specsMap = new Map(); // spec_id -> spec
    const actions = [];
    const seenActionKeys = new Set();

    for (const { path: pPath, label } of pathsToScan) {
      // 1. DECISIONS.md
      const decisionsPath = path.join(pPath, 'DECISIONS.md');
      if (fs.existsSync(decisionsPath)) {
        try {
          const dContent = fs.readFileSync(decisionsPath, 'utf8');
          const lines = dContent.split('\n');
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (/PENDING DECISION|Aguardando Alexandre|Decisão.*Alexandre/i.test(line)) {
              const snippet = lines.slice(Math.max(0, i - 1), Math.min(lines.length, i + 3)).join(' ').trim();
              const title = line.replace(/[#*_-]/g, '').trim() || 'Decisão pendente em DECISIONS.md';
              const key = `${title}_${snippet.slice(0, 50)}`;
              if (!seenActionKeys.has(key)) {
                seenActionKeys.add(key);
                actions.push({
                  file_path: 'DECISIONS.md',
                  title,
                  snippet: snippet.slice(0, 200),
                  source_worktree: label !== 'Principal' ? label : null
                });
              }
            }
          }
        } catch (e) {}
      }

      // 2. docs/specs
      const specsDir = path.join(pPath, 'docs', 'specs');
      if (fs.existsSync(specsDir) && fs.statSync(specsDir).isDirectory()) {
        try {
          const entries = fs.readdirSync(specsDir, { withFileTypes: true }).filter(d => d.isDirectory());
          for (const entry of entries) {
            const specFolder = entry.name;
            const tasksPath = path.join(specsDir, specFolder, 'tasks.md');
            const specPath = path.join(specsDir, specFolder, 'spec.md');

            let totalTasks = 0;
            let completedTasks = 0;
            let pendingTasks = 0;
            let status = 'pending';
            let summary = '';

            if (fs.existsSync(specPath)) {
              try {
                const specContent = fs.readFileSync(specPath, 'utf8');
                const titleMatch = specContent.match(/^#\s*(.+)$/m);
                if (titleMatch) summary = titleMatch[1].trim();

                if (/PENDING DECISION|Aguardando Alexandre|Aprovação Alexandre/i.test(specContent)) {
                  const title = `Aprovação/Decisão Pendente em ${specFolder}`;
                  const key = `${specFolder}_${title}`;
                  if (!seenActionKeys.has(key)) {
                    seenActionKeys.add(key);
                    actions.push({
                      spec_id: specFolder,
                      file_path: `docs/specs/${specFolder}/spec.md`,
                      title,
                      snippet: summary,
                      source_worktree: label !== 'Principal' ? label : null
                    });
                  }
                }
              } catch (e) {}
            }

            if (fs.existsSync(tasksPath)) {
              try {
                const tasksContent = fs.readFileSync(tasksPath, 'utf8');
                const allBoxes = tasksContent.match(/- \[[ xX]\]/g) || [];
                const pendingBoxes = tasksContent.match(/- \[ \]/g) || [];

                totalTasks = allBoxes.length;
                pendingTasks = pendingBoxes.length;
                completedTasks = totalTasks - pendingTasks;

                if (totalTasks > 0 && pendingTasks === 0) {
                  status = 'done';
                } else {
                  status = 'pending';
                }

                const taskLines = tasksContent.split('\n');
                for (const tl of taskLines) {
                  if (/- \[[ ]\]/i.test(tl) && /Alexandre|Aprovação|Decisão/i.test(tl)) {
                    const title = tl.replace(/^- \[[ ]\]\s*/, '').trim();
                    const key = `${specFolder}_${title}`;
                    if (!seenActionKeys.has(key)) {
                      seenActionKeys.add(key);
                      actions.push({
                        spec_id: specFolder,
                        file_path: `docs/specs/${specFolder}/tasks.md`,
                        title,
                        snippet: `Spec ${specFolder}: Tarefa pendente dependendo do Alexandre`,
                        source_worktree: label !== 'Principal' ? label : null
                      });
                    }
                  }
                }
              } catch (e) {}
            }

            // Não sobrescrever spec existente se já foi concluída no principal
            if (!specsMap.has(specFolder) || (status === 'done' && specsMap.get(specFolder).status !== 'done')) {
              specsMap.set(specFolder, {
                spec_id: specFolder,
                spec_name: summary || specFolder,
                status,
                total_tasks: totalTasks,
                completed_tasks: completedTasks,
                pending_tasks: pendingTasks,
                summary,
                source_worktree: label !== 'Principal' ? label : null
              });
            }
          }
        } catch (e) {}
      }
    }

    return { specs: Array.from(specsMap.values()), alexandreActions: actions };
  }
}
