// AppDevelopmentControl - Executive Frontend Logic (Canonical + Health & SDD Direction Engine)

let allProjects = [];
let allAlexandreActions = [];
let kpiData = null;
let currentFilter = 'all';
let currentSort = 'activity';
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

// Carregar Dados da API
async function loadAllData() {
  try {
    const [lanRes, kpisRes, projectsRes, actionsRes] = await Promise.all([
      fetch('/api/lan-info').then(r => r.json()),
      fetch('/api/kpis').then(r => r.json()),
      fetch('/api/projects').then(r => r.json()),
      fetch('/api/alexandre-actions').then(r => r.json())
    ]);

    // Atualizar Banner LAN
    if (lanRes && lanRes.primaryUrl) {
      document.getElementById('lan-primary-url').innerText = lanRes.primaryUrl;
    }

    // Atualizar KPIs
    kpiData = kpisRes;
    renderKpis(kpisRes);

    // Projetos e Ações
    allProjects = projectsRes || [];
    allAlexandreActions = actionsRes || [];

    // Renderizar Seção Alexandre
    renderAlexandrePanel(allAlexandreActions);

    // Renderizar Gráficos
    renderCharts(allProjects, kpisRes);

    // Renderizar Grid
    applyFilterAndRender();

  } catch (err) {
    console.error('Erro ao carregar dados:', err);
  }
}

function renderKpis(kpis) {
  document.getElementById('kpi-total-projects').innerText = kpis.totalProjects;
  document.getElementById('kpi-total-worktrees').innerText = `${kpis.totalWorktrees || 0} worktrees vinculadas`;
  document.getElementById('kpi-total-commits').innerText = Number(kpis.totalCommits).toLocaleString('pt-BR');
  document.getElementById('kpi-commits-month').innerText = `${kpis.commits30d} últimos 30d`;
  document.getElementById('kpi-commits-week').innerText = kpis.commits7d;
  document.getElementById('kpi-commits-24h').innerText = `${kpis.commits24h} nas últimas 24h`;
  document.getElementById('kpi-total-specs').innerText = kpis.totalSpecs;
  document.getElementById('kpi-done-specs').innerText = kpis.doneSpecs;

  const rate = kpis.totalSpecs > 0 ? Math.round((kpis.doneSpecs / kpis.totalSpecs) * 100) : 0;
  document.getElementById('kpi-specs-rate').innerText = `${rate}% concluídas`;

  document.getElementById('kpi-alexandre-actions').innerText = kpis.alexandreActionsCount;
  document.getElementById('alexandre-count-badge').innerText = `${kpis.alexandreActionsCount} Pendências`;

  document.getElementById('chart-done-val').innerText = kpis.doneSpecs;
  document.getElementById('chart-pending-val').innerText = kpis.pendingSpecs;
}

function renderAlexandrePanel(actions) {
  const container = document.getElementById('alexandre-actions-list');
  if (!actions || actions.length === 0) {
    container.innerHTML = `
      <div class="py-6 text-center text-xs text-slate-500">
        Nenhuma decisão ou pendência aberta do Alexandre no momento. Tudo liberado!
      </div>
    `;
    return;
  }

  container.innerHTML = actions.map(a => `
    <div class="py-2.5 flex items-start justify-between gap-4">
      <div class="space-y-0.5">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="text-xs font-bold text-slate-200 cursor-pointer hover:text-indigo-400 transition" onclick="openProjectModal('${escapeHtml(a.project_name)}')">
            ${escapeHtml(a.project_name)}
          </span>
          <span class="text-[10px] font-mono bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">
            ${escapeHtml(a.file_path)}
          </span>
          ${a.source_worktree ? `<span class="text-[10px] font-mono bg-indigo-500/10 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-500/20">Worktree: ${escapeHtml(a.source_worktree)}</span>` : ''}
        </div>
        <p class="text-xs font-medium text-amber-300/90">${escapeHtml(a.title)}</p>
        ${a.snippet ? `<p class="text-[11px] text-slate-400 italic">"${escapeHtml(a.snippet)}"</p>` : ''}
      </div>
      <button onclick="openProjectModal('${escapeHtml(a.project_name)}')" class="shrink-0 px-2 py-1 rounded text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition">
        Ver Projeto
      </button>
    </div>
  `).join('');
}

