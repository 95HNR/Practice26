export function openModalWithAnim(modalId) {
  const modal = document.getElementById(modalId);
  modal.classList.remove('hidden');
  const card = modal.querySelector('.glass-panel');
  if (card) { card.classList.add('fade-in'); }
}

export function openEditModal(rendszam) {
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
export function closeEditModal() { document.getElementById('editAutoModal').classList.add('hidden'); }

export async function openSzervizModal(rendszam) {
  document.getElementById('szervizModalTitle').innerHTML = `🛠️ <span class="text-blue-400 font-mono tracking-widest">${rendszam}</span> Szerviztörténet`;
  document.getElementById('szervizAutoRendszam').value = rendszam;
  const lista = document.getElementById('szervizLista');
  lista.innerHTML = '<div class="text-center text-slate-400 py-8 font-bold animate-pulse">Adatok betöltése...</div>';
  openModalWithAnim('szervizModal');
  try {
    const szervizek = await window.API.fetchSzerviz(window.AppState.token, rendszam);
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
export function closeSzervizModal() { document.getElementById('szervizModal').classList.add('hidden'); }

export function openLezarModal(id, rendszam) {
  document.getElementById('lezarUtId').value = id;
  document.getElementById('lezarModalTitle').innerHTML = `⛽ Fuvar Lezárása: <span class="text-emerald-400 font-mono">#${id}</span> (${rendszam})`;
  openModalWithAnim('lezarModal');
}
export function closeLezarModal() { document.getElementById('lezarModal').classList.add('hidden'); }

export function toggleDateInputs() { 
  document.getElementById('dateEnd').classList.toggle('hidden', document.getElementById('periodusTipus').value !== 'intervallum'); 
}