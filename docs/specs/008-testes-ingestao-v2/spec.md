# SPEC-0008 (pasta 008) — Testes da ingestão v2 (fixtures válidas e inválidas) — SPEC

Status: APROVADO (Claude, 2026-11-14) (rascunho de 2026-11-14; aprova o Claude ou o Alexandre).
Tipo: test. Peso: 5 (Fibonacci; PROVISÓRIO, confiança baixa). Horas (campo separado, provisório): 10. Depende de SPEC-0007 (valida).
Fonte da verdade do **comportamento** da cobertura de testes. Sem tecnologia, arquivo ou classe aqui: isso é do `plan.md`.
Controle: `SPEC-0008` em `docs/production/production-control.json`.

## 1. Por quê
A SPEC-0007 acrescenta validação de dados de terceiros (arquivos de controle escritos por IAs, em paralelo, às vezes truncados). A lição do projeto (CLAUDE.md global, "disciplina de verificação") é que afirmação sem prova se repete como fato. Esta spec define o conjunto de casos que prova, com dados controlados, que a ingestão aceita o que é válido, rejeita ou sinaliza o que é inválido e nunca mexe nos projetos nem no banco real.

## 2. Histórias de usuário (por prioridade)
- **US1 (P1)** Como Alexandre, quero um conjunto de testes com projetos de mentira (válidos e quebrados) para ter certeza de que a Dashboard acusa erro de verdade e não aceita dado ruim em silêncio.
- **US2 (P1)** Como Alexandre, quero que rodar os testes nunca altere o banco real nem os meus projetos, para poder rodá-los a qualquer hora sem medo.
- **US3 (P2)** Como Alexandre, quero que os testes provem que reconstruir o banco duas vezes dá o mesmo resultado.
- **US4 (P2)** Como Alexandre, quero um teste que compare a ingestão com um controle real (o do PDFReader) em modo somente leitura, para a prova não ser só de laboratório.

## 3. Cenários de aceite

| ID | Dado | Quando | Então |
|---|---|---|---|
| AC-1 | O conjunto de projetos de teste (fixtures) | Os testes rodam | Cada fixture fica numa pasta temporária própria, criada no início e apagada no fim; nenhum arquivo é criado fora dela. |
| AC-2 | Os testes de banco | Rodam | Usam sempre um banco temporário próprio; o banco real do projeto não é aberto nem alterado. |
| AC-3 | Fixture mínima válida (1 SPEC, evento de criação, baseline) | Ingestão | Status "válido", zero problemas de severidade erro, pontos e estado iguais ao arquivo. |
| AC-4 | Fixture completa válida (várias SPECs, dependências, bloqueio, horas parciais, tarefas, evidências, eventos de vários tipos) | Ingestão | Status "válido"; totais e indicadores batem com valores conferidos à mão no próprio teste. |
| AC-5 | Fixture com `schema_version` 1.0 e outra com JSON truncado | Ingestão | As duas são rejeitadas com os códigos esperados; nenhuma exceção escapa. |
| AC-6 | Fixture com campo obrigatório ausente (sem `specs`, sem `project`, SPEC sem `id`) | Ingestão | Cada ausência gera o código de problema correspondente. |
| AC-7 | Fixture com pontos 4, 0, -1, "5" (texto), 34 e nulo | Ingestão | 4, 0, -1, "5" e 34 sinalizados; nulo aceito como "sem ponto"; 13 e 21 aceitos. |
| AC-8 | Fixture com SPEC `completed` sem evidência e outra `completed` com evidência | Ingestão | Só a sem evidência é sinalizada; a cobertura de evidência calculada é 50%. |
| AC-9 | Fixture com ID de SPEC duplicado, tarefa duplicada e `event_id` duplicado | Ingestão | Três duplicidades sinalizadas; totais de pontos não somam em dobro. |
| AC-10 | Fixture com dependência para ID inexistente, `validates` para ID inexistente e ciclo A -> B -> A | Ingestão | Referência quebrada x2 e ciclo sinalizados; o ciclo não é desfeito. |
| AC-11 | events.jsonl com linha em branco, linha corrompida (JSON incompleto), linha com campo obrigatório ausente e linhas válidas | Ingestão | Em branco ignorada sem problema; corrompida e incompleta sinalizadas com número da linha; válidas importadas. |
| AC-12 | events.jsonl ausente / vazio / sem quebra de linha final / CRLF / BOM | Ingestão | Ausente e vazio: aviso "sem histórico"; os demais formatos lidos corretamente. |
| AC-13 | Evento de outro projeto e evento para entidade inexistente | Ingestão | Cada um sinalizado; não contam como histórico do projeto. |
| AC-14 | control.json com `summary.total_points` diferente da soma das SPECs | Ingestão | Divergência declarado x calculado sinalizada; o calculado é o usado. |
| AC-15 | Fixture sem baseline | Ingestão | Aviso de baseline ausente; status continua válido com alertas. |
| AC-16 | Projeto com control.json válido e `SPECS.md` divergente | Varredura | Vale o control.json (SPEC-0007 AC-2); o resultado não muda se o `SPECS.md` for removido. |
| AC-17 | Projeto só com `SPECS.md`; projeto sem nenhum dos dois | Varredura | Comportamento anterior preservado: mesmos pontos e specs da spec 006, sem erro. |
| AC-18 | Mesma fixture ingerida duas vezes | Comparação | Conteúdo das tabelas de produção idêntico (ignorando data/hora de importação); contagem de linhas igual. |
| AC-19 | Banco temporário apagado após a primeira ingestão | Nova ingestão | Conteúdo reconstruído idêntico ao da primeira (ignorando data/hora). |
| AC-20 | Fixture com SPECs de horas nulas e outra com horas reais informadas | Indicadores | Horas nulas continuam nulas, cobertura informada, erro de estimativa só onde há hora real; nunca zero no lugar de nulo. |
| AC-21 | Estado de arquivos da fixture e de um projeto real (somente leitura) antes e depois da ingestão | Comparação por hash | Hashes idênticos: nenhuma escrita (SPEC-0007 AC-14). |
| AC-22 | Um projeto com arquivo ilegível/corrompido e outro válido na mesma varredura | Varredura | O inválido é rejeitado e o válido é ingerido; a varredura termina. |
| AC-23 | Controle real do PDFReader (leitura somente leitura, caminho local; teste pulado com aviso se a pasta não existir) | Ingestão | Sem erro de severidade erro; pontos totais iguais ao `summary.total_points` do próprio arquivo. |
| AC-24 | A suíte inteira (atual + nova) | Roda com `npm test` | Termina com saída 0; a suíte antiga continua passando sem alteração de comportamento. |
| AC-25 | Varredura completa cronometrada antes e depois da SPEC-0007 | Medição | Tempos e comando registrados no handoff; diferença dentro do limite da SPEC-0007 NFR-002. |

