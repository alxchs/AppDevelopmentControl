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

## PENDING DECISION

*(Nenhuma dúvida pendente no momento. As specs 001 e 002 estão concluídas e auditadas.)*

