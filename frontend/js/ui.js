import { t, translateDynamic, initLanguageSwitcher } from './i18n.js';

let startCoords = { lat: 0, lon: 0 };
let endCoords = { lat: 0, lon: 0 };
let debounceTimer = null;
window.currentFlotta = [];
let costChartInstance = null;

window.currentRiasztasok = [];
window.currentBeerkezok = [];
window.currentAktivFlotta = [];
window.currentRangsor = [];

const socket = (typeof io !== 'undefined') ? io('http://localhost:3000') : null;

// ==========================================
// ÚJ ÉRTESÍTÉSI MENÜ LOGIKA (CSENGŐ)
// ==========================================
window.toggleUnclosedDropdown = function (event) {
  event.stopPropagation();
  const dropdown = document.getElementById('unclosedDropdown');
  if (dropdown) {
    dropdown.classList.toggle('hidden');
  }
};

document.addEventListener('click', (e) => {
  // Bezárja a csengő menüjét, ha mellékattintanak
  if (!e.target.closest('#fuvarJelzoIkon')) {
    document.getElementById('unclosedDropdown')?.classList.add('hidden');
  }

  // Eredeti dropdown logikák
  if (!e.target.closest('.relative')) {
    document.getElementById('indulasList')?.classList.add('hidden');
    document.getElementById('erkezesList')?.classList.add('hidden');
  }
  if (!e.target.closest('#adminAddMenu') && !e.target.closest('#adminHistoryMenu') && !e.target.closest('#adminManageMenu')) {
    if (typeof closeAllDropdowns === 'function') closeAllDropdowns();
  }
});

// ==========================================
// CSENGŐ LÁTHATÓSÁGÁT VEZÉRLŐ KÖZPONTI FÜGGVÉNY
// ==========================================
window.updateBellVisibility = function () {
  const bell = document.getElementById('fuvarJelzoIkon');
  if (!bell) return;

  // Szekciók lekérése a DOM-ból
  const loginSection = document.getElementById('loginSection');
  const adminSection = document.getElementById('adminSection');
  const kliensSection = document.getElementById('kliensSection');

  // Ellenőrizzük, hogy éppen melyik nézet látható a képernyőn
  const isLoginVisible = loginSection && !loginSection.classList.contains('hidden');
  const isAdminVisible = adminSection && !adminSection.classList.contains('hidden');
  const isKliensVisible = kliensSection && !kliensSection.classList.contains('hidden');

  const user = window.AppState?.user;
  const role = (user?.role || '').toUpperCase();

  // CSAK AKKOR jelenhet meg, ha a Kliens szekció aktív, NEM admin, és NEM a login oldalon vagyunk
  if (isKliensVisible && !isAdminVisible && !isLoginVisible && role !== 'ADMIN') {
    if (bell.parentElement !== document.body) {
      document.body.appendChild(bell);
    }
    bell.style.setProperty('display', 'flex', 'important');
    bell.style.setProperty('visibility', 'visible', 'important');
    bell.style.setProperty('opacity', '1', 'important');
    bell.style.setProperty('position', 'fixed', 'important');
    bell.style.setProperty('bottom', '1.5rem', 'important');
    bell.style.setProperty('right', '1.5rem', 'important');
    bell.style.setProperty('z-index', '99999', 'important');
    bell.classList.remove('hidden');
  } else {
    // Bármilyen más esetben (bejelentkezés, admin, vagy rejtett kliens oldal) kíméletlenül eltüntetjük
    bell.style.setProperty('display', 'none', 'important');
    bell.classList.add('hidden');
  }
};

window.showNotification = function (msg) {
  const container = document.getElementById('alertContainer');
  if (!container) return;
  const note = document.createElement('div');
  note.className = "bg-white/5 border border-white/10 border-l-4 border-l-blue-500 p-4 rounded-xl shadow-sm fade-in font-bold flex items-center gap-3 transition-opacity duration-300 mb-3 text-white";
  note.innerHTML = `<span class="text-2xl">🔔</span> <span>${translateDynamic(msg)}</span>`;
  container.prepend(note);
  setTimeout(() => { note.style.opacity = '0'; setTimeout(() => note.remove(), 300); }, 5000);
};

window.showToast = function (uzenet, tipus = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  let bgClass = 'bg-blue-500/90 border-blue-400/50';
  let icon = 'ℹ️';

  if (tipus === 'siker') { bgClass = 'bg-emerald-500/90 border-emerald-400/50'; icon = '✅'; }
  else if (tipus === 'hiba') { bgClass = 'bg-red-500/90 border-red-400/50'; icon = '❌'; }
  else if (tipus === 'figyelmeztetes') { bgClass = 'bg-amber-500/90 border-amber-400/50'; icon = '⚠️'; }

  toast.className = `${bgClass} text-white px-5 py-4 rounded-2xl shadow-2xl font-bold text-sm transform transition-all duration-300 translate-y-10 opacity-0 pointer-events-auto flex items-center gap-3 border backdrop-blur-md z-[9999]`;
  toast.innerHTML = `<span class="text-lg">${icon}</span> <span>${translateDynamic(uzenet)}</span>`;

  container.appendChild(toast);
  setTimeout(() => toast.classList.remove('translate-y-10', 'opacity-0'), 10);
  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-5');
    setTimeout(() => toast.remove(), 300);
  }, 10000);
};

let frissitesIdozito;
if (socket) {
  socket.on('adat_frissites', () => {
    clearTimeout(frissitesIdozito);
    frissitesIdozito = setTimeout(() => {
      if (window.AppState && window.AppState.user && window.AppState.user.role === 'ADMIN') {
        if (typeof window.loadRiasztasok === 'function') window.loadRiasztasok();
        if (typeof loadBeerkezoList === 'function') loadBeerkezoList();
        if (typeof showToast === 'function') showToast(t('data_synced'), "figyelmeztetes");
        if (typeof loadAuditLog === 'function') loadAuditLog();
        if (typeof loadAktivFlotta === 'function') loadAktivFlotta();
        if (typeof renderDashboard === 'function') renderDashboard();
        if (typeof loadFlottaStatisztika === 'function') loadFlottaStatisztika();
      }
      if (window.AppState && window.AppState.token) {
        if (typeof loadAutok === 'function') loadAutok();
        if (typeof loadUtak === 'function') loadUtak();
        if (typeof loadKliensElozmenyek === 'function') loadKliensElozmenyek();
      }
    }, 200);
  });
}

