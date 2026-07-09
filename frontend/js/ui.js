let startCoords = { lat: 0, lon: 0 };
let endCoords = { lat: 0, lon: 0 };
let debounceTimer = null;
window.currentFlotta = [];
let costChartInstance = null;

// --- SOCKET.IO ÉS ÉRTESÍTÉSEK ---
const socket = (typeof io !== 'undefined') ? io('http://localhost:3000') : null;

window.showNotification = function (msg) {
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
};

if (socket) {
  socket.on('adat_frissites', () => {
    console.log("🔄 Valós idejű frissítés érkezett a szervertől!");
    if (window.AppState && window.AppState.user && window.AppState.user.role === 'ADMIN') {
      if (typeof window.loadRiasztasok === 'function') window.loadRiasztasok();
      if (typeof loadBeerkezoList === 'function') loadBeerkezoList();
      showNotification("Új fuvarigény vagy rendszeresemény történt!");
      if (typeof loadAuditLog === 'function') loadAuditLog();
      if (typeof loadAktivFlotta === 'function') loadAktivFlotta();
      if (typeof renderDashboard === 'function') renderDashboard();
      if (typeof loadFlottaStatisztika === 'function') loadFlottaStatisztika();
    }
    if (window.AppState && window.AppState.token) {
      if (typeof loadAutok === 'function') loadAutok();
      if (typeof loadUtak === 'function') loadUtak();
    }
  });
}

// --- TÉMA VÁLTÓ LOGIKA ---
function toggleTheme() {
  const body = document.body;
  body.classList.toggle('light-theme');
  const isLight = body.classList.contains('light-theme');
  localStorage.setItem('drivecheck_theme', isLight ? 'light' : 'dark');

  if (typeof costChartInstance !== 'undefined' && costChartInstance) {
    const textColor = isLight ? '#475569' : '#94a3b8';
    const gridColor = isLight ? '#e2e8f0' : 'rgba(255,255,255,0.1)';
    costChartInstance.options.plugins.legend.labels.color = textColor;
    costChartInstance.options.scales.x.ticks.color = textColor;
    costChartInstance.options.scales.y.ticks.color = textColor;
    costChartInstance.options.scales.y.grid.color = gridColor;
    costChartInstance.update();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (localStorage.getItem('drivecheck_theme') === 'light') { document.body.classList.add('light-theme'); }
});

// --- TÉRKÉP ÉS TÁVOLSÁG ---
function resetDistanceField(resetStart = true, resetEnd = true) {
  if (resetStart) startCoords = { lat: 0, lon: 0 };
  if (resetEnd) endCoords = { lat: 0, lon: 0 };
  const tavInput = document.getElementById('utTav');
  if (tavInput) {
    tavInput.value = '';
    tavInput.classList.remove('border-emerald-500', 'text-emerald-400');
  }
}

function searchOSM(inputEl, dropdownId) {
  clearTimeout(debounceTimer);
  if (inputEl.id === 'utIndulas') resetDistanceField(true, false);
  if (inputEl.id === 'utErkezes') resetDistanceField(false, true);
  const query = inputEl.value.trim();
  const dropdown = document.getElementById(dropdownId);
  if (query.length < 3) return dropdown.classList.add('hidden');

  debounceTimer = setTimeout(async () => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&accept-language=hu`);
      const results = await res.json();
      if (results.length === 0) {
        dropdown.innerHTML = `<div class="p-5 text-sm text-slate-400 text-center font-bold">Nincs találat a térképen</div>`;
        return dropdown.classList.remove('hidden');
      }
      dropdown.innerHTML = results.map(item => `
        <div onclick="selectLocation('${inputEl.id}', '${dropdownId}', '${item.display_name.split(',').slice(0, 3).join(', ').trim().replace(/'/g, "\\'")}', ${item.lat}, ${item.lon})" class="p-4 hover:bg-white/10 border-b border-white/5 cursor-pointer flex items-center gap-3 transition">
          <span class="text-blue-400 text-xl">📍</span>
          <div><div class="text-xs font-bold text-white leading-tight">${item.display_name.split(',').slice(0, 3).join(', ').trim()}</div></div>
        </div>`).join('');
      dropdown.classList.remove('hidden');
    } catch (err) { }
  }, 600);
}

async function selectLocation(inputId, dropdownId, locationName, lat, lon) {
  document.getElementById(inputId).value = locationName;
  document.getElementById(dropdownId).classList.add('hidden');
  if (inputId === 'utIndulas') startCoords = { lat, lon };
  if (inputId === 'utErkezes') endCoords = { lat, lon };

  if (startCoords.lat !== 0 && endCoords.lat !== 0) {
    const tavInput = document.getElementById('utTav');
    tavInput.value = 'Tervezés folyamatban...';
    try {
      const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${startCoords.lon},${startCoords.lat};${endCoords.lon},${endCoords.lat}?overview=false`);
      const data = await res.json();
      if (data.routes && data.routes[0]) {
        tavInput.value = (data.routes[0].distance / 1000).toFixed(1) + ' km';
        tavInput.classList.add('border-emerald-500', 'text-emerald-400');
      }
    } catch (e) { tavInput.value = 'Hiba a tervezéskor!'; }
  }
}

