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
        alexandre_pending_count INTEGER DEFAULT 0,
        worktrees_count INTEGER DEFAULT 0,
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

      CREATE TABLE IF NOT EXISTS project_specs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_name TEXT NOT NULL,
        spec_id TEXT NOT NULL,
        spec_name TEXT NOT NULL,
        status TEXT NOT NULL,
        total_tasks INTEGER DEFAULT 0,
        completed_tasks INTEGER DEFAULT 0,
        pending_tasks INTEGER DEFAULT 0,
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
    try { this.db.exec('ALTER TABLE projects ADD COLUMN worktrees_count INTEGER DEFAULT 0'); } catch (e) {}
    try { this.db.exec('ALTER TABLE project_specs ADD COLUMN source_worktree TEXT'); } catch (e) {}
    try { this.db.exec('ALTER TABLE alexandre_actions ADD COLUMN source_worktree TEXT'); } catch (e) {}
  }

  clearNonCanonicalProjects(canonicalNames) {
    if (!canonicalNames || canonicalNames.length === 0) return;
    const placeholders = canonicalNames.map(() => '?').join(',');
    this.db.prepare(`DELETE FROM projects WHERE name NOT IN (${placeholders})`).run(...canonicalNames);
    this.db.prepare(`DELETE FROM project_specs WHERE project_name NOT IN (${placeholders})`).run(...canonicalNames);
    this.db.prepare(`DELETE FROM alexandre_actions WHERE project_name NOT IN (${placeholders})`).run(...canonicalNames);
    this.db.prepare(`DELETE FROM project_worktrees WHERE project_name NOT IN (${placeholders})`).run(...canonicalNames);
    this.db.prepare(`DELETE FROM projects_fts WHERE project_name NOT IN (${placeholders})`).run(...canonicalNames);
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
        alexandre_pending_count, worktrees_count, last_scanned_at, is_custom
      ) VALUES (
        @name, @path, @type, @purpose, @purpose_source, @has_git,
        @created_local, @created_github, @github_url,
        @changes_24h, @changes_7d, @changes_30d, @changes_total,
        @max_inactive_days, @days_since_last_change,
        @last_commit_date, @last_commit_message,
        @total_specs, @done_specs, @pending_specs,
        @alexandre_pending_count, @worktrees_count, @last_scanned_at, @is_custom
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
        alexandre_pending_count = excluded.alexandre_pending_count,
        worktrees_count = excluded.worktrees_count,
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
      alexandre_pending_count: p.alexandre_pending_count || 0,
      worktrees_count: p.worktrees_count || 0,
      last_scanned_at: new Date().toISOString(),
      is_custom: p.is_custom ? 1 : 0
    });
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
      INSERT INTO project_specs (project_name, spec_id, spec_name, status, total_tasks, completed_tasks, pending_tasks, summary, source_worktree)
      VALUES (@project_name, @spec_id, @spec_name, @status, @total_tasks, @completed_tasks, @pending_tasks, @summary, @source_worktree)
    `);
    for (const s of specs) {
      stmt.run({
        project_name: projectName,
        spec_id: s.spec_id,
        spec_name: s.spec_name,
        status: s.status,
        total_tasks: s.total_tasks || 0,
        completed_tasks: s.completed_tasks || 0,
        pending_tasks: s.pending_tasks || 0,
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

  getAllProjects() {
    const projects = this.db.prepare('SELECT * FROM projects ORDER BY name ASC').all();
    for (const p of projects) {
      p.worktrees = this.db.prepare('SELECT * FROM project_worktrees WHERE project_name = ? ORDER BY name ASC').all();
    }
    return projects;
  }

  getProjectByName(name) {
    const project = this.db.prepare('SELECT * FROM projects WHERE name = ?').get(name);
    if (!project) return null;
    project.worktrees = this.db.prepare('SELECT * FROM project_worktrees WHERE project_name = ? ORDER BY name ASC').all();
    project.specs = this.db.prepare('SELECT * FROM project_specs WHERE project_name = ? ORDER BY spec_id ASC').all();
    project.alexandre_actions = this.db.prepare('SELECT * FROM alexandre_actions WHERE project_name = ?').all();
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
        SUM(pending_specs) as pending
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