## 4. Requisitos
- **FR-001** Os testes DEVEM gerar fixtures por código a partir de modelos mínimos, em pasta temporária com nome único por execução, e DEVEM apagá-las ao final, mesmo em falha.
- **FR-002** Os testes DEVEM usar banco temporário próprio para tudo que grava; o banco real nunca é aberto pelos testes novos.
- **FR-003** Cada teste DEVE citar no nome o `AC-n` (desta spec e, quando houver, o da SPEC-0007) que prova.
- **FR-004** O conjunto DEVE incluir, no mínimo, os casos de borda: JSONL corrompido, ID duplicado (SPEC, tarefa, evento), ponto fora de Fibonacci, `completed` sem evidência, referência quebrada, ciclo, `schema_version` errado, JSON truncado, horas nulas, baseline ausente, events ausente, reconstrução idempotente.
- **FR-005** Os testes DEVEM ser determinísticos: sem relógio, rede, ordem de diretório ou aleatoriedade; datas fixas nas fixtures.
- **FR-006** Os testes NÃO DEVEM abrir janelas, consoles visíveis nem exigir foco; rodam em processo oculto.
- **FR-007** O teste com projeto real (AC-23) DEVE ser somente leitura e DEVE ser pulado com aviso explícito (não passar em silêncio) quando a pasta não existir.
- **FR-008** O resultado da suíte DEVE listar, por `AC-n`, aprovado/reprovado/pulado, para alimentar o handoff.
- **NFR-001** A execução dos testes novos deve durar poucos segundos (meta: abaixo de 10 s, a confirmar medindo), sem depender de internet.
- **NFR-002** Os testes antigos não são reescritos; só se acrescentam seções novas ou arquivo novo (ver decisão no plan).

## 5. Casos de borda
- Pasta temporária com acento/espaço no caminho do Windows.
- Falha no meio do teste: a pasta temporária ainda é apagada.
- Fixture com final de linha CRLF e arquivo UTF-8 com BOM.
- Duas execuções simultâneas dos testes: nomes únicos de pasta e de banco evitam colisão.
- Máquina sem o projeto real do AC-23.

## 6. Fora de escopo
- Teste de interface gráfica/visual (é da tarefa de UI da SPEC-0007, com prova de tela própria).
- Testes de carga além da medição do AC-25.
- Cobertura de código por ferramenta externa.
- Migração do projeto para um framework de teste (a suíte segue em Node puro).

## 7. Critérios de sucesso
- `npm test` verde com a suíte antiga e a nova.
- Para cada `AC-n` da SPEC-0007 existe ao menos um teste nomeado que o cobre (tabela de rastreabilidade no handoff).
- Introduzir um defeito de propósito na validação (teste de mutação manual, registrado) faz pelo menos um teste falhar.

## 8. Pontos em aberto
- [NEEDS CLARIFICATION 1: Arquivo novo `test/test_production_v2.mjs` e `npm test` encadeando os dois, ou seções novas no `test_all.mjs`? Sugestão: arquivo novo (a suíte atual usa o banco real e é monolítica; misturar piora o isolamento do FR-002) e ajustar o script `test` do `package.json` para rodar os dois.]
- [NEEDS CLARIFICATION 2: A suíte antiga usa o banco real (`new AppDb()`), contra o FR-002 desta spec. Corrigir isso é escopo desta spec ou fica como DISCOVERY separada? Sugestão: DISCOVERY, não mexer na suíte antiga agora.]
- [NEEDS CLARIFICATION 3: AC-23 depende de `C:\desenv\utils\PDFReader\docs\production\` existir na máquina. Aceitável ficar "pulado" fora desta máquina? Sugestão: sim, com aviso.]

## 9. Histórico
- 2026-11-14 — Rascunho inicial (subagente, a pedido do Claude).

## Resolução dos pontos [NEEDS CLARIFICATION] (APROVADA pelo Claude em 2026-11-14)

1. Arquivo novo test/test_production_v2.mjs, encadeado no npm test; test_all.mjs não é alterado.
2. A suíte atual usar o banco real é DISCOVERY, fora desta spec; os testes novos usam banco temporário.
3. O teste contra o controle real do PDFReader é pulado com aviso quando a pasta não existe.
