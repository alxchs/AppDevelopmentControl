# PLAN-005: Plano de Arquitetura para Veracidade dos Dados e Resiliência Documental

## 1. Ajustes em `src/db.js`
- Localizar todas as chamadas `this.db.prepare(...).all()` dentro de `getAllProjects()` e `getProjectByName(name)`.
- Injetar o argumento `p.name` e `name` em todas as consultas parametrizadas com `WHERE project_name = ?`.
- Garantir que `p.stepper` seja gerado a partir de `rawSpecs` já populadas.

## 2. Ajustes em `src/scanner.js`
- **Filtro de Falsos Positivos em Specs**:
  - Antes de registrar ação para o Alexandre em `spec.md`, validar:
    - Se a linha contiver `APROVADA|autorizado|aprovado pelo Alexandre|aprovada pelo Alexandre`, descartar (é histórico).
    - Somente aceitar `PENDING DECISION`, `[ ] Aguardando Alexandre`, ou `Aguardando Alexandre` quando não for linha de aprovação passada.
- **Leitura de Decisões em Caminhos Alternativos**:
  - Adicionar lista de candidatos para decisões:
    `['DECISIONS.md', 'docs/12-decisoes.md', 'docs/decisoes.md', 'docs/DECISIONS.md']`.
  - Processar cada arquivo existente extraindo itens `PENDING DECISION`.
- **Leitura de Bloqueios em `FILA.md`**:
  - Procurar por `docs/qualidade/FILA.md` e `FILA.md`.
  - Extrair linhas contendo `[BLOQUEADO]` que mencionem o Alexandre ou dependam dele.
- **Detecção de Status de Specs**:
  - Verificar se `spec.md` contém no cabeçalho `Estado:\s*\*\*APROVADA\*\*` ou similar. Se sim, marcar status como `done`.
  - Se houver `plano/STATUS.md`, ler a tabela de fichas e associar os estados `✅` como `done`, `🟦` como `in_progress`, etc.
- **Inferência de Continuidade**:
  - Se `AGENT_CONTEXT.md` não existir, inspecionar `plano/STATUS.md` e `docs/qualidade/FILA.md` para extrair a fase atual (última ficha `🟦` ou `✅`) e próxima ação.

## 3. Testes em `test/test_all.mjs`
- Adicionar suíte de teste da Spec 005 validando:
  - Recuperação correta de worktrees e specs no retorno de `getProjectByName` e `getAllProjects`.
  - Não inclusão de menções de "APROVADA pelo Alexandre" como pendências ativas.
  - Inclusão correta de `PENDING DECISION` a partir de `docs/12-decisoes.md`.
  - Sucesso 100% de `npm test`.
