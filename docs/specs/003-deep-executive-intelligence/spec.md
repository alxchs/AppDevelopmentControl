# SPEC-003: Deep Executive Intelligence & Technical Portfolio Depth

## 1. Visão Geral e Propósito
Elevar a profundidade, riqueza e precisão das informações exibidas na dashboard executiva `AppDevelopmentControl`. O sistema deixa de ser apenas um monitor de contagem de commits e specs para se tornar um verdadeiro painel de inteligência arquitetural, governança de IA e controle técnico de projetos para o desenvolvedor e líder executivo (Alexandre).

---

## 2. Requisitos de Negócio e Executivos

### 2.1 Detecção Automática da Stack Tecnológica
- Identificar automaticamente a linguagem, framework e arquitetura de cada projeto em `c:\desenv\utils`:
  - **Delphi**: `.dpr`, `.dpk`, `.dfm`, `.pas` (VCL / FMX);
  - **C# / .NET**: `.sln`, `.csproj`, `.xaml`, `.cs` (WinUI 3, WPF, Console, MAUI);
  - **Flutter / Dart**: `pubspec.yaml`, `lib/`;
  - **Node.js / TypeScript**: `package.json`, `tsconfig.json`;
  - **Python**: `pyproject.toml`, `requirements.txt`, `*.py`;
  - **Rust / Go / C++ / Electron / etc.**: manifestos e fontes canônicos.
- Exibir a stack em badges temáticos (respeitando a proibição de vermelho).

### 2.2 Extração Estruturada de Metadados de Continuidade (`AGENT_CONTEXT.md` & `AGENTS.md`)
- Não limitar a captura de propósito ao `README.md`.
- Extrair campos formais da metodologia:
  - `OBJECTIVE`: Objetivo central da aplicação;
  - `CURRENT PHASE`: Fase de desenvolvimento ativa (ex: F052, Spec 018);
  - `NEXT ACTION`: Próxima ação técnica imediata;
  - `LAST DECISION`: Última decisão arquitetural tomada;
  - `DO NOT CHANGE / REGRAS`: Restrições invioláveis do projeto.

### 2.3 Histórico Git Recente e Estado da Árvore de Trabalho
- Rastrear os **5 últimos commits** reais de cada projeto (hash, data relativa, autor, mensagem e IA atribuída: `AGY`, `Claude` ou `Alexandre`).
- Identificar se a árvore de trabalho está limpa ou modificada (`git status --porcelain`), indicando quantos arquivos estão pendentes de commit.
- Mapear as branches ativas locais.

### 2.4 Roadmap Detalhado de Specs SDD
- Expandir a visualização de specs:
  - Título/nome de cada especificação em `docs/specs/`;
  - Progresso granular (ex: 8/10 tarefas concluídas);
  - Listagem dos nomes das tarefas pendentes de cada spec.

### 2.5 Integridade e Saneamento do Portfólio
- Expurgar registros fantasmas do banco de projetos cujas pastas físicas deixaram de existir (ex: pastas legadas de `FilesApp-*` substituídas por `KyraFiles`).
- Consolidar worktrees ativas (`KyraFiles-f086-xaml-fix`, `Vivere-review`, `Vivere-t-05`, `OneToOneSupport-provas`) sob seus respectivos projetos canônicos.

### 2.6 Dupla Visualização na Interface (Cards Executivos & Tabela Densa de Portfólio)
- Alternância instantânea (toggle) entre:
  1. **Cards Executivos**: Enriquecidos com Stack, Fase Atual, Próxima Ação, indicador de árvore suja e último agente.
  2. **Tabela Detalhada (Data Table)**: Visão tabular compacta de alta densidade de informação com ordenação rápida.
- **Modal de Projeto em 4 Abas**:
  - Aba 1: Ficha Técnica & Arquitetura (Stack, Propósito, Governança Documental, Comandos).
  - Aba 2: Git & Atividade Recente (Timeline dos 5 últimos commits, status da árvore, branches, worktrees).
  - Aba 3: Roadmap SDD (Tabela de especificações e tarefas).
  - Aba 4: Pendências do Alexandre (Rastreabilidade pontual).

---

## 3. Critérios de Aceite
1. Todas as pastas de projetos em `c:\desenv\utils` possuem stack detectada com precisão.
2. Projetos sem pastas físicas no disco são eliminados da visualização e do banco.
3. Projetos com `AGENT_CONTEXT.md` exibem Objetivo, Fase Atual e Próxima Ação reais.
4. Os 5 últimos commits são exibidos com identificação da IA/humano que comitou.
5. O status da árvore de trabalho (limpa vs modificada) é indicado visualmente.
6. A interface permite alternar entre Cards e Tabela sem perda de estado ou filtros.
7. O Modal exibe 4 abas funcionais com navegação suave.
8. Zero uso de vermelho na interface (paleta Slate, Navy, Emerald, Amber, Indigo, Cyan).
9. Testes automatizados cobrindo todas as novas regras passam com 100% de sucesso.

