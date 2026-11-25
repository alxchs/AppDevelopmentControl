// Notificacoes toast nao bloqueantes (sem alert/prompt; paleta Slate/Emerald/Amber/Indigo, zero vermelho)
export function showToast(message, tone = 'info', durationMs = 3500) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toneClasses = {
    success: 'bg-slate-900 border-emerald-500/40 text-emerald-200',
    warning: 'bg-slate-900 border-amber-500/50 text-amber-200',
    info: 'bg-slate-900 border-indigo-500/40 text-slate-100'
  };

  const dotClasses = {
    success: 'bg-emerald-400',
    warning: 'bg-amber-400',
    info: 'bg-indigo-400'
  };

  const el = document.createElement('div');
  el.className = `flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border shadow-xl text-xs font-medium transition-all duration-200 ${toneClasses[tone] || toneClasses.info}`;

  const dot = document.createElement('span');
  dot.className = `w-2 h-2 rounded-full shrink-0 ${dotClasses[tone] || dotClasses.info}`;

  const text = document.createElement('span');
  text.className = 'flex-1';
  text.textContent = message;

  el.appendChild(dot);
  el.appendChild(text);
  container.appendChild(el);

  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(4px)';
    setTimeout(() => el.remove(), 200);
  }, durationMs);
}