window.toggleMobileMenu = function () {
  const menu = document.getElementById('mobileMenu');
  if (menu.classList.contains('hidden')) {
    menu.classList.remove('hidden');
    let menuHtml = `<button onclick="toggleMobileMenu()" class="absolute top-6 right-6 text-white p-3 bg-white/10 hover:bg-white/20 rounded-full transition z-50">❌</button>`;
    menuHtml += `<button onclick="toggleTheme(); toggleMobileMenu()" class="text-white text-lg font-bold bg-white/10 border border-white/20 px-6 py-3 rounded-xl w-[85%] max-w-sm mt-4 shrink-0">🌓 ${t('nav_theme')}</button>`;

    if (window.AppState?.user?.role === 'ADMIN') {
      menuHtml += `
        <div class="w-[85%] max-w-sm flex flex-col gap-2 mt-4 pb-10">
          <div class="text-emerald-400 font-black text-xs uppercase tracking-widest mb-1">${t('nav_add')}</div>
          <button onclick="openModalWithAnim('addAutoModal'); toggleMobileMenu()" class="text-white text-left px-5 py-3.5 font-bold bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition w-full">🚗 ${t('nav_add_car')}</button>
          <button onclick="openModalWithAnim('addUserModal'); toggleMobileMenu()" class="text-white text-left px-5 py-3.5 font-bold bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition w-full">👤 ${t('nav_add_staff')}</button>

          <div class="text-amber-400 font-black text-xs uppercase tracking-widest mt-4 mb-1">${t('nav_manage')}</div>
          <button onclick="openModalWithAnim('manageFleetModal'); toggleMobileMenu()" class="text-white text-left px-5 py-3.5 font-bold bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition w-full">🚘 ${t('nav_manage_car')}</button>
          <button onclick="openModalWithAnim('manageStaffModal'); loadSzemelyzet(); toggleMobileMenu()" class="text-white text-left px-5 py-3.5 font-bold bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition w-full">👥 ${t('nav_manage_staff')}</button>

          <div class="text-blue-400 font-black text-xs uppercase tracking-widest mt-4 mb-1">${t('nav_history')}</div>
          <button onclick="openModalWithAnim('historyModal'); toggleMobileMenu()" class="text-white text-left px-5 py-3.5 font-bold bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition w-full">📋 ${t('nav_trip_history')}</button>
          <button onclick="openModalWithAnim('allSzervizHistoryModal'); loadAllSzervizHistory(); toggleMobileMenu()" class="text-white text-left px-5 py-3.5 font-bold bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition w-full">🛠️ ${t('nav_service')}</button>
          <button onclick="openModalWithAnim('auditModal'); toggleMobileMenu()" class="text-white text-left px-5 py-3.5 font-bold bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition w-full">📝 ${t('nav_audit')}</button>
        </div>`;
    } else {
      menuHtml += `<button onclick="openModalWithAnim('kliensHistoryModal'); toggleMobileMenu()" class="text-emerald-400 text-xl font-bold bg-emerald-500/10 border border-emerald-500/20 px-8 py-4 rounded-xl w-[85%] max-w-sm mt-2">📋 ${t('nav_my_history')}</button>`;
    }

    menuHtml += `<button onclick="if(typeof logout === 'function') logout(); toggleMobileMenu();" class="text-red-400 text-lg font-bold bg-red-500/10 border border-red-500/20 px-8 py-4 rounded-xl w-[85%] max-w-sm mt-auto mb-6 shrink-0">${t('nav_logout')}</button>`;
    menu.innerHTML = menuHtml;
  } else {
    menu.classList.add('hidden');
  }
};

window.initScrollReveal = function () {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add('active');
      else entry.target.classList.remove('active');
    });
  }, { threshold: 0.05, rootMargin: "0px 0px -20px 0px" });

  document.querySelectorAll('.glass-panel, tbody tr, form').forEach(el => {
    if (!el.classList.contains('reveal')) el.classList.add('reveal');
    observer.observe(el);
  });
};

window.toggleTheme = function () {
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

// A csengő áthelyezése és a nyelvválasztó inicializálása betöltéskor
document.addEventListener('DOMContentLoaded', () => {
  const bell = document.getElementById('fuvarJelzoIkon');
  if (bell && document.body) {
    document.body.appendChild(bell);
  }
  
  // Itt hívjuk meg a nyelvválasztó inicializálását, hogy az 1 gombos fordítás újra működjön
  if (typeof initLanguageSwitcher === 'function') {
    initLanguageSwitcher();
  }
});

window.toggleDropdown = function (dropdownId, event) {
  if (event) event.stopPropagation();
  const dropdown = document.getElementById(dropdownId);
  const isHidden = dropdown.classList.contains('hidden');
  closeAllDropdowns();
  if (isHidden) {
    dropdown.classList.remove('hidden');
    dropdown.classList.add('fade-in');
  }
};

window.closeAllDropdowns = function () {
  ['addDropdownContent', 'historyDropdownContent', 'manageDropdownContent'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });
};

window.closeModal = function (modalId) { document.getElementById(modalId).classList.add('hidden'); };
window.openModalWithAnim = function (modalId) {
  const modal = document.getElementById(modalId);
  modal.classList.remove('hidden');
  const card = modal.querySelector('.glass-panel');
  if (card) card.classList.add('fade-in');
};

window.toggleModalWithAnim = function (modalId) {
  const modal = document.getElementById(modalId);
  if (modal.classList.contains('hidden')) {
    openModalWithAnim(modalId);
  } else {
    closeModal(modalId);
  }
};

window.openEditModal = function (rendszam) {
  const auto = window.currentFlotta.find(a => a.rendszam === rendszam);
  if (!auto) return;
  document.getElementById('editRendszam').value = auto.rendszam;
  document.getElementById('editTipus').value = auto.tipus;
  document.getElementById('editStatusz').value = auto.statusz;
  document.getElementById('editItp').value = auto.itp ? auto.itp.split('T')[0] : '';
  document.getElementById('editRca').value = auto.rca ? auto.rca.split('T')[0] : '';
  document.getElementById('editRovinieta').value = auto.rovinieta ? auto.rovinieta.split('T')[0] : '';
  openModalWithAnim('editAutoModal');
};
window.closeEditModal = function () { closeModal('editAutoModal'); };

window.openSzervizModal = async function (rendszam) {
  document.getElementById('szervizModalTitle').innerHTML = `🛠️ <span class="text-blue-400 font-mono tracking-widest">${rendszam}</span> ${t('service')}`;
  document.getElementById('szervizAutoRendszam').value = rendszam;
  const lista = document.getElementById('szervizLista');
  lista.innerHTML = `<div class="text-center text-slate-400 py-8 font-bold animate-pulse">${t('loading_data')}</div>`;
  openModalWithAnim('szervizModal');
  try {
    const szervizek = await API.fetchSzerviz(window.AppState.token, rendszam);
    if (!Array.isArray(szervizek) || szervizek.length === 0) {
      lista.innerHTML = `<div class="text-center text-slate-400 text-sm py-8 font-bold">${t('no_service_record')}</div>`;
    } else {
      lista.innerHTML = szervizek.map(sz => `
        <div class="glass-panel p-5 transition hover:bg-white/5 mb-3">
          <div class="flex justify-between items-center mb-3">
            <span class="font-black text-blue-400 text-sm">🗓️ ${sz.datum.split('T')[0]}</span>
            <span class="text-xs bg-black/30 px-3 py-1 rounded-lg text-slate-300 border border-white/10 font-mono font-bold">${sz.kilometer} km</span>
          </div>
          <div class="text-sm text-slate-300 mt-1 leading-relaxed">${translateDynamic(sz.leiras)}</div>
        </div>`).join('');
    }
  } catch (e) { lista.innerHTML = `<div class="text-red-400 text-sm py-8 font-bold text-center">${t('error_occurred')}</div>`; }
};
window.closeSzervizModal = function () { closeModal('szervizModal'); };

window.openLezarModal = function (id, rendszam) {
  document.getElementById('lezarUtId').value = id;
  document.getElementById('lezarModalTitle').innerHTML = `⛽ ${t('close_trip')}: <span class="text-emerald-400 font-mono">#${id}</span> (${rendszam})`;
  openModalWithAnim('lezarModal');
};
window.closeLezarModal = function () { closeModal('lezarModal'); };

