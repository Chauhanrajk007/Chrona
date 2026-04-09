const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000';

function getHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('chrona_token') : null;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function handleResponse(res) {
  if (res.status === 401) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('chrona_token');
      localStorage.removeItem('chrona_user_id');
      localStorage.removeItem('chrona_username');
      window.location.href = '/login';
    }
    throw new Error('Session expired');
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || data.error || 'Request failed');
  return data;
}

const api = {
  async get(path) {
    const res = await fetch(`${API_BASE}${path}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  async post(path, body) {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(body),
    });
    return handleResponse(res);
  },

  async postFormData(path, formData) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('chrona_token') : null;
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    // Do NOT set Content-Type — browser sets it with boundary
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers,
      body: formData,
    });
    return handleResponse(res);
  },
};

export default api;
