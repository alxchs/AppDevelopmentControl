# SPEC-0007 (pasta 007) — Ingestão de docs/production v2 na Dashboard — SPEC

Status: APROVADO (Claude, 2026-11-14) (rascunho de 2026-11-14, escrito pela AGY/subagente; aprova o Claude ou o Alexandre).
Peso: 8 (Fibonacci; PROVISÓRIO, confiança baixa — recalibrar na aprovação do plan). Horas (provisórias, campo separado): 24.
Fonte da verdade do **comportamento**. Sem tecnologia, arquivo ou classe aqui: isso é do `plan.md`.
Controle: `SPEC-0007` em `docs/production/production-control.json`. Protocolo: `~/.dev-method/producao/Protocolo_Controle_Producao_SPECS_v2.md` (§§4, 7, 9, 10, 11, 12, 17).

## 1. Por quê
O Protocolo de Controle de Produção v2 (METODO.md §25) faz cada projeto manter `docs/production/` (estado, eventos, baseline). Hoje a Dashboard só lê o `SPECS.md` da spec 006, que é um resumo humano sem horas, eventos, evidências, dependências nem qualidade do controle. O protocolo diz que a Dashboard "importa JSON/eventos, valida schema/referências, detecta duplicidades, reconstrói SQLite a partir dos arquivos, preserva origem/data de importação e sinaliza divergências" e que o SQLite é base **derivada e reconstruível**. Esta spec entrega isso.

## 2. Histórias de usuário (por prioridade)
- **US1 (P1)** Como Alexandre, quero que a Dashboard mostre, para cada projeto com `docs/production/`, os pontos, o estado das SPECs e o progresso lidos direto do controle do projeto, para ver o portfólio real sem depender de resumo escrito à mão.
- **US2 (P1)** Como Alexandre, quero ser avisado quando o controle de um projeto está inválido ou incoerente (schema, ponto fora de Fibonacci, concluída sem evidência, ID repetido, referência quebrada, linha de evento corrompida), para não confiar em número errado.
- **US3 (P1)** Como Alexandre, quero ter a certeza de que a Dashboard nunca altera os arquivos dos meus projetos, para que o projeto continue sendo a fonte de verdade.
- **US4 (P2)** Como Alexandre, quero poder apagar o banco e reconstruí-lo a partir dos arquivos com o mesmo resultado, para a Dashboard ser descartável.
- **US5 (P2)** Como Alexandre, quero ver os indicadores gerenciais (produção, esforço, previsibilidade, fluxo, bloqueios) e a qualidade do próprio controle, com o que é desconhecido mostrado como desconhecido e nunca como zero.
- **US6 (P3)** Como Alexandre, quero que projetos que ainda só têm `SPECS.md` (spec 006) continuem aparecendo normalmente.

## 3. Cenários de aceite

