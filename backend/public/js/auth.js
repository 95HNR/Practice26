let token = null;
let currentUser = null;

async function handleLogin(e) {
  e.preventDefault();
  const errorDiv = document.getElementById('loginError');
  const u = document.getElementById('username').value;
  const p = document.getElementById('password').value;

  const result = await API.login(u, p);

  if (result.ok) {
    token = result.data.token;
    currentUser = result.data.user;
    errorDiv.classList.add('hidden');
    renderUI();
  } else {
    errorDiv.textContent = result.data.hiba || 'Hibás adatok!';
    errorDiv.classList.remove('hidden');
  }
}

function logout() {
  token = null;
  currentUser = null;
  renderUI();
}

async function addAuto(e) {
  e.preventDefault();
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
  await API.addUt(token, {
    auto_rendszam: document.getElementById('utRendszam').value,
    indulas: document.getElementById('utIndulas').value,
    erkezes: document.getElementById('utErkezes').value,
    tavolsag: document.getElementById('utTav').value,
    fogyasztas: 6.5,
    honap_ev: '2026-07'
  });

  e.target.reset();
  document.getElementById('utTav').value = '';
  document.getElementById('utTav').classList.remove('border-emerald-500');
  startCoords = { lat: 0, lon: 0 };
  endCoords = { lat: 0, lon: 0 };
  loadUtak();
}

async function biralUtFizikai(id, status) {
  await API.biralUt(token, id, status);
  loadAutok();
  loadUtak();
}

function downloadCSV() {
  if (token) API.downloadCSV(token, '2026-07');
}
