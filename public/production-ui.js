// Exibicao da producao v2 (SPEC-0007 T10): selo de origem, contagem de alertas e painel de indicadores.
// Funcoes puras (recebem dados, devolvem HTML); sem DOM aqui para poderem ser testadas em memoria.
// Paleta: Slate, Indigo, Emerald, Amber, Sky. NUNCA vermelho (NFR-004); severidade "erro" = Amber forte.

function prodEsc(v) {
  return String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Numero conhecido ou o texto "sem dado": desconhecido nunca vira zero na tela.
function prodNum(v, suffix) {
  return typeof v === 'number' && Number.isFinite(v) ? String(v) + (suffix || '') : '<span class="text-slate-500 italic">sem dado</span>';
}

const PROD_SOURCE_LABELS = {
  production_v2: { text: 'v2', title: 'Numeros lidos do controle de producao v2 (docs/production)', cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  production_v2_worktree: { text: 'v2 · worktree', title: 'Controle v2 lido de uma worktree (o checkout principal nao tem docs/production)', cls: 'bg-sky-500/15 text-sky-300 border-sky-500/30' },
  specs_md: { text: 'SPECS.md', title: 'Numeros lidos do resumo SPECS.md (sem controle v2 aceito)', cls: 'bg-slate-700/40 text-slate-300 border-slate-600/50' },
  none: { text: 'sem specs', title: 'Nenhuma fonte de specs encontrada', cls: 'bg-slate-800 text-slate-500 border-slate-700' }
};

// Selo de origem. Controle rejeitado ganha aviso Amber ao lado da origem que esta valendo (fallback).
function prodSourceBadge(production) {
  const pr = production || {};
  const def = PROD_SOURCE_LABELS[pr.source] || PROD_SOURCE_LABELS.none;
  let html = `<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${def.cls}" title="${prodEsc(def.title)}">${prodEsc(def.text)}</span>`;
  if (pr.status === 'rejected') {
    html += ` <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border bg-amber-500/25 text-amber-300 border-amber-400/60" title="O controle v2 foi rejeitado; veja os problemas no detalhe do projeto">v2 rejeitado</span>`;
  }
  return html;
}

// Contagem de alertas por severidade (info Slate, aviso Amber, erro Amber forte). Vazio quando nao ha nenhum.
function prodAlertCounts(production) {
  const c = (production && production.issue_counts) || {};
  const parts = [];
  if (c.error > 0) parts.push(`<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border bg-amber-500/30 text-amber-200 border-amber-400/70" title="Problemas de severidade erro no controle">${c.error} erro${c.error > 1 ? 's' : ''}</span>`);
  if (c.warning > 0) parts.push(`<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border bg-amber-500/10 text-amber-300 border-amber-500/30" title="Avisos no controle">${c.warning} aviso${c.warning > 1 ? 's' : ''}</span>`);
  if (c.info > 0) parts.push(`<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] border bg-slate-800 text-slate-400 border-slate-700" title="Informacoes sobre o controle">${c.info} info</span>`);
  return parts.join(' ');
}

const PROD_SEV_CLS = {
  error: 'bg-amber-500/30 text-amber-200 border-amber-400/70',
  warning: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  info: 'bg-slate-800 text-slate-400 border-slate-700'
};
const PROD_SEV_TEXT = { error: 'erro', warning: 'aviso', info: 'info' };

function prodRow(label, value) {
  return `<div class="flex items-center justify-between gap-3 text-[11px]"><span class="text-slate-400">${prodEsc(label)}</span><span class="text-slate-200 font-mono text-right">${value}</span></div>`;
}

function prodRatio(r) {
  if (!r || r.sem_dado || r.percent == null) return '<span class="text-slate-500 italic">sem dado</span>';
  return `${r.percent}% <span class="text-slate-500">(${r.n}/${r.base})</span>`;
}

function prodCoverage(e) {
  if (!e || e.sum == null) return `<span class="text-slate-500 italic">sem dado</span> <span class="text-slate-500">(0/${e ? e.total : 0})</span>`;
  return `${e.sum} h <span class="text-slate-500">(${e.with_data}/${e.total} specs)</span>`;
}

// Painel completo do modal. `detail` = resposta de GET /api/projects/:name/production.
function prodPanelHtml(detail) {
  if (!detail || !detail.import) {
    const src = detail && PROD_SOURCE_LABELS[detail.source] ? PROD_SOURCE_LABELS[detail.source].text : 'sem specs';
    return `<div class="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400">Sem controle de producao v2 neste projeto. Numeros lidos de: <strong class="text-slate-200">${prodEsc(src)}</strong>.</div>`;
  }
  const imp = detail.import;
  const m = detail.metrics;
  const counts = imp.issue_counts || {};
  const origin = PROD_SOURCE_LABELS[imp.source_kind] || PROD_SOURCE_LABELS.production_v2;
  let html = `<div class="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">`;
  html += `<div class="flex items-center justify-between flex-wrap gap-2"><h5 class="text-xs font-semibold text-indigo-300 uppercase tracking-wider">Producao (protocolo v2)</h5><div class="flex items-center gap-1.5">${prodSourceBadge({ source: imp.source_kind, status: imp.status })} ${prodAlertCounts({ issue_counts: counts })}</div></div>`;
  html += `<div class="space-y-1">`
    + prodRow('Origem', prodEsc(origin.text))
    + prodRow('Arquivo', `<span class="break-all">${prodEsc(imp.control_path || '-')}</span>`)
    + prodRow('Importado em', prodEsc(imp.imported_at || '-'))
    + prodRow('Atualizado pelo projeto em', imp.declared_updated_at ? prodEsc(imp.declared_updated_at) : '<span class="text-slate-500 italic">sem dado</span>')
    + prodRow('Situacao da importacao', prodEsc(imp.status === 'valid' ? 'valida' : imp.status === 'valid_with_alerts' ? 'valida com alertas' : imp.status === 'rejected' ? 'rejeitada (mantida a ultima boa)' : imp.status))
    + `</div>`;
  if (m) {
    const p = m.production || {};
    const f = m.flow || {};
    const b = m.blockers || {};
    const pr = m.predictability || {};
    const q = m.control_quality || {};
    const eff = m.effort || {};
    html += `<div class="grid grid-cols-1 md:grid-cols-2 gap-3">`;
    html += `<div class="space-y-1"><h6 class="text-[10px] font-semibold text-slate-400 uppercase">Producao (pontos)</h6>`
      + prodRow('Total', prodNum(p.total_points)) + prodRow('Concluidos', prodNum(p.completed_points))
      + prodRow('Restantes', prodNum(p.remaining_points)) + prodRow('Impedidos', prodNum(b.blocked_points))
      + prodRow('Aguardando Alexandre', prodNum(b.awaiting_alexandre_points)) + prodRow('SPECs sem ponto', prodNum(p.specs_without_points))
      + `</div>`;
    html += `<div class="space-y-1"><h6 class="text-[10px] font-semibold text-slate-400 uppercase">Esforco (horas, cobertura)</h6>`
      + prodRow('Original', prodCoverage(eff.original)) + prodRow('Atual', prodCoverage(eff.current))
      + prodRow('Real', prodCoverage(eff.actual)) + prodRow('Restante', prodCoverage(eff.remaining))
      + `</div>`;
    html += `<div class="space-y-1"><h6 class="text-[10px] font-semibold text-slate-400 uppercase">Previsibilidade e fluxo</h6>`
      + prodRow('Reestimadas (orig. x atual)', pr.reestimate && !pr.reestimate.sem_dado ? `${pr.reestimate.changed}/${pr.reestimate.base}` : prodNum(null))
      + prodRow('Erro de estimativa (h)', pr.estimate_error && !pr.estimate_error.sem_dado ? prodNum(pr.estimate_error.mean_error_hours) : prodNum(null))
      + prodRow('Em andamento (WIP)', prodNum(f.wip)) + prodRow('Em validacao', prodNum(f.in_validation))
      + prodRow('Ciclo mediano (dias)', f.cycle_time_days && !f.cycle_time_days.sem_dado ? prodNum(f.cycle_time_days.median) : prodNum(null))
      + `</div>`;
    html += `<div class="space-y-1"><h6 class="text-[10px] font-semibold text-slate-400 uppercase">Qualidade do controle</h6>`
      + prodRow('Conclusoes com evidencia', prodRatio(q.completed_with_evidence))
      + prodRow('Estimativas justificadas', prodRatio(q.estimates_justified))
      + prodRow('Tarefas com criterio verificavel', prodRatio(q.criteria_verifiable))
      + prodRow('Campos desconhecidos', prodRatio(q.unknown_fields))
      + prodRow('Eventos sem referencia', prodRatio(q.events_without_reference))
      + prodRow('Divergencias', q.divergences ? prodNum(q.divergences.n) : prodNum(null))
      + prodRow('Auditoria completa ha (dias)', prodNum(q.last_full_audit_age_days))
      + `</div>`;
    html += `</div>`;
    if (m.baseline && m.baseline.present) {
      const bl = m.baseline;
      html += `<div class="space-y-1"><h6 class="text-[10px] font-semibold text-slate-400 uppercase">Baseline x atual</h6>`
        + prodRow('SPECs', `${prodNum(bl.baseline_specs)} → ${prodNum(bl.current_specs)}`)
        + prodRow('Pontos', `${prodNum(bl.baseline_points)} → ${prodNum(bl.current_points)}`) + `</div>`;
    } else {
      html += `<div class="text-[11px] text-slate-500 italic">Baseline ausente.</div>`;
    }
  } else {
    html += `<div class="text-[11px] text-slate-500 italic">Indicadores indisponiveis (importacao rejeitada, sem dados anteriores).</div>`;
  }
  const issues = (detail.issues || []).slice(0, 12);
  if (issues.length) {
    html += `<div class="space-y-1"><h6 class="text-[10px] font-semibold text-slate-400 uppercase">Problemas (${(detail.issues || []).length})</h6>`
      + issues.map((i) => `<div class="flex items-start gap-2 text-[11px]"><span class="shrink-0 inline-flex px-1.5 py-0.5 rounded text-[10px] border ${PROD_SEV_CLS[i.severity] || PROD_SEV_CLS.info}">${prodEsc(PROD_SEV_TEXT[i.severity] || i.severity)}</span><span class="text-slate-300"><span class="font-mono text-slate-400">${prodEsc(i.code)}</span>${i.entity_id ? ' · ' + prodEsc(i.entity_id) : ''}${i.line ? ' (linha ' + prodEsc(i.line) + ')' : ''} — ${prodEsc(i.message)}</span></div>`).join('')
      + ((detail.issues || []).length > issues.length ? `<div class="text-[10px] text-slate-500">e mais ${(detail.issues || []).length - issues.length} problema(s) na API.</div>` : '')
      + `</div>`;
  }
  html += `</div>`;
  return html;
}
