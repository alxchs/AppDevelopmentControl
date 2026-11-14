# SPEC-0008 (pasta 008) — Testes da ingestão v2 — PLAN

Status: APROVADO (Claude, 2026-11-14) (rascunho de 2026-11-14). Só começa com a `spec.md` APROVADA e depende do plan da SPEC-0007.

## Arquitetura atual (lida no código)
- `package.json`: `"test": "node test/test_all.mjs"`, projeto ESM sem dependências (CONFIRMED).
- `test/test_all.mjs` (284 linhas): script linear com `assert` do Node, seções numeradas por `console.log`, abre `new AppDb()` (banco real resolvido por `resolveDbPath`) e `ProjectScanner` sobre `c:\desenv\utils` (CONFIRMED: lido o início e a estrutura de seções; o comportamento exato de `resolveDbPath` não foi relido em detalhe: INFERRED que escolhe um caminho gravável, com teste `CREATE TABLE _test`).
- `AppDb(customPath)` aceita caminho próprio (CONFIRMED em `src/db.js` linhas 10-14): permite banco temporário.
- `ProjectScanner(db, baseDir)` recebe `db` e `baseDir` (CONFIRMED linha 13): permite apontar o scanner para uma pasta temporária; `scanCanonicalProject(projectDef)` aceita `{name, path, worktrees, isCustom}` diretamente (CONFIRMED), então basta passar a pasta da fixture sem varrer `c:\desenv\utils`.
- Exemplo real somente leitura: `C:\desenv\utils\PDFReader\docs\production\` (CONFIRMED existe e foi lido).

## Abordagem
- **Arquivo novo `test/test_production_v2.mjs`** + pequeno helper `test/fixtures-production.mjs` (gera fixtures por código; sem arquivos .json estáticos grandes no repositório, para a fixture ser legível e parametrizável). `package.json` `test` passa a `node test/test_all.mjs && node test/test_production_v2.mjs` (a suíte antiga fica intocada).
- Helper de fixtures: `makeProject(tmpRoot, name, {control, events, baseline, specsMd})` escreve os arquivos em `<tmp>/<name>/docs/production/`; builders `validControlMin()`, `validControlFull()` e mutadores (`withPoints(c, id, v)`, `withDuplicateSpec`, `withBrokenDep`, `withCycle`, `withoutEvidence`, `withSchema('1.0')`, `truncateJson`). Datas fixas.
- Raiz temporária: `os.tmpdir()/claude/<GUID>/desenv/utils/AppDevelopmentControl/test-production-v2/` (convenção do METODO.md §12) criada por execução e apagada em `finally`.
- Banco: `new AppDb(path.join(tmpRoot, 'test.db'))`; nunca `new AppDb()`.
- Execução sem janela: o teste é um script Node comum; ao rodá-lo, usar processo oculto (`Start-Process -WindowStyle Hidden`/`-NoNewWindow`) conforme regra de foco.
- Pequeno runner interno: função `check('AC-n ...', fn)` que acumula aprovado/reprovado/pulado e imprime a tabela por AC no fim (FR-008); sai com código 1 se houver reprovado.
- Não-escrita (AC-21): função `hashTree(dir)` (SHA-256 recursivo de caminhos+conteúdos) antes e depois; mesmo para o projeto real do AC-23.
- Idempotência (AC-18/19): `dumpProduction(db, project)` consulta as tabelas de produção, remove `imported_at`, ordena e serializa; comparar strings.
- Mutação manual (critério de sucesso): registrada no handoff com o defeito introduzido e o teste que falhou (não automatizada).
- Medição (AC-25): script `tools/perf/scan-timing.ps1` (novo, pequeno) que roda `node src/cli-scan.js` N vezes ocultas e registra mediana; rodado em `e6d1178` (antes) e no fim (depois), mesma máquina e mesmo comando.

Opções descartadas: framework externo (jest/vitest): projeto sem dependências e risco de console efêmero (§21 item 6); fixtures .json estáticas: difíceis de variar e de revisar; editar `test_all.mjs`: mistura bancos real/temporário.

## Mapa spec → código
| Requisito | Onde é atendido |
|---|---|
| FR-001, FR-005 | `test/fixtures-production.mjs` (`makeProject`, datas fixas, `finally` de limpeza) |
| FR-002 | `test/test_production_v2.mjs` (`new AppDb(tmp)`) |
| FR-003, FR-008 | runner `check('AC-n ...')` e tabela final |
| FR-004 | conjunto de casos T3 a T8 abaixo |
| FR-006 | forma de execução (processo oculto) e ausência de `child_process` com janela nos testes |
| FR-007 | teste AC-23 com `existsSync` e `skip` explícito |
| NFR-002 | `package.json` encadeia; `test_all.mjs` intocado |

## Arquivos
- Criar: `test/test_production_v2.mjs`, `test/fixtures-production.mjs`, `tools/perf/scan-timing.ps1`.
- Mexer: `package.json` (script `test`), `STATUS.md`, `docs/production/*`, handoff.
- **Não mexer:** `test/test_all.mjs`; `src/*` (é da SPEC-0007; defeito encontrado vira issue na 0007, não correção aqui); projetos monitorados; `start-silent.ps1`.

## Riscos e regressões a vigiar
- Teste que passa sem provar nada (asserção frouxa): exigir asserção do **código** de problema exato e do valor numérico, e o teste de mutação manual.
- Dependência do relógio/ordem do sistema de arquivos: ordenar listas antes de comparar.
- Limpeza que apaga pasta errada: apagar apenas a raiz com o GUID gerado na própria execução, validando que o caminho começa pelo `os.tmpdir()` e contém o GUID.
- Teste do projeto real mudar com a evolução do controle do PDFReader: AC-23 compara com o `summary.total_points` do **próprio** arquivo, não com número fixo.

## Estratégia de teste
Este plan é a própria estratégia; cada AC tem um teste nomeado:
| Cenário | Tipo | Como se prova |
|---|---|---|
| AC-1, AC-2 | funcional | afirmar que raiz temporária e `db.dbPath` ficam sob `os.tmpdir()`; pasta some no fim |
| AC-3, AC-4 | unitário + funcional | valores conferidos à mão (comentados no teste) |
| AC-5 a AC-15 | unitário | `assert.deepStrictEqual` dos códigos de issue (ordenados) |
| AC-16, AC-17, AC-22 | funcional (scanner com `scanCanonicalProject`) | pastas fixture, banco temporário |
| AC-18, AC-19 | funcional | `dumpProduction` igual nas duas rodadas |
| AC-20 | unitário | `computeProductionMetrics` com `null` |
| AC-21 | funcional | `hashTree` antes/depois |
| AC-23 | funcional somente leitura | pulo explícito se ausente |
| AC-24 | regressão | `npm test` com saída 0 |
| AC-25 | medição | `tools/perf/scan-timing.ps1` antes e depois |

## Histórico
- 2026-11-14 — Rascunho.
