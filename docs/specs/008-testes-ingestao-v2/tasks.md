# SPEC-0008 (pasta 008) — Testes da ingestão v2 — TASKS

Status: APROVADO (Claude, 2026-11-14) (rascunho de 2026-11-14). Só com `spec.md` e `plan.md` APROVADOS e SPEC-0007 aprovada. Branch: `feature/ingestao-producao-v2` (mesma da 0007, pois é a sua validação; um commit por tarefa). Sem push. Execução sem janela e sem roubar foco.
Cada tarefa de teste é escrita junto da tarefa da SPEC-0007 que ela valida (a 0008 T2 antes da 0007 T1 etc.: teste primeiro quando possível).

| # | Tarefa | Atende | Pronto quando | Valida (0007) | Estado |
|---|---|---|---|---|---|
| T1 | `test/fixtures-production.mjs` (builders, mutadores, `makeProject`, `hashTree`, `dumpProduction`) e `test/test_production_v2.mjs` com runner `check('AC-n ...')`, raiz temporária com GUID, banco temporário, limpeza em `finally`; ajustar `package.json` `test` | FR-001, FR-002, FR-003, FR-005, FR-008, AC-1, AC-2 | `npm test` roda os dois arquivos; sem fixtures ainda, os AC-1/AC-2 passam; temp apagado | base | feito 8abb739 |
| T2 | Testes de leitura: arquivo ausente, JSON truncado, vazio, BOM, CRLF, ilegível; sem exceção | FR-004, AC-5 (JSON), AC-12 (parte), AC-22 | passam contra a implementação da 0007 T1 (antes dela, falham de propósito) | T1 | feito 8abb739 |
| T3 | Testes de schema e valores: `schema_version` 1.0, campos obrigatórios ausentes, pontos 4/0/-1/"5"/34/nulo/13/21, estado inválido, data inválida, `completed` sem evidência x com evidência (cobertura 50%) | FR-004, AC-3, AC-5, AC-6, AC-7, AC-8 | códigos exatos de issue afirmados | T2 | feito b2900db |
| T4 | Testes de duplicidade, referência e ciclo: SPEC/tarefa/evento duplicados, dependência e `validates` inexistentes, ciclo A->B->A | FR-004, AC-9, AC-10 | totais sem dupla contagem afirmados; ciclo apenas sinalizado | T3 | feito b6cc75b |
| T5 | Testes de eventos: linha em branco/corrompida/incompleta com número da linha, ausente/vazio, sem LF final, CRLF, BOM, projeto trocado, entidade órfã, declarado x calculado, baseline ausente | FR-004, AC-11, AC-12, AC-13, AC-14, AC-15 | passam; linhas válidas importadas | T4 | feito dfbbb05 |
| T6 | Testes de banco: transação, idempotência (2 ingestões), reconstrução após apagar o banco, origem/data de importação, banco real intocado | FR-002, AC-15 (0007), AC-18, AC-19 | `dumpProduction` idêntico nas duas rodadas (sem data) | T5 | feito 1676a4a |
| T7 | Testes de integração no scanner: v2 vence `SPECS.md`; só `SPECS.md`; nenhum dos dois; falha isolada num projeto de uma varredura de dois; não-escrita por hash | FR-004, AC-16, AC-17, AC-21, AC-22 | passam; resultado do caminho 006 igual ao de antes | T7 | feito f0f84cf |
| T8 | Testes de métricas: horas nulas permanecem nulas e cobertura, erro de estimativa só com horas reais, indicadores 11 e 12 componente a componente com "sem dado", baseline x atual | FR-004, AC-4, AC-20 | valores conferidos à mão passam | T8 | feito bcea233 |
| T9 | Teste do projeto real do PDFReader em somente leitura (hash antes/depois; pulo explícito se ausente) e teste REST do campo `production` | FR-007, AC-21, AC-23 | passa ou pula com aviso; campos antigos da API intactos | T9 | feito 47e6632 |
| T10 | Medição antes/depois: `tools/perf/scan-timing.ps1` em `e6d1178` e no fim; registrar mediana, comando e diferença | AC-25 | números no handoff, diferença dentro de NFR-002 da 0007 | T11 | feito 6a9409d |
| T11 | Teste de mutação manual (um defeito de propósito na validação e um na idempotência: o teste correspondente falha) e tabela de rastreabilidade AC(0007) -> teste | critérios de sucesso, AC-24 | evidência no handoff; `npm test` final com saída 0 | todas | feito: mutação manual em cópia temporária (3 defeitos detectados; ver handoff); script automatizado não rodou (bloqueado pelo classificador de permissões) e foi descartado |
| T12 | Fechar: controle e eventos de SPEC-0008, `STATUS.md`, handoff com estado por `AC-n` | protocolo §14 | handoff em `docs/agents/handoffs/` | — | feito (este commit) |

## Teste obrigatório
Esta spec é a prova da SPEC-0007; seu próprio "teste" é o teste de mutação manual (T11) mais a execução limpa em máquina sem o projeto real (AC-23 pulado com aviso).

## Entrega
Um commit por tarefa, `npm test` verde sem janelas, tabela por `AC-n` (CONFIRMED/OBSERVED/NOT TESTED com comando e saída), sem push.
