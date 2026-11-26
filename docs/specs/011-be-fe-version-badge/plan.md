# PLAN — SPEC-0011: Versão BE/FE + Trava de Publicação

1. **`package.json` & `public/js/version.js`**:
   - Incrementar `package.json` de `1.0.0` para `1.1.0` (houve mudança em `src/`).
   - Criar `public/js/version.js` com `export const FRONTEND_VERSION = '1.1.0';`.
2. **`src/server.js`**:
   - Ler `version` de `package.json` na inicialização e expor `backendVersion` em `GET /api/status`.
3. **`public/index.html` & `public/app.js`**:
   - Importar `FRONTEND_VERSION` em `public/app.js`.
   - Atualizar `renderScanStatus(status)` para exibir a hora exata da última atualização (`HH:MM:SS`) junto de `BE vX.Y.Z · FE vX.Y.Z` (e destacar em âmbar caso `BE !== FE`).
4. **`tools/check-version-bump.mjs` & `tools/publish.ps1` & `AGENTS.md`**:
   - Script `check-version-bump.mjs` valida que mudanças em `src/` alteraram `package.json.version` e mudanças em `public/` alteraram `public/js/version.js`, e que não há mudanças não commitadas ao publicar.
   - `tools/publish.ps1` roda `node tools/check-version-bump.mjs --require-clean` e reinicia `start-silent.ps1 -Restart`.
   - `AGENTS.md` ganha tabela `Comandos` com `Publicar` e a regra dura de versionamento/commit.
5. **Testes**:
   - Adicionar validações de `backendVersion` em `/api/status`, `FRONTEND_VERSION`, formato do badge e `check-version-bump.mjs` em `test/test_clarity_spec10.mjs` (ou `test/test_version_spec11.mjs` incluído no `npm test`).
