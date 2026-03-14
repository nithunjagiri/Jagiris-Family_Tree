import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('jagiris_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('jagiris_token');
      localStorage.removeItem('jagiris_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
};

export const familyMembersApi = {
  list: () => api.get('/family-members'),
  get: (id) => api.get(`/family-members/${id}`),
  create: (data, file) => {
    const form = new FormData();
    Object.entries(data).forEach(([k, v]) => { if (v != null && v !== '') form.append(k, v); });
    if (file) form.append('profile_photo', file);
    return api.post('/family-members', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  update: (id, data, file) => {
    const form = new FormData();
    Object.entries(data).forEach(([k, v]) => { if (v != null && v !== '') form.append(k, v); });
    if (file) form.append('profile_photo', file);
    return api.put(`/family-members/${id}`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  delete: (id) => api.delete(`/family-members/${id}`),
};

export const photosApi = {
  list: () => api.get('/photos'),
  upload: (file, title) => {
    const form = new FormData();
    form.append('image', file);
    if (title) form.append('title', title);
    return api.post('/photos', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  delete: (id) => api.delete(`/photos/${id}`),
};

export const eventsApi = {
  list: (upcoming) => api.get('/events', { params: upcoming ? { upcoming: 'true' } : {} }),
  add: (data) => api.post('/events', data),
};

export const familyTreeApi = {
  get: () => api.get('/family-tree'),
};

export default api;
