# TASKS-004: Project Spotlight, Quick Selector & Situational Clarity

- [x] **Tarefa 1: Evolução do Schema SQLite e Modelo (`src/db.js`)**
  - [x] Adicionar colunas `pipeline_stage` e `commands` na tabela `projects`.
  - [x] Atualizar migrações incrementais e método `upsertProject`.
  - [x] Garantir recuperação de `commands` e `stepper` em `getAllProjects` e `getProjectByName`.

- [x] **Tarefa 2: Extensões do Scanner (`src/scanner.js`)**
  - [x] Implementar categorizador de estágio de pipeline (`computePipelineStage`).
  - [x] Implementar extrator de comandos do projeto a partir de `AGENTS.md` e scripts raiz (`extractCommands`).
  - [x] Construir o stepper ordenado de fases/marcos a partir das especificações de `docs/specs/` (`buildStepper`).

- [x] **Tarefa 3: Interface do Usuário - Seletor Rápido e Painel Spotlight Hero (`public/index.html` & `public/app.js`)**
  - [x] Adicionar a barra de seleção no topo (`#project-spotlight-bar`) com dropdown estilizado e botões Anterior/Próximo.
  - [x] Construir o painel `#project-spotlight-panel` com as 3 colunas executivas ("Onde Parou", "Onde Está Agora + Stepper", "O Que Vem a Seguir + Bloqueios").
  - [x] Implementar alternância dinâmica ao selecionar no dropdown ou clicar em qualquer card/linha da tabela ("Focar").
  - [x] Persistência da seleção de foco no `localStorage` sob a chave `spotlight_selected_project`.

- [x] **Tarefa 4: Interface do Usuário - Modo Pipeline de Estágios / Funil (`public/index.html` & `public/app.js`)**
  - [x] Adicionar o botão "Pipeline" no View Switcher (Cards / Tabela Densa / Pipeline).
  - [x] Implementar a renderização do quadro de 5 colunas por estágio de maturidade com contadores.

- [x] **Tarefa 5: Bateria de Testes Automatizados (`test/test_all.mjs`)**
  - [x] Criar testes para o cálculo de `pipeline_stage`, extração de comandos e geração do stepper.
  - [x] Validar execução completa de todos os testes com 100% de sucesso.