window.submitLezarUt = async function (event) {
  event.preventDefault();
  const id = document.getElementById('lezarUtId').value;
  const koltseg = document.getElementById('lezarKoltseg').value;
  const fogyasztas = document.getElementById('lezarFogyasztas').value;
  const aktualisKm = document.getElementById('lezarKm').value;

  try {
    const res = await fetch(`http://localhost:3000/api/utak/${id}/lezar`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${window.AppState.token}`
      },
      body: JSON.stringify({
        koltseg: parseFloat(koltseg),
        fogyasztas: parseFloat(fogyasztas),
        aktualis_km: parseInt(aktualisKm)
      })
    });

    if (!res.ok) {
      const err = await res.json();
      alert(translateDynamic(err.hiba) || t('error_occurred'));
      return;
    }

    if (typeof showToast === 'function') showToast(t('trip_closed_success'), 'siker');
    closeModal('lezarModal');

    const titleText = document.getElementById('lezarModalTitle').innerText;
    const rendszamMatch = titleText.match(/\(([^)]+)\)/);
    if (rendszamMatch && rendszamMatch[1]) {
      const rendszam = rendszamMatch[1];
      document.querySelectorAll(`.km-badge-${rendszam}`).forEach(badge => {
        badge.innerHTML = `🛣️ ${parseInt(aktualisKm)} km`;
      });
    }

    if (typeof loadUtak === 'function') loadUtak();
    if (typeof loadAutok === 'function') loadAutok();
    if (typeof loadKliensElozmenyek === 'function') loadKliensElozmenyek();

  } catch (e) {
    alert(t('error_occurred'));
  }
};

window.renderUI = async function () {
  const token = window.AppState?.token;
  const currentUser = window.AppState?.user;

  if (!token || !currentUser) {
    document.getElementById('loginSection').classList.remove('hidden');
    document.getElementById('adminSection').classList.add('hidden');
    document.getElementById('kliensSection').classList.add('hidden');
    document.getElementById('userInfo').classList.add('hidden');

    window.updateBellVisibility();
    return;
  }

  document.getElementById('loginSection').classList.add('hidden');
  document.getElementById('userInfo').classList.remove('hidden');
  document.getElementById('welcomeText').textContent = t('welcome_user').replace('{x}', currentUser.username);

  const badge = document.getElementById('roleBadge');
  const role = (currentUser.role || '').toUpperCase();
  const isAdmin = role === 'ADMIN';

  badge.textContent = t(isAdmin ? 'role_admin' : 'role_user');
  badge.className = isAdmin
    ? "px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest bg-amber-500/20 text-amber-500 border border-amber-500/30 mt-1"
    : "px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest bg-blue-500/20 text-blue-400 border border-blue-500/30 mt-1";

  if (isAdmin) {
    document.body.classList.add('admin-mode');
    document.body.classList.remove('driver-mode');

    document.getElementById('adminSection').classList.remove('hidden');
    document.getElementById('adminSection').classList.add('fade-in');
    document.getElementById('kliensSection').classList.add('hidden');

    if (document.getElementById('adminAddMenu')) document.getElementById('adminAddMenu').classList.remove('hidden');
    if (document.getElementById('adminHistoryMenu')) document.getElementById('adminHistoryMenu').classList.remove('hidden');
    if (document.getElementById('adminManageMenu')) document.getElementById('adminManageMenu').classList.remove('hidden');

    if (typeof window.loadRiasztasok === 'function') window.loadRiasztasok();
    if (typeof loadAktivFlotta === 'function') loadAktivFlotta();
    if (typeof renderDashboard === 'function') renderDashboard();
    if (typeof loadAuditLog === 'function') loadAuditLog();
    if (typeof loadBeerkezoList === 'function') loadBeerkezoList();
    if (typeof loadFlottaStatisztika === 'function') loadFlottaStatisztika();
  } else {
    document.body.classList.remove('admin-mode');
    document.body.classList.add('driver-mode');

    document.getElementById('adminSection').classList.add('hidden');
    document.getElementById('kliensSection').classList.remove('hidden');
    document.getElementById('kliensSection').classList.add('fade-in');

    if (document.getElementById('adminAddMenu')) document.getElementById('adminAddMenu').classList.add('hidden');
    if (document.getElementById('adminHistoryMenu')) document.getElementById('adminHistoryMenu').classList.add('hidden');
    if (document.getElementById('adminManageMenu')) document.getElementById('adminManageMenu').classList.add('hidden');

    if (document.getElementById('userHistoryBtn')) document.getElementById('userHistoryBtn').classList.remove('hidden');
  }

  // Itt hívjuk meg közvetlenül a láthatóság beállítását
  window.updateBellVisibility();

  resetDistanceField(true, true);
  const datumInput = document.getElementById('utDatum');
  if (datumInput && !datumInput.value) datumInput.value = new Date().toISOString().split('T')[0];

  if (typeof loadAutok === 'function') loadAutok();
  if (typeof loadUtak === 'function') loadUtak();
  if (typeof loadKliensElozmenyek === 'function') loadKliensElozmenyek();
};

window.reRenderDynamicLanguage = function () {
  if (!window.AppState || !window.AppState.token) return;

  renderUI();

  if (document.getElementById('manageStaffModal') && !document.getElementById('manageStaffModal').classList.contains('hidden')) loadSzemelyzet();
  if (document.getElementById('allSzervizHistoryModal') && !document.getElementById('allSzervizHistoryModal').classList.contains('hidden')) loadAllSzervizHistory();
  if (document.getElementById('allFlottaModal') && !document.getElementById('allFlottaModal').classList.contains('hidden')) openAllFlottaModal();
  if (document.getElementById('allRangsorModal') && !document.getElementById('allRangsorModal').classList.contains('hidden')) openAllRangsorModal();
  if (document.getElementById('allAlertsModal') && !document.getElementById('allAlertsModal').classList.contains('hidden')) openAllAlertsModal();
  if (document.getElementById('allRequestsModal') && !document.getElementById('allRequestsModal').classList.contains('hidden')) openAllRequestsModal();
  if (document.getElementById('historyModal') && !document.getElementById('historyModal').classList.contains('hidden')) loadUtak();
  if (document.getElementById('auditModal') && !document.getElementById('auditModal').classList.contains('hidden')) loadAuditLog();

  const mobileMenu = document.getElementById('mobileMenu');
  if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
    mobileMenu.classList.add('hidden');
    toggleMobileMenu();
  }
};

window.resetDistanceField = function (resetStart = true, resetEnd = true) {
  if (resetStart) startCoords = { lat: 0, lon: 0 };
  if (resetEnd) endCoords = { lat: 0, lon: 0 };
  const tavInput = document.getElementById('utTav');
  if (tavInput) { tavInput.value = ''; tavInput.classList.remove('border-emerald-500', 'text-emerald-400'); }
};

window.searchOSM = function (inputEl, dropdownId) {
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
        dropdown.innerHTML = `<div class="p-5 text-sm text-slate-400 text-center font-bold">${t('no_map_result')}</div>`;
        return dropdown.classList.remove('hidden');
      }
      dropdown.innerHTML = results.map(item => `
        <div onclick="selectLocation('${inputEl.id}', '${dropdownId}', '${item.display_name.split(',').slice(0, 3).join(', ').trim().replace(/'/g, "\\'")}', ${item.lat}, ${item.lon})" class="p-4 dropdown-item cursor-pointer flex items-center gap-3 transition">
          <span class="text-blue-400 text-xl">📍</span>
          <div><div class="text-xs font-bold text-white leading-tight">${item.display_name.split(',').slice(0, 3).join(', ').trim()}</div></div>
        </div>`).join('');
      dropdown.classList.remove('hidden');
    } catch (err) { }
  }, 600);
};

window.selectLocation = async function (inputId, dropdownId, locationName, lat, lon) {
  document.getElementById(inputId).value = locationName;
  document.getElementById(dropdownId).classList.add('hidden');
  if (inputId === 'utIndulas') startCoords = { lat, lon };
  if (inputId === 'utErkezes') endCoords = { lat, lon };

  if (startCoords.lat !== 0 && endCoords.lat !== 0) {
    const tavInput = document.getElementById('utTav');
    tavInput.value = t('planning_in_progress');
    try {
      const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${startCoords.lon},${startCoords.lat};${endCoords.lon},${endCoords.lat}?overview=false`);
      const data = await res.json();
      if (data.routes && data.routes[0]) {
        tavInput.value = (data.routes[0].distance / 1000).toFixed(1) + ' km';
        tavInput.classList.add('border-emerald-500', 'text-emerald-400');
      }
    } catch (e) { tavInput.value = t('planning_error'); }
  }
};

function formatDateStr(isoStr) { return isoStr ? isoStr.split('T')[0] : t('no_data'); }

window.generateAktivFlottaHtml = function (u) {
  return `
    <div class="bg-white/5 border border-white/10 p-4 rounded-[20px] flex flex-col gap-3 hover:bg-white/10 transition-all mb-2 shrink-0">
      <div class="flex justify-between items-start">
        <div class="font-black text-white flex items-center gap-2">🚘 <span class="font-mono text-blue-400 text-sm tracking-widest">${u.auto_rendszam}</span></div>
        <span class="flex items-center gap-1 text-[9px] bg-blue-500/20 text-blue-400 border border-blue-500/50 px-2 py-1 rounded-md tracking-widest font-black uppercase">
          <div class="w-1 h-1 rounded-full bg-blue-400 animate-pulse"></div> ${t('on_road')}
        </span>
      </div>
      <div class="text-[11px] text-slate-400 font-bold">👤 ${t('driver')}: <span class="text-white">${u.sofor_nev}</span></div>
      <div class="bg-black/20 p-2.5 rounded-xl border border-white/5 text-[10px] text-slate-300 flex flex-col gap-1 font-medium">
        <span class="truncate" title="${u.indulas}">${u.indulas.split(',')[0]}</span> 
        <span class="text-blue-400 text-center leading-none">⬇</span> 
        <span class="truncate text-right" title="${u.erkezes}">${u.erkezes.split(',')[0]}</span>
      </div>
    </div>`;
};

