# DECISIONS — AppDevelopmentControl

## D-001 — Uso de `node:sqlite` Nativo do Node.js v24 sem Dependências Externas (2026-10-26)

- **Context:** A dashboard precisa de persistência robusta, alta velocidade e capacidade de busca textual avançada (FTS5).
- **Problem:** Adicionar dependências externas (`sqlite3`, `better-sqlite3`, etc.) traz risco de compilação C++, problemas de ABI no Windows e peso desnecessário de `node_modules`.
- **Options:** (1) `node:sqlite` nativo (DatabaseSync); (2) `better-sqlite3`; (3) JSON em disco.
- **Decision:** Utilizar `node:sqlite` nativo do Node.js v24 com modo WAL ativado (`PRAGMA journal_mode = WAL;`) e tabela virtual FTS5.
- **Reason:** Zero overhead de instalação, zero risco de quebra no Windows, compilação nativa no próprio executável do Node.js.
- **Trade-offs:** Exige Node.js v22.5+ / v24+ com suporte a `node:sqlite`.
- **Consequences:** O repositório roda imediatamente via `node src/server.js` sem precisar de `npm install`.

---

## D-002 — Desduplicação Estrita de Worktrees e Repositórios Vinculados (2026-10-26)

- **Context:** Na pasta `c:\desenv\utils` existem dezenas de pastas com padrão `<projeto>-<worktree>`, além de repositórios vinculados por `gitdir`.
- **Problem:** Contabilizar commits e histórico de cada worktree como um projeto independente inflaria artificialmente o portfólio e duplicaria o histórico geral de commits.
- **Options:** (1) Tratar cada pasta como projeto independente; (2) Agrupar worktrees no projeto canônico principal.
- **Decision:** Agrupar worktrees sob o projeto principal canônico (detectando via arquivo `.git` apontando para o gitdir principal ou padrão de nomenclatura `<Nome>-<sufixo>`).
- **Reason:** Garante métricas gerenciais precisas, distinguindo 19 projetos canônicos reais de 13 worktrees de trabalho.
- **Trade-offs:** Requer lógica heurística para pastas sem git ativo.
- **Consequences:** O dashboard e o briefing consolidado para NotebookLM refletem o portfólio real e íntegro.

---

## D-003 — Busca Inteligente Autocontida com Zero Tokens de IA (2026-10-26)

- **Context:** O gestor precisa de busca instantânea (< 15ms) por termos parciais, nomes de projetos, specs e tarefas.
- **Problem:** Utilizar modelos de LLM ou APIs de embedding pagas adiciona latência, custo contínuo e dependência de rede/internet.
- **Options:** (1) API externa de embeddings/LLM; (2) MiniSearch/fuzzy local em memória + SQLite FTS5 no backend.
- **Decision:** Implementar busca fuzzy e token matching ponderado em memória client-side com complemento de FTS5 no SQLite local.
- **Reason:** Custo zero, velocidade instantânea (< 15ms) e funcionamento 100% offline na LAN.
- **Trade-offs:** Não realiza inferência semântica abstrata além dos termos textuais indexados.
- **Consequences:** Funcionamento confiável e ilimitado na rede local.

---

## D-004 — Farol de Saúde (Health Status) e SDD Maturity Score (Spec 002) (2026-10-27)

- **Context:** Decisão gerencial precisa distinguir projetos em tração, projetos bloqueados, produtos concluídos e protótipos.
- **Problem:** Métricas puras de "dias sem commit" classificavam produtos concluídos e estáveis em produção como "abandonados".
- **Options:** (1) Usar apenas tempo desde último commit; (2) Matriz de regras ponderada considerando specs concluídas, pendências ativas do Alexandre e histórico git.
- **Decision:** Implementar `computeHealthStatus` e `computeSddMaturityScore` em `src/evaluator.js`:
  - 🟢 **Em Tração**: commits nos últimos 7d, specs em andamento, sem bloqueios;
  - 🟡 **Bloqueado / Atenção**: ações do Alexandre abertas (`PENDING DECISION` ou checkboxes abertos);
  - ⚪ **Estável / Concluído**: inativo há > 30d mas com 100% das specs concluídas e zero bloqueios;
  - ⚠️ **Em Risco / Dormente**: inativo há > 45d com specs pendentes;
  - 🟣 **Em Incubação**: repositório embrionário sem specs SDD.
