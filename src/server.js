import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { AppDb } from './db.js';
import { ProjectScanner } from './scanner.js';
import { getLanAddresses } from './lan.js';
import { generateNotebookLmDoc } from './notebooklm.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const PORT = parseInt(process.env.PORT || '3333', 10);

// Banco e scanner padrao so nascem quando preciso (importar este modulo nao abre o banco real); testes injetam os seus.
let defaultDeps = null;
function getDefaultDeps() {
  if (!defaultDeps) {
    const d = new AppDb();
    defaultDeps = { db: d, scanner: new ProjectScanner(d) };
  }
  return defaultDeps;
}

// Helper para ler body JSON
function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
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

// Servidor HTTP
export function createServer(deps = {}) {
  const { db, scanner } = deps.db ? { db: deps.db, scanner: deps.scanner || new ProjectScanner(deps.db) } : getDefaultDeps();
  const server = http.createServer(async (req, res) => {
    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
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
      const name = decodeURIComponent(projectDetailMatch[1]);
      const project = db.getProjectByName(name);
      if (!project) return sendJson(res, 404, { error: 'Projeto não encontrado' });
      return sendJson(res, 200, project);
    }

    // 4b. Producao v2 de um projeto (SPEC-0007 FR-017): origem, importacao, SPECs, problemas e indicadores
    const productionMatch = pathname.match(/^\/api\/projects\/([^/]+)\/production$/);
    if (productionMatch && method === 'GET') {
      const name = decodeURIComponent(productionMatch[1]);
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
      try {
        const name = decodeURIComponent(purposeMatch[1]);
        const body = await parseJsonBody(req);
        if (!body.purpose || typeof body.purpose !== 'string') {
          return sendJson(res, 400, { error: 'Campo purpose é obrigatório' });
        }
        db.updatePurposeOverride(name, body.purpose.trim());
        return sendJson(res, 200, { success: true, name, purpose: body.purpose.trim() });
      } catch (e) {
        return sendJson(res, 400, { error: e.message });
      }
    }

    // 6. Registrar novo projeto / pasta customizada
    if (pathname === '/api/projects/register' && method === 'POST') {
      try {
        const body = await parseJsonBody(req);
        if (!body.path) {
          return sendJson(res, 400, { error: 'Campo path é obrigatório' });
        }
        const resolvedPath = path.resolve(body.path);
        if (!fs.existsSync(resolvedPath)) {
          return sendJson(res, 400, { error: `Caminho '${resolvedPath}' não existe no disco.` });
        }
        const label = body.label || path.basename(resolvedPath);
        db.addMonitoredPath(resolvedPath, label);
        const scanned = scanner.scanSingleProject(resolvedPath, label, true);
        return sendJson(res, 200, { success: true, project: scanned });
      } catch (e) {
        return sendJson(res, 500, { error: e.message });
      }
    }

    // 7. Disparar Varredura Manual
    if (pathname === '/api/scan' && method === 'POST') {
      try {
        const startTime = Date.now();
        const scanned = scanner.scanAll();
        const duration = Date.now() - startTime;
        const kpis = db.getKpis();
        return sendJson(res, 200, { success: true, count: scanned.length, durationMs: duration, kpis });
      } catch (e) {
        return sendJson(res, 500, { error: e.message });
      }
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

    // --- ARQUIVOS ESTÁTICOS (FRONTEND) ---
    let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
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
      return fs.createReadStream(filePath).pipe(res);
    }

    // Fallback para index.html (SPA)
    const indexPath = path.join(PUBLIC_DIR, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return fs.createReadStream(indexPath).pipe(res);
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  });

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
  });
}

