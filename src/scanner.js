import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { computeHealthStatus, computeSddMaturityScore } from './evaluator.js';
import { readProductionControl, mapToLegacy, computeProductionMetrics } from './production.js';

const SPECS_MASTER_CANDIDATES = ['docs/specs/SPECS.md', 'SPECS.md', 'docs/SPECS.md'];

const GIT_ENV = {
  ...process.env,
  GIT_CONFIG_GLOBAL: 'NUL',
  GIT_CONFIG_SYSTEM: 'NUL'
};

export class ProjectScanner {
  constructor(db, baseDir = 'c:\\desenv\\utils', opts = {}) {
    this.db = db;
    this.baseDir = baseDir;
    this.nowIso = opts.now || (() => new Date().toISOString()); // relogio injetavel (testes deterministicos)
  }

  safeGit(args, cwd) {
    try {
      const res = spawnSync('git', args, {
        cwd,
        encoding: 'utf8',
        env: GIT_ENV,
        maxBuffer: 10 * 1024 * 1024,
        stdio: ['ignore', 'pipe', 'ignore']
      });
      return res.status === 0 ? (res.stdout || '').trim() : '';
    } catch (e) {
      return '';
    }
  }

  scanSingleProject(projectPath, label, isCustom = false) {
    const name = label || path.basename(projectPath);
    return this.scanCanonicalProject({
      name,
      path: projectPath,
      worktrees: [],
      isCustom
    });
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

    // Limpar projetos legados no SQLite que não existem fisicamente ou eram worktrees
    const canonicalNames = Array.from(mainProjects.keys());
    this.db.purgeNonExistentProjects(canonicalNames);

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

      // Detecção de Stack Tecnológica
      const stack = this.detectStack(projectPath);

      // Metadados do AGENT_CONTEXT.md
      const agentContext = this.extractAgentContext(projectPath);

      // Governança Documental (Doc Health)
      const docHealth = this.extractDocHealth(projectPath);

      // Extrair comandos úteis (build, test, run)
      const commands = this.extractCommands(projectPath);

      // Extrair propósito (AGENT_CONTEXT -> README -> Package -> Csproj)
      let { purpose, purposeSource } = this.extractPurpose(projectPath, agentContext);
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

      // Commits Recentes (últimos 5)
      const recentCommits = hasGit ? this.extractRecentCommits(projectPath, 5) : [];

      // Status da Árvore de Trabalho (Clean vs Dirty)
      const treeStatus = hasGit ? this.checkWorkingTreeStatus(projectPath) : { is_clean: true, uncommitted_count: 0 };

      // Consolidar specs e ações do Alexandre do principal e de todas as worktrees
      const allPathsToScan = [{ path: projectPath, label: 'Principal' }, ...worktrees.map(w => ({ path: w.path, label: w.name }))];
      const legacy = this.consolidateSpecsAndActions(allPathsToScan, name);
      let { specs, specsMetrics } = legacy;
      const { alexandreActions } = legacy; // decisoes pendentes nao estao no control.json: sempre da leitura atual

      // Controle de producao v2 (SPEC-0007): principal primeiro, worktree so como fallback (D-006). Aceito
      // (valido ou valido com alertas) vence o SPECS.md (FR-012); rejeitado/ausente: caminho da spec 006 intacto.
      const production = this.resolveProduction(projectPath, worktrees);
      const accepted = production.prod.status === 'valid' || production.prod.status === 'valid_with_alerts';
      if (accepted) {
        const mapped = mapToLegacy(production.prod.control);
        specs = mapped.specs.map(s => ({ ...s, source_worktree: production.sourceWorktree }));
        specsMetrics = mapped.specsMetrics;
      }
      const specsSource = accepted
        ? (production.sourceWorktree ? 'production_v2_worktree' : 'production_v2')
        : (this.hasSpecsMaster(allPathsToScan) ? 'specs_md' : 'none');

      const totalSpecs = specsMetrics?.total_specs || specs.length;
      const doneSpecs = specsMetrics?.finalizadas?.quantidade !== undefined ? specsMetrics.finalizadas.quantidade : specs.filter(s => s.status === 'done').length;
      const pendingSpecs = Math.max(0, totalSpecs - doneSpecs);

      const totalPoints = specsMetrics?.total_pontos || specs.reduce((acc, s) => acc + (s.weight || 1), 0);
      const donePoints = specsMetrics?.finalizadas?.pontos !== undefined ? specsMetrics.finalizadas.pontos : specs.filter(s => s.status === 'done').reduce((acc, s) => acc + (s.weight || 1), 0);
      const pendingPoints = Math.max(0, totalPoints - donePoints);

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
        last_agent: gitMetrics.last_agent || (recentCommits[0]?.agent) || null,
        stack,
        current_phase: agentContext.current_phase || null,
        next_action: agentContext.next_action || null,
        last_decision: agentContext.last_decision || null,
        worktree_clean: treeStatus.is_clean ? 1 : 0,
        uncommitted_count: treeStatus.uncommitted_count,
        doc_health: docHealth,
        commands,
        total_specs: totalSpecs,
        done_specs: doneSpecs,
        pending_specs: pendingSpecs,
        total_points: totalPoints,
        done_points: donePoints,
        pending_points: pendingPoints,
        specs_summary_json: specsMetrics ? JSON.stringify(specsMetrics) : null,
        alexandre_pending_count: alexandreActions.length,
        worktrees_count: enrichedWorktrees.length,
        is_custom: isCustom
      };

