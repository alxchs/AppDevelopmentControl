// Cliente HTTP da dashboard (sem dependencias externas)
async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return data;
}

export const api = {
  getLanInfo: () => fetchJson('/api/lan-info').catch(() => null),
  getKpis: () => fetchJson('/api/kpis').catch(() => null),
  getProjects: () => fetchJson('/api/projects').catch(() => []),
  getAlexandreActions: () => fetchJson('/api/alexandre-actions').catch(() => []),
  getSnapshots: (limit = 30) => fetchJson(`/api/snapshots?limit=${limit}`).catch(() => []),
  getStatus: () => fetchJson('/api/status').catch(() => null),
  getProject: (name) => fetchJson(`/api/projects/${encodeURIComponent(name)}`),
  getProjectProduction: (name) => fetchJson(`/api/projects/${encodeURIComponent(name)}/production`),
  scanAll: () => fetchJson('/api/scan', { method: 'POST' }),
  savePurpose: (name, purpose) => fetchJson(`/api/projects/${encodeURIComponent(name)}/purpose`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ purpose })
  }),
  registerProject: (path, label) => fetchJson('/api/projects/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, label })
  })
};
