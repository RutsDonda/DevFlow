import axios from 'axios';
import { auth } from '../config/firebase';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

/** Fresh Firebase ID token for the signed-in user (the SDK refreshes it automatically). */
const getToken = async () => (auth.currentUser ? auth.currentUser.getIdToken() : null);

/** FastAPI errors look like {detail: "..."} or {detail: [{msg: "..."}]} for validation errors. */
const errorMessage = (data, fallback = 'An unexpected error occurred') => {
  const detail = data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail.length) return detail.map((d) => d.msg).join(', ');
  return fallback;
};

const api = axios.create({ baseURL: API_BASE_URL });

api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    let data = error.response?.data;
    if (data instanceof Blob) {
      try { data = JSON.parse(await data.text()); } catch { data = null; }
    }
    if (!error.response) return Promise.reject(new Error('Cannot reach the server. Is the backend running?'));
    const err = new Error(errorMessage(data));
    err.status = error.response.status;
    return Promise.reject(err);
  },
);

export const healthAPI = {
  check: () => api.get('/health'),
};

export const authAPI = {
  /** Public: is there an account for this email? */
  checkEmail: (email) => api.post('/auth/check-email', { email }),
  /** Create the account for the signed-in Firebase user (idempotent). */
  register: (displayName) => api.post('/auth/register', displayName ? { display_name: displayName } : {}),
  /** Sign in an existing account; rejects with status 404 if the user never signed up. */
  login: () => api.post('/auth/login'),
  me: () => api.get('/auth/me'),
  deleteMyData: () => api.delete('/auth/me'),
};

export const threadAPI = {
  list: () => api.get('/threads'),
  get: (id) => api.get(`/threads/${id}`),
  rename: (id, title) => api.patch(`/threads/${id}`, { title }),
  pin: (id, pinned) => api.patch(`/threads/${id}`, { pinned }),
  remove: (id) => api.delete(`/threads/${id}`),
};

export const documentAPI = {
  list: () => api.get('/documents'),
  upload: (files, onProgress) => {
    const form = new FormData();
    Array.from(files).forEach((f) => form.append('files', f));
    return api.post('/documents', form, {
      onUploadProgress: (e) => onProgress?.(e.total ? Math.round((e.loaded / e.total) * 100) : 0),
    });
  },
  remove: (id) => api.delete(`/documents/${id}`),
};

export const projectAPI = {
  list: () => api.get('/projects'),
  get: (id) => api.get(`/projects/${id}`),
  remove: (id) => api.delete(`/projects/${id}`),
  download: (id) => api.get(`/projects/${id}/download`, { responseType: 'blob' }),
};

/**
 * Send a message to the multi-agent system and receive Server-Sent Events.
 * `agent` pins a worker (rag_agent | coding_agent | architect_agent); omit for Auto.
 * `documentIds` attaches uploaded documents to the message.
 * Events: thread | route | tool | token | done | error  (see backend app/services/chat.py)
 */
export async function streamChat({ message, threadId, agent, documentIds = [] }, onEvent, signal) {
  const token = await getToken();
  let res;
  try {
    res = await fetch(`${API_BASE_URL}/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ message, thread_id: threadId || null, agent: agent || null, document_ids: documentIds }),
      signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new Error('Cannot reach the server. Is the backend running?');
  }
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(errorMessage(data, `Request failed (${res.status})`));
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let boundary;
    while ((boundary = buffer.indexOf('\n\n')) >= 0) {
      const raw = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      const line = raw.split('\n').find((l) => l.startsWith('data: '));
      if (line) onEvent(JSON.parse(line.slice(6)));
    }
  }
}

export default api;