// --- MODALOK MEGJELENÍTÉSE ANIMÁCIÓVAL ---
function openModalWithAnim(modalId) {
  const modal = document.getElementById(modalId);
  modal.classList.remove('hidden');
  const card = modal.querySelector('.glass-panel');
  if (card) card.classList.add('fade-in');
}

function openEditModal(rendszam) {
  const auto = window.currentFlotta.find(a => a.rendszam === rendszam);
  if (!auto) return;
  document.getElementById('editRendszam').value = auto.rendszam;
  document.getElementById('editTipus').value = auto.tipus;
  document.getElementById('editStatusz').value = auto.statusz;
  document.getElementById('editItp').value = auto.itp ? auto.itp.split('T')[0] : '';
  document.getElementById('editRca').value = auto.rca ? auto.rca.split('T')[0] : '';
  document.getElementById('editRovinieta').value = auto.rovinieta ? auto.rovinieta.split('T')[0] : '';
  openModalWithAnim('editAutoModal');
}
function closeEditModal() { document.getElementById('editAutoModal').classList.add('hidden'); }

async function openSzervizModal(rendszam) {
  document.getElementById('szervizModalTitle').innerHTML = `🛠️ <span class="text-blue-400 font-mono tracking-widest">${rendszam}</span> Szerviztörténet`;
  document.getElementById('szervizAutoRendszam').value = rendszam;
  const lista = document.getElementById('szervizLista');
  lista.innerHTML = '<div class="text-center text-slate-400 py-8 font-bold animate-pulse">Adatok betöltése...</div>';
  openModalWithAnim('szervizModal');
  try {
    const szervizek = await API.fetchSzerviz(window.AppState.token, rendszam);
    if (!Array.isArray(szervizek) || szervizek.length === 0) {
      lista.innerHTML = '<div class="text-center text-slate-400 text-sm py-8 font-bold">Még nincs rögzített szerviz.</div>';
    } else {
      lista.innerHTML = szervizek.map(sz => `
        <div class="glass-panel p-5 transition hover:bg-white/5 mb-3">
          <div class="flex justify-between items-center mb-3">
            <span class="font-black text-blue-400 text-sm">🗓️ ${sz.datum.split('T')[0]}</span>
            <span class="text-xs bg-black/30 px-3 py-1 rounded-lg text-slate-300 border border-white/10 font-mono font-bold">${sz.kilometer} km</span>
          </div>
          <div class="text-sm text-slate-300 mt-1 leading-relaxed">${sz.leiras}</div>
        </div>`).join('');
    }
  } catch (e) { lista.innerHTML = '<div class="text-red-400 text-sm py-8 font-bold text-center">Hiba történt.</div>'; }
}
function closeSzervizModal() { document.getElementById('szervizModal').classList.add('hidden'); }

function openLezarModal(id, rendszam) {
  document.getElementById('lezarUtId').value = id;
  document.getElementById('lezarModalTitle').innerHTML = `⛽ Fuvar Lezárása: <span class="text-emerald-400 font-mono">#${id}</span> (${rendszam})`;
  openModalWithAnim('lezarModal');
}
function closeLezarModal() { document.getElementById('lezarModal').classList.add('hidden'); }

