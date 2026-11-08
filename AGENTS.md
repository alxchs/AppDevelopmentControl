# Diretrizes para Agentes de IA (Claude Code e Antigravity) — AppDevelopmentControl

Este arquivo é a fonte mandatória de contexto para agentes de IA (**Claude Code** e **Antigravity**) atuando no repositório `AppDevelopmentControl`.

## Metodologia

Leia `~/.dev-method/METODO.md` (metodologia geral do Alexandre), `AGENT_CONTEXT.md` e `docs/agents/PLAYBOOK.md` antes de agir. Regras deste projeto ficam aqui.

---

# Adendo de Qualidade e Evolução — AppDevelopmentControl

## Objetivo
Elevar a confiabilidade e o valor gerencial da dashboard existente, preservando a arquitetura, o código e as funcionalidades já implementadas.

## Diretrizes Obrigatórias para Qualquer Agente

1. **Auditar antes de alterar:**
   - Examinar a implementação atual antes de qualquer alteração (`src/db.js`, `src/scanner.js`, `src/server.js`, `src/lan.js`, `public/app.js`).
   - Executar os testes existentes (`npm test`) antes e depois de qualquer intervenção.
   - Identificar divergências entre SPEC, PLAN, TASKS e código.
   - **NUNCA reescrever componentes funcionais sem justificativa técnica explícita.**

2. **Precisão das métricas:**
   - Documentar como são calculadas as datas de início, commits por período, intervalos de inatividade e métricas agregadas.
   - Distinguir dados conhecidos, estimados e indisponíveis.

3. **Integridade do portfólio:**
   - Detectar subpastas recursivamente conforme o escopo configurado.
   - Identificar worktrees e repositórios compartilhados para evitar duplicação de projetos e históricos nas métricas consolidadas.

4. **Rastreabilidade das pendências:**
   - Exibir projeto, arquivo de origem, trecho relevante, responsável, situação e tempo de pendência, quando disponível.
   - **NÃO classificar uma menção histórica como uma ação atual sem evidência suficiente** (ex: `APROVADA (Alexandre)` é histórico; `PENDING DECISION` ou checkboxes abertos `[ ]` dependentes de Alexandre são ações ativas).

5. **Qualidade das specs:**
   - Distinguir: (a) tarefas concluídas, (b) specs concluídas, (c) validações realizadas e (d) entregas efetivamente concluídas.
   - Não presumir que todos esses estados são equivalentes.

6. **Busca autocontida:**
   - Manter a busca textual e aproximada (fuzzy) sem chamadas a modelos de IA ou serviços pagos.
   - Garantir indexação incremental, atualização após sincronização e funcionamento 100% offline.

7. **Segurança e resiliência:**
   - Revisar o acesso pela LAN (`0.0.0.0`), a validação dos caminhos monitorados (evitar directory traversal), a exposição de arquivos, a persistência SQLite, a recuperação após falhas e a distribuição local das dependências frontend.

8. **Valor executivo:**
   - Priorizar indicadores de saúde do portfólio, evolução temporal, maturidade documental e impedimentos que dependem de Alexandre, com critérios objetivos e fontes rastreáveis.
   - Respeitar a regra de design: **PROIBIDO USO DE VERMELHO** em qualquer elemento ou ícone. Paleta: Slate, Navy, Emerald, Amber, Indigo.

9. **NotebookLM opcional:**
   - Preservar a exportação de briefing em Markdown (`portfolio-briefing-notebooklm.md`), sem criar dependência de rede ou IA para o funcionamento normal da dashboard.

10. **Execução incremental:**
    - Realizar alterações pequenas, testáveis e reversíveis.
    - Atualizar `SPEC.md`, `PLAN.md` e `TASKS.md` conforme as decisões aprovadas.
    - Nunca marcar testes como concluídos sem evidências verificáveis.

---

## Critério de Conclusão de Qualquer Fase ou Tarefa
Entregar um relatório com os requisitos auditados, os problemas encontrados, as correções realizadas, os testes executados, as evidências e as limitações ainda existentes. Preservar as funcionalidades válidas e evitar refatorações que não tragam benefício demonstrável.

