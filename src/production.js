// Ingestao do Protocolo de Controle de Producao v2 (docs/production/*).
// MODULO PURO E SOMENTE LEITURA: recebe um caminho, devolve um objeto; nunca escreve, cria,
// renomeia nem apaga nada dentro de um projeto monitorado (SPEC-0007 FR-009) e nunca lanca excecao
// para o chamador (NFR-003). Sem rede, sem IA (NFR-001).
import fs from 'fs';
import path from 'path';

export const PRODUCTION_DIR = path.join('docs', 'production');
export const CONTROL_FILE = 'production-control.json';
export const EVENTS_FILE = 'production-events.jsonl';
export const BASELINE_FILE = 'production-baseline.json';

export const MAX_CONTROL_BYTES = 20 * 1024 * 1024;
export const MAX_EVENTS_BYTES = 50 * 1024 * 1024;
export const MAX_BASELINE_BYTES = 5 * 1024 * 1024;

// Codigos de issue que rejeitam a importacao inteira (D-009): erro de schema/leitura.
export const FATAL_CODES = new Set([
  'JSON_PARSE',
  'FILE_UNREADABLE',
  'FILE_TOO_LARGE',
  'INTERNAL_ERROR',
  'SCHEMA_VERSION',
  'SCHEMA_MISSING_BLOCK',
  'SCHEMA_BAD_TYPE',
  'SCHEMA_MISSING_FIELD'
]);

export const VALID_STATES = ['not_started', 'in_progress', 'blocked', 'in_validation', 'completed', 'suspended', 'cancelled', 'reopened'];
export const VALID_CATEGORIES = ['finalizadas', 'em_andamento', 'fila', 'dependendo_alexandre', 'impedidas', 'invalidas'];
export const FIBONACCI = [1, 2, 3, 5, 8, 13, 21];
export const PROGRESS_DIMS = ['development', 'test_validation', 'integration', 'documentation'];
export const REQUIRED_BLOCKS = [
  ['project', 'object'],
  ['summary', 'object'],
  ['specs', 'array'],
  ['dependencies', 'array'],
  ['alerts', 'array'],
  ['audit', 'object']
];
// Nomes de horas do protocolo (§7) -> nome usado nos controles reais (hours:{original,...}). D-008.
export const HOURS_VARIANT_MAP = {
  original_estimate_hours: 'original',
  current_estimate_hours: 'current',
  actual_hours: 'actual',
  remaining_estimate_hours: 'remaining'
};

export function makeIssue(code, severity, message, extra = {}) {
  return {
    code,
    severity, // 'info' | 'warning' | 'error'
    entity_id: extra.entity_id ?? null,
    file: extra.file ?? null,
    line: extra.line ?? null,
    message
  };
}

export function isFatalIssue(issue) {
  return FATAL_CODES.has(issue.code);
}

// Resolve os tres arquivos do protocolo em <projectPath>/docs/production. So existsSync.
export function locateProductionFiles(projectPath) {
  const dir = path.join(projectPath, PRODUCTION_DIR);
  const pick = (name) => {
    const p = path.join(dir, name);
    try {
      return fs.existsSync(p) ? p : null;
    } catch (e) {
      return null;
    }
  };
  return {
    dir,
    control: pick(CONTROL_FILE),
    events: pick(EVENTS_FILE),
    baseline: pick(BASELINE_FILE)
  };
}

function relFile(name) {
  return PRODUCTION_DIR.replace(/\\/g, '/') + '/' + name;
}

// Le um arquivo de texto com limite de tamanho. Nunca lanca: devolve {text} ou {issue}.
function readTextLimited(filePath, maxBytes, fileLabel, tooLargeCode = 'FILE_TOO_LARGE', unreadableCode = 'FILE_UNREADABLE', sev = 'error') {
  let st;
  try {
    st = fs.statSync(filePath);
  } catch (e) {
    return { issue: makeIssue(unreadableCode, sev, `Arquivo ilegivel: ${e.code || e.message}`, { file: fileLabel }) };
  }
  if (!st.isFile()) {
    return { issue: makeIssue(unreadableCode, sev, 'Caminho existe mas nao e um arquivo regular', { file: fileLabel }) };
  }
  if (st.size > maxBytes) {
    return { issue: makeIssue(tooLargeCode, sev, `Arquivo grande demais (${st.size} bytes; limite ${maxBytes})`, { file: fileLabel }) };
  }
  try {
    return { text: fs.readFileSync(filePath, 'utf8').replace(/^﻿/, ''), size: st.size };
  } catch (e) {
    return { issue: makeIssue(unreadableCode, sev, `Arquivo ilegivel: ${e.code || e.message}`, { file: fileLabel }) };
  }
}

function parseJsonText(text, fileLabel, code = 'JSON_PARSE', sev = 'error') {
  try {
    return { value: JSON.parse(text) };
  } catch (e) {
    return { issue: makeIssue(code, sev, `JSON invalido ou truncado: ${e.message}`, { file: fileLabel }) };
  }
}

function emptyResult(projectPath) {
  return {
    found: false,
    projectPath,
    files: { dir: null, control: null, events: null, baseline: null },
    control: null,
    events: [],
    baseline: null,
    eventStats: { lines: 0, accepted: 0, corrupt: 0, incomplete: 0, foreign: 0, duplicate: 0, orphan: 0 },
    issues: [],
    status: 'absent', // absent | valid | valid_with_alerts | rejected
    declared_updated_at: null
  };
}

const typeOf = (v) => (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v);
const isObj = (v) => typeOf(v) === 'object';
const ISO_RE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/;
export function isIsoDate(v) {
  return typeof v === 'string' && ISO_RE.test(v) && !Number.isNaN(Date.parse(v));
}
// Controles reais usam o texto 'not_calculable' para progresso desconhecido: tratado como nulo.
export const NOT_CALCULABLE = 'not_calculable';
const isPercent = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 100;
const isHours = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0;

