# Handoff — Ingestão do controle de produção v2 (SPEC-0007 T7 a T12 + SPEC-0008)

Agente: Claude (Sonnet 5.5). Data: 2026-11-14 00:50 (-03:00). Branch: `feature/ingestao-producao-v2` (worktree `C:\desenv\utils\AppDevelopmentControl-v2`). Sem push, sem merge na main, sem `--no-verify`.
Estado: **SPEC-0007 e SPEC-0008 em `in_validation`** (não `completed`: a tela nunca foi aberta e nada foi integrado na main).

## Commits desta rodada (um por tarefa)
| Tarefa | Hash | O que entrega |
|---|---|---|
| T7 | `f0f84cf` | Integração em `scanCanonicalProject`: principal primeiro, fallback de worktree (D-006), v2 aceito vence `SPECS.md`, `alexandreActions` preservadas, origem em `projects.specs_source` |
| T8 | `bcea233` | `computeProductionMetrics` (produção, esforço com cobertura, previsibilidade, fluxo, bloqueios, qualidade do controle, baseline); horas nulas ficam nulas |
| T9 | `47e6632` | `production` em `/api/projects` e `/api/projects/:name`; `GET /api/projects/:name/production`; `createServer(deps)` |
| T10 | `1315e19` | `public/production-ui.js`, selo de origem, alertas, painel no modal; sem vermelho |
| T11 | `6a9409d` | `tools/perf/scan-timing.ps1` e medição antes/depois |
| T12 | (commit de fechamento desta rodada) | STATUS, CHANGELOG, controle, eventos, SPECS.md regenerado, plan corrigido, este handoff |

## Verificação (comandos reais)
- `npm test` (na worktree) = `node test/test_all.mjs && node test/test_production_v2.mjs`: **saída 0**; `test_all.mjs` sem falhas (todas as suítes "OK"); `test_production_v2.mjs`: **78 aprovados, 0 reprovados, 1 pulado** (o pulado é "abrir a Dashboard e usar", NOT TESTED). `test/test_all.mjs` não foi alterado.
- `node src/cli-scan.js` (comando da medição, varredura real de 26 projetos, banco da worktree):
  - **Antes** (HEAD `99f0ee1`, sem código novo): 20974, 20256, 20721 ms; **mediana 20721 ms**. (Baseline anterior, commit pré-T7: 23946 ms.)
  - **Depois** (HEAD `6a9409d`): `powershell -NoProfile -WindowStyle Hidden -File tools/perf/scan-timing.ps1 -Runs 3` = 18973, 18868, 18535 ms; **mediana 18868 ms** (-8,9%; dentro do limite de +10% do NFR-002, sem regressão).
  - A/B de pico de memória e CPU (cópia de `99f0ee1` extraída em temporário x worktree, 2 rodadas cada, mesma máquina): pico de working set 54 a 58 MB x 58 a 59 MB; CPU 2,1 s x 1,9 s; parede 27,1/27,3 s x 26,6/26,9 s (a carga da máquina estava maior nessa rodada; só a comparação relativa vale). Sem regressão relevante.
- Projetos monitorados: `git status --short` + `git rev-parse HEAD` de todos os 25 projetos com `.git` em `C:\desenv\utils`, antes e depois da varredura: **idênticos** (única diferença: a própria worktree, onde estão meus commits e o `tools/perf/` ainda não commitado na hora). Nenhum arquivo de projeto monitorado foi alterado.
- Pontos reais conferidos no banco após a varredura (script de leitura): PDFReader 84/76 = `summary.total_points` 84; AppDevelopmentControl-v2 37/24 = 37; Vivere 246; IEQ 51; AgyPool 41; etc., todos iguais ao `summary.total_points` do respectivo control.json (`valid`).
- Controle do próprio repositório: `powershell -NoProfile -File C:/Users/alxch/.dev-method/producao/Validar-Producao.ps1 -Path C:/desenv/utils/AppDevelopmentControl-v2` = `OK`; `readProductionControl('.')` = `valid`, zero issues; `docs/specs/SPECS.md` regenerado com `node tools/gen-specs-md.mjs` (8 specs, 37 pontos).

