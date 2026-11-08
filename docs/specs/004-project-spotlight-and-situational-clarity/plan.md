# PLAN-004: Project Spotlight, Quick Selector & Situational Clarity

## 1. Arquitetura e Engenharia da Solução

### 1.1 Camada de Dados e Scanner (`src/scanner.js` & `src/db.js`)
- **Novas propriedades por projeto**:
  - `pipeline_stage`: ('planning' | 'active' | 'validation' | 'stable' | 'idle') calculado por regras objetivas:
    - Se `alexandre_pending_count > 0` -> 'validation' (Aguardando deliberação/validação);
    - Senão se `changes_7d > 0` ou `current_phase` contém 'WIP'/'Execução'/'Andamento' -> 'active';
    - Senão se `done_specs > 0` e `pending_specs === 0` e `last_tag` -> 'stable';
    - Senão se `total_specs > 0` e `done_specs === 0` -> 'planning';
    - Senão -> 'idle'.
  - `commands`: JSON com comandos de compilação, teste e execução extraídos de `AGENTS.md` (ou scripts da raiz).
  - `stepper`: Array ordenado com as últimas 4 especificações de `docs/specs/`:
    `[{ spec_id, title, status, pct, total_tasks, done_tasks, pending_tasks }]`.
- **Persistência SQLite**:
  - Adicionar colunas `pipeline_stage` e `commands` na tabela `projects`.
  - Persistir e recuperar o array detalhado de stepper via `project_specs`.

### 1.2 Camada de Servidor / API (`src/server.js`)
- Garantir que `GET /api/projects` e `GET /api/projects/:name` retornem os novos metadados (`pipeline_stage`, `commands`, `stepper`).

### 1.3 Camada Frontend (`public/index.html` & `public/app.js`)
- **Seletor de Topo (`#project-spotlight-bar`)**:
  - HTML com `<select id="spotlight-select">` estilizado e botões de navegação rápida (`btn-spotlight-prev`, `btn-spotlight-next`).
- **Painel Spotlight Destaque (`#project-spotlight-panel`)**:
  - Card hero com layout de grade em 3 colunas executivas:
    - Coluna 1: **Onde Parou & Propósito** (Último commit, tag, autor, resumo da missão).
    - Coluna 2: **Onde Está Agora & Stepper** (Fase ativa, Stepper visual com 3-4 nós, status da árvore limpa/modificada).
    - Coluna 3: **O Que Vem a Seguir & Atenção** (Próximo passo, tarefas pendentes imediatas, alerta do Alexandre se houver).
  - Rodapé do Spotlight com **Radar de Worktrees** e **Comandos úteis**.
- **Novo Modo de Visualização: Pipeline / Funil de Estágios**:
  - Botão `[ Pipeline ]` no View Switcher (Cards / Tabela / Pipeline).
  - Renderizador de colunas de estágio (`#projects-pipeline-container`) com contagem por estágio.

---

## 2. Riscos e Mitigações
- **Sobrecarga Visual**: Um painel grande no topo pode empurrar o resto da página para baixo.
  - *Mitigação*: Permitir recolher/expandir o painel com 1 clique (botão "Minimizar Spotlight"), mantendo a barra de seleção sempre visível e compacta.
- **Respeito ao Design System**:
  - Paleta estrita: Slate, Navy, Emerald, Amber, Indigo, Cyan. Zero vermelho.