// Le as horas de uma SPEC aceitando os dois formatos (D-008). Nulo permanece nulo.
export function readSpecHours(spec) {
  const out = { original: null, current: null, actual: null, remaining: null, variant: false };
  const h = isObj(spec.hours) ? spec.hours : null;
  for (const k of ['original', 'current', 'actual', 'remaining']) if (h && h[k] !== undefined) out[k] = h[k];
  for (const [proto, k] of Object.entries(HOURS_VARIANT_MAP)) {
    if (spec[proto] !== undefined) {
      out.variant = true;
      if (out[k] === null) out[k] = spec[proto];
    }
  }
  return out;
}

// Valida schema (fatal) e valores (importa com alertas) do control.json. So le; devolve issues.
export function validateControl(control) {
  const issues = [];
  const file = relFile(CONTROL_FILE);
  const add = (code, sev, msg, entity) => issues.push(makeIssue(code, sev, msg, { file, entity_id: entity ?? null }));
  if (!isObj(control)) {
    add('SCHEMA_BAD_TYPE', 'error', 'control.json deve ser um objeto JSON');
    return issues;
  }
  if (control.schema_version !== '2.0') {
    add('SCHEMA_VERSION', 'error', `schema_version deve ser "2.0" (lido: ${JSON.stringify(control.schema_version ?? null)})`);
  }
  for (const [name, type] of REQUIRED_BLOCKS) {
    if (control[name] === undefined) add('SCHEMA_MISSING_BLOCK', 'error', `Bloco obrigatorio ausente: ${name}`, name);
    else if (typeOf(control[name]) !== type) add('SCHEMA_BAD_TYPE', 'error', `Bloco ${name} deve ser ${type} (lido: ${typeOf(control[name])})`, name);
  }
  if (isObj(control.project)) {
    const pid = control.project.project_id;
    if (typeof pid !== 'string' || !pid) add('SCHEMA_MISSING_FIELD', 'error', 'project.project_id ausente ou vazio', 'project');
    dateChecks(control.project, 'project', add);
  }
  if (isObj(control.audit)) dateChecks(control.audit, 'audit', add);
  if (isObj(control.summary)) {
    for (const [k, v] of Object.entries(control.summary)) {
      if (k.endsWith('_percent') && v !== null && v !== NOT_CALCULABLE && !isPercent(v)) add('PERCENT_INVALID', 'error', `summary.${k} fora de 0..100: ${JSON.stringify(v)}`, 'summary');
    }
  }
  if (Array.isArray(control.specs)) {
    control.specs.forEach((spec, idx) => validateSpec(spec, idx, add));
    issues.push(...validateReferences(control));
    issues.push(...summaryMismatchIssues(control));
  }
  return issues;
}

const CATEGORY_BY_STATE = {
  not_started: 'fila',
  in_progress: 'em_andamento',
  in_validation: 'em_andamento',
  reopened: 'em_andamento',
  blocked: 'impedidas',
  suspended: 'impedidas',
  completed: 'finalizadas',
  cancelled: 'invalidas'
};
// Categoria do protocolo da SPEC: a declarada quando valida; senao derivada do estado.
export function categoryOf(spec) {
  if (spec && VALID_CATEGORIES.includes(spec.category)) return spec.category;
  return (spec && CATEGORY_BY_STATE[spec.state]) || 'fila';
}

// Resumo calculado a partir das SPECs unicas (pontos desconhecidos nao entram nos totais).
export function calcSummary(control) {
  const specs = uniqueSpecs(control);
  const status_counts = {};
  const category_counts = {};
  const category_points = {};
  let total = 0;
  for (const s of specs) {
    if (typeof s.state === 'string') status_counts[s.state] = (status_counts[s.state] || 0) + 1;
    const c = categoryOf(s);
    category_counts[c] = (category_counts[c] || 0) + 1;
    if (typeof s.points === 'number' && Number.isFinite(s.points)) {
      total += s.points;
      category_points[c] = (category_points[c] || 0) + s.points;
    }
  }
  return { spec_count: specs.length, total_points: total, status_counts, category_counts, category_points };
}

const sameCounts = (a, b) => {
  const ka = Object.keys(a).filter((k) => a[k] !== 0).sort();
  const kb = Object.keys(b).filter((k) => b[k] !== 0).sort();
  return ka.length === kb.length && ka.every((k, i) => k === kb[i] && Number(a[k]) === Number(b[k]));
};

// Declarado x calculado (FR-007/AC-16). Declarado nulo/ausente: nada a comparar. O calculado e o usado.
export function summaryMismatchIssues(control) {
  const issues = [];
  const sm = isObj(control.summary) ? control.summary : null;
  if (!sm) return issues;
  const calc = calcSummary(control);
  const file = relFile(CONTROL_FILE);
  const add = (field, declared, calculated) =>
    issues.push(makeIssue('SUMMARY_MISMATCH', 'warning', `summary.${field}: declarado ${JSON.stringify(declared)}, calculado ${JSON.stringify(calculated)}`, { file, entity_id: `summary.${field}` }));
  if (typeof sm.total_points === 'number' && Math.abs(sm.total_points - calc.total_points) > 1e-9) add('total_points', sm.total_points, calc.total_points);
  if (typeof sm.spec_count === 'number' && sm.spec_count !== calc.spec_count) add('spec_count', sm.spec_count, calc.spec_count);
  if (isObj(sm.status_counts) && !sameCounts(sm.status_counts, calc.status_counts)) add('status_counts', sm.status_counts, calc.status_counts);
  if (isObj(sm.category_counts)) {
    // Aceita {cat: n} (protocolo) e {cat: {quantidade, pontos, percentual}} (controles reais).
    const declQty = {};
    const declPts = {};
    for (const [k, v] of Object.entries(sm.category_counts)) {
      if (typeof v === 'number') declQty[k] = v;
      else if (isObj(v)) {
        if (typeof v.quantidade === 'number') declQty[k] = v.quantidade;
        if (typeof v.pontos === 'number') declPts[k] = v.pontos;
      }
    }
    if (!sameCounts(declQty, calc.category_counts)) add('category_counts', declQty, calc.category_counts);
    if (Object.keys(declPts).length && !sameCounts(declPts, calc.category_points)) add('category_points', declPts, calc.category_points);
  }
  return issues;
}

