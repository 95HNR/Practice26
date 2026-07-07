async function handleLogin(e) {
  e.preventDefault(); const errorDiv = document.getElementById('loginError');
  try {
    const result = await API.login(document.getElementById('username').value, document.getElementById('password').value);
    if (result.ok) { window.AppState.token = result.data.token; window.AppState.user = result.data.user; errorDiv.classList.add('hidden'); renderUI(); } 
    else { errorDiv.textContent = result.data.hiba || 'Hibás adatok!'; errorDiv.classList.remove('hidden'); }
  } catch (err) { errorDiv.textContent = 'Hálózati hiba!'; errorDiv.classList.remove('hidden'); }
}
function logout() { window.AppState.token = null; window.AppState.user = null; renderUI(); }
async function createUser(e) {
  e.preventDefault(); const msgDiv = document.getElementById('registerMessage');
  try {
    const result = await API.registerUser(document.getElementById('newUsername').value, document.getElementById('newPassword').value, document.getElementById('newRole').value);
    msgDiv.classList.remove('hidden', 'bg-red-500/20', 'border-red-500', 'text-red-300', 'bg-emerald-500/20', 'border-emerald-500', 'text-emerald-300');
    if (result.ok) { msgDiv.textContent = 'Felhasználó kész!'; msgDiv.classList.add('bg-emerald-500/20', 'border', 'border-emerald-500', 'text-emerald-300'); e.target.reset(); }
    else { msgDiv.textContent = 'Létező név!'; msgDiv.classList.add('bg-red-500/20', 'border', 'border-red-500', 'text-red-300'); }
  } catch (err) { }
}

// AUTÓ MŰVELETEK
async function addAuto(e) {
  e.preventDefault();
  await API.addAuto(window.AppState.token, {
    rendszam: document.getElementById('autoRendszam').value, tipus: document.getElementById('autoTipus').value, statusz: document.getElementById('autoStatusz').value,
    itp_lejarat: document.getElementById('autoItp').value || null, biztositas_lejarat: document.getElementById('autoBiztositas').value || null, utado_lejarat: document.getElementById('autoUtado').value || null, szerviz_naplo: document.getElementById('autoSzerviz').value || null
  });
  e.target.reset(); loadAutok();
}
async function deleteAutoAction(rendszam) {
  if(!confirm(`Biztosan törlöd a ${rendszam} autót?`)) return;
  const res = await API.deleteAuto(window.AppState.token, rendszam);
  if(!res.ok) alert(res.data.hiba); // Ha vannak útjai, szól, hogy nem lehet.
  loadAutok();
}
async function submitEditAuto(e) {
  e.preventDefault();
  const rendszam = document.getElementById('editRendszam').value;
  await API.updateAuto(window.AppState.token, rendszam, {
    tipus: document.getElementById('editTipus').value, statusz: document.getElementById('editStatusz').value,
    itp_lejarat: document.getElementById('editItp').value || null, biztositas_lejarat: document.getElementById('editRca').value || null, utado_lejarat: document.getElementById('editRovinieta').value || null, szerviz_naplo: document.getElementById('editSzerviz').value || null
  });
  closeEditModal(); loadAutok();
}

// ÚT MŰVELETEK
async function addUt(e) {
  e.preventDefault();
  await API.addUt(window.AppState.token, {
    auto_rendszam: document.getElementById('utRendszam').value, indulas: document.getElementById('utIndulas').value, erkezes: document.getElementById('utErkezes').value, tavolsag: document.getElementById('utTav').value, fogyasztas: 6.5, honap_ev: document.getElementById('utDatum').value
  });
  e.target.reset(); resetDistanceField(true, true);
  const datumInput = document.getElementById('utDatum'); if (datumInput) datumInput.value = new Date().toISOString().split('T')[0];
  loadUtak();
}
async function biralUtFizikai(id, status) { await API.biralUt(window.AppState.token, id, status); loadAutok(); loadUtak(); }
function downloadCSV() { if(window.AppState.token) API.downloadCSV(window.AppState.token, '2026-07'); }