window.openAllFlottaModal = function () {
  const modalList = document.getElementById('allFlottaList');
  if (modalList) {
    modalList.innerHTML = window.currentAktivFlotta.map(u => window.generateAktivFlottaHtml(u)).join('');
  }
  openModalWithAnim('allFlottaModal');
};

window.loadAktivFlotta = async function () {
  const token = window.AppState.token; if (!token || window.AppState.user.role !== 'ADMIN') return;
  const container = document.getElementById('aktivFlottaList');
  if (!container) return;
  try {
    const aktivUtak = await API.fetchAktivFlotta(token);
    window.currentAktivFlotta = aktivUtak;

    const modalList = document.getElementById('allFlottaModal');
    if (modalList && !document.getElementById('allFlottaModal').classList.contains('hidden')) {
      modalList.innerHTML = aktivUtak.map(u => window.generateAktivFlottaHtml(u)).join('');
    }

    if (!Array.isArray(aktivUtak) || aktivUtak.length === 0) {
      container.innerHTML = `
        <div class="h-full flex items-center justify-center border border-dashed border-slate-500/40 rounded-[20px] p-4">
          <span class="text-[11px] font-black text-slate-400 uppercase tracking-widest">${t('no_car_on_road')}</span>
        </div>`;
      initScrollReveal();
      return;
    }

    const MAX_ITEMS = 2;
    let html = '';
    const toShow = aktivUtak.slice(0, MAX_ITEMS);

    html += toShow.map(u => `
      <div class="glass-panel p-3 text-xs flex justify-between items-center transition hover:bg-white/5">
        <span class="font-mono font-bold text-blue-400">${u.auto_rendszam}</span>
        <span class="text-[10px] bg-blue-500/20 px-2 py-0.5 rounded text-blue-400 font-bold tracking-wider">${t('on_road')}</span>
      </div>`).join('');

    if (aktivUtak.length > MAX_ITEMS) {
      const extraCount = aktivUtak.length - MAX_ITEMS;
      html += `<button onclick="openAllFlottaModal()" class="w-full py-2 mt-1 shrink-0 text-[11px] font-bold text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 rounded-xl transition border border-blue-500/20">${t('more_vehicles').replace('{x}', extraCount)}</button>`;
    }
    container.innerHTML = html;
    initScrollReveal();
  } catch (e) { }
};

window.generateRangsorHtml = function (rendszam, data) {
  return `
    <div class="bg-white/5 border border-white/10 rounded-[16px] flex flex-col p-3 transition hover:bg-white/10 mb-2 shrink-0">
      <div class="flex justify-between items-center mb-1">
        <span class="font-mono font-black text-emerald-400 tracking-widest text-sm">${rendszam}</span>
        <span class="text-[9px] bg-white/10 text-slate-300 px-2 py-1 rounded-md font-bold uppercase">${data.db} ${t('trips_count')}</span>
      </div>
      <div class="flex items-end gap-1">
        <span class="font-black text-white text-lg">${data.km.toFixed(1)}</span>
        <span class="text-[10px] text-slate-400 font-bold mb-0.5">km</span>
      </div>
    </div>`;
};

window.openAllRangsorModal = function () {
  const modalList = document.getElementById('allRangsorList');
  if (modalList) {
    modalList.innerHTML = window.currentRangsor.map(([rendszam, data]) => window.generateRangsorHtml(rendszam, data)).join('');
  }
  openModalWithAnim('allRangsorModal');
};

window.loadFlottaStatisztika = async function () {
  const container = document.getElementById('flottaRangsor');
  if (!container) return;
  try {
    const res = await fetch('http://localhost:3000/api/admin/statisztika/flotta', { headers: { 'Authorization': `Bearer ${window.AppState.token}` } });
    const stats = await res.json();
    const sortedStats = Object.entries(stats).sort((a, b) => b[1].km - a[1].km);
    window.currentRangsor = sortedStats;

    const modalList = document.getElementById('allRangsorList');
    if (modalList && !document.getElementById('allRangsorModal').classList.contains('hidden')) {
      modalList.innerHTML = sortedStats.map(([rendszam, data]) => window.generateRangsorHtml(rendszam, data)).join('');
    }

    if (sortedStats.length === 0) {
      container.innerHTML = `<div class="text-center py-4 text-slate-400 text-xs font-bold glass-panel border border-dashed border-white/10 rounded-2xl">${t('no_data_yet')}</div>`;
      return;
    }

    const MAX_ITEMS = 3;
    let html = '';
    const toShow = sortedStats.slice(0, MAX_ITEMS);

    html += toShow.map(([rendszam, data]) => `
      <div class="glass-panel p-3 text-xs flex justify-between items-center transition hover:bg-white/5">
        <span class="font-mono font-bold text-emerald-400">${rendszam}</span>
        <span class="font-bold text-white">${data.km.toFixed(0)} km</span>
      </div>`).join('');

    if (sortedStats.length > MAX_ITEMS) {
      const extraCount = sortedStats.length - MAX_ITEMS;
      html += `<button onclick="openAllRangsorModal()" class="w-full py-2 mt-1 shrink-0 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-xl transition border border-emerald-500/20">${t('more_cars').replace('{x}', extraCount)}</button>`;
    }

    container.innerHTML = html;
  } catch (e) { console.error(e); }
};

window.generateAlertHtml = function (r) {
  const trAlert = translateDynamic(r);
  const isWarning = trAlert.includes('⚠️');
  return `<div class="bg-white/5 border border-white/10 py-2.5 px-4 rounded-xl reveal active border-l-4 ${isWarning ? 'border-l-amber-500 bg-amber-500/10' : 'border-l-red-500 bg-red-500/10'} flex gap-3 items-start shadow-sm shrink-0">
            <span class="text-lg leading-none mt-0.5">${isWarning ? '⚠️' : '🚨'}</span> 
            <span class="text-[13px] font-black leading-snug text-white">${trAlert.replace('⚠️ ', '').replace('🚨 ', '')}</span>
          </div>`;
};

window.openAllAlertsModal = function () {
  const modalList = document.getElementById('allAlertsList');
  if (modalList) {
    modalList.innerHTML = window.currentRiasztasok.map(r => generateAlertHtml(r)).join('');
  }
  openModalWithAnim('allAlertsModal');
};

window.loadRiasztasok = async function () {
  const token = window.AppState.token;
  if (!token || window.AppState.user.role !== 'ADMIN') return;
  const container = document.getElementById('alertContainer');
  if (!container) return;
  try {
    let riasztasok = await API.fetchAlerts(token);

    riasztasok.sort((a, b) => {
      const aCrit = a.includes('🚨');
      const bCrit = b.includes('🚨');
      if (aCrit && !bCrit) return -1;
      if (!aCrit && bCrit) return 1;
      return 0;
    });

    window.currentRiasztasok = riasztasok;

    const modalList = document.getElementById('allAlertsList');
    if (modalList && !document.getElementById('allAlertsModal').classList.contains('hidden')) {
      modalList.innerHTML = riasztasok.map(r => generateAlertHtml(r)).join('');
    }

    if (Array.isArray(riasztasok) && riasztasok.length > 0) {
      const MAX_ITEMS = 3;
      let html = '';
      const toShow = riasztasok.slice(0, MAX_ITEMS);
      html += toShow.map(r => generateAlertHtml(r)).join('');

      if (riasztasok.length > MAX_ITEMS) {
        const extraCount = riasztasok.length - MAX_ITEMS;
        html += `<button onclick="openAllAlertsModal()" class="w-full py-2 mt-2 shrink-0 text-xs font-bold text-amber-500 bg-amber-500/10 hover:bg-amber-500/20 rounded-xl transition border border-amber-500/20">${t('more_alerts').replace('{x}', extraCount)}</button>`;
      }
      container.innerHTML = html;
    } else {
      container.innerHTML = `<div class="text-center py-6 text-emerald-400 text-xs font-bold glass-panel border border-dashed border-white/10 rounded-2xl">${t('no_active_alerts')}</div>`;
    }
  } catch (e) { console.error(e); }
};