| ID | Dado | Quando | Então |
|---|---|---|---|
| AC-1 | Projeto monitorado com `production-control.json` válido (schema 2.0) | A varredura roda | As SPECs, pontos, estados, categorias, progresso por dimensão, dependências, alertas e auditoria do projeto ficam disponíveis, e a origem da leitura é "production v2". |
| AC-2 | Projeto com control.json válido e também `SPECS.md` | A varredura roda | Os números vêm do control.json (v2 tem prioridade); o `SPECS.md` não altera o resultado. |
| AC-3 | Projeto sem `docs/production/` mas com `SPECS.md` | A varredura roda | Comportamento da spec 006 inalterado; origem registrada como "SPECS.md". |
| AC-4 | Projeto sem nenhum dos dois | A varredura roda | Projeto aparece como hoje, sem erro, sem valores quebrados. |
| AC-5 | control.json com `schema_version` diferente de 2.0, JSON malformado ou campo obrigatório ausente | A varredura roda | O controle do projeto é rejeitado com problema registrado (severidade e motivo); a Dashboard usa o fallback do `SPECS.md` se houver, senão nada; o restante do portfólio não é afetado. |
| AC-6 | SPEC com pontos fora de 1, 2, 3, 5, 8, 13, 21 | A varredura roda | O problema é sinalizado na SPEC; o ponto é mostrado como lido, e não entra nos totais certos até ser corrigido [ver NEEDS CLARIFICATION 1]. |
| AC-7 | SPEC `completed` sem nenhuma evidência | A varredura roda | Divergência "concluída sem evidência" sinalizada; a SPEC continua concluída no estado lido, mas conta contra a cobertura de evidência. |
| AC-8 | Dois itens com o mesmo ID de SPEC (ou de tarefa) | A varredura roda | Duplicidade sinalizada; nenhum dos dois é descartado em silêncio; os totais não somam os pontos em dobro. |
| AC-9 | Dependência ou `validates` apontando para ID que não existe, ou ciclo de dependências | A varredura roda | Referência quebrada / ciclo sinalizado; o ciclo não é "resolvido" pela Dashboard. |
| AC-10 | events.jsonl com linha corrompida entre linhas válidas | A varredura roda | As linhas válidas são importadas, a corrompida é sinalizada com o número da linha e ignorada; os demais eventos não se perdem. |
| AC-11 | Evento com `event_id` repetido, ou de outro `project_id`, ou referenciando entidade inexistente | A varredura roda | Cada caso é sinalizado; evento repetido é contado uma vez. |
| AC-12 | Mesmos arquivos de um projeto, importados duas vezes seguidas | A varredura roda duas vezes | O banco fica com o mesmo conteúdo (idempotente), sem duplicar SPECs, eventos nem problemas. |
| AC-13 | Banco apagado | A varredura completa roda | O banco é reconstruído só a partir dos arquivos e os dados de produção ficam idênticos aos de antes. |
| AC-14 | Qualquer varredura | Ao terminar | Nenhum arquivo dentro de nenhum projeto monitorado foi criado, alterado ou apagado. |
| AC-15 | Importação concluída | Consulta ao dado do projeto | Constam a origem (arquivo e tipo), a data/hora da importação e a data de última atualização declarada pelo próprio projeto. |
| AC-16 | control.json com `summary.total_points` ou `category_counts` diferentes do que as SPECs somam | A varredura roda | Divergência sinalizada mostrando declarado x calculado; a Dashboard exibe o calculado e guarda o declarado. |
| AC-17 | SPECs sem horas (null) | Indicadores de esforço são calculados | Horas desconhecidas permanecem desconhecidas (nulas); nenhum total de horas é apresentado como zero; o total só considera SPECs com horas informadas e diz quantas ficaram de fora. |
| AC-18 | Horas reais nulas | Indicador de erro de estimativa | Não é calculado (aparece "sem dado"); nunca é estimado a partir de pontos. |
| AC-19 | Controle com SPECs, eventos e auditoria | Indicadores 11 e 12 são pedidos | São apresentados componente a componente (sem nota única), cada um com a base de cálculo (n de itens) e com "sem dado" quando a base é vazia. |
| AC-20 | Baseline presente | Importação | Totais e contagens do baseline ficam guardados e comparáveis com o estado atual; baseline ausente é sinalizado, não é erro fatal. |
| AC-21 | Arquivo de controle muito grande ou ilegível (permissão, codificação) | A varredura roda | Falha isolada ao projeto, com problema registrado; a varredura segue para os demais. |