const EVENT_REQUIRED = ['event_id', 'timestamp', 'project_id', 'entity_id', 'event_type', 'actor', 'summary'];
const TZ_RE = /(Z|[+-]\d{2}:?\d{2})$/;

// Le o events.jsonl linha a linha (text null/vazio = sem historico). Linha ruim isola so a linha.
export function parseEventsJsonl(text, control) {
  const issues = [];
  const events = [];
  const stats = { lines: 0, accepted: 0, corrupt: 0, incomplete: 0, foreign: 0, duplicate: 0, orphan: 0 };
  const file = relFile(EVENTS_FILE);
  const pid = control && control.project && control.project.project_id;
  const known = new Set();
  for (const s of uniqueSpecs(control)) if (typeof s.id === 'string') known.add(s.id);
  for (const { task } of collectTasks(control)) if (typeof task.id === 'string') known.add(task.id);
  const seen = new Set();
  const lines = typeof text === 'string' ? text.replace(/^﻿/, '').split(/\r?\n/) : [];
  let nonBlank = 0;
  lines.forEach((raw, i) => {
    const lineNo = i + 1;
    if (raw.trim() === '') return;
    nonBlank++;
    stats.lines++;
    let obj;
    try {
      obj = JSON.parse(raw);
    } catch (e) {
      stats.corrupt++;
      issues.push(makeIssue('EVENT_LINE_CORRUPT', 'error', `Linha ${lineNo} nao e JSON valido: ${e.message}`, { file, line: lineNo }));
      return;
    }
    if (!isObj(obj)) {
      stats.corrupt++;
      issues.push(makeIssue('EVENT_LINE_CORRUPT', 'error', `Linha ${lineNo} nao e um objeto JSON`, { file, line: lineNo }));
      return;
    }
    const missing = EVENT_REQUIRED.filter((f) => typeof obj[f] !== 'string' || !obj[f]);
    if (missing.length) {
      stats.incomplete++;
      issues.push(makeIssue('EVENT_FIELD_MISSING', 'error', `Linha ${lineNo}: campos obrigatorios ausentes: ${missing.join(', ')}`, { file, line: lineNo, entity_id: typeof obj.entity_id === 'string' ? obj.entity_id : null }));
      return;
    }
    if (obj.project_id !== pid) {
      stats.foreign++;
      issues.push(makeIssue('EVENT_FOREIGN_PROJECT', 'error', `Linha ${lineNo}: evento de outro projeto (${obj.project_id})`, { file, line: lineNo, entity_id: obj.entity_id }));
      return;
    }
    if (seen.has(obj.event_id)) {
      stats.duplicate++;
      issues.push(makeIssue('EVENT_DUP', 'warning', `Linha ${lineNo}: event_id repetido ${obj.event_id}; contado uma vez`, { file, line: lineNo, entity_id: obj.entity_id }));
      return;
    }
    seen.add(obj.event_id);
    if (ENTITY_ID_RE.test(obj.entity_id) && !known.has(obj.entity_id)) {
      stats.orphan++;
      issues.push(makeIssue('EVENT_ORPHAN', 'warning', `Linha ${lineNo}: evento para entidade inexistente ${obj.entity_id}`, { file, line: lineNo, entity_id: obj.entity_id }));
      return;
    }
    if (!isIsoDate(obj.timestamp) || !TZ_RE.test(obj.timestamp)) {
      issues.push(makeIssue('EVENT_TS_INVALID', 'warning', `Linha ${lineNo}: timestamp sem formato ISO 8601 com fuso: ${obj.timestamp}`, { file, line: lineNo, entity_id: obj.entity_id }));
    }
    stats.accepted++;
    events.push({ ...obj, _line: lineNo });
  });
  if (nonBlank === 0) issues.push(makeIssue('NO_HISTORY', 'warning', 'events.jsonl ausente ou vazio: sem historico', { file }));
  return { events, issues, stats };
}

// Divergencias entre control.json e eventos (FR-007): estado atual x ultimo evento, SPEC sem evento de criacao.
export function reconcileControlAndEvents(control, events) {
  const issues = [];
  const file = relFile(EVENTS_FILE);
  const byEntity = new Map();
  for (const ev of events) {
    if (!byEntity.has(ev.entity_id)) byEntity.set(ev.entity_id, []);
    byEntity.get(ev.entity_id).push(ev);
  }
  for (const s of uniqueSpecs(control)) {
    if (typeof s.id !== 'string') continue;
    const list = byEntity.get(s.id) || [];
    if (!list.some((e) => e.event_type === 'spec.created')) {
      issues.push(makeIssue('SPEC_NO_CREATED_EVENT', 'info', `SPEC ${s.id} sem evento spec.created`, { file, entity_id: s.id }));
    }
    const withState = list.filter((e) => isObj(e.after) && typeof e.after.state === 'string');
    const last = withState[withState.length - 1];
    if (last && last.after.state !== s.state) {
      issues.push(makeIssue('STATE_EVENT_MISMATCH', 'warning', `SPEC ${s.id}: estado no controle ${s.state}, ultimo evento (linha ${last._line}) diz ${last.after.state}`, { file, line: last._line, entity_id: s.id }));
    }
  }
  return issues;
}

