# PLAN-003: Deep Executive Intelligence & Technical Portfolio Depth

## 1. Arquitetura e Engenharia da Solução

### 1.1 Camada de Dados (`src/db.js`)
- Criar migrations/tabelas e colunas adicionais em `app_development_control.db`:
  - Colunas na tabela `projects`:
    - `stack`: string (ex: 'C# / WinUI 3', 'Delphi VCL', 'Flutter', 'Node.js')
    - `current_phase`: string (ex: 'F052 (Visão de repositório Git)')
    - `next_action`: string
    - `last_decision`: string
    - `worktree_clean`: integer (1 se limpa, 0 se modificada)
    - `uncommitted_count`: integer (quantidade de arquivos pendentes de commit)
    - `doc_health`: string (JSON com checklist de presença de `AGENTS.md`, `AGENT_CONTEXT.md`, etc.)
  - Tabela `project_recent_commits`:
    - `id` INTEGER PRIMARY KEY AUTOINCREMENT
    - `project_name` TEXT
    - `hash` TEXT
    - `short_hash` TEXT
    - `author_name` TEXT
    - `agent` TEXT ('AGY' | 'Claude' | 'Alexandre' | 'Outro')
    - `date_iso` TEXT
    - `date_relative` TEXT
    - `message` TEXT
  - Expansão na tabela `project_specs`:
    - Adicionar `spec_id`, `title`, `total_tasks`, `done_tasks`, `pending_tasks_json`.
  - Método `purgeNonExistentProjects(existingNames)` para expurgar dados de projetos deletados ou renomeados.

### 1.2 Camada de Scanner e Avaliação (`src/scanner.js` & `src/evaluator.js`)
- `detectStack(projectPath)`:
  - Analisa árvores de diretórios, manifestos e extensões para categorizar com precisão (.dpr/.dfm, .csproj/.xaml, pubspec.yaml, package.json, pyproject.toml, etc.).
- `extractAgentContext(projectPath)`:
  - Parse de `AGENT_CONTEXT.md` extraindo blocos estruturados de `PROJECT`, `OBJECTIVE`, `CURRENT PHASE`, `NEXT ACTION`, `LAST DECISION`.
- `extractRecentCommits(projectPath, limit = 5)`:
  - Executa `git log -n 5 --format="%H|%h|%an|%ae|%aI|%ar|%s"` com isolamento seguro.
  - Identifica se o autor ou mensagem foi feito por `AGY` (Antigravity), `Claude` ou `Alexandre`.
- `checkWorkingTreeStatus(projectPath)`:
  - Executa `git status --porcelain` para verificar arquivos staged, unstaged ou untracked.
- `extractSpecsDetailed(specsDir)`:
  - Lê cada pasta em `docs/specs/*`, parseia `spec.md` (título) e `tasks.md` (tarefas `[x]` vs `[ ]`, capturando os títulos das tarefas pendentes).
- `sanitizePortfolio()`:
  - Verifica `fs.existsSync(p.path)` antes de processar e limpa registros obsoletos do banco.

### 1.3 Camada de API e Servidor (`src/server.js`)
- Expor os dados enriquecidos nos endpoints:
  - `GET /api/projects`: retorna todos os campos adicionais (stack, fase, commits recentes, status da árvore, specs detalhadas).
  - `GET /api/projects/:name/commits`: histórico recente detalhado.
  - `GET /api/projects/:name/specs`: especificações detalhadas com tarefas.

### 1.4 Interface do Usuário (`public/index.html` & `public/app.js`)
- **Seletor de Modo de Exibição (View Switcher)**:
  - Botões para alternar entre "Cards Executivos" e "Tabela de Portfólio (Data Table)".
- **Cards Enriquecidos**:
  - Badge colorido de Stack tecnológica.
  - Avatar do último agente com identificação visual.
  - Alerta sutil se a árvore de trabalho tiver arquivos não comitados.
  - Exibição de `CURRENT PHASE` e `NEXT ACTION` direto no card.
- **Tabela Densa de Portfólio**:
  - Tabela com colunas: Projeto, Stack, Fase Atual, Último Agente, Commits (30d/7d/24h), Specs, Árvore de Trabalho, Saúde, Ações.
- **Modal de Projeto Reestruturado em 4 Abas**:
  - **Aba 1 (Ficha Técnica & Arquitetura)**: Stack, Propósito, Governança Documental, Comandos.
  - **Aba 2 (Git & Atividade Recente)**: Timeline dos últimos 5 commits com agente, branches e worktrees vinculadas.
  - **Aba 3 (Roadmap SDD)**: Lista de especificações com progresso e tarefas pendentes.
  - **Aba 4 (Pendências do Alexandre)**: Itens bloqueantes ou aguardando deliberação.

---

## 2. Riscos e Mitigações
- **Performance de Varredura**: Extrair 5 commits e status de árvore via git de 25+ projetos pode levar alguns segundos.
  - *Mitigação*: Manter timeout e `GIT_CONFIG_GLOBAL=NUL` nas chamadas; usar `child_process.execSync` otimizado; persistir em SQLite para visualização instantânea.
- **Respeito ao Design System**:
  - Proibição estrita de vermelho em qualquer ícone, gráfico, badge ou alerta. Usar paleta Slate, Navy, Emerald, Amber, Indigo, Cyan.