## 4. Requisitos
- **FR-001** O sistema DEVE localizar, por projeto monitorado (e suas worktrees, conforme decisão em [NEEDS CLARIFICATION 2]), os arquivos `production-control.json`, `production-events.jsonl` e `production-baseline.json` em `docs/production/`.
- **FR-002** O sistema DEVE validar o control.json: `schema_version` 2.0, presença e tipo dos blocos `project`, `summary`, `specs`, `dependencies`, `alerts`, `audit`, e dos campos mínimos de cada SPEC (id, título, tipo, estado, pontos, progresso).
- **FR-003** O sistema DEVE validar valores: estados dentro do conjunto do protocolo (§9), pontos em Fibonacci 1, 2, 3, 5, 8, 13, 21 (ou nulos), datas ISO 8601, percentuais entre 0 e 100 ou nulos.
- **FR-004** O sistema DEVE validar referências: dependências, `validates` e bloqueios apontando para IDs existentes; detectar ciclos sem resolvê-los.
- **FR-005** O sistema DEVE detectar IDs duplicados (SPEC, tarefa, evento) e sinalizar sem descartar.
- **FR-006** O sistema DEVE ler o events.jsonl linha a linha, isolando linhas inválidas, e validar os campos mínimos do §10 (identificador, data com fuso, projeto, entidade, tipo de evento, ator, resumo).
- **FR-007** O sistema DEVE sinalizar divergências entre control.json e eventos (estado atual diferente do último evento da SPEC; SPEC sem evento de criação; evento de SPEC inexistente) e entre o resumo declarado e o calculado (AC-16).
- **FR-008** O sistema DEVE reconstruir os dados de produção no banco **somente** a partir dos arquivos, de forma idempotente por projeto (o conjunto resultante substitui o anterior daquele projeto).
- **FR-009** O sistema NUNCA DEVE escrever, criar, renomear ou apagar arquivos dentro de um projeto monitorado.
- **FR-010** O sistema DEVE guardar, para cada importação: projeto, arquivos de origem, data/hora da importação, resultado (válido, válido com alertas, rejeitado) e a última atualização declarada pelo projeto.
- **FR-011** O sistema DEVE registrar cada problema encontrado com projeto, arquivo, entidade (quando houver), código estável do problema, severidade (info, aviso, erro) e mensagem.
- **FR-012** Quando o control.json do projeto for aceito (válido ou válido com alertas), o sistema DEVE usá-lo como fonte primária de pontos, estados e categorias do projeto; o `SPECS.md` da spec 006 só é usado quando não há control.json aceito (fallback).
- **FR-013** O sistema DEVE mapear as categorias do protocolo (finalizadas, em_andamento, fila, dependendo_alexandre, impedidas, invalidas) para as categorias já exibidas pela Dashboard, sem mudar o que a spec 006 mostra.
- **FR-014** O sistema DEVE calcular pontos totais, concluídos (pontos de SPECs `completed` e, onde o controle trouxer "equivalente", o equivalente), restantes e impedidos, sem somar pontos de SPEC e de tarefa em dobro (protocolo §17).
- **FR-015** O sistema DEVE calcular esforço (horas original, atual, real, restante) mantendo as quatro grandezas separadas, tratando nulo como desconhecido e informando a cobertura (quantas SPECs têm o dado).
- **FR-016** O sistema DEVE calcular os indicadores do protocolo §12 que o controle sustenta (produção, esforço, previsibilidade, fluxo, bloqueios; qualidade/retrabalho quando houver eventos de defeito) e a qualidade do controle do §11 (critérios verificáveis, conclusões com evidência, estimativas justificadas, campos desconhecidos, divergências, eventos sem referência, idade da última auditoria completa), cada um com sua base e sem nota única. Escopo exato em [NEEDS CLARIFICATION 3].
- **FR-017** O sistema DEVE tornar disponíveis os dados importados (SPECs, problemas, indicadores, origem/importação) às telas e à API existentes de forma aditiva: campos novos, sem remover nem renomear os atuais.
- **FR-018** O sistema DEVE preservar o baseline importado e permitir comparar contagens e pontos do baseline com os atuais.
- **NFR-001** A leitura é 100% offline, sem serviço externo, sem IA.
- **NFR-002** A varredura completa do portfólio não pode ficar mais lenta do que a de antes desta spec acima de 10% (medido com o mesmo comando antes e depois; ver SPEC-0008/AC de medição); a leitura de um projeto de ~500 KB de control.json deve caber em tempo imperceptível (meta: abaixo de 200 ms por projeto, a confirmar medindo).
- **NFR-003** Falha em um projeto (arquivo corrompido, ilegível, gigante) nunca interrompe a varredura dos demais.
- **NFR-004** Nenhum elemento visual novo usa vermelho (paleta da Dashboard: Slate, Navy, Emerald, Amber, Indigo, Sky); severidade "erro" usa Amber forte/Indigo, não vermelho.
- **NFR-005** Idempotência: mesma entrada, mesmo banco (comparável por conteúdo, ignorando a data/hora da importação).

## 5. Casos de borda
- control.json vazio, só com `{}`, ou com BOM/CRLF.
- events.jsonl vazio, com linha em branco, sem quebra de linha final, ou com CRLF.
- events.jsonl ausente (control.json existe): válido, com aviso "sem histórico".
- baseline ausente: aviso, não erro.
- Projeto cujo control.json está sendo gravado por outra IA durante a leitura (arquivo truncado): tratado como JSON inválido naquela rodada; a próxima varredura corrige. A Dashboard não tenta travar o arquivo.
- SPEC cujo `points` é nulo: pontos desconhecidos, fora dos totais, contados como "sem ponto".
- SPEC `cancelled` ou categoria "invalidas": não conta como restante.
- `summary.total_points` nulo no arquivo: usar o calculado.
- Dois projetos monitorados com o mesmo `project_id`: sinalizar duplicidade entre projetos.
- Caminho com acentos e espaços (Windows).
- Controle com campo desconhecido adicional (versão menor do protocolo): ignorar o campo, sem falhar.