// --- DASHBOARD ÉS GRAFIKON ---
async function renderDashboard() {
  const token = window.AppState.token; if (!token || typeof Chart === 'undefined') return;
  const ctx = document.getElementById('costChart'); if (!ctx) return;
  try {
    const utak = await API.fetchUtak(token, true, '');
    if (!Array.isArray(utak)) return;
    const haviKoltsegek = {};
    utak.forEach(u => { if (u.status === 'TELJESITVE') { haviKoltsegek[u.honap_ev] = (haviKoltsegek[u.honap_ev] || 0) + u.koltseg; } });
    const labels = Object.keys(haviKoltsegek).sort(); const data = labels.map(l => haviKoltsegek[l]);

    const isLight = document.body.classList.contains('light-theme');
    const textColor = isLight ? '#0f172a' : '#f8fafc';
    const gridColor = isLight ? '#e2e8f0' : 'rgba(255,255,255,0.1)';

    if (costChartInstance) {
      costChartInstance.data.labels = labels;
      costChartInstance.data.datasets[0].data = data;
      costChartInstance.update();
    } else {
      costChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            label: 'Havi Költség (RON)',
            data: data,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.15)',
            borderWidth: 4,
            pointBackgroundColor: '#2563eb',
            pointBorderColor: '#ffffff',
            pointRadius: 6,
            pointHoverRadius: 8,
            fill: true,
            tension: 0.4
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { labels: { color: textColor, font: { family: 'sans-serif', weight: 'bold', size: 13 } } } },
          scales: {
            y: { beginAtZero: true, grid: { color: gridColor, drawBorder: false }, ticks: { color: '#e2e8f0', font: { weight: 'bold' } } },
            x: { grid: { display: false }, ticks: { color: '#e2e8f0', font: { weight: 'bold' } } }
          }
        }
      });
    }
  } catch (e) { }
}

