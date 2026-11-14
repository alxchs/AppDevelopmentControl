// SPEC-0008: testes da ingestao v2 (docs/production). Banco temporario e fixtures temporarias; nunca abre o
// banco real nem escreve em projeto monitorado. Sem janelas, sem rede, sem relogio. Runner proprio: check('...').
import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { AppDb } from '../src/db.js';
import { ProjectScanner } from '../src/scanner.js';
import * as prod from '../src/production.js';
import * as fx from './fixtures-production.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const realDbPath = path.resolve(here, '..', 'app_development_control.db');
const realDbBefore = fs.existsSync(realDbPath) ? fs.statSync(realDbPath) : null;

// ---------- runner ----------
const results = [];
class Skip extends Error {}
function skip(reason) { throw new Skip(reason); }
function check(name, fn) {
  try {
    fn();
    results.push({ name, status: 'PASS' });
  } catch (e) {
    if (e instanceof Skip) results.push({ name, status: 'SKIP', note: e.message });
    else results.push({ name, status: 'FAIL', note: (e && e.stack ? e.stack.split('\n').slice(0, 4).join(' | ') : String(e)) });
  }
}
async function checkAsync(name, fn) {
  try {
    await fn();
    results.push({ name, status: 'PASS' });
  } catch (e) {
    if (e instanceof Skip) results.push({ name, status: 'SKIP', note: e.message });
    else results.push({ name, status: 'FAIL', note: (e && e.stack ? e.stack.split('\n').slice(0, 4).join(' | ') : String(e)) });
  }
}
const codes = (r) => r.issues.map((i) => i.code).sort();
const codesOf = (issues) => issues.map((i) => i.code).sort();

// ---------- raiz temporaria unica por execucao ----------
const guid = crypto.randomUUID();
const guidRoot = path.join(os.tmpdir(), 'claude', guid);
const tmpRoot = path.join(guidRoot, 'desenv', 'utils', 'AppDevelopmentControl', 'test-production-v2');
fs.mkdirSync(tmpRoot, { recursive: true });
let db = null;

