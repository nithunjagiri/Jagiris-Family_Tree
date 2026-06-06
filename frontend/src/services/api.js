import axios from 'axios';
import { getApiBaseURL } from '../lib/backendOrigin';

const api = axios.create({
  baseURL: getApiBaseURL(),
  headers: { 'Content-Type': 'application/json' },
});

const ACTIVE_FAMILY_KEY = 'jagiris_active_family_id';

export function getActiveFamilyId() {
  const raw = localStorage.getItem(ACTIVE_FAMILY_KEY);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export function setActiveFamilyId(familyId) {
  if (!familyId) {
    localStorage.removeItem(ACTIVE_FAMILY_KEY);
    return;
  }
  localStorage.setItem(ACTIVE_FAMILY_KEY, String(familyId));
}

/**
 * Pick the shared family workspace for API headers: prefer the membership with the most
 * `member_count` (from `/api/account/families`), then name hints, then stable id order.
 * Falls back to name-only heuristics when counts are absent (older server).
 */
export function resolveJagirisFamilyId(families) {
  const rows = Array.isArray(families) ? families : [];
  if (rows.length === 0) return null;
  const norm = (s) => String(s ?? '').trim().toLowerCase();
  const hasCounts = rows.some((f) => Number(f.member_count) > 0);

  if (hasCounts) {
    const withCounts = rows.map((f) => ({
      ...f,
      member_count: Number(f.member_count) || 0,
    }));
    const maxC = Math.max(...withCounts.map((f) => f.member_count));
    const candidates = withCounts.filter((f) => f.member_count === maxC);
    if (candidates.length === 1) return Number(candidates[0].family_id);
    const exact = candidates.find((f) => norm(f.name) === 'jagiris family');
    if (exact) return Number(exact.family_id);
    const fuzzy = candidates.find((f) => norm(f.name).includes('jagiris'));
    if (fuzzy) return Number(fuzzy.family_id);
    return Number(
      candidates.slice().sort((a, b) => Number(a.family_id) - Number(b.family_id))[0].family_id
    );
  }

  const exact = rows.find((f) => norm(f.name) === 'jagiris family');
  if (exact) return Number(exact.family_id);
  const fuzzy = rows.find((f) => norm(f.name).includes('jagiris'));
  if (fuzzy) return Number(fuzzy.family_id);
  return Number(rows[0].family_id);
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('jagiris_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  const familyId = getActiveFamilyId();
  if (familyId) config.headers['x-family-id'] = String(familyId);
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      const url = String(err.config?.url || '');
      const isAuthAttempt =
        url.includes('auth/login') ||
        url.includes('auth/register') ||
        url.includes('auth/forgot-password') ||
        url.includes('auth/reset-password');
      if (!isAuthAttempt) {
        localStorage.removeItem('jagiris_token');
        localStorage.removeItem('jagiris_user');
        localStorage.removeItem(ACTIVE_FAMILY_KEY);
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  resetPasswordWithOtp: (data) => api.post('/auth/reset-password-otp', data),
};

export const familyMembersApi = {
  list: () => api.get('/family-members'),
  get: (id) => api.get(`/family-members/${id}`),
  create: (data, file) => {
    const form = new FormData();
    Object.entries(data).forEach(([k, v]) => {
      if (k === 'is_alive') return;
      if (v == null || v === '') return;
      if (k === 'father_id' || k === 'mother_id' || k === 'spouse_id') {
        form.append(k, String(v));
        return;
      }
      form.append(k, v);
    });
    form.append(
      'is_alive',
      data.is_alive && String(data.is_alive).toLowerCase() === 'no' ? 'No' : 'Yes'
    );
    if (file) form.append('profile_photo', file);
    return api.post('/family-members', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  update: (id, data, file) => {
    if (!file) {
      return api.put(`/family-members/${id}`, data);
    }
    const form = new FormData();
    Object.entries(data).forEach(([k, v]) => {
      if (k === 'is_alive') return;
      form.append(k, v != null && v !== '' ? v : '');
    });
    form.append(
      'is_alive',
      data.is_alive && String(data.is_alive).toLowerCase() === 'no' ? 'No' : 'Yes'
    );
    form.append('profile_photo', file);
    return api.put(`/family-members/${id}`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  delete: (id) => api.delete(`/family-members/${id}`),
};

export const photosApi = {
  list: () => api.get('/photos'),
  upload: (files, title) => {
    const form = new FormData();
    const fileList = Array.isArray(files) ? files : [files];
    for (const file of fileList) {
      form.append('images', file);
    }
    if (title) form.append('title', title);
    return api.post('/photos', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  delete: (id) => api.delete(`/photos/${id}`),
};

export const eventsApi = {
  list: (upcoming) => api.get('/events', { params: upcoming ? { upcoming: 'true' } : {} }),
  add: (data, imageFile) => {
    if (!imageFile) return api.post('/events', data);
    const form = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') form.append(key, value);
    });
    form.append('image', imageFile);
    return api.post('/events', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};

export const familyTreeApi = {
  get: () => api.get('/family-tree'),
};

export const placesApi = {
  list: () => api.get('/places'),
  membersByPlace: (place) => api.get('/places/members-by-place', { params: { place } }),
  create: (data) => api.post('/places', data),
  remove: (id) => api.delete(`/places/${id}`),
};

export const searchApi = {
  search: (q) => api.get('/search', { params: { q } }),
};

export const accountApi = {
  getPrivacySettings: () => api.get('/account/privacy'),
  updateProfile: (data, photoFile) => {
    if (photoFile || data.remove_profile_photo) {
      const form = new FormData();
      Object.entries(data).forEach(([key, val]) => {
        if (val !== undefined) form.append(key, val);
      });
      if (photoFile) form.append('profile_photo', photoFile);
      return api.patch('/account/profile', form, { headers: { 'Content-Type': 'multipart/form-data' } });
    }
    return api.patch('/account/profile', data);
  },
  acknowledgePrivacyNotice: () => api.patch('/account/privacy', { acknowledgePrivacyNotice: true }),
  changePassword: (data) => api.post('/account/change-password', data),
  exportData: () => api.get('/account/export', { responseType: 'blob' }),
  listFamilies: () => api.get('/account/families'),
  deleteAccount: (data) => api.post('/account/delete-account', data),
};

export const notificationsApi = {
  registerToken: (token, platform = 'android') =>
    api.post('/notifications/token', { token, platform }),
  unregisterToken: (token) =>
    api.delete('/notifications/token', { data: { token } }),
  listAnnouncements: (params) =>
    api.get('/notifications/announcements', { params }),
  createAnnouncement: (data) =>
    api.post('/notifications/announcements', data),
  deleteAnnouncement: (id) =>
    api.delete(`/notifications/announcements/${id}`),
};

export const adminApi = {
  auditLogs: (params) => api.get('/admin/audit-logs', { params }),
  users: (params) => api.get('/admin/users', { params }),
  getUser: (id) => api.get(`/admin/users/${id}`),
  createUser: (data) => api.post('/admin/users', data),
  patchUser: (id, data) => api.patch(`/admin/users/${id}`, data),
  resetUserPassword: (id, data) => api.post(`/admin/users/${id}/reset-password`, data),
  deactivateUser: (id) => api.post(`/admin/users/${id}/deactivate`),
  activateUser: (id) => api.post(`/admin/users/${id}/activate`),
};

export default api;