const ENTITY_ID_RE = /^(SPEC|TASK)-\d+$/;
const ANY_ID_RE = /^(SPEC|TASK|TEST|BUG|ADR)-\d+$/;

// Primeira ocorrencia de cada SPEC por id: duplicadas nao somam em dobro (AC-8).
export function uniqueSpecs(control) {
  const seen = new Set();
  const out = [];
  const specs = control && Array.isArray(control.specs) ? control.specs : [];
  for (const s of specs) {
    if (!isObj(s)) continue;
    if (typeof s.id === 'string' && s.id) {
      if (seen.has(s.id)) continue;
      seen.add(s.id);
    }
    out.push(s);
  }
  return out;
}

// Todas as tarefas declaradas (spec.tasks[] e control.tasks[]), com a SPEC dona quando houver.
export function collectTasks(control) {
  const out = [];
  const specs = control && Array.isArray(control.specs) ? control.specs : [];
  for (const s of specs) {
    if (isObj(s) && Array.isArray(s.tasks)) for (const tk of s.tasks) if (isObj(tk)) out.push({ task: tk, spec_id: s.id });
  }
  if (control && Array.isArray(control.tasks)) for (const tk of control.tasks) if (isObj(tk)) out.push({ task: tk, spec_id: null });
  return out;
}

// Extrai ids referenciados de um item de dependencies/validates/blockers (texto livre e ids de outro projeto sao ignorados).
function refIds(item) {
  const found = [];
  const take = (v) => {
    if (typeof v === 'string' && ANY_ID_RE.test(v.trim())) found.push(v.trim());
  };
  if (typeof item === 'string') take(item);
  else if (isObj(item)) for (const k of ['id', 'ref', 'depends_on', 'dependency', 'blocked_by', 'spec_id', 'task_id']) take(item[k]);
  return found;
}

// Referencias quebradas, ids duplicados e ciclos (so sinaliza; nunca "resolve" nada).
export function validateReferences(control) {
  const issues = [];
  const file = relFile(CONTROL_FILE);
  const add = (code, sev, msg, entity) => issues.push(makeIssue(code, sev, msg, { file, entity_id: entity ?? null }));
  const specs = (Array.isArray(control.specs) ? control.specs : []).filter(isObj);
  const tasks = collectTasks(control);

  const known = new Set();
  const dupSpec = new Set();
  for (const s of specs) {
    if (typeof s.id !== 'string' || !s.id) continue;
    if (known.has(s.id)) dupSpec.add(s.id);
    known.add(s.id);
  }
  for (const id of dupSpec) add('DUP_ID', 'error', `ID de SPEC repetido: ${id}`, id);
  const dupTask = new Set();
  const seenTask = new Set();
  for (const { task } of tasks) {
    if (typeof task.id !== 'string' || !task.id) continue;
    if (seenTask.has(task.id)) dupTask.add(task.id);
    seenTask.add(task.id);
    known.add(task.id);
  }
  for (const id of dupTask) add('DUP_ID', 'error', `ID de tarefa repetido: ${id}`, id);

  // arestas de dependencia (quem depende de quem) + conferencia de referencias
  const edges = new Map();
  const link = (from, to) => {
    if (!edges.has(from)) edges.set(from, new Set());
    edges.get(from).add(to);
  };
  const checkRef = (owner, ref, kind) => {
    if (!ENTITY_ID_RE.test(ref)) return false; // TEST/BUG/ADR nao sao entidades do controle
    if (!known.has(ref)) {
      add('BROKEN_REF', 'error', `${kind} de ${owner} aponta para ID inexistente: ${ref}`, owner);
      return false;
    }
    return true;
  };
  const scan = (owner, ent) => {
    for (const d of Array.isArray(ent.dependencies) ? ent.dependencies : []) {
      for (const ref of refIds(d)) if (checkRef(owner, ref, 'dependencia')) link(owner, ref);
    }
    for (const v of Array.isArray(ent.validates) ? ent.validates : []) {
      for (const ref of refIds(v)) checkRef(owner, ref, 'validates');
    }
    for (const b of Array.isArray(ent.blockers) ? ent.blockers : []) {
      for (const ref of refIds(b)) checkRef(owner, ref, 'bloqueio');
    }
  };
  for (const s of specs) if (typeof s.id === 'string' && s.id) scan(s.id, s);
  for (const { task } of tasks) if (typeof task.id === 'string' && task.id) scan(task.id, task);
  for (const d of Array.isArray(control.dependencies) ? control.dependencies : []) {
    if (!isObj(d)) continue;
    const from = typeof d.from === 'string' ? d.from : null;
    const to = typeof d.to === 'string' ? d.to : null;
    const okFrom = from && (!ENTITY_ID_RE.test(from) || known.has(from));
    const okTo = to && (!ENTITY_ID_RE.test(to) || known.has(to));
    if (from && !okFrom) add('BROKEN_REF', 'error', `dependencies[].from aponta para ID inexistente: ${from}`, from);
    if (to && !okTo) add('BROKEN_REF', 'error', `dependencies[].to aponta para ID inexistente: ${to}`, to);
    if (from && to && ENTITY_ID_RE.test(from) && ENTITY_ID_RE.test(to) && known.has(from) && known.has(to) && d.type !== 'validates') link(from, to);
  }

  // ciclos por DFS com cores; cada ciclo e relatado uma vez
  const color = new Map();
  const stack = [];
  const reported = new Set();
  const visit = (n) => {
    color.set(n, 1);
    stack.push(n);
    for (const m of edges.get(n) || []) {
      const c = color.get(m) || 0;
      if (c === 0) visit(m);
      else if (c === 1) {
        const cyc = stack.slice(stack.indexOf(m));
        const key = [...cyc].sort().join('|');
        if (!reported.has(key)) {
          reported.add(key);
          add('DEP_CYCLE', 'error', `Ciclo de dependencias: ${[...cyc, m].join(' -> ')}`, m);
        }
      }
    }
    stack.pop();
    color.set(n, 2);
  };
  for (const n of [...edges.keys()].sort()) if (!color.get(n)) visit(n);
  return issues;
}

