# SPEC-0009: Prevenção de Memory Leaks, Resiliência do Servidor HTTP e Proteção contra Violação de Acesso

Status: APROVADO (Alexandre, 2026-11-18)
Peso: 5 (Fibonacci) | Horas: 8h (estimativa provisória)
Tipo: bugfix / hardening
Controle: `SPEC-0009` em `docs/production/production-control.json`. Protocolo: v2.

---

## 1. Contexto e Motivação
A auditoria técnica de estabilidade, segurança e gestão de memória do `AppDevelopmentControl` identificou vulnerabilidades arquiteturais e pontos de fragilidade que podem comprometer a operação contínua do dashboard na rede local (LAN):

1. **Proliferação de Prepared Statements Nativos**: Em `src/db.js`, métodos de leitura intensiva (`getAllProjects`, `getProductionSummary`, `getKpis`) invocam `this.db.prepare(...)` repetidamente dentro de loops para cada projeto catalogado. Para 26 projetos, são alocados mais de 100 statements nativos em C++ por requisição sem cacheamento nem fechamento explícito, retendo memória nativa do SQLite.
2. **Ausência de Fechamento de Banco (`AppDb.close`)**: A classe `AppDb` não expõe método `close()`, mantendo locks e descritores de arquivos abertos.
3. **Vulnerabilidade de Path Traversal e DOS Device Names em `src/server.js`**: A entrega de arquivos estáticos concatena caminhos sem validar se o destino permanece confinado em `public/`. Nomes reservados do Windows (`CON`, `PRN`, `AUX`, `NUL`, `COM1-9`, `LPT1-9`) ou arquivos fora do escopo podem disparar exceções de violação de acesso em nível de driver Win32 (`ntdll.dll`/`kernel32.dll`) ou `EPERM`/`EACCES`.
4. **Unhandled Stream Error e Queda do Processo**: `fs.createReadStream().pipe(res)` não possui listener de erro. Caso o cliente aborte a conexão durante a transmissão, um evento `'error'` não tratado derruba todo o processo Node.js.
5. **Acúmulo Indefinido de Payload HTTP**: `parseJsonBody` lê chunks sem limite de tamanho ou timeout, expondo o servidor a estouro de memória (OOM).
6. **Injeção de Argumentos em Comandos Git e Buffer Limit**: `src/scanner.js` interpola strings diretamente no shell (`execSync`) ao consultar tags e commits, e não impõe limite defensivo de buffer em `git log --format=%at`.
7. **Método Inexistente na API**: A rota `POST /api/projects/register` chama `scanner.scanSingleProject(...)`, método inexistente que causa `TypeError` e HTTP 500.

---

## 2. Histórias de Usuário
- **US1 (P1)**: Como gestor utilizando o dashboard na LAN, quero que o servidor permaneça ativo e estável sem vazamentos de memória e sem quedas causadas por requisições anômalas, abortadas ou malformadas.
- **US2 (P1)**: Como gestor de infraestrutura local, quero a garantia de que o servidor HTTP nunca acesse arquivos arbitrários fora da pasta pública nem dispositivos reservados do sistema operacional Windows.
- **US3 (P2)**: Como desenvolvedor/agente, quero poder cadastrar pastas customizadas de projetos sem que o servidor lance erros de método inexistente.
- **US4 (P2)**: Como operador de testes e varreduras, quero poder fechar conexões de banco de dados (`db.close()`) de forma limpa e determinística.

---

## 3. Cenários de Aceite (AC)

| ID | Cenário | Comportamento Esperado |
|---|---|---|
| **AC-1** | Requisição de arquivo estático com tentativa de escape (`/../../../Windows/win.ini` ou `/..%2F..%2Fpackage.json`) | Servidor rejeita com HTTP 403 (Forbidden) ou 404 (Not Found); nenhum arquivo fora de `public/` é exposto. |
| **AC-2** | Requisição contendo nomes de dispositivos reservados do Windows (`/CON`, `/AUX`, `/PRN`, `/NUL`, `/COM1`) | Servidor rejeita imediatamente com HTTP 400 ou 404 sem invocar chamadas de filesystem no driver do SO. |
| **AC-3** | Cliente encerra abruptamente a conexão durante streaming de arquivo estático | Servidor captura o erro da stream e finaliza sem crashar o processo Node.js. |
| **AC-4** | Requisição enviando payload excessivo (> 1 MB) para `parseJsonBody` | Servidor encerra a leitura e rejeita com HTTP 413 (Payload Too Large). |
| **AC-5** | Chamadas repetidas a `getAllProjects()` e consultas do banco | `AppDb` reutiliza prepared statements via cache interno em vez de alocar novos ponteiros nativos C++ a cada iteração. |
| **AC-6** | Invocação de `AppDb.close()` | Conexão SQLite é encerrada e descritores/locks de arquivos são liberados. |
| **AC-7** | Execução de `POST /api/projects/register` com caminho existente | `ProjectScanner.scanSingleProject` executa a varredura individual e persiste o projeto sem lançar exceção de método inexistente. |
| **AC-8** | Execução de comandos Git no scanner com tags contendo caracteres especiais ou espaços | Comandos utilizam passagem segura de argumentos em array (`spawnSync`) sem quebra de shell. |

---

## 4. Requisitos Funcionais e Não-Funcionais
- **FR-001**: O servidor HTTP DEVE validar se todo arquivo estático resolvido reside estritamente sob `PUBLIC_DIR` e não contém dispositivos reservados do Windows.
- **FR-002**: As streams de leitura de arquivos estáticos DEVEM possuir tratamento de erro explícito antes do `.pipe(res)`.
- **FR-003**: O parser de JSON HTTP DEVE rejeitar payloads maiores que 1 MB.
- **FR-004**: O manipulador de rotas do `http.createServer` DEVE conter tratamento central de exceções para garantir resposta HTTP 500 sem gerar Unhandled Rejections no Node.js.
- **FR-005**: A classe `AppDb` DEVE implementar cache de prepared statements (`stmtCache`) e método `close()`.
- **FR-006**: A classe `ProjectScanner` DEVE implementar `scanSingleProject(projectPath, label, isCustom)`.
- **FR-007**: As invocações de Git no scanner DEVEM utilizar argumentos em array (`spawnSync`) para evitar quebra de shell ou injeção.
- **NFR-001**: O código não deve adicionar dependências externas (`node_modules`), mantendo conformidade com a Decisão D-001.