window.generateRequestHtml = function (f) {
  const autoTipus = f.auto ? f.auto.tipus : 'Ismeretlen';
  return `<div class="req-card p-3.5 rounded-xl transition-all duration-300 flex flex-col justify-between h-full shadow-sm">
            <div>
              <div class="flex justify-between items-center mb-2">
                <p class="req-title text-[13px] font-black flex items-center gap-1.5">
                  <span class="text-blue-500 text-base drop-shadow-sm">📩</span> 
                  <span class="font-mono tracking-widest">${f.auto_rendszam}</span>
                  <span class="req-sub text-[10px] uppercase font-bold tracking-widest ml-1.5">${autoTipus}</span>
                </p>
              </div>
              
              <p class="text-xs leading-relaxed font-bold mb-3.5">
                <span class="req-title text-sm block mb-1">${f.sofor_nev}</span>
                <span class="req-sub">${f.indulas.split(',')[0]} ➔ ${f.erkezes.split(',')[0]}</span> 
                <span class="text-emerald-500 font-black ml-1">(${f.tavolsag} km)</span>
              </p>
            </div>
            
            <div class="flex gap-2.5 mt-auto">
               <button onclick="biralUtFizikai(${f.id}, 'JOVAHAGYOTT')" 
                       class="flex-1 req-btn-approve font-black py-2 rounded-lg text-[11px] uppercase tracking-wider transition shadow-sm border-none">
                 ✔ ${t('approve')}
               </button>
               <button onclick="biralUtFizikai(${f.id}, 'ELUTASITOTT')" 
                       class="flex-1 req-btn-reject font-black py-2 rounded-lg text-[11px] uppercase tracking-wider transition shadow-sm border-none">
                 ✖ ${t('reject')}
               </button>
            </div>
          </div>`;
};

window.openAllRequestsModal = function () {
  const modalList = document.getElementById('allRequestsList');
  if (modalList) {
    modalList.innerHTML = window.currentBeerkezok.map(f => generateRequestHtml(f)).join('');
  }
  openModalWithAnim('allRequestsModal');
};

window.loadBeerkezoList = async function () {
  const container = document.getElementById('beerkezoList');
  if (!container) return;
  try {
    const res = await fetch('http://localhost:3000/api/admin/beerkezo-fuvarok', { headers: { 'Authorization': `Bearer ${window.AppState.token}` } });
    const fuvarok = await res.json();
    window.currentBeerkezok = fuvarok;

    const modalList = document.getElementById('allRequestsList');
    if (modalList && !document.getElementById('allRequestsModal').classList.contains('hidden')) {
      modalList.innerHTML = fuvarok.map(f => generateRequestHtml(f)).join('');
    }

    if (!Array.isArray(fuvarok) || fuvarok.length === 0) {
      container.innerHTML = `<div class="col-span-full text-center py-4 text-slate-400 text-xs font-bold glass-panel border border-dashed border-white/10 rounded-2xl">${t('no_requests')}</div>`;
      initScrollReveal();
      return;
    }

    const MAX_ITEMS = 4;
    let html = '';
    const toShow = fuvarok.slice(0, MAX_ITEMS);
    html += toShow.map(f => generateRequestHtml(f)).join('');

    if (fuvarok.length > MAX_ITEMS) {
      const extraCount = fuvarok.length - MAX_ITEMS;
      html += `<button onclick="openAllRequestsModal()" class="col-span-full w-full py-2 shrink-0 text-[10px] font-bold text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 rounded-xl transition border border-blue-500/20">${t('more_requests').replace('{x}', extraCount)}</button>`;
    }
    container.innerHTML = html;
    initScrollReveal();
  } catch (e) { console.error(e); }
};

window.loadAutok = async function () {
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
    const adminAutoListContainer = document.getElementById('adminAutoList');

    if (autok.length === 0) {
      const emptyHtml = `
        <div class="col-span-full py-12 flex flex-col items-center justify-center bg-white/5 backdrop-blur-md border-2 border-dashed border-white/10 rounded-3xl">
          <div class="text-5xl mb-4 opacity-40">🚘</div>
          <p class="font-black text-white text-lg tracking-tight">${t('fleet_empty')}</p>
          <p class="text-slate-400 text-sm mt-2 font-medium">${t('no_registered_cars')}</p>
        </div>`;
      if (autoListContainer) autoListContainer.innerHTML = emptyHtml;
      if (adminAutoListContainer) adminAutoListContainer.innerHTML = emptyHtml;
    } else {
      let driverHtml = '';
      let adminHtml = '';

      autok.forEach((a, index) => {
        const commonHeader = `
          <div class="flex justify-between items-center mb-5">
            <div class="flex items-center gap-3">
              <div class="font-black text-white text-2xl tracking-widest font-mono drop-shadow-sm select-all">${a.rendszam}</div>
              <div class="text-[10px] text-blue-300 bg-blue-500/20 border border-blue-500/30 px-2 py-1 rounded font-black uppercase tracking-widest">${a.tipus}</div>
            </div>
            <span class="flex items-center gap-1.5 text-[10px] px-3 py-1.5 rounded-full font-black tracking-widest ${a.statusz === 'ELERHETO' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}">
              <div class="w-1.5 h-1.5 rounded-full ${a.statusz === 'ELERHETO' ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}"></div>
              ${a.statusz === 'ELERHETO' ? t('status_available') : t('status_unavailable')}
            </span>
          </div>
          
          <div class="grid grid-cols-3 gap-2 bg-slate-900/50 border border-white/5 p-4 rounded-xl text-center mb-5">
            <div class="flex flex-col"><span class="block text-slate-400 text-[11px] font-black mb-1.5 uppercase tracking-wider">${t('itp_short')}</span> <span class="font-mono text-white text-sm font-bold">${formatDateStr(a.itp)}</span></div>
            <div class="flex flex-col"><span class="block text-slate-400 text-[11px] font-black mb-1.5 uppercase tracking-wider">${t('rca_short')}</span> <span class="font-mono text-white text-sm font-bold">${formatDateStr(a.rca)}</span></div>
            <div class="flex flex-col"><span class="block text-slate-400 text-[11px] font-black mb-1.5 uppercase tracking-wider">${t('road_tax_short')}</span> <span class="font-mono text-white text-sm font-bold">${formatDateStr(a.rovinieta)}</span></div>
          </div>
          
          <div class="mt-auto w-full bg-slate-900/60 border border-white/5 rounded-full py-3 px-4 flex justify-center items-center gap-3 shadow-inner">
            <span class="text-xl drop-shadow-md">🚗</span>
            <span class="km-badge-${a.rendszam} font-mono font-black text-slate-200 text-xl tracking-widest drop-shadow-sm">${a.aktualis_km || 0} <span class="text-slate-500 text-sm ml-1">km</span></span>
          </div>`;

        const adminBtns = `
          <div class="flex gap-2 pt-4 border-t border-white/10 mt-4">
            <button onclick="openSzervizModal('${a.rendszam}')" class="bg-white/5 hover:bg-white/10 border border-white/10 flex-1 text-white text-xs py-3 rounded-xl font-black flex items-center justify-center gap-1 transition">🛠️ ${t('service')}</button>
            <button onclick="openEditModal('${a.rendszam}')" class="bg-white/5 hover:bg-white/10 border border-white/10 flex-1 text-white text-xs py-3 rounded-xl font-black flex items-center justify-center gap-1 transition">✏️ ${t('modify')}</button>
            <button onclick="deleteAutoAction('${a.rendszam}')" class="bg-red-500/20 hover:bg-red-500/40 text-red-400 text-xs px-4 py-3 rounded-xl font-black flex items-center justify-center transition">🗑️</button>
          </div>`;

        driverHtml += `<div class="bg-white/5 border border-white/10 rounded-[24px] shadow-sm p-6 flex flex-col justify-between transition-all duration-500 hover:-translate-y-1 hover:bg-white/10 h-full fade-in" style="animation-delay: ${index * 50}ms">${commonHeader}</div>`;
        adminHtml += `<div class="bg-white/5 border border-white/10 rounded-[24px] shadow-sm p-6 flex flex-col justify-between transition-all duration-500 hover:-translate-y-1 hover:bg-white/10 h-full fade-in" style="animation-delay: ${index * 50}ms">${commonHeader}${adminBtns}</div>`;
      });

      if (autoListContainer) autoListContainer.innerHTML = driverHtml;
      if (adminAutoListContainer) adminAutoListContainer.innerHTML = adminHtml;
    }

    initScrollReveal();

    const rendszamSelect = document.getElementById('utRendszam');
    if (rendszamSelect && currentUser.role === 'USER') {
      const elerhetoAutok = autok.filter(a => a.elerhetoAFormDatumon);
      const jelenlegiKivalasztott = rendszamSelect.value;
      let opciok = `<option value="">${t('select_car_default')}</option>`;
      if (elerhetoAutok.length === 0) opciok = `<option value="">${t('no_free_car')}</option>`;
      else opciok += elerhetoAutok.map(a => `<option value="${a.rendszam}">${a.rendszam} (${a.tipus})</option>`).join('');
      if (rendszamSelect.innerHTML !== opciok) {
        rendszamSelect.innerHTML = opciok;
        if (elerhetoAutok.some(a => a.rendszam === jelenlegiKivalasztott)) rendszamSelect.value = jelenlegiKivalasztott;
      }
    }
  } catch (e) {
    console.error("Hiba a kártyák betöltésekor:", e);
  }
};

