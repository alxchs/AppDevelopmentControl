# SPEC-0011 — Versão de Backend e Frontend no Cabeçalho + Trava de Publicação

- **ID:** SPEC-0011
- **Peso (Fibonacci):** 3
- **Estado:** **APROVADA** (solicitada pelo Alexandre em 2026-11-26)
- **Responsável:** AGY

## 1. Objetivo

Exibir no cabeçalho da dashboard, junto ao horário da última atualização, a versão do **Backend** (`BE vX.Y.Z`) e do **Frontend** (`FE vX.Y.Z`), garantindo rastreabilidade imediata e impedindo qualquer publicação sem incremento de versão quando houver alterações e sem commit prévio.

## 2. Requisitos Funcionais e Critérios de Aceite

- **FR-001 (Versão explícita BE/FE)**:
  - **AC-1**: `package.json` define `version` do Backend; `public/js/version.js` define `FRONTEND_VERSION`.
  - **AC-2**: `GET /api/status` retorna `backendVersion` (lido de `package.json`).
  - **AC-3**: O cabeçalho da UI exibe, junto com a hora da atualização (ex.: `Atualizado às HH:MM`), `BE vX.Y.Z · FE vX.Y.Z`. Se `BE !== FE`, destaca em âmbar para sinalizar cache desatualizado no navegador.
- **FR-002 (Regra dura de versão e commit antes de publicar)**:
  - **AC-4**: Script `tools/check-version-bump.mjs` verifica se alterações em `src/` incrementaram `package.json` (`version`) e se alterações em `public/` incrementaram `public/js/version.js` em relação à `main` (ou `HEAD~1`), além de exigir árvore limpa para publicação.
  - **AC-5**: `AGENTS.md` documenta a regra obrigatória e define o comando `Publicar` executando a trava de versão + reinício do servidor (`pwsh -NoProfile -File tools/publish.ps1`).
