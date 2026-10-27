import assert from 'assert';
import { EventEmitter } from 'events';
import { Writable } from 'stream';
import { AppDb } from '../src/db.js';
import { getLanAddresses } from '../src/lan.js';
import { generateNotebookLmDoc } from '../src/notebooklm.js';
import { createServer } from '../src/server.js';

console.log('=== Iniciando Bateria de Testes de Aceite ===\n');

// 1. Teste de Banco SQLite
console.log('[1/6] Testando Banco SQLite e FTS5...');
const db = new AppDb();
assert(db.db !== null, 'Banco deve ser inicializado');
const kpis = db.getKpis();
assert(typeof kpis.totalProjects === 'number', 'KPI totalProjects deve ser numérico');
assert(kpis.totalProjects > 0, 'Deve conter projetos catalogados');
console.log(` -> OK: ${kpis.totalProjects} projetos no banco SQLite.`);

// 2. Teste de Busca FTS5
console.log('\n[2/6] Testando Busca Textual FTS5...');
const searchResults = db.searchFts('KillTask');
assert(Array.isArray(searchResults), 'Busca deve retornar array');
console.log(` -> OK: Busca FTS5 por "KillTask" retornou ${searchResults.length} resultados.`);

// 3. Teste de Detecção de Rede LAN
console.log('\n[3/6] Testando Detecção de Rede LAN...');
const lan = getLanAddresses(3333);
assert(lan.primaryUrl.startsWith('http://'), 'URL primária deve começar com http://');
assert(typeof lan.port === 'number', 'Porta deve ser numérica');
console.log(` -> OK: URL Primária da LAN: ${lan.primaryUrl}`);

// 4. Teste de Geração do Dossiê NotebookLM
console.log('\n[4/6] Testando Geração de Dossiê para NotebookLM...');
const doc = generateNotebookLmDoc(db);
assert(doc.includes('Dossiê Executivo de Portfólio'), 'Deve conter título executivo');
assert(doc.includes('Google NotebookLM'), 'Deve mencionar NotebookLM');
assert(doc.includes('Pontos de Atenção Crítica: Decisões e Pendências do Alexandre'), 'Deve conter seção do Alexandre');
console.log(` -> OK: Dossiê gerado com ${doc.length} caracteres e formatado para NotebookLM.`);

// 5. Teste da Lógica da API REST (Mock In-Memory)
console.log('\n[5/6] Testando Endpoints REST e Rotas da API...');
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

// 5.1 /api/lan-info
const lanRes = await simulateRequest('/api/lan-info');
assert.strictEqual(lanRes.status, 200, 'Endpoint /api/lan-info deve retornar 200');
const lanJson = JSON.parse(lanRes.body);
assert(lanJson.localhostUrl, 'Deve conter localhostUrl');

// 5.2 /api/kpis
const kpiRes = await simulateRequest('/api/kpis');
assert.strictEqual(kpiRes.status, 200, 'Endpoint /api/kpis deve retornar 200');
const kpiJson = JSON.parse(kpiRes.body);
assert.strictEqual(kpiJson.totalProjects, kpis.totalProjects, 'KPIs da API devem bater com o banco');

// 5.3 /api/alexandre-actions
const alexandreRes = await simulateRequest('/api/alexandre-actions');
assert.strictEqual(alexandreRes.status, 200, 'Endpoint /api/alexandre-actions deve retornar 200');
const alexandreJson = JSON.parse(alexandreRes.body);
assert(Array.isArray(alexandreJson), 'Ações do Alexandre deve ser array');
assert(alexandreJson.length > 0, 'Deve conter ações do Alexandre');

// 5.4 /api/export/notebooklm
const nblmRes = await simulateRequest('/api/export/notebooklm');
assert.strictEqual(nblmRes.status, 200, 'Endpoint /api/export/notebooklm deve retornar 200');
assert(nblmRes.body.includes('NotebookLM'), 'Dossiê deve conter texto do NotebookLM');

// 5.5 / (index.html)
const indexRes = await simulateRequest('/');
assert.strictEqual(indexRes.status, 200, 'Endpoint raiz deve retornar 200');
assert(indexRes.body.includes('AppDevelopmentControl'), 'HTML deve conter título da aplicação');
console.log(' -> OK: Todos os 5 endpoints REST foram testados e validados com 100% de sucesso.');

// 6. Teste de Inclusão e Edição de Propósito
console.log('\n[6/6] Testando Override de Propósito no SQLite...');
const testProjectName = 'KillTask';
const original = db.getProjectByName(testProjectName);
assert(original !== null, 'KillTask deve existir');
const newPurpose = 'Gerenciador executivo e monitor de processos do Windows com SDD';
db.updatePurposeOverride(testProjectName, newPurpose);
const updated = db.getProjectByName(testProjectName);
assert.strictEqual(updated.purpose, newPurpose, 'Propósito deve ter sido atualizado');
assert.strictEqual(updated.purpose_override, 1, 'Flag purpose_override deve ser 1');
console.log(' -> OK: Propósito atualizado e persistido com sucesso.');

console.log('\n=== Todos os 6 Testes de Aceite PASSARAM com 100% de Sucesso! ===');

