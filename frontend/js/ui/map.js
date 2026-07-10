export function resetDistanceField(resetStart = true, resetEnd = true) {
  if (resetStart) window.startCoords = { lat: 0, lon: 0 };
  if (resetEnd) window.endCoords = { lat: 0, lon: 0 };
  const tavInput = document.getElementById('utTav');
  if (tavInput) {
    tavInput.value = '';
    tavInput.classList.remove('border-emerald-500', 'text-emerald-400');
  }
}

export function searchOSM(inputEl, dropdownId) {
  clearTimeout(window.debounceTimer);
  if (inputEl.id === 'utIndulas') resetDistanceField(true, false);
  if (inputEl.id === 'utErkezes') resetDistanceField(false, true);
  const query = inputEl.value.trim();
  const dropdown = document.getElementById(dropdownId);
  if (query.length < 3) return dropdown.classList.add('hidden');

  window.debounceTimer = setTimeout(async () => {
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

export async function selectLocation(inputId, dropdownId, locationName, lat, lon) {
  document.getElementById(inputId).value = locationName;
  document.getElementById(dropdownId).classList.add('hidden');
  if (inputId === 'utIndulas') window.startCoords = { lat, lon };
  if (inputId === 'utErkezes') window.endCoords = { lat, lon };

  if (window.startCoords.lat !== 0 && window.endCoords.lat !== 0) {
    const tavInput = document.getElementById('utTav');
    tavInput.value = 'Tervezés folyamatban...';
    try {
      const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${window.startCoords.lon},${window.startCoords.lat};${window.endCoords.lon},${window.endCoords.lat}?overview=false`);
      const data = await res.json();
      if (data.routes && data.routes[0]) {
        tavInput.value = (data.routes[0].distance / 1000).toFixed(1) + ' km';
        tavInput.classList.add('border-emerald-500', 'text-emerald-400');
      }
    } catch (e) { tavInput.value = 'Hiba a tervezéskor!'; }
  }
}