# SPEC-0007 (pasta 007) — Ingestão de docs/production v2 — TASKS

Status: APROVADO (Claude, 2026-11-14) (rascunho de 2026-11-14). Só com `spec.md` e `plan.md` APROVADOS. Branch: `feature/ingestao-producao-v2`. Sem push. Testes sem abrir janelas e sem roubar foco (processo oculto).
Ordem: a SPEC-0008 fornece fixtures e testes de cada tarefa; cada tarefa abaixo cita a tarefa de teste correspondente dela (U = 0008).

| # | Tarefa | Atende | Pronto quando | Estado |
|---|---|---|---|---|
| T0 | Registrar no controle (`docs/production`) SPEC-0007 como `in_progress` + evento `spec.started`; registrar decisões 1 a 5 da spec em `DECISIONS.md` (aprovadas) | protocolo §14 | controle e DECISIONS atualizados; `npm test` atual verde (baseline) | feito fa23af1 |
| T1 | `src/production.js`: localizar arquivos, ler control/baseline/events sem lançar exceção, devolver `{found, files, issues, status}`; só leitura | FR-001, FR-009, NFR-003, AC-5 (JSON), AC-21 | testes U-T2 passam; nenhum `writeFile`/`rename`/`unlink` no módulo (grep no teste) | feito 8abb739 |
| T2 | Validação de schema e valores do control.json (blocos, estados, Fibonacci, datas, percentuais) com códigos de issue | FR-002, FR-003, AC-5, AC-6, AC-7 | testes U-T3 passam | feito b2900db |
| T3 | Validação de referências, duplicidades e ciclos (SPEC/tarefa/dependência/validates/bloqueio) | FR-004, FR-005, AC-8, AC-9 | testes U-T4 passam; ciclo apenas sinalizado | feito b6cc75b |
| T4 | Parser e validação do events.jsonl (linha a linha, evento repetido, projeto trocado, órfão) e reconciliação control x eventos e declarado x calculado | FR-006, FR-007, AC-10, AC-11, AC-16 | testes U-T5 passam | feito dfbbb05 |
| T5 | Tabelas novas e `replaceProductionImport` (transação, idempotente) + `getProductionDetail`; origem e data de importação | FR-008, FR-010, FR-011, AC-12, AC-13, AC-15 | testes U-T6 passam com `new AppDb(temporário)`; banco real intocado | feito 1676a4a |
| T6 | `mapToLegacySpecs` + tabela única de categorias plural -> singular da 006 | FR-013, AC-1 | teste de mapeamento passa; `getAllProjects()` de projeto sem v2 idêntico ao de antes | feito 99f0ee1 |
| T7 | Integração em `scanCanonicalProject` (principal, fallback worktree conforme decisão 2, v2 prioritário sobre SPECS.md, `alexandreActions` preservadas) | FR-001, FR-012, AC-1, AC-2, AC-3, AC-4 | testes U-T7 passam; saída da 006 inalterada nos projetos sem v2 | feito f0f84cf |
| T8 | `computeProductionMetrics`: pontos, esforço com cobertura, previsibilidade, fluxo parcial, bloqueios, qualidade do controle §11, baseline | FR-014, FR-015, FR-016, FR-018, AC-17, AC-18, AC-19, AC-20 | testes U-T8 passam; horas nulas permanecem nulas | feito bcea233 |
| T9 | API: campo aditivo `production` em `/api/projects` e rota `GET /api/projects/:name/production` | FR-017 | teste REST (mock em memória, como a seção 6 da suíte) passa; campos antigos intactos | feito 47e6632 |
| T10 | UI mínima: selo de origem, contagem de alertas, painel de indicadores no modal; sem vermelho | FR-017, NFR-004 | Dashboard aberta e usada (captura/UI Automation, sem roubar foco); verificação de ausência de vermelho nas cores novas | feito 1315e19; "abrir e usar" NOT TESTED (regra de foco) |
| T11 | Varredura real (`npm run scan`) cronometrada antes (baseline `e6d1178`) e depois; conferir pontos de PDFReader e AppDevelopmentControl com o control.json; `git status` dos projetos monitorados inalterado | NFR-002, AC-14, critérios de sucesso | tempos antes/depois registrados com o comando; diferença até 10%; nenhum arquivo de projeto alterado | feito 6a9409d |
| T12 | Fechar: `STATUS.md`, `CHANGELOG.md`, controle e eventos (`spec.completed` ou `in_validation` conforme evidência), handoff com estado por AC | protocolo §14 | handoff em `docs/agents/handoffs/` com cada `AC-n` marcado CONFIRMED/OBSERVED/NOT TESTED | feito (este commit) |

## Teste obrigatório
Um por cenário de aceite (`AC-n`), do tipo definido no `plan.md`; implementado pela SPEC-0008.

## Entrega
Um commit por tarefa (`tipo(escopo): resumo`), suíte inteira verde (`npm test`), UI aberta e usada, medições com comando, handoff por `AC-n`. Sem push, sem merge na main (merge só por palavra-chave do Alexandre).
