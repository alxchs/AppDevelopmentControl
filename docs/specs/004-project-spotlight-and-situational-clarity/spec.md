# SPEC-004: Project Spotlight, Quick Selector & Situational Clarity

## 1. Visão Geral e Propósito
Resolver definitivamente a falta de compreensão situacional imediata relatada pelo usuário. O usuário olha para a dashboard e não entende facilmente em que ponto cada projeto está. Esta especificação introduz um **Seletor Rápido de Projeto no topo da tela (Project Spotlight)** acoplado a um **Painel de Clareza Situacional Destaque**, que responde instantaneamente:
1. **Onde o projeto parou** (última entrega real e quem fez);
2. **Onde está agora** (fase ativa + stepper visual de marcos);
3. **O que vem a seguir** (próximo passo imediato e tarefas pendentes);
4. **O que requer atenção do Alexandre** (bloqueios e decisões);
5. **Quem está operando** (worktrees paralelas e agentes alocados).

Adicionalmente, introduz o modo de visualização em **Pipeline de Estágios (Funil de Maturidade)** no portfólio geral.

---

## 2. Requisitos de Negócio e Funcionalidades

### 2.1 Seletor Rápido de Projeto no Topo (Project Quick Selector)
- Um controle proeminente logo abaixo do banner de rede, permitindo selecionar qualquer um dos projetos monitorados:
  - Dropdown com autocomplete / busca rápida e indicação visual da stack e status de saúde;
  - Botões de navegação rápida: `[ ◀ Anterior ]` `[ Próximo ▶ ]`;
  - Persistência da seleção ativa em `localStorage` para preservar o contexto entre recarregamentos;
  - Ao selecionar, rola suavemente e preenche o painel de destaque.

### 2.2 Painel Destaque de Clareza Situacional (Project Spotlight Hero)
- Localizado imediatamente abaixo do seletor, exibe a radiografia completa do projeto selecionado:
  - **Cabeçalho Executivo**: Nome do projeto, Stack Badge, Última Tag de Release, Branch Atual, Status da Árvore de Trabalho (`limpa` vs `⚠️ X arquivos modificados`) e atalho para abrir pasta local / GitHub.
  - **Bloco 1: Onde Parou (Último Marco Entregue)**:
    - Mensagem completa do último commit, data relativa legível ("há 3 horas", "ontem"), hash curto e badge de autoria (`AGY`, `Claude` ou `Alexandre`).
    - Propósito claro da aplicação em linguagem humana.
  - **Bloco 2: Onde Está Agora (Fase Ativa & Stepper Visual)**:
    - Texto da `CURRENT PHASE` extraído do `AGENT_CONTEXT.md`;
    - **Stepper Visual de Marcos**: Linha do tempo horizontal renderizando as últimas 4 especificações/fases:
      - Fases concluídas com ícone verde `✓`;
      - Fase ativa destacada com percentual de tarefas e barra visual;
      - Próximas fases planejadas em tom neutro.
  - **Bloco 3: O Que Vem a Seguir (Próximo Passo Concreto)**:
    - Texto da `NEXT ACTION` em destaque acionável;
    - Lista das próximas 3 tarefas pendentes `[ ]` da especificação corrente.
  - **Bloco 4: Radar de Decisões e Bloqueios do Alexandre**:
    - Destaque em banner âmbar caso o projeto contenha itens com `PENDING DECISION` ou dependência do Alexandre, exibindo trecho, arquivo e contexto da decisão.
  - **Bloco 5: Radar de Trabalho Paralelo (Worktrees e Agentes)**:
    - Se houver worktrees ativas, exibir cada pasta vinculada, a branch em que ela está e a data da última modificação.
  - **Bloco 6: Comandos Rápidos do Projeto**:
    - Comandos de compilação (`mkfile d`, `dotnet build`, etc.) e teste extraídos de `AGENTS.md` ou `package.json`.

### 2.3 Visualização Pipeline de Estágios (Funil de Maturidade do Portfólio)
- Além dos modos **Cards** e **Tabela Densa**, adicionar o modo **Pipeline / Funil**:
  - Coluna 1: 💡 **Planejamento / SDD** (sem código ativo recente ou com specs em rascunho);
  - Coluna 2: ⚡ **Em Desenvolvimento Ativo** (commits recentes e fase WIP);
  - Coluna 3: 🧪 **Em Validação / Bloqueado** (com pendências do Alexandre ou testes pendentes);
  - Coluna 4: 🚀 **Publicado / Estável** (com tags semânticas e specs 100% concluídas);
  - Coluna 5: 🧊 **Em Espera / Hibernando** (> 30 dias de inatividade sem bloqueios).

### 2.4 Extração no Scanner (`src/scanner.js`)
- Enriquecer o scanner para:
  - Extrair o stepper ordenado de fases de `docs/specs/` com tarefas detalhadas de cada uma;
  - Extrair comandos oficiais de build da seção "Compilar" do `AGENTS.md`;
  - Calcular a categoria de pipeline de cada projeto (`planning`, `active`, `validation`, `stable`, `idle`).

---

## 3. Critérios de Aceite
1. O seletor no topo da tela permite alternar entre qualquer um dos 23 projetos com 1 clique ou teclado.
2. O Painel Spotlight exibe claramente: Onde Parou, Onde Está Agora (com stepper visual), O Que Vem a Seguir e Bloqueios do Alexandre.
3. Ao clicar em qualquer projeto nos cards ou na tabela, o painel Spotlight atualiza imediatamente para o projeto clicado.
4. O modo de visualização Pipeline categoriza os projetos em 5 colunas limpas e intuitivas.
5. Zero uso de vermelho na interface (paleta Slate, Navy, Emerald, Amber, Indigo, Cyan).
6. Testes automatizados cobrindo a nova lógica de pipeline, stepper e endpoints passam com 100% de sucesso.