## 6. Fora de escopo
- Escrever de volta nos projetos (inclusive "corrigir" o control.json). Só com operação explícita futura, em outra spec.
- Executar `/graphmissingtodo` ou iniciar trabalho a partir da Dashboard.
- Migrar projetos para o protocolo v2.
- Ranking/comparação de agentes e indicador de Valor (§12) neste primeiro corte [NEEDS CLARIFICATION 3].
- Previsão de datas de conclusão (o protocolo proíbe sem histórico confiável).
- Tela nova completa de gestão de produção; aqui só os dados e a exibição mínima definida no plan.
- Tarefas (`TASK-*`) como entidade detalhada na tela; são importadas se existirem no control.json, mas a exibição detalhada fica para depois.

## 7. Critérios de sucesso
- A varredura real dos projetos já migrados (PDFReader, o próprio AppDevelopmentControl, Vivere etc.) mostra pontos e estados iguais aos do control.json de cada um.
- Um control.json propositalmente quebrado gera problema visível, sem derrubar a varredura.
- Apagar o banco e varrer de novo devolve os mesmos dados de produção.
- `git status` dos projetos monitorados idêntico antes e depois da varredura.
- Suíte da SPEC-0008 e a suíte atual passam.

## 8. Pontos em aberto
- [NEEDS CLARIFICATION 1: SPEC com ponto fora de Fibonacci entra nos totais de pontos como lida, ou fica de fora até corrigir? Sugestão: entra como lida, com alerta de severidade "erro" na SPEC, para o total não ocultar trabalho; mas o indicador de qualidade do controle cai.]
- [NEEDS CLARIFICATION 2: Worktrees. O control.json valendo é o do caminho principal; se só uma worktree tiver `docs/production/` (branch de migração ainda não integrada, como `feature/adotar-protocolo-producao`), a Dashboard lê da worktree como fallback e marca a origem? Sugestão: principal primeiro; worktree só se o principal não tiver; nunca mesclar dois controles.]
- [NEEDS CLARIFICATION 3: Escopo dos indicadores 11 e 12 no primeiro corte. Sugestão: §11 inteiro (são só contagens sobre o controle) e do §12: produção, esforço, previsibilidade (variação original x atual; erro só com horas reais), bloqueios e fluxo parcial (WIP e idade; tempo de ciclo só onde houver datas de início e aceite). Valor e comparação de agentes ficam fora.]
- [NEEDS CLARIFICATION 4: Nomes dos campos de horas. O protocolo §7 lista `original_estimate_hours` etc.; os controles reais já gerados usam `hours: {original, current, actual, remaining}`. A Dashboard aceita os dois formatos? Sugestão: aceitar ambos na leitura e sinalizar "aviso" quando usar o nome do protocolo diferente do real; decisão formal em `DECISIONS.md`.]
- [NEEDS CLARIFICATION 5: Rejeição por schema inválido: o rascunho trata erro de schema como rejeição total do control.json; erros só de valor (ponto, data) como importação "com alertas". Confirmar esta fronteira.]

## 9. Histórico
- 2026-11-14 — Rascunho inicial (subagente, a pedido do Claude), a partir do Protocolo v2 §§4, 9, 10, 11, 12, 17 e do código atual.

## Resolução dos pontos [NEEDS CLARIFICATION] (APROVADA pelo Claude em 2026-11-14)

1. Ponto fora de Fibonacci: entra nos totais, com alerta de erro visível, até ser corrigido na origem.
2. Worktrees: ler primeiro o checkout principal; usar a worktree só se o principal não tiver docs/production. Nunca mesclar controles.
3. Indicadores: §11 inteiro; do §12 apenas produção, esforço, previsibilidade, bloqueios e fluxo parcial. Valor e comparação de agentes ficam fora desta spec.
4. Horas: aceitar os dois formatos (original_estimate_hours do §7 e hours:{original,current,actual,remaining} dos controles reais), com aviso de formato; registrar em DECISIONS.md (T0).
5. Fronteira: erro de schema (bloco ou tipo ausente) rejeita a importação e mantém a última boa; erro só de valor importa com alertas. Arquivo truncado numa leitura mantém a última importação boa e registra o problema.
