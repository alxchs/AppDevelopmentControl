# Tasks 006 — Ingestão Nativa de SPECS.md, Pesos de Dificuldade e Distribuição por Categorias

- [ ] **T1: Migração de Schema no SQLite (`src/db.js`)**
  - Adicionar colunas `total_points`, `done_points`, `specs_summary_json` na tabela `projects`.
  - Adicionar colunas `weight`, `category` na tabela `project_specs`.
  - Atualizar `upsertProject`, `saveSpecs` e `getKpis()` para persistir e somar os novos campos.
  - Atende: FR-005, AC-1, AC-4.

- [ ] **T2: Implementar Parsing de SPECS.md e Pesos no Scanner (`src/scanner.js`)**
  - Implementar método para localizar e ler `docs/specs/SPECS.md` ou `SPECS.md`.
  - Extrair bloco JSON de métricas (`total_specs`, `total_pontos`, `finalizadas`, etc.).
  - Extrair tabela mestra de specs com pesos e categorias.
  - Extrair diretiva `Peso: X` no cabeçalho de `spec.md` individuais.
  - Atende: FR-001, FR-002, FR-003, FR-004, AC-1, AC-2, AC-3.

- [ ] **T3: Atualização da UI e Renderização de Pontos (`public/app.js` e `public/index.html`)**
  - Exibir badge com pontos (ex: `137/169 pts`) nos cards de projetos e no Spotlight Hero.
  - Exibir badge de peso individual em cada passo do Stepper e na lista de specs do Modal.
  - Exibir pill com resumo de categorias (Finalizadas, Em andamento, Fila, Alexandre, Impedidas).
  - Garantir ausência total de vermelho na paleta de cores.
  - Atende: FR-006, AC-5, AC-6.

- [ ] **T4: Testes Automatizados e Validação da Suíte (`test/test_all.mjs`)**
  - Criar testes para validar extração de `SPECS.md`, pesos e persistência SQLite.
  - Garantir 100% de aprovação na suíte de testes.
  - Atende: Critérios de sucesso.

- [ ] **T5: Execução da Varredura Real (`cli-scan.js`) e Inicialização Silenciosa do Servidor**
  - Executar scan completo do portfólio no banco `app_development_control.db`.
  - Garantir reinicialização limpa do servidor em segundo plano na porta 3333 via `start-silent.ps1`.
  - Atualizar controle mestre `docs/specs/SPECS.md`.
  - Atende: Entrega final.
