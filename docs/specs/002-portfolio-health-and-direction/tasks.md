# 002 — Portfolio Health, SDD Maturity & Executive Direction — TASKS

Status: CONCLUÍDA (Alexandre / Agente, 2026-10-27).
Sequência ordenada e atômica de implementação.

---

## Fase 1 — Schema SQLite e Módulos de Cálculo
- [x] **Task 1.1**: Adicionar migração no SQLite (`src/db.js`) para suportar `health_status`, `health_reason`, `sdd_score`, `last_tag`, `last_tag_date` e `last_agent`.
- [x] **Task 1.2**: Implementar o motor de cálculo de Health Status (`src/evaluator.js`) com regras de tração, bloqueio, estabilidade e risco.
- [x] **Task 1.3**: Implementar o cálculo do SDD Maturity Score (0-100%) em `src/evaluator.js`.
- [x] **Task 1.4**: Implementar no scanner (`src/scanner.js`) a detecção de tags Git (`tag_*` e `v*`) e identificação da pegada de agentes (`last_agent`).

---

## Fase 2 — Integração e Validação do Scanner
- [x] **Task 2.1**: Integrar os novos cálculos no ciclo de varredura do `ProjectScanner`.
- [x] **Task 2.2**: Atualizar o gerador do Google NotebookLM (`src/notebooklm.js`) para incluir diagnóstico de saúde e ranking de maturidade SDD.
- [x] **Task 2.3**: Executar a varredura e validar a coerência das classificações dos 21 projetos canônicos.

---

## Fase 3 — Interface Executiva e Filtros de Direção
- [x] **Task 3.1**: Atualizar os cards de projeto em `public/index.html` e `public/app.js` com o selo de Farol Gerencial (Health Status), barra de SDD Score e badge da última tag.
- [x] **Task 3.2**: Atualizar os chips de filtro na interface para suportar os novos estados (`Em Tração`, `Bloqueados`, `Estáveis`, `Em Incubação`, `Com Worktrees`).
- [x] **Task 3.3**: Adicionar no modal de detalhes a seção de Diagnóstico de Saúde e Decomposição do SDD Score.
- [x] **Task 3.4**: Garantir estrita aderência visual à paleta executiva (**ZERO VERMELHO**).

---

## Fase 4 — Testes Automatizados e Auditoria de Qualidade
- [x] **Task 4.1**: Expandir a suíte de testes (`test/test_all.mjs`) cobrindo:
  - Cálculo determinístico de Health Status;
  - Cálculo ponderado do SDD Maturity Score;
  - Detecção de tags de release;
  - Preservação da busca autocontida (zero tokens).
- [x] **Task 4.2**: Executar a suíte de testes e assegurar 100% de sucesso.
- [x] **Task 4.3**: Elaborar relatório final de auditoria conforme o Adendo de Qualidade e Evolução.
