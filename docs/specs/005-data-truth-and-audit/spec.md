# SPEC-005: Veracidade dos Dados do Portfólio, Auditoria Empírica e Resiliência Documental (Vivere)

## 1. Contexto e Motivação
A pedido direto do Alexandre:
> "Use o projeto localizado na pasta C:\desenv\utils\Vivere e possíveis caminhos criados alternativamente, para validar a veracidade dos dados dessa dash."

Uma auditoria empírica comparando os dados reais em disco do projeto `C:\desenv\utils\Vivere` com os dados persistidos e servidos pela API do `AppDevelopmentControl` revelou divergências cruciais de veracidade:

1. **Parâmetros SQL Omitidos em `src/db.js`**:
   As consultas `SELECT * FROM project_worktrees WHERE project_name = ?`, `SELECT * FROM project_specs WHERE project_name = ?`, `SELECT * FROM project_recent_commits WHERE project_name = ?` e `SELECT * FROM alexandre_actions WHERE project_name = ?` em `getAllProjects()` e `getProjectByName(name)` eram invocadas com `.all()` sem parâmetros. Como resultado, o SQLite realizava bind de `null`, devolvendo arrays vazios (`[]`) para worktrees, stepper, specs e ações do Alexandre para todos os projetos da dashboard.
2. **Falsos Positivos em Ações do Alexandre**:
   O regex em `src/scanner.js` (`/PENDING DECISION|Aguardando Alexandre|Aprovação Alexandre/i`) identificava frases históricas de especificação (ex.: `Estado: **APROVADA** pelo Alexandre em 05/11/2026` e `sprint autorizado pelo Alexandre`) como pendências ativas, violando a Diretriz Obrigatória nº 4 do `AGENTS.md` ("NÃO classificar uma menção histórica como uma ação atual sem evidência suficiente").
3. **Decisões e Bloqueios Reais Não Detectados**:
   O Vivere possui 6 decisões pendentes ativas (`PENDING DECISION`) em `docs/12-decisoes.md` (D-26, D-27, D-28, D-29, D-30, D-33) e 2 bloqueios reais dependentes do Alexandre em `docs/qualidade/FILA.md` (`T12C-2` e `T12C-3`). O scanner buscava apenas por `DECISIONS.md` na raiz, ignorando esses caminhos alternativos.
4. **Metadados de Continuidade Ausentes em Estruturas Flexíveis**:
   O Vivere possui seu status vivo em `plano/STATUS.md` e `docs/qualidade/FILA.md`, mas o scanner buscava unicamente por `AGENT_CONTEXT.md` na raiz, resultando em `current_phase: null` e `next_action: null`.
5. **Reconhecimento de Status de Specs**:
   O scanner dependia exclusivamente de checkboxes `- [ ]` / `- [x]`. Specs do Vivere possuem numerações (`1. **...**`), itens `- **T1** ...` ou status formal no cabeçalho/tabela do `plano/STATUS.md`, resultando em 28 specs tidas falsamente como 0% concluídas.

---

## 2. Requisitos da Especificação

### R1: Correção Rigorosa dos Binds de Banco de Dados (`src/db.js`)
- Passar rigorosamente `(p.name)` em `getAllProjects()` e `(name)` em `getProjectByName(name)` para:
  - `project_worktrees`
  - `project_recent_commits`
  - `project_specs`
  - `alexandre_actions`
- Garantir que `p.stepper`, `p.worktrees` e `p.specs` sejam populados corretamente para qualquer projeto consultado.

### R2: Eliminação de Falsos Positivos nas Ações do Alexandre (`src/scanner.js`)
- Excluir categoricamente menções de histórico aprovado como:
  - `Estado: **APROVADA**`
  - `aprovado pelo Alexandre`
  - `autorizado pelo Alexandre`
  - `aprovada pelo Alexandre`
  - `decisões do Alexandre (histórico)`
- Considerar como ação do Alexandre APENAS evidências ativas:
  - `PENDING DECISION`
  - `Aguardando Alexandre` (sem ser preceded por "Aprovada")
  - Tarefas ativas `[ ]` ou `[BLOQUEADO]` explicitamente vinculadas ao Alexandre.

### R3: Suporte a Caminhos Alternativos de Governança e Decisões
- Além de `DECISIONS.md` na raiz, varrer:
  - `docs/12-decisoes.md`
  - `docs/decisoes.md`
  - `docs/DECISIONS.md`
  - `docs/qualidade/FILA.md` e `FILA.md` (buscando itens `[BLOQUEADO]` dependentes do Alexandre).

### R4: Suporte a Metadados de Continuidade em `plano/STATUS.md` e `FILA.md`
- Caso `AGENT_CONTEXT.md` não exista na raiz, tentar inferir `current_phase` e `next_action` a partir de:
  - `plano/STATUS.md` (última ficha em andamento `🟦` ou aprovada `✅`)
  - `docs/qualidade/FILA.md` (item em andamento ou próximo livre)
  - `STATUS.md`

### R5: Reconhecimento Inteligente de Conclusão de Specs
- Reconhecer spec como `done` quando:
  - O cabeçalho contiver `Estado: **APROVADA**` ou `Status: Aprovada` / `✅`;
  - Ou quando todas as tarefas marcadas estiverem concluídas;
  - Ou quando estiver marcada como `✅` ou aprovada na tabela de `plano/STATUS.md`.

---

## 3. Critérios de Aceite
1. Todas as worktrees reais do Vivere (`Vivere-q16-lados`, `Vivere-q20-regressao`, etc.) devem ser retornadas em `/api/projects/Vivere` e no modal/spotlight da UI.
2. Nenhuma menção histórica de aprovação deve ser registrada como ação pendente do Alexandre.
3. As decisões pendentes reais de `docs/12-decisoes.md` (D-26, D-27, etc.) e bloqueios de `docs/qualidade/FILA.md` devem ser capturadas como ações ativas do Alexandre.
4. O Stepper de specs do Vivere deve refletir o progresso real e não aparecer vazio.
5. `npm test` deve cobrir esses cenários e passar com 100% de sucesso.
