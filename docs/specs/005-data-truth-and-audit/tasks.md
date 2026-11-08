# TASKS-005: Veracidade dos Dados do Portfólio, Auditoria Empírica e Resiliência Documental

- [x] **Tarefa 1: Correção dos Parâmetros de Consulta em `src/db.js`**
  - [x] Adicionar `(p.name)` e `(name)` em todas as consultas SQL parametrizadas em `getAllProjects()` e `getProjectByName(name)`.
  - [x] Verificar que `worktrees`, `specs`, `alexandre_actions` e `recent_commits` retornam preenchidos.

- [x] **Tarefa 2: Refinamento do Scanner de Ações e Decisões (`src/scanner.js`)**
  - [x] Ignorar menções históricas de aprovação (`APROVADA`, `autorizado pelo Alexandre`, etc.).
  - [x] Mapear arquivos alternativos de decisão (`docs/12-decisoes.md`, `docs/decisoes.md`, `docs/DECISIONS.md`).
  - [x] Mapear itens `[BLOQUEADO]` com dependência do Alexandre em `docs/qualidade/FILA.md` e `FILA.md`.

- [x] **Tarefa 3: Reconhecimento Resiliente de Specs e Metadados de Continuidade (`src/scanner.js`)**
  - [x] Reconhecer specs aprovadas no cabeçalho de `spec.md` (`Estado: **APROVADA**`).
  - [x] Extrair contexto e fase atual de `plano/STATUS.md` e `FILA.md` quando `AGENT_CONTEXT.md` não existir.

- [x] **Tarefa 4: Re-scan e Validação Real com o Projeto Vivere**
  - [x] Disparar re-scan completo dos projetos.
  - [x] Verificar os dados persistidos para `Vivere` (worktrees, specs, pendências reais, comandos).

- [x] **Tarefa 5: Suíte de Testes Automatizados e Cobertura de Aceite (`test/test_all.mjs`)**
  - [x] Adicionar bateria de testes para o caso Vivere e binds do SQLite.
  - [x] Garantir 100% dos testes passando (`npm test`).