window.loadSzemelyzet = async function () {
  const container = document.getElementById('staffList');
  if (!container) return;
  try {
    const res = await fetch('http://localhost:3000/api/admin/users', { headers: { 'Authorization': `Bearer ${window.AppState.token}` } });
    if (!res.ok) {
      container.innerHTML = `<tr><td colspan="4" class="py-8 text-center text-red-400 font-bold">${t('error_fetching_users')}</td></tr>`;
      return;
    }
    const users = await res.json();
    if (users.length === 0) {
      container.innerHTML = `<tr><td colspan="4" class="py-8 text-center text-slate-400 font-bold">${t('no_users')}</td></tr>`;
      return;
    }
    container.innerHTML = users.map(u => `
      <tr class="border-b border-white/5 hover:bg-white/5">
        <td class="py-4 px-5 text-slate-400 text-xs font-mono">#${u.id}</td>
        <td class="py-4 px-5 font-black text-white">${u.username}</td>
        <td class="py-4 px-5"><span class="px-2 py-1 text-[10px] uppercase tracking-widest font-black rounded-lg ${u.role === 'ADMIN' ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'}">${t(u.role === 'ADMIN' ? 'role_admin' : 'role_user')}</span></td>
        <td class="py-4 px-5 text-right flex justify-end gap-2">
           <button onclick="openEditUserModal(${u.id}, '${u.username}', '${u.role}')" class="glass-btn bg-amber-500/20 text-amber-400 hover:bg-amber-500/40 px-3 py-1.5 rounded-lg text-xs font-bold">✏️ ${t('modify')}</button>
           <button onclick="deleteUserAction(${u.id}, '${u.username}')" class="glass-btn bg-red-500/20 text-red-400 hover:bg-red-500/40 px-3 py-1.5 rounded-lg text-xs font-bold">🗑️ ${t('delete')}</button>
        </td>
      </tr>
    `).join('');
  } catch (e) {
    container.innerHTML = `<tr><td colspan="4" class="py-8 text-center text-red-400 font-bold">${t('error_fetching_users')}</td></tr>`;
  }
};

window.openEditUserModal = function (id, username, role) {
  document.getElementById('editUserId').value = id;
  document.getElementById('editUsername').value = username;
  document.getElementById('editUserRole').value = role;
  document.getElementById('editUserPassword').value = '';
  openModalWithAnim('editUserModal');
};

window.submitEditUser = async function (event) {
  event.preventDefault();
  const id = document.getElementById('editUserId').value;
  const role = document.getElementById('editUserRole').value;
  const password = document.getElementById('editUserPassword').value;

  let data = { role };
  if (password.trim() !== '') data.password = password;

  try {
    const res = await fetch(`http://localhost:3000/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${window.AppState.token}` },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      alert(translateDynamic(err.hiba) || t('error_modifying'));
      return;
    }
    showNotification(t('account_updated'));
    closeModal('editUserModal');
    loadSzemelyzet();
    if (typeof loadAuditLog === 'function') loadAuditLog();
  } catch (e) { alert(t('network_error')); }
};

