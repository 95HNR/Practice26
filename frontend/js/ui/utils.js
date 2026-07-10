export function showNotification(msg) {
  const container = document.getElementById('alertContainer');
  if (!container) return;
  const note = document.createElement('div');
  note.className = "glass-panel border-l-4 border-l-blue-500 p-4 rounded-xl shadow-lg fade-in font-bold flex items-center gap-3 transition-opacity duration-300 mb-3 text-white";
  note.innerHTML = `<span class="text-2xl">🔔</span> <span>${msg}</span>`;
  container.prepend(note);
  setTimeout(() => {
    note.style.opacity = '0';
    setTimeout(() => note.remove(), 300);
  }, 5000);
}

export function initScrollReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
      } else {
        entry.target.classList.remove('active');
      }
    });
  }, { threshold: 0.05, rootMargin: "0px 0px -20px 0px" });

  document.querySelectorAll('.glass-panel, tbody tr, form').forEach(el => {
    if (!el.classList.contains('reveal')) { el.classList.add('reveal'); }
    observer.observe(el);
  });
}

export function toggleTheme() {
  const body = document.body;
  body.classList.toggle('light-theme');
  const isLight = body.classList.contains('light-theme');
  localStorage.setItem('drivecheck_theme', isLight ? 'light' : 'dark');

  if (typeof window.costChartInstance !== 'undefined' && window.costChartInstance) {
    const textColor = isLight ? '#475569' : '#94a3b8';
    const gridColor = isLight ? '#e2e8f0' : 'rgba(255,255,255,0.1)';
    window.costChartInstance.options.plugins.legend.labels.color = textColor;
    window.costChartInstance.options.scales.x.ticks.color = textColor;
    window.costChartInstance.options.scales.y.ticks.color = textColor;
    window.costChartInstance.options.scales.y.grid.color = gridColor;
    window.costChartInstance.update();
  }
}

export function formatDateStr(isoStr) { 
  return isoStr ? isoStr.split('T')[0] : 'Nincs adat'; 
}