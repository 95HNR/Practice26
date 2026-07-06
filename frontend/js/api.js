window.AppState = {
  token: null,
  user: null
};

// A backend szerver címe
const API_BASE_URL = 'http://localhost:3000';

const API = {
  async login(username, password) {
    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    return { ok: res.ok, data: await res.json() };
  },

  async fetchAutok(token, formDate) {
    const url = formDate ? `${API_BASE_URL}/api/autok?form_date=${formDate}` : `${API_BASE_URL}/api/autok`;
    const res = await fetch(url, { 
      headers: { 'Authorization': `Bearer ${token}` },
      cache: 'no-store'
    });
    return res.json();
  },

  async fetchUtak(token, isAdmin) {
    const endpoint = isAdmin ? `${API_BASE_URL}/api/admin/utak` : `${API_BASE_URL}/api/utak`;
    const res = await fetch(endpoint, { 
      headers: { 'Authorization': `Bearer ${token}` },
      cache: 'no-store'
    });
    return res.json();
  },

  async addAuto(token, autoData) {
    return fetch(`${API_BASE_URL}/api/admin/autok`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(autoData)
    });
  },

  async addUt(token, utData) {
    return fetch(`${API_BASE_URL}/api/utak`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(utData)
    });
  },

  async biralUt(token, id, status) {
    return fetch(`${API_BASE_URL}/api/admin/utak/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ status })
    });
  },

  async downloadCSV(token, honap) {
    const res = await fetch(`${API_BASE_URL}/api/admin/jelentes/${honap}`, { headers: { 'Authorization': `Bearer ${token}` } });
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Jelentes_${honap}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
};