window.loadUtak = async function () {
  const token = window.AppState.token; const currentUser = window.AppState.user; if (!token || !currentUser) return;
  const szuro = document.getElementById('adminKerelmekSzuro')?.value || '';

  try {
    const utak = await API.fetchUtak(token, currentUser.role === 'ADMIN', szuro);
    if (!Array.isArray(utak)) return;

    let htmlContent = '';
    if (utak.length === 0) {
      htmlContent = `<tr><td colspan="7" class="py-8 text-center text-slate-400 text-sm font-bold">${t('no_data_to_display')}</td></tr>`;
    } else {
      htmlContent = utak.map((u, i) => {
        let gombHTML = '<span class="text-slate-400 font-bold">-</span>';
        if (currentUser.role === 'ADMIN' && u.status === 'BEERKEZO') {
          gombHTML = `
            <div class="flex justify-end gap-2">
              <button onclick="biralUtFizikai(${u.id}, 'JOVAHAGYOTT')" class="glass-btn bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/40 px-3 py-1.5 rounded-lg text-xs font-bold">✔ ${t('approve')}</button>
              <button onclick="biralUtFizikai(${u.id}, 'ELUTASITOTT')" class="glass-btn bg-red-500/20 text-red-400 hover:bg-red-500/40 px-3 py-1.5 rounded-lg text-xs font-bold">✖ ${t('reject')}</button>
            </div>`;
        }

        let statusStyle = 'bg-amber-500/20 text-amber-400 border-amber-500/30';
        let statusDot = 'bg-amber-400';
        if (u.status === 'JOVAHAGYOTT') { statusStyle = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'; statusDot = 'bg-emerald-400'; }
        if (u.status === 'ELUTASITOTT') { statusStyle = 'bg-red-500/20 text-red-400 border-red-500/30'; statusDot = 'bg-red-400'; }
        if (u.status === 'TELJESITVE') { statusStyle = 'bg-blue-500/20 text-blue-400 border-blue-500/30'; statusDot = 'bg-blue-400'; }

        let translatedStatus = u.status;
        if (u.status === 'BEERKEZO') translatedStatus = t('status_pending') || 'BEÉRKEZŐ';
        else if (u.status === 'JOVAHAGYOTT') translatedStatus = t('status_approved') || 'JÓVÁHAGYOTT';
        else if (u.status === 'ELUTASITOTT') translatedStatus = t('status_rejected') || 'ELUTASÍTOTT';
        else if (u.status === 'TELJESITVE') translatedStatus = t('status_completed') || 'TELJESÍTVE';

        return `
          <tr class="border-b border-white/5 transition-colors fade-in hover:bg-white/5" style="animation-delay: ${i * 30}ms">
            <td class="py-4 px-4 text-slate-400 font-mono text-xs font-bold whitespace-nowrap">#${u.id}</td>
            <td class="py-4 px-4 text-white font-bold text-sm whitespace-nowrap">${u.honap_ev}</td>
            <td class="py-4 px-4 font-black text-white text-base whitespace-nowrap">${u.sofor_nev}</td>
            <td class="py-4 px-4 whitespace-nowrap"><span class="theme-input px-2.5 py-1 rounded-md text-xs font-mono font-bold text-blue-400">${u.auto_rendszam}</span></td>
            <td class="py-4 px-4 text-white text-xs font-medium whitespace-nowrap">
              <div class="flex items-center gap-2 mb-1.5">
                 <span class="truncate max-w-[120px]" title="${u.indulas}">${u.indulas.split(',')[0]}</span> 
                 <span class="text-blue-400 font-bold">➔</span> 
                 <span class="truncate max-w-[120px]" title="${u.erkezes}">${u.erkezes.split(',')[0]}</span>
                 <span class="text-emerald-400 font-black ml-2">${u.tavolsag} km</span>
              </div>
              <span class="text-[10px] text-slate-400 font-bold">${t('cost_label')}: ${u.koltseg} RON | ${t('consumption_label')}: ${u.fogyasztas} L</span>
            </td>
            <td class="py-4 px-4 text-center whitespace-nowrap">
               <span class="inline-flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-md font-black tracking-widest border ${statusStyle}">
                 <div class="w-1.5 h-1.5 rounded-full ${statusDot}"></div> ${translatedStatus}
               </span>
            </td>
            <td class="py-4 px-4 align-middle whitespace-nowrap">${gombHTML}</td>
          </tr>`;
      }).join('');
    }

    if (document.getElementById('adminUtList')) document.getElementById('adminUtList').innerHTML = htmlContent;
  } catch (e) { }
};

// ==========================================
// ÚJ KLIENS ELŐZMÉNYEK ÉS CSENGŐ POPULÁLÁS
// ==========================================
window.loadKliensElozmenyek = async function (showAll = false) {
  const token = window.AppState?.token;
  const currentUser = window.AppState?.user;
  const role = (currentUser?.role || '').toUpperCase();

  // Mindig frissítjük a láthatóságot a központi függvénnyel
  if (typeof window.updateBellVisibility === 'function') {
    window.updateBellVisibility();
  }

  // Ha nincs token vagy admin a felhasználó, nem töltjük be a kliens előzményeket
  if (!token || role === 'ADMIN') {
    return;
  }

  const container = document.getElementById('kliensHistoryModalList');
  if (!container) return;

  const szuroInput = document.getElementById('kliensElozmenyekSzuro');
  const szuroValue = szuroInput ? szuroInput.value.trim() : '';

  try {
    const response = await API.fetchUtak(token, false, '');

    let utak = [];
    if (Array.isArray(response)) {
      utak = response;
    } else if (response && Array.isArray(response.utak)) {
      utak = response.utak;
    }

    // 1. ÉRTESÍTÉSI MENÜ FELTÖLTÉSE (CSENGŐ LISTA)
    const unclosedTrips = utak.filter(u => u.status === 'JOVAHAGYOTT');
    const unclosedCount = unclosedTrips.length;

    const dropdownList = document.getElementById('unclosedDropdownList');
    if (dropdownList) {
      if (unclosedCount === 0) {
        dropdownList.innerHTML = `<div class="text-slate-400 text-xs text-center py-6 font-bold">Minden fuvar lezárva! 🎉</div>`;
      } else {
        dropdownList.innerHTML = unclosedTrips.map(u => `
          <div class="bg-slate-900/50 border border-white/10 rounded-xl p-3 flex flex-col gap-2 hover:bg-white/10 transition cursor-pointer" onclick="openLezarModal(${u.id}, '${u.auto_rendszam}'); document.getElementById('unclosedDropdown').classList.add('hidden');">
            <div class="flex justify-between items-center mb-1">
              <span class="font-mono text-emerald-400 font-black tracking-widest text-sm">${u.auto_rendszam}</span>
              <span class="text-[10px] text-slate-400 font-bold bg-white/5 px-2 py-1 rounded">${u.datum ? u.datum.split('T')[0] : u.honap_ev}</span>
            </div>
            <div class="text-xs text-slate-300 font-medium truncate">📍 ${u.indulas.split(',')[0]}</div>
            <div class="text-xs text-slate-300 font-medium truncate">🏁 ${u.erkezes.split(',')[0]}</div>
            <button class="mt-2 w-full bg-blue-500/20 hover:bg-blue-500/40 text-blue-400 py-2 rounded-lg text-[11px] uppercase tracking-wider font-black transition shadow-sm">⛽ ${t('close_trip') || 'Lezárás'}</button>
          </div>
        `).join('');
      }
    }

    // PIROS ÉRTESÍTÉSI PÖTTY (BADGE) LOGIKÁJA
    const countSpan = document.getElementById('unclosedTripCount');
    const bellAnim = document.getElementById('bellAnimation');

    if (unclosedCount > 0) {
      if (bellAnim) bellAnim.classList.add('animate-bounce');
      if (countSpan) {
        countSpan.classList.remove('hidden');
        countSpan.classList.add('flex');
        countSpan.innerText = unclosedCount;
      }
    } else {
      if (bellAnim) bellAnim.classList.remove('animate-bounce');
      if (countSpan) {
        countSpan.classList.add('hidden');
        countSpan.classList.remove('flex');
      }
    }

    // 2. NORMÁL ELŐZMÉNYEK A MODAL-BAN
    let megjelenitendoUtak = utak;
    if (szuroValue !== '') {
      megjelenitendoUtak = utak.filter(u => {
        const dateString = String(u.datum || u.honap_ev || u.created_at || '').toLowerCase();
        return dateString.includes(szuroValue.toLowerCase());
      });
    }

    if (megjelenitendoUtak.length === 0) {
      if (szuroValue !== '') {
        container.innerHTML = `<div class="text-center py-10 text-slate-400 text-sm font-bold bg-white/5 border border-dashed border-white/10 rounded-2xl">${t('no_trip_for_date')}</div>`;
      } else {
        container.innerHTML = `<div class="text-center py-10 text-slate-400 text-sm font-bold bg-white/5 border border-dashed border-white/10 rounded-2xl">${t('no_trips_yet')}</div>`;
      }
    } else {
      const MAX_ITEMS = 15;
      const limitList = (!showAll && szuroValue === '') ? megjelenitendoUtak.slice(0, MAX_ITEMS) : megjelenitendoUtak;

      let html = limitList.map(u => {
        let statuszClass = u.status === 'JOVAHAGYOTT' ? 'text-emerald-400 bg-emerald-500/20 border border-emerald-500/30' :
          (u.status === 'ELUTASITOTT' ? 'text-red-400 bg-red-500/20 border border-red-500/30' :
            (u.status === 'TELJESITVE' ? 'text-blue-400 bg-blue-500/20 border border-blue-500/30' :
              'text-amber-400 bg-amber-500/20 border border-amber-500/30'));

        let tKey = '';
        switch (u.status) {
          case 'BEERKEZO': tKey = 'status_pending'; break;
          case 'JOVAHAGYOTT': tKey = 'status_approved'; break;
          case 'ELUTASITOTT': tKey = 'status_rejected'; break;
          case 'TELJESITVE': tKey = 'status_completed'; break;
          default: tKey = u.status;
        }
        let translatedStatus = t(tKey);

        let gombHTML = '';
        if (u.status === 'JOVAHAGYOTT') {
          gombHTML = `<button onclick="openLezarModal(${u.id}, '${u.auto_rendszam}')" class="mt-3 w-full bg-blue-500/20 hover:bg-blue-500/40 text-blue-400 border border-blue-500/30 py-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 shadow-sm">⛽ ${t('close_trip')}</button>`;
        }

        return `
        <div class="bg-white/5 border border-white/10 p-5 rounded-2xl flex flex-col gap-3 transition hover:bg-white/10 mb-3 shadow-sm shrink-0">
          <div class="flex justify-between items-center">
            <span class="font-mono font-black text-white text-lg tracking-widest">${u.auto_rendszam}</span>
            <span class="text-[10px] px-3 py-1.5 rounded font-black tracking-widest uppercase ${statuszClass}">${translatedStatus}</span>
          </div>
          <div class="text-sm text-slate-300 font-bold flex flex-col gap-2 mt-2 bg-slate-900/40 p-3 rounded-xl border border-white/5">
            <span class="truncate flex items-center gap-2"><span class="text-lg leading-none">📍</span> ${u.indulas.split(',')[0]}</span>
            <span class="text-blue-400 ml-1 text-xs">⬇</span>
            <span class="truncate flex items-center gap-2"><span class="text-lg leading-none">🏁</span> ${u.erkezes.split(',')[0]}</span>
          </div>
          <div class="flex justify-between items-center mt-3 pt-3 border-t border-white/10">
             <span class="text-emerald-400 text-sm font-black bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20">${u.tavolsag} km</span>
             <span class="text-slate-400 text-xs font-bold flex items-center gap-1">📅 ${u.datum ? u.datum.split('T')[0] : u.honap_ev}</span>
          </div>
          ${gombHTML}
        </div>`;
      }).join('');

      if (!showAll && szuroValue === '' && megjelenitendoUtak.length > MAX_ITEMS) {
        const remaining = megjelenitendoUtak.length - MAX_ITEMS;
        html += `<button onclick="loadKliensElozmenyek(true)" class="w-full py-4 mt-2 mb-4 shrink-0 text-xs font-bold text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 rounded-xl transition border border-blue-500/20 shadow-sm">${t('load_more_trips').replace('{x}', remaining)}</button>`;
      }

      container.innerHTML = html;
    }

  } catch (e) {
    console.error("Hiba a kliens előzmények betöltésekor:", e);
  }
};

window.downloadAdvancedJelentes = function (event) {
  const e = event || window.event; let btn = e ? e.currentTarget : null; let originalText = btn ? btn.innerHTML : "📥 CSV";
  if (btn) { btn.innerHTML = "⏳..."; btn.disabled = true; btn.classList.add('opacity-70', 'cursor-not-allowed'); }
  const type = document.getElementById('periodusTipus').value;
  const start = document.getElementById('dateStart').value; const end = document.getElementById('dateEnd').value;
  const resetBtn = () => { if (btn) { btn.innerHTML = originalText; btn.disabled = false; btn.classList.remove('opacity-70', 'cursor-not-allowed'); } };

  if (type !== 'ev' && !start) { alert(t('alert_select_start_date')); resetBtn(); return; }
  if (type === 'intervallum' && !end) { alert(t('alert_select_end_date')); resetBtn(); return; }

  let periodus = start;
  if (type === 'honap') periodus = start.substring(0, 7);
  if (type === 'ev') periodus = start ? start.substring(0, 4) : new Date().getFullYear().toString();
  if (type === 'intervallum') periodus = `${start}_${end}`;

  window.location.href = `http://localhost:3000/api/admin/jelentes/${periodus}?token=${window.AppState.token}`;
  setTimeout(resetBtn, 2000);
};

window.downloadExcelJelentes = function (event) {
  const e = event || window.event; let btn = e ? e.currentTarget : null; let originalText = btn ? btn.innerHTML : "📊 Excel";
  if (btn) { btn.innerHTML = "⏳..."; btn.disabled = true; btn.classList.add('opacity-70', 'cursor-not-allowed'); }
  const type = document.getElementById('periodusTipus').value;
  const start = document.getElementById('dateStart').value; const end = document.getElementById('dateEnd').value;
  const resetBtn = () => { if (btn) { btn.innerHTML = originalText; btn.disabled = false; btn.classList.remove('opacity-70', 'cursor-not-allowed'); } };

  if (type !== 'ev' && !start) { alert(t('alert_select_start_date')); resetBtn(); return; }
  if (type === 'intervallum' && !end) { alert(t('alert_select_end_date')); resetBtn(); return; }

  let periodus = start;
  if (type === 'honap') periodus = start.substring(0, 7);
  if (type === 'ev') periodus = start ? start.substring(0, 4) : new Date().getFullYear().toString();
  if (type === 'intervallum') periodus = `${start}_${end}`;

  window.location.href = `http://localhost:3000/api/admin/jelentes/${periodus}?token=${window.AppState.token}&format=xlsx`;
  setTimeout(resetBtn, 2000);
};

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
      alert(t('error_adding_car') + (translateDynamic(error.hiba) || t('check_data')));
      return;
    }

    if (typeof showToast === 'function') showToast(t('car_added_success'), "siker");
    event.target.reset();
    closeModal('addAutoModal');
    if (typeof loadAutok === 'function') loadAutok();
    if (typeof window.loadRiasztasok === 'function') window.loadRiasztasok();
  } catch (e) {
    console.error(e); alert(t('network_error'));
  }
};

