# SPEC-0009: Prevenção de Memory Leaks, Resiliência do Servidor HTTP e Proteção contra Violação de Acesso — PLAN

Status: APROVADO (Alexandre, 2026-11-18)
Referência: `docs/specs/009-resiliencia-vazamentos-seguranca/spec.md`

---

## 1. Arquitetura e Decisões Técnicas

### 1.1 Cache de Prepared Statements em `src/db.js`
- Adicionar no construtor de `AppDb`:
  ```javascript
  this.stmtCache = new Map();
  ```
- Implementar método auxiliar:
  ```javascript
  prepareCached(sql) {
    let stmt = this.stmtCache.get(sql);
    if (!stmt) {
      stmt = this.db.prepare(sql);
      this.stmtCache.set(sql, stmt);
    }
    return stmt;
  }
  ```
- Substituir chamadas repetitivas de `this.db.prepare(sql)` por `this.prepareCached(sql)` em `getAllProjects()`, `getProjectByName()`, `getProductionSummary()`, `getKpis()`, `saveRecentCommits()`, `saveWorktrees()`, `saveSpecs()`, etc.
- Adicionar método `close()`:
  ```javascript
  close() {
    this.stmtCache.clear();
    if (this.db) {
      try { this.db.close(); } catch (e) {}
      this.db = null;
    }
  }
  ```

### 1.2 Sanitização e Proteção no Servidor HTTP (`src/server.js`)
- **DOS Device Names Regex**:
  ```javascript
  const DOS_DEVICE_RE = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i;
  ```
- **Validação de Path Traversal**:
  ```javascript
  const safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  const resolvedPath = path.resolve(PUBLIC_DIR, '.' + safePath);
  if (!resolvedPath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    return res.end('Forbidden');
  }
  ```
- **Stream Error Handling**:
  ```javascript
  const stream = fs.createReadStream(resolvedPath);
  stream.on('error', (err) => {
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
    }
    res.end('File read error');
  });
  stream.pipe(res);
  ```
- **Payload Limit em `parseJsonBody`**:
  ```javascript
  const MAX_PAYLOAD_BYTES = 1024 * 1024; // 1 MB
  let bytesReceived = 0;
  req.on('data', chunk => {
    bytesReceived += chunk.length;
    if (bytesReceived > MAX_PAYLOAD_BYTES) {
      req.destroy(new Error('Payload Too Large'));
      reject(new Error('Payload Too Large'));
      return;
    }
    body += chunk;
  });
  ```
- **Try/Catch Global na Rota HTTP**:
  Envolver o callback assíncrono de `http.createServer` com bloco `try/catch` para garantir captura e resposta HTTP 500 sem gerar Unhandled Rejections.

### 1.3 Resiliência do Scanner (`src/scanner.js`)
- **Execução com `spawnSync`**:
  Criar helper seguro:
  ```javascript
  safeGit(args, cwd) {
    try {
      const res = spawnSync('git', args, {
        cwd,
        encoding: 'utf8',
        env: GIT_ENV,
        maxBuffer: 10 * 1024 * 1024,
        stdio: ['ignore', 'pipe', 'ignore']
      });
      return res.status === 0 ? (res.stdout || '').trim() : '';
    } catch (e) {
      return '';
    }
  }
  ```
- **Implementar `scanSingleProject`**:
  ```javascript
  scanSingleProject(projectPath, label, isCustom = false) {
    const name = label || path.basename(projectPath);
    return this.scanCanonicalProject({
      name,
      path: projectPath,
      worktrees: [],
      isCustom
    });
  }
  ```

---

## 2. Testes de Aceite e Validação
Criar `test/test_security_resilience.mjs` cobrindo:
1. Tentativas de Path Traversal bloqueadas (403/404).
2. Tentativas de acesso a dispositivos DOS bloqueadas (400/403/404).
3. Payload JSON acima de 1 MB rejeitado.
4. `AppDb.close()` libera conexão e limpa cache.
5. Reutilização de prepared statements via `stmtCache`.
6. Chamada a `scanSingleProject` executa e persiste sem erros.
