import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getLanAddresses } from './lan.js';
import { generateNotebookLmDoc } from './notebooklm.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.resolve(path.join(__dirname, '..', 'public'));
const PORT = parseInt(process.env.PORT || '3333', 10);
const DOS_DEVICE_RE = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i;
const DEFAULT_ALLOWED_ROOTS = (process.env.ADC_ALLOWED_ROOTS || 'c:\\desenv')
  .split(';')
  .map(r => path.resolve(r.trim()))
  .filter(Boolean);
const AUTO_SCAN_INTERVAL_MS = parseInt(process.env.ADC_AUTOSCAN_MS || String(10 * 60 * 1000), 10);

function isPathWithinAllowedRoots(targetPath, allowedRoots) {
  const resolved = path.resolve(targetPath);
  const norm = process.platform === 'win32' ? resolved.toLowerCase() : resolved;
  return allowedRoots.some(root => {
    const r = process.platform === 'win32' ? path.resolve(root).toLowerCase() : path.resolve(root);
    const withSep = r.endsWith(path.sep) ? r : r + path.sep;
    return norm === r || norm.startsWith(withSep);
  });
}

// Banco e scanner padrao so nascem quando preciso (importar este modulo nao abre o banco real); testes injetam os seus.
let defaultDeps = null;
async function getDefaultDeps() {
  if (!defaultDeps) {
    const { AppDb } = await import('./db.js');
    const { ProjectScanner } = await import('./scanner.js');
    const d = new AppDb();
    defaultDeps = { db: d, scanner: new ProjectScanner(d) };
  }
  return defaultDeps;
}

// Helper para ler body JSON com limite defensivo contra estouro de memoria (OOM)
function parseJsonBody(req, maxBytes = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let body = '';
    let bytesReceived = 0;
    let destroyed = false;

    req.on('data', chunk => {
      if (destroyed) return;
      bytesReceived += chunk.length;
      if (bytesReceived > maxBytes) {
        destroyed = true;
        const err = new Error('Payload Too Large');
        err.statusCode = 413;
        req.removeAllListeners('data');
        req.resume();
        reject(err);
        return;
      }
      body += chunk;
    });

    req.on('end', () => {
      if (destroyed) return;
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        e.statusCode = 400;
        reject(e);
      }
    });

    req.on('error', err => {
      if (!destroyed) reject(err);
    });
  });
}

// Helper para resposta JSON
function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}

// Helper para entrega segura de arquivos estaticos com tratamento de streams
function serveStaticFile(res, filePath, fallbackToIndex = true) {
  try {
    if (!fs.existsSync(filePath)) {
      if (fallbackToIndex && !path.extname(filePath)) {
        const indexPath = path.join(PUBLIC_DIR, 'index.html');
        return serveStaticFile(res, indexPath, false);
      }
      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ error: 'Not Found' }));
    }

    const stat = fs.statSync(filePath);
    if (!stat.isFile()) {
      if (fallbackToIndex) {
        const indexPath = path.join(PUBLIC_DIR, 'index.html');
        return serveStaticFile(res, indexPath, false);
      }
      res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ error: 'Forbidden' }));
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentTypes = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.svg': 'image/svg+xml',
      '.png': 'image/png'
    };
    const contentType = contentTypes[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });

    const stream = fs.createReadStream(filePath);
    stream.on('error', () => {
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      }
      res.end(JSON.stringify({ error: 'File read error' }));
    });
    res.on('close', () => {
      stream.destroy();
    });
    return stream.pipe(res);
  } catch (err) {
    if (!res.headersSent) {
      const code = err.code === 'EACCES' || err.code === 'EPERM' ? 403 : 500;
      res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
    }
    return res.end(JSON.stringify({ error: err.message }));
  }
}

