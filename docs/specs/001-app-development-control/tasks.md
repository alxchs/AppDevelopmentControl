# 001 — AppDevelopmentControl (Local LAN Projects Dashboard) — TASKS

Status: CONCLUÍDA (Alexandre / Agente, 2026-10-26).
Sequência ordenada de implementação com critérios claros de verificação.

---

## Fase 1 — Estrutura Base e Banco de Dados SQLite
- [x] **Task 1.1**: Inicializar o projeto `AppDevelopmentControl` (`package.json`, `.gitignore`).
- [x] **Task 1.2**: Implementar o módulo do banco SQLite local (`src/db.js`) utilizando `node:sqlite` nativo do Node.js v24, criando tabelas de projetos, métricas, specs, ações do Alexandre, caminhos monitorados e índice FTS5.
- [x] **Task 1.3**: Criar o utilitário de rede LAN (`src/lan.js`) para capturar IPs de rede local e formatar URLs de acesso.

---

## Fase 2 — Scanner Inteligente e Inclusão de Novos Projetos
- [x] **Task 2.1**: Implementar o scanner de projetos (`src/scanner.js`):
  - Detecção automática de todas as subpastas de `c:\desenv\utils`;
  - Suporte a caminhos monitorados customizados (inclusão de novos projetos sob demanda);
  - Extração de propósito hierárquica (README, manifestos `package.json`/`pubspec`/`csproj`/`dpr`, specs de SDD);
  - Coleta de métricas Git (data do primeiro commit local, commits 24h/7d/30d/total, maior intervalo contínuo em dias sem alteração, data remota GitHub);
  - Varredura e contabilização de specs (`docs/specs/*/tasks.md` - total, desenvolvidas, pendentes);
  - Detecção e consolidação de itens sob ação/decisão do Alexandre (`PENDING DECISION`, bloqueios, decisões abertas).
- [x] **Task 2.2**: Implementar o endpoint e lógica de inclusão/registro imediato de novos projetos (`POST /api/projects/register` e detecção periódica).

---

## Fase 3 — API REST e Busca Autocontida (Zero Tokens)
- [x] **Task 3.1**: Implementar o servidor HTTP em `src/server.js` escutando em `0.0.0.0:3333`.
- [x] **Task 3.2**: Criar endpoints REST:
  - `GET /api/lan-info` (IPs e status da rede);
  - `GET /api/projects` (lista com filtros e métricas completas);
  - `GET /api/kpis` (resumo executivo consolidado);
  - `POST /api/scan` (disparo de varredura manual/sob demanda);
  - `POST /api/projects/register` (inclusão dinâmica de nova pasta/projeto);
  - `PUT /api/projects/:id/purpose` (ajuste e persistência de propósito);
  - `GET /api/search` (busca complementar com SQLite FTS5);
  - `GET /api/export/notebooklm` (geração de dossiê para Google NotebookLM).

---

## Fase 4 — Interface Executiva e Experiência do Usuário
- [x] **Task 4.1**: Desenvolver a interface visual executiva em `public/index.html` e `public/app.js`:
  - Banner informativo com o IP e link direto para acesso na rede local;
  - Cards de KPI executivos (Total de Projetos, Commits Recentes, Specs Concluídas vs Pendentes, Ações do Alexandre);
  - Card de Destaque Executivo: "Ações e Decisões Pendentes do Alexandre";
  - Barra de busca inteligente em tempo real com MiniSearch embutido (fuzzy search, sem consumo de tokens);
  - Filtros rápidos por tipo (Todos, Principais, Worktrees, Pendências Alexandre, Com Specs);
  - Gráficos executivos (Evolução temporal de commits e maturidade das specs);
  - Grid e Tabela com cartões executivos dos projetos (propósito, métricas de tempo, inatividade máxima, specs);
  - Modal de Inclusão de Novo Projeto / Pasta;
  - Modal de Detalhes do Projeto com visualização das specs e tarefas;
  - Botão de exportação para Google NotebookLM com download do arquivo de briefing.
- [x] **Task 4.2**: Aplicar rigorosamente a paleta de cores executiva (Slate/Navy/Emerald/Amber) com **TOTAL PROIBIÇÃO DE VERMELHO**.

---

## Fase 5 — Verificação Completa e Comprovação de Aceite
- [x] **Task 5.1**: Executar varredura completa de todas as subpastas de `c:\desenv\utils` e validar integridade do SQLite.
- [x] **Task 5.2**: Testar inclusão dinâmica de um novo projeto e certificar que é indexado sem reiniciar o servidor.
- [x] **Task 5.3**: Validar testes de busca inteligente, cálculo de inatividade e exportação para NotebookLM.
- [x] **Task 5.4**: Iniciar o serviço na LAN e comprovar funcionamento executivo.