function renderCharts(projects, kpis) {
  const sorted = [...projects].sort((a, b) => b.changes_30d - a.changes_30d).slice(0, 10);
  const labels = sorted.map(p => p.name.length > 15 ? p.name.slice(0, 14) + '…' : p.name);
  const data30d = sorted.map(p => p.changes_30d);
  const data7d = sorted.map(p => p.changes_7d);

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
    const purposeLower = (item.purpose || '').toLowerCase();
    const pathLower = (item.path || '').toLowerCase();
    const healthLower = (item.health_status || '').toLowerCase();
    const tagLower = (item.last_tag || '').toLowerCase();
    const agentLower = (item.last_agent || '').toLowerCase();
    const worktreesLower = (item.worktrees || []).map(w => w.name.toLowerCase()).join(' ');

    for (const term of terms) {
      if (nameLower === term) score += 50;
      else if (nameLower.startsWith(term)) score += 30;
      else if (nameLower.includes(term)) score += 20;

      if (purposeLower.includes(term)) score += 10;
      if (pathLower.includes(term)) score += 5;
      if (worktreesLower.includes(term)) score += 15;
      if (healthLower.includes(term)) score += 25;
      if (tagLower.includes(term)) score += 20;
      if (agentLower.includes(term)) score += 15;

      if (term === 'alexandre' && item.alexandre_pending_count > 0) score += 40;

      if (term.length >= 4) {
        if (fuzzyMatch(term, nameLower)) score += 15;
        if (fuzzyMatch(term, purposeLower)) score += 5;
      }
    }

    return { item, score };
  })
  .filter(res => res.score > 0)
  .sort((a, b) => b.score - a.score)
  .map(res => res.item);
}

function fuzzyMatch(needle, haystack) {
  const words = haystack.split(/[\s-_/]+/);
  for (const word of words) {
    if (Math.abs(word.length - needle.length) <= 2) {
      let diff = 0;
      for (let i = 0; i < Math.min(word.length, needle.length); i++) {
        if (word[i] !== needle[i]) diff++;
        if (diff > 2) break;
      }
      if (diff <= 1) return true;
    }
  }
  return false;
}

