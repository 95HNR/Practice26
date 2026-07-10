export async function addAuto(event) {
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
    if (typeof window.loadAutok === 'function') window.loadAutok();
    if (typeof window.loadRiasztasok === 'function') window.loadRiasztasok();
  } catch (e) {
    console.error(e); alert("Hálózati hiba történt.");
  }
}

export function downloadAdvancedJelentes(event) {
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
}