import assert from 'assert';
import { EventEmitter } from 'events';
import { Writable } from 'stream';
import { AppDb } from '../src/db.js';
import { getLanAddresses } from '../src/lan.js';
import { generateNotebookLmDoc } from '../src/notebooklm.js';
import { createServer } from '../src/server.js';
import { computeHealthStatus, computeSddMaturityScore } from '../src/evaluator.js';

console.log('=== Iniciando Bateria de Testes de Aceite (Spec 002) ===\n');

// 1. Teste de Banco SQLite e Novas Colunas
console.log('[1/7] Testando Banco SQLite, Worktrees e Colunas de Saúde...');
const db = new AppDb();
assert(db.db !== null, 'Banco deve ser inicializado');
const kpis = db.getKpis();
assert(typeof kpis.totalProjects === 'number', 'KPI totalProjects deve ser numérico');
assert(kpis.totalProjects > 0, 'Deve conter projetos catalogados');
console.log(` -> OK: ${kpis.totalProjects} projetos canônicos e ${kpis.totalWorktrees || 0} worktrees.`);

// 2. Teste do Algoritmo de Health Status
console.log('\n[2/7] Testando Motor de Avaliação de Saúde (Health Status)...');
const sampleBlocked = { alexandre_pending_count: 2, days_since_last_change: 5, changes_7d: 10, total_specs: 5, pending_specs: 1 };
assert.strictEqual(computeHealthStatus(sampleBlocked).status, 'blocked', 'Deve classificar como blocked quando há pendência do Alexandre');

const sampleActive = { alexandre_pending_count: 0, days_since_last_change: 2, changes_7d: 5, changes_30d: 20, total_specs: 5, pending_specs: 1 };
assert.strictEqual(computeHealthStatus(sampleActive).status, 'active', 'Deve classificar como active quando ativo');

const sampleStable = { alexandre_pending_count: 0, days_since_last_change: 50, changes_7d: 0, changes_30d: 0, total_specs: 5, done_specs: 5, pending_specs: 0 };
assert.strictEqual(computeHealthStatus(sampleStable).status, 'stable', 'Deve classificar como stable quando concluído e sem bloqueios');

const sampleIncubating = { alexandre_pending_count: 0, days_since_last_change: 1, changes_7d: 1, total_specs: 0, pending_specs: 0 };
assert.strictEqual(computeHealthStatus(sampleIncubating).status, 'incubating', 'Deve classificar como incubating sem specs');
console.log(' -> OK: Todos os 4 estados de Health Status foram validados com precisão.');

// 3. Teste do SDD Maturity Score
console.log('\n[3/7] Testando Cálculo do SDD Maturity Score (0-100%)...');
const sampleProjectFull = {
  total_specs: 10,
  done_specs: 10,
  purpose: 'Ferramenta completa de teste',
  purpose_source: 'README.md',
  has_git: 1,
  last_tag: 'tag_1.0.0_seguranca',
  github_url: 'https://github.com/alxchs/repo'
};
const maturity = computeSddMaturityScore(sampleProjectFull);
assert(maturity.score >= 80, 'Projeto maduro deve pontuar alto (>= 80%)');
assert(maturity.breakdown.specs > 0, 'Specs devem pontuar');
assert(maturity.breakdown.tasks > 0, 'Tasks devem pontuar');
assert(maturity.breakdown.readme > 0, 'Readme deve pontuar');
console.log(` -> OK: SDD Maturity Score calculado com sucesso (${maturity.score}%).`);

// 4. Teste de Busca FTS5
console.log('\n[4/7] Testando Busca Textual FTS5...');
const searchResults = db.searchFts('KillTask');
assert(Array.isArray(searchResults), 'Busca deve retornar array');
console.log(` -> OK: Busca FTS5 por "KillTask" retornou ${searchResults.length} resultados.`);

// 5. Teste de Geração de Dossiê NotebookLM com Saúde
console.log('\n[5/7] Testando Geração de Dossiê para NotebookLM...');
const doc = generateNotebookLmDoc(db);
assert(doc.includes('Dossiê Executivo de Portfólio'), 'Deve conter título executivo');
assert(doc.includes('Diagnóstico de Farol de Saúde'), 'Deve conter seção de farol de saúde');
assert(doc.includes('Maturidade SDD'), 'Deve conter maturidade SDD');
console.log(` -> OK: Dossiê gerado com ${doc.length} caracteres e formatado com indicadores de saúde.`);

// 6. Teste da Lógica da API REST (Mock In-Memory)
console.log('\n[6/7] Testando Endpoints REST e Rotas da API...');
const server = createServer();
const requestListener = server.listeners('request')[0];

class MockResponse extends Writable {
  constructor(resolve) {
    super();
    this.resolve = resolve;
    this.statusCode = 200;
    this.headers = {};
    this.body = '';
  }
  writeHead(code, headers) {
    this.statusCode = code;
    this.headers = headers || {};
  }
  _write(chunk, encoding, callback) {
    this.body += chunk.toString();
    callback();
  }
  end(data) {
    if (data) this.body += data;
    super.end();
    this.resolve({ status: this.statusCode, headers: this.headers, body: this.body });
  }
}

function simulateRequest(url, method = 'GET', body = null) {
  return new Promise((resolve) => {
    const req = new EventEmitter();
    req.url = url;
    req.method = method;
    req.headers = { host: 'localhost:3333' };

    const res = new MockResponse(resolve);
    requestListener(req, res);

    if (body) {
      req.emit('data', JSON.stringify(body));
    }
    req.emit('end');
  });
}

const lanRes = await simulateRequest('/api/lan-info');
assert.strictEqual(lanRes.status, 200);

const kpiRes = await simulateRequest('/api/kpis');
assert.strictEqual(kpiRes.status, 200);

const alexandreRes = await simulateRequest('/api/alexandre-actions');
assert.strictEqual(alexandreRes.status, 200);

const projectsRes = await simulateRequest('/api/projects');
assert.strictEqual(projectsRes.status, 200);
const projectsJson = JSON.parse(projectsRes.body);
assert(Array.isArray(projectsJson));
assert(projectsJson.some(p => p.health_status), 'Projetos devem conter health_status');
assert(projectsJson.some(p => typeof p.sdd_score === 'number'), 'Projetos devem conter sdd_score');

const nblmRes = await simulateRequest('/api/export/notebooklm');
assert.strictEqual(nblmRes.status, 200);

console.log(' -> OK: Todos os endpoints REST validados com as novas métricas de saúde.');

// 7. Teste de Override de Propósito
console.log('\n[7/7] Testando Override de Propósito no SQLite...');
const testProjectName = 'KillTask';
const original = db.getProjectByName(testProjectName);
assert(original !== null, 'KillTask deve existir');
const newPurpose = 'Gerenciador executivo e monitor de processos do Windows com SDD';
db.updatePurposeOverride(testProjectName, newPurpose);
const updated = db.getProjectByName(testProjectName);
assert.strictEqual(updated.purpose, newPurpose);
console.log(' -> OK: Propósito atualizado e persistido com sucesso.');

console.log('\n=== Todos os 7 Testes de Aceite PASSARAM com 100% de Sucesso! ===');