// Filtragem, Ordenação e Renderização dos Cards
function applyFilterAndRender() {
  const query = document.getElementById('search-input').value;
  let filtered = [...allProjects];

  // 1. Busca inteligente
  if (query.trim()) {
    filtered = intelligentSearch(query, filtered);
  }

  // 2. Filtro rápido de Saúde e Direção
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

  renderProjectsGrid(filtered);
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

    // Badges de worktree
    const worktreeCount = p.worktrees ? p.worktrees.length : 0;
    const worktreeBadge = worktreeCount > 0 ? `
      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/25" title="${worktreeCount} pastas de trabalho vinculadas">
        <i data-lucide="git-branch" class="w-3 h-3"></i>
        <span>${worktreeCount} wt</span>
      </span>
    ` : '';

    // Tag
    const tagBadge = p.last_tag ? `
      <span class="inline-flex items-center gap-1 text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 truncate max-w-[150px]" title="Última tag: ${escapeHtml(p.last_tag)}">
        <i data-lucide="tag" class="w-3 h-3 text-slate-500"></i>
        <span>${escapeHtml(p.last_tag)}</span>
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
    const sddColor = sddScore >= 70 ? 'bg-emerald-500' : (sddScore >= 40 ? 'bg-indigo-500' : 'bg-amber-500');

    // Barra de specs
    let specsBar = '';
    if (p.total_specs > 0) {
      const pct = Math.round((p.done_specs / p.total_specs) * 100);
      specsBar = `
        <div class="mt-3 pt-3 border-t border-slate-800/80">
          <div class="flex items-center justify-between text-xs mb-1.5">
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
        <div class="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
          <span>Specs SDD: Não configuradas</span>
        </div>
      `;
    }

    const initLocal = p.created_local ? p.created_local.slice(0, 10) : '—';
    const initGh = p.created_github ? p.created_github.slice(0, 10) : (p.github_url ? 'GitHub ativo' : 'Sem GitHub');

    return `
      <div class="bg-slate-900 border ${p.alexandre_pending_count > 0 ? 'border-amber-500/30' : 'border-slate-800'} rounded-2xl p-5 hover:border-slate-700 transition flex flex-col justify-between shadow-lg shadow-black/20 group">
        <div>
          <!-- Header do Card -->
          <div class="flex items-start justify-between gap-2 mb-2">
            <div class="flex items-center gap-1.5 flex-wrap">
              ${healthBadge}
              ${worktreeBadge}
              ${tagBadge}
            </div>
            ${alexandreBadge}
          </div>

          <!-- Título e SDD Score -->
          <div class="flex items-center justify-between gap-2 mt-1">
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

          <!-- Datas de Início -->
          <div class="grid grid-cols-2 gap-2 mt-3 text-[11px] bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60">
            <div>
              <span class="text-slate-500 block">Início no PC</span>
              <span class="text-slate-300 font-medium font-mono">${initLocal}</span>
            </div>
            <div>
              <span class="text-slate-500 block">Início no GitHub</span>
              <span class="text-slate-300 font-medium font-mono">${initGh}</span>
            </div>
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

          <!-- Inatividade -->
          <div class="flex items-center justify-between text-[11px] text-slate-400 mt-3 px-1">
            <span>Hiato máx: <strong class="text-slate-300">${p.max_inactive_days}d</strong></span>
            <span>Sem alteração: <strong class="${p.days_since_last_change > 30 ? 'text-amber-400' : 'text-slate-300'}">${p.days_since_last_change}d</strong></span>
          </div>

          <!-- Specs -->
          ${specsBar}
        </div>

        <!-- Footer Card -->
        <div class="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
          <span class="text-[10px] text-slate-500 truncate max-w-[180px]" title="${escapeHtml(p.path)}">${escapeHtml(p.path)}</span>
          <button onclick="openProjectModal('${escapeHtml(p.name)}')" class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 hover:border-indigo-500/40 transition">
            Detalhes
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// Modal de Detalhes
async function openProjectModal(projectName) {
  try {
    const res = await fetch(`/api/projects/${encodeURIComponent(projectName)}`);
    if (!res.ok) return;
    const p = await res.json();
    selectedProject = p;

    document.getElementById('modal-title').innerText = p.name;
    document.getElementById('modal-type-badge').innerText = p.has_git ? 'REPOSITÓRIO PRINCIPAL' : 'SEM GIT';
    document.getElementById('modal-path').innerText = p.path;
    document.getElementById('modal-purpose-input').value = p.purpose;
    document.getElementById('modal-purpose-source').innerText = p.purpose_source ? `Fonte: ${p.purpose_source}` : '';

    // Farol de Saúde e SDD Score no Modal
    const badgeHtml = getHealthBadge(p.health_status, p.health_reason);
    document.getElementById('modal-health-badge').outerHTML = `<span id="modal-health-badge">${badgeHtml}</span>`;
    document.getElementById('modal-health-reason').innerText = p.health_reason || 'Status computado automaticamente';
    document.getElementById('modal-last-agent').innerText = p.last_agent ? `Último autor: ${p.last_agent}` : '';

    const sddVal = p.sdd_score || 0;
    document.getElementById('modal-sdd-score-val').innerText = `${sddVal}%`;
    document.getElementById('modal-sdd-bar').style.width = `${sddVal}%`;
    document.getElementById('modal-last-tag').innerText = p.last_tag ? `Última Tag: ${p.last_tag}` : 'Sem tags git';
    document.getElementById('modal-tag-date').innerText = p.last_tag_date ? p.last_tag_date.slice(0, 10) : '';

    document.getElementById('modal-init-local').innerText = p.created_local ? p.created_local.slice(0, 10) : '—';
    document.getElementById('modal-init-github').innerText = p.created_github ? p.created_github.slice(0, 10) : '—';
    document.getElementById('modal-inactive-max').innerText = `${p.max_inactive_days} dias`;
    document.getElementById('modal-inactive-current').innerText = `${p.days_since_last_change} dias`;

    // Worktrees Vinculadas
    const worktreesList = p.worktrees || [];
    const wtBox = document.getElementById('modal-worktrees-box');
    const wtCount = document.getElementById('modal-worktrees-count');
    const wtContainer = document.getElementById('modal-worktrees-list');

    if (worktreesList.length > 0) {
      wtBox.classList.remove('hidden');
      wtCount.innerText = worktreesList.length;
      wtContainer.innerHTML = worktreesList.map(w => `
        <div class="flex items-center justify-between text-xs py-1.5 border-b border-slate-900 last:border-0">
          <div class="flex items-center gap-2">
            <span class="font-bold text-slate-200">${escapeHtml(w.name)}</span>
            <span class="px-1.5 py-0.5 rounded text-[10px] font-mono bg-indigo-500/15 text-indigo-300 border border-indigo-500/25">
              branch: ${escapeHtml(w.branch)}
            </span>
          </div>
          <span class="text-[10px] font-mono text-slate-500 truncate max-w-[260px]" title="${escapeHtml(w.path)}">
            ${escapeHtml(w.path)}
          </span>
        </div>
      `).join('');
    } else {
      wtBox.classList.add('hidden');
    }

    // Specs
    const specsList = p.specs || [];
    document.getElementById('modal-specs-count').innerText = specsList.length;
    const specsContainer = document.getElementById('modal-specs-list');

    if (specsList.length === 0) {
      specsContainer.innerHTML = `<div class="text-xs text-slate-500 italic">Nenhuma especificação em docs/specs/ encontrada.</div>`;
    } else {
      specsContainer.innerHTML = specsList.map(s => `
        <div class="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between gap-3 text-xs">
          <div>
            <div class="flex items-center gap-2">
              <span class="font-bold text-slate-200">${escapeHtml(s.spec_id)}</span>
              <span class="px-1.5 py-0.5 rounded text-[10px] font-semibold ${s.status === 'done' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}">
                ${s.status === 'done' ? 'Desenvolvida' : 'Pendente'}
              </span>
              ${s.source_worktree ? `<span class="px-1.5 py-0.5 rounded text-[9px] bg-slate-800 text-slate-400">Origem: ${escapeHtml(s.source_worktree)}</span>` : ''}
            </div>
            <p class="text-[11px] text-slate-400 mt-0.5">${escapeHtml(s.summary || s.spec_name)}</p>
          </div>
          <div class="text-right shrink-0">
            <span class="text-xs font-mono font-bold ${s.pending_tasks === 0 ? 'text-emerald-400' : 'text-slate-300'}">
              ${s.completed_tasks}/${s.total_tasks}
            </span>
            <span class="text-[10px] text-slate-500 block">tarefas</span>
          </div>
        </div>
      `).join('');
    }

    // Ações do Alexandre
    const actionsList = p.alexandre_actions || [];
    document.getElementById('modal-alexandre-count').innerText = actionsList.length;
    const actionsContainer = document.getElementById('modal-alexandre-list');
    const actionsBox = document.getElementById('modal-alexandre-box');

    if (actionsList.length === 0) {
      actionsBox.classList.add('hidden');
    } else {
      actionsBox.classList.remove('hidden');
      actionsContainer.innerHTML = actionsList.map(a => `
        <div class="text-xs space-y-0.5">
          <div class="flex items-center gap-2">
            <span class="font-mono text-[10px] bg-slate-900 px-1.5 py-0.5 rounded text-slate-400 border border-slate-800">${escapeHtml(a.file_path)}</span>
            <strong class="text-amber-300">${escapeHtml(a.title)}</strong>
            ${a.source_worktree ? `<span class="text-[9px] font-mono text-indigo-400">(${escapeHtml(a.source_worktree)})</span>` : ''}
          </div>
          ${a.snippet ? `<p class="text-[11px] text-slate-400 italic">"${escapeHtml(a.snippet)}"</p>` : ''}
        </div>
      `).join('');
    }

    document.getElementById('modal-project').classList.remove('hidden');
    lucide.createIcons();
  } catch (err) {
    console.error('Erro ao abrir modal:', err);
  }
}

function closeModal() {
  document.getElementById('modal-project').classList.add('hidden');
  selectedProject = null;
}

// Salvar Propósito
async function handleSavePurpose() {
  if (!selectedProject) return;
  const newPurpose = document.getElementById('modal-purpose-input').value.trim();
  if (!newPurpose) return;

  try {
    const res = await fetch(`/api/projects/${encodeURIComponent(selectedProject.name)}/purpose`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ purpose: newPurpose })
    });
    if (res.ok) {
      selectedProject.purpose = newPurpose;
      const idx = allProjects.findIndex(p => p.name === selectedProject.name);
      if (idx !== -1) allProjects[idx].purpose = newPurpose;
      applyFilterAndRender();
      alert('Propósito atualizado e persistido com sucesso!');
    }
  } catch (err) {
    alert('Erro ao salvar propósito: ' + err.message);
  }
}

