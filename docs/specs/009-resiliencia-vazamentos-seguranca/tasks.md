# SPEC-0009: Prevenção de Memory Leaks, Resiliência do Servidor HTTP e Proteção contra Violação de Acesso — TASKS

Status: APROVADO (Alexandre, 2026-11-18)
Branch: `feature/resiliencia-vazamentos-seguranca`

| # | Tarefa | Atende | Pronto quando | Estado |
|---|---|---|---|---|
| **T1** | Implementar cache de prepared statements (`stmtCache`) e método `close()` em `AppDb` (`src/db.js`); proteger leituras `?.count` e `?.n` | AC-5, AC-6, FR-005 | `AppDb` possui `close()`, statements repetitivos são cacheados e não causam vazamento nativo | concluído |
| **T2** | Blindar servidor HTTP contra Path Traversal, DOS Device Names, stream errors, payload > 1MB e uncaught rejections (`src/server.js`) | AC-1, AC-2, AC-3, AC-4, FR-001, FR-002, FR-003, FR-004 | Tentativas de escape retornam 403, DOS devices bloqueados, stream abort não derruba processo, payload limitado a 1MB | concluído |
| **T3** | Implementar `scanSingleProject` e substituir chamadas diretas de shell por `spawnSync` seguro com `maxBuffer: 10MB` (`src/scanner.js`) | AC-7, AC-8, FR-006, FR-007 | `scanSingleProject` executa com sucesso; chamadas Git com tags/commits passam em array seguro | concluído |
| **T4** | Criar suíte de testes automatizados `test/test_security_resilience.mjs` cobrindo AC-1 a AC-8 e encadear no script de teste | AC-1 a AC-8 | Suíte executa todos os cenários de segurança e resiliência com sucesso | concluído |
| **T5** | Atualizar controle de produção (`production-control.json`, `production-events.jsonl`, `SPEC-INDEX.md` e `SPECS.md`), validar com `Validar-Producao.ps1` e consolidar status | protocolo v2, METODO §25 | `Validar-Producao.ps1` retorna `OK`, SPEC-0009 registrada e refletida | concluído |
