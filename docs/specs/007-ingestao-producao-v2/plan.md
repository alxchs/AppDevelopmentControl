# SPEC-0007 (pasta 007) — Ingestão de docs/production v2 — PLAN

Status: APROVADO (Claude, 2026-11-14) (rascunho de 2026-11-14). Só começa com a `spec.md` APROVADA. Responde "como", sem alterar o "o quê".

## Arquitetura atual (lida no código em 2026-11-14, worktree `AppDevelopmentControl-v2`, base `e6d1178`)
- Projeto Node ESM sem dependências (`package.json` sem `dependencies`), SQLite via `node:sqlite` (`DatabaseSync`), testes por `node test/test_all.mjs` (CONFIRMED: lido).
- `src/db.js` (605 linhas): classe `AppDb(customPath)`; `init()` cria tabelas `projects`, `project_worktrees`, `project_recent_commits`, `project_specs`, `alexandre_actions`, `monitored_paths` e usa `ALTER TABLE ... ADD COLUMN` em `try/catch` para evoluir o schema (CONFIRMED). `upsertProject`, `saveSpecs` (apaga e reinsere por projeto), `getKpis` (soma `total_points`, `done_points`, `pending_points`), `getAllProjects`, `getProjectByName` (CONFIRMED).
- `src/scanner.js` (1238 linhas): `ProjectScanner.scanCanonicalProject(def)` monta `projectRecord`, chama `consolidateSpecsAndActions(paths, name)` que devolve `{specs, alexandreActions, specsMetrics}`; a ingestão da spec 006 (`SPECS.md`, JSON de métricas + tabela) está no passo 5 desse método (linhas ~1142-1226); categorias da 006 são singulares (`finalizada`, `em_andamento`, `dependendo_alexandre`, `impedida`, `invalida`) (CONFIRMED).
- Pontos do projeto hoje: `specsMetrics.total_pontos` (JSON do SPECS.md) senão soma de `weight` das specs (CONFIRMED, `scanCanonicalProject`).
- `src/server.js`: rotas `/api/kpis`, `/api/projects`, `/api/scan` (POST), `/api/alexandre-actions`, `/api/search`, `/api/export/notebooklm` (CONFIRMED por grep). Relido na T9: `/api/projects` serializa `getAllProjects()` (CONFIRMED). O módulo abria o banco real ao ser importado (`new AppDb()` no topo); a T9 passou a criar banco e scanner sob demanda e `createServer(deps)` aceita `db`/`scanner` injetados (CONFIRMED em `src/server.js`).
- `src/cli-scan.js`: `new AppDb()` + `scanner.scanAll()` (CONFIRMED).
- `test/test_all.mjs`: arquivo único, 10 seções numeradas, usa `new AppDb()` (banco real) e `ProjectScanner` (CONFIRMED).
- Exemplo real de entrada: `C:\desenv\utils\PDFReader\docs\production\` tem os três arquivos; control com `schema_version`, `protocol_version`, `project`, `summary` (inclui `category_counts`), `specs[]` (com `id`, `legacy_ids`, `state`, `category` plural, `points`, `points_confidence`, `hours{original,current,actual,remaining,actual_method}`, `progress{...}`, `evidence[]`, `blockers[]`, `dependencies[]`, `validates[]`), `dependencies[]`, `alerts[]`, `audit{...}`; events com `event_id`, `timestamp`, `project_id`, `entity_type`, `entity_id`, `event_type`, `actor`, `summary`, `before/after`, `evidence` (CONFIRMED: lido).

## Abordagem
Novo módulo **`src/production.js`** (leitura + validação + métricas, **puro**: recebe o caminho, devolve um objeto; não toca no banco e só usa `fs.readFileSync`/`existsSync`). Camada de persistência em `db.js` (métodos novos, tabelas novas, `CREATE TABLE IF NOT EXISTS`). Integração mínima no scanner: uma chamada antes do cálculo de totais.

1. `readProductionControl(projectPath)` -> `{ found, files, control, events, baseline, issues[], status }`.
2. `validateControl(control)` / `validateEvents(lines)` -> issues com código estável (`SCHEMA_VERSION`, `JSON_PARSE`, `POINTS_NOT_FIBONACCI`, `COMPLETED_NO_EVIDENCE`, `DUP_ID`, `BROKEN_REF`, `DEP_CYCLE`, `EVENT_LINE_CORRUPT`, `EVENT_DUP`, `EVENT_ORPHAN`, `SUMMARY_MISMATCH`, `BASELINE_MISSING`, `HOURS_FIELD_VARIANT`, ...).
3. `computeProductionMetrics(control, events, baseline)` -> pontos (total/concluídos/restantes/impedidos), esforço com cobertura, previsibilidade, fluxo, bloqueios, qualidade do controle (§11), comparação com baseline; nulo permanece nulo.
4. `mapToLegacySpecs(control)` -> lista no formato que `saveSpecs` já aceita (`spec_id`, `spec_name`, `status` done/in_progress/pending/blocked/invalid/awaiting_alexandre, `weight`, `category` singular) e `specsMetrics` no formato da 006 (`total_specs`, `total_pontos`, `finalizadas.{quantidade,pontos}`...), para a UI atual continuar funcionando sem mudança (FR-013).
5. Em `scanCanonicalProject`: `const prod = readProductionControl(...)` no principal (e fallback em worktree conforme decisão 2). Se `prod.status` aceito: `specs`/`specsMetrics` vêm de `mapToLegacySpecs`, mas as `alexandreActions` continuam vindo de `consolidateSpecsAndActions` (decisões pendentes não estão no control.json). Senão: caminho atual da 006, intacto.
6. Persistência: `db.replaceProductionImport(projectName, prod)` em **uma transação**: apaga as linhas do projeto nas tabelas de produção e reinsere (idempotente, FR-008, NFR-005). Tabelas novas:
   - `production_imports(project_name PK, project_id, source_kind, control_path, events_path, baseline_path, imported_at, declared_updated_at, status, issue_counts_json, metrics_json, baseline_json)`
   - `production_specs(project_name, spec_id, title, type, state, category, points, points_confidence, hours_original, hours_current, hours_actual, hours_remaining, evidence_count, progress_json, dependencies_json, blockers_json, raw_json, UNIQUE(project_name, spec_id))`
   - `production_events(project_name, event_id, ts, entity_type, entity_id, event_type, actor, summary, raw_json, UNIQUE(project_name, event_id))`
   - `production_issues(project_name, code, severity, entity_id, file, line, message)`
   Origem e data de importação em `production_imports` (FR-010, AC-15).
7. API aditiva: `/api/projects` ganha `production` (resumo: status, source_kind, imported_at, issue_counts, metrics) por projeto; rota nova `GET /api/projects/:name/production` com specs, issues e indicadores detalhados. Nenhum campo removido (FR-017).
8. UI mínima (fase final): selo de origem ("v2"/"SPECS.md"), contador de alertas por severidade e painel de indicadores no modal do projeto; sem vermelho (NFR-004).

Opções descartadas:
- Reescrever a ingestão da 006 dentro do novo módulo: descartado (AGENTS.md proíbe reescrever o funcional; v2 entra como camada anterior com fallback).
- Biblioteca de JSON Schema (Ajv): descartado (projeto sem dependências, NFR-001); validação manual em código, com a lista de regras testada pela SPEC-0008.
- Reutilizar `project_specs` para guardar tudo: descartado por perder horas/evidências/origem; `project_specs` continua recebendo o mapeamento legado para a UI atual.
- Lock de arquivo no projeto: descartado (FR-009 proíbe escrever; leitura truncada vira issue transitório).

## Mapa spec → código
| Requisito | Onde é atendido |
|---|---|
| FR-001 | `production.js: locateProductionFiles` + chamada em `scanner.js: scanCanonicalProject` |
| FR-002, FR-003 | `production.js: validateControl` |
| FR-004 | `production.js: validateReferences` (inclui detecção de ciclo por DFS) |
| FR-005 | `production.js: validateControl` / `validateEvents` (conjuntos de IDs) |
| FR-006, FR-007 | `production.js: parseEventsJsonl`, `validateEvents`, `reconcileControlAndEvents` |
| FR-008, FR-010, FR-011, FR-018 | `db.js: replaceProductionImport` + tabelas novas |
| FR-009 | só leituras em `production.js`; teste de não-escrita (SPEC-0008) |
| FR-012, FR-013 | `scanner.js: scanCanonicalProject` + `production.js: mapToLegacySpecs` |
| FR-014, FR-015, FR-016 | `production.js: computeProductionMetrics` |
| FR-017 | `server.js` (campo `production` e rota nova), `db.js: getProductionDetail`, `public/app.js` |
| NFR-002 | medição antes/depois com `npm run scan` (cronometrado) |
| NFR-003 | `try/catch` por projeto em `production.js` (devolve `status: 'rejected'`, nunca lança) |

## Arquivos
- Criar: `src/production.js`.
- Mexer: `src/db.js` (tabelas, `replaceProductionImport`, `getProductionDetail`, `getAllProjects` aditivo), `src/scanner.js` (apenas `scanCanonicalProject`: bloco de decisão v2 x 006), `src/server.js` (campo e rota), `public/app.js` e `public/index.html` (exibição mínima), `STATUS.md`, `CHANGELOG.md`, `DECISIONS.md` (decisões 1 a 5 da spec), `docs/production/*` (eventos e estado da própria SPEC-0007).
- **Não mexer:** o passo 5 de `consolidateSpecsAndActions` (ingestão da 006) além de nada; `src/evaluator.js`, `src/notebooklm.js`, `src/lan.js`; `start-silent.ps1`/`start.cmd` (outra IA, checkout principal); qualquer arquivo dentro de projetos monitorados; `docs/specs/006-*`.

## Riscos e regressões a vigiar
- Regressão na 006: projetos sem control.json devem produzir exatamente o que produziam (AC-3, AC-4). Mitigação: comparar `getAllProjects()` antes/depois num banco de teste.
- Performance: leitura de JSON grande por projeto a cada varredura. Mitigação: medir; cache por `mtime`+tamanho só se NFR-002 for violado.
- Dupla fonte de verdade (v2 x SPECS.md) divergente: política única "v2 vence" e issue informativo quando ambos existem e discordam.
- Arquivo lido durante gravação por outra IA: tratar como rejeição transitória, sem remover os dados já importados? [decisão no plan: em caso de `JSON_PARSE`, manter a última importação boa e registrar o issue; confirmar em T4].
- Mapeamento de categorias plural (v2) x singular (006): centralizar em uma tabela única para não divergir.
- O banco de teste hoje é o real (`new AppDb()`): os testes novos DEVEM usar `new AppDb(caminhoTemporario)` para não poluir (ver SPEC-0008).

## Estratégia de teste
Detalhada e implementada na SPEC-0008 (fixtures). Mapa AC → tipo:
| Cenário | Tipo | Como se prova |
|---|---|---|
| AC-1, AC-2, AC-3, AC-4 | funcional (scanner + banco temporário) | fixture de projeto em pasta temporária; comparar linhas do banco |
| AC-5, AC-6, AC-7, AC-8, AC-9, AC-16 | unitário (`production.js`) | fixtures inválidas, afirmar códigos de issue |
| AC-10, AC-11 | unitário (parser de eventos) | JSONL com linha corrompida e IDs repetidos |
| AC-12, AC-13 | funcional | duas varreduras/apagar banco e comparar dump normalizado |
| AC-14 | funcional | hash recursivo da pasta fixture antes/depois |
| AC-15 | funcional | consulta a `production_imports` |
| AC-17, AC-18, AC-19, AC-20 | unitário (`computeProductionMetrics`) | entradas com horas nulas; afirmar `null`, cobertura e "sem dado" |
| AC-21 | funcional | arquivo ilegível/gigante num projeto, outro projeto segue |
| NFR-002 | medição | `npm run scan` cronometrado antes/depois (mesmos comandos), registrado no handoff |
| UI (FR-017) | abrir a Dashboard e usar o selo/painel (regra de verificação do CLAUDE.md global; teste de tela só às 23:59 ou com o Alexandre longe, sem roubar foco) |

## Correções após a implementação (T7 a T12, 2026-11-14; o código real desmentiu o plano)
- **`categoryOf` existe** em `src/production.js` (categoria declarada quando válida; senão derivada do estado), junto de `uniqueSpecs`, `calcSummary`, `readSpecHours`, `collectTasks`, `normalizeBaseline`; o plano falava só em `mapToLegacySpecs` (CONFIRMED por leitura).
- **Tamanhos**: `src/db.js` tem 778 linhas e `src/scanner.js` 1238+ (CONFIRMED por `wc -l`); a numeração "605 linhas" era da base `e6d1178`.
- **Fallback de worktree (D-006) não existia antes da T7**: `scanCanonicalProject` só consolidava `SPECS.md` do principal e das worktrees. Agora `ProjectScanner.resolveProduction` lê o principal primeiro e, só se ele não tiver `production-control.json`, a primeira worktree por ordem de nome; nunca mescla (CONFIRMED pelo teste "D-006" da suíte).
- **Origem fora de `production_imports`**: projeto só com `SPECS.md` (ou sem nada) não tem linha de importação; a origem vive em `projects.specs_source` (coluna nova: `production_v2` | `production_v2_worktree` | `specs_md` | `none`), preenchida por `AppDb.setSpecsSource`. Não estava no plano original (AC-3 "origem registrada como SPECS.md").
- **Importação rejeitada** mantém a última importação boa (D-009) e guarda `last_good_at` em `production_imports` (coluna `last_good_at`, T5); nesse caso o scanner usa o fallback da 006 para os números (AC-5).
- **Indicadores** (T8): `computeProductionMetrics(control, events, baseline, {now, issues, eventStats})` é puro; o relógio entra só por `opts.now` (o scanner injeta `ProjectScanner(db, base, {now})`), sem relógio as idades ficam nulas. Campos opcionais lidos quando existirem: `started_at`, `accepted_at`/`completed_at`, `completed_points_equivalent` (por SPEC), `blockers[].kind|type` e `blockers[].since|created_at`, `acceptance_criteria|criteria|done_when` (por tarefa). Nenhum é obrigatório; sem eles o indicador mostra "sem dado".
- **API** (T9): `/api/projects` e `/api/projects/:name` ganham `production` (sempre presente; sem importação = `status: 'absent'`); rota nova `GET /api/projects/:name/production` (404 só se o projeto não existe; sem importação devolve `import: null`).
- **UI** (T10): funções puras em `public/production-ui.js` (carregado antes de `app.js`), selo de origem no card e na tabela, contagem de alertas, painel no topo da aba "Roadmap SDD" do modal. "Abrir a Dashboard e usar" está NOT TESTED (regra de foco); a validação foi por HTML/JS servido em memória e execução do JS em `vm`.
- **Não implementado**: o issue informativo "SPECS.md diverge do control.json quando ambos existem" (risco listado acima). A política "v2 vence" está implementada e testada; só o aviso de divergência ficou de fora.
- **Descoberta (fora de escopo, não tocada)**: `POST /api/projects/register` chama `scanner.scanSingleProject`, que não existe em `ProjectScanner` (CONFIRMED por `grep -n scanSingleProject src/scanner.js`: sem definição).

## Histórico
- 2026-11-14 — Rascunho.
- 2026-11-14 — Correções pós-implementação (T7 a T12).
