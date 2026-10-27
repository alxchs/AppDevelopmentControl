# 002 — Portfolio Health, SDD Maturity & Executive Direction — SPEC

Status: APROVADA (Alexandre / Agente, 2026-10-27).
Fonte da verdade do **comportamento** e regras de negócio. Sem acoplamento a código específico aqui; detalhes de implementação pertencem ao `plan.md`.

---

## 1. Contexto e Motivação
A primeira versão da dashboard AppDevelopmentControl atingiu com sucesso o mapeamento do portfólio, consolidação de worktrees e rastreamento de commits e specs.
Entretanto, para oferecer direção gerencial executiva de alto nível (alinhada aos padrões de plataformas como Linear Insights, Swarmia e DORA Metrics), a liderança técnica precisa responder instantaneamente a 4 perguntas estratégicas:
1. **Qual é o estado de saúde real de cada produto?** (O projeto está ativo com tração, bloqueado aguardando deliberação, estável e finalizado, ou abandonado/dormente?)
2. **Qual é o nível de maturidade metodológica (SDD Score)?** (O projeto segue o `METODO.md` com specs, tarefas auditadas, documentação e rastreabilidade, ou é um código desorganizado?)
3. **Qual foi a última versão ou tag de release publicada de verdade?** (Rastrear tags no padrão `tag_<versão>_<palavra-chave>` e versão publicada confirmada).
4. **Qual agente ou frente atuou por último no projeto?** (Rastreabilidade de atuação do Claude Code vs Antigravity vs Alexandre).

---

## 2. Histórias de Usuário (por Prioridade)

- **US1 (P1 - Farol de Saúde Gerencial)**: Como gestor, quero ver em cada card de projeto um selo de **Status de Saúde (Health Status)** com classificação objetiva e automatizada:
  - 🟢 **Em Tração**: Teve commits nos últimos 7 dias, specs em desenvolvimento e zero bloqueios críticos.
  - 🟡 **Bloqueado / Atenção**: Possui pendências do Alexandre (`PENDING DECISION` ou bloqueios abertos) ou inatividade entre 15 e 45 dias sem conclusão.
  - ⚪ **Estável / Concluído**: Não possui commits recentes (> 30 dias), mas possui 100% das specs desenvolvidas e zero pendências (produto pronto e operacional em produção).
  - 🟣 **Em Incubação / Protótipo**: Repositório embrionário, sem estrutura formal de specs SDD ainda.
- **US2 (P1 - SDD Maturity Score)**: Como gestor, quero ver uma pontuação percentual objetiva de 0% a 100% (**SDD Maturity Score**) medindo o rigor de engenharia do projeto:
  - Presença de especificações formais em `docs/specs/` (+30%);
  - Taxa de tarefas auditadas e concluídas em `tasks.md` (+30%);
  - Presença de propósito claro documentado no `README.md` (+20%);
  - Histórico de versionamento limpo e rastreabilidade git (+20%).
- **US3 (P1 - Filtros Executivos de Direção)**: Como gestor, quero filtrar instantaneamente os projetos pelos novos estados de direção:
  - *Em Tração* (foco da equipe na semana);
  - *Bloqueados / Atenção* (decisões imediatas a destravar);
  - *Estáveis / Em Produção* (portfólio maduro);
  - *Dormentes / Em Risco* (projetos parados sem entrega formal).
- **US4 (P2 - Tags de Release e Checkpoint)**: Como gestor, quero ver a última tag git registrada em cada projeto (respeitando o padrão de segurança `tag_<versão>_<assunto>` ou tags `v*`), indicando há quantos dias a última versão foi formalizada.
- **US5 (P2 - Pegada de Agentes / Agent Footprint)**: Como gestor, quero visualizar nos detalhes do projeto qual entidade realizou a última alteração relevante (Claude Code, Antigravity ou Alexandre), trazendo clareza para a governança multi-agente.
- **US6 (P2 - Atualização do Briefing NotebookLM)**: Como gestor, quero que o dossiê exportado para o Google NotebookLM inclua a seção de **Diagnóstico de Saúde do Portfólio** e o ranking de **Maturidade SDD** para síntese em áudio nos podcasts gerenciais.

---

## 3. Cenários de Aceite

| ID | Dado que | Quando | Então |
|---|---|---|---|
| **AC-01** | Um projeto possui commits nos últimos 7 dias e specs ativas sem ações do Alexandre | A varredura analisa o projeto | O projeto recebe o status `🟢 Em Tração`. |
| **AC-02** | Um projeto possui ao menos uma ação pendente do Alexandre (`PENDING DECISION` ou bloqueio) | A varredura analisa o projeto | O projeto recebe o status `🟡 Bloqueado / Atenção` com prioridade máxima de exibição. |
| **AC-03** | Um projeto não tem commits há mais de 30 dias, mas possui specs 100% concluídas e zero bloqueios | A varredura analisa o projeto | O projeto recebe o status `⚪ Estável / Concluído` (reconhecendo que está pronto e não abandonado). |
| **AC-04** | Um projeto não tem commits há mais de 45 dias e possui specs com tarefas incompletas `[ ]` | A varredura analisa o projeto | O projeto recebe o status `🟡 Em Risco / Dormente` com alerta de estagnação. |
| **AC-05** | Um projeto possui pasta `docs/specs`, `README.md` preenchido e tarefas concluídas | O cálculo de maturidade é executado | O sistema calcula e exibe o `SDD Maturity Score` ponderado (ex: 85%), acompanhado de barra visual de qualidade. |
| **AC-06** | Um projeto possui tags no Git (ex: `tag_2.6.0_seguranca` ou `v1.0.0`) | O scanner inspeciona o repositório | Exibe a última tag registrada e a data/dias desde a sua criação no card e no modal. |
| **AC-07** | O usuário clica no filtro "Em Tração" ou "Bloqueados" | O filtro é selecionado | O grid de projetos filtra em menos de 10ms localmente sem consumo de tokens. |
| **AC-08** | Um usuário exporta o briefing para o Google NotebookLM | O download é concluído | O arquivo Markdown contém a nova seção *"4. Diagnóstico de Saúde e Maturidade Metodológica"*. |

---

## 4. Requisitos e Diretrizes Visuais
- Padrão Executivo "C-Level Ready" alinhado ao Linear e Jellyfish.
- Paleta mandatória: Slate, Deep Navy, Emerald Green (Em Tração/Concluído), Amber Gold (Bloqueado/Atenção/Em Risco), Indigo (Incubação/Worktrees) e Slate 400 (Estável).
- **TOTALMENTE SEM VERMELHO** em qualquer indicador, gráfico, tag ou ícone.
- Motor de cálculo 100% autocontido e offline, persistido no SQLite local.