// Sincronizar Varredura Manual
async function handleRescan() {
  const icon = document.getElementById('rescan-icon');
  icon.classList.add('spin');
  try {
    const res = await fetch('/api/scan', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      await loadAllData();
      alert(`Varredura concluída com sucesso em ${data.durationMs}ms! ${data.count} projetos canônicos sincronizados.`);
    }
  } catch (err) {
    alert('Erro na varredura: ' + err.message);
  } finally {
    icon.classList.remove('spin');
  }
}

// Registrar Novo Projeto
async function handleRegisterProject() {
  const pathInput = document.getElementById('add-project-path').value.trim();
  const labelInput = document.getElementById('add-project-label').value.trim();
  const errBox = document.getElementById('add-project-error');

  if (!pathInput) {
    errBox.innerText = 'Por favor, informe o caminho da pasta.';
    errBox.classList.remove('hidden');
    return;
  }

  try {
    const res = await fetch('/api/projects/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: pathInput, label: labelInput })
    });
    const data = await res.json();
    if (!res.ok) {
      errBox.innerText = data.error || 'Erro ao registrar projeto.';
      errBox.classList.remove('hidden');
      return;
    }

    document.getElementById('modal-add-project').classList.add('hidden');
    await loadAllData();
    alert('Novo projeto catalogado com sucesso!');
  } catch (err) {
    errBox.innerText = 'Falha de comunicação: ' + err.message;
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
