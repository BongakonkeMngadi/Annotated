const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4010/api';

async function getToken() {
  const mod = await import('./firebase.js');
  if (!mod.auth?.currentUser) return '';
  return mod.auth.currentUser.getIdToken();
}

async function apiFetch(path, options = {}) {
  const token = await getToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok === false) {
    throw new Error(data.error || `Request failed: ${response.status}`);
  }
  return data;
}

async function uploadFetch(path, formData) {
  const token = await getToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok === false) {
    throw new Error(data.error || `Request failed: ${response.status}`);
  }
  return data;
}

async function uploadAsset(file, kind = 'asset', metadata = {}) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('kind', kind);
  if (metadata.type) formData.append('type', metadata.type);
  if (metadata.mediaStart) formData.append('mediaStart', metadata.mediaStart);
  if (metadata.mediaEnd) formData.append('mediaEnd', metadata.mediaEnd);
  return uploadFetch('/uploads/asset', formData);
}

export const api = {
  health: () => apiFetch('/health'),
  assist: (payload) => apiFetch('/ai/assist', { method: 'POST', body: JSON.stringify(payload) }),
  improveCommentary: (payload) => apiFetch('/ai/improve-commentary', { method: 'POST', body: JSON.stringify(payload) }),
  uploadAsset,
  listAnnotations: () => apiFetch('/annotations'),
  clearAnnotations: () => apiFetch('/annotations', { method: 'DELETE' }),
  createAnnotation: (payload) => apiFetch('/annotations', { method: 'POST', body: JSON.stringify(payload) }),
  getAnnotation: (id) => apiFetch(`/annotations/${id}`),
  removeAnnotation: (id) => apiFetch(`/annotations/${id}`, { method: 'DELETE' }),
  addComment: (id, payload) => apiFetch(`/annotations/${id}/comments`, { method: 'POST', body: JSON.stringify(payload) }),
  likeAnnotation: (id) => apiFetch(`/annotations/${id}/like`, { method: 'POST', body: JSON.stringify({}) }),
  fileClaim: (id, payload) => apiFetch(`/annotations/${id}/claims`, { method: 'POST', body: JSON.stringify(payload) }),
  upsertMe: (payload) => apiFetch('/users/me', { method: 'POST', body: JSON.stringify(payload) }),
  followUser: (id) => apiFetch(`/users/${id}/follow`, { method: 'POST', body: JSON.stringify({}) }),
  userAnnotations: (id) => apiFetch(`/users/${id}/annotations`),
};

export { API_BASE_URL };