window.renderDashboard = async function () {
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
          datasets: [{ label: t('monthly_cost'), data: data, borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.15)', borderWidth: 4, pointBackgroundColor: '#2563eb', pointBorderColor: '#ffffff', pointRadius: 6, fill: true, tension: 0.4 }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { labels: { color: textColor, font: { family: 'sans-serif', weight: 'bold', size: 13 } } } },
          scales: {
            y: { beginAtZero: true, grid: { color: gridColor, drawBorder: false }, ticks: { color: textColor, font: { weight: 'bold' } } },
            x: { grid: { display: false }, ticks: { color: textColor, font: { weight: 'bold' } } }
          }
        }
      });
    }
  } catch (e) { }
};

window.loadAuditLog = async function () {
  const token = window.AppState.token;
  if (!token || window.AppState.user.role !== 'ADMIN') return;
  const container = document.getElementById('auditLogList');
  try {
    const logs = await API.fetchAudit(token);
    if (!Array.isArray(logs) || logs.length === 0) {
      container.innerHTML = `<tr><td colspan="4" class="py-8 text-center text-slate-400 font-bold">${t('no_audit_logs')}</td></tr>`;
      return;
    }
    container.innerHTML = logs.map((l, index) => `
      <tr class="transition-all duration-300 fade-in border-b border-white/5 hover:bg-white/5" style="animation-delay: ${index * 50}ms">
        <td class="py-5 px-6 text-[11px] text-slate-400 font-mono font-black whitespace-nowrap">${new Date(l.datum).toLocaleString()}</td>
        <td class="py-5 px-6 font-black text-white text-sm whitespace-nowrap">${l.felhasznalo}</td>
        <td class="py-5 px-6 text-blue-400 font-black text-[10px] tracking-widest uppercase whitespace-nowrap">${translateDynamic(l.muvelet)}</td>
        <td class="py-5 px-6 text-white text-sm font-medium min-w-[300px] whitespace-nowrap">${translateDynamic(l.reszletek)}</td>
      </tr>`).join('');
  } catch (e) { console.error(e); }
};

window.loadAllSzervizHistory = async function () {
  const token = window.AppState.token;
  if (!token || window.AppState.user.role !== 'ADMIN') return;

  const container = document.getElementById('allSzervizHistoryList');
  if (!container) return;

  try {
    const res = await fetch('http://localhost:3000/api/admin/szerviz', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) throw new Error(t('fetch_error'));
    const szervizek = await res.json();

    if (!Array.isArray(szervizek) || szervizek.length === 0) {
      container.innerHTML = `<tr><td colspan="4" class="py-8 text-center text-slate-400 font-bold">${t('no_service_logs')}</td></tr>`;
      return;
    }

    container.innerHTML = szervizek.map((sz, index) => `
      <tr class="transition-all duration-300 fade-in border-b border-white/5 hover:bg-white/5" style="animation-delay: ${index * 30}ms">
        <td class="py-5 px-5 text-[11px] text-slate-400 font-mono font-black whitespace-nowrap">${sz.datum ? sz.datum.split('T')[0] : '-'}</td>
        <td class="py-5 px-5 font-black text-blue-400 font-mono tracking-widest whitespace-nowrap">${sz.auto_rendszam || sz.rendszam || 'Ismeretlen'}</td>
        <td class="py-5 px-5 font-bold text-white whitespace-nowrap">${sz.kilometer} km</td>
        <td class="py-5 px-5 text-white text-sm font-medium min-w-[200px] whitespace-nowrap">${translateDynamic(sz.leiras)}</td>
      </tr>`).join('');

  } catch (e) {
    console.error(e);
    container.innerHTML = `<tr><td colspan="4" class="py-8 text-center text-red-400 font-bold">${t('error_loading_service')}</td></tr>`;
  }
};

window.toggleDateInputs = function () { document.getElementById('dateEnd').classList.toggle('hidden', document.getElementById('periodusTipus').value !== 'intervallum'); };