function dateChecks(obj, where, add) {
  for (const [k, v] of Object.entries(obj)) {
    if ((k.endsWith('_at') || k.endsWith('_date')) && v !== null && v !== undefined && !isIsoDate(v)) {
      add('DATE_INVALID', 'error', `${where}.${k} nao e data ISO 8601: ${JSON.stringify(v)}`, where);
    }
  }
}

function validateSpec(spec, idx, add) {
  if (!isObj(spec)) {
    add('SCHEMA_BAD_TYPE', 'error', `specs[${idx}] deve ser objeto`, `specs[${idx}]`);
    return;
  }
  const eid = typeof spec.id === 'string' && spec.id ? spec.id : `specs[${idx}]`;
  for (const f of ['id', 'title', 'type', 'state']) {
    if (typeof spec[f] !== 'string' || !spec[f]) add('SCHEMA_MISSING_FIELD', 'error', `SPEC sem campo obrigatorio: ${f}`, eid);
  }
  if (!('points' in spec)) add('SCHEMA_MISSING_FIELD', 'error', 'SPEC sem campo obrigatorio: points', eid);
  if (!isObj(spec.progress) && spec.progress !== NOT_CALCULABLE) add('SCHEMA_MISSING_FIELD', 'error', 'SPEC sem campo obrigatorio: progress (objeto)', eid);

  if (typeof spec.state === 'string' && spec.state && !VALID_STATES.includes(spec.state)) {
    add('STATE_INVALID', 'error', `Estado fora do protocolo: ${spec.state}`, eid);
  }
  if (spec.category !== undefined && spec.category !== null && !VALID_CATEGORIES.includes(spec.category)) {
    add('CATEGORY_INVALID', 'warning', `Categoria fora do protocolo: ${JSON.stringify(spec.category)}`, eid);
  }
  if ('points' in spec && spec.points !== null && !(typeof spec.points === 'number' && FIBONACCI.includes(spec.points))) {
    add('POINTS_NOT_FIBONACCI', 'error', `Pontos fora de 1, 2, 3, 5, 8, 13, 21: ${JSON.stringify(spec.points)}`, eid);
  }
  if (isObj(spec.progress)) {
    for (const d of PROGRESS_DIMS) {
      const v = spec.progress[d];
      if (v !== undefined && v !== null && v !== NOT_CALCULABLE && !isPercent(v)) add('PERCENT_INVALID', 'error', `progress.${d} fora de 0..100: ${JSON.stringify(v)}`, eid);
    }
  }
  dateChecks(spec, eid, add);
  const hrs = readSpecHours(spec);
  if (hrs.variant) add('HOURS_FIELD_VARIANT', 'warning', 'Horas no formato do protocolo (original_estimate_hours...) em vez de hours:{original,...}', eid);
  for (const k of ['original', 'current', 'actual', 'remaining']) {
    if (hrs[k] !== null && !isHours(hrs[k])) add('HOURS_INVALID', 'error', `Horas ${k} invalidas: ${JSON.stringify(hrs[k])}`, eid);
  }
  if (spec.state === 'completed' && !(Array.isArray(spec.evidence) && spec.evidence.length > 0)) {
    add('COMPLETED_NO_EVIDENCE', 'warning', 'SPEC concluida sem nenhuma evidencia', eid);
  }
}

export function statusFromIssues(issues) {
  if (issues.some(isFatalIssue)) return 'rejected';
  if (issues.some((i) => i.severity === 'warning' || i.severity === 'error')) return 'valid_with_alerts';
  return 'valid';
}

// Le (somente leitura) o controle de producao de um projeto. Nunca lanca.
export function readProductionControl(projectPath) {
  const result = emptyResult(projectPath);
  try {
    const files = locateProductionFiles(projectPath);
    result.files = files;
    if (!files.control) {
      // Sem control.json nao ha controle v2 (fallback para SPECS.md fica com o scanner).
      return result;
    }
    result.found = true;

    const ctlLabel = relFile(CONTROL_FILE);
    const rd = readTextLimited(files.control, MAX_CONTROL_BYTES, ctlLabel);
    if (rd.issue) {
      result.issues.push(rd.issue);
    } else {
      const parsed = parseJsonText(rd.text, ctlLabel);
      if (parsed.issue) result.issues.push(parsed.issue);
      else {
        result.control = parsed.value;
        const pj = parsed.value && parsed.value.project;
        result.declared_updated_at = (pj && typeof pj.last_updated_at === 'string') ? pj.last_updated_at : null;
        result.issues.push(...validateControl(parsed.value));
      }
    }

    // Eventos (opcional; problemas em linhas isolam so a linha). Control rejeitado nao tem o que conferir.
    if (!result.issues.some(isFatalIssue) && result.control && isObj(result.control) && typeof (result.control.project || {}).project_id === 'string') {
      const evLabel = relFile(EVENTS_FILE);
      let text = null;
      if (files.events) {
        const ev = readTextLimited(files.events, MAX_EVENTS_BYTES, evLabel, 'EVENTS_UNREADABLE', 'EVENTS_UNREADABLE', 'warning');
        if (ev.issue) result.issues.push(ev.issue);
        else text = ev.text;
      }
      const pe = parseEventsJsonl(text, result.control);
      result.events = pe.events;
      result.eventStats = pe.stats;
      result.issues.push(...pe.issues);
      if (pe.events.length > 0) result.issues.push(...reconcileControlAndEvents(result.control, pe.events));
    }

    // Baseline (opcional; ausencia e aviso, nunca erro fatal).
    const bslLabel = relFile(BASELINE_FILE);
    if (!files.baseline) {
      result.issues.push(makeIssue('BASELINE_MISSING', 'warning', 'production-baseline.json ausente', { file: bslLabel }));
    } else {
      const bl = readTextLimited(files.baseline, MAX_BASELINE_BYTES, bslLabel, 'BASELINE_INVALID', 'BASELINE_INVALID', 'warning');
      if (bl.issue) result.issues.push(bl.issue);
      else {
        const bp = parseJsonText(bl.text, bslLabel, 'BASELINE_INVALID', 'warning');
        if (bp.issue) result.issues.push(bp.issue);
        else result.baseline = bp.value;
      }
    }
  } catch (e) {
    result.issues.push(makeIssue('INTERNAL_ERROR', 'error', `Falha inesperada na leitura: ${e && e.message}`));
  }
  result.status = statusFromIssues(result.issues);
  return result;
}

