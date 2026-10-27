# Adendo de Qualidade e Evolução — AppDevelopmentControl

> **Documento Canônico de Diretrizes e Evolução Contínua**  
> Compartilhado entre **Alexandre**, **Claude Code** e **Antigravity**.

---

## Objetivo

Elevar a confiabilidade e o valor gerencial da dashboard existente, preservando a arquitetura, o código e as funcionalidades já implementadas.

## Diretrizes Obrigatórias

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

---

## Critério de Conclusão

Entregar um relatório com os requisitos auditados, os problemas encontrados, as correções realizadas, os testes executados, as evidências e as limitações ainda existentes. Preservar as funcionalidades válidas e evitar refatorações que não tragam benefício demonstrável.

