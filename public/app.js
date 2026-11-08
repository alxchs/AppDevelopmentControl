// AppDevelopmentControl - Executive Frontend Logic (v2.0 Deep Intelligence)

let allProjects = [];
let allAlexandreActions = [];
let kpiData = null;
let currentFilter = 'all';
let currentSort = 'activity';
let currentViewMode = 'cards'; // 'cards' ou 'table'
let activityChart = null;
let specsChart = null;
let selectedProject = null;

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  await loadAllData();
  lucide.createIcons();
});

function setupEventListeners() {
  // Sincronizar
  document.getElementById('btn-rescan').addEventListener('click', handleRescan);

  // Exportar NotebookLM
  document.getElementById('btn-export-notebooklm').addEventListener('click', () => {
    window.location.href = '/api/export/notebooklm';
  });

  // Copiar link LAN
  document.getElementById('btn-copy-lan').addEventListener('click', () => {
    const text = document.getElementById('lan-primary-url').innerText;
    navigator.clipboard.writeText(text).then(() => {
      alert(`Link copiado para a área de transferência: ${text}`);
    });
  });

  // Busca Inteligente
  const searchInput = document.getElementById('search-input');
  const btnClear = document.getElementById('btn-clear-search');
  searchInput.addEventListener('input', (e) => {
    if (e.target.value.trim()) {
      btnClear.classList.remove('hidden');
    } else {
      btnClear.classList.add('hidden');
    }
    applyFilterAndRender();
  });

  btnClear.addEventListener('click', () => {
    searchInput.value = '';
    btnClear.classList.add('hidden');
    applyFilterAndRender();
  });

  // View Switcher (Cards vs Pipeline vs Tabela Densa)
  document.getElementById('btn-view-cards').addEventListener('click', () => {
    setViewMode('cards');
  });
  const btnViewPipeline = document.getElementById('btn-view-pipeline');
  if (btnViewPipeline) {
    btnViewPipeline.addEventListener('click', () => {
      setViewMode('pipeline');
    });
  }
  document.getElementById('btn-view-table').addEventListener('click', () => {
    setViewMode('table');
  });

  // Spotlight Select & Navigation (Spec 004)
  const spotlightSelect = document.getElementById('spotlight-project-select');
  if (spotlightSelect) {
    spotlightSelect.addEventListener('change', (e) => {
      if (e.target.value) setSpotlightProject(e.target.value);
    });
  }
  const btnPrev = document.getElementById('btn-spotlight-prev');
  if (btnPrev) {
    btnPrev.addEventListener('click', () => navigateSpotlight(-1));
  }
  const btnNext = document.getElementById('btn-spotlight-next');
  if (btnNext) {
    btnNext.addEventListener('click', () => navigateSpotlight(1));
  }
  const btnSpotlightModal = document.getElementById('btn-spotlight-open-modal');
  if (btnSpotlightModal) {
    btnSpotlightModal.addEventListener('click', () => {
      const select = document.getElementById('spotlight-project-select');
      if (select && select.value) openProjectModal(select.value);
    });
  }

  // Filtros rápidos
  document.querySelectorAll('.filter-chip').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.filter-chip').forEach(b => {
        b.classList.remove('active', 'bg-indigo-600', 'text-white');
        b.classList.add('bg-slate-900', 'text-slate-300');
      });
      const target = e.currentTarget;
      target.classList.add('active', 'bg-indigo-600', 'text-white');
      target.classList.remove('bg-slate-900', 'text-slate-300');
      currentFilter = target.dataset.filter;
      applyFilterAndRender();
    });
  });

  // Ordenação
  document.getElementById('sort-select').addEventListener('change', (e) => {
    currentSort = e.target.value;
    applyFilterAndRender();
  });

  // Modal Fechar
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-project').addEventListener('click', (e) => {
    if (e.target.id === 'modal-project') closeModal();
  });

  // Modal Salvar Propósito
  document.getElementById('modal-save-purpose').addEventListener('click', handleSavePurpose);

  // Modal Tabs Navegação
  document.querySelectorAll('.modal-tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tabTarget = e.currentTarget.dataset.tab;
      switchModalTab(tabTarget);
    });
  });

  // Modal Adicionar Projeto
  const addModal = document.getElementById('modal-add-project');
  document.getElementById('btn-add-project').addEventListener('click', () => {
    document.getElementById('add-project-path').value = '';
    document.getElementById('add-project-label').value = '';
    document.getElementById('add-project-error').classList.add('hidden');
    addModal.classList.remove('hidden');
  });

  document.getElementById('modal-add-close').addEventListener('click', () => addModal.classList.add('hidden'));
  document.getElementById('btn-cancel-add').addEventListener('click', () => addModal.classList.add('hidden'));
  document.getElementById('btn-submit-add').addEventListener('click', handleRegisterProject);
}

function setViewMode(mode) {
  currentViewMode = mode;
  const btnCards = document.getElementById('btn-view-cards');
  const btnPipeline = document.getElementById('btn-view-pipeline');
  const btnTable = document.getElementById('btn-view-table');
  const gridSection = document.getElementById('projects-grid');
  const pipelineSection = document.getElementById('projects-pipeline-container');
  const tableSection = document.getElementById('projects-table-container');

  const activeClass = 'view-btn px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-600 text-white flex items-center gap-1.5 transition';
  const inactiveClass = 'view-btn px-2.5 py-1 rounded-md text-xs font-medium text-slate-400 hover:text-white flex items-center gap-1.5 transition';

  if (btnCards) btnCards.className = mode === 'cards' ? activeClass : inactiveClass;
  if (btnPipeline) btnPipeline.className = mode === 'pipeline' ? activeClass : inactiveClass;
  if (btnTable) btnTable.className = mode === 'table' ? activeClass : inactiveClass;

  if (mode === 'cards') {
    gridSection.classList.remove('hidden');
    if (pipelineSection) pipelineSection.classList.add('hidden');
    tableSection.classList.add('hidden');
  } else if (mode === 'pipeline') {
    gridSection.classList.add('hidden');
    if (pipelineSection) pipelineSection.classList.remove('hidden');
    tableSection.classList.add('hidden');
  } else {
    gridSection.classList.add('hidden');
    if (pipelineSection) pipelineSection.classList.add('hidden');
    tableSection.classList.remove('hidden');
  }
  applyFilterAndRender();
}

function switchModalTab(tabId) {
  document.querySelectorAll('.modal-tab-btn').forEach(btn => {
    if (btn.dataset.tab === tabId) {
      btn.className = 'modal-tab-btn active py-3 px-3.5 text-indigo-400 border-b-2 border-indigo-500 transition flex items-center gap-1.5';
    } else {
      btn.className = 'modal-tab-btn py-3 px-3.5 text-slate-400 hover:text-slate-200 border-b-2 border-transparent transition flex items-center gap-1.5';
    }
  });

  document.querySelectorAll('.modal-tab-content').forEach(content => {
    if (content.id === tabId) {
      content.classList.remove('hidden');
    } else {
      content.classList.add('hidden');
    }
  });
  lucide.createIcons();
}

// Carregar Dados da API
async function loadAllData() {
  try {
    const [lanRes, kpisRes, projectsRes, actionsRes] = await Promise.all([
      fetch('/api/lan-info').then(r => r.json()).catch(() => null),
      fetch('/api/kpis').then(r => r.json()).catch(() => null),
      fetch('/api/projects').then(r => r.json()).catch(() => []),
      fetch('/api/alexandre-actions').then(r => r.json()).catch(() => [])
    ]);

    if (lanRes) renderLanInfo(lanRes);
    if (kpisRes) {
      kpiData = kpisRes;
      renderKpis(kpisRes);
      renderCharts(kpisRes, projectsRes);
    }
    allProjects = projectsRes || [];
    allAlexandreActions = actionsRes || [];

    renderAlexandrePanel(allAlexandreActions);
    initOrUpdateSpotlight();
    applyFilterAndRender();
  } catch (err) {
    console.error('Erro ao carregar dados:', err);
  }
}