// ---------------------------------------------------------------------------------------------
// Mapeamento para o formato legado (spec 006): a UI atual continua funcionando sem mudanca (FR-013).
// Tabela UNICA categoria do protocolo (plural) -> categoria exibida pela Dashboard (singular).
// ---------------------------------------------------------------------------------------------
export const CATEGORY_V2_TO_LEGACY = Object.freeze({
  finalizadas: 'finalizada',
  em_andamento: 'em_andamento',
  fila: 'fila',
  dependendo_alexandre: 'dependendo_alexandre',
  impedidas: 'impedida',
  invalidas: 'invalida'
});
// Categoria legada -> status legado usado por project_specs/buildStepper.
export const LEGACY_STATUS_BY_CATEGORY = Object.freeze({
  finalizada: 'done',
  em_andamento: 'in_progress',
  fila: 'pending',
  dependendo_alexandre: 'awaiting_alexandre',
  impedida: 'blocked',
  invalida: 'invalid'
});

// Lista de SPECs no formato que AppDb.saveSpecs ja aceita. SPECs duplicadas entram uma vez.
export function mapToLegacySpecs(control) {
  return uniqueSpecs(control)
    .filter((s) => typeof s.id === 'string' && s.id)
    .map((s) => {
      const category = CATEGORY_V2_TO_LEGACY[categoryOf(s)];
      const tasks = Array.isArray(s.tasks) ? s.tasks.filter(isObj) : [];
      const completed = tasks.filter((t) => t.state === 'completed').length;
      const done = category === 'finalizada';
      const total = tasks.length;
      return {
        spec_id: s.id,
        spec_name: typeof s.title === 'string' && s.title ? s.title : s.id,
        status: LEGACY_STATUS_BY_CATEGORY[category],
        // peso de exibicao: o ponto lido; ausente ou nao positivo vira 1 (os totais reais vem de legacySpecsMetrics)
        weight: typeof s.points === 'number' && s.points > 0 ? s.points : 1,
        category,
        total_tasks: total,
        completed_tasks: total ? completed : done ? 1 : 0,
        pending_tasks: total ? total - completed : done ? 0 : 1,
        pending_tasks_json: tasks.filter((t) => t.state !== 'completed').slice(0, 3).map((t) => (typeof t.title === 'string' ? t.title : t.id)).filter(Boolean),
        summary: typeof s.title === 'string' ? s.title : '',
        source_worktree: null
      };
    });
}

