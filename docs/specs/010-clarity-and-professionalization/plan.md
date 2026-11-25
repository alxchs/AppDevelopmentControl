# PLAN — SPEC-0010: Clareza Real, Limpeza e Profissionalização LAN

## 1. Arquitetura das Mudanças

1. **Backend (`src/db.js`, `src/scanner.js`, `src/evaluator.js`, `src/server.js`)**:
   - `src/db.js`:
     - Migrar controle de schema para `PRAGMA user_version` (remover loop cego de 28 `ALTER TABLE`).
     - Adicionar tabela `portfolio_snapshots` (`date TEXT PRIMARY KEY, total_projects, active_projects, total_points, done_points, wip_specs, alexandre_actions, dirty_projects, created_at`) + `saveDailySnapshot(kpis, projects)` e `getSnapshots(limit)`.
     - Corrigir `buildStepper(specs)` para não prefixar `F` em `SPEC-*` e priorizar specs ativas/bloqueadas/recentes (até 6 itens).
     - Expor `worktree_dirty_count` e `divergence_alerts_json` em `projects` (via migração versionada `user_version = 2`).
   - `src/scanner.js`:
     - Remover método morto `parseSpecsIndex` (linhas 856–938).
     - Corrigir `consolidateSpecsAndActions`: `isApprovedInHeader` não marca mais `status = 'done'` (marca `'planned'`/`'pending'`).
     - Consolidar `extractGitMetrics` + `extractRecentCommits` para reduzir spawns de `git`.
     - Agregar status dirty (`status --porcelain`) e branch/commits das worktrees vinculadas.
     - Adicionar `detectDivergences(projectPath, agentContext, production, treeStatus, recentCommits)` para sinalizar defasagem entre docs/controle e Git.
   - `src/evaluator.js`:
     - Enriquecer `computeHealthStatus(p)` com sinais de `production_v2` (controle rejeitado, pontos bloqueados, trabalho em validação) e worktrees sujas.
   - `src/server.js`:
     - Garantir `404` JSON para qualquer `/api/*` não mapeada (antes do static handler).
     - Validar `POST /api/projects/register` contra `ALLOWED_ROOTS` (padrão `c:\desenv`, configurável via `ADC_ALLOWED_ROOTS`).
     - Adicionar `GET /api/snapshots` e `GET /api/status` (último scan, duração, auto-scan).
     - Adicionar scheduler leve de auto-scan em background (`startAutoScan`) com lock para não rodar dois scans simultâneos.

2. **Frontend Offline & Modular (`public/`)**:
   - `public/vendor/`: baixar/empacotar localmente `chart.umd.min.js` e `lucide.min.js` (ou SVG sprite/helper leve se necessário), e substituir `cdn.tailwindcss.com` por CSS compilado/estático local (`public/styles.css`) mantendo exatamente o mesmo visual dark Slate/Indigo/Emerald/Amber/Cyan sem CDN externa.
   - `public/js/`: dividir `public/app.js` (1.613 linhas) em módulos ES nativos (`api.js`, `ui-helpers.js`, `toast.js`, `spotlight.js`, `views.js`, `modal.js`, `main.js`).
   - Corrigir `/api/rescan` → `/api/scan`, remover `alert()`/`prompt()`, usar event delegation (`data-project`), adicionar ordenação "Prioridade Executiva" e gráfico/indicador de evolução via `/api/snapshots`.

3. **Testes e Limpeza (`test/`)**:
   - Remover `test/temp-close-1795281550577.db` e `debug.log`.
   - Atualizar `test/test_all.mjs` para usar diretório temporário em `%TEMP%` com projetos fixture criados por código (sem depender de `KillTask`/`Vivere` reais) e cobrir os novos ACs da SPEC-0010.
   - Manter `test/test_production_v2.mjs` e `test/test_security_resilience.mjs` 100% verdes.