      // Avaliação de Saúde e Maturidade SDD
      const health = computeHealthStatus(projectRecord);
      const maturity = computeSddMaturityScore(projectRecord);
      const pipelineStage = this.computePipelineStage(projectRecord);

      projectRecord.health_status = health.status;
      projectRecord.health_reason = health.reason;
      projectRecord.sdd_score = maturity.score;
      projectRecord.pipeline_stage = pipelineStage;

      // Persistir no SQLite
      this.db.upsertProject(projectRecord);
      this.db.saveWorktrees(name, enrichedWorktrees);
      this.db.saveSpecs(name, specs);
      this.db.saveAlexandreActions(name, alexandreActions);
      this.persistProduction(name, production, specsSource);
      this.db.saveRecentCommits(name, recentCommits);
      this.db.updateFtsIndex(name, projectRecord.purpose, specs, alexandreActions, enrichedWorktrees);

      return {
        ...projectRecord,
        worktrees: enrichedWorktrees,
        recent_commits: recentCommits,
        specs
      };
    } catch (err) {
      console.error(`Erro ao escanear projeto ${projectDef.name}:`, err.message);
      return null;
    }
  }

  // Le (somente leitura) o controle v2: o checkout principal primeiro; so se ele NAO tiver
  // docs/production/production-control.json, a primeira worktree (ordem de nome) que tiver. Nunca mescla (D-006).
  resolveProduction(projectPath, worktrees = []) {
    const main = readProductionControl(projectPath);
    if (main.found) return { prod: main, sourceWorktree: null };
    const sorted = [...worktrees].sort((a, b) => String(a.name).localeCompare(String(b.name)));
    for (const wt of sorted) {
      const r = readProductionControl(wt.path);
      if (r.found) return { prod: r, sourceWorktree: wt.name };
    }
    return { prod: main, sourceWorktree: null };
  }

  hasSpecsMaster(paths) {
    for (const { path: p } of paths) {
      for (const rel of SPECS_MASTER_CANDIDATES) {
        try { if (fs.existsSync(path.join(p, rel))) return true; } catch (e) { /* ilegivel: ignora */ }
      }
    }
    return false;
  }

  // Persiste a importacao v2 sem nunca derrubar o projeto (NFR-003): falha vira log e o resto segue.
  persistProduction(name, production, specsSource) {
    try {
      const { prod, sourceWorktree } = production;
      if (prod.status === 'valid' || prod.status === 'valid_with_alerts') {
        prod.metrics = computeProductionMetrics(prod.control, prod.events, prod.baseline, { now: this.nowIso(), issues: prod.issues, eventStats: prod.eventStats });
      }
      this.db.replaceProductionImport(name, prod, { sourceKind: sourceWorktree ? 'production_v2_worktree' : 'production_v2' });
      this.db.setSpecsSource(name, specsSource);
    } catch (e) {
      console.error(`Erro ao gravar producao v2 de ${name}:`, e.message);
    }
  }

  computePipelineStage(p) {
    if (p.alexandre_pending_count > 0) {
      return 'validation'; // 3. Aguardando validação / deliberação do Alexandre
    }
    if ((p.done_specs > 0 || (p.total_specs > 0 && p.pending_specs === 0)) && p.pending_specs === 0) {
      return 'stable'; // 4. Pronto / Publicado / Estável
    }
    if (
      (p.changes_7d > 0) ||
      (p.days_since_last_change !== undefined && p.days_since_last_change <= 7 && (p.pending_specs > 0 || p.changes_30d > 0)) ||
      (p.current_phase && /WIP|Execução|Andamento|Fase|Spec|F0/i.test(p.current_phase))
    ) {
      if (p.total_specs === 0 && !p.last_tag && (p.changes_total || 0) < 15) {
        return 'planning';
      }
      return 'active'; // 2. Em desenvolvimento ativo
    }
    if (p.days_since_last_change !== undefined && p.days_since_last_change > 30) {
      return 'idle'; // 5. Em espera / Hibernando
    }
    if ((p.total_specs > 0 && (p.done_specs || 0) === 0) || (p.total_specs === 0 && !p.last_tag)) {
      return 'planning'; // 1. Planejamento / Rascunho / Sem release
    }
    return 'idle'; // Em espera / Hibernando
  }

  extractCommands(projectPath) {
    const cmds = [];

    try {
      if (!fs.existsSync(projectPath)) return cmds;
      const files = fs.readdirSync(projectPath);

      // 1. Procurar em AGENTS.md
      const agentsPath = path.join(projectPath, 'AGENTS.md');
      if (fs.existsSync(agentsPath)) {
        try {
          const content = fs.readFileSync(agentsPath, 'utf8');
          const mkfileMatch = content.match(/mkfile\s+([a-zA-Z0-9_\-\.\/]+)?/i);
          if (mkfileMatch) {
            cmds.push(mkfileMatch[0].trim());
          }
          const testMatch = content.match(/(npm test|dotnet test|flutter test|pytest)/i);
          if (testMatch && !cmds.includes(testMatch[0].trim())) {
            cmds.push(testMatch[0].trim());
          }
        } catch (e) {}
      }

      // 2. Scripts dedicados na raiz
      if (files.includes('start.cmd') && !cmds.includes('start.cmd')) cmds.push('start.cmd');
      else if (files.includes('run.cmd') && !cmds.includes('run.cmd')) cmds.push('run.cmd');

      if (files.includes('build.cmd') && !cmds.includes('build.cmd')) cmds.push('build.cmd');

      // 3. Tecnologias canônicas
      if (!cmds.some(c => c.startsWith('mkfile') || c.startsWith('dotnet') || c.startsWith('npm'))) {
        if (files.some(f => f.endsWith('.dpr') || f.endsWith('.dpk'))) cmds.push('mkfile d');
        else if (files.some(f => f.endsWith('.sln') || f.endsWith('.slnx') || f.endsWith('.csproj'))) cmds.push('dotnet build');
        else if (files.includes('package.json')) cmds.push('npm test');
      }

      if (!cmds.some(c => c.includes('test'))) {
        if (files.includes('package.json') && !cmds.includes('npm test')) cmds.push('npm test');
        else if (files.some(f => f.endsWith('.sln') || f.endsWith('.csproj')) && !cmds.includes('dotnet test')) cmds.push('dotnet test');
      }
    } catch (e) {}

    return cmds;
  }

  detectStack(projectPath) {
    try {
      if (!fs.existsSync(projectPath)) return 'Indefinida';
      const files = fs.readdirSync(projectPath);

      // Delphi
      if (files.some(f => f.endsWith('.dpr') || f.endsWith('.dpk'))) {
        return 'Delphi (VCL/FMX)';
      }

      // Flutter
      if (files.includes('pubspec.yaml')) {
        try {
          const c = fs.readFileSync(path.join(projectPath, 'pubspec.yaml'), 'utf8');
          if (c.includes('flutter:')) return 'Flutter / Dart';
        } catch (e) {}
        return 'Dart';
      }

      // C# / .NET (reconhece .slnx, .sln, .csproj, subpasta backend)
      const hasDotNet = files.some(f => f.endsWith('.slnx') || f.endsWith('.sln') || f.endsWith('.csproj') || f === 'Directory.Build.props' || f.toLowerCase() === 'nuget.config') ||
        (fs.existsSync(path.join(projectPath, 'backend')) && fs.readdirSync(path.join(projectPath, 'backend')).some(f => f.endsWith('.sln') || f.endsWith('.slnx')));

      if (hasDotNet) {
        // Fullstack .NET + Frontend Web
        const hasFrontend = fs.existsSync(path.join(projectPath, 'frontend')) &&
          (fs.existsSync(path.join(projectPath, 'frontend', 'vite.config.ts')) || fs.existsSync(path.join(projectPath, 'frontend', 'package.json')));
        if (hasFrontend) {
          return '.NET / C# + Vite / React';
        }

        // WinUI 3 vs WPF vs .NET
        const hasWinUI = files.includes('Settings.XamlStyler') ||
          (fs.existsSync(path.join(projectPath, 'src')) && fs.readdirSync(path.join(projectPath, 'src')).some(f => f.endsWith('.xaml')));
        if (hasWinUI) {
          return 'C# / WinUI 3';
        }

        return 'C# / .NET';
      }

      // Node.js / TypeScript / Electron
      if (files.includes('package.json')) {
        try {
          const pkg = JSON.parse(fs.readFileSync(path.join(projectPath, 'package.json'), 'utf8'));
          const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
          if (deps['electron']) return 'Electron / Node.js';
          if (deps['typescript'] || files.includes('tsconfig.json')) return 'TypeScript / Node';
        } catch (e) {}
        return 'Node.js';
      }

      // Python
      if (files.includes('pyproject.toml') || files.includes('requirements.txt') || files.some(f => f.endsWith('.py'))) {
        return 'Python';
      }

      // Rust / Go / C++
      if (files.includes('Cargo.toml')) return 'Rust';
      if (files.includes('go.mod')) return 'Go';
      if (files.some(f => f.endsWith('.vcxproj') || f.endsWith('.cpp') || f.endsWith('.c'))) return 'C / C++';

      // Scripts PowerShell / Shell
      if (files.some(f => f.endsWith('.ps1') || f.endsWith('.cmd') || f.endsWith('.bat'))) {
        return 'PowerShell / Scripts';
      }

      return 'Utilitário';
    } catch (e) {
      return 'Indefinida';
    }
  }

  extractAgentContext(projectPath) {
    const context = {
      project: null,
      objective: null,
      current_phase: null,
      next_action: null,
      last_decision: null
    };

    const targetFile = path.join(projectPath, 'AGENT_CONTEXT.md');
    if (fs.existsSync(targetFile)) {
      try {
        const text = fs.readFileSync(targetFile, 'utf8');
        const projMatch = text.match(/PROJECT\s+([^\r\n]+)/i);
        if (projMatch) context.project = projMatch[1].trim();

        const objMatch = text.match(/OBJECTIVE\s+([^\r\n]+)/i);
        if (objMatch) context.objective = objMatch[1].trim();

        const phaseMatch = text.match(/CURRENT PHASE\s+([^\r\n]+)/i);
        if (phaseMatch) context.current_phase = phaseMatch[1].trim();

        const nextMatch = text.match(/NEXT ACTION\s+([^\r\n]+)/i);
        if (nextMatch) context.next_action = nextMatch[1].trim();

        const lastMatch = text.match(/LAST DECISION\s+([^\r\n]+)/i);
        if (lastMatch) context.last_decision = lastMatch[1].trim();
      } catch (e) {}
    } else {
      // Fallback: plano/STATUS.md ou STATUS.md
      const statusCandidates = ['plano/STATUS.md', 'STATUS.md'];
      for (const relStatus of statusCandidates) {
        const sPath = path.join(projectPath, relStatus);
        if (fs.existsSync(sPath)) {
          try {
            const sContent = fs.readFileSync(sPath, 'utf8');
            // Procurar ficha em andamento (🟦)
            const lines = sContent.split('\n');
            const inProgressLine = lines.find(l => l.includes('🟦') && l.includes('|'));
            if (inProgressLine) {
              const parts = inProgressLine.split('|').map(p => p.trim()).filter(p => p);
              if (parts.length >= 2) {
                const ficha = parts[0];
                const obs = parts[parts.length - 1] || '';
                context.current_phase = `Ficha em andamento: ${ficha}`;
                context.next_action = obs.slice(0, 150);
              }
            } else {
              // Se não houver em andamento, pegar a última aprovada (✅)
              const approvedLines = lines.filter(l => l.includes('✅') && l.includes('|'));
              if (approvedLines.length > 0) {
                const lastApproved = approvedLines[approvedLines.length - 1];
                const parts = lastApproved.split('|').map(p => p.trim()).filter(p => p);
                if (parts.length >= 2) {
                  context.current_phase = `Última ficha entregue: ${parts[0]}`;
                }
              }
            }
            if (context.current_phase) break;
          } catch (e) {}
        }
      }
    }

    return context;
  }

  extractDocHealth(projectPath) {
    const checkFile = (f) => fs.existsSync(path.join(projectPath, f));
    return {
      has_agents: checkFile('AGENTS.md'),
      has_agent_context: checkFile('AGENT_CONTEXT.md') || checkFile('plano/STATUS.md'),
      has_status: checkFile('STATUS.md') || checkFile('plano/STATUS.md'),
      has_decisions: checkFile('DECISIONS.md') || checkFile('docs/12-decisoes.md') || checkFile('docs/decisoes.md'),
      has_changelog: checkFile('CHANGELOG.md'),
      has_playbook: checkFile('docs/agents/PLAYBOOK.md') || checkFile('PLAYBOOK.md'),
      has_specs: fs.existsSync(path.join(projectPath, 'docs', 'specs')) || fs.existsSync(path.join(projectPath, 'plano', 'tarefas'))
    };
  }

  extractPurpose(projectPath, agentContext = null) {
    if (agentContext && agentContext.objective) {
      return { purpose: agentContext.objective.slice(0, 300), purposeSource: 'AGENT_CONTEXT.md' };
    }

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

  extractRecentCommits(projectPath, limit = 5) {
    const commits = [];
    try {
      const out = this.safeGit(['log', '-n', String(limit), '--format=%H|%h|%an|%ae|%aI|%ar|%s'], projectPath);

      if (out) {
        const lines = out.split('\n').filter(l => l.trim());
        for (const line of lines) {
          const [hash, short_hash, author_name, author_email, date_iso, date_relative, ...msgParts] = line.split('|');
          const message = msgParts.join('|');

          let agent = 'Alexandre';
          const combined = `${author_name} ${author_email} ${message}`.toLowerCase();
          if (combined.includes('claude')) {
            agent = 'Claude';
          } else if (combined.includes('antigravity') || combined.includes('agy')) {
            agent = 'AGY';
          } else if (combined.includes('alexandre') || combined.includes('alxch')) {
            agent = 'Alexandre';
          }

          commits.push({
            hash: hash || '',
            short_hash: short_hash || (hash ? hash.substring(0, 7) : ''),
            author_name: author_name || 'Desconhecido',
            agent,
            date_iso: date_iso || null,
            date_relative: date_relative || '',
            message: message || ''
          });
        }
      }
    } catch (e) {}
    return commits;
  }

  checkWorkingTreeStatus(projectPath) {
    try {
      const out = this.safeGit(['status', '--porcelain'], projectPath);

      if (!out) {
        return { is_clean: true, uncommitted_count: 0 };
      }
      const count = out.split('\n').filter(l => l.trim()).length;
      return { is_clean: count === 0, uncommitted_count: count };
    } catch (e) {
      return { is_clean: true, uncommitted_count: 0 };
    }
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
        const remote = this.safeGit(['config', '--get', 'remote.origin.url'], projectPath);
        if (remote) metrics.github_url = remote;
      } catch (e) {}

      // Tags
      try {
        const tag = this.safeGit(['describe', '--tags', '--abbrev=0'], projectPath);
        if (tag) {
          metrics.last_tag = tag;
          try {
            const tagDate = this.safeGit(['log', '-1', '--format=%aI', tag], projectPath);
            if (tagDate) metrics.last_tag_date = tagDate;
          } catch (e) {}
        }
      } catch (e) {
        try {
          const tagListOut = this.safeGit(['tag', '--sort=-creatordate'], projectPath);
          const tagList = tagListOut ? tagListOut.split('\n').filter(t => t.trim()) : [];
          if (tagList.length > 0) {
            metrics.last_tag = tagList[0].trim();
          }
        } catch (err) {}
      }

      // Último agente / autor relevante
      try {
        const recentAuthors = this.safeGit(['log', '-n', '5', '--format=%an %s'], projectPath);
        if (/claude/i.test(recentAuthors)) {
          metrics.last_agent = 'Claude';
        } else if (/antigravity|agy/i.test(recentAuthors)) {
          metrics.last_agent = 'AGY';
        } else if (/alexandre|alxch/i.test(recentAuthors)) {
          metrics.last_agent = 'Alexandre';
        } else {
          metrics.last_agent = 'Alexandre';
        }
      } catch (e) {}

      try {
        const first = this.safeGit(['log', '--reverse', '--format=%aI', '-n', '1'], projectPath);
        if (first) metrics.created_local = first;
      } catch (e) {}

      if (metrics.github_url) {
        try {
          const remoteFirst = this.safeGit(['log', '--reverse', '--format=%aI', 'origin/main', '-n', '1'], projectPath);
          if (remoteFirst) metrics.created_github = remoteFirst;
        } catch (e) {
          metrics.created_github = metrics.created_local;
        }
      }

      try {
        const lastOut = this.safeGit(['log', '-n', '1', '--format=%aI%x1f%s'], projectPath);
        if (lastOut) {
          const parts = lastOut.split('\x1f');
          metrics.last_commit_date = parts[0] || null;
          metrics.last_commit_message = parts[1] || null;
        }
      } catch (e) {}

      try {
        const allTimestampsStr = this.safeGit(['log', '--format=%at'], projectPath);

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

  parseSpecsIndex(projectPath) {
    const specsMasterCandidates = ['docs/specs/SPECS.md', 'SPECS.md', 'docs/SPECS.md'];
    for (const relSpecs of specsMasterCandidates) {
      const specsMasterPath = path.join(projectPath, relSpecs);
      if (fs.existsSync(specsMasterPath)) {
        try {
          const masterContent = fs.readFileSync(specsMasterPath, 'utf8');
          let metrics = null;
          const jsonMatch = masterContent.match(/```json\s*(\{[\s\S]*?\})\s*```/);
          if (jsonMatch) {
            try {
              const parsed = JSON.parse(jsonMatch[1]);
              metrics = parsed.metricas || parsed;
            } catch (e) {}
          }

          const specs = [];
          const tableLines = masterContent.split('\n');
          for (const line of tableLines) {
            if (line.includes('|')) {
              const cols = line.split('|').map(c => c.trim()).filter(c => c !== '');
              if (cols.length >= 4) {
                const idRaw = cols[0].replace(/[*_`]/g, '').trim();
                if (/^(ID|#|Spec|Código|---|:---:)/i.test(idRaw)) continue;

                const nameRaw = cols[1].replace(/[*_`]/g, '').trim();
                const weightRaw = parseInt(cols[2].replace(/[^\d]/g, ''), 10);
                const weight = (!isNaN(weightRaw) && weightRaw > 0) ? weightRaw : 1;
                const categoryRaw = cols[3].toLowerCase();

                let status = 'pending';
                let category = 'fila';
                if (/finalizad[ao]|concluíd[ao]|done|⚪|✅/i.test(categoryRaw)) {
                  status = 'done';
                  category = 'finalizada';
                } else if (/andamento|wip|progress|🔴|🟦/i.test(categoryRaw)) {
                  status = 'in_progress';
                  category = 'em_andamento';
                } else if (/dependendo|alexandre|mim|🟡|⏳/i.test(categoryRaw)) {
                  status = 'awaiting_alexandre';
                  category = 'dependendo_alexandre';
                } else if (/impedid[ao]|block|bloquead[ao]|⛔/i.test(categoryRaw)) {
                  status = 'blocked';
                  category = 'impedida';
                } else if (/inválid[ao]|descartad[ao]|cancelad[ao]|➖/i.test(categoryRaw)) {
                  status = 'invalid';
                  category = 'invalida';
                }

                specs.push({
                  id: idRaw,
                  name: nameRaw,
                  weight,
                  category,
                  status
                });
              }
            }
          }

          const total_specs = metrics?.total_specs || specs.length;
          const total_points = metrics?.total_pontos || specs.reduce((acc, s) => acc + (s.weight || 1), 0);
          const done_specs = metrics?.finalizadas?.qtd || specs.filter(s => s.status === 'done').length;
          const done_points = metrics?.finalizadas?.pontos || specs.filter(s => s.status === 'done').reduce((acc, s) => acc + (s.weight || 1), 0);
          const pending_specs = Math.max(0, total_specs - done_specs);
          const pending_points = Math.max(0, total_points - done_points);

          return {
            file_path: relSpecs,
            metrics,
            specs,
            total_specs,
            total_points,
            done_specs,
            done_points,
            pending_specs,
            pending_points
          };
        } catch (e) {}
      }
    }
    return null;
  }

  consolidateSpecsAndActions(pathsToScan, projectName) {
    const specsMap = new Map(); // spec_id -> spec
    const actions = [];
    const seenActionKeys = new Set();
    let detectedSpecsMetrics = null;

    for (const { path: pPath, label } of pathsToScan) {
      // 1. Decisões em caminhos conhecidos (DECISIONS.md, docs/12-decisoes.md, docs/decisoes.md)
      const decisionCandidates = ['DECISIONS.md', 'docs/12-decisoes.md', 'docs/decisoes.md', 'docs/DECISIONS.md'];
      for (const relDec of decisionCandidates) {
        const decisionsPath = path.join(pPath, relDec);
        if (fs.existsSync(decisionsPath)) {
          try {
            const dContent = fs.readFileSync(decisionsPath, 'utf8');
            const lines = dContent.split('\n');
            for (let i = 0; i < lines.length; i++) {
              const line = lines[i];
              // Detecta PENDING DECISION ou deliberação explicitamente pendente
              const isPendingDecision = /PENDING DECISION|Decisão pendente/i.test(line);
              const isAwaitingAlexandre = /Aguardando Alexandre/i.test(line) && !/APROVAD[AO]|autorizad[ao]|concluíd[ao]|Decisão do Alexandre:/i.test(line);

              if (isPendingDecision || isAwaitingAlexandre) {
                const snippet = lines.slice(Math.max(0, i - 1), Math.min(lines.length, i + 3)).join(' ').trim();
                let title = line.replace(/[#*_]/g, '').trim();
                // Tenta extrair o código da decisão (ex: D-26, D-27)
                const decMatch = title.match(/(D-?\d+[^—\(]*(?:\([^)]+\))?)/i);
                if (decMatch) {
                  title = decMatch[1].trim();
                } else if (title.length > 80) {
                  title = title.slice(0, 80) + '...';
                }
                const key = `${relDec}_${title.slice(0, 40)}`;
                if (!seenActionKeys.has(key)) {
                  seenActionKeys.add(key);
                  actions.push({
                    file_path: relDec,
                    title,
                    snippet: snippet.slice(0, 200),
                    source_worktree: label !== 'Principal' ? label : null
                  });
                }
              }
            }
          } catch (e) {}
        }
      }

      // 2. Bloqueios em FILA.md / docs/qualidade/FILA.md
      const filaCandidates = ['docs/qualidade/FILA.md', 'FILA.md', 'docs/FILA.md'];
      for (const relFila of filaCandidates) {
        const filaPath = path.join(pPath, relFila);
        if (fs.existsSync(filaPath)) {
          try {
            const fContent = fs.readFileSync(filaPath, 'utf8');
            const lines = fContent.split('\n');
            for (const line of lines) {
              if (/\[BLOQUEADO\]/i.test(line) && /Alexandre/i.test(line)) {
                const title = line.replace(/[#*_-]/g, '').replace(/\[BLOQUEADO\]/i, '').trim();
                const key = `${relFila}_${title}`;
                if (!seenActionKeys.has(key)) {
                  seenActionKeys.add(key);
                  actions.push({
                    file_path: relFila,
                    title: `Bloqueio: ${title}`,
                    snippet: line.trim().slice(0, 200),
                    source_worktree: label !== 'Principal' ? label : null
                  });
                }
              }
            }
          } catch (e) {}
        }
      }

      // 3. Status prévio de fichas de plano/STATUS.md
      const statusFichasMap = new Map();
      const statusCandidates = ['plano/STATUS.md', 'STATUS.md'];
      for (const relStatus of statusCandidates) {
        const sPath = path.join(pPath, relStatus);
        if (fs.existsSync(sPath)) {
          try {
            const sContent = fs.readFileSync(sPath, 'utf8');
            const lines = sContent.split('\n');
            for (const l of lines) {
              if (l.includes('|')) {
                const parts = l.split('|').map(p => p.trim()).filter(p => p);
                if (parts.length >= 2) {
                  const fichaName = parts[0].replace(/[*_`]/g, '').trim();
                  const icon = parts[1];
                  if (icon.includes('✅') || /aprovad[ao]/i.test(icon)) {
                    statusFichasMap.set(fichaName.toLowerCase(), 'done');
                  } else if (icon.includes('🟦') || /andamento/i.test(icon)) {
                    statusFichasMap.set(fichaName.toLowerCase(), 'in_progress');
                  }
                }
              }
            }
          } catch (e) {}
        }
      }

      // 4. docs/specs
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
            const pendingTasksList = [];

            let specWeight = 1;
            let isApprovedInHeader = false;

            if (fs.existsSync(specPath)) {
              try {
                const specContent = fs.readFileSync(specPath, 'utf8');
                const titleMatch = specContent.match(/^#\s*(.+)$/m);
                if (titleMatch) summary = titleMatch[1].trim();

                const pesoMatch = specContent.match(/Peso:\s*(\d+)/i);
                if (pesoMatch) {
                  specWeight = parseInt(pesoMatch[1], 10) || 1;
                }

                // Checa se já foi formalmente aprovada
                isApprovedInHeader = /Estado:\s*\*\*APROVAD[AO]\*\*|Status:\s*APROVAD[AO]|✅/i.test(specContent);
                if (isApprovedInHeader) {
                  status = 'done';
                }

                // Checa mapeamento em plano/STATUS.md
                const folderShort = specFolder.split('-')[0].toLowerCase();
                if (statusFichasMap.has(folderShort)) {
                  status = statusFichasMap.get(folderShort);
                }

                // Pendências reais do Alexandre em spec.md (descartando menções de aprovação passada ou decisões já capturadas em D-xx)
                const hasExplicitPendingDecision = /PENDING DECISION/i.test(specContent) && !/\((D-\d+)/i.test(specContent);
                const hasAguardandoAlexandre = /Aguardando Alexandre/i.test(specContent) && !/Estado:\s*\*\*APROVAD[AO]\*\*|aprovad[ao] pelo Alexandre|autorizado pelo Alexandre/i.test(specContent);

                if (hasExplicitPendingDecision || hasAguardandoAlexandre) {
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

                // Se houver caixas de tarefa, elas definem o status; senão preserva status de aprovação
                if (totalTasks > 0) {
                  status = pendingTasks === 0 ? 'done' : 'pending';
                } else if (isApprovedInHeader) {
                  status = 'done';
                }

                const taskLines = tasksContent.split('\n');
                for (const tl of taskLines) {
                  if (/- \[[ ]\]/i.test(tl)) {
                    const taskName = tl.replace(/^- \[[ ]\]\s*/, '').replace(/[*_`]/g, '').trim();
                    if (taskName && pendingTasksList.length < 5) {
                      pendingTasksList.push(taskName);
                    }
                    if (/Alexandre|Aprovação|Decisão/i.test(tl) && !/aprovad[ao]|autorizad[ao]/i.test(tl)) {
                      const title = taskName;
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
                }
              } catch (e) {}
            }

            // Não sobrescrever spec existente se já foi concluída no principal
            if (!specsMap.has(specFolder) || (status === 'done' && specsMap.get(specFolder).status !== 'done')) {
              const prev = specsMap.get(specFolder);
              specsMap.set(specFolder, {
                spec_id: specFolder,
                spec_name: summary || specFolder,
                status,
                weight: (prev && prev.weight > 1) ? prev.weight : specWeight,
                category: (prev && prev.category) ? prev.category : (status === 'done' ? 'finalizada' : 'em_andamento'),
                total_tasks: totalTasks,
                completed_tasks: completedTasks,
                pending_tasks: pendingTasks,
                pending_tasks_json: pendingTasksList,
                summary,
                source_worktree: label !== 'Principal' ? label : null
              });
            }
          }
        } catch (e) {}
      }

      // 5. Ingestão de docs/specs/SPECS.md ou SPECS.md (Mestre de Pesos e Categorias)
      const specsMasterCandidates = ['docs/specs/SPECS.md', 'SPECS.md', 'docs/SPECS.md'];
      for (const relSpecs of specsMasterCandidates) {
        const specsMasterPath = path.join(pPath, relSpecs);
        if (fs.existsSync(specsMasterPath)) {
          try {
            const masterContent = fs.readFileSync(specsMasterPath, 'utf8');
            // Bloco JSON estruturado
            const jsonMatch = masterContent.match(/```json\s*(\{[\s\S]*?\})\s*```/);
            if (jsonMatch) {
              try {
                const parsedJson = JSON.parse(jsonMatch[1]);
                if (parsedJson && parsedJson.metricas) {
                  if (!detectedSpecsMetrics || (parsedJson.metricas.total_specs || 0) >= (detectedSpecsMetrics.total_specs || 0)) {
                    detectedSpecsMetrics = parsedJson.metricas;
                  }
                }
              } catch (e) {}
            }

            // Tabela Mestra de Specs (ex: | **Q08** | Nome | 2 | ⚪ Finalizada | ...)
            const tableLines = masterContent.split('\n');
            for (const line of tableLines) {
              if (line.includes('|')) {
                const cols = line.split('|').map(c => c.trim()).filter(c => c !== '');
                if (cols.length >= 4) {
                  const idRaw = cols[0].replace(/[*_`]/g, '').trim();
                  if (/^(ID|#|Spec|Código|---|:---:)/i.test(idRaw)) continue;

                  const nameRaw = cols[1].replace(/[*_`]/g, '').trim();
                  const weightRaw = parseInt(cols[2].replace(/[^\d]/g, ''), 10);
                  const weight = (!isNaN(weightRaw) && weightRaw > 0) ? weightRaw : 1;
                  const categoryRaw = cols[3].toLowerCase();

                  let status = 'pending';
                  let category = 'fila';
                  if (/finalizad[ao]|concluíd[ao]|done|⚪|✅/i.test(categoryRaw)) {
                    status = 'done';
                    category = 'finalizada';
                  } else if (/andamento|wip|progress|🔴|🟦/i.test(categoryRaw)) {
                    status = 'in_progress';
                    category = 'em_andamento';
                  } else if (/dependendo|alexandre|mim|🟡|⏳/i.test(categoryRaw)) {
                    status = 'awaiting_alexandre';
                    category = 'dependendo_alexandre';
                  } else if (/impedid[ao]|block|bloquead[ao]|⛔/i.test(categoryRaw)) {
                    status = 'blocked';
                    category = 'impedida';
                  } else if (/inválid[ao]|descartad[ao]|cancelad[ao]|➖/i.test(categoryRaw)) {
                    status = 'invalid';
                    category = 'invalida';
                  }

                  // Normaliza o spec_id (tanto exato quanto compatível com pastas)
                  const cleanId = idRaw;
                  let matchedKey = null;
                  for (const key of specsMap.keys()) {
                    if (key.toLowerCase() === cleanId.toLowerCase() ||
                        key.toLowerCase().startsWith(cleanId.toLowerCase() + '-') ||
                        cleanId.toLowerCase().startsWith(key.toLowerCase() + '-')) {
                      matchedKey = key;
                      break;
                    }
                  }

                  if (matchedKey) {
                    const existing = specsMap.get(matchedKey);
                    existing.weight = weight;
                    existing.category = category;
                    if (status === 'done') existing.status = 'done';
                    else if (existing.status !== 'done' && status === 'in_progress') existing.status = 'in_progress';
                  } else {
                    specsMap.set(cleanId, {
                      spec_id: cleanId,
                      spec_name: nameRaw || cleanId,
                      status,
                      weight,
                      category,
                      total_tasks: 0,
                      completed_tasks: status === 'done' ? 1 : 0,
                      pending_tasks: status === 'done' ? 0 : 1,
                      pending_tasks_json: [],
                      summary: nameRaw,
                      source_worktree: label !== 'Principal' ? label : null
                    });
                  }
                }
              }
            }
          } catch (e) {}
        }
      }
    }

    return { specs: Array.from(specsMap.values()), alexandreActions: actions, specsMetrics: detectedSpecsMetrics };
  }
}
