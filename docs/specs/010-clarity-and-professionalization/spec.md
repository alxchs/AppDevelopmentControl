# SPEC-0010 — Clareza Real do Portfólio, Limpeza e Profissionalização LAN

- **ID:** SPEC-0010
- **Peso (Fibonacci):** 8
- **Estado:** **APROVADA** (solicitada pelo Alexandre em 2026-11-25)
- **Responsável:** AGY

## 1. Objetivo e Problema

Elevar a confiabilidade, clareza gerencial e acabamento profissional da dashboard **AppDevelopmentControl**, garantindo que o estado exibido reflita o andamento real dos projetos (sem falsos "concluídos", sem cegueira para worktrees e sem falhas silenciosas de sincronização), removendo código morto e dependências externas de CDN para operação 100% offline na LAN.

## 2. Requisitos Funcionais (FR) e Critérios de Aceite (AC)

- **FR-001 (Sincronização real e blindagem de rotas `/api/*`)**:
  - **AC-1**: O botão "Sincronizar" na UI chama `POST /api/scan` (não `/api/rescan`). Rotas `/api/*` inexistentes retornam `404` JSON em vez de `index.html`.
- **FR-002 (Verdade do progresso de Specs)**:
  - **AC-2**: `spec.md` com `Estado: APROVADA` sem `tasks.md` não é mais classificada como `done`; só `completed` (v2), tarefas 100% marcadas `[x]`, ou categoria `finalizada` em `SPECS.md` contam como concluídas.
  - **AC-3**: O `evaluator.js` e a UI usam os indicadores de `production_v2` (pontos entregues, bloqueados, em validação, rejeitados) quando aceitos, distinguindo *Planejada*, *Em Execução*, *Em Validação* e *Entregue*.
  - **AC-4**: O Stepper exibe todos os marcos relevantes (sem mangling `FSPEC-` e sem esconder specs em andamento/bloqueadas).
- **FR-003 (Visibilidade de Worktrees e Divergências)**:
  - **AC-5**: Alterações não commitadas e commits recentes em worktrees vinculadas são agregados e sinalizados no projeto canônico.
  - **AC-6**: Divergências entre documentação (`STATUS.md`/`AGENT_CONTEXT.md`/`SPECS.md`) e estado real (`git`/`production-control.json`) são detectadas e exibidas como alertas objetivos.
- **FR-004 (Triagem Executiva, Snapshots e Auto-Scan)**:
  - **AC-7**: Nova ordenação/triagem "Prioridade Executiva" e métricas de entregas reais/bloqueios em vez de apenas volume de commits.
  - **AC-8**: Tabela `portfolio_snapshots` grava snapshot diário ao final do scan; endpoint `GET /api/snapshots` expõe a série histórica para a UI.
  - **AC-9**: Auto-scan em background configurável (com indicador de idade da última varredura na UI) sem bloquear requisições HTTP.
- **FR-005 (Operação 100% Offline na LAN e Segurança)**:
  - **AC-10**: Remoção de CDNs externas (`cdn.tailwindcss.com`, `unpkg.com`, `cdn.jsdelivr.net`), usando assets locais em `public/vendor/` e CSS próprio/compilado.
  - **AC-11**: Validação de raiz permitida em `POST /api/projects/register` (evitando registro de pastas fora do escopo autorizado via LAN), substituição de `alert()`/`prompt()` por toasts e event delegation no lugar de `onclick` inline.
- **FR-006 (Limpeza e Higiene de Código/Testes)**:
  - **AC-12**: Remoção de código morto (`parseSpecsIndex`, `.spin` não usado, 28 `ALTER TABLE` cegos substituídos por `PRAGMA user_version`, arquivos residuais `temp-close-*.db` e `debug.log`), consolidação de chamadas `git` no scanner, modularização de `public/app.js` em ES modules, e `test_all.mjs` independente de projetos reais da máquina.

## 3. Restrições
- **Zero vermelho** (METODO §28): paleta Slate, Indigo, Emerald, Amber, Cyan.
- **Zero dependências npm externas** no `package.json` (manter `node:sqlite` nativo).
- **Zero roubo de foco** (METODO §21).
