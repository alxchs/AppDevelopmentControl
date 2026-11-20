# Instruções para a executora (AGY) — AppDevelopmentControl

Leia antes de qualquer tarefa. Mantido pela Claude a partir das auditorias.

## Regras de entrega

- Não faça commit, push, stash, reset nem troca de branch, a menos que o brief peça. Todo commit precisa entrar no `~/.dev-method/ship/AI-GIT-LEDGER.md` (`Log-AiGit.ps1`). O commit `8f9646a` (2026-11-19) ficou fora do ledger.
- Só marque uma tarefa como `concluído` no `tasks.md` quando a suíte inteira (`npm test`) estiver verde. Uma suíte parcial não conta.
- O relatório traz a saída literal dos comandos e o `git diff --stat`.

## Ambiente

- O `node` do PATH é o 20.20.2 e não tem `node:sqlite`, que o `src/db.js` exige. Rode os testes com Node 22 ou superior. Neste PC: `C:\Program Files\Adobe\Adobe Creative Cloud Experience\libs\node.exe` (v24.22.2).
- O `test/test_all.mjs` depende de dados reais da máquina: projeto `KillTask` em `c:\desenv\utils` e banco real populado. Neste PC ele falha no passo 7/8.

## Base de Conhecimento e Padrões Sólidos

### Servidor HTTP (`src/server.js`), validado em 34c8101 e 8f9646a
- O handler inteiro fica dentro de um `try/catch` central, que responde com `err.statusCode || 500`. Se `res.headersSent`, só chama `res.end()`.
- Arquivo estático: `decodeURIComponent` dentro de `try` (falha vira 400). Antes de qualquer chamada ao filesystem, rejeite com 400 todo segmento que case `DOS_DEVICE_RE` ou contenha `:` (fluxos alternativos do NTFS). Use `path.resolve` e exija `startsWith(PUBLIC_DIR + path.sep)`.
- Use um único `serveStaticFile`, com `stream.on('error')` registrado antes do `pipe`.
- `parseJsonBody` corta em 1 MB, faz `req.resume()` e entrega o 413 ao cliente pelo `catch` central.

### Git no scanner (`src/scanner.js`), validado em 8f9646a
- Chame o git sempre por `this.safeGit([...args], cwd)`, que usa `spawnSync` com array, `maxBuffer` de 10 MB e `stdio` com `ignore` no stderr. Nunca interpole string em comando de shell.
- `safeGit` retorna `''` em erro. Quem chama trata `''` como ausência, como antes fazia o `catch`.

### Testes
- Arquivo temporário de teste vai para o `%TEMP%`, nunca para `test/`. Gere o caminho **uma vez**, guarde numa variável e apague essa mesma variável no `finally`. O erro encontrado: o `test_security_resilience.mjs` gerava `temp-close-${Date.now()}.db` duas vezes, então a limpeza nunca achava o arquivo e sobrava um `.db` por execução.
- Teste não escreve no banco real (`app_development_control.db`). Use `new AppDb(<caminho temporário>)` e `createServer({ db, scanner })`.
