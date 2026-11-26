// Testes da SPEC-0011: versoes BE/FE no /api/status e no cabecalho + trava de versao
import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import http from 'node:http';
import { execFileSync } from 'node:child_process';
import { AppDb } from '../src/db.js';
import { createServer } from '../src/server.js';

const tmpRoot = path.join(os.tmpdir(), 'agy', crypto.randomUUID(), 'spec11-tests');
fs.mkdirSync(tmpRoot, { recursive: true });
const dbPath = path.join(tmpRoot, 'test.db');

let db;
let server;

try {
  console.log('=== SPEC-0011: Suíte de Versionamento BE/FE e Trava de Publicação ===');

  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const feVerRaw = fs.readFileSync(path.join('public', 'js', 'version.js'), 'utf8');
  const feMatch = feVerRaw.match(/FRONTEND_VERSION\s*=\s*['"]([^'"]+)['"]/);
  assert(pkg.version && pkg.version !== '1.0.0', 'package.json deve ter versao incrementada (> 1.0.0)');
  assert(feMatch && feMatch[1], 'public/js/version.js deve exportar FRONTEND_VERSION');
  console.log(`PASS [AC-1] versoes declaradas: BE v${pkg.version} | FE v${feMatch[1]}`);

  db = new AppDb(dbPath);
  server = createServer({ db });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;

  const statusData = await new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${port}/api/status`, (res) => {
      let d = '';
      res.on('data', c => { d += c; });
      res.on('end', () => resolve({ status: res.statusCode, json: JSON.parse(d) }));
    }).on('error', reject);
  });
  assert.strictEqual(statusData.status, 200);
  assert.strictEqual(statusData.json.backendVersion, pkg.version, '/api/status deve retornar backendVersion de package.json');
  console.log('PASS [AC-2] GET /api/status retorna backendVersion');

  const html = fs.readFileSync(path.join('public', 'index.html'), 'utf8');
  const appJs = fs.readFileSync(path.join('public', 'app.js'), 'utf8');
  assert(html.includes('id="version-pill"'), 'index.html deve ter #version-pill');
  assert(appJs.includes('FRONTEND_VERSION') && appJs.includes('renderVersions'), 'app.js deve exibir FRONTEND_VERSION e backendVersion');
  assert(appJs.includes('Atualizado às'), 'app.js deve exibir hora exata da atualizacao');
  console.log('PASS [AC-3] UI exibe hora de atualizacao e versoes BE/FE');

  const out = execFileSync('node', ['tools/check-version-bump.mjs'], {
    encoding: 'utf8',
    env: { ...process.env, GIT_CONFIG_GLOBAL: 'NUL', GIT_CONFIG_SYSTEM: 'NUL' }
  });
  assert(out.includes('OK: trava de versao aprovada'), 'check-version-bump.mjs deve aprovar bump atual');
  console.log('PASS [AC-4] tools/check-version-bump.mjs validado');

  console.log('\n=== SPEC-0011: Todos os ACs APROVADOS! ===');
} finally {
  if (server) server.close();
  if (db) db.close();
  fs.rmSync(tmpRoot, { recursive: true, force: true });
}
