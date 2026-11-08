# Handoff: Spec 005 — Veracidade dos Dados do Portfólio, Auditoria Empírica e Resiliência Documental (Vivere)

- **Data**: 2026-11-08
- **Agente**: AGY (Antigravity)
- **Branch**: `feature/veracidade-dados-vivere`
- **Status**: CONCLUÍDO (10/10 testes de aceite verdes)

---

## 1. Contexto e Descobertas no Projeto Vivere (`C:\desenv\utils\Vivere`)
A validação empírica contra os caminhos reais do projeto `Vivere` e suas worktrees revelou 5 achados críticos:
1. **Binds SQL sem argumentos no `src/db.js`**: `getAllProjects()` e `getProjectByName()` executavam `.all()` sem passar `p.name` / `name` nas queries de `project_worktrees`, `project_specs`, `project_recent_commits` e `alexandre_actions`, fazendo com que toda consulta retornasse arrays vazios `[]`.
2. **Falsos positivos de ações para o Alexandre**: O scanner capturava frases históricas como `Estado: **APROVADA** pelo Alexandre` ou `sprint autorizado pelo Alexandre` e as exibia como ações pendentes.
3. **Decisões reais em caminhos alternativos ignoradas**: As 6 decisões pendentes reais de Vivere estão em `docs/12-decisoes.md` (D-26, D-27, D-28, D-29, D-30, D-33), e 2 bloqueios reais dependentes do Alexandre estão em `docs/qualidade/FILA.md` (T12C-2 e T12C-3). O scanner só olhava a raiz.
4. **Metadados de continuidade ausentes**: O Vivere não possui `AGENT_CONTEXT.md` na raiz, mas tem `plano/STATUS.md` e `docs/qualidade/FILA.md` com o andamento detalhado.
5. **Specs tidas falsamente como 0%**: Muitas specs do Vivere utilizam formatação de tarefas enumeradas ou aprovação no cabeçalho/tabela, sendo marcadas incorretamente como pendentes sem progresso.

---

## 2. Correções Implementadas
- `src/db.js`: Parâmetros `p.name` e `name` adicionados em todas as chamadas SQL parametrizadas.
- `src/scanner.js`:
  - Varredura de caminhos de decisões (`docs/12-decisoes.md`, `docs/decisoes.md`, etc.) e bloqueios (`docs/qualidade/FILA.md`).
  - Filtro estrito descartando menções de aprovação passada.
  - Reconhecimento de specs aprovadas no cabeçalho (`Estado: **APROVADA**`) e em `plano/STATUS.md`.
  - Fallback de continuidade (`current_phase` e `next_action`) lendo `plano/STATUS.md` e `FILA.md`.
- `test/test_all.mjs`: Testes da Spec 005 adicionados, com 10/10 suítes verdes (`npm test`).

---

## 3. Estado Atual dos Dados do Vivere no AppDevelopmentControl
- **Nome**: Vivere
- **Caminho**: `C:\desenv\utils\Vivere`
- **Stack**: `.NET / C# + Vite / React`
- **Worktrees**: 9 vinculadas (`Vivere-atalho`, `Vivere-q16-lados`, `Vivere-q20-regressao`, `Vivere-q20b`, `Vivere-q47-protecao-dados-reais`, `Vivere-q48-cadastro-estampa`, `Vivere-rodada3`, `Vivere-t12a`, mais worktree de subagente)
- **Commits Totais**: 30 commits reais do git (12 nas últimas 24h)
- **Specs SDD**: 32 detectadas, sendo 30 concluídas (taxa real de entrega documentada)
- **Pendências do Alexandre**: 10 pendências reais (6 PENDING DECISION de `docs/12-decisoes.md`, 2 bloqueios de `docs/qualidade/FILA.md`, 1 de `S08A/spec.md`)
- **Fase Atual**: Ficha em andamento: T-11
- **Próxima Ação**: S11A backend pronto (NF no pedido, emissor manual, sem NF); tela pendente
