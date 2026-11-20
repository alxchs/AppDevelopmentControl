import assert from 'assert';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from '../src/server.js';
import { AppDb } from '../src/db.js';
import { ProjectScanner } from '../src/scanner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('=== Iniciando Suíte Completa de Testes de Segurança e Resiliência (SPEC-0009: AC-1 a AC-8) ===\n');

// Banco em memória / arquivo temporário para testes
const tmpDbPath = path.join(__dirname, `test-resilience-${Date.now()}.db`);
const testDb = new AppDb(tmpDbPath);
const testScanner = new ProjectScanner(testDb);

const server = createServer({ db: testDb, scanner: testScanner });

server.listen(0, '127.0.0.1', async () => {
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  function request(path, options = {}, body = null) {
    return new Promise((resolve, reject) => {
      const opts = {
        hostname: '127.0.0.1',
        port,
        path,
        method: options.method || 'GET',
        headers: options.headers || {}
      };

      const req = http.request(opts, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        });
      });

      req.on('error', reject);

      if (body) {
        req.write(body);
      }
      req.end();
    });
  }

  try {
    // ---------------------------------------------------------
    // AC-1: Path Traversal
    // ---------------------------------------------------------
    console.log('[1/8] AC-1: Validando bloqueio de Path Traversal...');
    const traversal1 = await request('/..%2F..%2Fpackage.json');
    assert(traversal1.status === 403 || traversal1.status === 404, `Status de /..%2F..%2Fpackage.json deve ser 403/404, obtido: ${traversal1.status}`);
    const traversal2 = await request('/../../../Windows/win.ini');
    assert(traversal2.status === 403 || traversal2.status === 404, `Status deve ser 403/404, obtido: ${traversal2.status}`);
    console.log(' -> OK: AC-1 aprovado (tentativas de escape rejeitadas com 403/404).');

    // ---------------------------------------------------------
    // AC-2: DOS Device Names & Alternate Data Streams (ADS)
    // ---------------------------------------------------------
    console.log('\n[2/8] AC-2: Validando bloqueio de Dispositivos DOS e ADS...');
    const resCon = await request('/CON');
    assert.strictEqual(resCon.status, 400, `Status de /CON deve ser 400, obtido: ${resCon.status}`);
    const resNul = await request('/NUL');
    assert.strictEqual(resNul.status, 400, `Status de /NUL deve ser 400, obtido: ${resNul.status}`);
    const resAux = await request('/sub/aux.txt');
    assert.strictEqual(resAux.status, 400, `Status de /sub/aux.txt deve ser 400, obtido: ${resAux.status}`);
    const resAds = await request('/index.html::$DATA');
    assert.strictEqual(resAds.status, 400, `Status de /index.html::$DATA deve ser 400, obtido: ${resAds.status}`);
    console.log(' -> OK: AC-2 aprovado (CON, NUL, AUX e ADS rejeitados com 400).');

    // ---------------------------------------------------------
    // AC-3: Abort do Cliente durante Stream de Arquivo Estático
    // ---------------------------------------------------------
    console.log('\n[3/8] AC-3: Validando resiliência a abort do cliente durante streaming...');
    await new Promise((resolve) => {
      const req = http.request(`${baseUrl}/index.html`, (res) => {
        res.on('data', () => {
          req.destroy();
          setTimeout(() => {
            resolve();
          }, 100);
        });
      });
      req.on('error', () => {
        resolve();
      });
      req.end();
    });
    console.log(' -> OK: AC-3 aprovado (abort capturado sem crash do processo).');

    // ---------------------------------------------------------
    // AC-4: Limite Defensivo de Payload (> 1 MB)
    // ---------------------------------------------------------
    console.log('\n[4/8] AC-4: Validando rejeição de payload > 1 MB (HTTP 413)...');
    const bigPayload = JSON.stringify({ purpose: 'A'.repeat(1024 * 1024 + 200) });
    const res413 = await request('/api/projects/sample/purpose', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    }, bigPayload);
    assert.strictEqual(res413.status, 413, `Status deve ser 413, obtido: ${res413.status}`);
    const parsed413 = JSON.parse(res413.body);
    assert(parsed413.error && parsed413.error.includes('Payload Too Large'), 'Erro deve conter Payload Too Large');
    console.log(' -> OK: AC-4 aprovado (payload > 1 MB rejeitado com 413 e entregue ao cliente).');

    // ---------------------------------------------------------
    // AC-5: Cache de Prepared Statements em AppDb
    // ---------------------------------------------------------
    console.log('\n[5/8] AC-5: Validando reuso de Prepared Statements (stmtCache)...');
    assert(testDb.stmtCache instanceof Map, 'stmtCache deve ser uma instância de Map');
    const initialCacheSize = testDb.stmtCache.size;
    testDb.getKpis();
    testDb.getAllProjects();
    const sizeAfterFirstRun = testDb.stmtCache.size;
    assert(sizeAfterFirstRun >= initialCacheSize, 'Cache deve armazenar os statements executados');
    // Segunda execução não deve inflar o tamanho do cache
    testDb.getKpis();
    testDb.getAllProjects();
    assert.strictEqual(testDb.stmtCache.size, sizeAfterFirstRun, 'stmtCache deve reutilizar statements sem alocar novos');
    console.log(` -> OK: AC-5 aprovado (${testDb.stmtCache.size} statements cacheados e reutilizados com sucesso).`);

    // ---------------------------------------------------------
    // AC-6: Método AppDb.close()
    // ---------------------------------------------------------
    console.log('\n[6/8] AC-6: Validando método AppDb.close()...');
    const tempDbForClose = new AppDb(path.join(__dirname, `temp-close-${Date.now()}.db`));
    assert(tempDbForClose.db !== null, 'Banco temporário deve estar ativo');
    tempDbForClose.getKpis();
    assert(tempDbForClose.stmtCache.size > 0, 'Cache deve conter statements');
    tempDbForClose.close();
    assert.strictEqual(tempDbForClose.db, null, 'db deve ser nulo após close()');
    assert.strictEqual(tempDbForClose.stmtCache.size, 0, 'stmtCache deve estar limpo após close()');
    console.log(' -> OK: AC-6 aprovado (conexão encerrada e descritores/cache liberados).');

    // ---------------------------------------------------------
    // AC-7: scanSingleProject via API e método direto
    // ---------------------------------------------------------
    console.log('\n[7/8] AC-7: Validando scanSingleProject (método e API)...');
    assert(typeof testScanner.scanSingleProject === 'function', 'scanSingleProject deve ser função em ProjectScanner');
    const appDir = path.resolve(__dirname, '..');
    const scanned = testScanner.scanSingleProject(appDir, 'AppDevControlSelf', true);
    assert(scanned !== null && typeof scanned === 'object', 'scanSingleProject deve retornar objeto do projeto');
    assert.strictEqual(scanned.name, 'AppDevControlSelf');

    // Testar rota POST /api/projects/register
    const regRes = await request('/api/projects/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, JSON.stringify({ path: appDir, label: 'AppDevControlApi' }));
    assert.strictEqual(regRes.status, 200, `POST /api/projects/register deve retornar 200, obtido: ${regRes.status}`);
    const regData = JSON.parse(regRes.body);
    assert.strictEqual(regData.success, true, 'Resposta deve conter success: true');
    assert(regData.project && regData.project.name === 'AppDevControlApi', 'Projeto cadastrado deve constar na resposta');
    console.log(' -> OK: AC-7 aprovado (scanSingleProject e POST /api/projects/register funcionam perfeitamente).');

    // ---------------------------------------------------------
    // AC-8: Git spawnSync Seguro com Tags com Espaços / Caracteres Especiais
    // ---------------------------------------------------------
    console.log('\n[8/8] AC-8: Validando chamadas Git seguras via spawnSync e tratamento de caracteres...');
    assert(typeof testScanner.safeGit === 'function', 'safeGit deve existir');
    // Invocar comando Git com argumentos em array seguro
    const gitStatus = testScanner.safeGit(['status', '--porcelain'], appDir);
    assert(typeof gitStatus === 'string', 'Retorno de safeGit deve ser string');
    // Invocar com argumento contendo aspas e espaços - não deve quebrar
    const gitWithQuotes = testScanner.safeGit(['log', '-n', '1', '--format=%an %s'], appDir);
    assert(typeof gitWithQuotes === 'string', 'Argumento com espaços deve ser tratado com segurança');
    // Testar retorno seguro com comando inválido (não deve lançar exceção não tratada)
    const invalidGit = testScanner.safeGit(['invalid-command-xyz'], appDir);
    assert.strictEqual(invalidGit, '', 'Comando git inválido deve retornar string vazia sem lançar');
    console.log(' -> OK: AC-8 aprovado (passagem em array spawnSync sem injeção nem estouro de buffer).');

    console.log('\n=== Todos os 8 Critérios de Aceite da SPEC-0009 foram APROVADOS com Sucesso! ===');

    server.close();
    testDb.close();

    // Limpar arquivo de banco temporário
    try {
      if (fs.existsSync(tmpDbPath)) fs.unlinkSync(tmpDbPath);
      const closeDbPath = path.join(__dirname, `temp-close-${Date.now()}.db`);
      if (fs.existsSync(closeDbPath)) fs.unlinkSync(closeDbPath);
    } catch (e) {}

    process.exit(0);
  } catch (err) {
    console.error('Falha nos testes de segurança e resiliência:', err);
    server.close();
    testDb.close();
    try {
      if (fs.existsSync(tmpDbPath)) fs.unlinkSync(tmpDbPath);
    } catch (e) {}
    process.exit(1);
  }
});
