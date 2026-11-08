# TASKS-003: Deep Executive Intelligence & Technical Portfolio Depth

- [x] **Tarefa 1: Atualização do Banco de Dados SQLite (`src/db.js`)**
  - [x] Adicionar colunas `stack`, `current_phase`, `next_action`, `last_decision`, `worktree_clean`, `uncommitted_count`, `doc_health` na tabela `projects`.
  - [x] Criar tabela `project_recent_commits` com suporte a hash, data, autor, agente e mensagem.
  - [x] Expandir schema de `project_specs` para guardar `title`, `total_tasks`, `done_tasks` e `pending_tasks_json`.
  - [x] Implementar método `purgeNonExistentProjects(existingNames)` para sanear projetos deletados/renomeados.

- [x] **Tarefa 2: Extensões do Scanner (`src/scanner.js`)**
  - [x] Implementar detector de stack tecnológica (`detectStack`).
  - [x] Implementar parser de continuidade e metadados de `AGENT_CONTEXT.md` e `AGENTS.md`.
  - [x] Implementar extrator dos 5 últimos commits com identificação de agente (`AGY`, `Claude`, `Alexandre`).
  - [x] Implementar checagem de status de árvore de trabalho (`checkWorkingTreeStatus`).
  - [x] Implementar extrator detalhado de specs e tarefas em `docs/specs/`.
  - [x] Saneamento de integridade e consolidação de worktrees (`KyraFiles`, `Vivere`, etc.).

- [x] **Tarefa 3: Endpoints da API (`src/server.js`)**
  - [x] Expor novos campos em `GET /api/projects`.
  - [x] Garantir que o payload de cada projeto inclua commits recentes, specs detalhadas e metadados de continuidade.

- [x] **Tarefa 4: Interface do Usuário - Toggle Cards/Tabela e Cards Enriquecidos (`public/index.html` & `public/app.js`)**
  - [x] Criar switcher visual entre Cards e Tabela de Portfólio.
  - [x] Enriquecer os cards com badge de Stack, Fase Atual, Próxima Ação, indicador de árvore suja e último agente.
  - [x] Construir a Tabela Densa de Portfólio com alta densidade de informação e filtros.

- [x] **Tarefa 5: Interface do Usuário - Modal de Projeto em 4 Abas (`public/index.html` & `public/app.js`)**
  - [x] Reestruturar o modal com 4 abas navegáveis (Ficha Técnica & Arquitetura, Git & Histórico, Roadmap SDD, Pendências do Alexandre).
  - [x] Renderizar timeline de commits, lista de tarefas pendentes e governança documental.

- [x] **Tarefa 6: Testes Automatizados e Validação E2E (`test/test_all.mjs`)**
  - [x] Criar testes unitários e de integração para detecção de stack, parser de agent_context, commits recentes e saneamento do banco.
  - [x] Validar execução completa de `node test/test_all.mjs` com 100% de aprovação (8/8 suítes verdes).
