# TASKS — SPEC-0010: Clareza Real, Limpeza e Profissionalização LAN

- [x] **T1**: Registrar `SPEC-0010` em `docs/production/production-control.json`, `production-events.jsonl` e regenerar `docs/specs/SPECS.md`; remover resíduos (`test/temp-close-*.db`, `debug.log`). (AC-12)
- [x] **T2**: Limpar e evoluir `src/db.js`: migração por `PRAGMA user_version`, tabela `portfolio_snapshots`, campos `worktree_dirty_count` e `divergence_alerts_json`, e correção de `buildStepper`. (AC-4, AC-5, AC-6, AC-8, AC-12)
- [x] **T3**: Limpar e evoluir `src/scanner.js` e `src/evaluator.js`: remover `parseSpecsIndex`, corrigir falso `done` em `spec.md`, consolidar chamadas `git`, agregar dirty/commits de worktrees, detectar divergências docs vs Git, e integrar sinais `production_v2` no farol de saúde. (AC-2, AC-3, AC-5, AC-6, AC-12)
- [x] **T4**: Blindar e evoluir `src/server.js`: `404` JSON para `/api/*`, validação de raiz em `/api/projects/register`, rotas `/api/snapshots` e `/api/status`, auto-scan em background. (AC-1, AC-8, AC-9, AC-11)
- [x] **T5**: Profissionalizar frontend offline e modular em `public/`: assets locais sem CDN, CSS local completo, modularização de `app.js` em `public/js/*`, correção `/api/scan`, toasts sem `alert()`, event delegation, triagem executiva e gráfico de evolução. (AC-1, AC-3, AC-7, AC-10, AC-11, AC-12)
- [x] **T6**: Desacoplar `test/test_all.mjs` de dados locais da máquina, adicionar testes dos ACs da SPEC-0010 e validar `npm test` 100% verde; atualizar `docs/production/` e `SPECS.md`. (AC-1..AC-12)