try {
  console.log('=== SPEC-0008: testes da ingestao v2 ===');
  console.log('raiz temporaria: ' + tmpRoot);

  // ===== 0008 T1: infraestrutura (AC-1, AC-2) =====
  check('[0008:AC-1] raiz das fixtures fica sob o tmpdir com GUID proprio', () => {
    assert(tmpRoot.startsWith(os.tmpdir()), 'raiz fora do tmpdir');
    assert(tmpRoot.includes(guid), 'raiz sem GUID da execucao');
    assert(fs.existsSync(tmpRoot));
  });
  check('[0008:AC-2] banco dos testes e temporario e proprio (nunca o banco real)', () => {
    const dbPath = path.join(tmpRoot, 'test.db');
    db = new AppDb(dbPath);
    assert.strictEqual(db.dbPath, dbPath);
    assert(db.dbPath.startsWith(os.tmpdir()));
    const real = path.resolve(here, '..', 'app_development_control.db');
    assert.notStrictEqual(path.resolve(db.dbPath), real);
  });

  // ===== 0008 T2 / 0007 T1: leitura (AC-5 JSON, AC-12 parte, AC-21) =====
  check('[0007:AC-4] projeto sem docs/production: status absent, sem issues, sem excecao', () => {
    const p = fx.makeProject(tmpRoot, 'sem-prod', {});
    const r = prod.readProductionControl(p);
    assert.strictEqual(r.found, false);
    assert.strictEqual(r.status, 'absent');
    assert.deepStrictEqual(r.issues, []);
  });
  check('[0007:AC-4] caminho inexistente e caminho que e arquivo nao lancam', () => {
    assert.strictEqual(prod.readProductionControl(path.join(tmpRoot, 'nao-existe')).status, 'absent');
    const f = path.join(tmpRoot, 'um-arquivo.txt');
    fs.writeFileSync(f, 'x');
    assert.strictEqual(prod.readProductionControl(f).status, 'absent');
  });
  check('[0007:AC-5][0008:AC-5] JSON truncado e rejeitado com JSON_PARSE (sem excecao)', () => {
    const text = JSON.stringify(fx.validControlMin(), null, 2);
    const p = fx.makeProject(tmpRoot, 'trunc', { control: fx.truncateJson(text), baseline: fx.validBaseline() });
    const r = prod.readProductionControl(p);
    assert.strictEqual(r.status, 'rejected');
    assert.deepStrictEqual(codes(r), ['JSON_PARSE']);
    assert.strictEqual(r.control, null);
  });
  check('[0007:AC-5] control.json vazio e rejeitado com JSON_PARSE', () => {
    const p = fx.makeProject(tmpRoot, 'vazio', { control: '', baseline: fx.validBaseline() });
    const r = prod.readProductionControl(p);
    assert.strictEqual(r.status, 'rejected');
    assert(codes(r).includes('JSON_PARSE'));
  });
  check('[0008:AC-12] BOM e CRLF no control.json sao lidos corretamente', () => {
    const p = fx.makeProject(tmpRoot, 'bom-crlf', { control: fx.validControlMin(), baseline: fx.validBaseline(), events: fx.createdEvents(fx.validControlMin().specs), bom: true, crlf: true });
    const r = prod.readProductionControl(p);
    assert.strictEqual(r.status, 'valid', JSON.stringify(r.issues));
    assert.strictEqual(r.control.project.project_id, fx.PROJECT_ID);
  });
  check('[0007:AC-21][0008:AC-22] control.json ilegivel (nao e arquivo) e rejeitado com FILE_UNREADABLE', () => {
    const p = path.join(tmpRoot, 'ilegivel');
    fs.mkdirSync(path.join(p, 'docs', 'production', 'production-control.json'), { recursive: true });
    const r = prod.readProductionControl(p);
    assert.strictEqual(r.status, 'rejected');
    assert.deepStrictEqual(codes(r), ['BASELINE_MISSING', 'FILE_UNREADABLE']);
  });
  check('[0007:AC-21] control.json gigante e rejeitado com FILE_TOO_LARGE sem ler o arquivo', () => {
    const p = fx.makeProject(tmpRoot, 'gigante', { control: '', baseline: fx.validBaseline() });
    fs.writeFileSync(path.join(p, 'docs', 'production', 'production-control.json'), Buffer.alloc(prod.MAX_CONTROL_BYTES + 1, 0x20));
    const r = prod.readProductionControl(p);
    assert.strictEqual(r.status, 'rejected');
    assert(codes(r).includes('FILE_TOO_LARGE'));
  });
  check('[0007:AC-14][0008:AC-21] leitura nao escreve: modulo sem API de escrita e arvore com hash identico', () => {
    const src = fs.readFileSync(path.join(here, '..', 'src', 'production.js'), 'utf8');
    const forbidden = /fs\.(write|append|rename|unlink|rm|rmdir|mkdir|copy|truncate|createWriteStream|symlink|link|chmod|utimes|open)\w*\(/;
    assert(!forbidden.test(src), 'production.js usa API de escrita de fs');
    const p = fx.makeProject(tmpRoot, 'hash-leitura', { control: fx.validControlMin(), events: fx.createdEvents(fx.validControlMin().specs), baseline: fx.validBaseline() });
    const before = fx.hashTree(p);
    prod.readProductionControl(p);
    assert.strictEqual(fx.hashTree(p), before);
  });

  // ===== 0008 T3 / 0007 T2: schema e valores =====
  const ingest = (name, control, extra = {}) =>
    prod.readProductionControl(fx.makeProject(tmpRoot, name, { control, baseline: fx.validBaseline(), events: fx.createdEvents(control && Array.isArray(control.specs) ? control.specs : []), ...extra }));

  check('[0008:AC-3][0007:AC-1] fixture minima valida: status valid, zero issues, pontos e estado do arquivo', () => {
    const r = ingest('min', fx.validControlMin());
    assert.strictEqual(r.status, 'valid', JSON.stringify(r.issues));
    assert.deepStrictEqual(r.issues, []);
    assert.strictEqual(r.control.specs[0].points, 3);
    assert.strictEqual(r.control.specs[0].state, 'completed');
    assert.strictEqual(r.declared_updated_at, fx.TS);
  });
  check('[0008:AC-5][0007:AC-5] schema_version 1.0 e rejeitado com SCHEMA_VERSION', () => {
    const r = ingest('schema10', fx.withSchema(fx.validControlMin(), '1.0'));
    assert.strictEqual(r.status, 'rejected');
    assert.deepStrictEqual(codes(r), ['SCHEMA_VERSION']);
  });
  check('[0008:AC-6][0007:AC-5] bloco ausente: cada ausencia gera SCHEMA_MISSING_BLOCK e rejeita', () => {
    const noSpecs = fx.mutate(fx.validControlMin(), (c) => { delete c.specs; });
    const noProject = fx.mutate(fx.validControlMin(), (c) => { delete c.project; });
    const r1 = ingest('sem-specs', noSpecs);
    const r2 = ingest('sem-project', noProject);
    assert.strictEqual(r1.status, 'rejected');
    assert.deepStrictEqual(codes(r1), ['SCHEMA_MISSING_BLOCK']);
    assert.strictEqual(r1.issues[0].entity_id, 'specs');
    assert.strictEqual(r2.status, 'rejected');
    assert.deepStrictEqual(codes(r2), ['SCHEMA_MISSING_BLOCK']);
    assert.strictEqual(r2.issues[0].entity_id, 'project');
  });
  check('[0008:AC-6][0007:AC-5] objeto vazio {} gera schema_version + os 6 blocos ausentes', () => {
    const r = ingest('vazio-obj', {});
    assert.strictEqual(r.status, 'rejected');
    assert.deepStrictEqual(codes(r), ['SCHEMA_MISSING_BLOCK', 'SCHEMA_MISSING_BLOCK', 'SCHEMA_MISSING_BLOCK', 'SCHEMA_MISSING_BLOCK', 'SCHEMA_MISSING_BLOCK', 'SCHEMA_MISSING_BLOCK', 'SCHEMA_VERSION']);
  });
  check('[0008:AC-6][0007:AC-5] tipo errado de bloco (specs objeto) gera SCHEMA_BAD_TYPE', () => {
    const r = ingest('tipo-errado', fx.mutate(fx.validControlMin(), (c) => { c.specs = {}; }));
    assert.strictEqual(r.status, 'rejected');
    assert.deepStrictEqual(codes(r), ['SCHEMA_BAD_TYPE']);
  });
  check('[0008:AC-6][0007:AC-5] SPEC sem id gera SCHEMA_MISSING_FIELD na posicao do array', () => {
    const r = ingest('spec-sem-id', fx.mutate(fx.validControlMin(), (c) => { delete c.specs[0].id; }));
    assert.strictEqual(r.status, 'rejected');
    assert.deepStrictEqual(codes(r), ['SCHEMA_MISSING_FIELD']);
    assert.strictEqual(r.issues[0].entity_id, 'specs[0]');
  });
  check('[0008:AC-7][0007:AC-6] pontos 4, 0, -1, "5", 34 sinalizados; nulo, 13 e 21 aceitos; importa com alertas', () => {
    const bad = [4, 0, -1, '5', 34];
    const specs = bad.map((v, i) => fx.makeSpec(`SPEC-00${i + 1}0`, { points: v }));
    specs.push(fx.makeSpec('SPEC-0060', { points: null }), fx.makeSpec('SPEC-0070', { points: 13 }), fx.makeSpec('SPEC-0080', { points: 21 }));
    const r = ingest('pontos', fx.buildControl(specs));
    assert.strictEqual(r.status, 'valid_with_alerts');
    const flagged = r.issues.filter((i) => i.code === 'POINTS_NOT_FIBONACCI').map((i) => i.entity_id).sort();
    assert.deepStrictEqual(flagged, ['SPEC-0010', 'SPEC-0020', 'SPEC-0030', 'SPEC-0040', 'SPEC-0050']);
    assert(r.issues.filter((i) => i.code === 'POINTS_NOT_FIBONACCI').every((i) => i.severity === 'error'));
    assert.strictEqual(r.control.specs[3].points, '5', 'valor lido nao e alterado');
    assert.strictEqual(r.control.specs[5].points, null);
  });
  check('[0007:AC-6] estado fora do protocolo, data invalida, percentual fora de faixa e horas negativas sao sinalizados', () => {
    const c = fx.buildControl([fx.makeSpec('SPEC-0001', { state: 'done', category: 'finalizadas', evidence: [{ kind: 'commit', ref: 'x' }] })]);
    c.project.last_updated_at = '14/11/2026';
    c.specs[0].progress.development = 120;
    c.specs[0].hours = { original: -2, current: null, actual: null, remaining: null };
    const r = ingest('valores', c);
    assert.strictEqual(r.status, 'valid_with_alerts');
    assert.deepStrictEqual(codes(r), ['DATE_INVALID', 'HOURS_INVALID', 'PERCENT_INVALID', 'STATE_INVALID']);
  });
  check('[0007:AC-6] progresso "not_calculable" (formato dos controles reais) e aceito como desconhecido', () => {
    const s = fx.makeSpec('SPEC-0001', { points: 3 });
    s.progress.test_validation = 'not_calculable';
    const s2 = fx.makeSpec('SPEC-0002', { points: 2 });
    s2.progress = 'not_calculable';
    const r = ingest('nao-calculavel', fx.buildControl([s, s2]));
    assert.strictEqual(r.status, 'valid', JSON.stringify(r.issues));
  });
  check('[0008:AC-8][0007:AC-7] completed sem evidencia e sinalizada; com evidencia nao', () => {
    const a = fx.makeSpec('SPEC-0001', { points: 3 });
    const b = fx.withoutEvidence(fx.buildControl([fx.makeSpec('SPEC-0002', { points: 2 })]), 'SPEC-0002').specs[0];
    const r = ingest('evidencia', fx.buildControl([a, b]));
    assert.strictEqual(r.status, 'valid_with_alerts');
    const flagged = r.issues.filter((i) => i.code === 'COMPLETED_NO_EVIDENCE');
    assert.deepStrictEqual(flagged.map((i) => i.entity_id), ['SPEC-0002']);
    assert.strictEqual(r.control.specs[1].state, 'completed', 'estado lido nao muda');
  });
  check('[0007:AC-6] horas no nome do protocolo (original_estimate_hours) sao aceitas com aviso HOURS_FIELD_VARIANT (D-008)', () => {
    const s = fx.makeSpec('SPEC-0001', { points: 3 });
    s.original_estimate_hours = 8;
    const r = ingest('horas-variante', fx.buildControl([s]));
    assert.strictEqual(r.status, 'valid_with_alerts');
    assert.deepStrictEqual(codes(r), ['HOURS_FIELD_VARIANT']);
    assert.strictEqual(prod.readSpecHours(r.control.specs[0]).original, 8);
    assert.strictEqual(prod.readSpecHours(r.control.specs[0]).actual, null);
  });

  // ===== 0008 T4 / 0007 T3: duplicidade, referencia e ciclo =====
  const pts = (specs) => specs.reduce((a, s) => a + (typeof s.points === 'number' ? s.points : 0), 0);
  check('[0008:AC-9][0007:AC-8] ID de SPEC duplicado e sinalizado; nada e descartado; total nao soma em dobro', () => {
    const base = fx.buildControl([fx.makeSpec('SPEC-0001', { points: 3 }), fx.makeSpec('SPEC-0002', { points: 5 })]);
    const r = ingest('dup-spec', fx.withDuplicateSpec(base, 'SPEC-0002'));
    assert.strictEqual(r.status, 'valid_with_alerts');
    assert.deepStrictEqual(codes(r), ['DUP_ID']);
    assert.strictEqual(r.issues[0].entity_id, 'SPEC-0002');
    assert.strictEqual(r.control.specs.length, 3, 'a duplicada nao e descartada do arquivo lido');
    assert.strictEqual(prod.uniqueSpecs(r.control).length, 2);
    assert.strictEqual(pts(prod.uniqueSpecs(r.control)), 8, 'pontos nao somam em dobro (3 + 5)');
  });
  check('[0008:AC-9][0007:AC-8] ID de tarefa duplicado e sinalizado', () => {
    const s = fx.makeSpec('SPEC-0001', { points: 3 });
    s.tasks = [{ id: 'TASK-0001', title: 'a' }, { id: 'TASK-0001', title: 'b' }, { id: 'TASK-0002', title: 'c' }];
    const r = ingest('dup-task', fx.buildControl([s]));
    assert.deepStrictEqual(codes(r), ['DUP_ID']);
    assert.strictEqual(r.issues[0].entity_id, 'TASK-0001');
    assert.strictEqual(prod.collectTasks(r.control).length, 3);
  });
  check('[0008:AC-10][0007:AC-9] dependencia e validates para ID inexistente: 2 BROKEN_REF; texto livre e IDs de outro projeto sao ignorados', () => {
    let c = fx.buildControl([fx.makeSpec('SPEC-0001', { points: 3 }), fx.makeSpec('SPEC-0002', { points: 2 })]);
    c = fx.withBrokenDep(c, 'SPEC-0001', 'SPEC-0999');
    c = fx.withBrokenValidates(c, 'SPEC-0002', 'SPEC-0888');
    c = fx.mutate(c, (x) => {
      x.specs[0].dependencies.push('PRJ-outro:SPEC-0001');
      x.specs[0].blockers = ['Aguardando aprovacao do Alexandre'];
      x.specs[1].dependencies.push({ id: 'SPEC-0001' });
    });
    const r = ingest('refs', c);
    assert.deepStrictEqual(codes(r), ['BROKEN_REF', 'BROKEN_REF']);
    assert.deepStrictEqual(r.issues.map((i) => i.entity_id).sort(), ['SPEC-0001', 'SPEC-0002']);
  });
  check('[0008:AC-10][0007:AC-9] ciclo A -> B -> A e sinalizado uma vez e nao e desfeito', () => {
    const c = fx.withCycle(fx.buildControl([fx.makeSpec('SPEC-0001', { points: 3 }), fx.makeSpec('SPEC-0002', { points: 2 }), fx.makeSpec('SPEC-0003', { points: 1 })]), 'SPEC-0001', 'SPEC-0002');
    const r = ingest('ciclo', c);
    assert.deepStrictEqual(codes(r), ['DEP_CYCLE']);
    assert(/SPEC-0001/.test(r.issues[0].message) && /SPEC-0002/.test(r.issues[0].message));
    assert.deepStrictEqual(r.control.specs[0].dependencies, ['SPEC-0002']);
    assert.deepStrictEqual(r.control.specs[1].dependencies, ['SPEC-0001']);
  });
  check('[0007:AC-9] auto-dependencia e ciclo de 3 elos tambem sao sinalizados; cadeia sem ciclo nao', () => {
    const mk = (deps) => fx.buildControl([
      fx.makeSpec('SPEC-0001', { points: 1, dependencies: deps[0] }),
      fx.makeSpec('SPEC-0002', { points: 1, dependencies: deps[1] }),
      fx.makeSpec('SPEC-0003', { points: 1, dependencies: deps[2] })
    ]);
    assert.deepStrictEqual(codes(ingest('self', mk([['SPEC-0001'], [], []]))), ['DEP_CYCLE']);
    assert.deepStrictEqual(codes(ingest('tri', mk([['SPEC-0002'], ['SPEC-0003'], ['SPEC-0001']]))), ['DEP_CYCLE']);
    assert.deepStrictEqual(codes(ingest('cadeia', mk([['SPEC-0002'], ['SPEC-0003'], []]))), []);
  });
  check('[0007:AC-9] bloco dependencies do control (from/to) com ID inexistente gera BROKEN_REF', () => {
    const c = fx.mutate(fx.buildControl([fx.makeSpec('SPEC-0001', { points: 3 })]), (x) => {
      x.dependencies = [{ from: 'SPEC-0001', to: 'SPEC-0404', type: 'depends_on' }];
    });
    assert.deepStrictEqual(codes(ingest('deps-bloco', c)), ['BROKEN_REF']);
  });

  // ===== 0008 T5 / 0007 T4: eventos, reconciliacao, declarado x calculado =====
  const ctl2 = fx.buildControl([fx.makeSpec('SPEC-0001', { points: 3 }), fx.makeSpec('SPEC-0002', { points: 5 })]);
  const evLines = (...objs) => objs.map((o) => (typeof o === 'string' ? o : JSON.stringify(o))).join('\n') + '\n';

  check('[0008:AC-11][0007:AC-10] linha em branco ignorada; corrompida e incompleta sinalizadas com numero da linha; validas importadas', () => {
    const e1 = fx.makeEvent(1, 'SPEC-0001', 'spec.created', { after: { state: 'completed' } });
    const e2 = fx.makeEvent(2, 'SPEC-0002', 'spec.created', { after: { state: 'completed' } });
    const noActor = fx.makeEvent(3, 'SPEC-0001', 'spec.updated');
    delete noActor.actor;
    const text = evLines(e1, '', '{"event_id": "abc", "timestamp": ', noActor, e2);
    const r = ingest('ev-mix', ctl2, { events: text });
    assert.strictEqual(r.status, 'valid_with_alerts');
    assert.deepStrictEqual(codes(r), ['EVENT_FIELD_MISSING', 'EVENT_LINE_CORRUPT']);
    const byCode = Object.fromEntries(r.issues.map((i) => [i.code, i.line]));
    assert.strictEqual(byCode.EVENT_LINE_CORRUPT, 3, 'linha corrompida = 3');
    assert.strictEqual(byCode.EVENT_FIELD_MISSING, 4, 'linha incompleta = 4');
    assert.deepStrictEqual(r.events.map((e) => e.event_id), [fx.evId(1), fx.evId(2)]);
    assert.strictEqual(r.eventStats.corrupt, 1);
    assert.strictEqual(r.eventStats.incomplete, 1);
  });
  check('[0008:AC-12][0007:AC-10] events ausente e vazio: aviso NO_HISTORY (sem historico), status valid_with_alerts', () => {
    const ausente = ingest('ev-ausente', ctl2, { events: null });
    const vazio = ingest('ev-vazio', ctl2, { events: '' });
    for (const r of [ausente, vazio]) {
      assert.strictEqual(r.status, 'valid_with_alerts');
      assert.deepStrictEqual(codes(r), ['NO_HISTORY']);
      assert.deepStrictEqual(r.events, []);
    }
  });
  check('[0008:AC-12] events sem LF final, com CRLF e com BOM sao lidos corretamente', () => {
    const evs = fx.createdEvents(ctl2.specs);
    const semLf = ingest('ev-semlf', ctl2, { events: evs.map((e) => JSON.stringify(e)).join('\n') });
    const crlf = ingest('ev-crlf', ctl2, { events: evs, crlf: true });
    const bom = ingest('ev-bom', ctl2, { events: evs, bom: true });
    for (const r of [semLf, crlf, bom]) {
      assert.strictEqual(r.status, 'valid', JSON.stringify(r.issues));
      assert.strictEqual(r.events.length, 2);
    }
  });
  check('[0008:AC-9][0007:AC-11] event_id repetido e sinalizado e contado uma vez', () => {
    const e1 = fx.makeEvent(1, 'SPEC-0001', 'spec.created', { after: { state: 'completed' } });
    const e2 = fx.makeEvent(2, 'SPEC-0002', 'spec.created', { after: { state: 'completed' } });
    const r = ingest('ev-dup', ctl2, { events: evLines(e1, e2, e1) });
    assert.deepStrictEqual(codes(r), ['EVENT_DUP']);
    assert.strictEqual(r.issues[0].line, 3);
    assert.strictEqual(r.events.length, 2);
    assert.strictEqual(r.eventStats.duplicate, 1);
  });
  check('[0008:AC-13][0007:AC-11] evento de outro projeto e evento para entidade inexistente sao sinalizados e nao contam', () => {
    const e1 = fx.makeEvent(1, 'SPEC-0001', 'spec.created', { after: { state: 'completed' } });
    const e2 = fx.makeEvent(2, 'SPEC-0002', 'spec.created', { after: { state: 'completed' } });
    const foreign = fx.makeEvent(3, 'SPEC-0001', 'spec.updated', { project_id: 'PRJ-outro' });
    const orphan = fx.makeEvent(4, 'SPEC-0999', 'spec.updated');
    const r = ingest('ev-foreign', ctl2, { events: evLines(e1, e2, foreign, orphan) });
    assert.deepStrictEqual(codes(r), ['EVENT_FOREIGN_PROJECT', 'EVENT_ORPHAN']);
    assert.deepStrictEqual(r.events.map((e) => e.event_id), [fx.evId(1), fx.evId(2)]);
  });
  check('[0007:AC-11] eventos de entidades que nao sao SPEC/TASK (projeto, decisao) nao sao orfaos; timestamp sem fuso gera aviso', () => {
    const e1 = fx.makeEvent(1, 'SPEC-0001', 'spec.created', { after: { state: 'completed' } });
    const e2 = fx.makeEvent(2, 'SPEC-0002', 'spec.created', { after: { state: 'completed' } });
    const proj = fx.makeEvent(3, fx.PROJECT_ID, 'project.baselined');
    const adr = fx.makeEvent(4, 'ADR-0001', 'decision.recorded');
    const noTz = fx.makeEvent(5, 'SPEC-0001', 'spec.updated', { timestamp: '2026-01-02T10:00:00' });
    const r = ingest('ev-outros', ctl2, { events: evLines(e1, e2, proj, adr, noTz) });
    assert.deepStrictEqual(codes(r), ['EVENT_TS_INVALID']);
    assert.strictEqual(r.events.length, 5);
  });
  check('[0007:AC-10] ultimo evento com estado diferente do controle gera STATE_EVENT_MISMATCH; SPEC sem spec.created gera info', () => {
    const e1 = fx.makeEvent(1, 'SPEC-0001', 'spec.created', { after: { state: 'completed' } });
    const e2 = fx.makeEvent(2, 'SPEC-0001', 'spec.started', { after: { state: 'in_progress' } });
    const r = ingest('ev-estado', ctl2, { events: evLines(e1, e2) });
    assert.deepStrictEqual(codes(r), ['SPEC_NO_CREATED_EVENT', 'STATE_EVENT_MISMATCH']);
    assert.strictEqual(r.issues.find((i) => i.code === 'SPEC_NO_CREATED_EVENT').severity, 'info');
    assert.strictEqual(r.issues.find((i) => i.code === 'STATE_EVENT_MISMATCH').entity_id, 'SPEC-0001');
  });
  check('[0008:AC-14][0007:AC-16] summary.total_points diferente da soma: SUMMARY_MISMATCH declarado x calculado; o calculado e o usado', () => {
    const c = fx.mutate(ctl2, (x) => { x.summary.total_points = 99; });
    const r = ingest('resumo', c);
    assert.strictEqual(r.status, 'valid_with_alerts');
    assert.deepStrictEqual(codes(r), ['SUMMARY_MISMATCH']);
    assert(/declarado 99, calculado 8/.test(r.issues[0].message), r.issues[0].message);
    assert.strictEqual(prod.calcSummary(r.control).total_points, 8);
    assert.strictEqual(r.control.summary.total_points, 99, 'declarado e guardado como lido');
  });
  check('[0007:AC-16] category_counts nos dois formatos (numero e {quantidade,pontos}) e conferido; spec_count e status_counts tambem', () => {
    const real = fx.mutate(ctl2, (x) => {
      x.summary.category_counts = { finalizadas: { quantidade: 2, pontos: 8, percentual: 100 }, fila: { quantidade: 0, pontos: 0, percentual: 0 } };
    });
    assert.deepStrictEqual(codes(ingest('cat-real', real)), []);
    const errado = fx.mutate(ctl2, (x) => {
      x.summary.category_counts = { finalizadas: 1, fila: 1 };
      x.summary.spec_count = 5;
      x.summary.status_counts = { completed: 9 };
    });
    assert.deepStrictEqual(codes(ingest('cat-errado', errado)), ['SUMMARY_MISMATCH', 'SUMMARY_MISMATCH', 'SUMMARY_MISMATCH']);
  });
  check('[0008:AC-15][0007:AC-20] baseline ausente: aviso BASELINE_MISSING, status valid_with_alerts (nao fatal)', () => {
    const r = ingest('sem-baseline', ctl2, { baseline: null });
    assert.strictEqual(r.status, 'valid_with_alerts');
    assert.deepStrictEqual(codes(r), ['BASELINE_MISSING']);
    assert.strictEqual(r.baseline, null);
    const ok = ingest('com-baseline', ctl2);
    assert.strictEqual(ok.baseline.counts.total_points, 3);
  });
  check('[0007:AC-20] baseline ilegivel gera BASELINE_INVALID (aviso) sem rejeitar', () => {
    const r = ingest('baseline-ruim', ctl2, { baseline: '{ truncado' });
    assert.strictEqual(r.status, 'valid_with_alerts');
    assert.deepStrictEqual(codes(r), ['BASELINE_INVALID']);
  });

  // ===== 0008 T6 / 0007 T5: banco temporario, idempotencia, reconstrucao, origem =====
  const ctl3 = fx.buildControl([fx.makeSpec('SPEC-0001', { points: 3 }), fx.makeSpec('SPEC-0002', { points: 5, state: 'in_progress', category: 'em_andamento', hours: { original: 8, current: 10, actual: null, remaining: 4 } })]);
  const evs3 = [
    fx.makeEvent(1, 'SPEC-0001', 'spec.created', { after: { state: 'completed' } }),
    fx.makeEvent(2, 'SPEC-0002', 'spec.created', { after: { state: 'in_progress' } })
  ];
  const proj3 = fx.makeProject(tmpRoot, 'banco-p', { control: ctl3, events: evs3, baseline: fx.validBaseline() });
  const T1 = '2026-02-01T00:00:00.000Z';
  const T2 = '2026-02-02T00:00:00.000Z';

  check('[0007:AC-15][0008:AC-2] importacao guarda origem (arquivos), data/hora da importacao e ultima atualizacao declarada', () => {
    const r = prod.readProductionControl(proj3);
    assert.strictEqual(r.status, 'valid', JSON.stringify(r.issues));
    db.replaceProductionImport('ProjA', r, { now: T1 });
    const d = db.getProductionDetail('ProjA');
    assert.strictEqual(d.import.source_kind, 'production_v2');
    assert.strictEqual(d.import.status, 'valid');
    assert.strictEqual(d.import.imported_at, T1);
    assert.strictEqual(d.import.declared_updated_at, fx.TS);
    assert.strictEqual(d.import.project_id, fx.PROJECT_ID);
    assert(d.import.control_path.endsWith('production-control.json'));
    assert(d.import.events_path.endsWith('production-events.jsonl'));
    assert(d.import.baseline_path.endsWith('production-baseline.json'));
    assert.deepStrictEqual(d.import.issue_counts, { info: 0, warning: 0, error: 0 });
    assert.deepStrictEqual(d.specs.map((s) => [s.spec_id, s.state, s.category, s.points]), [['SPEC-0001', 'completed', 'finalizadas', 3], ['SPEC-0002', 'in_progress', 'em_andamento', 5]]);
    const s2 = d.specs[1];
    assert.deepStrictEqual([s2.hours_original, s2.hours_current, s2.hours_actual, s2.hours_remaining], [8, 10, null, 4], 'horas nulas ficam NULL, nunca 0');
    assert.strictEqual(d.specs[0].hours_original, null);
    assert.strictEqual(d.event_count, 2);
    assert.strictEqual(d.baseline.counts.total_points, 3);
  });
  check('[0008:AC-18][0007:AC-12] mesma fixture importada duas vezes: conteudo identico (sem data/hora) e mesma contagem de linhas', () => {
    const r = prod.readProductionControl(proj3);
    const before = fx.dumpProduction(db, 'ProjA');
    const c1 = fx.countProduction(db, 'ProjA');
    db.replaceProductionImport('ProjA', r, { now: T2 });
    assert.strictEqual(fx.dumpProduction(db, 'ProjA'), before);
    assert.deepStrictEqual(fx.countProduction(db, 'ProjA'), c1);
    assert.deepStrictEqual(c1, { imports: 1, specs: 2, events: 2, issues: 0 });
    assert.strictEqual(db.getProductionDetail('ProjA').import.imported_at, T2, 'a data de importacao e a unica coisa que muda');
  });
  check('[0008:AC-19][0007:AC-13] banco apagado e reconstruido so dos arquivos: conteudo identico ao da primeira ingestao', () => {
    const before = fx.dumpProduction(db, 'ProjA');
    const p2 = path.join(tmpRoot, 'rebuild.db');
    const dbB = new AppDb(p2);
    dbB.replaceProductionImport('ProjA', prod.readProductionControl(proj3), { now: T1 });
    dbB.db.close();
    for (const suf of ['', '-wal', '-shm']) fs.rmSync(p2 + suf, { force: true });
    const dbC = new AppDb(p2);
    assert.deepStrictEqual(fx.countProduction(dbC, 'ProjA'), { imports: 0, specs: 0, events: 0, issues: 0 }, 'banco novo comeca vazio');
    dbC.replaceProductionImport('ProjA', prod.readProductionControl(proj3), { now: T2 });
    assert.strictEqual(fx.dumpProduction(dbC, 'ProjA'), before);
    dbC.db.close();
  });
  check('[0007:AC-12] falha no meio da importacao faz rollback: as linhas anteriores do projeto ficam intactas', () => {
    const before = fx.dumpProduction(db, 'ProjA');
    const bad = prod.readProductionControl(proj3);
    bad.control.specs[1].boom = 10n; // JSON.stringify de BigInt lanca no meio da transacao
    assert.throws(() => db.replaceProductionImport('ProjA', bad, { now: T2 }));
    assert.strictEqual(fx.dumpProduction(db, 'ProjA'), before);
    assert.deepStrictEqual(fx.countProduction(db, 'ProjA'), { imports: 1, specs: 2, events: 2, issues: 0 });
  });
  check('[0007:AC-12] importar um projeto nao altera as linhas de outro; SPEC duplicada e gravada uma vez e o problema DUP_ID fica registrado', () => {
    const before = fx.dumpProduction(db, 'ProjA');
    const dupCtl = fx.withDuplicateSpec(ctl3, 'SPEC-0002');
    const pB = fx.makeProject(tmpRoot, 'banco-dup', { control: dupCtl, events: evs3, baseline: fx.validBaseline() });
    db.replaceProductionImport('ProjB', prod.readProductionControl(pB), { now: T1 });
    assert.strictEqual(fx.dumpProduction(db, 'ProjA'), before);
    assert.strictEqual(fx.countProduction(db, 'ProjB').specs, 2);
    assert.deepStrictEqual(db.getProductionDetail('ProjB').issues.map((i) => i.code), ['DUP_ID']);
    assert.strictEqual(db.getProductionDetail('ProjB').import.status, 'valid_with_alerts');
    assert.deepStrictEqual(db.getProductionDetail('ProjB').import.issue_counts, { info: 0, warning: 0, error: 1 });
  });
  check('[0007:AC-5] importacao rejeitada mantem a ultima boa (D-009), troca so os problemas e a boa seguinte restaura', () => {
    const goodDump = fx.dumpProduction(db, 'ProjA');
    const ctlPath = path.join(proj3, 'docs', 'production', 'production-control.json');
    const goodText = fs.readFileSync(ctlPath, 'utf8');
    fs.writeFileSync(ctlPath, fx.truncateJson(goodText));
    const rej = prod.readProductionControl(proj3);
    assert.strictEqual(rej.status, 'rejected');
    db.replaceProductionImport('ProjA', rej, { now: '2026-03-01T00:00:00.000Z' });
    const d = db.getProductionDetail('ProjA');
    assert.strictEqual(d.import.status, 'rejected');
    assert.strictEqual(d.import.last_good_at, T2, 'ultima importacao boa registrada');
    assert.strictEqual(d.specs.length, 2, 'specs da ultima boa mantidas');
    assert.strictEqual(d.event_count, 2);
    assert.deepStrictEqual(d.issues.map((i) => i.code), ['JSON_PARSE']);
    db.replaceProductionImport('ProjA', rej, { now: '2026-03-02T00:00:00.000Z' });
    assert.strictEqual(db.getProductionDetail('ProjA').import.last_good_at, T2, 'rejeitar de novo nao apaga a ultima boa');
    fs.writeFileSync(ctlPath, goodText);
    db.replaceProductionImport('ProjA', prod.readProductionControl(proj3), { now: T2 });
    assert.strictEqual(fx.dumpProduction(db, 'ProjA'), goodDump);
    assert.strictEqual(db.getProductionDetail('ProjA').import.last_good_at, null);
  });
  check('[0007:AC-5] projeto rejeitado desde a primeira leitura: importacao registrada sem specs', () => {
    const pR = fx.makeProject(tmpRoot, 'banco-rej', { control: '{ quebrado', baseline: fx.validBaseline() });
    db.replaceProductionImport('ProjR', prod.readProductionControl(pR), { now: T1 });
    const d = db.getProductionDetail('ProjR');
    assert.strictEqual(d.import.status, 'rejected');
    assert.strictEqual(d.import.last_good_at, null);
    assert.deepStrictEqual(d.specs, []);
    assert.deepStrictEqual(d.issues.map((i) => i.code), ['JSON_PARSE']);
  });
  check('[0007:AC-3] projeto que deixou de ter docs/production (absent) tem suas linhas de producao removidas; purge remove projetos sumidos', () => {
    db.replaceProductionImport('ProjR', prod.readProductionControl(path.join(tmpRoot, 'sem-prod')), { now: T2 });
    assert.strictEqual(db.getProductionDetail('ProjR'), null);
    assert.deepStrictEqual(fx.countProduction(db, 'ProjR'), { imports: 0, specs: 0, events: 0, issues: 0 });
    db.purgeNonExistentProjects(['ProjA']);
    assert.strictEqual(db.getProductionDetail('ProjB'), null);
    assert.notStrictEqual(db.getProductionDetail('ProjA'), null);
  });
  check('[0007:AC-3] projeto sem importacao: getProductionDetail devolve null', () => {
    assert.strictEqual(db.getProductionDetail('NuncaImportado'), null);
  });
  check('[0008:AC-2] o banco real do projeto nao foi aberto nem alterado por estes testes', () => {
    if (!realDbBefore) return; // banco real inexistente: nada a comparar
    const now = fs.statSync(realDbPath);
    assert.strictEqual(now.mtimeMs, realDbBefore.mtimeMs);
    assert.strictEqual(now.size, realDbBefore.size);
  });

  // ===== 0007 T6: mapeamento para o formato legado (FR-013, AC-1) =====
  check('[0007:AC-1] mapToLegacySpecs: tabela unica plural -> singular e status legado para as 6 categorias', () => {
    const mk = (n, state, category, points) => fx.makeSpec(`SPEC-00${n}0`, { state, category, points });
    const c = fx.buildControl([
      mk(1, 'completed', 'finalizadas', 3),
      mk(2, 'in_progress', 'em_andamento', 5),
      mk(3, 'not_started', 'fila', 2),
      mk(4, 'not_started', 'dependendo_alexandre', 8),
      mk(5, 'blocked', 'impedidas', 1),
      mk(6, 'cancelled', 'invalidas', 2)
    ]);
    const m = prod.mapToLegacySpecs(c);
    assert.deepStrictEqual(m.map((s) => [s.spec_id, s.category, s.status, s.weight]), [
      ['SPEC-0010', 'finalizada', 'done', 3],
      ['SPEC-0020', 'em_andamento', 'in_progress', 5],
      ['SPEC-0030', 'fila', 'pending', 2],
      ['SPEC-0040', 'dependendo_alexandre', 'awaiting_alexandre', 8],
      ['SPEC-0050', 'impedida', 'blocked', 1],
      ['SPEC-0060', 'invalida', 'invalid', 2]
    ]);
    assert.deepStrictEqual(Object.keys(prod.CATEGORY_V2_TO_LEGACY).sort(), [...prod.VALID_CATEGORIES].sort());
    assert.strictEqual(m[0].spec_name, 'Spec SPEC-0010');
    assert.deepStrictEqual([m[0].total_tasks, m[0].completed_tasks, m[0].pending_tasks], [0, 1, 0]);
    assert.deepStrictEqual([m[2].total_tasks, m[2].completed_tasks, m[2].pending_tasks], [0, 0, 1]);
  });
  check('[0007:AC-1] mapToLegacySpecs: categoria derivada do estado quando ausente; tarefas contadas; ponto nulo ou nao positivo nao distorce o peso; duplicada entra uma vez', () => {
    const noCat = fx.makeSpec('SPEC-0001', { state: 'in_progress', points: null });
    delete noCat.category;
    const withTasks = fx.makeSpec('SPEC-0002', { state: 'in_progress', category: 'em_andamento', points: 0 });
    withTasks.tasks = [{ id: 'TASK-0001', title: 'a', state: 'completed' }, { id: 'TASK-0002', title: 'b', state: 'not_started' }, { id: 'TASK-0003', title: 'c', state: 'not_started' }];
    const c = fx.withDuplicateSpec(fx.buildControl([noCat, withTasks]), 'SPEC-0002');
    const m = prod.mapToLegacySpecs(c);
    assert.strictEqual(m.length, 2, 'duplicada nao entra em dobro');
    assert.deepStrictEqual([m[0].category, m[0].status, m[0].weight], ['em_andamento', 'in_progress', 1]);
    assert.deepStrictEqual([m[1].weight, m[1].total_tasks, m[1].completed_tasks, m[1].pending_tasks], [1, 3, 1, 2]);
    assert.deepStrictEqual(m[1].pending_tasks_json, ['b', 'c']);
  });
  check('[0007:AC-1] legacySpecsMetrics: formato da spec 006 (total_pontos e categoria:{quantidade,pontos,percentual}); pontos nulos fora do total', () => {
    const c = fx.buildControl([
      fx.makeSpec('SPEC-0001', { points: 3 }),
      fx.makeSpec('SPEC-0002', { points: 5, state: 'not_started', category: 'fila' }),
      fx.makeSpec('SPEC-0003', { points: null, state: 'not_started', category: 'fila' })
    ]);
    const mt = prod.legacySpecsMetrics(c);
    assert.strictEqual(mt.total_specs, 3);
    assert.strictEqual(mt.total_pontos, 8);
    assert.deepStrictEqual(mt.finalizadas, { quantidade: 1, pontos: 3, percentual: 37.5 });
    assert.deepStrictEqual(mt.fila, { quantidade: 2, pontos: 5, percentual: 62.5 });
    assert.deepStrictEqual(mt.impedidas, { quantidade: 0, pontos: 0, percentual: 0 });
    assert.deepStrictEqual(Object.keys(mt), ['total_specs', 'total_pontos', 'finalizadas', 'em_andamento', 'fila', 'dependendo_alexandre', 'impedidas', 'invalidas']);
  });
  check('[0007:AC-1][0007:AC-2] metricas mapeadas do control.json deste repositorio == bloco JSON do SPECS.md gerado a partir dele (nada muda para a UI da spec 006)', () => {
    const root = path.resolve(here, '..');
    const r = prod.readProductionControl(root);
    assert.notStrictEqual(r.status, 'rejected', JSON.stringify(r.issues));
    const md = fs.readFileSync(path.join(root, 'docs', 'specs', 'SPECS.md'), 'utf8');
    const block = JSON.parse(md.match(/```json\s*(\{[\s\S]*?\})\s*```/)[1]).metricas;
    assert.deepStrictEqual(prod.legacySpecsMetrics(r.control), block);
  });
  check('[0007:AC-3] getAllProjects de projeto sem v2 e identico antes e depois de importar producao de outro projeto', () => {
    db.upsertProject({ name: 'SemV2', path: path.join(tmpRoot, 'sem-prod'), type: 'main', purpose: 'p', total_specs: 2, done_specs: 1, total_points: 5, done_points: 3, pending_points: 2 });
    const snap = () => JSON.stringify(db.getAllProjects().filter((p) => p.name === 'SemV2'));
    const before = snap();
    assert(before.includes('SemV2'));
    db.replaceProductionImport('ProjZ', prod.readProductionControl(proj3), { now: T1 });
    assert.strictEqual(snap(), before);
  });

  // ===== 0008 T7 / 0007 T7: integracao no scanner (AC-1..AC-5, AC-14, AC-16, AC-17, AC-21, AC-22) =====
  const scanBase = path.join(tmpRoot, 'scan-t7');
  fs.mkdirSync(scanBase, { recursive: true });
  const specsMdFor = (total, qty, pts) => '# SPECS\n\n```json\n' + JSON.stringify({ metricas: { total_specs: qty, total_pontos: total, finalizadas: { quantidade: qty, pontos: pts, percentual: 100 } } }) + '\n```\n\n| ID | Nome | Pontos | Categoria |\n|---|---|---|---|\n| **Q01** | Algo legado | 2 | ⚪ Finalizada |\n| **Q02** | Outro legado | 3 | 🟢 Fila |\n';
  const ctlT7 = fx.buildControl([
    fx.makeSpec('SPEC-0001', { points: 3 }),
    fx.makeSpec('SPEC-0002', { points: 5, state: 'in_progress', category: 'em_andamento' })
  ]);
  const evT7 = fx.createdEvents(ctlT7.specs);
  const scanner = new ProjectScanner(db, scanBase);
  const scanOne = (name, proj, worktrees = []) => {
    const r = scanner.scanCanonicalProject({ name, path: proj, worktrees });
    assert(r, 'scanCanonicalProject devolveu null para ' + name);
    return db.getProjectByName(name);
  };
  check('[0007:AC-1][0007:AC-2][0008:AC-16] v2 aceito vence o SPECS.md divergente; remover o SPECS.md nao muda o resultado', () => {
    const p = fx.makeProject(scanBase, 'Vence', { control: ctlT7, events: evT7, baseline: fx.validBaseline(), specsMd: specsMdFor(99, 9, 99) });
    const a = scanOne('Vence', p);
    assert.strictEqual(a.total_points, 8);
    assert.strictEqual(a.done_points, 3);
    assert.strictEqual(a.total_specs, 2);
    assert.strictEqual(a.specs_source, 'production_v2');
    assert.deepStrictEqual(a.specs.map((s) => s.spec_id), ['SPEC-0001', 'SPEC-0002']);
    assert.deepStrictEqual(a.specs.map((s) => s.category), ['finalizada', 'em_andamento']);
    const imp = db.getProductionDetail('Vence').import;
    assert.strictEqual(imp.source_kind, 'production_v2');
    fs.rmSync(path.join(p, 'docs', 'specs', 'SPECS.md'));
    const b = scanOne('Vence', p);
    const pick = (x) => JSON.stringify([x.total_points, x.done_points, x.total_specs, x.specs_source, x.specs.map((s) => [s.spec_id, s.weight, s.category, s.status])]);
    assert.strictEqual(pick(b), pick(a));
  });
  check('[0007:AC-3][0008:AC-17] so SPECS.md: comportamento da 006 inalterado, origem specs_md, nenhuma linha de producao', () => {
    const p = fx.makeProject(scanBase, 'SoMd', { specsMd: specsMdFor(5, 2, 2) });
    const a = scanOne('SoMd', p);
    assert.strictEqual(a.specs_source, 'specs_md');
    assert.strictEqual(a.total_points, 5);
    assert.strictEqual(a.done_points, 2);
    assert.deepStrictEqual(a.specs.map((s) => [s.spec_id, s.weight, s.category]), [['Q01', 2, 'finalizada'], ['Q02', 3, 'fila']]);
    assert.strictEqual(db.getProductionDetail('SoMd'), null);
  });
  check('[0007:AC-4][0008:AC-17] sem nenhum dos dois: projeto aparece, sem erro, sem valores quebrados', () => {
    const p = fx.makeProject(scanBase, 'Nada', {});
    const a = scanOne('Nada', p);
    assert.strictEqual(a.specs_source, 'none');
    assert.strictEqual(a.total_specs, 0);
    assert.strictEqual(a.total_points, 0);
    assert.deepStrictEqual(a.specs, []);
    assert.strictEqual(db.getProductionDetail('Nada'), null);
  });
  check('[0007:AC-5] control rejeitado (schema 1.0) com SPECS.md: usa o fallback e registra a rejeicao', () => {
    const p = fx.makeProject(scanBase, 'Rejeita', { control: fx.withSchema(ctlT7, '1.0'), specsMd: specsMdFor(5, 2, 2) });
    const a = scanOne('Rejeita', p);
    assert.strictEqual(a.specs_source, 'specs_md');
    assert.strictEqual(a.total_points, 5);
    const d = db.getProductionDetail('Rejeita');
    assert.strictEqual(d.import.status, 'rejected');
    assert(d.issues.some((i) => i.code === 'SCHEMA_VERSION'));
  });
  check('[0007:AC-1] D-006: so a worktree tem docs/production -> fallback com origem marcada; principal com controle vence a worktree', () => {
    const main = fx.makeProject(scanBase, 'WtMain', {});
    const wt = fx.makeProject(scanBase, 'WtMainfeat', { control: ctlT7, events: evT7, baseline: fx.validBaseline() });
    const a = scanOne('WtMain', main, [{ name: 'WtMainfeat', path: wt }]);
    assert.strictEqual(a.specs_source, 'production_v2_worktree');
    assert.strictEqual(a.total_points, 8);
    assert(a.specs.every((s) => s.source_worktree === 'WtMainfeat'));
    const imp = db.getProductionDetail('WtMain').import;
    assert.strictEqual(imp.source_kind, 'production_v2_worktree');
    assert(imp.control_path.includes('WtMainfeat'));
    // principal com controle proprio (1 SPEC, 2 pts): vence; a worktree nao e mesclada
    const small = fx.buildControl([fx.makeSpec('SPEC-0001', { points: 2 })]);
    const main2 = fx.makeProject(scanBase, 'WtTwo', { control: small, events: fx.createdEvents(small.specs), baseline: fx.validBaseline() });
    const wt2 = fx.makeProject(scanBase, 'WtTwofeat', { control: ctlT7, events: evT7, baseline: fx.validBaseline() });
    const b = scanOne('WtTwo', main2, [{ name: 'WtTwofeat', path: wt2 }]);
    assert.strictEqual(b.specs_source, 'production_v2');
    assert.strictEqual(b.total_points, 2);
    assert.strictEqual(b.specs.length, 1);
    assert.strictEqual(b.specs[0].source_worktree, null);
  });
  check('[0007:AC-2] alexandreActions (DECISIONS.md pendente) continuam vindo do scanner com v2 aceito', () => {
    const p = fx.makeProject(scanBase, 'Acoes', { control: ctlT7, events: evT7, baseline: fx.validBaseline() });
    fs.writeFileSync(path.join(p, 'DECISIONS.md'), '# Decisoes\n\n## D-99 PENDING DECISION escolher o caminho\n\nTexto.\n');
    const a = scanOne('Acoes', p);
    assert.strictEqual(a.specs_source, 'production_v2');
    assert(a.alexandre_actions.length >= 1, 'acao pendente perdida');
    assert(a.alexandre_actions.some((x) => /D-99/.test(x.title)));
    assert(a.alexandre_pending_count >= 1);
  });
  check('[0007:AC-21][0007:AC-14][0008:AC-22][0008:AC-21] scanAll: projeto ilegivel/gigante nao derruba o bom; nenhum arquivo e escrito (hash antes/depois)', () => {
    const base = path.join(tmpRoot, 'scan-t7-all');
    fs.mkdirSync(base, { recursive: true });
    fx.makeProject(base, 'Bom', { control: ctlT7, events: evT7, baseline: fx.validBaseline() });
    const ruim = fx.makeProject(base, 'Ruim', { baseline: fx.validBaseline() });
    fs.mkdirSync(path.join(ruim, 'docs', 'production', 'production-control.json')); // existe mas e pasta: ilegivel
    const big = fx.makeProject(base, 'Gigante', { baseline: fx.validBaseline() });
    fs.writeFileSync(path.join(big, 'docs', 'production', 'production-control.json'), ' '.repeat(prod.MAX_CONTROL_BYTES + 1));
    const before = fx.hashTree(base);
    const sc2 = new ProjectScanner(db, base);
    const res = sc2.scanAll();
    assert.strictEqual(res.length, 3, 'a varredura deve catalogar os 3 projetos');
    assert.strictEqual(fx.hashTree(base), before, 'a varredura escreveu em projeto monitorado');
    const good = db.getProductionDetail('Bom');
    assert.strictEqual(good.import.status, 'valid');
    assert.strictEqual(db.getProjectByName('Bom').total_points, 8);
    assert(db.getProductionDetail('Ruim').issues.some((i) => i.code === 'FILE_UNREADABLE'));
    assert(db.getProductionDetail('Gigante').issues.some((i) => i.code === 'FILE_TOO_LARGE'));
    assert.strictEqual(db.getProductionDetail('Ruim').import.status, 'rejected');
    assert.strictEqual(db.getProductionDetail('Gigante').import.status, 'rejected');
  });

  // ===== 0008 T8 / 0007 T8: indicadores (AC-17, AC-18, AC-19, AC-20 da 0007; AC-4, AC-20 da 0008) =====
  // Valores conferidos a mao (ver comentarios): nada aqui e calculado pela propria funcao testada.
  const NOW8 = '2026-01-11T00:00:00Z';
  const h = (o, c, a, r) => ({ original: o, current: c, actual: a, remaining: r, actual_method: null });
  const ctl8 = fx.buildControl([
    fx.makeSpec('SPEC-0001', { points: 3, hours: h(4, 6, 5, 0), points_justification: 'tamanho medido', started_at: '2026-01-01T00:00:00Z', accepted_at: '2026-01-02T00:00:00Z' }),
    fx.makeSpec('SPEC-0002', { points: 5, state: 'in_progress', category: 'em_andamento', hours: h(10, 10, null, 4), started_at: '2026-01-01T00:00:00Z' }),
    fx.makeSpec('SPEC-0003', { points: 8, state: 'blocked', category: 'impedidas', blockers: [{ kind: 'user_decision', since: '2026-01-05T00:00:00Z', note: 'aguarda decisao' }] }),
    fx.makeSpec('SPEC-0004', { points: null, state: 'not_started', category: 'fila' }),
    fx.makeSpec('SPEC-0005', { points: 2, evidence: [], started_at: '2026-01-01T00:00:00Z', accepted_at: '2026-01-04T00:00:00Z' }),
    fx.makeSpec('SPEC-0006', { points: 5, state: 'cancelled', category: 'invalidas' }),
    fx.makeSpec('SPEC-0007', { points: 13, state: 'not_started', category: 'dependendo_alexandre' })
  ]);
  const m8 = prod.computeProductionMetrics(ctl8, [], fx.validBaseline(), { now: NOW8, issues: [] });
  check('[0007:AC-19][0008:AC-4] producao: total 36, concluidos 5, restantes 26 (cancelada fora), impedidos 8, aguardando 13, SPEC sem ponto contada a parte', () => {
    const p = m8.production;
    // 3+5+8+2+5+13 = 36 (SPEC-0004 sem ponto fica fora); concluidos 3+2; restantes 5+8+13 (a cancelada de 5 nao conta)
    assert.deepStrictEqual([p.spec_count, p.total_points, p.completed_points, p.remaining_points, p.blocked_points, p.awaiting_alexandre_points, p.specs_without_points], [7, 36, 5, 26, 8, 13, 1]);
    assert.strictEqual(p.completed_points_equivalent, 0);
    assert.strictEqual(p.accepted_deliveries, 2);
    assert.deepStrictEqual(p.by_category.finalizadas, { count: 2, points: 5 });
    assert.deepStrictEqual(p.by_category.invalidas, { count: 1, points: 5 });
  });
  check('[0007:AC-17][0008:AC-20] esforco: 4 grandezas separadas, so soma quem tem o dado e informa a cobertura', () => {
    const e = m8.effort;
    assert.deepStrictEqual(e.original, { sum: 14, with_data: 2, missing: 5, total: 7 });
    assert.deepStrictEqual(e.current, { sum: 16, with_data: 2, missing: 5, total: 7 });
    assert.deepStrictEqual(e.actual, { sum: 5, with_data: 1, missing: 6, total: 7 });
    assert.deepStrictEqual(e.remaining, { sum: 4, with_data: 2, missing: 5, total: 7 });
  });
  check('[0007:AC-17][0007:AC-18][0008:AC-20] horas nulas permanecem nulas (nunca zero) e o erro de estimativa so existe com horas reais', () => {
    const nulls = fx.buildControl([fx.makeSpec('SPEC-0001', { points: 3 }), fx.makeSpec('SPEC-0002', { points: 5 })]);
    const m = prod.computeProductionMetrics(nulls, [], null, { now: NOW8 });
    for (const k of ['original', 'current', 'actual', 'remaining']) {
      assert.strictEqual(m.effort[k].sum, null, k + ' virou numero sem dado');
      assert.strictEqual(m.effort[k].with_data, 0);
    }
    assert.strictEqual(m.predictability.estimate_error.sem_dado, true);
    assert.strictEqual(m.predictability.estimate_error.mean_error_hours, null);
    assert.strictEqual(m.predictability.estimate_error.mean_abs_error_hours, null);
    assert.strictEqual(m.predictability.reestimate.variance_hours, null);
    // so SPEC-0001 concluida tem original e real (4 -> 5): erro +1; SPEC-0002 (em andamento) e ignorada
    const pr = m8.predictability;
    assert.deepStrictEqual([pr.estimate_error.base, pr.estimate_error.mean_error_hours, pr.estimate_error.mean_abs_error_hours, pr.estimate_error.sem_dado], [1, 1, 1, false]);
    assert.deepStrictEqual([pr.reestimate.base, pr.reestimate.changed, pr.reestimate.variance_hours], [2, 1, 2]);
  });
  check('[0007:AC-19][0008:AC-4] fluxo e bloqueios: WIP, ciclo so com inicio e aceite, idade so com relogio, bloqueio por tipo', () => {
    const f = m8.flow;
    assert.deepStrictEqual([f.wip, f.blocked, f.in_validation], [1, 1, 0]);
    // ciclo: SPEC-0001 = 1 dia, SPEC-0005 = 3 dias -> mediana 2
    assert.deepStrictEqual(f.cycle_time_days, { base: 2, median: 2, sem_dado: false });
    assert.deepStrictEqual(f.active_age_days, { base: 1, max: 10, sem_dado: false });
    const b = m8.blockers;
    assert.deepStrictEqual([b.blocked_specs, b.blocker_entries, b.blocked_points, b.awaiting_alexandre_specs, b.awaiting_alexandre_points], [1, 1, 8, 1, 13]);
    assert.deepStrictEqual(b.by_kind, { user_decision: 1 });
    assert.strictEqual(b.oldest_days, 6);
    // sem relogio: idades nulas, nunca inventadas
    const noClock = prod.computeProductionMetrics(ctl8, [], null);
    assert.strictEqual(noClock.flow.active_age_days.max, null);
    assert.strictEqual(noClock.blockers.oldest_days, null);
    assert.strictEqual(noClock.control_quality.last_full_audit_age_days, null);
    assert.strictEqual(noClock.computed_with_now, false);
  });
  check('[0007:AC-19] qualidade do controle (§11) componente a componente, com base e "sem dado"', () => {
    const q = m8.control_quality;
    assert.deepStrictEqual(q.completed_with_evidence, { n: 1, base: 2, percent: 50, sem_dado: false });
    assert.deepStrictEqual(q.estimates_justified, { n: 1, base: 6, percent: 16.7, sem_dado: false });
    // 7 SPECs x 5 campos (ponto + 4 horas) = 35; conhecidos: 6 pontos + 7 horas -> 22 desconhecidos (62,9%)
    assert.deepStrictEqual(q.unknown_fields, { n: 22, base: 35, percent: 62.9, sem_dado: false });
    assert.deepStrictEqual(q.criteria_verifiable, { n: 0, base: 0, percent: null, sem_dado: true });
    assert.strictEqual(q.events_without_reference.sem_dado, true);
    assert.strictEqual(q.last_full_audit_age_days, 8.5);
    assert.strictEqual(q.divergences.n, 0);
    const withStats = prod.computeProductionMetrics(ctl8, [], null, { now: NOW8, eventStats: { lines: 4, orphan: 1 }, issues: [{ code: 'SUMMARY_MISMATCH' }, { code: 'STATE_EVENT_MISMATCH' }, { code: 'BASELINE_MISSING' }] });
    assert.deepStrictEqual(withStats.control_quality.events_without_reference, { n: 1, base: 4, percent: 25, sem_dado: false });
    assert.strictEqual(withStats.control_quality.divergences.n, 2);
    const withTasks = fx.mutate(ctl8, (c) => { c.specs[0].tasks = [{ id: 'TASK-0001', title: 'a', acceptance_criteria: ['ok'] }, { id: 'TASK-0002', title: 'b' }]; });
    assert.deepStrictEqual(prod.computeProductionMetrics(withTasks, [], null).control_quality.criteria_verifiable, { n: 1, base: 2, percent: 50, sem_dado: false });
  });
  check('[0007:AC-20][0008:AC-4] baseline x atual comparaveis; baseline ausente sinalizado sem erro; formato real (categories) aceito', () => {
    const b = m8.baseline;
    assert.deepStrictEqual([b.present, b.baseline_specs, b.baseline_points, b.current_specs, b.current_points, b.delta_specs, b.delta_points], [true, 1, 3, 7, 36, 6, 33]);
    assert.deepStrictEqual(prod.computeProductionMetrics(ctl8, [], null).baseline, { present: false });
    const real = prod.normalizeBaseline({ baseline_at: '2026-01-01T00:00:00Z', counts: { specs: 22, categories: { finalizadas: { quantidade: 21, pontos: 76 }, fila: { quantidade: 1, pontos: 8 } } } });
    assert.deepStrictEqual([real.specs, real.total_points, real.completed_points], [22, 84, 76]);
  });
  check('[0007:AC-19] controle sem SPECs: tudo zero onde ha contagem, nulo onde nao ha base, sem excecao', () => {
    const m = prod.computeProductionMetrics(fx.buildControl([]), [], null, { now: NOW8 });
    assert.strictEqual(m.production.total_points, 0);
    assert.strictEqual(m.effort.original.sum, null);
    assert.strictEqual(m.control_quality.completed_with_evidence.percent, null);
    assert.strictEqual(m.control_quality.unknown_fields.sem_dado, true);
    assert.strictEqual(m.rework.sem_dado, true);
    assert.doesNotThrow(() => prod.computeProductionMetrics(null, null, null));
  });
  check('[0007:AC-20][0008:AC-4] integracao: o scanner grava os indicadores na importacao (metrics_json) com o relogio injetado', () => {
    const sc = new ProjectScanner(db, scanBase, { now: () => NOW8 });
    const proj = fx.makeProject(scanBase, 'Metr', { control: ctl8, events: fx.createdEvents(ctl8.specs), baseline: fx.validBaseline() });
    sc.scanCanonicalProject({ name: 'Metr', path: proj, worktrees: [] });
    const d = db.getProductionDetail('Metr');
    assert.strictEqual(d.metrics.production.total_points, 36);
    assert.strictEqual(d.metrics.control_quality.last_full_audit_age_days, 8.5);
    assert.strictEqual(d.metrics.baseline.present, true);
  });

  // ===== 0008 T9 / 0007 T9: API REST em memoria (FR-017) e controle real do PDFReader (AC-23) =====
  const { EventEmitter } = await import('events');
  const { Writable } = await import('stream');
  const { createServer } = await import('../src/server.js');
  const requestListener = createServer({ db, scanner }).listeners('request')[0];
  const simulateRequest = (url, method = 'GET') => new Promise((resolve) => {
    const req = new EventEmitter();
    req.url = url;
    req.method = method;
    req.headers = { host: 'localhost:3333' };
    const res = new (class extends Writable {
      constructor() { super(); this.statusCode = 200; this.chunks = []; }
      writeHead(code) { this.statusCode = code; }
      _write(chunk, enc, cb) { this.chunks.push(Buffer.from(chunk)); cb(); }
      end(data) { if (data) this.chunks.push(Buffer.from(data)); super.end(); resolve({ status: this.statusCode, body: Buffer.concat(this.chunks).toString('utf8') }); }
    })();
    requestListener(req, res);
    req.emit('end');
  });
  const restJson = async (url) => { const r = await simulateRequest(url); return { status: r.status, json: JSON.parse(r.body) }; };
  // o scanAll acima (corretamente) removeu do banco temporario o que nao esta na sua pasta base: recataloga
  for (const n of ['Vence', 'SoMd', 'Nada', 'Rejeita']) scanOne(n, path.join(scanBase, n));
  await checkAsync('[0007:AC-1][0007:AC-15] REST /api/projects: campo aditivo production (origem, importacao, indicadores) e campos antigos intactos', async () => {
    const { status, json } = await restJson('/api/projects');
    assert.strictEqual(status, 200);
    const v = json.find((p) => p.name === 'Vence');
    assert(v, 'projeto Vence ausente');
    for (const k of ['name', 'path', 'total_points', 'done_points', 'total_specs', 'worktrees', 'recent_commits', 'stepper', 'health_status', 'pipeline_stage']) assert(k in v, 'campo antigo sumiu: ' + k);
    assert.strictEqual(v.total_points, 8);
    assert.strictEqual(v.production.source, 'production_v2');
    assert.strictEqual(v.production.status, 'valid');
    assert.strictEqual(v.production.source_kind, 'production_v2');
    assert(v.production.imported_at && v.production.declared_updated_at);
    assert.deepStrictEqual(Object.keys(v.production.issue_counts).sort(), ['error', 'info', 'warning']);
    assert.strictEqual(v.production.metrics.production.total_points, 8);
    const s = json.find((p) => p.name === 'SoMd');
    assert.strictEqual(s.production.status, 'absent');
    assert.strictEqual(s.production.source, 'specs_md');
    assert.strictEqual(s.production.metrics, null);
    const n = json.find((p) => p.name === 'Nada');
    assert.strictEqual(n.production.source, 'none');
  });
  await checkAsync('[0007:AC-5] REST /api/projects: projeto rejeitado mostra status rejected e contagem de alertas', async () => {
    const { json } = await restJson('/api/projects');
    const r = json.find((p) => p.name === 'Rejeita');
    assert.strictEqual(r.production.status, 'rejected');
    assert(r.production.issue_counts.error >= 1);
    assert.strictEqual(r.production.source, 'specs_md');
  });
  await checkAsync('[0007:AC-1][0007:AC-15] REST GET /api/projects/:name/production: SPECs, problemas, indicadores e origem; sem importacao devolve import nulo; inexistente 404', async () => {
    const a = await restJson('/api/projects/Vence/production');
    assert.strictEqual(a.status, 200);
    assert.strictEqual(a.json.source, 'production_v2');
    assert.strictEqual(a.json.import.status, 'valid');
    assert.deepStrictEqual(a.json.specs.map((s) => s.spec_id), ['SPEC-0001', 'SPEC-0002']);
    assert.strictEqual(a.json.metrics.production.total_points, 8);
    assert(Array.isArray(a.json.issues));
    const b = await restJson('/api/projects/Nada/production');
    assert.strictEqual(b.status, 200);
    assert.strictEqual(b.json.import, null);
    assert.deepStrictEqual(b.json.specs, []);
    assert.strictEqual((await restJson('/api/projects/NaoExiste/production')).status, 404);
    const old = await restJson('/api/projects/Vence');
    assert.strictEqual(old.status, 200);
    assert.strictEqual(old.json.production.status, 'valid');
    assert(Array.isArray(old.json.specs) && old.json.specs.length === 2);
  });
  check('[0008:AC-23][0007:AC-14] controle real do PDFReader em somente leitura: sem erro de severidade erro e pontos iguais ao summary.total_points; hash da pasta igual antes e depois', () => {
    const real = 'C:\\desenv\\utils\\PDFReader';
    if (!fs.existsSync(path.join(real, 'docs', 'production', 'production-control.json'))) {
      console.warn('AVISO: AC-23 PULADO — ' + real + '\\docs\\production nao existe nesta maquina');
      skip('PDFReader nao existe nesta maquina: ' + real);
    }
    const dir = path.join(real, 'docs', 'production');
    const before = fx.hashTree(dir);
    const r = prod.readProductionControl(real);
    const errs = r.issues.filter((i) => i.severity === 'error');
    assert.deepStrictEqual(errs, [], 'erros: ' + JSON.stringify(errs));
    assert.notStrictEqual(r.status, 'rejected');
    assert.strictEqual(prod.calcSummary(r.control).total_points, r.control.summary.total_points);
    const m = prod.computeProductionMetrics(r.control, r.events, r.baseline, { issues: r.issues, eventStats: r.eventStats });
    assert.strictEqual(m.production.total_points, r.control.summary.total_points);
    assert.strictEqual(fx.hashTree(dir), before, 'a leitura alterou a pasta docs/production do PDFReader');
  });

  // ===== 0007 T10: UI minima (FR-017, NFR-004). Validada por HTML/JS servido em memoria; "abrir e usar" = NOT TESTED =====
  const vmMod = await import('vm');
  const uiCode = fs.readFileSync(path.resolve(here, '..', 'public', 'production-ui.js'), 'utf8');
  const ui = {};
  vmMod.runInNewContext(uiCode, ui); // funcoes puras, sem DOM
  // tokens de vermelho: classes Tailwind red-/rose-, nomes CSS e hex de matiz vermelho
  const reddish = (src) => {
    const hits = [];
    for (const m of src.matchAll(/\b(?:bg|text|border|ring|from|to|via|fill|stroke|shadow|outline|divide|accent|decoration)-(?:red|rose)-\d+/g)) hits.push(m[0]);
    for (const m of src.matchAll(/(?:color|background(?:-color)?|border(?:-color)?|fill|stroke)\s*:\s*(?:red|crimson|darkred|firebrick|tomato)\b/gi)) hits.push(m[0]);
    for (const m of src.matchAll(/#([0-9a-fA-F]{6})\b/g)) {
      const r = parseInt(m[1].slice(0, 2), 16), g = parseInt(m[1].slice(2, 4), 16), b = parseInt(m[1].slice(4, 6), 16);
      if (r >= 0xb0 && g <= 0x70 && b <= 0x70) hits.push(m[0]);
    }
    return hits;
  };
  await checkAsync('[0007:AC-1][0007:AC-15] UI servida em memoria: index carrega production-ui.js antes do app.js, tem o painel no modal; app.js liga selo, alertas e painel', async () => {
    const idx = (await simulateRequest('/')).body;
    assert(idx.includes('id="modal-production-panel"'), 'painel ausente no HTML');
    const iUi = idx.indexOf('src="production-ui.js"');
    const iApp = idx.indexOf('src="app.js"');
    assert(iUi > 0 && iApp > iUi, 'production-ui.js deve ser carregado antes de app.js');
    const served = await simulateRequest('/production-ui.js');
    assert.strictEqual(served.status, 200);
    assert.strictEqual(served.body, uiCode);
    const app = (await simulateRequest('/app.js')).body;
    assert.strictEqual((app.match(/prodSourceBadge\(p\.production\)/g) || []).length, 2, 'selo deve aparecer no card e na tabela');
    assert.strictEqual((app.match(/prodAlertCounts\(p\.production\)/g) || []).length, 2);
    assert(app.includes('loadProductionPanel(projectName)') && app.includes('prodPanelHtml('));
    assert(app.includes('/production`'), 'app.js deve chamar a rota /production');
  });
  await checkAsync('[0007:AC-1][0007:AC-5][0007:AC-15] selo de origem e contagem de alertas a partir da API real em memoria', async () => {
    const { json } = await restJson('/api/projects');
    const v = json.find((p) => p.name === 'Vence').production;
    const badge = ui.prodSourceBadge(v);
    assert(badge.includes('>v2<') && badge.includes('emerald'));
    const w = ui.prodSourceBadge({ source: 'production_v2_worktree', status: 'valid' });
    assert(w.includes('v2 · worktree') && w.includes('sky'));
    assert(ui.prodSourceBadge({ source: 'specs_md', status: 'absent' }).includes('SPECS.md'));
    const rej = ui.prodSourceBadge(json.find((p) => p.name === 'Rejeita').production);
    assert(rej.includes('SPECS.md') && rej.includes('v2 rejeitado'));
    assert.strictEqual(ui.prodAlertCounts({ issue_counts: { info: 0, warning: 0, error: 0 } }), '');
    const ac = ui.prodAlertCounts({ issue_counts: { info: 1, warning: 3, error: 2 } });
    assert(ac.includes('2 erros') && ac.includes('3 avisos') && ac.includes('1 info'));
    assert(ui.prodAlertCounts({ issue_counts: { error: 1 } }).includes('1 erro<'), 'singular');
  });
  await checkAsync('[0007:AC-17][0007:AC-18][0007:AC-19][0007:AC-20] painel: pontos e indicadores da API; horas nulas aparecem como "sem dado" (nunca 0); problemas listados; texto escapado', async () => {
    const detail = (await restJson('/api/projects/Metr/production')).json;
    const html = ui.prodPanelHtml(detail);
    assert(html.includes('Producao (protocolo v2)') && html.includes('Qualidade do controle') && html.includes('Baseline x atual'));
    assert(html.includes('>36<'), 'pontos totais do indicador');
    assert(html.includes('sem dado'), 'dado desconhecido deve aparecer como sem dado');
    assert(html.includes('14 h'), 'soma de horas originais com cobertura');
    assert(html.includes('(2/7 specs)'));
    // controle sem nenhuma hora: nunca "0 h"
    const nulls = prod.computeProductionMetrics(fx.buildControl([fx.makeSpec('SPEC-0001', { points: 3 })]), [], null);
    const h2 = ui.prodPanelHtml({ source: 'production_v2', import: { source_kind: 'production_v2', status: 'valid', issue_counts: { info: 0, warning: 0, error: 0 }, control_path: 'x', imported_at: 'a' }, metrics: nulls, issues: [] });
    assert(!/>0 h/.test(h2) && !h2.includes('0 h <'), 'horas nulas viraram zero');
    assert(h2.includes('sem dado'));
    // texto vindo do arquivo do projeto e escapado
    const evil = ui.prodPanelHtml({ source: 'production_v2', import: { source_kind: 'production_v2', status: 'valid_with_alerts', issue_counts: { info: 0, warning: 1, error: 1 }, control_path: '<b>x</b>', imported_at: 'a' }, metrics: null, issues: [{ code: 'DUP_ID', severity: 'error', entity_id: 'SPEC-0001', line: 4, message: '<script>alert(1)</script>' }] });
    assert(!evil.includes('<script>') && !evil.includes('<b>x</b>'));
    assert(evil.includes('&lt;script&gt;') && evil.includes('linha 4') && evil.includes('DUP_ID'));
    // sem importacao
    const none = ui.prodPanelHtml({ source: 'specs_md', import: null });
    assert(none.includes('Sem controle de producao v2') && none.includes('SPECS.md'));
    assert(ui.prodPanelHtml(null).includes('Sem controle'));
  });
  await checkAsync('[0007:AC-5][0007:AC-6] painel de controle rejeitado e de controle com erros (usa os problemas reais da API)', async () => {
    const detail = (await restJson('/api/projects/Rejeita/production')).json;
    assert.strictEqual(detail.import.status, 'rejected');
    const html = ui.prodPanelHtml(detail);
    assert(html.includes('rejeitada') && html.includes('SCHEMA_VERSION'));
    assert(html.includes('Indicadores indisponiveis'));
  });
  check('[0007:NFR-004] nenhuma cor vermelha, nem vermelho com amarelo, em public/ (classes, nomes CSS e hex) e nas saidas geradas', () => {
    const pub = path.resolve(here, '..', 'public');
    for (const f of ['production-ui.js', 'app.js', 'index.html', 'styles.css']) {
      assert.deepStrictEqual(reddish(fs.readFileSync(path.join(pub, f), 'utf8')), [], 'vermelho em ' + f);
    }
    const sample = ui.prodPanelHtml({ source: 'production_v2', import: { source_kind: 'production_v2', status: 'valid_with_alerts', issue_counts: { info: 1, warning: 1, error: 1 }, control_path: 'x', imported_at: 'a' }, metrics: null, issues: [{ code: 'X', severity: 'error', message: 'm' }, { code: 'Y', severity: 'warning', message: 'm' }, { code: 'Z', severity: 'info', message: 'm' }] })
      + ui.prodSourceBadge({ source: 'production_v2', status: 'rejected' }) + ui.prodAlertCounts({ issue_counts: { info: 1, warning: 1, error: 1 } });
    assert.deepStrictEqual(reddish(sample), []);
    assert(!/\b(red|rose|crimson)\b/i.test(sample + uiCode), 'palavra de vermelho no codigo novo');
    // o detector de fato detecta (evita teste que nunca falha)
    assert(reddish('class="bg-red-500 text-rose-300"').length === 2);
    assert(reddish('color: #dc2626').length === 1 && reddish('color: #10b981').length === 0);
  });
  check('[0007:AC-1] UI: item "abrir a Dashboard e usar o painel" NOT TESTED (teste de tela so depois das 23:59 e sem roubar foco)', () => {
    skip('NOT TESTED: abrir a Dashboard em janela proibido pela regra de foco; validado so por HTML/JS servido em memoria');
  });

  // ===== FIM DOS TESTES =====
} finally {
  try { if (db) db.db.close(); } catch (e) { /* ja fechado */ }
  let cleaned = false;
  try {
    // so apaga a raiz com o GUID desta execucao, dentro do tmpdir
    if (guidRoot.startsWith(os.tmpdir()) && guidRoot.includes(guid)) {
      fs.rmSync(guidRoot, { recursive: true, force: true });
      cleaned = !fs.existsSync(guidRoot);
    }
  } catch (e) { /* reportado abaixo */ }
  check('[0008:AC-1] raiz temporaria foi apagada ao final', () => assert(cleaned, 'pasta temporaria ficou para tras: ' + guidRoot));
}

// ---------- relatorio por AC ----------
const byAc = new Map();
for (const r of results) {
  for (const m of r.name.matchAll(/\[(\d{4}):(AC-\d+)\]/g)) {
    const k = `${m[1]}:${m[2]}`;
    if (!byAc.has(k)) byAc.set(k, []);
    byAc.get(k).push(r.status);
  }
}
for (const r of results) console.log(`${r.status.padEnd(4)} ${r.name}${r.note ? '\n     -> ' + r.note : ''}`);
console.log('\n--- Por AC (aprovado/reprovado/pulado) ---');
for (const [k, v] of [...byAc.entries()].sort()) {
  const s = v.includes('FAIL') ? 'REPROVADO' : v.every((x) => x === 'SKIP') ? 'PULADO' : 'APROVADO';
  console.log(`${k}: ${s} (${v.length} teste(s))`);
}
const nFail = results.filter((r) => r.status === 'FAIL').length;
const nPass = results.filter((r) => r.status === 'PASS').length;
const nSkip = results.filter((r) => r.status === 'SKIP').length;
console.log(`\nTotal: ${nPass} aprovados, ${nFail} reprovados, ${nSkip} pulados`);
if (nFail > 0) process.exit(1);
