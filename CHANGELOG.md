# Changelog

Todas as alterações relevantes deste projeto são documentadas aqui.
O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/).

## [Não lançado] - 2026-11-13 (Protocolo de Produção v2)

### Documentação
- Adotado o Protocolo de Controle de Produção v2: `docs/production/` (controle JSON, eventos, baseline, índice) e `docs/specs/SPECS.md` regenerado (8 specs, 37 pts); SPEC-0007 e SPEC-0008 registradas na fila. Nenhum código alterado.

## [2.2.0] - 2026-11-08 (Spec 005 — Data Truth, Empirical Audit & Resilient Governance)

### Corrigido e Aprimorado
- **Correção Crítica de Parâmetros SQL**: Injeção correta de `(p.name)` e `(name)` em `getAllProjects()` e `getProjectByName()` no `src/db.js`, restaurando worktrees vinculadas, stepper, specs detalhadas e commits recentes na API e na UI.
- **Eliminação de Falsos Positivos em Ações do Alexandre**: Filtro estrito que ignora registros de aprovação histórica (`Estado: **APROVADA** pelo Alexandre`, `autorizado pelo Alexandre`) e foca unicamente em bloqueios e deliberações ativas.
- **Suporte a Caminhos Alternativos de Governança**: Descoberta e extração de decisões pendentes reais (`PENDING DECISION`) em `docs/12-decisoes.md`, `docs/decisoes.md` e bloqueios ativos em `docs/qualidade/FILA.md` e `FILA.md`.
- **Reconhecimento Flexível de Specs e Continuidade**: Suporte a status formal em tabelas de `plano/STATUS.md`, cabeçalhos de `spec.md` e inferência de fase atual (`current_phase`) e próxima ação (`next_action`) em projetos sem `AGENT_CONTEXT.md` na raiz.
- **Suíte de Testes Expandida**: 10/10 suítes completas de aceite validadas em `test/test_all.mjs`.

## [2.1.0] - 2026-11-07 (Spec 004 — Project Spotlight, Quick Selector & Situational Clarity)

### Adicionado
- **Seletor Rápido de Projetos no Topo**: Dropdown estilizado `#spotlight-project-select` com busca, botões Anterior/Próximo e persistência no `localStorage`.
- **Painel Destaque Situacional (Spotlight Hero)**: Apresentação da Tríade de Clareza Situacional:
  - *Onde Parou*: Último marco entregue, commit recente com autor/IA, tag de versão e propósito executivo.
  - *Onde Está Agora*: Fase ativa em destaque, Stepper visual de specs (`[✓ F069] -> [✓ F086] -> [⏳ F088 (80%)] -> [⚪ F052]`), integridade da árvore e pontuação SDD.
  - *O Que Vem a Seguir*: Próxima ação concreta e bloco de Atenção Crítica em destaque âmbar para ações que aguardam o Alexandre.
  - *Barra de Ação Rápida & Radar*: Comandos rápidos de desenvolvimento (`mkfile`, `start.cmd`, `npm test`) com cópia em 1-clique e radar de worktrees ativas.
- **Visualização em Pipeline / Funil de Maturidade**: Modo Kanban de 5 estágios (`1. Planejamento`, `2. Em Desenvolvimento`, `3. Validação & Bloqueio`, `4. Publicado & Estável`, `5. Hibernando`), com contadores e cards interativos sincronizados com o Spotlight.
- **Interação Rápida "Focar"**: Botão nos cards do grid e na tabela densa para selecionar e focar instantaneamente no Spotlight Hero.
- **Suíte de Testes Automatizados Expandida**: 9 suítes completas de aceite validadas em `test/test_all.mjs`.

## [Não lançado] - 2026-11-14 (SPEC-0007 e SPEC-0008 — Ingestão do controle de produção v2)

### Adicionado
- **Leitura do protocolo de produção v2**: lê `docs/production/production-control.json`, `production-events.jsonl` e `production-baseline.json` de cada projeto (somente leitura), valida schema, valores, referências, duplicidades, ciclos e eventos, e guarda tudo em tabelas `production_*` reconstruíveis (idempotentes, em transação).
- **Prioridade v2**: com controle v2 aceito, pontos, estados e categorias vêm dele; sem ele, a ingestão do `SPECS.md` (spec 006) segue como antes. Principal vence worktree; ações do Alexandre preservadas.
- **Indicadores gerenciais** (§11 e §12 do protocolo) com "sem dado" para o desconhecido.
- **API**: campo aditivo `production` em `/api/projects` e `/api/projects/:name`; rota nova `GET /api/projects/:name/production`.
- **UI**: selo de origem (v2, v2 · worktree, SPECS.md), contagem de alertas e painel de indicadores no modal do projeto.
- **Testes**: `test/test_production_v2.mjs` (fixtures por código, banco temporário) encadeado no `npm test`; `tools/perf/scan-timing.ps1` cronometra a varredura.

### Alterado
- `createServer(deps)` aceita banco e scanner injetados; importar `src/server.js` não abre mais o banco real.
- `projects.specs_source` (coluna nova) registra a origem dos números de specs.

## [2.0.0] - 2026-11-04 (Spec 003 — Deep Executive Intelligence & Technical Portfolio Depth)

### Adicionado
- **Detecção Automática de Stack Tecnológica**: Classificação de cada aplicação em C# / WinUI 3, Delphi (VCL/FMX), .NET / C# + Vite / React, Electron / Node.js, Flutter / Dart, TypeScript, Python e Scripts.
- **Metadados de Continuidade e Governança**: Leitura estruturada de `AGENT_CONTEXT.md` capturando `OBJECTIVE`, `CURRENT PHASE` e `NEXT ACTION`.
- **Rastreabilidade Git em Profundidade**: Extração dos 5 últimos commits reais de cada projeto, com autor, data relativa e identificação da IA/humano (`AGY`, `Claude`, `Alexandre`).
- **Status da Árvore de Trabalho**: Monitoramento de integridade da working tree (`clean` vs quantidade de arquivos modificados/uncommitted).
- **Dupla Visualização na UI**: Toggle entre Cards Executivos Enriquecidos e Tabela Densa de Portfólio (Data Table).
- **Modal de Detalhes Profundos em 4 Abas**: Navegação fluida entre Ficha Técnica & Arquitetura, Git & Commits Recentes, Roadmap SDD com tarefas e Pendências do Alexandre.
- **Saneamento e Purga Automática**: Exclusão de registros órfãos de projetos que deixaram de existir no disco.
- **Testes Automatizados Expandidos**: 8 suítes completas de aceite validadas em `test/test_all.mjs`.

## [1.1.0] - 2026-10-27 (Spec 002 — Portfolio Health & Executive Direction Engine)
- **Farol de Saúde Gerencial**: Classificação em Em Tração, Bloqueado, Estável, Em Risco e Incubação.
- **SDD Maturity Score (0-100%)**: Indicador ponderado de maturidade documental.

## [1.0.0] - 2026-10-26 (Spec 001 — Executive LAN Dashboard)
- Versão inicial do AppDevelopmentControl na porta 3333.