## Teste de mutação manual (0008 AC-24 / T11)
Em cópia temporária (`scratchpad`; o repositório real não foi tocado), um defeito por vez com `sed`, rodando `node test/test_production_v2.mjs`:
1. `FIBONACCI.includes(spec.points)` trocado por `true` → **1 teste reprovado** (`[0008:AC-7][0007:AC-6]`).
2. `wipe()` de `replaceProductionImport` vira no-op → **3 reprovados** (`AC-18/AC-12` idempotência, `AC-5` rejeitada mantém a boa, `AC-3` absent apaga linhas).
3. `const accepted = false` no scanner (v2 nunca vence) → **7 reprovados** (AC-1/AC-2/AC-16, D-006, alexandreActions, scanAll, REST).
Restaurado, a cópia voltou a 78/0/1. Um script automatizado (`tools/mutation-check.mjs`) foi escrito mas **bloqueado pelo classificador de permissões** do Claude Code; nunca rodou e foi descartado (não está no repositório).

## Estado por critério de aceite
Legenda: CONFIRMED = coberto por teste que passou em `npm test` (saída 0, acima); OBSERVED = visto numa execução real; NOT TESTED.

### SPEC-0007
| AC | Estado | Prova |
|---|---|---|
| AC-1 | CONFIRMED (dados e API); UI NOT TESTED | testes `[0007:AC-1]` (scanner, mapeamento, REST); varredura real mostra `production_v2` em 11 projetos |
| AC-2 | CONFIRMED | `[0007:AC-2][0008:AC-16]` v2 vence `SPECS.md` divergente; remover o `SPECS.md` não muda o resultado |
| AC-3 | CONFIRMED | `[0007:AC-3][0008:AC-17]` só `SPECS.md` → `specs_source = specs_md`, números da 006 |
| AC-4 | CONFIRMED | `[0007:AC-4]` sem nenhum dos dois → `none`, zeros, sem erro |
| AC-5 | CONFIRMED | 10+ testes `[0007:AC-5]`: schema 1.0, JSON truncado, bloco ausente; fallback para `SPECS.md`; real: 4 projetos rejeitados visíveis |
| AC-6 | CONFIRMED | `[0007:AC-6][0008:AC-7]` pontos 4/0/-1/"5"/34 sinalizados, entram nos totais (D-005) |
| AC-7 | CONFIRMED | `[0007:AC-7][0008:AC-8]` `COMPLETED_NO_EVIDENCE`, cobertura 50% |
| AC-8 | CONFIRMED | `[0007:AC-8][0008:AC-9]` ID duplicado sem dupla contagem |
| AC-9 | CONFIRMED | `[0007:AC-9][0008:AC-10]` referência quebrada e ciclo sinalizados, ciclo não desfeito |
| AC-10 | CONFIRMED | `[0007:AC-10]` linha corrompida isolada com número da linha |
| AC-11 | CONFIRMED | `[0007:AC-11]` event_id repetido, outro projeto, entidade órfã |
| AC-12 | CONFIRMED | `[0007:AC-12][0008:AC-18]` importação dupla idempotente |
| AC-13 | CONFIRMED (banco temporário) | `[0008:AC-19]` banco apagado e reconstruído idêntico; não repetido no banco real |
| AC-14 | CONFIRMED | `[0007:AC-14]` hash recursivo antes/depois de `scanAll`; e `git status`/HEAD idênticos nos 25 projetos antes/depois do `node src/cli-scan.js` real |
| AC-15 | CONFIRMED | `[0007:AC-15]` origem, `imported_at`, `declared_updated_at` no banco e na API |
| AC-16 | CONFIRMED | `[0007:AC-16]` `SUMMARY_MISMATCH` declarado x calculado; calculado usado |
| AC-17 | CONFIRMED | `[0007:AC-17][0008:AC-20]` horas nulas ficam nulas, cobertura informada, painel mostra "sem dado" |
| AC-18 | CONFIRMED | `[0007:AC-18]` erro de estimativa só com horas reais (base 1 no teste) |
| AC-19 | CONFIRMED | `[0007:AC-19]` §11/§12 componente a componente, com base e "sem dado" (valores conferidos à mão) |
| AC-20 | CONFIRMED | `[0007:AC-20]` baseline x atual; baseline ausente = aviso; formato real (`categories`) aceito |
| AC-21 | CONFIRMED | `[0007:AC-21][0008:AC-22]` pasta no lugar do arquivo e arquivo de 20 MB + 1 byte rejeitados; o projeto bom segue |
| Critérios de sucesso (varredura real) | OBSERVED | pontos conferidos com o control.json (acima) |
| UI "abrir e usar" | **NOT TESTED** | regra de foco/teste de tela: só depois das 23:59 e sem roubar foco; a UI foi validada por HTML/JS servido em memória e `vm` |