// Servidor HTTP
export function createServer(deps = {}) {
  let resolvedDeps = deps.db ? { db: deps.db, scanner: deps.scanner || { scanAll: () => [], scanSingleProject: () => null } } : null;
  const allowedRoots = (deps.allowedRoots || DEFAULT_ALLOWED_ROOTS).map(r => path.resolve(r));
  const scanState = {
    isScanning: false,
    lastScanAt: null,
    lastScanDurationMs: null,
    lastScanCount: null,
    lastScanError: null
  };

  function runScan(scanner) {
    if (scanState.isScanning) {
      return { alreadyRunning: true, count: scanState.lastScanCount ?? 0, durationMs: scanState.lastScanDurationMs ?? 0 };
    }
    scanState.isScanning = true;
    scanState.lastScanError = null;
    const startTime = Date.now();
    try {
      const scanned = scanner.scanAll();
      const duration = Date.now() - startTime;
      scanState.lastScanAt = new Date().toISOString();
      scanState.lastScanDurationMs = duration;
      scanState.lastScanCount = scanned.length;
      return { alreadyRunning: false, count: scanned.length, durationMs: duration };
    } catch (e) {
      scanState.lastScanError = e.message;
      throw e;
    } finally {
      scanState.isScanning = false;
    }
  }

  const server = http.createServer(async (req, res) => {
    try {
      if (!resolvedDeps) {
        resolvedDeps = await getDefaultDeps();
      }
      const { db, scanner } = resolvedDeps;
      let parsedUrl;
      try {
        parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      } catch (e) {
        const err = new URIError('URL inválida');
        err.statusCode = 400;
        throw err;
      }

      const pathname = parsedUrl.pathname;
      const method = req.method;

      // Tratar CORS pre-flight
      if (method === 'OPTIONS') {
        res.writeHead(204, {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        });
        return res.end();
      }

      // --- API ENDPOINTS ---

      // 1. LAN Info
      if (pathname === '/api/lan-info' && method === 'GET') {
        const lanInfo = getLanAddresses(PORT);
        return sendJson(res, 200, lanInfo);
      }

      // 2. KPIs
      if (pathname === '/api/kpis' && method === 'GET') {
        const kpis = db.getKpis();
        return sendJson(res, 200, kpis);
      }

      // 3. Projetos (Lista)
      if (pathname === '/api/projects' && method === 'GET') {
        const projects = db.getAllProjects();
        return sendJson(res, 200, projects);
      }

      // 4. Detalhes de um projeto específico
      const projectDetailMatch = pathname.match(/^\/api\/projects\/([^/]+)$/);
      if (projectDetailMatch && method === 'GET') {
        let name;
        try {
          name = decodeURIComponent(projectDetailMatch[1]);
        } catch (e) {
          const err = new URIError('URI malformed');
          err.statusCode = 400;
          throw err;
        }
        const project = db.getProjectByName(name);
        if (!project) return sendJson(res, 404, { error: 'Projeto não encontrado' });
        return sendJson(res, 200, project);
      }

      // 4b. Producao v2 de um projeto (SPEC-0007 FR-017): origem, importacao, SPECs, problemas e indicadores
      const productionMatch = pathname.match(/^\/api\/projects\/([^/]+)\/production$/);
      if (productionMatch && method === 'GET') {
        let name;
        try {
          name = decodeURIComponent(productionMatch[1]);
        } catch (e) {
          const err = new URIError('URI malformed');
          err.statusCode = 400;
          throw err;
        }
        const project = db.getProjectByName(name);
        if (!project) return sendJson(res, 404, { error: 'Projeto não encontrado' });
        const detail = db.getProductionDetail(name);
        const summary = db.getProductionSummary(name, project.specs_source);
        return sendJson(res, 200, detail
          ? { name, source: summary.source, ...detail }
          : { name, source: summary.source, import: null, specs: [], issues: [], event_count: 0, metrics: null, baseline: null });
      }

      // 5. Update do Propósito de um projeto
      const purposeMatch = pathname.match(/^\/api\/projects\/([^/]+)\/purpose$/);
      if (purposeMatch && method === 'PUT') {
        let name;
        try {
          name = decodeURIComponent(purposeMatch[1]);
        } catch (e) {
          const err = new URIError('URI malformed');
          err.statusCode = 400;
          throw err;
        }
        try {
          const body = await parseJsonBody(req);
          if (!body.purpose || typeof body.purpose !== 'string') {
            return sendJson(res, 400, { error: 'Campo purpose é obrigatório' });
          }
          db.updatePurposeOverride(name, body.purpose.trim());
          return sendJson(res, 200, { success: true, name, purpose: body.purpose.trim() });
        } catch (e) {
          const status = e.statusCode || 400;
          return sendJson(res, status, { error: e.message });
        }
      }

      // 6. Registrar novo projeto / pasta customizada
      if (pathname === '/api/projects/register' && method === 'POST') {
        try {
          const body = await parseJsonBody(req);
          if (!body.path || typeof body.path !== 'string') {
            return sendJson(res, 400, { error: 'Campo path é obrigatório' });
          }
          const resolvedPath = path.resolve(body.path);
          if (!isPathWithinAllowedRoots(resolvedPath, allowedRoots)) {
            return sendJson(res, 403, { error: `Caminho '${resolvedPath}' fora das raízes autorizadas.` });
          }
          if (!fs.existsSync(resolvedPath) || !fs.statSync(resolvedPath).isDirectory()) {
            return sendJson(res, 400, { error: `Diretório '${resolvedPath}' não existe no disco.` });
          }
          const label = body.label || path.basename(resolvedPath);
          db.addMonitoredPath(resolvedPath, label);
          const scanned = scanner.scanSingleProject(resolvedPath, label, true);
          return sendJson(res, 200, { success: true, project: scanned });
        } catch (e) {
          const status = e.statusCode || 500;
          return sendJson(res, status, { error: e.message });
        }
      }

      // 7. Disparar Varredura Manual
      if ((pathname === '/api/scan' || pathname === '/api/rescan') && method === 'POST') {
        try {
          const result = runScan(scanner);
          const kpis = db.getKpis();
          return sendJson(res, 200, { success: true, ...result, kpis, scanState });
        } catch (e) {
          return sendJson(res, 500, { error: e.message });
        }
      }

      // 7b. Status da varredura e servidor
      if (pathname === '/api/status' && method === 'GET') {
        return sendJson(res, 200, {
          ...scanState,
          autoScanIntervalMs: AUTO_SCAN_INTERVAL_MS
        });
      }

      // 7c. Snapshots históricos diários
      if (pathname === '/api/snapshots' && method === 'GET') {
        const limit = Math.min(90, Math.max(1, parseInt(parsedUrl.searchParams.get('limit') || '30', 10) || 30));
        return sendJson(res, 200, db.getSnapshots(limit));
      }

      // 8. Lista de Ações do Alexandre
      if (pathname === '/api/alexandre-actions' && method === 'GET') {
        const actions = db.getAllAlexandreActions();
        return sendJson(res, 200, actions);
      }

      // 9. Busca FTS5 no SQLite (Complementar)
      if (pathname === '/api/search' && method === 'GET') {
        const q = parsedUrl.searchParams.get('q') || '';
        const results = db.searchFts(q);
        return sendJson(res, 200, results);
      }

      // 10. Exportar Dossiê para Google NotebookLM
      if (pathname === '/api/export/notebooklm' && method === 'GET') {
        const doc = generateNotebookLmDoc(db);
        res.writeHead(200, {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Content-Disposition': 'attachment; filename="portfolio-briefing-notebooklm.md"',
          'Access-Control-Allow-Origin': '*'
        });
        return res.end(doc);
      }

      // Qualquer outra rota /api/* inexistente retorna 404 JSON (nunca index.html)
      if (pathname.startsWith('/api/')) {
        return sendJson(res, 404, { error: `Endpoint não encontrado: ${method} ${pathname}` });
      }

      // --- ARQUIVOS ESTÁTICOS (FRONTEND) ---
      let decodedPath;
      try {
        decodedPath = decodeURIComponent(pathname);
      } catch (e) {
        const err = new URIError('URI malformed');
        err.statusCode = 400;
        throw err;
      }

      // Rejeitar DOS devices e Alternate Data Streams (ADS) antes de tocar o filesystem
      const segments = decodedPath.split(/[\\\/]/);
      for (const seg of segments) {
        const trimmed = seg.trim();
        if (trimmed && (DOS_DEVICE_RE.test(trimmed) || trimmed.includes(':'))) {
          const err = new Error('Bad Request: invalid path segment');
          err.statusCode = 400;
          throw err;
        }
      }

      // Resolver o caminho com path.resolve e exigir PUBLIC_DIR + path.sep
      const safeRel = decodedPath.replace(/^[\\\/]+/, '');
      const targetPath = safeRel === '' ? path.join(PUBLIC_DIR, 'index.html') : path.resolve(PUBLIC_DIR, safeRel);
      const publicDirWithSep = PUBLIC_DIR.endsWith(path.sep) ? PUBLIC_DIR : PUBLIC_DIR + path.sep;

      if (!targetPath.startsWith(publicDirWithSep)) {
        const err = new Error('Forbidden');
        err.statusCode = 403;
        throw err;
      }

      return serveStaticFile(res, targetPath, true);

    } catch (err) {
      if (!res.headersSent) {
        const status = err.statusCode || (err instanceof URIError ? 400 : 500);
        sendJson(res, status, { error: err.message || 'Internal Server Error' });
      } else {
        res.end();
      }
    }
  });

  server.runScan = async () => {
    if (!resolvedDeps) resolvedDeps = await getDefaultDeps();
    return runScan(resolvedDeps.scanner);
  };
  server.getScanState = () => ({ ...scanState });

  return server;
}

// Iniciar se chamado diretamente
if (process.argv[1] && process.argv[1].endsWith('server.js')) {
  const server = createServer();
  server.listen(PORT, '0.0.0.0', () => {
    const lan = getLanAddresses(PORT);
    console.log(`=======================================================`);
    console.log(`  AppDevelopmentControl - Executive LAN Dashboard`);
    console.log(`  Local:   ${lan.localhostUrl}`);
    if (lan.networkUrls.length > 0) {
      lan.networkUrls.forEach(n => console.log(`  Rede:    ${n.url} (${n.interface})`));
    }
    console.log(`=======================================================`);

    // Auto-scan em background (inicializacao + intervalo periodico)
    setTimeout(() => {
      server.runScan().catch(e => console.error('Erro no auto-scan inicial:', e.message));
    }, 500);

    if (AUTO_SCAN_INTERVAL_MS > 0) {
      const timer = setInterval(() => {
        server.runScan().catch(e => console.error('Erro no auto-scan periodico:', e.message));
      }, AUTO_SCAN_INTERVAL_MS);
      timer.unref();
    }
  });
}
