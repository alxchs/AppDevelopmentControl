# 001 — AppDevelopmentControl (Local LAN Projects Dashboard) — SPEC

Status: APROVADA (Alexandre / Agente, 2026-10-26).
Fonte da verdade do **comportamento** e regras de negócio.

---

## 1. Contexto e Motivação
Na pasta `c:\desenv\utils` residem diversas aplicações, ferramentas e worktrees. O sistema **AppDevelopmentControl** fornece uma visão executiva consolidada em tempo real para acompanhamento gerencial e estratégico do portfólio de desenvolvimento, acessível via navegador em qualquer dispositivo na rede local (LAN).
Além de mapear todos os projetos existentes, o AppDevelopmentControl deve permitir a inclusão e detecção dinâmica e descomplicada de novos projetos criados no ecossistema (seja por criação automática de subpastas ou inclusão manual de caminhos).

---

## 2. Histórias de Usuário (por Prioridade)

- **US1 (P1)**: Como gestor/Alexandre, quero acessar `http://<ip-lan>:3333` em qualquer dispositivo da minha rede local para visualizar o painel executivo com todos os projetos catalogados.
- **US2 (P1)**: Como gestor, quero que novos projetos criados em subpastas de `c:\desenv\utils` sejam detectados automaticamente pelo sistema sem exigir reinicialização ou alteração de código.
- **US3 (P1)**: Como gestor, quero poder adicionar facilmente novos projetos ou pastas personalizadas diretamente pela interface da dashboard (botão "Adicionar Projeto / Monitorar Pasta").
- **US4 (P1)**: Como gestor, quero ver um card de altíssimo destaque ("Aguardando Ação do Alexandre") com todas as decisões pendentes (`PENDING DECISION`), bloqueios ou tarefas sob responsabilidade do Alexandre.
- **US5 (P1)**: Como gestor, quero ver para cada projeto:
  - Nome, tipo (Principal, Worktree, Standalone);
  - Propósito claro da aplicação (extraído automaticamente de README, package.json, pubspec, csproj ou specs, com possibilidade de edição direta salva no SQLite);
  - Início no computador (primeiro commit local ou criação);
  - Início no GitHub (criação remota);
  - Alterações: últimas 24h, 7 dias, 30 dias e total histórico;
  - Maior período sem alteração (maior gap em dias entre revisões) e dias sem alteração atual;
  - Quantitativo de Specs: total, desenvolvidas (concluídas) e pendentes.
- **US6 (P1)**: Como gestor, quero um mecanismo de busca inteligente e autocontido (MiniSearch fuzzy no navegador + SQLite FTS5 no servidor), com resposta em < 15ms e **zero consumo de tokens de IA**.
- **US7 (P2)**: Como gestor, quero gráficos executivos limpos e elegantes de cadência e maturidade de specs, seguindo a paleta executiva Slate/Navy/Emerald/Amber com **TOTAL PROIBIÇÃO DE VERMELHO**.
- **US8 (P2)**: Como gestor, quero gerar um dossiê executivo formatado para o Google NotebookLM com um clique ("Exportar Briefing para NotebookLM") para gerar Audio Overviews (podcasts gerenciais) ou Q&A estratégico.

---

## 3. Cenários de Aceite

