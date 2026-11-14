// Gera docs/specs/SPECS.md a partir de docs/production/production-control.json (protocolo v2 §25).
// Uso: node tools/gen-specs-md.mjs [raiz-do-projeto]   (so escreve em docs/specs/SPECS.md do proprio projeto)
import fs from 'fs';
import path from 'path';

const root = path.resolve(process.argv[2] || '.');
const c = JSON.parse(fs.readFileSync(path.join(root, 'docs/production/production-control.json'), 'utf8').replace(/^﻿/, ''));
const CATS = [
  ['finalizadas', '⚪ Finalizadas', '⚪ Finalizada'],
  ['em_andamento', '🔴 Em Andamento', '🔴 Em Andamento'],
  ['fila', '🟢 Fila', '🟢 Fila'],
  ['dependendo_alexandre', '🟡 Dependendo de mim / Alexandre', '🟡 Dependendo de mim'],
  ['impedidas', '⛔ Impedidas', '⛔ Impedida'],
  ['invalidas', '➖ Inválidas / Descartadas', '➖ Inválida']
];
const specs = c.specs;
const pts = (s) => (typeof s.points === 'number' ? s.points : 0);
const total = specs.reduce((a, s) => a + pts(s), 0);
const by = Object.fromEntries(CATS.map(([k]) => [k, specs.filter((s) => s.category === k)]));
const pct = (n) => (total ? Math.round((n / total) * 1000) / 10 : 0);
const sum = (l) => l.reduce((a, s) => a + pts(s), 0);
const commit = (s) => {
  const e = (s.evidence || []).find((x) => x.kind === 'commit');
  return e ? '`' + e.ref + '`' : '—';
};
const L = [];
L.push('# Controle e Índice Mestre de Specs (SPECS.md) — ' + c.project.name, '');
L.push('> **Gerado a partir de docs/production/production-control.json (Protocolo de Produção v2). Não editar à mão: edite o JSON e regenere com `node tools/gen-specs-md.mjs`.** Regra METODO.md §25: toda spec tem Peso Fibonacci; atualizar antes de implementar e na entrega.', '');
L.push('---', '', '## 1. Escala de Peso (Fibonacci)', '');
L.push('Escala e referências em [../production/estimation-reference.md](../production/estimation-reference.md). Pontos e horas são independentes.', '');
L.push('## 2. Resumo Executivo para Dashboard de Projetos', '');
const metricas = { total_specs: specs.length, total_pontos: Number(total.toFixed(1)) };
for (const [k] of CATS) metricas[k] = { quantidade: by[k].length, pontos: sum(by[k]), percentual: pct(sum(by[k])) };
const toJ = (o) => JSON.stringify(o, null, 2).replace(/"percentual": (\d+)(,?)\n/g, '"percentual": $1.0$2\n');
L.push('```json', toJ({
  projeto: c.project.name,
  versao_atual: '1.0.0 (package.json)',
  data_extracao: (c.project.last_updated_at || '').slice(0, 10),
  fonte: 'docs/production/production-control.json',
  metricas
}), '```', '');
L.push('| Categoria | Quantidade | Pontos | % dos pontos |', '|:---|:---:|:---:|:---:|');
for (const [k, h] of CATS) L.push(`| ${h} | ${by[k].length} | ${sum(by[k])} | ${sum(by[k]) ? pct(sum(by[k])) + '%' : '0%'} |`);
L.push(`| **TOTAL** | **${specs.length}** | **${total}** | **100%** |`, '', '## 3. Agrupamento Detalhado', '');
for (const [k, h] of CATS) {
  L.push(`### ${h} (${by[k].length} specs · ${sum(by[k])} pontos)`);
  if (!by[k].length) L.push('*(nenhuma)*');
  for (const s of by[k]) L.push(`- **${s.id}** (Peso ${s.points ?? '—'}) — ${s.title}`);
  L.push('');
}
L.push('## 4. Tabela Mestra Completa de Specs', '');
L.push('| ID | Nome / Escopo da Spec | Peso | Categoria | Responsável | Entrega / Commit |', '|:---|:---|:---:|:---:|:---|:---|');
for (const s of specs) {
  const leg = (s.legacy_ids || [])[0] ? ` (legado: ${s.legacy_ids[0]})` : '';
  const cat = CATS.find(([k]) => k === s.category);
  L.push(`| **${s.id}** | ${s.title}${leg} | ${s.points ?? '—'} | ${cat ? cat[2] : s.category} | ${s.owner || '—'} | ${commit(s)} |`);
}
L.push('');
fs.writeFileSync(path.join(root, 'docs/specs/SPECS.md'), L.join('\r\n') + '\r\n');
console.log('SPECS.md gerado: ' + specs.length + ' specs, ' + total + ' pontos');
