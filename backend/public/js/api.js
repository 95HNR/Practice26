window.AppState = {
  token: null,
  user: null
};

const API = {
  async login(username, password) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    return { ok: res.ok, data: await res.json() };
  },

  async fetchAutok(token, formDate) {
    // Ha van megadva dátum, paraméterként fűzzük hozzá az URL-hez
    const url = formDate ? `/api/autok?form_date=${formDate}` : '/api/autok';
    const res = await fetch(url, { 
      headers: { 'Authorization': `Bearer ${token}` },
      cache: 'no-store'
    });
    return res.json();
  },

  async fetchUtak(token, isAdmin) {
    const endpoint = isAdmin ? '/api/admin/utak' : '/api/utak';
    const res = await fetch(endpoint, { 
      headers: { 'Authorization': `Bearer ${token}` },
      cache: 'no-store'
    });
    return res.json();
  },

  async addAuto(token, autoData) {
    return fetch('/api/admin/autok', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(autoData)
    });
  },

  async addUt(token, utData) {
    return fetch('/api/utak', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(utData)
    });
  },

  async biralUt(token, id, status) {
    return fetch(`/api/admin/utak/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ status })
    });
  },

  async downloadCSV(token, honap) {
    const res = await fetch(`/api/admin/jelentes/${honap}`, { headers: { 'Authorization': `Bearer ${token}` } });
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