function renderLanInfo(lan) {
  const el = document.getElementById('lan-primary-url');
  if (lan.networkUrls && lan.networkUrls.length > 0) {
    el.innerText = lan.networkUrls[0].url;
  } else {
    el.innerText = lan.localhostUrl || 'http://localhost:3333';
  }
}

function renderKpis(kpis) {
  document.getElementById('kpi-total-projects').innerText = kpis.totalProjects;
  document.getElementById('kpi-total-worktrees').innerText = `${kpis.totalWorktrees} worktrees vinculadas`;
  document.getElementById('kpi-total-commits').innerText = kpis.totalCommits.toLocaleString();
  document.getElementById('kpi-commits-month').innerText = `${kpis.commits30d.toLocaleString()} nos últimos 30d`;
  document.getElementById('kpi-commits-week').innerText = kpis.commits7d.toLocaleString();
  document.getElementById('kpi-commits-24h').innerText = `${kpis.commits24h.toLocaleString()} nas últimas 24h`;
  document.getElementById('kpi-total-specs').innerText = kpis.totalSpecs;
  document.getElementById('kpi-done-specs').innerText = kpis.doneSpecs;

  const pct = kpis.totalSpecs > 0 ? Math.round((kpis.doneSpecs / kpis.totalSpecs) * 100) : 0;
  document.getElementById('kpi-specs-rate').innerText = `${pct}% concluídas`;

  document.getElementById('kpi-alexandre-actions').innerText = kpis.alexandreActionsCount;
  document.getElementById('alexandre-count-badge').innerText = `${kpis.alexandreActionsCount} Pendências`;
}

function renderAlexandrePanel(actions) {
  const list = document.getElementById('alexandre-actions-list');
  if (!actions || actions.length === 0) {
    list.innerHTML = `
      <div class="py-6 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
        <i data-lucide="check-circle" class="w-4 h-4 text-emerald-400"></i>
        <span>Nenhuma pendência ou decisão crítica aguardando o Alexandre no momento.</span>
      </div>
    `;
    return;
  }

  list.innerHTML = actions.map(a => `
    <div class="py-3 flex items-start justify-between gap-4 hover:bg-slate-850/50 px-2 rounded-lg transition">
      <div class="flex items-start gap-3">
        <div class="w-2 h-2 rounded-full bg-amber-400 mt-1.5 shrink-0"></div>
        <div>
          <div class="flex items-center gap-2 flex-wrap">
            <span class="font-bold text-xs text-amber-200">${escapeHtml(a.project_name)}</span>
            <span class="text-[11px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">${escapeHtml(a.file_path)}</span>
            ${a.source_worktree ? `<span class="text-[10px] text-indigo-300 bg-indigo-950/60 px-1.5 py-0.5 rounded">${escapeHtml(a.source_worktree)}</span>` : ''}
          </div>
          <p class="text-xs text-slate-300 mt-1 font-medium">${escapeHtml(a.title)}</p>
          ${a.snippet ? `<p class="text-[11px] text-slate-400 mt-0.5 italic line-clamp-2">"${escapeHtml(a.snippet)}"</p>` : ''}
        </div>
      </div>
      <button onclick="openProjectModal('${escapeHtml(a.project_name)}')" class="shrink-0 text-xs px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition">
        Ver
      </button>
    </div>
  `).join('');
}

