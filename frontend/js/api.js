window.AppState = { token: null, user: null };
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

  async registerUser(username, password, role) { 
    const res = await fetch(`${API_BASE_URL}/api/auth/register`, { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ username, password, role }) 
    }); 
    return { ok: res.ok, data: await res.json() }; 
  },

  async fetchAutok(token, formDate) { 
    const res = await fetch(formDate ? `${API_BASE_URL}/api/autok?form_date=${formDate}` : `${API_BASE_URL}/api/autok`, { 
      headers: { 'Authorization': `Bearer ${token}` }, 
      cache: 'no-store' 
    }); 
    return res.json(); 
  },

  async fetchUtak(token, isAdmin, honap) { 
    const baseEndpoint = isAdmin ? `${API_BASE_URL}/api/admin/utak` : `${API_BASE_URL}/api/utak`; 
    const url = honap ? `${baseEndpoint}?honap=${honap}` : baseEndpoint; 
    const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` }, cache: 'no-store' }); 
    return res.json(); 
  },

  async fetchAlerts(token) { 
    const res = await fetch(`${API_BASE_URL}/api/admin/riasztasok`, { 
      headers: { 'Authorization': `Bearer ${token}` }, 
      cache: 'no-store' 
    }); 
    if(res.ok) return await res.json(); 
    return []; 
  },

  async fetchAktivFlotta(token) { 
    const res = await fetch(`${API_BASE_URL}/api/admin/aktiv-flotta`, { 
      headers: { 'Authorization': `Bearer ${token}` }, 
      cache: 'no-store' 
    }); 
    return res.json(); 
  },

  async fetchAudit(token) { 
    const res = await fetch(`${API_BASE_URL}/api/admin/audit`, { 
      headers: { 'Authorization': `Bearer ${token}` } 
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

  async deleteAuto(token, rendszam) { 
    const res = await fetch(`${API_BASE_URL}/api/admin/autok/${rendszam}`, { 
      method: 'DELETE', 
      headers: { 'Authorization': `Bearer ${token}` } 
    }); 
    return { ok: res.ok, data: await res.json() }; 
  },

  async updateAuto(token, rendszam, autoData) { 
    return fetch(`${API_BASE_URL}/api/admin/autok/${rendszam}`, { 
      method: 'PATCH', 
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, 
      body: JSON.stringify(autoData) 
    }); 
  },

  async fetchSzerviz(token, rendszam) { 
    const res = await fetch(`${API_BASE_URL}/api/admin/szerviz/${rendszam}`, { 
      headers: { 'Authorization': `Bearer ${token}` }, 
      cache: 'no-store' 
    }); 
    return res.json(); 
  },

  async addSzerviz(token, szervizData) { 
    return fetch(`${API_BASE_URL}/api/admin/szerviz`, { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, 
      body: JSON.stringify(szervizData) 
    }); 
  },

  async addUt(token, utData) { 
    const res = await fetch(`${API_BASE_URL}/api/utak`, { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, 
      body: JSON.stringify(utData) 
    }); 
    return { ok: res.ok, data: await res.json() };
  },

  async lezarUt(token, id, adatok) { 
    const res = await fetch(`${API_BASE_URL}/api/utak/${id}/lezar`, { 
      method: 'PATCH', 
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, 
      body: JSON.stringify(adatok) 
    }); 
    return { ok: res.ok, data: await res.json() };
  },

  async biralUt(token, id, status) { 
    return fetch(`${API_BASE_URL}/api/admin/utak/${id}`, { 
      method: 'PATCH', 
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, 
      body: JSON.stringify({ status }) 
    }); 
  },

  async downloadCSV(token, honap) { 
    const res = await fetch(`${API_BASE_URL}/api/admin/jelentes/${honap}`, { 
      headers: { 'Authorization': `Bearer ${token}` } 
    }); 
    const blob = await res.blob(); 
    const a = document.createElement('a'); 
    a.href = window.URL.createObjectURL(blob); 
    a.download = `Jelentes_${honap}.csv`; 
    document.body.appendChild(a); 
    a.click(); 
    a.remove(); 
  }
};