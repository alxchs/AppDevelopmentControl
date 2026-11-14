import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class AppDb {
  constructor(customPath = null) {
    this.dbPath = customPath || this.resolveDbPath();
    this.db = new DatabaseSync(this.dbPath);
    this.init();
  }

  resolveDbPath() {
    const localDir = path.join(__dirname, '..');
    const localPath = path.join(localDir, 'app_development_control.db');
    try {
      const testDb = new DatabaseSync(localPath);
      testDb.exec('CREATE TABLE IF NOT EXISTS _test (id INT)');
      testDb.close();
      return localPath;
    } catch (e) {
      const tempBase = process.env.TEMP || 'C:\\temp';
      const appDataDir = path.join(tempBase, 'AppDevelopmentControl');
      if (!fs.existsSync(appDataDir)) {
        try { fs.mkdirSync(appDataDir, { recursive: true }); } catch (err) {}
      }
      return path.join(appDataDir, 'app_development_control.db');
    }
  }

  init() {
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;

      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        path TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'main',
        purpose TEXT,
        purpose_source TEXT,
        purpose_override INTEGER DEFAULT 0,
        has_git INTEGER DEFAULT 0,
        created_local TEXT,
        created_github TEXT,
        github_url TEXT,
        changes_24h INTEGER DEFAULT 0,
        changes_7d INTEGER DEFAULT 0,
        changes_30d INTEGER DEFAULT 0,
        changes_total INTEGER DEFAULT 0,
        max_inactive_days INTEGER DEFAULT 0,
        days_since_last_change INTEGER DEFAULT 0,
        last_commit_date TEXT,
        last_commit_message TEXT,
        total_specs INTEGER DEFAULT 0,
        done_specs INTEGER DEFAULT 0,
        pending_specs INTEGER DEFAULT 0,
        total_points INTEGER DEFAULT 0,
        done_points INTEGER DEFAULT 0,
        pending_points INTEGER DEFAULT 0,
        specs_summary_json TEXT,
        alexandre_pending_count INTEGER DEFAULT 0,
        worktrees_count INTEGER DEFAULT 0,
        health_status TEXT DEFAULT 'incubating',
        health_reason TEXT,
        sdd_score INTEGER DEFAULT 0,
        last_tag TEXT,
        last_tag_date TEXT,
        last_agent TEXT,
        stack TEXT,
        current_phase TEXT,
        next_action TEXT,
        last_decision TEXT,
        worktree_clean INTEGER DEFAULT 1,
        uncommitted_count INTEGER DEFAULT 0,
        doc_health TEXT,
        pipeline_stage TEXT DEFAULT 'idle',
        commands TEXT,
        last_scanned_at TEXT,
        is_custom INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS project_worktrees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_name TEXT NOT NULL,
        name TEXT NOT NULL,
        path TEXT NOT NULL,
        branch TEXT,
        last_modified TEXT,
        UNIQUE(project_name, path)
      );

      CREATE TABLE IF NOT EXISTS project_recent_commits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_name TEXT NOT NULL,
        hash TEXT NOT NULL,
        short_hash TEXT,
        author_name TEXT,
        agent TEXT,
        date_iso TEXT,
        date_relative TEXT,
        message TEXT,
        UNIQUE(project_name, hash)
      );

      CREATE TABLE IF NOT EXISTS project_specs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_name TEXT NOT NULL,
        spec_id TEXT NOT NULL,
        spec_name TEXT NOT NULL,
        status TEXT NOT NULL,
        weight INTEGER DEFAULT 1,
        category TEXT DEFAULT 'pending',
        total_tasks INTEGER DEFAULT 0,
        completed_tasks INTEGER DEFAULT 0,
        pending_tasks INTEGER DEFAULT 0,
        pending_tasks_json TEXT,
        summary TEXT,
        source_worktree TEXT,
        UNIQUE(project_name, spec_id)
      );

      CREATE TABLE IF NOT EXISTS alexandre_actions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_name TEXT NOT NULL,
        spec_id TEXT,
        file_path TEXT NOT NULL,
        title TEXT NOT NULL,
        snippet TEXT,
        source_worktree TEXT,
        detected_at TEXT
      );

      CREATE TABLE IF NOT EXISTS monitored_paths (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        path TEXT UNIQUE NOT NULL,
        label TEXT,
        created_at TEXT
      );

      CREATE VIRTUAL TABLE IF NOT EXISTS projects_fts USING fts5(
        project_name,
        purpose,
        specs_content,
        actions_content,
        worktrees_content,
        tokenize = 'unicode61'
      );
    `);

    // Migrações incrementais de colunas
    try { this.db.exec('ALTER TABLE projects ADD COLUMN total_points INTEGER DEFAULT 0'); } catch (e) {}
    try { this.db.exec('ALTER TABLE projects ADD COLUMN done_points INTEGER DEFAULT 0'); } catch (e) {}
    try { this.db.exec('ALTER TABLE projects ADD COLUMN pending_points INTEGER DEFAULT 0'); } catch (e) {}
    try { this.db.exec('ALTER TABLE projects ADD COLUMN specs_summary_json TEXT'); } catch (e) {}
    try { this.db.exec('ALTER TABLE project_specs ADD COLUMN weight INTEGER DEFAULT 1'); } catch (e) {}
    try { this.db.exec("ALTER TABLE project_specs ADD COLUMN category TEXT DEFAULT 'pending'"); } catch (e) {}
    try { this.db.exec('ALTER TABLE projects ADD COLUMN worktrees_count INTEGER DEFAULT 0'); } catch (e) {}
    try { this.db.exec('ALTER TABLE project_specs ADD COLUMN source_worktree TEXT'); } catch (e) {}
    try { this.db.exec('ALTER TABLE project_specs ADD COLUMN pending_tasks_json TEXT'); } catch (e) {}
    try { this.db.exec('ALTER TABLE alexandre_actions ADD COLUMN source_worktree TEXT'); } catch (e) {}
    try { this.db.exec("ALTER TABLE projects ADD COLUMN health_status TEXT DEFAULT 'incubating'"); } catch (e) {}
    try { this.db.exec('ALTER TABLE projects ADD COLUMN health_reason TEXT'); } catch (e) {}
    try { this.db.exec('ALTER TABLE projects ADD COLUMN sdd_score INTEGER DEFAULT 0'); } catch (e) {}
    try { this.db.exec('ALTER TABLE projects ADD COLUMN last_tag TEXT'); } catch (e) {}
    try { this.db.exec('ALTER TABLE projects ADD COLUMN last_tag_date TEXT'); } catch (e) {}
    try { this.db.exec('ALTER TABLE projects ADD COLUMN last_agent TEXT'); } catch (e) {}
    try { this.db.exec('ALTER TABLE projects ADD COLUMN stack TEXT'); } catch (e) {}
    try { this.db.exec('ALTER TABLE projects ADD COLUMN current_phase TEXT'); } catch (e) {}
    try { this.db.exec('ALTER TABLE projects ADD COLUMN next_action TEXT'); } catch (e) {}
    try { this.db.exec('ALTER TABLE projects ADD COLUMN last_decision TEXT'); } catch (e) {}
    try { this.db.exec('ALTER TABLE projects ADD COLUMN worktree_clean INTEGER DEFAULT 1'); } catch (e) {}
    try { this.db.exec('ALTER TABLE projects ADD COLUMN uncommitted_count INTEGER DEFAULT 0'); } catch (e) {}
    try { this.db.exec('ALTER TABLE projects ADD COLUMN doc_health TEXT'); } catch (e) {}
    try { this.db.exec("ALTER TABLE projects ADD COLUMN pipeline_stage TEXT DEFAULT 'idle'"); } catch (e) {}
    try { this.db.exec('ALTER TABLE projects ADD COLUMN commands TEXT'); } catch (e) {}
  }

  purgeNonExistentProjects(existingNames) {
    if (!existingNames || existingNames.length === 0) return;
    const placeholders = existingNames.map(() => '?').join(',');
    this.db.prepare(`DELETE FROM projects WHERE name NOT IN (${placeholders})`).run(...existingNames);
    this.db.prepare(`DELETE FROM project_specs WHERE project_name NOT IN (${placeholders})`).run(...existingNames);
    this.db.prepare(`DELETE FROM alexandre_actions WHERE project_name NOT IN (${placeholders})`).run(...existingNames);
    this.db.prepare(`DELETE FROM project_worktrees WHERE project_name NOT IN (${placeholders})`).run(...existingNames);
    this.db.prepare(`DELETE FROM project_recent_commits WHERE project_name NOT IN (${placeholders})`).run(...existingNames);
    this.db.prepare(`DELETE FROM projects_fts WHERE project_name NOT IN (${placeholders})`).run(...existingNames);
  }

  clearNonCanonicalProjects(canonicalNames) {
    this.purgeNonExistentProjects(canonicalNames);
  }

  upsertProject(p) {
    const existing = this.db.prepare('SELECT purpose_override, purpose FROM projects WHERE name = ?').get(p.name);
    let purposeToSave = p.purpose;
    if (existing && existing.purpose_override === 1) {
      purposeToSave = existing.purpose;
    }

    const stmt = this.db.prepare(`
      INSERT INTO projects (
        name, path, type, purpose, purpose_source, has_git,
        created_local, created_github, github_url,
        changes_24h, changes_7d, changes_30d, changes_total,
        max_inactive_days, days_since_last_change,
        last_commit_date, last_commit_message,
        total_specs, done_specs, pending_specs,
        total_points, done_points, pending_points, specs_summary_json,
        alexandre_pending_count, worktrees_count,
        health_status, health_reason, sdd_score, last_tag, last_tag_date, last_agent,
        stack, current_phase, next_action, last_decision, worktree_clean, uncommitted_count, doc_health,
        pipeline_stage, commands,
        last_scanned_at, is_custom
      ) VALUES (
        @name, @path, @type, @purpose, @purpose_source, @has_git,
        @created_local, @created_github, @github_url,
        @changes_24h, @changes_7d, @changes_30d, @changes_total,
        @max_inactive_days, @days_since_last_change,
        @last_commit_date, @last_commit_message,
        @total_specs, @done_specs, @pending_specs,
        @total_points, @done_points, @pending_points, @specs_summary_json,
        @alexandre_pending_count, @worktrees_count,
        @health_status, @health_reason, @sdd_score, @last_tag, @last_tag_date, @last_agent,
        @stack, @current_phase, @next_action, @last_decision, @worktree_clean, @uncommitted_count, @doc_health,
        @pipeline_stage, @commands,
        @last_scanned_at, @is_custom
      )
      ON CONFLICT(name) DO UPDATE SET
        path = excluded.path,
        type = excluded.type,
        purpose = CASE WHEN projects.purpose_override = 1 THEN projects.purpose ELSE excluded.purpose END,
        purpose_source = excluded.purpose_source,
        has_git = excluded.has_git,
        created_local = excluded.created_local,
        created_github = excluded.created_github,
        github_url = excluded.github_url,
        changes_24h = excluded.changes_24h,
        changes_7d = excluded.changes_7d,
        changes_30d = excluded.changes_30d,
        changes_total = excluded.changes_total,
        max_inactive_days = excluded.max_inactive_days,
        days_since_last_change = excluded.days_since_last_change,
        last_commit_date = excluded.last_commit_date,
        last_commit_message = excluded.last_commit_message,
        total_specs = excluded.total_specs,
        done_specs = excluded.done_specs,
        pending_specs = excluded.pending_specs,
        total_points = excluded.total_points,
        done_points = excluded.done_points,
        pending_points = excluded.pending_points,
        specs_summary_json = excluded.specs_summary_json,
        alexandre_pending_count = excluded.alexandre_pending_count,
        worktrees_count = excluded.worktrees_count,
        health_status = excluded.health_status,
        health_reason = excluded.health_reason,
        sdd_score = excluded.sdd_score,
        last_tag = excluded.last_tag,
        last_tag_date = excluded.last_tag_date,
        last_agent = excluded.last_agent,
        stack = excluded.stack,
        current_phase = excluded.current_phase,
        next_action = excluded.next_action,
        last_decision = excluded.last_decision,
        worktree_clean = excluded.worktree_clean,
        uncommitted_count = excluded.uncommitted_count,
        doc_health = excluded.doc_health,
        pipeline_stage = excluded.pipeline_stage,
        commands = excluded.commands,
        last_scanned_at = excluded.last_scanned_at,
        is_custom = excluded.is_custom
    `);

    stmt.run({
      name: p.name,
      path: p.path,
      type: p.type || 'main',
      purpose: purposeToSave || 'Propósito não documentado',
      purpose_source: p.purpose_source || '',
      has_git: p.has_git ? 1 : 0,
      created_local: p.created_local || null,
      created_github: p.created_github || null,
      github_url: p.github_url || null,
      changes_24h: p.changes_24h || 0,
      changes_7d: p.changes_7d || 0,
      changes_30d: p.changes_30d || 0,
      changes_total: p.changes_total || 0,
      max_inactive_days: p.max_inactive_days || 0,
      days_since_last_change: p.days_since_last_change || 0,
      last_commit_date: p.last_commit_date || null,
      last_commit_message: p.last_commit_message || null,
      total_specs: p.total_specs || 0,
      done_specs: p.done_specs || 0,
      pending_specs: p.pending_specs || 0,
      total_points: p.total_points || 0,
      done_points: p.done_points || 0,
      pending_points: p.pending_points || 0,
      specs_summary_json: typeof p.specs_summary_json === 'object' ? JSON.stringify(p.specs_summary_json) : (p.specs_summary_json || null),
      alexandre_pending_count: p.alexandre_pending_count || 0,
      worktrees_count: p.worktrees_count || 0,
      health_status: p.health_status || 'incubating',
      health_reason: p.health_reason || null,
      sdd_score: p.sdd_score || 0,
      last_tag: p.last_tag || null,
      last_tag_date: p.last_tag_date || null,
      last_agent: p.last_agent || null,
      stack: p.stack || 'Indefinida',
      current_phase: p.current_phase || null,
      next_action: p.next_action || null,
      last_decision: p.last_decision || null,
      worktree_clean: p.worktree_clean !== undefined ? (p.worktree_clean ? 1 : 0) : 1,
      uncommitted_count: p.uncommitted_count || 0,
      doc_health: typeof p.doc_health === 'object' ? JSON.stringify(p.doc_health) : (p.doc_health || null),
      pipeline_stage: p.pipeline_stage || 'idle',
      commands: typeof p.commands === 'object' ? JSON.stringify(p.commands) : (p.commands || null),
      last_scanned_at: new Date().toISOString(),
      is_custom: p.is_custom ? 1 : 0
    });
  }

  saveRecentCommits(projectName, commits) {
    this.db.prepare('DELETE FROM project_recent_commits WHERE project_name = ?').run(projectName);
    if (!commits || commits.length === 0) return;
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO project_recent_commits (
        project_name, hash, short_hash, author_name, agent, date_iso, date_relative, message
      ) VALUES (
        @project_name, @hash, @short_hash, @author_name, @agent, @date_iso, @date_relative, @message
      )
    `);
    for (const c of commits) {
      stmt.run({
        project_name: projectName,
        hash: c.hash,
        short_hash: c.short_hash || c.hash.substring(0, 7),
        author_name: c.author_name || 'Desconhecido',
        agent: c.agent || 'Alexandre',
        date_iso: c.date_iso || null,
        date_relative: c.date_relative || '',
        message: c.message || ''
      });
    }
  }

  getRecentCommits(projectName, limit = 5) {
    return this.db.prepare(`
      SELECT * FROM project_recent_commits
      WHERE project_name = ?
      ORDER BY date_iso DESC
      LIMIT ?
    `).all(projectName, limit);
  }

  saveWorktrees(projectName, worktrees) {
    this.db.prepare('DELETE FROM project_worktrees WHERE project_name = ?').run(projectName);
    const stmt = this.db.prepare(`
      INSERT INTO project_worktrees (project_name, name, path, branch, last_modified)
      VALUES (@project_name, @name, @path, @branch, @last_modified)
    `);
    for (const w of worktrees) {
      stmt.run({
        project_name: projectName,
        name: w.name,
        path: w.path,
        branch: w.branch || 'main',
        last_modified: w.last_modified || new Date().toISOString()
      });
    }
  }

  saveSpecs(projectName, specs) {
    this.db.prepare('DELETE FROM project_specs WHERE project_name = ?').run(projectName);
    const stmt = this.db.prepare(`
      INSERT INTO project_specs (
        project_name, spec_id, spec_name, status, weight, category, total_tasks, completed_tasks, pending_tasks, pending_tasks_json, summary, source_worktree
      ) VALUES (
        @project_name, @spec_id, @spec_name, @status, @weight, @category, @total_tasks, @completed_tasks, @pending_tasks, @pending_tasks_json, @summary, @source_worktree
      )
    `);
    for (const s of specs) {
      stmt.run({
        project_name: projectName,
        spec_id: s.spec_id,
        spec_name: s.spec_name,
        status: s.status,
        weight: s.weight || 1,
        category: s.category || (s.status === 'done' ? 'finalizada' : 'em_andamento'),
        total_tasks: s.total_tasks || 0,
        completed_tasks: s.completed_tasks || 0,
        pending_tasks: s.pending_tasks || 0,
        pending_tasks_json: typeof s.pending_tasks_json === 'object' ? JSON.stringify(s.pending_tasks_json) : (s.pending_tasks_json || null),
        summary: s.summary || '',
        source_worktree: s.source_worktree || null
      });
    }
  }

  saveAlexandreActions(projectName, actions) {
    this.db.prepare('DELETE FROM alexandre_actions WHERE project_name = ?').run(projectName);
    const stmt = this.db.prepare(`
      INSERT INTO alexandre_actions (project_name, spec_id, file_path, title, snippet, source_worktree, detected_at)
      VALUES (@project_name, @spec_id, @file_path, @title, @snippet, @source_worktree, @detected_at)
    `);
    for (const a of actions) {
      stmt.run({
        project_name: projectName,
        spec_id: a.spec_id || null,
        file_path: a.file_path,
        title: a.title,
        snippet: a.snippet || '',
        source_worktree: a.source_worktree || null,
        detected_at: new Date().toISOString()
      });
    }
  }

  updateFtsIndex(projectName, purpose, specsList, actionsList, worktreesList) {
    try {
      this.db.prepare('DELETE FROM projects_fts WHERE project_name = ?').run(projectName);
      const specsContent = (specsList || []).map(s => `${s.spec_id} ${s.spec_name} ${s.summary}`).join(' ');
      const actionsContent = (actionsList || []).map(a => `${a.title} ${a.snippet}`).join(' ');
      const worktreesContent = (worktreesList || []).map(w => `${w.name} ${w.branch || ''}`).join(' ');
      this.db.prepare(`
        INSERT INTO projects_fts (project_name, purpose, specs_content, actions_content, worktrees_content)
        VALUES (?, ?, ?, ?, ?)
      `).run(projectName, purpose || '', specsContent, actionsContent, worktreesContent);
    } catch (e) {
      try {
        this.db.exec('DROP TABLE IF EXISTS projects_fts');
        this.db.exec(`
          CREATE VIRTUAL TABLE projects_fts USING fts5(
            project_name, purpose, specs_content, actions_content, worktrees_content,
            tokenize = 'unicode61'
          )
        `);
        const specsContent = (specsList || []).map(s => `${s.spec_id} ${s.spec_name} ${s.summary}`).join(' ');
        const actionsContent = (actionsList || []).map(a => `${a.title} ${a.snippet}`).join(' ');
        const worktreesContent = (worktreesList || []).map(w => `${w.name} ${w.branch || ''}`).join(' ');
        this.db.prepare(`
          INSERT INTO projects_fts (project_name, purpose, specs_content, actions_content, worktrees_content)
          VALUES (?, ?, ?, ?, ?)
        `).run(projectName, purpose || '', specsContent, actionsContent, worktreesContent);
      } catch (err) {}
    }
  }

  updatePurposeOverride(projectName, purpose) {
    this.db.prepare(`
      UPDATE projects SET purpose = ?, purpose_override = 1 WHERE name = ?
    `).run(purpose, projectName);
  }

  buildStepper(specs) {
    if (!specs || specs.length === 0) return [];
    return specs.slice(-4).map(s => {
      const total = s.total_tasks || 0;
      const completed = s.completed_tasks || 0;
      const pct = total > 0 ? Math.round((completed / total) * 100) : (s.progress !== undefined ? s.progress : (s.status === 'done' ? 100 : 0));
      let pendingTasks = [];
      if (s.pending_tasks_json && typeof s.pending_tasks_json === 'string') {
        try { pendingTasks = JSON.parse(s.pending_tasks_json); } catch (e) {}
      } else if (Array.isArray(s.pending_tasks)) {
        pendingTasks = s.pending_tasks;
      }
      const formattedId = s.spec_id.startsWith('F') ? s.spec_id : `F${s.spec_id.replace(/^0+/, '').padStart(3, '0')}`;
      return {
        id: formattedId,
        spec_id: s.spec_id,
        title: s.spec_name || s.summary || s.spec_id,
        status: s.status,
        weight: s.weight || 1,
        category: s.category || 'fila',
        progress: pct,
        pct,
        total_tasks: total,
        completed_tasks: completed,
        pending_tasks: pendingTasks.slice(0, 3)
      };
    });
  }

  getAllProjects() {
    const projects = this.db.prepare('SELECT * FROM projects ORDER BY name ASC').all();
    for (const p of projects) {
      p.worktrees = this.db.prepare('SELECT * FROM project_worktrees WHERE project_name = ? ORDER BY name ASC').all(p.name);
      p.recent_commits = this.db.prepare('SELECT * FROM project_recent_commits WHERE project_name = ? ORDER BY date_iso DESC LIMIT 5').all(p.name);
      const rawSpecs = this.db.prepare('SELECT * FROM project_specs WHERE project_name = ? ORDER BY spec_id ASC').all(p.name);
      p.stepper = this.buildStepper(rawSpecs);

      if (p.specs_summary_json && typeof p.specs_summary_json === 'string') {
        try { p.specs_summary = JSON.parse(p.specs_summary_json); } catch (e) {}
      }
      if (p.doc_health && typeof p.doc_health === 'string') {
        try { p.doc_health = JSON.parse(p.doc_health); } catch (e) {}
      }
      if (p.commands && typeof p.commands === 'string') {
        try { p.commands = JSON.parse(p.commands); } catch (e) {}
      }
    }
    return projects;
  }

  getProjectByName(name) {
    const project = this.db.prepare('SELECT * FROM projects WHERE name = ?').get(name);
    if (!project) return null;
    project.worktrees = this.db.prepare('SELECT * FROM project_worktrees WHERE project_name = ? ORDER BY name ASC').all(name);
    project.specs = this.db.prepare('SELECT * FROM project_specs WHERE project_name = ? ORDER BY spec_id ASC').all(name);
    for (const s of project.specs) {
      if (s.pending_tasks_json && typeof s.pending_tasks_json === 'string') {
        try { s.pending_tasks = JSON.parse(s.pending_tasks_json); } catch (e) {}
      }
    }
    project.stepper = this.buildStepper(project.specs);
    project.alexandre_actions = this.db.prepare('SELECT * FROM alexandre_actions WHERE project_name = ?').all(name);
    project.recent_commits = this.getRecentCommits(name, 5);
    if (project.specs_summary_json && typeof project.specs_summary_json === 'string') {
      try { project.specs_summary = JSON.parse(project.specs_summary_json); } catch (e) {}
    }
    if (project.doc_health && typeof project.doc_health === 'string') {
      try { project.doc_health = JSON.parse(project.doc_health); } catch (e) {}
    }
    if (project.commands && typeof project.commands === 'string') {
      try { project.commands = JSON.parse(project.commands); } catch (e) {}
    }
    return project;
  }

  getAllAlexandreActions() {
    return this.db.prepare(`
      SELECT a.*, p.path as project_path
      FROM alexandre_actions a
      JOIN projects p ON a.project_name = p.name
      ORDER BY a.project_name ASC, a.spec_id ASC
    `).all();
  }

  getKpis() {
    const totalProjects = this.db.prepare('SELECT COUNT(*) as count FROM projects').get().count;
    const totalWorktrees = this.db.prepare('SELECT COUNT(*) as count FROM project_worktrees').get().count;
    const activeProjectsMonth = this.db.prepare('SELECT COUNT(*) as count FROM projects WHERE changes_30d > 0').get().count;
    const totalCommits = this.db.prepare('SELECT SUM(changes_total) as sum FROM projects').get().sum || 0;
    const commits24h = this.db.prepare('SELECT SUM(changes_24h) as sum FROM projects').get().sum || 0;
    const commits7d = this.db.prepare('SELECT SUM(changes_7d) as sum FROM projects').get().sum || 0;
    const commits30d = this.db.prepare('SELECT SUM(changes_30d) as sum FROM projects').get().sum || 0;
    const specsAgg = this.db.prepare(`
      SELECT
        SUM(total_specs) as total,
        SUM(done_specs) as done,
        SUM(pending_specs) as pending,
        SUM(total_points) as total_points,
        SUM(done_points) as done_points,
        SUM(pending_points) as pending_points
      FROM projects
    `).get();
    const alexandreTotal = this.db.prepare('SELECT COUNT(*) as count FROM alexandre_actions').get().count;

    return {
      totalProjects,
      totalWorktrees,
      activeProjectsMonth,
      totalCommits,
      commits24h,
      commits7d,
      commits30d,
      totalSpecs: specsAgg.total || 0,
      doneSpecs: specsAgg.done || 0,
      pendingSpecs: specsAgg.pending || 0,
      totalPoints: specsAgg.total_points || 0,
      donePoints: specsAgg.done_points || 0,
      pendingPoints: specsAgg.pending_points || 0,
      alexandreActionsCount: alexandreTotal
    };
  }

  searchFts(query) {
    if (!query || !query.trim()) return [];
    try {
      const formatted = query.trim().split(/\s+/).map(w => `"${w}"*`).join(' OR ');
      return this.db.prepare(`
        SELECT p.*, f.rank
        FROM projects_fts f
        JOIN projects p ON f.project_name = p.name
        WHERE projects_fts MATCH ?
        ORDER BY f.rank ASC
      `).all(formatted);
    } catch (e) {
      return [];
    }
  }

  getMonitoredPaths() {
    return this.db.prepare('SELECT * FROM monitored_paths').all();
  }

  addMonitoredPath(pathStr, label = '') {
    this.db.prepare(`
      INSERT OR IGNORE INTO monitored_paths (path, label, created_at)
      VALUES (?, ?, ?)
    `).run(pathStr, label, new Date().toISOString());
  }
}
