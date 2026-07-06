let startCoords = { lat: 0, lon: 0 };
let endCoords = { lat: 0, lon: 0 };
let debounceTimer = null;
let pollInterval = null;

function resetDistanceField(resetStart = true, resetEnd = true) {
  if (resetStart) startCoords = { lat: 0, lon: 0 };
  if (resetEnd) endCoords = { lat: 0, lon: 0 };
  const tavInput = document.getElementById('utTav');
  if (tavInput) {
    tavInput.value = '';
    tavInput.classList.remove('border-emerald-500');
  }
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return (R * c).toFixed(1);
}

function searchOSM(inputEl, dropdownId) {
  clearTimeout(debounceTimer);
  if (inputEl.id === 'utIndulas') resetDistanceField(true, false);
  if (inputEl.id === 'utErkezes') resetDistanceField(false, true);

  const query = inputEl.value.trim();
  const dropdown = document.getElementById(dropdownId);

  if (query.length < 3) {
    dropdown.classList.add('hidden');
    return;
  }

  debounceTimer = setTimeout(async () => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&accept-language=hu`, {
        headers: { 'User-Agent': 'DriveCheckApp/1.0 (hunor-university-project)' }
      });
      const results = await res.json();

      if (results.length === 0) {
        dropdown.innerHTML = `<div class="p-3 text-xs text-slate-400 text-center">Nincs találat</div>`;
        dropdown.classList.remove('hidden');
        return;
      }

      dropdown.innerHTML = results.map(item => {
        const shortName = item.display_name.split(',').slice(0, 3).join(', ').trim();
        const safeName = shortName.replace(/'/g, "\\'");
        return `
          <div onclick="selectLocation('${inputEl.id}', '${dropdownId}', '${safeName}', ${item.lat}, ${item.lon})" class="p-3 hover:bg-slate-700 cursor-pointer transition flex items-start gap-2">
            <span class="text-blue-400 mt-0.5">📍</span>
            <div>
              <div class="text-xs font-semibold text-white">${shortName}</div>
              <div class="text-[10px] text-slate-400 truncate max-w-xs">${item.display_name}</div>
            </div>
          </div>
        `;
      }).join('');
      dropdown.classList.remove('hidden');
    } catch (err) {
      console.error('OSM hiba:', err);
    }
  }, 800);
}

function selectLocation(inputId, dropdownId, locationName, lat, lon) {
  document.getElementById(inputId).value = locationName;
  document.getElementById(dropdownId).classList.add('hidden');

  if (inputId === 'utIndulas') startCoords = { lat, lon };
  if (inputId === 'utErkezes') endCoords = { lat, lon };

  if (startCoords.lat !== 0 && endCoords.lat !== 0) {
    const dist = calculateDistance(startCoords.lat, startCoords.lon, endCoords.lat, endCoords.lon);
    const tavInput = document.getElementById('utTav');
    tavInput.value = dist;
    tavInput.classList.add('border-emerald-500'); 
  }
}

function renderUI() {
  const token = window.AppState.token;
  const currentUser = window.AppState.user;

  if (!token) {
    document.getElementById('loginSection').classList.remove('hidden');
    document.getElementById('adminSection').classList.add('hidden');
    document.getElementById('kliensSection').classList.add('hidden');
    document.getElementById('userInfo').classList.add('hidden');
    clearInterval(pollInterval);
    return;
  }

  document.getElementById('loginSection').classList.add('hidden');
  document.getElementById('userInfo').classList.remove('hidden');
  document.getElementById('welcomeText').textContent = `Üdv, ${currentUser.username}!`;
  document.getElementById('roleBadge').textContent = currentUser.role;

  if (currentUser.role === 'ADMIN') {
    document.getElementById('adminSection').classList.remove('hidden');
    document.getElementById('kliensHeader').classList.add('hidden');
  } else {
    document.getElementById('adminSection').classList.add('hidden');
    document.getElementById('kliensHeader').classList.remove('hidden');
  }

  document.getElementById('kliensSection').classList.remove('hidden');
  resetDistanceField(true, true);
  
  const datumInput = document.getElementById('utDatum');
  if (datumInput && !datumInput.value) {
    datumInput.value = new Date().toISOString().split('T')[0];
  }
  
  loadAutok();
  loadUtak();

  clearInterval(pollInterval);
  pollInterval = setInterval(() => {
    loadAutok();
    loadUtak();
  }, 5000);
}

async function loadAutok() {
  const token = window.AppState.token;
  if (!token) return;
  
  // 1. Beolvassuk az űrlapból a kiválasztott dátumot
  const datumInput = document.getElementById('utDatum');
  const formDate = datumInput ? datumInput.value : new Date().toISOString().split('T')[0];

  // Lekérjük a flotta státuszt a szerverről a kiválasztott dátummal szűrve
  const autok = await API.fetchAutok(token, formDate);
  
  // 2. Kirajzoljuk a lenti flotta állapotot (Ez CSAK a mai nap foglaltságát mutatja a szerverről)
  document.getElementById('autoList').innerHTML = autok.map(a => `
    <div class="bg-slate-900 p-3 rounded border border-slate-700 flex justify-between items-center">
      <div>
        <div class="font-bold text-white">${a.rendszam}</div>
        <div class="text-xs text-slate-400">${a.tipus}</div>
      </div>
      <span class="text-xs px-2 py-1 rounded font-bold ${a.statusz === 'ELERHETO' ? 'bg-emerald-900/40 text-emerald-400' : 'bg-red-900/40 text-red-400'}">${a.statusz}</span>
    </div>
  `).join('');

  // 3. DROPDOWN LISTA SZŰRÉSE (Csak az adott napon szabad autók!)
  const rendszamSelect = document.getElementById('utRendszam');
  if (rendszamSelect) {
    const elerhetoAutok = autok.filter(a => a.elerhetoAFormDatumon);
    const jelenlegiKivalasztott = rendszamSelect.value;
    
    let opciok = '<option value="">-- Válassz autót --</option>';
    if (elerhetoAutok.length === 0) {
      opciok = '<option value="">-- Nincs szabad autó ezen a napon --</option>';
    } else {
      opciok += elerhetoAutok.map(a => `<option value="${a.rendszam}">${a.rendszam} (${a.tipus})</option>`).join('');
    }
    
    // Csak akkor írjuk felül a HTML-t ha változás történt, hogy ne akadályozzuk a kijelölést
    if (rendszamSelect.innerHTML !== opciok) {
      rendszamSelect.innerHTML = opciok;
      if (elerhetoAutok.some(a => a.rendszam === jelenlegiKivalasztott)) {
        rendszamSelect.value = jelenlegiKivalasztott;
      }
    }
  }
}

async function loadUtak() {
  const token = window.AppState.token;
  const currentUser = window.AppState.user;
  if (!token || !currentUser) return;

  const utak = await API.fetchUtak(token, currentUser.role === 'ADMIN');
  document.getElementById('utList').innerHTML = utak.map(u => `
    <tr>
      <td class="py-3 text-slate-400">#${u.id}</td>
      <td class="py-3 text-blue-400 font-mono text-xs font-semibold">${u.honap_ev}</td>
      <td class="py-3 font-bold text-white">${u.sofor_nev}</td>
      <td class="py-3"><span class="bg-slate-900 px-2 py-1 rounded text-xs">${u.auto_rendszam}</span></td>
      <td class="py-3 text-slate-300">${u.indulas} ➔ ${u.erkezes} (${u.tavolsag} km)</td>
      <td class="py-3">
        <span class="text-xs px-2 py-1 rounded font-bold ${
          u.status === 'JOVAHAGYOTT' ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-500/30' :
          u.status === 'ELUTASITOTT' ? 'bg-red-900/50 text-red-400 border border-red-500/30' : 'bg-amber-900/50 text-amber-400 border border-amber-500/30'
        }">${u.status}</span>
      </td>
      <td class="py-3">
        ${currentUser.role === 'ADMIN' && u.status === 'BEERKEZO' ? `
          <div class="flex gap-2">
            <button onclick="biralUtFizikai(${u.id}, 'JOVAHAGYOTT')" class="bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-1 rounded text-xs">✔ Jóváhagyás</button>
            <button onclick="biralUtFizikai(${u.id}, 'ELUTASITOTT')" class="bg-red-600 hover:bg-red-500 text-white px-2 py-1 rounded text-xs">✖ Elutasítás</button>
          </div>
        ` : '-'}
      </td>
    </tr>
  `).join('');
}

document.addEventListener('click', (e) => {
  if (!e.target.closest('.relative')) {
    document.getElementById('indulasList')?.classList.add('hidden');
    document.getElementById('erkezesList')?.classList.add('hidden');
  }
});