function renderCharts(kpis, projects) {
  const top10 = [...projects]
    .sort((a, b) => b.changes_30d - a.changes_30d)
    .slice(0, 10);

  const labels = top10.map(p => p.name.length > 14 ? p.name.slice(0, 12) + '..' : p.name);
  const data30d = top10.map(p => p.changes_30d);
  const data7d = top10.map(p => p.changes_7d);

  const ctxActivity = document.getElementById('chart-activity').getContext('2d');
  if (activityChart) activityChart.destroy();

  activityChart = new Chart(ctxActivity, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Últimos 30 dias',
          data: data30d,
          backgroundColor: '#4f46e5',
          borderRadius: 6
        },
        {
          label: 'Últimos 7 dias',
          data: data7d,
          backgroundColor: '#10b981',
          borderRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: '#94a3b8', font: { size: 11 } }
        }
      },
      scales: {
        x: {
          ticks: { color: '#94a3b8', font: { size: 10 } },
          grid: { display: false }
        },
        y: {
          ticks: { color: '#94a3b8', font: { size: 10 } },
          grid: { color: '#1e293b' }
        }
      }
    }
  });

  const ctxSpecs = document.getElementById('chart-specs').getContext('2d');
  if (specsChart) specsChart.destroy();

  document.getElementById('chart-done-val').innerText = kpis.doneSpecs;
  document.getElementById('chart-pending-val').innerText = kpis.pendingSpecs;

  specsChart = new Chart(ctxSpecs, {
    type: 'doughnut',
    data: {
      labels: ['Desenvolvidas', 'Pendentes'],
      datasets: [{
        data: [kpis.doneSpecs, kpis.pendingSpecs],
        backgroundColor: ['#10b981', '#f59e0b'],
        borderWidth: 0,
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '72%',
      plugins: {
        legend: { display: false }
      }
    }
  });
}

// Mecanismo de Busca Inteligente Autocontido (Zero Tokens)
function intelligentSearch(query, list) {
  if (!query || !query.trim()) return list;

  const terms = query.toLowerCase().trim().split(/\s+/).filter(t => t);

  return list.map(item => {
    let score = 0;
    const nameLower = (item.name || '').toLowerCase();
    const stackLower = (item.stack || '').toLowerCase();
    const purposeLower = (item.purpose || '').toLowerCase();
    const phaseLower = (item.current_phase || '').toLowerCase();
    const nextLower = (item.next_action || '').toLowerCase();
    const pathLower = (item.path || '').toLowerCase();
    const healthLower = (item.health_status || '').toLowerCase();
    const tagLower = (item.last_tag || '').toLowerCase();
    const agentLower = (item.last_agent || '').toLowerCase();
    const worktreesLower = (item.worktrees || []).map(w => w.name.toLowerCase()).join(' ');

    for (const term of terms) {
      if (nameLower === term) score += 50;
      else if (nameLower.startsWith(term)) score += 30;
      else if (nameLower.includes(term)) score += 20;

      if (stackLower.includes(term)) score += 25;
      if (phaseLower.includes(term)) score += 15;
      if (nextLower.includes(term)) score += 15;
      if (purposeLower.includes(term)) score += 10;
      if (pathLower.includes(term)) score += 5;
      if (worktreesLower.includes(term)) score += 15;
      if (healthLower.includes(term)) score += 25;
      if (tagLower.includes(term)) score += 20;
      if (agentLower.includes(term)) score += 15;

      if (term === 'alexandre' && item.alexandre_pending_count > 0) score += 40;
      if (term === 'dirty' && item.worktree_clean === 0) score += 30;
    }

    return { item, score };
  })
  .filter(res => res.score > 0)
  .sort((a, b) => b.score - a.score)
  .map(res => res.item);
}

// Filtragem, Ordenação e Renderização
function applyFilterAndRender() {
  const query = document.getElementById('search-input').value;
  let filtered = [...allProjects];

  // 1. Busca inteligente
  if (query.trim()) {
    filtered = intelligentSearch(query, filtered);
  }

  // 2. Filtro rápido
  if (currentFilter === 'health-active') {
    filtered = filtered.filter(p => p.health_status === 'active');
  } else if (currentFilter === 'health-blocked') {
    filtered = filtered.filter(p => p.health_status === 'blocked');
  } else if (currentFilter === 'health-stable') {
    filtered = filtered.filter(p => p.health_status === 'stable');
  } else if (currentFilter === 'health-incubating') {
    filtered = filtered.filter(p => p.health_status === 'incubating');
  } else if (currentFilter === 'with-worktrees') {
    filtered = filtered.filter(p => p.worktrees && p.worktrees.length > 0);
  } else if (currentFilter === 'tree-dirty') {
    filtered = filtered.filter(p => p.worktree_clean === 0);
  }

  // 3. Ordenação
  if (currentSort === 'activity') {
    filtered.sort((a, b) => b.changes_30d - a.changes_30d || b.changes_7d - a.changes_7d);
  } else if (currentSort === 'sdd_score') {
    filtered.sort((a, b) => (b.sdd_score || 0) - (a.sdd_score || 0));
  } else if (currentSort === 'name') {
    filtered.sort((a, b) => a.name.localeCompare(b.name));
  } else if (currentSort === 'commits') {
    filtered.sort((a, b) => b.changes_total - a.changes_total);
  } else if (currentSort === 'specs') {
    filtered.sort((a, b) => b.total_specs - a.total_specs || b.done_specs - a.done_specs);
  } else if (currentSort === 'inactive') {
    filtered.sort((a, b) => b.days_since_last_change - a.days_since_last_change);
  }

  document.getElementById('filtered-count').innerText = filtered.length;
  document.getElementById('total-count').innerText = allProjects.length;

  if (currentViewMode === 'cards') {
    renderProjectsGrid(filtered);
  } else if (currentViewMode === 'pipeline') {
    renderProjectsPipeline(filtered);
  } else {
    renderProjectsTable(filtered);
  }
  lucide.createIcons();
}

function getHealthBadge(status, reason) {
  switch (status) {
    case 'active':
      return `<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30" title="${escapeHtml(reason || '')}">
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
        <span>EM TRAÇÃO</span>
      </span>`;
    case 'blocked':
      return `<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30" title="${escapeHtml(reason || '')}">
        <span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
        <span>BLOQUEADO</span>
      </span>`;
    case 'stable':
      return `<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700" title="${escapeHtml(reason || '')}">
        <span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
        <span>ESTÁVEL</span>
      </span>`;
    case 'stale':
      return `<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20" title="${escapeHtml(reason || '')}">
        <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
        <span>EM RISCO</span>
      </span>`;
    case 'incubating':
      return `<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30" title="${escapeHtml(reason || '')}">
        <span class="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
        <span>INCUBAÇÃO</span>
      </span>`;
    default:
      return `<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
        <span>PAUSADO</span>
      </span>`;
  }
}

function getStackBadge(stack) {
  const s = stack || 'Indefinida';
  let color = 'bg-slate-800 text-slate-300 border-slate-700';

  if (s.includes('Delphi')) {
    color = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
  } else if (s.includes('WinUI') || s.includes('.NET')) {
    color = 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30';
  } else if (s.includes('Electron')) {
    color = 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30';
  } else if (s.includes('Flutter')) {
    color = 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30';
  } else if (s.includes('Node') || s.includes('TypeScript')) {
    color = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
  } else if (s.includes('Python')) {
    color = 'bg-amber-500/15 text-amber-300 border-amber-500/30';
  }

  return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${color}">
    <i data-lucide="cpu" class="w-3 h-3"></i>
    <span>${escapeHtml(s)}</span>
  </span>`;
}

function getAgentBadge(agent) {
  if (!agent) return '';
  let color = 'bg-slate-800 text-slate-300 border-slate-700';
  let icon = 'user';

  if (agent.toLowerCase().includes('claude')) {
    color = 'bg-amber-500/15 text-amber-300 border-amber-500/30';
    icon = 'bot';
  } else if (agent.toLowerCase().includes('agy') || agent.toLowerCase().includes('antigravity')) {
    color = 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30';
    icon = 'sparkles';
  } else if (agent.toLowerCase().includes('alexandre')) {
    color = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
    icon = 'user-check';
  }

  return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${color}" title="Último agente ativo: ${escapeHtml(agent)}">
    <i data-lucide="${icon}" class="w-3 h-3"></i>
    <span>${escapeHtml(agent)}</span>
  </span>`;
}

function renderProjectsGrid(projects) {
  const grid = document.getElementById('projects-grid');
  if (projects.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full py-16 text-center text-slate-500 bg-slate-900/50 rounded-2xl border border-slate-800">
        <i data-lucide="folder-search" class="w-10 h-10 mx-auto mb-2 text-slate-600"></i>
        <p class="text-sm font-medium text-slate-400">Nenhum projeto encontrado para os critérios atuais.</p>
        <p class="text-xs text-slate-500 mt-1">Experimente limpar a busca ou os filtros aplicados.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = projects.map(p => {
    const healthBadge = getHealthBadge(p.health_status, p.health_reason);
    const stackBadge = getStackBadge(p.stack);
    const agentBadge = getAgentBadge(p.last_agent);

    // Badges de worktree
    const worktreeCount = p.worktrees ? p.worktrees.length : 0;
    const worktreeBadge = worktreeCount > 0 ? `
      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/25" title="${worktreeCount} pastas de trabalho vinculadas">
        <i data-lucide="git-branch" class="w-3 h-3"></i>
        <span>${worktreeCount} wt</span>
      </span>
    ` : '';

    // Status da árvore de trabalho
    const treeBadge = p.worktree_clean === 0 ? `
      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30" title="${p.uncommitted_count} arquivos pendentes de commit">
        <i data-lucide="alert-circle" class="w-3 h-3 text-amber-400"></i>
        <span>${p.uncommitted_count} uncommitted</span>
      </span>
    ` : '';

    // Alerta do Alexandre
    const alexandreBadge = p.alexandre_pending_count > 0 ? `
      <div class="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-bold">
        <i data-lucide="alert-triangle" class="w-3 h-3 text-amber-400"></i>
        <span>${p.alexandre_pending_count} Ação</span>
      </div>
    ` : '';

    // Barra de SDD Score
    const sddScore = p.sdd_score || 0;

    // Bloco de Continuidade (Fase / Próxima Ação)
    let continuityBlock = '';
    if (p.current_phase || p.next_action) {
      continuityBlock = `
        <div class="mt-2.5 p-2 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] space-y-1">
          ${p.current_phase ? `<div class="text-indigo-300 truncate"><strong class="text-slate-400">Fase:</strong> ${escapeHtml(p.current_phase)}</div>` : ''}
          ${p.next_action ? `<div class="text-emerald-300 truncate"><strong class="text-slate-400">Próx:</strong> ${escapeHtml(p.next_action)}</div>` : ''}
        </div>
      `;
    }

    // Barra de specs
    let specsBar = '';
    if (p.total_specs > 0) {
      const pct = Math.round((p.done_specs / p.total_specs) * 100);
      specsBar = `
        <div class="mt-3 pt-2.5 border-t border-slate-800/80">
          <div class="flex items-center justify-between text-xs mb-1">
            <span class="text-slate-400">Specs SDD: <strong class="text-slate-200">${p.done_specs}/${p.total_specs}</strong></span>
            <span class="text-xs font-bold ${pct === 100 ? 'text-emerald-400' : 'text-slate-300'}">${pct}%</span>
          </div>
          <div class="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
            <div class="bg-emerald-500 h-full rounded-full transition-all" style="width: ${pct}%"></div>
          </div>
        </div>
      `;
    } else {
      specsBar = `
        <div class="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
          <span>Specs SDD: Não configuradas</span>
        </div>
      `;
    }

    // Último commit resumo
    const lastCommitMsg = p.last_commit_message ? escapeHtml(p.last_commit_message) : 'Sem commits';

    return `
      <div class="bg-slate-900 border ${p.alexandre_pending_count > 0 ? 'border-amber-500/40' : (p.worktree_clean === 0 ? 'border-amber-500/25' : 'border-slate-800')} rounded-2xl p-5 hover:border-slate-700 transition flex flex-col justify-between shadow-lg shadow-black/20 group">
        <div>
          <!-- Header do Card -->
          <div class="flex items-start justify-between gap-2 mb-2">
            <div class="flex items-center gap-1.5 flex-wrap">
              ${healthBadge}
              ${stackBadge}
              ${worktreeBadge}
              ${treeBadge}
            </div>
            ${alexandreBadge}
          </div>

          <!-- Título e SDD Score -->
          <div class="flex items-center justify-between gap-2 mt-2">
            <h3 class="font-bold text-base text-white group-hover:text-indigo-300 transition cursor-pointer" onclick="openProjectModal('${escapeHtml(p.name)}')">
              ${escapeHtml(p.name)}
            </h3>
            <span class="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300" title="SDD Maturity Score: ${sddScore}%">
              SDD <strong class="${sddScore >= 70 ? 'text-emerald-400' : (sddScore >= 40 ? 'text-indigo-300' : 'text-amber-300')}">${sddScore}%</strong>
            </span>
          </div>

          <!-- Propósito -->
          <p class="text-xs text-slate-300 line-clamp-2 min-h-[32px] mt-2 leading-relaxed">
            ${escapeHtml(p.purpose)}
          </p>

          <!-- Continuidade -->
          ${continuityBlock}

          <!-- Último Commit -->
          <div class="mt-3 p-2 rounded-xl bg-slate-950/60 border border-slate-800/60 text-[11px] flex items-center justify-between gap-2">
            <div class="flex items-center gap-1.5 truncate">
              <i data-lucide="git-commit" class="w-3.5 h-3.5 text-slate-500 shrink-0"></i>
              <span class="text-slate-300 truncate" title="${lastCommitMsg}">${lastCommitMsg}</span>
            </div>
            ${agentBadge}
          </div>

          <!-- Métricas de Alterações -->
          <div class="grid grid-cols-4 gap-1.5 mt-3 text-center">
            <div class="bg-slate-850 p-2 rounded-lg border border-slate-800">
              <span class="text-[10px] text-slate-500 block">24h</span>
              <span class="text-xs font-bold ${p.changes_24h > 0 ? 'text-emerald-400' : 'text-slate-400'}">${p.changes_24h}</span>
            </div>
            <div class="bg-slate-850 p-2 rounded-lg border border-slate-800">
              <span class="text-[10px] text-slate-500 block">7 dias</span>
              <span class="text-xs font-bold ${p.changes_7d > 0 ? 'text-indigo-400' : 'text-slate-400'}">${p.changes_7d}</span>
            </div>
            <div class="bg-slate-850 p-2 rounded-lg border border-slate-800">
              <span class="text-[10px] text-slate-500 block">30 dias</span>
              <span class="text-xs font-bold ${p.changes_30d > 0 ? 'text-indigo-300' : 'text-slate-400'}">${p.changes_30d}</span>
            </div>
            <div class="bg-slate-850 p-2 rounded-lg border border-slate-800">
              <span class="text-[10px] text-slate-500 block">Total</span>
              <span class="text-xs font-bold text-slate-200">${p.changes_total}</span>
            </div>
          </div>

          <!-- Specs -->
          ${specsBar}
        </div>

        <!-- Footer Card -->
        <div class="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
          <span class="text-[10px] text-slate-500 truncate max-w-[150px]" title="${escapeHtml(p.path)}">${escapeHtml(p.path)}</span>
          <div class="flex items-center gap-2">
            <button onclick="setSpotlightProject('${escapeHtml(p.name)}'); window.scrollTo({top: 0, behavior: 'smooth'});" class="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition flex items-center gap-1" title="Focar no Spotlight">
              <i data-lucide="compass" class="w-3.5 h-3.5"></i>
              <span>Focar</span>
            </button>
            <button onclick="openProjectModal('${escapeHtml(p.name)}')" class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 hover:border-indigo-500/40 transition">
              Detalhes
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function renderProjectsTable(projects) {
  const tbody = document.getElementById('projects-table-body');
  if (projects.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="py-12 text-center text-slate-500">
          Nenhum projeto encontrado para os filtros selecionados.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = projects.map(p => {
    const healthBadge = getHealthBadge(p.health_status, p.health_reason);
    const stackBadge = getStackBadge(p.stack);
    const agentBadge = getAgentBadge(p.last_agent);

    const treeBadge = p.worktree_clean === 0 ? `
      <span class="text-amber-400 text-[10px] font-bold" title="${p.uncommitted_count} arquivos modificados">⚠️ ${p.uncommitted_count} uncommitted</span>
    ` : `<span class="text-slate-500 text-[10px]">✓ limpa</span>`;

    const specsInfo = p.total_specs > 0
      ? `<span class="font-bold text-slate-200">${p.done_specs}/${p.total_specs}</span> <span class="text-[10px] text-emerald-400">(${Math.round((p.done_specs/p.total_specs)*100)}%)</span>`
      : `<span class="text-slate-500">—</span>`;

    const lastCommitMsg = p.last_commit_message ? escapeHtml(p.last_commit_message) : 'Sem commits';

    return `
      <tr class="hover:bg-slate-850/60 transition group">
        <!-- Projeto -->
        <td class="py-3 px-4">
          <div class="font-bold text-slate-200 group-hover:text-indigo-300 cursor-pointer text-xs" onclick="openProjectModal('${escapeHtml(p.name)}')">
            ${escapeHtml(p.name)}
          </div>
          <div class="text-[10px] text-slate-500 truncate max-w-[160px] font-mono mt-0.5">${escapeHtml(p.path)}</div>
        </td>

        <!-- Stack & Governança -->
        <td class="py-3 px-3">
          <div>${stackBadge}</div>
          <div class="mt-1">${treeBadge}</div>
        </td>

        <!-- Fase & Próxima Ação -->
        <td class="py-3 px-3 max-w-[220px]">
          <div class="text-[11px] text-slate-300 truncate" title="${escapeHtml(p.current_phase || '')}">
            ${p.current_phase ? `<strong class="text-indigo-400">Fase:</strong> ${escapeHtml(p.current_phase)}` : '<span class="text-slate-500">Fase não doc.</span>'}
          </div>
          <div class="text-[10px] text-slate-400 truncate mt-0.5" title="${escapeHtml(p.next_action || '')}">
            ${p.next_action ? `<strong class="text-emerald-400">Próx:</strong> ${escapeHtml(p.next_action)}` : '<span class="text-slate-500">Sem próxima ação</span>'}
          </div>
        </td>

        <!-- Último Commit / Agente -->
        <td class="py-3 px-3 max-w-[200px]">
          <div class="text-[11px] text-slate-300 truncate" title="${lastCommitMsg}">
            ${lastCommitMsg}
          </div>
          <div class="flex items-center gap-2 mt-1">
            ${agentBadge}
            <span class="text-[10px] text-slate-500 font-mono">${p.last_commit_date ? p.last_commit_date.slice(0, 10) : ''}</span>
          </div>
        </td>

        <!-- Commits -->
        <td class="py-3 px-3 text-center">
          <div class="font-bold text-slate-200">${p.changes_30d}</div>
          <div class="text-[10px] text-slate-500">tot: ${p.changes_total}</div>
        </td>

        <!-- Specs -->
        <td class="py-3 px-3 text-center">
          ${specsInfo}
        </td>

        <!-- Saúde -->
        <td class="py-3 px-3 text-center">
          ${healthBadge}
        </td>

        <!-- Ação -->
        <td class="py-3 px-4 text-right">
          <div class="flex items-center justify-end gap-1.5">
            <button onclick="setSpotlightProject('${escapeHtml(p.name)}'); window.scrollTo({top: 0, behavior: 'smooth'});" title="Focar no Spotlight" class="p-1.5 rounded bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition">
              <i data-lucide="compass" class="w-3.5 h-3.5"></i>
            </button>
            <button onclick="openProjectModal('${escapeHtml(p.name)}')" class="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-white text-xs font-semibold border border-slate-700 transition">
              Ver
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// Modal: Abertura e Preenchimento
async function openProjectModal(projectName) {
  selectedProject = projectName;
  const modal = document.getElementById('modal-project');

  try {
    const res = await fetch(`/api/projects/${encodeURIComponent(projectName)}`);
    if (!res.ok) throw new Error('Projeto não encontrado');
    const p = await res.json();

    document.getElementById('modal-title').innerText = p.name;
    document.getElementById('modal-path').innerText = p.path;
    document.getElementById('modal-stack-badge').innerText = p.stack || 'Indefinida';

    // Status da árvore
    const treeEl = document.getElementById('modal-tree-badge');
    const treeStatusVal = document.getElementById('modal-tree-status-val');
    const treeStatusBox = document.getElementById('modal-tree-status-box');

    if (p.worktree_clean === 0) {
      treeEl.className = 'px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30';
      treeEl.innerText = `⚠️ ${p.uncommitted_count} modificado(s)`;
      treeStatusVal.className = 'text-xs font-bold font-mono px-2.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30';
      treeStatusVal.innerText = `${p.uncommitted_count} arquivo(s) modificado(s) pendentes de commit`;
      treeStatusBox.className = 'flex items-center justify-between p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/5';
    } else {
      treeEl.className = 'px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30';
      treeEl.innerText = '✓ Árvore limpa';
      treeStatusVal.className = 'text-xs font-bold font-mono px-2.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30';
      treeStatusVal.innerText = 'Árvore 100% limpa (sem pendências locais)';
      treeStatusBox.className = 'flex items-center justify-between p-3.5 rounded-xl border border-slate-800 bg-slate-950';
    }

    // Propósito
    document.getElementById('modal-purpose-input').value = p.purpose || '';
    document.getElementById('modal-purpose-source').innerText = p.purpose_source ? `Fonte: ${p.purpose_source}` : '';

    // Continuidade
    document.getElementById('modal-current-phase').innerText = p.current_phase || 'Fase não documentada formalmente em AGENT_CONTEXT.md';
    document.getElementById('modal-next-action').innerText = p.next_action || 'Nenhuma próxima ação imediata documentada';

    // Saúde e SDD
    const healthBadge = document.getElementById('modal-health-badge');
    healthBadge.outerHTML = getHealthBadge(p.health_status, p.health_reason);
    document.getElementById('modal-health-reason').innerText = p.health_reason || 'Sem diagnóstico de saúde.';
    document.getElementById('modal-last-agent').innerText = p.last_agent ? `• Último agente: ${p.last_agent}` : '';

    const sddScore = p.sdd_score || 0;
    document.getElementById('modal-sdd-score-val').innerText = `${sddScore}%`;
    document.getElementById('modal-sdd-bar').style.width = `${sddScore}%`;
    document.getElementById('modal-last-tag').innerText = p.last_tag ? `Tag: ${p.last_tag}` : 'Tag: Nenhuma';
    document.getElementById('modal-tag-date').innerText = p.last_tag_date ? p.last_tag_date.slice(0, 10) : '';

    // Governança Documental (Doc Health)
    renderDocHealthGrid(p.doc_health);

    // Datas
    document.getElementById('modal-init-local').innerText = p.created_local ? p.created_local.slice(0, 10) : '—';
    document.getElementById('modal-init-github').innerText = p.created_github ? p.created_github.slice(0, 10) : (p.github_url ? 'GitHub Ativo' : 'Sem GitHub');
    document.getElementById('modal-inactive-max').innerText = `${p.max_inactive_days || 0} dias`;
    document.getElementById('modal-inactive-current').innerText = `${p.days_since_last_change || 0} dias`;

    // Commits Recentes
    renderRecentCommits(p.recent_commits);

    // Worktrees
    const wtBox = document.getElementById('modal-worktrees-box');
    const wtList = document.getElementById('modal-worktrees-list');
    if (p.worktrees && p.worktrees.length > 0) {
      wtBox.classList.remove('hidden');
      document.getElementById('modal-worktrees-count').innerText = p.worktrees.length;
      wtList.innerHTML = p.worktrees.map(w => `
        <div class="flex items-center justify-between text-xs py-1.5 px-2 bg-slate-900 rounded-lg border border-slate-800/80">
          <div class="flex items-center gap-2">
            <span class="font-bold text-slate-200">${escapeHtml(w.name)}</span>
            <span class="text-[10px] font-mono text-indigo-300 bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-500/20">${escapeHtml(w.branch)}</span>
          </div>
          <span class="text-[10px] text-slate-500 font-mono">${w.last_modified ? w.last_modified.slice(0, 10) : ''}</span>
        </div>
      `).join('');
    } else {
      wtBox.classList.add('hidden');
    }

    // Specs
    document.getElementById('modal-specs-count').innerText = p.specs ? p.specs.length : 0;
    renderSpecsList(p.specs);

    // Ações do Alexandre
    const alexActions = p.alexandre_actions || [];
    document.getElementById('modal-alexandre-count').innerText = alexActions.length;
    document.getElementById('modal-tab-actions-count').innerText = alexActions.length;
    renderModalAlexandreActions(alexActions);

    // Resetar para a primeira aba
    switchModalTab('tab-overview');

    modal.classList.remove('hidden');
    lucide.createIcons();
  } catch (e) {
    alert(`Erro ao abrir detalhes: ${e.message}`);
  }
}

function renderDocHealthGrid(docHealth) {
  const grid = document.getElementById('modal-doc-health-grid');
  if (!docHealth) {
    grid.innerHTML = '<span class="text-slate-500 col-span-full">Sem dados de governança</span>';
    return;
  }

  const items = [
    { label: 'AGENTS.md', ok: docHealth.has_agents },
    { label: 'AGENT_CONTEXT.md', ok: docHealth.has_agent_context },
    { label: 'STATUS.md', ok: docHealth.has_status },
    { label: 'DECISIONS.md', ok: docHealth.has_decisions },
    { label: 'CHANGELOG.md', ok: docHealth.has_changelog },
    { label: 'PLAYBOOK.md', ok: docHealth.has_playbook },
    { label: 'docs/specs/', ok: docHealth.has_specs }
  ];

  grid.innerHTML = items.map(item => `
    <div class="flex items-center gap-1.5 p-2 rounded-lg border ${item.ok ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300' : 'bg-slate-900 border-slate-800 text-slate-500'}">
      <i data-lucide="${item.ok ? 'check-circle-2' : 'circle-dashed'}" class="w-3.5 h-3.5 ${item.ok ? 'text-emerald-400' : 'text-slate-600'}"></i>
      <span class="font-mono text-[11px] truncate">${item.label}</span>
    </div>
  `).join('');
}

function renderRecentCommits(commits) {
  const container = document.getElementById('modal-commits-list');
  if (!commits || commits.length === 0) {
    container.innerHTML = `
      <div class="text-xs text-slate-500 py-4 text-center bg-slate-950 p-3 rounded-xl border border-slate-800">
        Nenhum commit encontrado no histórico Git recente.
      </div>
    `;
    return;
  }

  container.innerHTML = commits.map(c => {
    const agentBadge = getAgentBadge(c.agent);
    return `
      <div class="p-3 bg-slate-950 rounded-xl border border-slate-800 flex flex-col gap-1.5 hover:border-slate-700 transition">
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <code class="text-xs font-mono font-bold text-indigo-400 bg-indigo-950/40 px-1.5 py-0.5 rounded border border-indigo-500/20">${escapeHtml(c.short_hash || c.hash.slice(0, 7))}</code>
            <span class="text-xs font-semibold text-slate-200">${escapeHtml(c.author_name)}</span>
          </div>
          <div class="flex items-center gap-2">
            ${agentBadge}
            <span class="text-[11px] text-slate-500 font-mono">${escapeHtml(c.date_relative || c.date_iso?.slice(0, 10))}</span>
          </div>
        </div>
        <p class="text-xs text-slate-300 font-mono leading-relaxed mt-0.5">${escapeHtml(c.message)}</p>
      </div>
    `;
  }).join('');
}

function renderSpecsList(specs) {
  const container = document.getElementById('modal-specs-list');
  if (!specs || specs.length === 0) {
    container.innerHTML = `
      <div class="text-xs text-slate-500 py-6 text-center bg-slate-950 p-4 rounded-xl border border-slate-800">
        Nenhuma especificação SDD documentada em <code>docs/specs/</code> para este projeto.
      </div>
    `;
    return;
  }

  container.innerHTML = specs.map(s => {
    const isDone = s.status === 'done';
    const statusBadge = isDone
      ? `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">CONCLUÍDA</span>`
      : `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">EM ANDAMENTO</span>`;

    const total = s.total_tasks || 0;
    const completed = s.completed_tasks || 0;
    const pct = total > 0 ? Math.round((completed / total) * 100) : (isDone ? 100 : 0);

    let pendingTasksHtml = '';
    if (s.pending_tasks && Array.isArray(s.pending_tasks) && s.pending_tasks.length > 0) {
      pendingTasksHtml = `
        <div class="mt-2 pt-2 border-t border-slate-800/80">
          <span class="text-[10px] uppercase font-bold text-slate-500 block mb-1">Tarefas Pendentes:</span>
          <ul class="space-y-0.5 text-[11px] text-slate-400 font-mono list-disc list-inside">
            ${s.pending_tasks.map(t => `<li class="truncate">${escapeHtml(t)}</li>`).join('')}
          </ul>
        </div>
      `;
    }

    return `
      <div class="p-3.5 bg-slate-950 rounded-xl border border-slate-800 hover:border-slate-700 transition">
        <div class="flex items-center justify-between gap-2 mb-1.5">
          <div class="flex items-center gap-2">
            <code class="text-xs font-mono font-bold text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-500/20">${escapeHtml(s.spec_id)}</code>
            <strong class="text-xs text-white">${escapeHtml(s.spec_name || s.summary || s.spec_id)}</strong>
          </div>
          ${statusBadge}
        </div>

        <div class="flex items-center justify-between text-xs text-slate-400 mt-2 mb-1">
          <span>Progresso: <strong class="text-slate-200">${completed}/${total} tarefas</strong></span>
          <span class="font-bold ${pct === 100 ? 'text-emerald-400' : 'text-slate-300'}">${pct}%</span>
        </div>
        <div class="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-800">
          <div class="bg-emerald-500 h-full rounded-full transition-all" style="width: ${pct}%"></div>
        </div>

        ${pendingTasksHtml}
      </div>
    `;
  }).join('');
}

function renderModalAlexandreActions(actions) {
  const container = document.getElementById('modal-alexandre-list');
  if (!actions || actions.length === 0) {
    container.innerHTML = `
      <div class="text-xs text-slate-500 py-4 text-center">
        ✓ Nenhuma pendência aberta dependendo do Alexandre neste projeto.
      </div>
    `;
    return;
  }

  container.innerHTML = actions.map(a => `
    <div class="p-3 bg-slate-900 rounded-lg border border-amber-500/20 flex flex-col gap-1">
      <div class="flex items-center gap-2">
        <span class="w-2 h-2 rounded-full bg-amber-400"></span>
        <span class="text-xs font-bold text-amber-200">${escapeHtml(a.title)}</span>
        <span class="text-[10px] font-mono text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">${escapeHtml(a.file_path)}</span>
      </div>
      ${a.snippet ? `<p class="text-xs text-slate-300 italic mt-0.5">"${escapeHtml(a.snippet)}"</p>` : ''}
    </div>
  `).join('');
}

function closeModal() {
  document.getElementById('modal-project').classList.add('hidden');
  selectedProject = null;
}

// Salvar Propósito
async function handleSavePurpose() {
  if (!selectedProject) return;
  const purpose = document.getElementById('modal-purpose-input').value;
  try {
    const res = await fetch(`/api/projects/${encodeURIComponent(selectedProject)}/purpose`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ purpose })
    });
    if (!res.ok) throw new Error('Falha ao salvar propósito');
    alert('Propósito atualizado e fixado com sucesso!');
    await loadAllData();
  } catch (e) {
    alert(`Erro: ${e.message}`);
  }
}

// Sincronizar (Rescan)
async function handleRescan() {
  const icon = document.getElementById('rescan-icon');
  icon.classList.add('animate-spin');
  try {
    const res = await fetch('/api/rescan', { method: 'POST' });
    if (!res.ok) throw new Error('Falha na sincronização');
    await loadAllData();
  } catch (e) {
    alert(`Erro na sincronização: ${e.message}`);
  } finally {
    icon.classList.remove('animate-spin');
  }
}

// Registrar Novo Projeto
async function handleRegisterProject() {
  const pathVal = document.getElementById('add-project-path').value.trim();
  const labelVal = document.getElementById('add-project-label').value.trim();
  const errBox = document.getElementById('add-project-error');

  if (!pathVal) {
    errBox.innerText = 'Informe o caminho da pasta.';
    errBox.classList.remove('hidden');
    return;
  }

  try {
    const res = await fetch('/api/projects/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: pathVal, label: labelVal })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao registrar');

    document.getElementById('modal-add-project').classList.add('hidden');
    await loadAllData();
  } catch (e) {
    errBox.innerText = e.message;
    errBox.classList.remove('hidden');
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ========================================================
// SPEC 004: PROJECT SPOTLIGHT & SITUATIONAL CLARITY
// ========================================================

let spotlightCurrentProject = null;

function getPipelineStageBadge(stage) {
  switch (stage) {
    case 'planning':
      return `<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
        <span class="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
        <span>1. PLANEJAMENTO</span>
      </span>`;
    case 'active':
      return `<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
        <span>2. EM DESENVOLVIMENTO</span>
      </span>`;
    case 'validation':
      return `<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
        <span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
        <span>3. VALIDAÇÃO & BLOQUEIO</span>
      </span>`;
    case 'stable':
      return `<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-800 text-cyan-300 border border-cyan-500/30">
        <span class="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
        <span>4. PUBLICADO & ESTÁVEL</span>
      </span>`;
    case 'idle':
    default:
      return `<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
        <span class="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
        <span>5. HIBERNANDO</span>
      </span>`;
  }
}

function initOrUpdateSpotlight() {
  const select = document.getElementById('spotlight-project-select');
  if (!select || !allProjects || allProjects.length === 0) return;

  const savedName = localStorage.getItem('spotlight_selected_project');
  let target = allProjects.find(p => p.name === savedName);
  
  // Se não houver salvo ou não for encontrado, prioriza projetos com pendências do Alexandre ou o mais ativo
  if (!target) {
    target = allProjects.find(p => p.alexandre_pending_count > 0) || allProjects[0];
  }

  // Popula o select ordenado por nome
  const sortedProjects = [...allProjects].sort((a, b) => a.name.localeCompare(b.name));
  select.innerHTML = sortedProjects.map(p => {
    const isSelected = target && p.name === target.name ? 'selected' : '';
    const pendingDot = p.alexandre_pending_count > 0 ? '⚠️ ' : '';
    return `<option value="${escapeHtml(p.name)}" ${isSelected}>${pendingDot}${escapeHtml(p.name)} (${escapeHtml(p.stack || 'Stack')})</option>`;
  }).join('');

  if (target) {
    setSpotlightProject(target.name);
  }
}

function navigateSpotlight(direction) {
  if (!allProjects || allProjects.length === 0) return;
  const select = document.getElementById('spotlight-project-select');
  if (!select) return;

  const sortedProjects = [...allProjects].sort((a, b) => a.name.localeCompare(b.name));
  const currentIdx = sortedProjects.findIndex(p => p.name === spotlightCurrentProject?.name);
  let nextIdx = currentIdx + direction;
  if (nextIdx < 0) nextIdx = sortedProjects.length - 1;
  if (nextIdx >= sortedProjects.length) nextIdx = 0;

  const nextProject = sortedProjects[nextIdx];
  if (nextProject) {
    select.value = nextProject.name;
    setSpotlightProject(nextProject.name);
  }
}

function setSpotlightProject(projectName) {
  const project = allProjects.find(p => p.name === projectName);
  if (!project) return;

  spotlightCurrentProject = project;
  localStorage.setItem('spotlight_selected_project', project.name);

  const select = document.getElementById('spotlight-project-select');
  if (select && select.value !== project.name) {
    select.value = project.name;
  }

  // Atualiza badges rápidos na barra de topo
  const quickBadges = document.getElementById('spotlight-quick-badges');
  if (quickBadges) {
    const healthBadge = getHealthBadge(project.health_status, project.health_reason);
    const stageBadge = getPipelineStageBadge(project.pipeline_stage);
    const pendingBadge = project.alexandre_pending_count > 0
      ? `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">⚠️ ${project.alexandre_pending_count} p/ Alexandre</span>`
      : '';
    quickBadges.innerHTML = `${stageBadge} ${healthBadge} ${pendingBadge}`;
  }

  renderSpotlightPanel(project);
}

function copyCommandToClipboard(cmd) {
  navigator.clipboard.writeText(cmd).then(() => {
    alert(`Comando copiado para a área de transferência:\n\n${cmd}`);
  }).catch(() => {
    prompt('Copie o comando abaixo:', cmd);
  });
}

function renderSpotlightPanel(p) {
  const panel = document.getElementById('project-spotlight-panel');
  if (!panel) return;

  const stackBadge = getStackBadge(p.stack);
  const healthBadge = getHealthBadge(p.health_status, p.health_reason);
  const stageBadge = getPipelineStageBadge(p.pipeline_stage);
  const agentBadge = getAgentBadge(p.last_agent);

  const treeStatusBadge = p.worktree_clean === 0
    ? `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">⚠️ ${p.uncommitted_count} modificados</span>`
    : `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">✓ Árvore Limpa</span>`;

  // Comandos de desenvolvimento
  let commandsList = [];
  try {
    commandsList = typeof p.commands === 'string' ? JSON.parse(p.commands) : (p.commands || []);
  } catch (e) {
    commandsList = [];
  }

  // Stepper Visual de Specs
  const stepper = p.stepper || [];
  let stepperHtml = '';
  if (stepper.length === 0) {
    stepperHtml = `<div class="text-xs text-slate-500 italic py-2">Sem specs formais registradas neste projeto.</div>`;
  } else {
    stepperHtml = `
      <div class="flex items-center gap-1.5 flex-wrap py-1">
        ${stepper.map((step, idx) => {
          let stepBadgeClass = 'bg-slate-800 text-slate-400 border-slate-700';
          let stepIcon = 'circle';
          if (step.status === 'done') {
            stepBadgeClass = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
            stepIcon = 'check-circle';
          } else if (step.status === 'in_progress') {
            stepBadgeClass = 'bg-amber-500/20 text-amber-300 border-amber-500/40 ring-1 ring-amber-500/50';
            stepIcon = 'clock';
          }

          const arrow = idx < stepper.length - 1 ? `<i data-lucide="chevron-right" class="w-3.5 h-3.5 text-slate-600 shrink-0"></i>` : '';

          return `
            <div class="flex items-center gap-1.5">
              <span class="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold border ${stepBadgeClass}" title="${escapeHtml(step.title || '')}">
                <i data-lucide="${stepIcon}" class="w-3 h-3"></i>
                <span class="font-mono">${escapeHtml(step.id)}</span>
                ${step.status === 'in_progress' ? `<span class="text-[10px] font-bold text-amber-200">(${step.progress}%)</span>` : ''}
              </span>
              ${arrow}
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  // Atenção Crítica (Ações para o Alexandre)
  const alexandreActions = (allAlexandreActions || []).filter(a => a.project_name === p.name);
  let attentionHtml = '';
  if (alexandreActions.length > 0) {
    attentionHtml = `
      <div class="bg-amber-950/40 border border-amber-500/40 rounded-xl p-3 space-y-2">
        <div class="flex items-center gap-2 text-amber-300 font-bold text-xs uppercase tracking-wide">
          <i data-lucide="alert-triangle" class="w-4 h-4 text-amber-400"></i>
          <span>Atenção Crítica: ${alexandreActions.length} Pendência(s) Aguardando o Alexandre</span>
        </div>
        <div class="space-y-1.5">
          ${alexandreActions.slice(0, 3).map(act => `
            <div class="text-xs text-slate-300 bg-slate-900/80 p-2 rounded-lg border border-amber-500/20">
              <div class="font-semibold text-amber-200">${escapeHtml(act.title)}</div>
              ${act.snippet ? `<div class="text-[11px] text-slate-400 italic mt-0.5 line-clamp-1">"${escapeHtml(act.snippet)}"</div>` : ''}
              <div class="text-[10px] font-mono text-slate-500 mt-1">${escapeHtml(act.file_path)}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  } else {
    attentionHtml = `
      <div class="bg-slate-950/50 border border-slate-800 rounded-xl p-3 flex items-center gap-2.5 text-xs text-slate-400">
        <i data-lucide="check-circle" class="w-4 h-4 text-emerald-400 shrink-0"></i>
        <span>Nenhum bloqueio ou aprovação pendente para o Alexandre neste projeto.</span>
      </div>
    `;
  }

  // Worktrees ativas
  const worktreesList = p.worktrees || [];
  let worktreesHtml = '';
  if (worktreesList.length > 0) {
    worktreesHtml = `
      <div class="flex items-center gap-2 flex-wrap">
        <span class="text-xs text-slate-400 font-semibold">Worktrees Paralelas:</span>
        ${worktreesList.map(wt => `
          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono bg-slate-950 text-indigo-300 border border-indigo-500/30" title="${escapeHtml(wt.path)} (${escapeHtml(wt.branch)})">
            <i data-lucide="git-branch" class="w-3 h-3 text-indigo-400"></i>
            <span class="font-bold">${escapeHtml(wt.name)}</span>
            <span class="text-slate-500">(${escapeHtml(wt.branch)})</span>
          </span>
        `).join('')}
      </div>
    `;
  }

  // Comandos rápidos
  let commandsHtml = '';
  if (commandsList.length > 0) {
    commandsHtml = `
      <div class="flex items-center gap-2 flex-wrap">
        <span class="text-xs text-slate-400 font-semibold">Comandos Rápidos:</span>
        ${commandsList.map(cmd => `
          <button onclick="copyCommandToClipboard('${escapeHtml(cmd)}')" class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-mono bg-slate-950 hover:bg-slate-800 text-emerald-300 hover:text-white border border-slate-700 hover:border-emerald-500/50 transition shadow-sm" title="Clique para copiar">
            <i data-lucide="terminal" class="w-3 h-3 text-emerald-400"></i>
            <span>${escapeHtml(cmd)}</span>
            <i data-lucide="copy" class="w-3 h-3 text-slate-500"></i>
          </button>
        `).join('')}
      </div>
    `;
  }

  panel.innerHTML = `
    <!-- Header do Spotlight -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
      <div>
        <div class="flex items-center gap-2.5 flex-wrap">
          <h2 class="text-xl font-extrabold text-white tracking-tight">${escapeHtml(p.name)}</h2>
          ${stackBadge}
          ${stageBadge}
          ${healthBadge}
          ${treeStatusBadge}
        </div>
        <div class="flex items-center gap-2 mt-1 text-xs text-slate-400 font-mono">
          <i data-lucide="folder" class="w-3.5 h-3.5 text-slate-500"></i>
          <span>${escapeHtml(p.path)}</span>
          <span class="text-slate-600">&bull;</span>
          <i data-lucide="git-branch" class="w-3.5 h-3.5 text-slate-500"></i>
          <span class="text-indigo-400 font-bold">${escapeHtml(p.current_branch || 'main')}</span>
        </div>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <button onclick="openProjectModal('${escapeHtml(p.name)}')" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition">
          <i data-lucide="external-link" class="w-3.5 h-3.5"></i>
          <span>Abrir Painel Completo</span>
        </button>
      </div>
    </div>

    <!-- Tríade de Clareza Situacional: 3 Colunas Executivas -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      
      <!-- Coluna 1: Onde Parou -->
      <div class="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between space-y-3">
        <div>
          <div class="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            <div class="w-5 h-5 rounded-md bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <i data-lucide="check-circle-2" class="w-3.5 h-3.5"></i>
            </div>
            <span>1. Onde Parou</span>
          </div>

          <div class="space-y-2">
            <div>
              <div class="text-[10px] text-slate-500 font-semibold uppercase">Último Marco Entregue / Tag</div>
              <div class="text-xs font-bold text-slate-200 mt-0.5">
                ${p.last_tag ? `<span class="inline-flex items-center gap-1 font-mono text-cyan-300 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/30"><i data-lucide="tag" class="w-3 h-3"></i> ${escapeHtml(p.last_tag)}</span>` : '<span class="text-slate-500">Sem tags de release formais</span>'}
              </div>
            </div>

            <div>
              <div class="text-[10px] text-slate-500 font-semibold uppercase">Último Commit</div>
              <div class="p-2 rounded-lg bg-slate-900 border border-slate-800 mt-1">
                <div class="text-xs font-medium text-slate-200 line-clamp-2 leading-snug">
                  ${p.last_commit_message ? escapeHtml(p.last_commit_message) : 'Nenhum commit registrado'}
                </div>
                <div class="flex items-center justify-between gap-2 mt-2 pt-1.5 border-t border-slate-800/60 text-[10px]">
                  <span class="font-mono text-slate-400">${p.last_commit_hash ? p.last_commit_hash.slice(0, 7) : '-'} &bull; ${escapeHtml(p.last_commit_date_relative || 'recentemente')}</span>
                  ${agentBadge}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="pt-2 border-t border-slate-800/60">
          <div class="text-[10px] text-slate-500 font-semibold uppercase">Propósito Executivo</div>
          <div class="text-xs text-slate-300 italic mt-0.5 line-clamp-2">
            "${escapeHtml(p.purpose || 'Propósito não documentado.')}"
          </div>
        </div>
      </div>

      <!-- Coluna 2: Onde Está Agora -->
      <div class="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between space-y-3">
        <div>
          <div class="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            <div class="w-5 h-5 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <i data-lucide="play-circle" class="w-3.5 h-3.5"></i>
            </div>
            <span>2. Onde Está Agora</span>
          </div>

          <div class="space-y-2.5">
            <div>
              <div class="text-[10px] text-slate-500 font-semibold uppercase">Fase Ativa Atual</div>
              <div class="text-xs font-bold text-emerald-300 mt-0.5 bg-emerald-950/30 border border-emerald-500/25 p-2 rounded-lg">
                ${escapeHtml(p.current_phase || 'Em operação contínua')}
              </div>
            </div>

            <div>
              <div class="text-[10px] text-slate-500 font-semibold uppercase mb-1">Stepper de Marcos / Specs</div>
              ${stepperHtml}
            </div>
          </div>
        </div>

        <div class="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
          <div>
            <span class="text-[10px] text-slate-500 uppercase block">Maturidade SDD</span>
            <span class="font-extrabold text-indigo-300">${p.sdd_score || 0}/100</span>
          </div>
          <div class="text-right">
            <span class="text-[10px] text-slate-500 uppercase block">Commits Recentes</span>
            <span class="font-bold text-slate-300">${p.changes_24h || 0} (24h) &bull; ${p.changes_7d || 0} (7d)</span>
          </div>
        </div>
      </div>

      <!-- Coluna 3: O Que Vem a Seguir -->
      <div class="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between space-y-3">
        <div>
          <div class="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            <div class="w-5 h-5 rounded-md bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <i data-lucide="arrow-right-circle" class="w-3.5 h-3.5"></i>
            </div>
            <span>3. O Que Vem a Seguir</span>
          </div>

          <div class="space-y-2">
            <div>
              <div class="text-[10px] text-slate-500 font-semibold uppercase">Próxima Ação Concreta</div>
              <div class="text-xs font-bold text-indigo-200 mt-0.5 bg-indigo-950/40 border border-indigo-500/30 p-2.5 rounded-lg leading-snug">
                ${escapeHtml(p.next_action || 'Definir próximas tarefas no TASKS.md')}
              </div>
            </div>

            <!-- Bloco de Atenção Crítica -->
            ${attentionHtml}
          </div>
        </div>

        <div class="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
          <span>Inatividade: <strong class="text-slate-300">${p.days_since_last_change ?? '-'} dias</strong></span>
          <span>Specs: <strong class="text-emerald-400">${p.done_specs || 0}</strong> de <strong>${p.total_specs || 0}</strong> concluídas</span>
        </div>
      </div>

    </div>

    <!-- Barra Inferior: Radar de Worktrees e Comandos Rápidos -->
    ${(worktreesHtml || commandsHtml) ? `
      <div class="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        ${commandsHtml}
        ${worktreesHtml}
      </div>
    ` : ''}
  `;

  lucide.createIcons();
}

function renderProjectsPipeline(projects) {
  const container = document.getElementById('pipeline-columns-grid');
  if (!container) return;

  const stages = [
    { id: 'planning', title: '1. Planejamento & SDD', icon: 'file-text', color: 'indigo', desc: 'Rascunhos, specs e arquitetura inicial' },
    { id: 'active', title: '2. Em Desenvolvimento', icon: 'zap', color: 'emerald', desc: 'Em tração contínua e commits recentes' },
    { id: 'validation', title: '3. Validação & Bloqueio', icon: 'alert-triangle', color: 'amber', desc: 'Aguardando validação ou Alexandre' },
    { id: 'stable', title: '4. Publicado & Estável', icon: 'check-circle-2', color: 'cyan', desc: 'Versão em produção com árvore limpa' },
    { id: 'idle', title: '5. Hibernando / Pausado', icon: 'clock', color: 'slate', desc: 'Sem commits nos últimos 30 dias' }
  ];

  container.innerHTML = stages.map(stage => {
    const stageProjects = projects.filter(p => (p.pipeline_stage || 'idle') === stage.id);

    return `
      <div class="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col min-h-[480px]">
        <!-- Col Header -->
        <div class="pb-3 border-b border-slate-800 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="w-6 h-6 rounded-md bg-${stage.color}-500/20 text-${stage.color}-400 flex items-center justify-center text-xs font-bold">
              <i data-lucide="${stage.icon}" class="w-3.5 h-3.5"></i>
            </div>
            <div>
              <div class="text-xs font-bold text-slate-200">${escapeHtml(stage.title)}</div>
              <div class="text-[10px] text-slate-500">${escapeHtml(stage.desc)}</div>
            </div>
          </div>
          <span class="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700">
            ${stageProjects.length}
          </span>
        </div>

        <!-- Col Cards List -->
        <div class="flex-1 space-y-2.5 mt-3 overflow-y-auto max-h-[600px] pr-1">
          ${stageProjects.length === 0 ? `
            <div class="py-8 text-center text-slate-600 text-xs italic">
              Nenhum projeto neste estágio
            </div>
          ` : stageProjects.map(p => {
            const isSpotlighted = spotlightCurrentProject && spotlightCurrentProject.name === p.name;
            const borderClass = isSpotlighted ? 'border-indigo-500 ring-1 ring-indigo-500/40 bg-indigo-950/20' : 'border-slate-800 hover:border-slate-700 bg-slate-950/60';
            const stackBadge = getStackBadge(p.stack);
            const agentBadge = getAgentBadge(p.last_agent);

            return `
              <div class="p-3 rounded-xl border ${borderClass} transition cursor-pointer group shadow-sm" onclick="setSpotlightProject('${escapeHtml(p.name)}')" ondblclick="openProjectModal('${escapeHtml(p.name)}')">
                <div class="flex items-start justify-between gap-2">
                  <div class="font-bold text-xs text-white group-hover:text-indigo-300 transition truncate" title="${escapeHtml(p.name)}">
                    ${escapeHtml(p.name)}
                  </div>
                  <span class="text-[10px] font-mono text-slate-500">${p.changes_30d || 0}c/30d</span>
                </div>

                <div class="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  ${stackBadge}
                  ${p.alexandre_pending_count > 0 ? `<span class="text-[10px] font-bold text-amber-300 bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/30">⚠️ ${p.alexandre_pending_count} p/ Alexandre</span>` : ''}
                </div>

                <div class="text-[11px] text-slate-300 mt-2 font-medium line-clamp-2 leading-relaxed">
                  ${escapeHtml(p.next_action || p.current_phase || p.purpose)}
                </div>

                <div class="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-500">
                  <span class="truncate max-w-[120px]">${p.last_commit_date_relative || '-'}</span>
                  ${agentBadge}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }).join('');

  lucide.createIcons();
}
