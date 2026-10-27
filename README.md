# AppDevelopmentControl — Executive Projects Dashboard (Local LAN)

Sistema executivo de monitoramento, controle gerencial e portfólio de projetos para a pasta `c:\desenv\utils`, acessível via navegador em qualquer dispositivo na rede local (LAN).

---

## 🚀 Como Iniciar

Basta executar o script de inicialização ou o comando node:

```cmd
start.cmd
```
ou
```bash
npm start
```

O servidor iniciará escutando em `0.0.0.0:3333` e exibirá os links de acesso:
- **Acesso Local**: `http://localhost:3333`
- **Acesso na Rede Local (LAN)**: `http://192.168.1.200:3333` (ou IP da sua máquina)

---

## ✨ Recursos Principais

1. **Dashboard Gerencial C-Level**: Design de alto padrão executivo em modo dark (Deep Slate, Emerald Green, Amber Gold e Navy Blue — **Zero Vermelho**).
2. **Varredura Completa do Portfólio**: Mapeia todas as 34+ aplicações em subpastas de `c:\desenv\utils`, separando projetos principais, worktrees e ferramentas.
3. **Métricas Temporais e Históricas**:
   - Data de início no computador (primeiro commit ou criação);
   - Data de início e remote no GitHub;
   - Volume de alterações em 24h, 7 dias, 30 dias e total geral de commits;
   - Maior hiato contínuo em dias sem alteração e dias de inatividade atual.
4. **Maturidade de Specs (SDD)**: Contabilização de todas as especificações em `docs/specs`, calculando total, concluídas e pendentes por meio da leitura de `tasks.md`.
5. **Destaque Crítico de Pendências do Alexandre**: Identifica automaticamente itens com `PENDING DECISION`, decisões arquiteturais abertas e bloqueios dependendo de deliberação do Alexandre.
6. **Busca Inteligente 100% Autocontida (Zero Tokens)**: Busca fuzzy client-side + FTS5 no SQLite local, com resposta em < 15ms sem gastar nenhum token de IA.
7. **Inclusão Dinâmica de Novos Projetos**: Novas subpastas criadas são descobertas na varredura (automática ou via botão "Sincronizar"), além de permitir o registro manual de pastas customizadas pela interface.
8. **Exportação Executiva para Google NotebookLM**: Botão de um clique que gera e baixa o dossiê consolidado `portfolio-briefing-notebooklm.md` pronto para gerar **Audio Overviews** (podcasts gerenciais em áudio) e perguntas executivas.

---

## 🛠️ Tecnologias Utilizadas

- **Runtime**: Node.js v24.19.0 (módulo nativo `node:sqlite` com SQLite WAL e FTS5)
- **Frontend**: HTML5, Tailwind CSS, Lucide Icons, Chart.js
- **Motor de Busca**: Fuzzy Search & Token Matching ponderado em memória (Zero Tokens)
- **Rede**: Escuta `0.0.0.0` com detecção de interfaces de rede via `node:os`

---

## 📜 Governança e Diretrizes de Qualidade (Claude Code & Antigravity)

O desenvolvimento e evolução contínua desta dashboard seguem as 10 diretrizes obrigatórias estabelecidas no:
- [`AGENTS.md`](./AGENTS.md)
- [`docs/ADENDO-QUALIDADE-EVOLUCAO.md`](./docs/ADENDO-QUALIDADE-EVOLUCAO.md)
- [`docs/specs/001-app-development-control/spec.md`](./docs/specs/001-app-development-control/spec.md)
- [`docs/specs/001-app-development-control/plan.md`](./docs/specs/001-app-development-control/plan.md)