- **Reason:** Fornece clareza executiva imediata sem falsos positivos.
- **Trade-offs:** Exige que projetos maduros tenham specs em `docs/specs/` para receber pontuação máxima.
- **Consequences:** Transparência total da saúde do portfólio no dashboard e no Google NotebookLM.

---

## D-005 — Ingestão de docs/production v2: ponto fora de Fibonacci entra nos totais (SPEC-0007, 2026-11-14)

- **Context:** O control.json de um projeto pode trazer pontos fora de 1, 2, 3, 5, 8, 13, 21 (erro de preenchimento).
- **Problem:** Excluir a SPEC dos totais oculta trabalho; incluí-la sem aviso esconde o erro.
- **Options:** (1) fora dos totais até corrigir; (2) entra como lido, com alerta de erro visível.
- **Decision:** Entra nos totais como lido, com issue de severidade erro na SPEC, até ser corrigido na origem.
- **Reason:** O total não pode ocultar trabalho; o erro fica visível e derruba o indicador de qualidade do controle.
- **Trade-offs:** O total pode conter um valor inválido temporariamente.
- **Consequences:** Validação sinaliza POINTS_NOT_FIBONACCI sem alterar o valor.

---

## D-006 — Worktrees: o checkout principal vence (SPEC-0007, 2026-11-14)

- **Context:** Só uma worktree pode ter docs/production (branch de migração não integrada).
- **Problem:** Dois controles diferentes para o mesmo projeto.
- **Options:** (1) mesclar; (2) principal primeiro, worktree só como fallback.
- **Decision:** Ler primeiro o checkout principal; usar a worktree só se o principal não tiver docs/production. Nunca mesclar controles.
- **Reason:** Uma única fonte de verdade por projeto, com origem marcada.
- **Trade-offs:** Uma worktree mais nova não sobrepõe o principal.
- **Consequences:** A origem da leitura é registrada na importação.

---

## D-007 — Escopo dos indicadores §11 e §12 do protocolo (SPEC-0007, 2026-11-14)

- **Context:** O protocolo define muitos indicadores; nem todos têm dado sustentado.
- **Problem:** Calcular o que o controle não sustenta produziria números enganosos.
- **Options:** (1) todos; (2) só o sustentado por contagens do controle.
- **Decision:** §11 inteiro; do §12 apenas produção, esforço, previsibilidade, bloqueios e fluxo parcial. Valor e comparação de agentes ficam fora.
- **Reason:** Cada indicador com base explícita; nulo permanece nulo.
- **Trade-offs:** Indicadores de valor e de agentes ficam para outra spec.
- **Consequences:** Sem nota única; componentes com n de itens e "sem dado".

---

## D-008 — Horas: aceitar os dois formatos (SPEC-0007, 2026-11-14)

- **Context:** O protocolo §7 usa original_estimate_hours etc.; os controles reais usam hours:{original,current,actual,remaining}.
- **Problem:** Rejeitar um dos formatos quebraria projetos válidos.
- **Options:** (1) só o do protocolo; (2) só o real; (3) ambos.
- **Decision:** Aceitar os dois na leitura, com aviso HOURS_FIELD_VARIANT quando usar o nome do protocolo.
- **Reason:** Compatibilidade com os controles já gerados sem ignorar o protocolo.
- **Trade-offs:** Dois caminhos de leitura.
- **Consequences:** Horas nulas permanecem nulas; nunca viram zero.

---

## D-009 — Fronteira de rejeição da importação (SPEC-0007, 2026-11-14)

- **Context:** Arquivos de controle são escritos por IAs em paralelo e podem estar truncados.
- **Problem:** Distinguir o que rejeita a importação do que só gera alerta.
- **Options:** (1) rejeitar qualquer erro; (2) rejeitar só erro de schema.
- **Decision:** Erro de schema (bloco ou tipo ausente, schema_version diferente de 2.0, JSON inválido) rejeita a importação e mantém a última boa; erro só de valor importa com alertas. Arquivo truncado numa leitura mantém a última importação boa e registra o problema.
- **Reason:** Dado parcial não deve sobrescrever dado bom; erro de valor ainda é informativo.
- **Trade-offs:** Uma importação rejeitada deixa dados anteriores na tela até a próxima varredura boa.
- **Consequences:** Status da importação: válido, válido com alertas ou rejeitado.

---
## PENDING DECISION

*(Nenhuma dúvida pendente no momento. As specs 001 e 002 estão concluídas e auditadas.)*

