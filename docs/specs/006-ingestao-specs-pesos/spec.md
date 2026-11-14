# Spec 006 — Ingestão Nativa de SPECS.md, Pesos de Dificuldade e Distribuição por Categorias

Status: APROVADA (Alexandre / AGY, 2026-11-12)
Peso: 3 (Escala Fibonacci: Médio)
Fonte da verdade do comportamento. Sem tecnologia, arquivo ou classe aqui: isso é do `plan.md`.

---

## 1. Por quê
O Alexandre estabeleceu como regra mandatória global (METODO.md §25) que todos os projetos devem registrar suas especificações com Peso de Dificuldade na escala Fibonacci (1, 2, 3, 5, 8) e catalogá-las no arquivo mestre `docs/specs/SPECS.md`, contendo métricas resumidas e distribuição por categorias (Finalizadas, Em andamento, Fila, Dependendo de mim, Impedidas, Inválidas).
Para que a dashboard de projetos (`AppDevelopmentControl`) cumpra seu objetivo primordial de dar clareza executiva e funcionalidade real ao Alexandre, ela deve ingerir nativamente esses arquivos `SPECS.md` e os pesos das specs, exibindo pontos acumulados, progresso ponderado por complexidade e distribuição visual de categorias.

---

## 2. Histórias de Usuário (por prioridade)
- **US1 (P1):** Como Alexandre, quero abrir a dashboard e visualizar quantos Story Points / Peso de Dificuldade cada projeto possui no total e quantos já foram concluídos, para ter uma visão real de esforço entregue e restante além da contagem bruta de arquivos.
- **US2 (P1):** Como Alexandre, quero ver a distribuição das categorias de specs (Finalizadas, Em andamento, Fila, Dependendo de mim, Impedidas e Inválidas) no card do projeto e no modal de detalhes.
- **US3 (P2):** Como Alexandre, quero que projetos que utilizam o formato `docs/specs/SPECS.md` (como o Vivere e o próprio AppDevelopmentControl) sejam reconhecidos automaticamente na varredura sem nenhuma configuração manual.
- **US4 (P2):** Como Alexandre, quero que projetos legados que ainda não possuem `SPECS.md` continuem funcionando sem quebras, com fallback gracioso para a contagem tradicional de tarefas e detecção de `Peso: X` no cabeçalho do `spec.md` quando existir.

---

## 3. Cenários de Aceite

| ID | Dado | Quando | Então |
|---|---|---|---|
| **AC-1** | Um projeto possui `docs/specs/SPECS.md` com bloco JSON de métricas | O scanner executa a varredura do projeto | O scanner extrai `total_pontos`, `finalizadas`, `em_andamento`, `fila`, `dependendo_alexandre`, `impedidas`, `invalidas` e persiste no SQLite. |
| **AC-2** | Um projeto possui `docs/specs/SPECS.md` com tabela de specs contendo coluna de Peso | O scanner processa as specs do projeto | Cada spec registrada no SQLite recebe seu `weight` (1, 2, 3, 5, 8) e `category`. |
| **AC-3** | Uma spec individual possui campo `Peso: 5` no cabeçalho de seu `spec.md` | O scanner processa a pasta da spec | A spec armazena o peso 5 mesmo se o projeto não tiver `SPECS.md` consolidado. |
| **AC-4** | A rota `/api/projects` ou `/api/kpis` é chamada | A requisição GET é atendida | O payload inclui `total_points`, `done_points`, `specs_summary` e `kpis.totalPoints` / `kpis.donePoints`. |
| **AC-5** | A dashboard é carregada no navegador | Os cards e o Spotlight Hero são exibidos | Aparece o indicador de pontos ponderados (ex: `137/169 pts`) e barras/pills com as categorias de specs. |
| **AC-6** | Nenhum elemento visual utiliza vermelho | A interface é renderizada | As cores seguem rigorosamente a paleta permitida (Slate, Indigo, Amber, Emerald, Navy, Sky). |

---

## 4. Requisitos
- **FR-001:** O scanner DEVE identificar a presença de `docs/specs/SPECS.md` ou `SPECS.md` na raiz do repositório ou em worktrees vinculadas.
- **FR-002:** O scanner DEVE efetuar o parse do bloco JSON contido em `SPECS.md`, extraindo totais de specs e pontos por categoria.
- **FR-003:** O scanner DEVE extrair a tabela de specs contendo ID, Peso e Categoria, mapeando para o catálogo de specs do banco de dados.
- **FR-004:** O scanner DEVE extrair a diretiva `Peso: <1|2|3|5|8>` do cabeçalho de qualquer `spec.md` inspecionado como fallback.
- **FR-005:** O banco de dados DEVE persistir colunas `total_points`, `done_points`, `specs_summary_json` na tabela `projects` e `weight`, `category` na tabela `project_specs`.
- **FR-006:** O frontend DEVE renderizar os pontos e badges de categorias de forma limpa, moderna e sem uso de vermelho.
- **NFR-001:** Zero impacto de performance: a extração de `SPECS.md` deve ser feita em memória via regex rápido sem bibliotecas externas pesadas.
- **NFR-002:** 100% offline e autocontido: funciona na rede local sem dependência de internet.

---

## 5. Casos de Borda
- **SPECS.md sem bloco JSON:** O scanner deve fazer o parse da tabela markdown de specs e calcular a soma dos pesos diretamente.
- **Projeto sem SPECS.md:** O projeto continua sendo exibido com as métricas tradicionais de specs/tarefas sem valores nulos quebrando a UI.
- **Worktree com SPECS.md mais recente:** Se uma worktree contiver `SPECS.md` com mais specs concluídas que o principal, suas métricas enriquecem o projeto principal consolidado.

---

## 6. Fora de Escopo
- Edição de specs diretamente pela interface web (a edição permanece estritamente nos arquivos do repositório).
- Integração com Jira, Trello ou serviços externos de gestão de projetos.

---

## 7. Critérios de Sucesso
- Executar `cli-scan.js` e comprovar a captura de pontos e categorias do `Vivere` e do `AppDevelopmentControl`.
- Suíte de testes `test/test_all.mjs` cobrindo o novo algoritmo com 100% de sucesso.
- Servidor ativo em `http://localhost:3333` exibindo a dashboard atualizada.
