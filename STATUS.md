# Status do Projeto — AppDevelopmentControl

## O que está PRONTO e FUNCIONANDO
- **Versão BE/FE no Cabeçalho + Trava de Publicação (SPEC-0011)** — PRONTO PARA `/ship` (`feature/be-fe-version-badge`):
  - `BE v1.1.0` (`package.json` via `GET /api/status`) e `FE v1.1.0` (`public/js/version.js`) exibidos no cabeçalho junto à hora exata da última atualização (`Atualizado às HH:MM:SS`), com alerta âmbar se divergirem.
  - Trava `tools/check-version-bump.mjs` + `tools/publish.ps1` e comando `Publicar` no `AGENTS.md`: bloqueiam publicação sem bump de versão ou sem commit.
- **Clareza Real, Limpeza e Profissionalização LAN (SPEC-0010)** — EM VALIDAÇÃO (`feature/claude-imports`, `npm test` 4/4 suítes verdes):
  - Correção `/api/rescan` → `/api/scan` e `404` JSON para qualquer `/api/*` inexistente.
  - Fim do falso `done` em `spec.md` apenas aprovada; `buildStepper` sem mangling `FSPEC-`; sinais de `production_v2` integrados no farol de saúde.
  - Visibilidade de alterações não commitadas em worktrees (`worktree_dirty_count`) e detector de divergências docs vs Git (`divergence_alerts`).
  - Snapshots diários (`portfolio_snapshots`, `GET /api/snapshots`), auto-scan em background (`GET /api/status`) e trava de raízes autorizadas em `POST /api/projects/register`.
  - Frontend 100% offline na LAN (`public/vendor/` com Tailwind, Lucide e Chart.js locais), toasts sem `alert()`, event delegation, e ordenação por Prioridade Executiva.
  - Limpeza de código morto (`parseSpecsIndex`, `.spin`, 28 `ALTER TABLE` cegos substituídos por `PRAGMA user_version`) e remoção de `test/temp-close-1795281550577.db` e `debug.log`.
- **Ingestão do controle de produção v2 (SPEC-0007) e sua suíte (SPEC-0008)** — EM VALIDAÇÃO, branch `feature/ingestao-producao-v2` (sem push, sem merge na main). Estado por critério de aceite: `docs/agents/handoffs/2026-11-14_0050_claude_ingestao-producao-v2.md`.
  - *Leitura somente leitura* de `docs/production/` (control, eventos, baseline) de cada projeto, sem nunca escrever neles; erro isolado por projeto (CONFIRMED: `npm test`, testes AC-14/AC-21/AC-22 e hash de pasta).
  - *Validação* de schema, valores (pontos Fibonacci, datas, percentuais), referências, duplicidades, ciclos, eventos (linha corrompida, repetido, de outro projeto, órfão) e declarado x calculado.
  - *Banco derivado e reconstruível*: tabelas `production_*` em transação, idempotentes; importação rejeitada mantém a última boa (D-009).
  - *Prioridade*: v2 aceito vence o `SPECS.md` da spec 006; principal vence worktree (D-006); `alexandreActions` preservadas; origem em `projects.specs_source`.
  - *Indicadores* §11 e §12 (produção, esforço com cobertura, previsibilidade, fluxo, bloqueios, qualidade do controle, baseline): horas nulas permanecem nulas ("sem dado").
  - *API aditiva*: `production` em `/api/projects` e `GET /api/projects/:name/production`. *UI mínima*: selo de origem, contagem de alertas e painel de indicadores no modal (sem vermelho).
  - **NOT TESTED**: abrir a Dashboard e usar o selo/painel (teste de tela só depois das 23:59 e sem roubar foco); a UI foi validada só por HTML/JS servido em memória e execução do JS em `vm`.
  - Varredura real (`npm run scan`, 26 projetos): mediana 20721 ms antes e 18868 ms depois (3 execuções cada), sem regressão; 4 projetos reais têm control.json rejeitado por falta de blocos obrigatórios (DevToolchain, KillTask, OneToOneSupport, SmartDockGroups) e 1 tem 15 eventos incompletos (FolderOrganAIzer): são problemas dos arquivos desses projetos, sinalizados pela própria Dashboard.
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
- **Suíte de Testes Automatizados**: `npm test` roda `test/test_all.mjs` (suítes da Dashboard) e `test/test_production_v2.mjs` (SPEC-0008: ingestão v2, banco temporário, fixtures por código).

## Limitações Conhecidas
- **Testes E2E com navegador headless (Playwright)**: `NOT TESTED` (o projeto possui cobertura completa de lógica, endpoints REST, scanner, SQLite e renderização via testes unitários/integração).
- **Acesso externo fora da LAN**: Fora de escopo propositalmente por segurança (o serviço é estritamente local/LAN).
