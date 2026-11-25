// Suíte de testes da SPEC-0010 (Clareza real, snapshots, offline LAN, segurança e limpeza)
import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import http from 'node:http';
import { execFileSync } from 'node:child_process';
import { AppDb } from '../src/db.js';
import { ProjectScanner } from '../src/scanner.js';
import { computeHealthStatus } from '../src/evaluator.js';
import { createServer } from '../src/server.js';

const tmpRoot = path.join(os.tmpdir(), 'agy', crypto.randomUUID(), 'spec10-tests');
fs.mkdirSync(tmpRoot, { recursive: true });
const dbPath = path.join(tmpRoot, 'test.db');
const baseDir = path.join(tmpRoot, 'repos');
fs.mkdirSync(baseDir, { recursive: true });

let db;
let server;

function httpReq(port, reqPath, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { hostname: '127.0.0.1', port, path: reqPath, method, headers: body ? { 'Content-Type': 'application/json' } : {} },
      (res) => {
        let data = '';
        res.on('data', c => { data += c; });
        res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
      }
    );
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

try {
  console.log('=== SPEC-0010: Suíte de Clareza Real, Snapshots, Offline e Segurança ===');
  db = new AppDb(dbPath);
  const scanner = new ProjectScanner(db, baseDir, { now: () => '2026-11-25T18:30:00.000Z' });

  // AC-12: PRAGMA user_version >= 2 e portfolio_snapshots criada
  const uv = db.db.prepare('PRAGMA user_version').get()?.user_version;
  assert(uv >= 2, `user_version esperado >= 2, obtido ${uv}`);
  assert(typeof scanner.parseSpecsIndex === 'undefined', 'parseSpecsIndex morto deve ter sido removido');
  console.log('PASS [AC-12] schema versionado (user_version=' + uv + ') e codigo morto removido');

  // AC-2: spec.md apenas APROVADA (sem tasks.md) NAO deve ser marcada como done
  const projA = path.join(baseDir, 'ProjetoAlpha');
  fs.mkdirSync(path.join(projA, 'docs', 'specs', '001-init'), { recursive: true });
  fs.writeFileSync(path.join(projA, 'docs', 'specs', '001-init', 'spec.md'), '# Spec Init\nEstado: **APROVADA**\nPeso: 3\n');
  fs.writeFileSync(path.join(projA, 'AGENT_CONTEXT.md'), 'PROJECT ProjetoAlpha\nCURRENT PHASE Fase 1 na branch feature/inexistente\n');

  // Inicializar git em ProjetoAlpha + uma worktree suja
  execFileSync('git', ['init'], { cwd: projA, stdio: 'ignore' });
  execFileSync('git', ['config', 'user.email', 'test@local'], { cwd: projA, stdio: 'ignore' });
  execFileSync('git', ['config', 'user.name', 'Tester'], { cwd: projA, stdio: 'ignore' });
  execFileSync('git', ['add', '.'], { cwd: projA, stdio: 'ignore' });
  execFileSync('git', ['commit', '-m', 'init'], { cwd: projA, stdio: 'ignore' });

  const wtPath = path.join(baseDir, 'ProjetoAlpha-wt1');
  execFileSync('git', ['worktree', 'add', '-b', 'feature/wt1', wtPath], { cwd: projA, stdio: 'ignore' });
  fs.writeFileSync(path.join(wtPath, 'wip.txt'), 'uncommitted change in worktree');

  const scanned = scanner.scanAll();
  assert.strictEqual(scanned.length, 1, 'Deve consolidar ProjetoAlpha + worktree em 1 projeto canonico');
  const alpha = db.getProjectByName('ProjetoAlpha');
  assert.strictEqual(alpha.done_specs, 0, 'Spec apenas APROVADA sem tasks nao pode contar como done');
  assert.strictEqual(alpha.pending_specs, 1, 'Spec apenas APROVADA deve contar como pendente');
  console.log('PASS [AC-2] spec.md APROVADA sem tasks nao gera falso 100% concluido');

  // AC-4: Stepper nao deve manglar SPEC-0007 em FSPEC-0007
  const stepperTest = db.buildStepper([
    { spec_id: 'SPEC-0007', spec_name: 'V2', status: 'in_progress', weight: 8, total_tasks: 2, completed_tasks: 1 }
  ]);
  assert.strictEqual(stepperTest[0].id, 'SPEC-0007', 'Stepper nao deve prefixar F em SPEC-0007');
  console.log('PASS [AC-4] stepper preserva IDs SPEC-* sem prefixo F errado');

  // AC-5 e AC-6: worktree_dirty_count e divergence_alerts
  assert(alpha.worktree_dirty_count >= 1, `worktree_dirty_count esperado >= 1, obtido ${alpha.worktree_dirty_count}`);
  assert(Array.isArray(alpha.divergence_alerts) && alpha.divergence_alerts.length >= 2, 'Deve detectar WORKTREE_DIRTY e STALE_CONTEXT_BRANCH');
  assert(alpha.divergence_alerts.some(d => d.code === 'WORKTREE_DIRTY'), 'Deve conter alerta WORKTREE_DIRTY');
  assert(alpha.divergence_alerts.some(d => d.code === 'STALE_CONTEXT_BRANCH'), 'Deve conter alerta STALE_CONTEXT_BRANCH');
  console.log('PASS [AC-5][AC-6] worktree suja agregada e divergencias detectadas');

  // AC-3: evaluator usa sinais de production_v2 (controle rejeitado / bloqueado)
  const rejHealth = computeHealthStatus({ alexandre_pending_count: 0, prod_status: 'rejected', total_specs: 2, pending_specs: 0 });
  assert.strictEqual(rejHealth.status, 'blocked', 'Controle v2 rejeitado deve sinalizar bloqueio/atencao');
  console.log('PASS [AC-3] evaluator reflete controle v2 rejeitado');

  // AC-8: snapshot diario salvo e recuperado
  const snaps = db.getSnapshots(10);
  assert.strictEqual(snaps.length, 1, 'Deve ter 1 snapshot diario gravado apos scanAll');
  assert.strictEqual(snaps[0].date, '2026-11-25');
  console.log('PASS [AC-8] snapshot diario salvo no SQLite');

  // AC-1, AC-8, AC-9, AC-11: rotas HTTP da API
  server = createServer({ db, scanner, allowedRoots: [baseDir] });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;

  const notFoundApi = await httpReq(port, '/api/rota-que-nao-existe');
  assert.strictEqual(notFoundApi.status, 404, '/api/* inexistente deve retornar 404 JSON');
  assert(notFoundApi.headers['content-type'].includes('application/json'));

  const scanRes = await httpReq(port, '/api/scan', 'POST');
  assert.strictEqual(scanRes.status, 200);
  const scanJson = JSON.parse(scanRes.body);
  assert.strictEqual(scanJson.success, true);

  const statusRes = await httpReq(port, '/api/status');
  assert.strictEqual(statusRes.status, 200);
  const statusJson = JSON.parse(statusRes.body);
  assert(statusJson.lastScanAt, 'status deve expor lastScanAt');

  const snapsRes = await httpReq(port, '/api/snapshots');
  assert.strictEqual(snapsRes.status, 200);
  assert(JSON.parse(snapsRes.body).length >= 1);

  const forbiddenReg = await httpReq(port, '/api/projects/register', 'POST', JSON.stringify({ path: 'C:\\Windows' }));
  assert.strictEqual(forbiddenReg.status, 403, 'Registrar caminho fora de allowedRoots deve retornar 403');
  console.log('PASS [AC-1][AC-8][AC-9][AC-11] /api/* 404 JSON, /api/scan, /api/status, /api/snapshots e trava allowedRoots');

  // AC-10: frontend 100% offline sem CDNs externas e sem /api/rescan
  const pubDir = path.resolve('public');
  const html = fs.readFileSync(path.join(pubDir, 'index.html'), 'utf8');
  assert(!html.includes('cdn.tailwindcss.com') && !html.includes('unpkg.com') && !html.includes('cdn.jsdelivr.net'), 'index.html nao deve referenciar CDNs externas');
  assert(fs.existsSync(path.join(pubDir, 'vendor', 'tailwindcss.min.js')), 'tailwindcss.min.js local deve existir');
  assert(fs.existsSync(path.join(pubDir, 'vendor', 'lucide.min.js')), 'lucide.min.js local deve existir');
  assert(fs.existsSync(path.join(pubDir, 'vendor', 'chart.umd.min.js')), 'chart.umd.min.js local deve existir');
  const appJs = fs.readFileSync(path.join(pubDir, 'app.js'), 'utf8');
  assert(!appJs.includes('/api/rescan'), 'app.js nao deve chamar /api/rescan');
  console.log('PASS [AC-10] frontend 100% offline na LAN e /api/rescan removido');

  console.log('\n=== SPEC-0010: Todos os ACs APROVADOS! ===');
} finally {
  if (server) server.close();
  if (db) db.close();
  fs.rmSync(tmpRoot, { recursive: true, force: true });
}
