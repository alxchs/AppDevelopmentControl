// Motor de Avaliação Executiva: Health Status & SDD Maturity Score

/**
 * Calcula o Health Status (Farol de Saúde Gerencial)
 * Retorna: { status, label, tone, badgeClass, reason }
 * Tons: 'emerald' (Em Tração), 'amber' (Bloqueado / Atenção / Em Risco), 'slate' (Estável / Concluído), 'indigo' (Em Incubação)
 */
export function computeHealthStatus(p) {
  // 1. Bloqueado / Atenção (Prioridade Máxima de Decisão)
  if (p.alexandre_pending_count > 0) {
    return {
      status: 'blocked',
      label: 'Bloqueado / Atenção',
      tone: 'amber',
      badgeClass: 'bg-amber-500/15 text-amber-300 border border-amber-500/30',
      reason: `${p.alexandre_pending_count} decisão/ação do Alexandre pendente`
    };
  }

  // 2. Em Risco / Dormente (Parado há mais de 45 dias com tarefas ou specs em aberto)
  if (p.days_since_last_change > 45 && p.pending_specs > 0) {
    return {
      status: 'stale',
      label: 'Em Risco / Dormente',
      tone: 'amber',
      badgeClass: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
      reason: `Sem alteração há ${p.days_since_last_change} dias com ${p.pending_specs} specs pendentes`
    };
  }

  // 3. Em Incubação / Protótipo (Sem specs de SDD estruturadas)
  if (p.total_specs === 0) {
    return {
      status: 'incubating',
      label: 'Em Incubação',
      tone: 'indigo',
      badgeClass: 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30',
      reason: 'Estrutura formal de specs SDD ainda não criada'
    };
  }

  // 4. Em Tração (Ativo recentemente com commits e specs em andamento)
  if (p.changes_7d > 0 || (p.changes_30d >= 5 && p.days_since_last_change <= 14)) {
    return {
      status: 'active',
      label: 'Em Tração',
      tone: 'emerald',
      badgeClass: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30',
      reason: `${p.changes_7d} commits nos últimos 7d (${p.changes_30d} no mês)`
    };
  }

  // 5. Estável / Concluído (Specs 100% concluídas, sem bloqueios e sem commits recentes)
  if (p.total_specs > 0 && p.pending_specs === 0 && p.alexandre_pending_count === 0) {
    return {
      status: 'stable',
      label: 'Estável / Concluído',
      tone: 'slate',
      badgeClass: 'bg-slate-800 text-slate-300 border border-slate-700',
      reason: `Todas as ${p.total_specs} specs concluídas e operacionais`
    };
  }

  // 6. Pausado / Manutenção Normal
  return {
    status: 'paused',
    label: 'Pausado',
    tone: 'slate',
    badgeClass: 'bg-slate-800 text-slate-400 border border-slate-700',
    reason: `Inativo há ${p.days_since_last_change} dias (${p.done_specs}/${p.total_specs} specs concluídas)`
  };
}

/**
 * Calcula o SDD Maturity Score (0 a 100%) conforme diretrizes do METODO.md
 * Retorna: { score, breakdown: { specs, tasks, readme, git } }
 */
export function computeSddMaturityScore(p) {
  let specsScore = 0;
  let tasksScore = 0;
  let readmeScore = 0;
  let gitScore = 0;

  // 1. Specs Estruturadas (Max: 35 pts)
  if (p.total_specs > 0) {
    specsScore += 20; // Possui specs em docs/specs
    if (p.total_specs >= 3) specsScore += 10;
    else specsScore += 5;
    if (p.done_specs > 0) specsScore += 5;
  }

  // 2. Conclusão e Checklist de Tarefas (Max: 30 pts)
  if (p.total_specs > 0) {
    const ratio = p.done_specs / p.total_specs;
    tasksScore = Math.round(ratio * 30);
  }

  // 3. Documentação de Propósito (Max: 20 pts)
  if (p.purpose && p.purpose !== 'Propósito não documentado') {
    readmeScore += 15;
    if (p.purpose_source && p.purpose_source.toLowerCase().includes('readme')) {
      readmeScore += 5;
    }
  }

  // 4. Higiene e Rastreabilidade Git (Max: 15 pts)
  if (p.has_git) {
    gitScore += 8;
    if (p.last_tag) gitScore += 4;
    if (p.github_url) gitScore += 3;
  }

  const totalScore = Math.min(100, specsScore + tasksScore + readmeScore + gitScore);

  return {
    score: totalScore,
    breakdown: {
      specs: specsScore,
      tasks: tasksScore,
      readme: readmeScore,
      git: gitScore
    }
  };
}
