# Controle e Índice Mestre de Specs (SPECS.md) — AppDevelopmentControl

> **Gerado a partir de docs/production/production-control.json (Protocolo de Produção v2). Não editar à mão: edite o JSON e regenere com `node tools/gen-specs-md.mjs`.** Regra METODO.md §25: toda spec tem Peso Fibonacci; atualizar antes de implementar e na entrega.

---

## 1. Escala de Peso (Fibonacci)

Escala e referências em [../production/estimation-reference.md](../production/estimation-reference.md). Pontos e horas são independentes.

## 2. Resumo Executivo para Dashboard de Projetos

```json
{
  "projeto": "AppDevelopmentControl",
  "versao_atual": "1.0.0 (package.json)",
  "data_extracao": "2026-11-18",
  "fonte": "docs/production/production-control.json",
  "metricas": {
    "total_specs": 9,
    "total_pontos": 42,
    "finalizadas": {
      "quantidade": 6,
      "pontos": 24,
      "percentual": 57.1
    },
    "em_andamento": {
      "quantidade": 3,
      "pontos": 18,
      "percentual": 42.9
    },
    "fila": {
      "quantidade": 0,
      "pontos": 0,
      "percentual": 0.0
    },
    "dependendo_alexandre": {
      "quantidade": 0,
      "pontos": 0,
      "percentual": 0.0
    },
    "impedidas": {
      "quantidade": 0,
      "pontos": 0,
      "percentual": 0.0
    },
    "invalidas": {
      "quantidade": 0,
      "pontos": 0,
      "percentual": 0.0
    }
  }
}
```

| Categoria | Quantidade | Pontos | % dos pontos |
|:---|:---:|:---:|:---:|
| ⚪ Finalizadas | 6 | 24 | 57.1% |
| 🔴 Em Andamento | 3 | 18 | 42.9% |
| 🟢 Fila | 0 | 0 | 0% |
| 🟡 Dependendo de mim / Alexandre | 0 | 0 | 0% |
| ⛔ Impedidas | 0 | 0 | 0% |
| ➖ Inválidas / Descartadas | 0 | 0 | 0% |
| **TOTAL** | **9** | **42** | **100%** |

## 3. Agrupamento Detalhado

### ⚪ Finalizadas (6 specs · 24 pontos)
- **SPEC-0001** (Peso 3) — Setup inicial e painel executivo base (AppDevelopmentControl)
- **SPEC-0002** (Peso 5) — Saude do portfolio, SDD Maturity Score e direcao executiva (SQLite WAL, scanner, servidor LAN)
- **SPEC-0003** (Peso 5) — Deep Executive Intelligence: stacks, metadados de continuidade, commits recentes, tripla visualizacao
- **SPEC-0004** (Peso 3) — Project Spotlight, seletor rapido, funil de estagios e stepper de specs
- **SPEC-0005** (Peso 5) — Veracidade dos dados: binds SQL, falsos positivos de acoes do Alexandre, resiliencia documental
- **SPEC-0006** (Peso 3) — Ingestao nativa de SPECS.md e pesos de dificuldade (Fibonacci) na dashboard

### 🔴 Em Andamento (3 specs · 18 pontos)
- **SPEC-0007** (Peso 8) — Dashboard consome docs/production v2: control.json, events.jsonl, baseline, reconstrucao SQLite, validacao de schema, metricas dos 11 e 12 do protocolo
- **SPEC-0008** (Peso 5) — Testes da ingestao v2: fixtures de control/events validos e invalidos, reconstrucao do SQLite, schema, duplicidade, metricas
- **SPEC-0009** (Peso 5) — Prevenção de memory leaks, resiliência do servidor HTTP e proteção contra violação de acesso

### 🟢 Fila (0 specs · 0 pontos)
*(nenhuma)*

### 🟡 Dependendo de mim / Alexandre (0 specs · 0 pontos)
*(nenhuma)*

### ⛔ Impedidas (0 specs · 0 pontos)
*(nenhuma)*

### ➖ Inválidas / Descartadas (0 specs · 0 pontos)
*(nenhuma)*

## 4. Tabela Mestra Completa de Specs

| ID | Nome / Escopo da Spec | Peso | Categoria | Responsável | Entrega / Commit |
|:---|:---|:---:|:---:|:---|:---|
| **SPEC-0001** | Setup inicial e painel executivo base (AppDevelopmentControl) (legado: Spec 001) | 3 | ⚪ Finalizada | AGY | `a63bf24` |
| **SPEC-0002** | Saude do portfolio, SDD Maturity Score e direcao executiva (SQLite WAL, scanner, servidor LAN) (legado: Spec 002) | 5 | ⚪ Finalizada | AGY | `7d29c28` |
| **SPEC-0003** | Deep Executive Intelligence: stacks, metadados de continuidade, commits recentes, tripla visualizacao (legado: Spec 003) | 5 | ⚪ Finalizada | AGY | `369b6b4` |
| **SPEC-0004** | Project Spotlight, seletor rapido, funil de estagios e stepper de specs (legado: Spec 004) | 3 | ⚪ Finalizada | AGY | `369b6b4` |
| **SPEC-0005** | Veracidade dos dados: binds SQL, falsos positivos de acoes do Alexandre, resiliencia documental (legado: Spec 005) | 5 | ⚪ Finalizada | AGY | `369b6b4` |
| **SPEC-0006** | Ingestao nativa de SPECS.md e pesos de dificuldade (Fibonacci) na dashboard (legado: Spec 006) | 3 | ⚪ Finalizada | AGY | `8f20b5e` |
| **SPEC-0007** | Dashboard consome docs/production v2: control.json, events.jsonl, baseline, reconstrucao SQLite, validacao de schema, metricas dos 11 e 12 do protocolo | 8 | 🔴 Em Andamento | claude | `fa23af1` |
| **SPEC-0008** | Testes da ingestao v2: fixtures de control/events validos e invalidos, reconstrucao do SQLite, schema, duplicidade, metricas | 5 | 🔴 Em Andamento | claude | `8abb739` |
| **SPEC-0009** | Prevenção de memory leaks, resiliência do servidor HTTP e proteção contra violação de acesso | 5 | 🔴 Em Andamento | AGY | `34c8101` |

