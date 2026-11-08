# Status do Projeto — AppDevelopmentControl

## O que está PRONTO e FUNCIONANDO
- **Veracidade dos Dados do Portfólio & Resiliência Documental (Spec 005)**:
  - *Correção Crítica de Binds SQL*: Binds parametrizados corrigidos em `db.js` (`(p.name)` e `(name)`), restaurando o preenchimento de worktrees, specs, recent commits e stepper para todos os projetos da dashboard.
  - *Eliminação de Falsos Positivos de Ações do Alexandre*: Filtro estrito que descarta menções históricas passadas (`Estado: **APROVADA** pelo Alexandre`, `autorizado pelo Alexandre`) e foca unicamente em deliberações e bloqueios ativos.
  - *Caminhos Alternativos de Governança*: Descoberta e extração de decisões pendentes reais (`PENDING DECISION`) em `docs/12-decisoes.md`, `docs/decisoes.md` e bloqueios ativos `[BLOQUEADO]` em `docs/qualidade/FILA.md`.
  - *Reconhecimento Inteligente de Specs e Continuidade*: Identificação de status de aprovação no cabeçalho de specs e tabelas de status (`plano/STATUS.md`), elevando a precisão da taxa de entrega dos projetos.
- **Project Spotlight Hero & Seletor Rápido de Topo (Spec 004)**: Seletor no topo da dashboard com dropdown estilizado, botões Anterior/Próximo e atalho no `localStorage`, acompanhado do painel hero com a Tríade de Clareza Situacional:
  - *1. Onde Parou*: Último marco entregue, commit com autor/IA, tag de release e propósito executivo.
  - *2. Onde Está Agora*: Fase ativa em destaque, Stepper visual de specs (`[✓ F069] -> [✓ F086] -> [⏳ F088 (80%)] -> [⚪ F052]`), integridade da árvore e pontuação SDD.
  - *3. O Que Vem a Seguir*: Próxima ação concreta e bloco de Atenção Crítica em âmbar listando deliberações ativas aguardando o Alexandre.
  - *Barra de Ação Rápida & Radar*: Comandos de desenvolvimento (`mkfile`, `start.cmd`, `dotnet test`, `npm test`) copiáveis com 1-clique e radar de worktrees paralelas ativas.
- **Modo Pipeline de Estágios / Funil de Maturidade (Spec 004)**: Visualização em 5 colunas temáticas (`1. Planejamento`, `2. Em Desenvolvimento`, `3. Validação & Bloqueio`, `4. Publicado & Estável`, `5. Hibernando`), com contadores e cards interativos sincronizados com o Spotlight.
- **Detecção Automática de Stack Tecnológica**: Identificação de Delphi, C# / WinUI 3, C# / .NET, Flutter / Dart, Electron / Node.js, TypeScript, Python e Scripts.
- **Metadados de Continuidade e Propósito Real**: Extração de `OBJECTIVE`, `CURRENT PHASE` e `NEXT ACTION` a partir de `AGENT_CONTEXT.md`, `AGENTS.md`, `plano/STATUS.md` e `FILA.md`.
- **Rastreabilidade Git em Profundidade**: Mapeamento dos 5 últimos commits com identificação de IA (`AGY`, `Claude`, `Alexandre`) e status de integridade da árvore local (`clean` vs `uncommitted count`).
- **Saneamento e Integridade do Portfólio**: Purga de registros órfãos de pastas excluídas/renomeadas e consolidação automática de worktrees.
- **Tripla Visualização do Portfólio**: Cards Executivos, Pipeline / Funil de Estágios e Tabela Densa de Portfólio.
- **Modal de Detalhes Profundos em 4 Abas**: Ficha Técnica, Git & Commits, Roadmap SDD e Pendências do Alexandre.
- **Métricas de Saúde e SDD Maturity Score (0-100%)**: Avaliação automatizada de maturidade metodológica e farol gerencial.
- **Busca Autocontida (Zero Tokens)**: Busca fuzzy em memória + SQLite FTS5 instantânea.
- **Exportação para Google NotebookLM**: Dossiê executivo completo exportado com um clique.
- **Suíte de Testes Automatizados**: 10/10 suítes com 100% de sucesso em `test/test_all.mjs`.

## Limitações Conhecidas
- **Testes E2E com navegador headless (Playwright)**: `NOT TESTED` (o projeto possui cobertura completa de lógica, endpoints REST, scanner, SQLite e renderização via testes unitários/integração).
- **Acesso externo fora da LAN**: Fora de escopo propositalmente por segurança (o serviço é estritamente local/LAN).