### SPEC-0008
| AC | Estado | Prova |
|---|---|---|
| AC-1, AC-2 | CONFIRMED | raiz com GUID sob o tmpdir, banco temporário, limpeza ao final (`[0008:AC-1]` final) |
| AC-3 a AC-15 | CONFIRMED | testes `[0008:AC-n]` da suíte (fixtures por código) |
| AC-16, AC-17 | CONFIRMED | testes de scanner |
| AC-18, AC-19 | CONFIRMED | idempotência e reconstrução em banco temporário |
| AC-20 | CONFIRMED | horas nulas x reais |
| AC-21, AC-22 | CONFIRMED | hash antes/depois; falha isolada |
| AC-23 | CONFIRMED (rodou, não foi pulado) | controle real do PDFReader lido em somente leitura: zero erros, pontos = `summary.total_points` (84), hash da pasta `docs/production` igual antes/depois; pula com aviso se a pasta não existir |
| AC-24 | CONFIRMED | `npm test` saída 0; suíte antiga sem alteração; mutação manual: 3 defeitos detectados (seção acima); script automatizado NOT TESTED (bloqueado) |
| AC-25 | CONFIRMED | medições acima (mediana 20721 -> 18868 ms) |

## Observações e descobertas (não corrigidas, fora de escopo)
- Varredura real: 4 projetos têm control.json **rejeitado por falta de blocos obrigatórios** (`dependencies`, `alerts`, `audit`): DevToolchain, KillTask, OneToOneSupport, SmartDockGroups. A Dashboard os mostra como "SPECS.md" + "v2 rejeitado" e usa o fallback. FolderOrganAIzer tem 15 eventos com campos obrigatórios ausentes (importa com alertas). Corrigir é nos projetos deles.
- `POST /api/projects/register` chama `scanner.scanSingleProject`, que não existe (`grep -n scanSingleProject src/scanner.js` sem definição). Preexistente.
- A worktree `AppDevelopmentControl-v2` aparece como projeto próprio na varredura (o scanner ignora só a pasta `AppDevelopmentControl`). Preexistente.
- Não implementado: aviso informativo "SPECS.md diverge do control.json" quando ambos existem (listado como mitigação no plan).
- Para os campos opcionais de fluxo/bloqueio (`started_at`, `accepted_at`, `blockers[].since`, `completed_points_equivalent`, critérios de tarefa) o código lê se existirem; os controles reais hoje não os trazem, então esses indicadores aparecem como "sem dado".

## YouNeeds
1. [AÇÃO] Abrir a Dashboard e usar o selo, a contagem de alertas e o painel no modal de um projeto (só depois das 23:59 ou quando você avisar que está longe do computador).
   Por quê: regra de verificação de UI; eu só validei HTML/JS em memória.
   Destrava: SPEC-0007 e SPEC-0008 passarem de `in_validation` para `completed`.
   Urgência: pode esperar
2. [AÇÃO] Decidir o `/merge` da branch `feature/ingestao-producao-v2` na main (squash + rebase), depois da prova de tela.
   Por quê: nada foi integrado; push e merge só por palavra-chave sua.
   Destrava: integração das duas SPECs na main.
   Urgência: pode esperar
