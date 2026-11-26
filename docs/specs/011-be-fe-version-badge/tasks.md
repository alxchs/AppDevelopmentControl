# TASKS — SPEC-0011: Versão BE/FE + Trava de Publicação

- [x] **T1**: Registrar `SPEC-0011` em `docs/production/` e `SPECS.md`.
- [x] **T2**: Criar `public/js/version.js` (`1.1.0`), atualizar `package.json` (`1.1.0`) e expor `backendVersion` em `src/server.js` (`GET /api/status`). (AC-1, AC-2)
- [x] **T3**: Exibir hora da atualização + `BE v... · FE v...` no cabeçalho em `public/index.html` e `public/app.js` (com alerta âmbar se divergirem). (AC-3)
- [x] **T4**: Criar `tools/check-version-bump.mjs`, `tools/publish.ps1` e atualizar `AGENTS.md` com a trava obrigatória e comando `Publicar`. (AC-4, AC-5)
- [x] **T5**: Adicionar `test/test_version_spec11.mjs` ao `npm test`, validar tudo verde, atualizar docs e comitar na branch. (AC-1..AC-5)