// --- ÚJ AUTÓ HOZZÁADÁSA ---
window.addAuto = async function (event) {
  event.preventDefault();
  const kmInput = document.getElementById('autoAktualisKm');
  const kmErtek = kmInput && kmInput.value ? parseInt(kmInput.value) : 0;

  const data = {
    rendszam: document.getElementById('autoRendszam').value.toUpperCase(),
    tipus: document.getElementById('autoTipus').value,
    statusz: document.getElementById('autoStatusz').value,
    aktualis_km: kmErtek,
    itp_lejarat: document.getElementById('autoItp').value || null,
    biztositas_lejarat: document.getElementById('autoBiztositas').value || null,
    utado_lejarat: document.getElementById('autoUtado').value || null
  };

  try {
    const res = await fetch('http://localhost:3000/api/admin/autok', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${window.AppState.token}` },
      body: JSON.stringify(data)
    });

    if (!res.ok) {
      const error = await res.json();
      alert("Hiba az autó hozzáadásakor: " + (error.hiba || "Ellenőrizd az adatokat!"));
      return;
    }

    alert("✅ Autó sikeresen hozzáadva a flottához!");
    event.target.reset();
    if (typeof loadAutok === 'function') loadAutok();
    if (typeof window.loadRiasztasok === 'function') window.loadRiasztasok();
  } catch (e) {
    console.error(e); alert("Hálózati hiba történt.");
  }
};

async function loadAuditLog() {
  const token = window.AppState.token;
  if (!token || window.AppState.user.role !== 'ADMIN') return;
  const container = document.getElementById('auditLogList');
  try {
    const logs = await API.fetchAudit(token);
    if (!Array.isArray(logs) || logs.length === 0) {
      container.innerHTML = '<tr><td colspan="4" class="py-8 text-center text-slate-400 font-bold">Még nincsenek bejegyzések az audit naplóban.</td></tr>';
      return;
    }
    container.innerHTML = logs.map((l, index) => `
      <tr class="transition-all duration-300 fade-in border-b border-white/5 hover:bg-white/5" style="animation-delay: ${index * 50}ms">
        <td class="py-5 px-6 text-[11px] text-slate-400 font-mono font-black">${new Date(l.datum).toLocaleString()}</td>
        <td class="py-5 px-6 font-black text-white text-sm">${l.felhasznalo}</td>
        <td class="py-5 px-6 text-blue-400 font-black text-[10px] tracking-widest uppercase">${l.muvelet}</td>
        <td class="py-5 px-6 text-white text-sm font-medium">${l.reszletek}</td>
      </tr>`).join('');
  } catch (e) { console.error(e); }
}

window.loadRiasztasok = async function () {
  const token = window.AppState.token;
  if (!token || window.AppState.user.role !== 'ADMIN') return;

  const container = document.getElementById('alertContainer');
  if (!container) return;

  try {
    const riasztasok = await API.fetchAlerts(token);
    if (Array.isArray(riasztasok) && riasztasok.length > 0) {
      container.innerHTML = riasztasok.map(r => {
        const isWarning = r.includes('⚠️');
        return `<div class="glass-panel border-l-4 ${isWarning ? 'border-l-amber-500 text-amber-200 bg-amber-500/10' : 'border-l-red-500 text-red-200 bg-red-500/10'} p-5 mb-4 flex items-center fade-in text-sm font-bold shadow-lg">
                  <span class="mr-4 text-3xl">${isWarning ? '⚠️' : '🚨'}</span> ${r.replace('⚠️ ', '').replace('🚨 ', '')}
                </div>`;
      }).join('');
    } else {
      container.innerHTML = '';
    }
  } catch (e) { console.error("Hiba a riasztások betöltésekor:", e); }
};

async function renderUI() {
  const token = window.AppState.token;
  const currentUser = window.AppState.user;

  if (!token) {
    document.getElementById('loginSection').classList.remove('hidden');
    document.getElementById('adminSection').classList.add('hidden');
    document.getElementById('kliensSection').classList.add('hidden');
    document.getElementById('userInfo').classList.add('hidden');
    return;
  }

  document.getElementById('loginSection').classList.add('hidden');
  document.getElementById('userInfo').classList.remove('hidden');
  document.getElementById('welcomeText').textContent = `Üdvözlünk, ${currentUser.username}!`;

  const badge = document.getElementById('roleBadge');
  badge.textContent = currentUser.role;
  badge.className = currentUser.role === 'ADMIN'
    ? "px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest bg-amber-500/20 text-amber-500 border border-amber-500/30 mt-1"
    : "px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest bg-blue-500/20 text-blue-400 border border-blue-500/30 mt-1";

  if (currentUser.role === 'ADMIN') {
    document.getElementById('adminSection').classList.remove('hidden');
    document.getElementById('adminSection').classList.add('fade-in');
    document.getElementById('kliensHeader').classList.add('hidden');
    document.getElementById('soforUrlapContainer').classList.add('hidden');

    if (typeof window.loadRiasztasok === 'function') window.loadRiasztasok();
    if (typeof loadAktivFlotta === 'function') loadAktivFlotta();
    if (typeof renderDashboard === 'function') renderDashboard();
    if (typeof loadAuditLog === 'function') loadAuditLog();
    if (typeof loadBeerkezoList === 'function') loadBeerkezoList();
    if (typeof loadFlottaStatisztika === 'function') loadFlottaStatisztika();
    if (typeof loadSzervizRiasztasok === 'function') loadSzervizRiasztasok();
    if (typeof loadSoforRangsor === 'function') loadSoforRangsor();
  } else {
    document.getElementById('adminSection').classList.add('hidden');
    document.getElementById('kliensHeader').classList.remove('hidden');
    document.getElementById('soforUrlapContainer').classList.remove('hidden');
  }

  document.getElementById('kliensSection').classList.remove('hidden');
  document.getElementById('kliensSection').classList.add('fade-in');
  resetDistanceField(true, true);
  const datumInput = document.getElementById('utDatum');
  if (datumInput && !datumInput.value) datumInput.value = new Date().toISOString().split('T')[0];

  if (typeof loadAutok === 'function') loadAutok();
  if (typeof loadUtak === 'function') loadUtak();
}

function formatDateStr(isoStr) { return isoStr ? isoStr.split('T')[0] : 'Nincs adat'; }

async function loadAktivFlotta() {
  const token = window.AppState.token; if (!token || window.AppState.user.role !== 'ADMIN') return;
  const container = document.getElementById('aktivFlottaList');
  try {
    const aktivUtak = await API.fetchAktivFlotta(token);
    if (!Array.isArray(aktivUtak) || aktivUtak.length === 0) {
      container.innerHTML = `
    <div class="col-span-full py-12 flex flex-col items-center justify-center glass-panel border-2 border-dashed border-white/10 rounded-3xl">
      <div class="text-5xl mb-4 opacity-50">📡</div>
      <p class="font-black text-white text-lg tracking-tight">A flotta épp pihen</p>
      <p class="text-slate-400 text-sm mt-2 font-medium">Jelenleg nincs aktív kirendelés.</p>
    </div>`;
      return;
    }
    container.innerHTML = aktivUtak.map((u, i) => `
      <div class="glass-panel p-5 flex flex-col gap-4 fade-in hover:bg-white/5 transition-all" style="animation-delay: ${i * 100}ms">
        <div class="flex justify-between items-start">
          <div class="font-black text-white flex items-center gap-2">🚘 <span class="font-mono text-blue-400 text-xl tracking-widest">${u.auto_rendszam}</span></div>
          <span class="flex items-center gap-1.5 text-[9px] bg-blue-500/20 text-blue-400 border border-blue-500/50 px-2.5 py-1 rounded-md tracking-widest font-black uppercase">
            <div class="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></div> ÚTON
          </span>
        </div>
        <div class="text-xs text-slate-400 font-bold">👤 Sofőr: <span class="text-white text-sm">${u.sofor_nev}</span></div>
        <div class="bg-black/20 p-3 rounded-xl border border-white/5 text-xs text-slate-300 flex items-center justify-between font-medium">
          <span class="truncate max-w-[100px]" title="${u.indulas}">${u.indulas.split(',')[0]}</span> 
          <span class="text-blue-400 text-lg mx-2">➔</span> 
          <span class="truncate max-w-[100px] text-right" title="${u.erkezes}">${u.erkezes.split(',')[0]}</span>
        </div>
      </div>`).join('');
  } catch (e) { }
}

async function loadAutok() {
  const token = window.AppState.token; const currentUser = window.AppState.user;
  if (!token) return;
  const datumInput = document.getElementById('utDatum');
  const formDate = datumInput ? datumInput.value : new Date().toISOString().split('T')[0];

  try {
    const response = await API.fetchAutok(token, formDate);
    const autok = response.autok ? response.autok : response;
    if (!Array.isArray(autok)) return;

    window.currentFlotta = autok;
    const autoListContainer = document.getElementById('autoList');

    if (autok.length === 0) {
      autoListContainer.innerHTML = `
        <div class="col-span-full py-12 flex flex-col items-center justify-center glass-panel border-2 border-dashed border-white/10 rounded-3xl">
          <div class="text-5xl mb-4 opacity-40">🚘</div>
          <p class="font-black text-white text-lg tracking-tight">A járműpark üres</p>
          <p class="text-slate-400 text-sm mt-2 font-medium">Nincs regisztrált autó a rendszerben.</p>
        </div>`;
    } else {
      autoListContainer.innerHTML = autok.map((a, i) => `
        <div class="glass-panel group p-6 flex flex-col justify-between fade-in transition-all duration-500 hover:-translate-y-1 hover:bg-white/5" style="animation-delay: ${i * 50}ms">
          <div class="flex justify-between items-start mb-6">
            <div>
              <div class="font-black text-white text-2xl tracking-widest font-mono drop-shadow-sm select-all">${a.rendszam}</div>
              <div class="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">${a.tipus}</div>
            </div>
            <span class="flex items-center gap-1.5 text-[10px] px-3 py-1.5 rounded-full font-black tracking-widest ${a.statusz === 'ELERHETO' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}">
              <div class="w-1.5 h-1.5 rounded-full ${a.statusz === 'ELERHETO' ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}"></div>
              ${a.statusz === 'ELERHETO' ? 'ELÉRHETŐ' : 'FOGLALT'}
            </span>
          </div>
          <div class="grid grid-cols-3 gap-2 theme-input p-4 rounded-2xl text-center mb-6">
            <div class="flex flex-col"><span class="block text-slate-400 text-[9px] font-black mb-1.5 uppercase tracking-wider">ITP</span> <span class="font-mono text-white text-xs font-bold">${formatDateStr(a.itp)}</span></div>
            <div class="flex flex-col"><span class="block text-slate-400 text-[9px] font-black mb-1.5 uppercase tracking-wider">RCA</span> <span class="font-mono text-white text-xs font-bold">${formatDateStr(a.rca)}</span></div>
            <div class="flex flex-col"><span class="block text-slate-400 text-[9px] font-black mb-1.5 uppercase tracking-wider">Utadó</span> <span class="font-mono text-white text-xs font-bold">${formatDateStr(a.rovinieta)}</span></div>
          </div>
          ${currentUser && currentUser.role === 'ADMIN' ? `
          <div class="flex gap-2 pt-4 border-t border-white/10">
            <button onclick="openSzervizModal('${a.rendszam}')" class="glass-btn flex-1 text-white text-xs py-3 rounded-xl font-black flex items-center justify-center gap-1">🛠️ Szerviz</button>
            <button onclick="openEditModal('${a.rendszam}')" class="glass-btn flex-1 text-white text-xs py-3 rounded-xl font-black flex items-center justify-center gap-1">✏️ Módosít</button>
            <button onclick="deleteAutoAction('${a.rendszam}')" class="glass-btn bg-red-500/20 hover:bg-red-500/40 text-red-400 text-xs px-4 py-3 rounded-xl font-black flex items-center justify-center">🗑️</button>
          </div>` : ''}
        </div>`).join('');
    }

    const rendszamSelect = document.getElementById('utRendszam');
    if (rendszamSelect && currentUser.role === 'USER') {
      const elerhetoAutok = autok.filter(a => a.elerhetoAFormDatumon);
      const jelenlegiKivalasztott = rendszamSelect.value;
      let opciok = '<option value="">-- Válassz a szabad autók közül --</option>';
      if (elerhetoAutok.length === 0) opciok = '<option value="">-- Nincs szabad autó erre a napra --</option>';
      else opciok += elerhetoAutok.map(a => `<option value="${a.rendszam}">${a.rendszam} (${a.tipus})</option>`).join('');
      if (rendszamSelect.innerHTML !== opciok) {
        rendszamSelect.innerHTML = opciok;
        if (elerhetoAutok.some(a => a.rendszam === jelenlegiKivalasztott)) rendszamSelect.value = jelenlegiKivalasztott;
      }
    }
  } catch (e) { }
}

window.loadFlottaStatisztika = async function () {
  const container = document.getElementById('flottaRangsor');
  if (!container) return;
  try {
    const res = await fetch('http://localhost:3000/api/admin/statisztika/flotta', { headers: { 'Authorization': `Bearer ${window.AppState.token}` } });
    const stats = await res.json();
    const sortedStats = Object.entries(stats).sort((a, b) => b[1].km - a[1].km);

    if (sortedStats.length === 0) {
      container.innerHTML = `<div class="col-span-full text-center py-6 text-slate-400 text-sm font-bold glass-panel border-2 border-dashed border-white/10 rounded-2xl">Még nincs teljesített fuvar a rendszerben.</div>`;
      return;
    }
    container.innerHTML = sortedStats.map(([rendszam, data], index) => `
      <div class="glass-panel flex flex-col p-4 transition hover:bg-white/5 fade-in" style="animation-delay: ${index * 50}ms">
        <div class="flex justify-between items-center mb-2">
          <span class="font-mono font-black text-blue-400 tracking-widest text-lg">${rendszam}</span>
          <span class="text-xs bg-white/10 text-slate-300 px-2 py-1 rounded-md font-bold uppercase">${data.db} fuvar</span>
        </div>
        <div class="flex items-end gap-1">
          <span class="font-black text-white text-2xl">${data.km.toFixed(1)}</span>
          <span class="text-sm text-slate-400 font-bold mb-1">km</span>
        </div>
      </div>`).join('');
  } catch (e) { console.error(e); }
};

async function loadUtak() {
  const token = window.AppState.token; const currentUser = window.AppState.user; if (!token || !currentUser) return;
  const szuro = document.getElementById('kerelmekSzuro')?.value || '';
  try {
    const utak = await API.fetchUtak(token, currentUser.role === 'ADMIN', szuro);
    if (!Array.isArray(utak)) return;
    if (utak.length === 0) {
      document.getElementById('utList').innerHTML = '<tr><td colspan="7" class="py-8 text-center text-slate-400 text-sm font-bold">Nincs megjeleníthető adat.</td></tr>';
      return;
    }
    document.getElementById('utList').innerHTML = utak.map((u, i) => {
      let gombHTML = '<span class="text-slate-400 font-bold">-</span>';
      if (currentUser.role === 'ADMIN' && u.status === 'BEERKEZO') {
        gombHTML = `
          <div class="flex justify-end gap-2">
            <button onclick="biralUtFizikai(${u.id}, 'JOVAHAGYOTT')" class="glass-btn bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/40 px-3 py-1.5 rounded-lg text-xs font-bold">✔ Jóváhagy</button>
            <button onclick="biralUtFizikai(${u.id}, 'ELUTASITOTT')" class="glass-btn bg-red-500/20 text-red-400 hover:bg-red-500/40 px-3 py-1.5 rounded-lg text-xs font-bold">✖ Elvet</button>
          </div>`;
      } else if (currentUser.role === 'USER' && u.status === 'JOVAHAGYOTT') {
        gombHTML = `<button onclick="openLezarModal(${u.id}, '${u.auto_rendszam}')" class="glass-btn bg-blue-500/20 text-blue-400 hover:bg-blue-500/40 px-4 py-2 rounded-lg text-xs font-bold w-full flex justify-center items-center gap-2">⛽ LEZÁRÁS</button>`;
      }

      let statusStyle = 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      let statusDot = 'bg-amber-400';
      if (u.status === 'JOVAHAGYOTT') { statusStyle = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'; statusDot = 'bg-emerald-400'; }
      if (u.status === 'ELUTASITOTT') { statusStyle = 'bg-red-500/20 text-red-400 border-red-500/30'; statusDot = 'bg-red-400'; }
      if (u.status === 'TELJESITVE') { statusStyle = 'bg-blue-500/20 text-blue-400 border-blue-500/30'; statusDot = 'bg-blue-400'; }

      return `
        <tr class="border-b border-white/5 transition-colors fade-in hover:bg-white/5" style="animation-delay: ${i * 30}ms">
          <td class="py-4 px-4 text-slate-400 font-mono text-xs font-bold">#${u.id}</td>
          <td class="py-4 px-4 text-white font-bold text-sm whitespace-nowrap">${u.honap_ev}</td>
          <td class="py-4 px-4 font-black text-white text-base">${u.sofor_nev}</td>
          <td class="py-4 px-4"><span class="theme-input px-2.5 py-1 rounded-md text-xs font-mono font-bold text-blue-400">${u.auto_rendszam}</span></td>
          <td class="py-4 px-4 text-white text-xs font-medium">
            <div class="flex items-center gap-2 mb-1.5">
               <span class="truncate max-w-[120px]" title="${u.indulas}">${u.indulas.split(',')[0]}</span> 
               <span class="text-blue-400 font-bold">➔</span> 
               <span class="truncate max-w-[120px]" title="${u.erkezes}">${u.erkezes.split(',')[0]}</span>
               <span class="text-emerald-400 font-black ml-2">${u.tavolsag} km</span>
            </div>
            <span class="text-[10px] text-slate-400 font-bold">Költség: ${u.koltseg} RON | Fogy.: ${u.fogyasztas} L</span>
          </td>
          <td class="py-4 px-4 text-center">
             <span class="inline-flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-md font-black tracking-widest border ${statusStyle}">
               <div class="w-1.5 h-1.5 rounded-full ${statusDot}"></div> ${u.status}
             </span>
          </td>
          <td class="py-4 px-4 align-middle">${gombHTML}</td>
        </tr>`;
    }).join('');
  } catch (e) { }
}

window.loadBeerkezoList = async function () {
  const container = document.getElementById('beerkezoList');
  if (!container) return;
  try {
    const res = await fetch('http://localhost:3000/api/admin/beerkezo-fuvarok', { headers: { 'Authorization': `Bearer ${window.AppState.token}` } });
    const fuvarok = await res.json();
    if (!Array.isArray(fuvarok) || fuvarok.length === 0) {
      container.innerHTML = `<div class="text-center py-6 text-slate-400 text-sm font-bold glass-panel border-2 border-dashed border-white/10 rounded-2xl mb-4">✅ Jelenleg nincs engedélyezésre váró fuvarigény.</div>`;
      return;
    }
    container.innerHTML = fuvarok.map(f => `
      <div class="glass-panel p-4 hover:bg-white/5 transition-all mb-3 fade-in flex flex-col md:flex-row justify-between items-center gap-4 border-l-4 border-l-blue-500">
        <div class="w-full md:w-auto text-left">
          <p class="text-white text-sm font-bold flex items-center gap-2">
            <span class="text-blue-400 text-lg">📩</span> Új fuvarigény: <span class="font-mono text-blue-400 tracking-widest">${f.auto_rendszam}</span>
          </p>
          <p class="text-xs text-slate-400 mt-1 md:ml-7">
            Sofőr: <span class="font-bold text-white">${f.sofor_nev}</span> | ${f.indulas.split(',')[0]} ➔ ${f.erkezes.split(',')[0]} (${f.tavolsag} km)
          </p>
        </div>
        <div class="flex gap-2 w-full md:w-auto">
           <button onclick="biralUtFizikai(${f.id}, 'JOVAHAGYOTT')" class="glass-btn flex-1 md:flex-none bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/40 px-5 py-2.5 rounded-lg text-xs font-black">JÓVÁHAGYÁS</button>
           <button onclick="biralUtFizikai(${f.id}, 'ELUTASITOTT')" class="glass-btn flex-1 md:flex-none bg-red-500/20 text-red-400 hover:bg-red-500/40 px-5 py-2.5 rounded-lg text-xs font-black">ELVETÉS</button>
        </div>
      </div>`).join('');
  } catch (e) { console.error(e); }
};

window.downloadAdvancedJelentes = function (event) {
  const e = event || window.event; let btn = e ? e.currentTarget : null; let originalText = "📥 CSV Letöltése";
  if (btn) { originalText = btn.innerHTML; btn.innerHTML = "⏳ Generálás..."; btn.disabled = true; btn.classList.add('opacity-70', 'cursor-not-allowed'); }
  const type = document.getElementById('periodusTipus').value;
  const start = document.getElementById('dateStart').value; const end = document.getElementById('dateEnd').value;
  const resetBtn = () => { if (btn) { btn.innerHTML = originalText; btn.disabled = false; btn.classList.remove('opacity-70', 'cursor-not-allowed'); } };

  if (type !== 'ev' && !start) { alert("Kérlek válassz egy induló dátumot!"); resetBtn(); return; }
  if (type === 'intervallum' && !end) { alert("Kérlek válassz egy végdátumot is!"); resetBtn(); return; }

  let periodus = start;
  if (type === 'honap') periodus = start.substring(0, 7);
  if (type === 'ev') periodus = start ? start.substring(0, 4) : new Date().getFullYear().toString();
  if (type === 'intervallum') periodus = `${start}_${end}`;

  window.location.href = `http://localhost:3000/api/admin/jelentes/${periodus}?token=${window.AppState.token}`;
  setTimeout(resetBtn, 2000);
};

function toggleDateInputs() { document.getElementById('dateEnd').classList.toggle('hidden', document.getElementById('periodusTipus').value !== 'intervallum'); }

window.loadSzervizRiasztasok = async function () {
  const container = document.getElementById('szervizRiasztasok'); if (!container) return;
  try {
    const res = await fetch('http://localhost:3000/api/admin/szerviz-figyelmeztetesek', { headers: { 'Authorization': `Bearer ${window.AppState.token}` } });
    const list = await res.json();
    if (!Array.isArray(list) || list.length === 0) {
      container.innerHTML = '<div class="text-sm p-4 text-center text-slate-400 font-bold glass-panel border-2 border-dashed border-white/10 rounded-xl">Minden jármű szervize rendben van.</div>'; return;
    }
    container.innerHTML = list.map(r => `
      <div class="glass-panel flex justify-between text-sm p-3 bg-amber-500/10 border-amber-500/20 mb-2">
        <span class="font-black text-amber-400">${r.rendszam}</span>
        <span class="text-amber-200">${r.hatralevo} km maradt</span>
      </div>`).join('');
  } catch (e) { container.innerHTML = '<div class="text-sm p-3 text-red-500">Hiba az adatok betöltésekor.</div>'; }
};

window.loadSoforRangsor = async function () {
  const container = document.getElementById('soforRangsor'); if (!container) return;
  try {
    const res = await fetch('http://localhost:3000/api/admin/statisztika/soforok', { headers: { 'Authorization': `Bearer ${window.AppState.token}` } });
    const list = await res.json();
    if (!Array.isArray(list) || list.length === 0) {
      container.innerHTML = '<div class="text-sm p-4 text-center text-slate-400 font-bold glass-panel border-2 border-dashed border-white/10 rounded-xl">Nincs elegendő adat a rangsorhoz.</div>'; return;
    }
    container.innerHTML = list.map((s, i) => `
      <div class="glass-panel flex justify-between items-center p-3 mb-2 hover:bg-white/5 transition">
        <span class="font-bold text-white">${i + 1}. ${s.nev}</span>
        <span class="font-black text-emerald-400 text-lg">${s.atlagFogy} <span class="text-xs font-bold text-emerald-400/70">L/100km</span></span>
      </div>`).join('');
  } catch (e) { container.innerHTML = '<div class="text-sm p-3 text-red-500">Hiba a betöltéskor.</div>'; }
};

document.addEventListener('click', (e) => {
  if (!e.target.closest('.relative')) {
    document.getElementById('indulasList')?.classList.add('hidden');
    document.getElementById('erkezesList')?.classList.add('hidden');
  }
});