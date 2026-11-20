import assert from 'assert';
import http from 'http';
import { createServer } from '../src/server.js';

console.log('=== Iniciando Testes de Aceite da Tarefa T2 (SPEC-0009) ===\n');

// Mock db e scanner para testar o servidor HTTP de forma isolada
const mockDb = {
  getKpis: () => ({ totalProjects: 0 }),
  getAllProjects: () => [],
  getProjectByName: () => null,
  getProductionDetail: () => null,
  getProductionSummary: () => ({ source: null, status: 'absent' }),
  updatePurposeOverride: () => {},
  addMonitoredPath: () => {},
  getAllAlexandreActions: () => [],
  searchFts: () => []
};

const mockScanner = {
  scanAll: () => [],
  scanSingleProject: (p, l) => ({ name: l, path: p })
};

const server = createServer({ db: mockDb, scanner: mockScanner });

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
    // 1. Path Traversal
    console.log('[1/5] Testando bloqueio de Path Traversal (/..%2F..%2Fpackage.json)...');
    const resTraversal = await request('/..%2F..%2Fpackage.json');
    assert(resTraversal.status === 403 || resTraversal.status === 404, `Status deve ser 403 ou 404, recebido: ${resTraversal.status}`);
    console.log(` -> OK: Status ${resTraversal.status} recebido.`);

    // 2. DOS Device Names e Alternate Data Streams (ADS)
    console.log('\n[2/5] Testando bloqueio de dispositivos DOS (/CON e /NUL) e ADS (:)...');
    const resCon = await request('/CON');
    assert.strictEqual(resCon.status, 400, `Status de /CON deve ser 400, recebido: ${resCon.status}`);
    const resNul = await request('/NUL');
    assert.strictEqual(resNul.status, 400, `Status de /NUL deve ser 400, recebido: ${resNul.status}`);
    const resAux = await request('/sub/aux.txt');
    assert.strictEqual(resAux.status, 400, `Status de /sub/aux.txt deve ser 400, recebido: ${resAux.status}`);
    const resAds = await request('/index.html::$DATA');
    assert.strictEqual(resAds.status, 400, `Status de /index.html::$DATA deve ser 400, recebido: ${resAds.status}`);
    const resAds2 = await request('/sub:stream/file');
    assert.strictEqual(resAds2.status, 400, `Status de /sub:stream/file deve ser 400, recebido: ${resAds2.status}`);
    console.log(' -> OK: /CON, /NUL, dispositivos DOS e ADS retornam 400 sem tocar o disco.');

    // 3. Payload > 1 MB retorna 413
    console.log('\n[3/5] Testando rejeição de payload > 1 MB (413 Payload Too Large)...');
    const bigPayload = JSON.stringify({ purpose: 'x'.repeat(1024 * 1024 + 100) });
    const res413 = await request('/api/projects/sample/purpose', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    }, bigPayload);
    assert.strictEqual(res413.status, 413, `Status deve ser 413, recebido: ${res413.status}`);
    const parsed413 = JSON.parse(res413.body);
    assert(parsed413.error.includes('Payload Too Large'), 'Mensagem deve indicar Payload Too Large');
    console.log(' -> OK: 413 Payload Too Large retornado e entregue ao cliente.');

    // 4. Abortar cliente durante stream de arquivo estático
    console.log('\n[4/5] Testando abort do cliente durante streaming de arquivo estático...');
    await new Promise((resolve, reject) => {
      const req = http.request(`${baseUrl}/index.html`, (res) => {
        // Aborta a requisição assim que receber o primeiro chunk
        res.on('data', () => {
          req.destroy();
          setTimeout(() => {
            // Se o processo não caiu, o teste passou
            resolve();
          }, 100);
        });
      });
      req.on('error', (err) => {
        // Erro esperado no cliente
        resolve();
      });
      req.end();
    });
    console.log(' -> OK: Abort do cliente tratado sem crash do servidor.');

    // 5. URI malformada e SPA fallback
    console.log('\n[5/5] Testando URI malformada e SPA fallback normal...');
    const resMalformed = await request('/%E0%A4%A');
    assert.strictEqual(resMalformed.status, 400, `Status deve ser 400 para URI malformada, recebido: ${resMalformed.status}`);

    const resIndex = await request('/');
    assert.strictEqual(resIndex.status, 200, 'Raiz deve retornar 200 servindo index.html');
    assert(resIndex.headers['content-type'].includes('text/html'), 'Content-Type deve ser text/html');

    console.log(' -> OK: URI malformada devolve 400 e fallback SPA funciona perfeitamente.');

    console.log('\n=== Todos os 5 testes de segurança e resiliência da T2 passaram com sucesso! ===');
    server.close();
    process.exit(0);
  } catch (err) {
    console.error('Falha no teste:', err);
    server.close();
    process.exit(1);
  }
});