| ID | Dado que | Quando | Então |
|---|---|---|---|
| **AC-01** | O AppDevelopmentControl está em execução | Acessado via LAN (`http://<ip-local>:3333`) | Carrega layout executivo completo, exibindo IPs de acesso e métricas atualizadas. |
| **AC-02** | Uma nova subpasta é criada em `c:\desenv\utils` | A varredura é disparada (automática a cada intervalo ou via botão "Sincronizar") | O novo projeto é imediatamente catalogado, suas métricas calculadas e exibido na dashboard. |
| **AC-03** | O usuário deseja monitorar uma pasta ou projeto adicional | O usuário informa o caminho no modal "Adicionar Projeto" | O sistema valida o caminho, extrai metadados, persiste no SQLite e inclui no monitoramento. |
| **AC-04** | Um projeto possui histórico Git | O scanner processa os commits | Calcula data inicial local, data do remote, contagem 24h/7d/30d/total e maior gap de dias sem alteração. |
| **AC-05** | Um projeto possui specs de SDD (`docs/specs`) | O scanner avalia os `tasks.md` | Quantifica specs desenvolvidas (todos `[x]`) vs pendentes (`[ ]`). |
| **AC-06** | Existem termos `PENDING DECISION` ou menções ao Alexandre | O scanner varre as specs e decisões | Itens são destacados no painel de alta prioridade gerencial. |
| **AC-07** | O usuário digita qualquer termo na barra de busca | O usuário digita caracteres parciais | Os resultados filtram instantaneamente em memória local sem chamadas pagas de API. |
| **AC-08** | O usuário aciona "Exportar para NotebookLM" | O clique é registrado | Um arquivo Markdown estruturado pronto para ingestão no NotebookLM é baixado. |

---

## 4. Requisitos e Diretrizes Visuais
- Padrão Executivo "C-Level Ready".
- Paleta: Deep Slate, Navy Blue, Emerald Green (concluído/ativo), Amber/Ouro (pendente/atenção).
- **PROIBIDO USO DE VERMELHO** em qualquer detalhe ou ícone.
- Sistema 100% autocontido, sem dependência de internet para funcionar na rede local.

---

# Adendo de Qualidade e Evolução — AppDevelopmentControl

## Objetivo
Elevar a confiabilidade e o valor gerencial da dashboard existente, preservando a arquitetura, o código e as funcionalidades já implementadas.

## Diretrizes obrigatórias

1. **Auditar antes de alterar:** examinar a implementação atual, executar os testes existentes e identificar divergências entre SPEC, PLAN, TASKS e código. Não reescrever componentes funcionais sem justificativa técnica.
2. **Precisão das métricas:** documentar como são calculadas as datas de início, os commits por período, os intervalos de inatividade e as métricas agregadas. Distinguir dados conhecidos, estimados e indisponíveis.
3. **Integridade do portfólio:** detectar subpastas recursivamente conforme o escopo configurado, identificar worktrees e repositórios compartilhados e evitar duplicação de projetos e históricos nas métricas consolidadas.
4. **Rastreabilidade das pendências:** exibir projeto, arquivo de origem, trecho relevante, responsável, situação e tempo de pendência, quando disponível. Não classificar uma menção histórica como uma ação atual sem evidência suficiente.
5. **Qualidade das specs:** distinguir tarefas concluídas, specs concluídas, validações realizadas e entregas efetivamente concluídas. Não presumir que todos esses estados são equivalentes.
6. **Busca autocontida:** manter a busca textual e aproximada sem chamadas a modelos de IA ou serviços pagos. Garantir indexação incremental, atualização após sincronização e funcionamento sem internet.
7. **Segurança e resiliência:** revisar o acesso pela LAN, a validação dos caminhos monitorados, a exposição de arquivos, a persistência SQLite, a recuperação após falhas e a distribuição local das dependências frontend.
8. **Valor executivo:** priorizar indicadores de saúde do portfólio, evolução temporal, maturidade documental e impedimentos que dependem de Alexandre, com critérios objetivos e fontes rastreáveis.
9. **NotebookLM opcional:** preservar a exportação de briefing em Markdown, sem criar dependência de rede ou IA para o funcionamento normal da dashboard.
10. **Execução incremental:** realizar alterações pequenas, testáveis e reversíveis. Atualizar SPEC, PLAN e TASKS conforme as decisões aprovadas e não marcar testes como concluídos sem evidências verificáveis.

## Critério de conclusão
Entregar um relatório com os requisitos auditados, os problemas encontrados, as correções realizadas, os testes executados, as evidências e as limitações ainda existentes. Preservar as funcionalidades válidas e evitar refatorações que não tragam benefício demonstrável.


