let startCoords = { lat: 0, lon: 0 }; let endCoords = { lat: 0, lon: 0 }; let debounceTimer = null; let pollInterval = null;
window.currentFlotta = []; // Eltároljuk az autókat a módosításhoz

function resetDistanceField(resetStart = true, resetEnd = true) {
  if (resetStart) startCoords = { lat: 0, lon: 0 }; if (resetEnd) endCoords = { lat: 0, lon: 0 };
  const tavInput = document.getElementById('utTav'); if (tavInput) { tavInput.value = ''; tavInput.classList.remove('border-emerald-500'); }
}
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; const dLat = (lat2 - lat1) * Math.PI / 180; const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return (R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))).toFixed(1);
}
function searchOSM(inputEl, dropdownId) {
  clearTimeout(debounceTimer);
  if (inputEl.id === 'utIndulas') resetDistanceField(true, false); if (inputEl.id === 'utErkezes') resetDistanceField(false, true);
  const query = inputEl.value.trim(); const dropdown = document.getElementById(dropdownId);
  if (query.length < 3) return dropdown.classList.add('hidden');
  debounceTimer = setTimeout(async () => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&accept-language=hu`);
      const results = await res.json();
      if (results.length === 0) { dropdown.innerHTML = `<div class="p-3 text-xs text-slate-400 text-center">Nincs találat</div>`; return dropdown.classList.remove('hidden'); }
      dropdown.innerHTML = results.map(item => `<div onclick="selectLocation('${inputEl.id}', '${dropdownId}', '${item.display_name.split(',').slice(0,3).join(', ').trim().replace(/'/g, "\\'")}', ${item.lat}, ${item.lon})" class="p-3 hover:bg-slate-700 cursor-pointer flex gap-2"><span class="text-blue-400">📍</span><div><div class="text-xs font-semibold text-white">${item.display_name.split(',').slice(0,3).join(', ').trim()}</div></div></div>`).join('');
      dropdown.classList.remove('hidden');
    } catch (err) {}
  }, 600);
}
function selectLocation(inputId, dropdownId, locationName, lat, lon) {
  document.getElementById(inputId).value = locationName; document.getElementById(dropdownId).classList.add('hidden');
  if (inputId === 'utIndulas') startCoords = { lat, lon }; if (inputId === 'utErkezes') endCoords = { lat, lon };
  if (startCoords.lat !== 0 && endCoords.lat !== 0) {
    const tavInput = document.getElementById('utTav'); tavInput.value = calculateDistance(startCoords.lat, startCoords.lon, endCoords.lat, endCoords.lon); tavInput.classList.add('border-emerald-500'); 
  }
}

// -- ÚJ: Modális ablak (Popup) kezelése --
function openEditModal(rendszam) {
  const auto = window.currentFlotta.find(a => a.rendszam === rendszam);
  if(!auto) return;
  document.getElementById('editAutoModal').classList.remove('hidden');
  document.getElementById('editRendszam').value = auto.rendszam;
  document.getElementById('editTipus').value = auto.tipus;
  document.getElementById('editStatusz').value = auto.statusz;
  document.getElementById('editItp').value = auto.itp ? auto.itp.split('T')[0] : '';
  document.getElementById('editRca').value = auto.rca ? auto.rca.split('T')[0] : '';
  document.getElementById('editRovinieta').value = auto.rovinieta ? auto.rovinieta.split('T')[0] : '';
  document.getElementById('editSzerviz').value = auto.szerviz || '';
}
function closeEditModal() { document.getElementById('editAutoModal').classList.add('hidden'); }

async function renderUI() {
  const token = window.AppState.token; const currentUser = window.AppState.user;
  if (!token) {
    document.getElementById('loginSection').classList.remove('hidden'); document.getElementById('adminSection').classList.add('hidden'); document.getElementById('kliensSection').classList.add('hidden'); document.getElementById('userInfo').classList.add('hidden'); clearInterval(pollInterval); return;
  }
  document.getElementById('loginSection').classList.add('hidden'); document.getElementById('userInfo').classList.remove('hidden');
  document.getElementById('welcomeText').textContent = `Üdv, ${currentUser.username}!`; document.getElementById('roleBadge').textContent = currentUser.role;
  const soforUrlap = document.getElementById('soforUrlapContainer'); const alertContainer = document.getElementById('alertContainer');
  if(alertContainer) alertContainer.innerHTML = '';
  
  if (currentUser.role === 'ADMIN') {
    document.getElementById('adminSection').classList.remove('hidden'); document.getElementById('kliensHeader').classList.add('hidden');
    if (soforUrlap) soforUrlap.classList.add('hidden');
    try {
      const riasztasok = await API.fetchAlerts(token);
      if(Array.isArray(riasztasok) && riasztasok.length > 0 && alertContainer) {
        alertContainer.innerHTML = riasztasok.map(r => `<div class="bg-red-900/50 border-l-4 border-red-500 p-4 rounded text-red-200 text-sm font-semibold mb-3 flex items-center shadow-lg"><span class="mr-3 text-xl">⚠️</span> ${r}</div>`).join('');
      }
    } catch (e) { }
  } else {
    document.getElementById('adminSection').classList.add('hidden'); document.getElementById('kliensHeader').classList.remove('hidden');
    if (soforUrlap) soforUrlap.classList.remove('hidden');
  }

  document.getElementById('kliensSection').classList.remove('hidden'); resetDistanceField(true, true);
  const datumInput = document.getElementById('utDatum'); if (datumInput && !datumInput.value) datumInput.value = new Date().toISOString().split('T')[0];
  
  loadAutok(); loadUtak(); clearInterval(pollInterval); pollInterval = setInterval(() => { loadAutok(); loadUtak(); }, 5000);
}

