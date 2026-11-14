# Plan 006 — Ingestão Nativa de SPECS.md, Pesos de Dificuldade e Distribuição por Categorias

## 1. Arquitetura Atual vs Proposta
- **Atual:**
  - O scanner busca subpastas em `docs/specs/` e conta tarefas em `tasks.md` (`- [x]` vs `- [ ]`).
  - Não existe conceito de Story Points / Peso de Dificuldade no banco de dados SQLite nem na interface.
  - O resumo executivo de `SPECS.md` criado pelo novo padrão METODO.md §25 é ignorado.
- **Proposta:**
  - `src/db.js`: Adicionar migrações de colunas para `projects` (`total_points INT DEFAULT 0`, `done_points INT DEFAULT 0`, `specs_summary_json TEXT`) e `project_specs` (`weight INT DEFAULT 1`, `category TEXT DEFAULT 'pending'`).
  - `src/scanner.js`: Implementar método `parseSpecsControl(projectPath)` que lê `docs/specs/SPECS.md` ou `SPECS.md`, extraindo o bloco JSON e a tabela de specs com pesos.
  - `src/scanner.js`: Integrar no fluxo de `consolidateSpecsAndActions` para enriquecer cada spec com seu peso e status refinado.
  - `src/db.js`: Atualizar `getKpis()` para agregar também `totalPoints` e `donePoints` globais.
  - `public/app.js` e `public/index.html`: Exibir indicadores de pontos nos cards, Spotlight Hero e Modal de Specs.

## 2. Arquivos a Mexer
- `src/db.js` — migrações de schema, upsert com colunas de pontos e kpis agregados.
- `src/scanner.js` — detecção e extração de `docs/specs/SPECS.md`, parsing de JSON e tabela de pesos.
- `public/index.html` — elementos visuais para pontos nos cards e modais.
- `public/app.js` — renderização de badges de peso, pontos e barras de progresso ponderadas.
- `test/test_all.mjs` — testes automatizados da Spec 006.

## 3. Arquivos a NÃO Mexer
- `src/lan.js`, `src/notebooklm.js`, `src/evaluator.js` (a lógica central de rede e avaliação permanece estável).

## 4. Estratégia de Teste por AC
- **AC-1:** Testar leitura de `SPECS.md` do Vivere e AppDevelopmentControl com extração do JSON.
- **AC-2:** Testar associação de `weight` e `category` em `project_specs`.
- **AC-3:** Testar extração de `Peso:` em `spec.md` isolado.
- **AC-4:** Testar rotas `/api/projects` e `/api/kpis` retornando os pontos.
- **AC-5/6:** Testar conformidade visual sem vermelho.
