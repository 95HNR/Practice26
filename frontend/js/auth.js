async function handleLogin(e) {
  e.preventDefault();
  const errorDiv = document.getElementById('loginError');
  const u = document.getElementById('username').value;
  const p = document.getElementById('password').value;

  try {
    const result = await API.login(u, p);

    if (result.ok) {
      window.AppState.token = result.data.token;
      window.AppState.user = result.data.user;
      errorDiv.classList.add('hidden');
      renderUI();
    } else {
      errorDiv.textContent = result.data.hiba || 'Hibás adatok!';
      errorDiv.classList.remove('hidden');
    }
  } catch (err) {
    errorDiv.textContent = 'Nem sikerült csatlakozni a szerverhez (fut a backend?)';
    errorDiv.classList.remove('hidden');
  }
}

function logout() {
  window.AppState.token = null;
  window.AppState.user = null;
  renderUI();
}

async function addAuto(e) {
  e.preventDefault();
  const token = window.AppState.token;
  await API.addAuto(token, {
    rendszam: document.getElementById('autoRendszam').value,
    tipus: document.getElementById('autoTipus').value,
    statusz: document.getElementById('autoStatusz').value
  });
  e.target.reset();
  loadAutok();
}

async function addUt(e) {
  e.preventDefault();
  const token = window.AppState.token;
  await API.addUt(token, {
    auto_rendszam: document.getElementById('utRendszam').value,
    indulas: document.getElementById('utIndulas').value,
    erkezes: document.getElementById('utErkezes').value,
    tavolsag: document.getElementById('utTav').value,
    fogyasztas: 6.5,
    honap_ev: document.getElementById('utDatum').value
  });

  e.target.reset();
  resetDistanceField(true, true);
  
  const datumInput = document.getElementById('utDatum');
  if (datumInput) datumInput.value = new Date().toISOString().split('T')[0];
  
  loadUtak();
}

async function biralUtFizikai(id, status) {
  const token = window.AppState.token;
  await API.biralUt(token, id, status);
  loadAutok();
  loadUtak();
}

function downloadCSV() {
  const token = window.AppState.token;
  if (token) API.downloadCSV(token, '2026-07');
}