function formatDateStr(isoStr) { return isoStr ? isoStr.split('T')[0] : 'Nincs'; }

async function loadAutok() {
  const token = window.AppState.token; const currentUser = window.AppState.user; if (!token) return;
  const datumInput = document.getElementById('utDatum'); const formDate = datumInput ? datumInput.value : new Date().toISOString().split('T')[0];
  try {
    const autok = await API.fetchAutok(token, formDate);
    if (!Array.isArray(autok)) return;
    window.currentFlotta = autok; // Eltároljuk memóriába!

    document.getElementById('autoList').innerHTML = autok.map(a => `
      <div class="bg-slate-900 p-4 rounded-lg border ${a.statusz === 'FOGLALT' ? 'border-red-900/50' : 'border-slate-700'} flex flex-col justify-between">
        <div>
          <div class="flex justify-between items-start mb-3">
            <div><div class="font-bold text-white text-lg">${a.rendszam}</div><div class="text-xs text-slate-400">${a.tipus}</div></div>
            <span class="text-xs px-2 py-1 rounded font-bold ${a.statusz === 'ELERHETO' ? 'bg-emerald-900/40 text-emerald-400' : 'bg-red-900/40 text-red-400'}">${a.statusz}</span>
          </div>
          <div class="text-[10px] text-slate-400 grid grid-cols-2 gap-1 bg-slate-950 p-2 rounded">
            <div><span class="text-slate-500">ITP:</span> ${formatDateStr(a.itp)}</div><div><span class="text-slate-500">RCA:</span> ${formatDateStr(a.rca)}</div>
            <div><span class="text-slate-500">Rovinieta:</span> ${formatDateStr(a.rovinieta)}</div><div class="truncate"><span class="text-slate-500">Szerviz:</span> ${a.szerviz || '-'}</div>
          </div>
        </div>
        ${currentUser && currentUser.role === 'ADMIN' ? `
          <div class="mt-3 flex gap-2 border-t border-slate-800 pt-3">
            <button onclick="openEditModal('${a.rendszam}')" class="flex-1 bg-amber-600/80 hover:bg-amber-500 text-white text-xs py-1.5 rounded transition">✏️ Módosít</button>
            <button onclick="deleteAutoAction('${a.rendszam}')" class="flex-1 bg-red-600/80 hover:bg-red-500 text-white text-xs py-1.5 rounded transition">🗑️ Töröl</button>
          </div>
        ` : ''}
      </div>
    `).join('');

    const rendszamSelect = document.getElementById('utRendszam');
    if (rendszamSelect) {
      const elerhetoAutok = autok.filter(a => a.elerhetoAFormDatumon);
      const jelenlegiKivalasztott = rendszamSelect.value;
      let opciok = '<option value="">-- Válassz autót --</option>';
      if (elerhetoAutok.length === 0) opciok = '<option value="">-- Nincs szabad autó --</option>';
      else opciok += elerhetoAutok.map(a => `<option value="${a.rendszam}">${a.rendszam} (${a.tipus})</option>`).join('');
      if (rendszamSelect.innerHTML !== opciok) { rendszamSelect.innerHTML = opciok; if (elerhetoAutok.some(a => a.rendszam === jelenlegiKivalasztott)) rendszamSelect.value = jelenlegiKivalasztott; }
    }
  } catch(e) {}
}

async function loadUtak() {
  const token = window.AppState.token; const currentUser = window.AppState.user; if (!token || !currentUser) return;
  try {
    const utak = await API.fetchUtak(token, currentUser.role === 'ADMIN');
    if (!Array.isArray(utak)) return;
    document.getElementById('utList').innerHTML = utak.map(u => `
      <tr>
        <td class="py-3 text-slate-400">#${u.id}</td><td class="py-3 text-blue-400 font-mono text-xs font-semibold">${u.honap_ev}</td><td class="py-3 font-bold text-white">${u.sofor_nev}</td>
        <td class="py-3"><span class="bg-slate-900 px-2 py-1 rounded text-xs">${u.auto_rendszam}</span></td><td class="py-3 text-slate-300">${u.indulas} ➔ ${u.erkezes} (${u.tavolsag} km)</td>
        <td class="py-3"><span class="text-xs px-2 py-1 rounded font-bold ${u.status === 'JOVAHAGYOTT' ? 'bg-emerald-900/50 text-emerald-400' : u.status === 'ELUTASITOTT' ? 'bg-red-900/50 text-red-400' : 'bg-amber-900/50 text-amber-400'}">${u.status}</span></td>
        <td class="py-3">${currentUser.role === 'ADMIN' && u.status === 'BEERKEZO' ? `<div class="flex gap-2"><button onclick="biralUtFizikai(${u.id}, 'JOVAHAGYOTT')" class="bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-1 rounded text-xs">✔</button><button onclick="biralUtFizikai(${u.id}, 'ELUTASITOTT')" class="bg-red-600 hover:bg-red-500 text-white px-2 py-1 rounded text-xs">✖</button></div>` : '-'}</td>
      </tr>
    `).join('');
  } catch(e) {}
}
document.addEventListener('click', (e) => { if (!e.target.closest('.relative')) { document.getElementById('indulasList')?.classList.add('hidden'); document.getElementById('erkezesList')?.classList.add('hidden'); }});
