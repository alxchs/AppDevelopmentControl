# PLAYBOOK — como seguir sem o arquiteto (AppDevelopmentControl)

Este playbook orienta qualquer agente executor (**Antigravity** ou **Claude Code**) a atuar no repositório de forma autônoma, segura e contínua.

---

## 1. Fila de Trabalho (em ordem)

1. **Monitoramento e Auditoria Periódica**:
   - Rodar varredura completa (`npm run scan` ou disparar `POST /api/scan`) para sincronizar novos projetos ou worktrees criados em `c:\desenv\utils`.
   - Executar os testes automatizados (`npm test`) para garantir baseline 100% verde.
2. **Atendimento a Novas Specs SDD**:
   - Toda nova funcionalidade deve seguir o ciclo SDD estrito: criação de pasta em `docs/specs/<ID>-<nome>/` contendo `spec.md`, `plan.md` e `tasks.md`.
   - Aprovação prévia antes de qualquer codificação.
3. **Resolução de Pendências Técnicas**:
   - Manutenção de integridade do SQLite e FTS5.
   - Refinamento de heurísticas de detecção de propósito e associação de novas worktrees.

---

## 2. Pré-aprovado (pode decidir sem perguntar)

- Executar testes automatizados (`npm test`).
- Executar scanner em modo leitura ou sincronização do banco local (`npm run scan`).
- Ajustar ou criar testes de unidade/integração para novas rotas ou regras do `evaluator.js`.
- Criar branches de trabalho (`feature/<nome>`) e alternar branches locais.
- Fazer commits locais a cada passo verde na branch de feature.
- Atualizar a documentação de continuidade (`AGENT_CONTEXT.md`, `STATUS.md`, `CHANGELOG.md`, `docs/agents/handoffs/`).
- Resolver erros de compilação, tipos ou testes vermelhos introduzidos durante o desenvolvimento na branch.

---

## 3. Precisa do Alexandre / Claude (Parar e Perguntar)

- **`git push`**: Jamais realizar push sem autorização expressa do Alexandre naquele momento.
- **Merge para a branch `main`**: A branch `main` é protegida. Merges ocorrem exclusivamente via squash + rebase e aprovação explícita.
- **Alteração de Escopo ou Regras Fundamentais**:
  - Mudança na paleta de cores (**PROIBIDO USO DE VERMELHO** em qualquer hipótese).
  - Adição de dependências externas npm sem deliberação (manter o app o mais autocontido possível com `node:sqlite`).
  - Alteração na porta padrão (`3333`) ou no diretório base monitorado (`c:\desenv\utils`).
- **Ações Destrutivas**: `git reset --hard`, `git clean`, remoção de arquivos criados por outro agente ou limpeza de banco sem backup.

---

## 4. Como Compilar, Executar e Testar

### Pré-requisitos
- Node.js v24 instalado (com suporte a `node:sqlite`).

### Comandos de Trabalho
```bash
# Executar a bateria completa de testes de aceite (Spec 001 + Spec 002):
npm test

# Executar a varredura do portfólio no terminal (CLI):
npm run scan

# IA: subir o servidor SEM roubar foco (oculto, sem navegador, sem terminal da IDE):
powershell -NoProfile -File start-silent.ps1

# Uso manual do Alexandre (abre console visivel): npm start  ou  start.cmd
# PROIBIDO para IA: `node src/server.js` / `npm start` / `start.cmd` em terminal da IDE.
```

### URLs de Acesso
- Local: `http://localhost:3333`
- Rede Local (LAN): `http://<ip-lan>:3333` (exibido no console ao iniciar)

---

## 5. Armadilhas Já Conhecidas e Lições Aprendidas

1. **Ambiente Windows e GitConfig Global**:
   - No Windows, comandos Git executados dentro de subprocessos ou scripts devem isolar variáveis de configuração para evitar bloqueios de leitura em `~/.dev-method/git-hooks.gitconfig`. No scanner, usamos `GIT_CONFIG_GLOBAL: 'NUL'` e `GIT_CONFIG_SYSTEM: 'NUL'`.
2. **Duplicação de Worktrees**:
   - NUNCA contabilize pastas como `FilesApp-worktree` ou repositórios vinculados por `.git` como projetos autônomos. A vinculação ao projeto canônico deve ser preservada para não inflar as métricas gerais de commits e projetos.
3. **Persistência de Override de Propósito**:
   - Se o usuário editar o propósito de um projeto na interface, o campo `purpose_override = 1` é setado no SQLite. Novas varreduras NÃO devem sobrescrever o texto com o README original se o override estiver ativo.
4. **Zero Vermelho Inegociável**:
   - Em caso de status de risco, atenção ou bloqueio, utilize tons da paleta **Amber Gold** (`amber-400`, `amber-500`, `amber-600`) ou **Slate**. Nunca utilizar classes `red-*` ou tons avermelhados.

---

## 6. Definição de Pronto (Definition of Done)

Uma tarefa ou spec só é considerada concluída quando:
1. `npm test` passa com 100% de sucesso.
2. Nenhuma dependência externa não autorizada foi adicionada ao `package.json`.
3. Todos os arquivos de documentação (`spec.md`, `plan.md`, `tasks.md`, `STATUS.md`, `AGENT_CONTEXT.md`) estão sincronizados com o código real.
4. Handoff formal gerado em `docs/agents/handoffs/`.
5. Histórico Git limpo e atômico.