// Bloco "metricas" no formato do JSON do SPECS.md da spec 006 (total_specs, total_pontos, <categoria>:{quantidade,pontos,percentual}).
export function legacySpecsMetrics(control) {
  const specs = uniqueSpecs(control).filter((s) => typeof s.id === 'string' && s.id);
  const total = specs.reduce((a, s) => a + (typeof s.points === 'number' && Number.isFinite(s.points) ? s.points : 0), 0);
  const out = { total_specs: specs.length, total_pontos: Number(total.toFixed(1)) };
  for (const cat of VALID_CATEGORIES) {
    const list = specs.filter((s) => categoryOf(s) === cat);
    const pts = list.reduce((a, s) => a + (typeof s.points === 'number' && Number.isFinite(s.points) ? s.points : 0), 0);
    out[cat] = { quantidade: list.length, pontos: pts, percentual: total ? Math.round((pts / total) * 1000) / 10 : 0 };
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// Indicadores gerenciais (SPEC-0007 T8; protocolo §11 inteiro e §12: producao, esforco, previsibilidade,
// bloqueios e fluxo parcial; D-007). PURO e deterministico: o relogio entra so por opts.now (ISO) e, sem ele,
// as idades ficam nulas. Regra de ouro: desconhecido PERMANECE nulo (nunca zero) e cada componente informa a
// base (n de itens); sem base, "sem dado". Sem nota unica.
// ---------------------------------------------------------------------------------------------
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const round1 = (v) => Math.round(v * 10) / 10;
const daysBetween = (fromIso, toIso) => {
  const a = Date.parse(fromIso);
  const b = Date.parse(toIso);
  return Number.isFinite(a) && Number.isFinite(b) ? round1((b - a) / 86400000) : null;
};
// Componente com base explicita: percent nulo (e sem_dado) quando a base e vazia.
const ratio = (n, base) => ({ n, base, percent: base > 0 ? round1((n / base) * 100) : null, sem_dado: base === 0 });
const median = (list) => {
  if (!list.length) return null;
  const s = [...list].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return round1(s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2);
};
const hasText = (v) => typeof v === 'string' && v.trim() !== '';

export const DIVERGENCE_CODES = ['SUMMARY_MISMATCH', 'STATE_EVENT_MISMATCH'];

// Contagens e pontos do baseline em formato normalizado (aceita os dois formatos reais: counts.specs |
// counts.specs_total | counts.spec_count; counts.total_points | soma de counts.categories[*].pontos).
export function normalizeBaseline(baseline) {
  if (!isObj(baseline)) return null;
  const c = isObj(baseline.counts) ? baseline.counts : {};
  const cats = isObj(c.categories) ? c.categories : null;
  let catPoints = null;
  if (cats) {
    const vals = Object.values(cats).map((v) => (isObj(v) ? v.pontos : null));
    if (vals.length && vals.every(isNum)) catPoints = vals.reduce((a, b) => a + b, 0);
  }
  const first = (...vs) => vs.find(isNum) ?? null;
  return {
    baseline_at: typeof baseline.baseline_at === 'string' ? baseline.baseline_at : null,
    specs: first(c.specs, c.specs_total, c.spec_count),
    total_points: first(c.total_points, catPoints),
    completed_points: first(c.completed_points, isObj(cats && cats.finalizadas) ? cats.finalizadas.pontos : null),
    completed_specs: first(c.completed, isObj(c.states) ? c.states.completed : null)
  };
}

export function computeProductionMetrics(control, events = [], baseline = null, opts = {}) {
  const now = typeof opts.now === 'string' && Number.isFinite(Date.parse(opts.now)) ? opts.now : null;
  const issues = Array.isArray(opts.issues) ? opts.issues : [];
  const stats = opts.eventStats || null;
  const specs = uniqueSpecs(control).filter((s) => typeof s.id === 'string' && s.id);
  const tasks = collectTasks(control).map((t) => t.task);
  const evs = Array.isArray(events) ? events : [];

  // ---- Producao (FR-014): total, concluidos (+ equivalente), restantes, impedidos; SPEC e tarefa nao somam em dobro.
  const pts = (s) => (isNum(s.points) ? s.points : null);
  const byCategory = {};
  for (const cat of VALID_CATEGORIES) byCategory[cat] = { count: 0, points: 0 };
  let total = 0, completed = 0, equivalent = 0, remaining = 0, blocked = 0, awaiting = 0, noPoints = 0;
  for (const s of specs) {
    const cat = categoryOf(s);
    byCategory[cat].count++;
    const p = pts(s);
    if (p === null) { noPoints++; continue; }
    total += p;
    byCategory[cat].points += p;
    if (s.state === 'completed') completed += p;
    else if (s.state === 'cancelled' || cat === 'invalidas') { /* nao conta como restante */ }
    else {
      const eq = isNum(s.completed_points_equivalent) ? Math.min(Math.max(s.completed_points_equivalent, 0), p) : 0;
      equivalent += eq;
      remaining += p - eq;
    }
    if (s.state === 'blocked' || cat === 'impedidas') blocked += p;
    if (cat === 'dependendo_alexandre') awaiting += p;
  }
  const production = {
    spec_count: specs.length,
    task_count: tasks.length,
    total_points: total,
    completed_points: completed,
    completed_points_equivalent: equivalent,
    remaining_points: remaining,
    blocked_points: blocked,
    awaiting_alexandre_points: awaiting,
    specs_without_points: noPoints,
    by_category: byCategory,
    in_validation: specs.filter((s) => s.state === 'in_validation').length,
    tasks_completed: tasks.filter((t) => t.state === 'completed').length,
    accepted_deliveries: specs.filter((s) => s.state === 'completed').length
  };

  // ---- Esforco (FR-015): quatro grandezas separadas; so soma SPECs com o dado e informa a cobertura.
  const hours = specs.map((s) => readSpecHours(s));
  const effort = {};
  for (const k of ['original', 'current', 'actual', 'remaining']) {
    const known = hours.map((h) => h[k]).filter(isNum);
    effort[k] = { sum: known.length ? round1(known.reduce((a, b) => a + b, 0)) : null, with_data: known.length, missing: specs.length - known.length, total: specs.length };
  }

  // ---- Previsibilidade: reestimativa (original x atual); erro so com horas reais; nunca a partir de pontos.
  const both = hours.filter((h) => isNum(h.original) && isNum(h.current));
  const changed = both.filter((h) => h.current !== h.original);
  const err = specs.map((s, i) => ({ s, h: hours[i] })).filter(({ s, h }) => s.state === 'completed' && isNum(h.actual) && isNum(h.original));
  const errHours = err.map(({ h }) => h.actual - h.original);
  const predictability = {
    reestimate: {
      base: both.length,
      changed: changed.length,
      variance_hours: both.length ? round1(both.reduce((a, h) => a + (h.current - h.original), 0)) : null,
      events: evs.filter((e) => /estimat/i.test(e.event_type || '')).length,
      sem_dado: both.length === 0
    },
    estimate_error: {
      base: err.length,
      mean_error_hours: err.length ? round1(errHours.reduce((a, b) => a + b, 0) / err.length) : null,
      mean_abs_error_hours: err.length ? round1(errHours.reduce((a, b) => a + Math.abs(b), 0) / err.length) : null,
      sem_dado: err.length === 0
    }
  };

  // ---- Fluxo parcial: WIP, validacao, ciclo (so com inicio e aceite), idade, entradas/conclusoes por mes.
  const started = (s) => (hasText(s.started_at) ? s.started_at : null);
  const accepted = (s) => (hasText(s.accepted_at) ? s.accepted_at : hasText(s.completed_at) ? s.completed_at : null);
  const cycle = specs.filter((s) => s.state === 'completed' && started(s) && accepted(s)).map((s) => daysBetween(started(s), accepted(s))).filter(isNum);
  const active = specs.filter((s) => (s.state === 'in_progress' || s.state === 'reopened') && started(s));
  const ages = now ? active.map((s) => daysBetween(started(s), now)).filter(isNum) : [];
  const month = (ev) => (typeof ev.timestamp === 'string' ? ev.timestamp.slice(0, 7) : null);
  const bucket = (type) => {
    const out = {};
    for (const e of evs) if (e.event_type === type && month(e)) out[month(e)] = (out[month(e)] || 0) + 1;
    return out;
  };
  const flow = {
    wip: specs.filter((s) => s.state === 'in_progress' || s.state === 'reopened').length,
    in_validation: production.in_validation,
    blocked: specs.filter((s) => s.state === 'blocked').length,
    cycle_time_days: { base: cycle.length, median: median(cycle), sem_dado: cycle.length === 0 },
    active_age_days: { base: ages.length, max: ages.length ? Math.max(...ages) : null, sem_dado: ages.length === 0 },
    created_by_month: bucket('spec.created'),
    completed_by_month: bucket('spec.completed')
  };

  // ---- Bloqueios: quantidade, pontos, idade (so com data de inicio e relogio), por tipo.
  const kinds = {};
  let blockerCount = 0;
  const bAges = [];
  for (const s of specs) {
    if (s.state === 'completed' || s.state === 'cancelled') continue;
    for (const b of Array.isArray(s.blockers) ? s.blockers : []) {
      blockerCount++;
      const kind = isObj(b) && hasText(b.kind || b.type) ? String(b.kind || b.type) : 'unspecified';
      kinds[kind] = (kinds[kind] || 0) + 1;
      const since = isObj(b) ? b.since || b.created_at : null;
      if (now && hasText(since)) { const d = daysBetween(since, now); if (isNum(d)) bAges.push(d); }
    }
  }
  const blockers = {
    blocked_specs: flow.blocked,
    blocker_entries: blockerCount,
    blocked_points: blocked,
    awaiting_alexandre_specs: byCategory.dependendo_alexandre.count,
    awaiting_alexandre_points: awaiting,
    by_kind: kinds,
    oldest_days: bAges.length ? Math.max(...bAges) : null,
    age_base: bAges.length
  };

  // ---- Qualidade/retrabalho: so com eventos (sem eventos = sem dado, nao zero).
  const defectEvents = evs.filter((e) => /^(defect|bug)\./.test(e.event_type || '')).length;
  const rework = {
    sem_dado: evs.length === 0,
    reopened_specs: specs.filter((s) => s.state === 'reopened').length,
    reopen_events: evs.filter((e) => e.event_type === 'spec.reopened').length,
    defect_events: defectEvents
  };

  // ---- Qualidade do controle (§11), componente a componente, cada um com a sua base.
  const critBase = tasks.length;
  const critOk = tasks.filter((t) => [t.acceptance_criteria, t.criteria, t.done_when].some((c) => (Array.isArray(c) ? c.length > 0 : hasText(c)))).length;
  const doneSpecs = specs.filter((s) => s.state === 'completed');
  const doneWithEvidence = doneSpecs.filter((s) => Array.isArray(s.evidence) && s.evidence.length > 0).length;
  const pointed = specs.filter((s) => pts(s) !== null);
  const justified = pointed.filter((s) => hasText(s.points_justification)).length;
  let unknown = 0;
  specs.forEach((s, i) => {
    if (pts(s) === null) unknown++;
    for (const k of ['original', 'current', 'actual', 'remaining']) if (!isNum(hours[i][k])) unknown++;
  });
  const lastFull = isObj(control && control.audit) && hasText(control.audit.last_full_audit_at) ? control.audit.last_full_audit_at : null;
  const control_quality = {
    criteria_verifiable: ratio(critOk, critBase),
    completed_with_evidence: ratio(doneWithEvidence, doneSpecs.length),
    estimates_justified: ratio(justified, pointed.length),
    unknown_fields: ratio(unknown, specs.length * 5),
    divergences: { n: issues.filter((i) => DIVERGENCE_CODES.includes(i.code)).length, codes: DIVERGENCE_CODES },
    events_without_reference: stats ? ratio(stats.orphan, stats.lines) : { n: null, base: null, percent: null, sem_dado: true },
    last_full_audit_age_days: now && lastFull ? daysBetween(lastFull, now) : null,
    last_full_audit_at: lastFull
  };

  // ---- Baseline x atual (FR-018): ausente = sinalizado, nunca erro.
  const bl = normalizeBaseline(baseline);
  const baselineCmp = bl
    ? {
        present: true,
        baseline_at: bl.baseline_at,
        baseline_specs: bl.specs,
        baseline_points: bl.total_points,
        baseline_completed_points: bl.completed_points,
        current_specs: specs.length,
        current_points: total,
        current_completed_points: completed,
        delta_specs: isNum(bl.specs) ? specs.length - bl.specs : null,
        delta_points: isNum(bl.total_points) ? total - bl.total_points : null,
        delta_completed_points: isNum(bl.completed_points) ? completed - bl.completed_points : null
      }
    : { present: false };

  return { production, effort, predictability, flow, blockers, rework, control_quality, baseline: baselineCmp, computed_with_now: now !== null };
}

export function mapToLegacy(control) {
  return { specs: mapToLegacySpecs(control), specsMetrics: legacySpecsMetrics(control) };
}
