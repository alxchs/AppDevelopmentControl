// Fixtures da SPEC-0008: projetos de mentira gerados por codigo (datas fixas, sem relogio/rede/aleatoriedade).
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export const TS = '2026-01-02T10:00:00-03:00';
export const PROJECT_ID = 'PRJ-fixture';

export function evId(n) {
  return `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
}

export function makeSpec(id, over = {}) {
  const state = over.state || 'completed';
  const done = state === 'completed';
  const spec = {
    id,
    legacy_ids: [],
    title: `Spec ${id}`,
    type: 'feature',
    state,
    category: over.category || (done ? 'finalizadas' : 'fila'),
    priority: null,
    owner: 'tester',
    points: 3,
    points_confidence: 'medium',
    hours: { original: null, current: null, actual: null, remaining: null, actual_method: null },
    progress: {
      development: done ? 100 : 0,
      test_validation: done ? 100 : 0,
      integration: done ? 100 : 0,
      documentation: done ? 100 : 0
    },
    evidence: done ? [{ kind: 'commit', ref: 'abc1234', note: 'fixture' }] : [],
    blockers: [],
    dependencies: [],
    ...over
  };
  return spec;
}

const sum = (l, f) => l.reduce((a, s) => a + (typeof f(s) === 'number' ? f(s) : 0), 0);

// Monta um control.json consistente (summary calculado a partir das specs).
export function buildControl(specs, over = {}) {
  const status_counts = {};
  const category_counts = {};
  for (const s of specs) {
    status_counts[s.state] = (status_counts[s.state] || 0) + 1;
    category_counts[s.category] = (category_counts[s.category] || 0) + 1;
  }
  const total = sum(specs, (s) => s.points);
  const done = sum(specs.filter((s) => s.state === 'completed'), (s) => s.points);
  const control = {
    schema_version: '2.0',
    protocol_version: '2.0',
    project: {
      project_id: PROJECT_ID,
      name: 'Fixture',
      root_path: '.',
      status: 'active',
      migration_status: 'migrated',
      baseline_at: '2026-01-01T10:00:00-03:00',
      last_updated_at: TS,
      last_updated_by: 'tester'
    },
    summary: {
      spec_count: specs.length,
      task_count: null,
      status_counts,
      category_counts,
      total_points: total,
      completed_points_equivalent: done,
      remaining_points: total - done
    },
    specs,
    dependencies: [],
    alerts: [],
    decisions_required: [],
    audit: {
      last_incremental_audit_at: TS,
      last_full_audit_at: TS,
      unreconciled_changes: 0,
      evidence_coverage_percent: 100
    },
    control_file: 'docs/production/production-control.json',
    events_file: 'docs/production/production-events.jsonl'
  };
  return { ...control, ...over };
}

// 1 SPEC concluida com evidencia, evento de criacao e baseline.
export function validControlMin() {
  return buildControl([makeSpec('SPEC-0001', { points: 3 })]);
}

export function createdEvents(specs, startN = 1) {
  return specs.map((s, i) => makeEvent(startN + i, s.id, 'spec.created', { after: { state: s.state, points: s.points } }));
}

export function makeEvent(n, entityId, type = 'spec.updated', over = {}) {
  return {
    event_id: evId(n),
    timestamp: TS,
    project_id: PROJECT_ID,
    entity_id: entityId,
    event_type: type,
    actor: 'tester',
    summary: `${type} ${entityId}`,
    ...over
  };
}

export function validBaseline(over = {}) {
  return { baseline_at: '2026-01-01T10:00:00-03:00', agent: 'tester', counts: { specs_total: 1, total_points: 3 }, ...over };
}

// ---- mutadores (devolvem copia; nunca alteram o original) ----
const clone = (o) => JSON.parse(JSON.stringify(o));
export function mutate(control, fn) {
  const c = clone(control);
  fn(c);
  return c;
}
export const withSchema = (c, v) => mutate(c, (x) => { x.schema_version = v; });
export const withPoints = (c, id, v) => mutate(c, (x) => { x.specs.find((s) => s.id === id).points = v; });
export const withoutEvidence = (c, id) => mutate(c, (x) => { x.specs.find((s) => s.id === id).evidence = []; });
export const withDuplicateSpec = (c, id) => mutate(c, (x) => { x.specs.push(clone(x.specs.find((s) => s.id === id))); });
export const withBrokenDep = (c, id, to) => mutate(c, (x) => { x.specs.find((s) => s.id === id).dependencies.push(to); });
export const withBrokenValidates = (c, id, to) => mutate(c, (x) => { x.specs.find((s) => s.id === id).validates = [to]; });
export const withCycle = (c, a, b) => mutate(c, (x) => {
  x.specs.find((s) => s.id === a).dependencies.push(b);
  x.specs.find((s) => s.id === b).dependencies.push(a);
});
export const truncateJson = (text) => text.slice(0, Math.floor(text.length / 2));

// Escreve <root>/<name>/docs/production/{control,events,baseline}. Devolve o caminho do projeto.
// control/baseline: objeto (vira JSON) | string (cru) | null (ausente). events: array de objetos | string | null.
export function makeProject(root, name, { control, events, baseline, specsMd, bom = false, crlf = false } = {}) {
  const proj = path.join(root, name);
  const dir = path.join(proj, 'docs', 'production');
  fs.mkdirSync(dir, { recursive: true });
  const nl = crlf ? '\r\n' : '\n';
  const prefix = bom ? '﻿' : '';
  const asText = (v) => (typeof v === 'string' ? v : JSON.stringify(v, null, 2).replace(/\n/g, nl));
  if (control != null) fs.writeFileSync(path.join(dir, 'production-control.json'), prefix + asText(control));
  if (baseline != null) fs.writeFileSync(path.join(dir, 'production-baseline.json'), prefix + asText(baseline));
  if (events != null) {
    const text = typeof events === 'string' ? events : events.map((e) => JSON.stringify(e)).join(nl) + nl;
    fs.writeFileSync(path.join(dir, 'production-events.jsonl'), prefix + text);
  }
  if (specsMd != null) {
    fs.mkdirSync(path.join(proj, 'docs', 'specs'), { recursive: true });
    fs.writeFileSync(path.join(proj, 'docs', 'specs', 'SPECS.md'), specsMd);
  }
  return proj;
}

// SHA-256 recursivo (caminhos relativos ordenados + conteudos) para provar nao-escrita.
export function hashTree(dir) {
  const h = crypto.createHash('sha256');
  const walk = (d, rel) => {
    const names = fs.readdirSync(d).sort();
    for (const n of names) {
      const full = path.join(d, n);
      const r = rel ? rel + '/' + n : n;
      const st = fs.statSync(full);
      if (st.isDirectory()) {
        h.update('D:' + r + '\n');
        walk(full, r);
      } else {
        h.update('F:' + r + ':' + st.size + '\n');
        h.update(fs.readFileSync(full));
      }
    }
  };
  walk(dir, '');
  return h.digest('hex');
}

// Conteudo das tabelas de producao de um projeto, normalizado (sem data/hora de importacao e sem ids
// autoincrementais), para provar idempotencia e reconstrucao.
export function dumpProduction(db, project) {
  const q = (sql) => db.db.prepare(sql).all(project);
  const out = {
    imports: q('SELECT project_name, project_id, source_kind, control_path, events_path, baseline_path, declared_updated_at, status, last_good_at, issue_counts_json, metrics_json, baseline_json FROM production_imports WHERE project_name = ?'),
    specs: q('SELECT project_name, spec_id, title, type, state, category, points, points_confidence, hours_original, hours_current, hours_actual, hours_remaining, evidence_count, progress_json, dependencies_json, blockers_json, raw_json FROM production_specs WHERE project_name = ? ORDER BY spec_id'),
    events: q('SELECT project_name, event_id, ts, entity_type, entity_id, event_type, actor, summary, raw_json FROM production_events WHERE project_name = ? ORDER BY event_id'),
    issues: q('SELECT project_name, code, severity, entity_id, file, line, message FROM production_issues WHERE project_name = ? ORDER BY id')
  };
  return JSON.stringify(out);
}

export function countProduction(db, project) {
  const n = (t) => db.db.prepare(`SELECT COUNT(*) AS n FROM ${t} WHERE project_name = ?`).get(project).n;
  return { imports: n('production_imports'), specs: n('production_specs'), events: n('production_events'), issues: n('production_issues') };
}
