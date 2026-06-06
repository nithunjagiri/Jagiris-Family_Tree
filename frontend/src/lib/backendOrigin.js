/**
 * Split deployment (Vercel UI + Render API): set VITE_BACKEND_ORIGIN to the public URL of your
 * Node server (no trailing slash), e.g. https://your-app.onrender.com
 *
 * Local dev: leave unset — Vite proxies /api and /uploads (see vite.config.js).
 */
export function getBackendOrigin() {
  const raw = import.meta.env.VITE_BACKEND_ORIGIN;
  if (raw == null || String(raw).trim() === '') return '';
  return String(raw).trim().replace(/\/$/, '');
}

/** Axios base URL: same-origin /api (proxied in dev) or absolute when VITE_BACKEND_ORIGIN is set. */
export function getApiBaseURL() {
  const origin = getBackendOrigin();
  return origin ? `${origin}/api` : '/api';
}

/**
 * API stores paths like /uploads/profiles/.... When the SPA is on another host (Vercel), prefix
 * the Render origin so <img src> resolves to the server that serves static files.
 */
export function resolveBackendPublicUrl(path) {
  if (path == null || path === '') return path;
  const p = String(path);
  if (/^https?:\/\//i.test(p)) return p;
  const origin = getBackendOrigin();
  if (!origin) return p;
  if (p.startsWith('/uploads')) return `${origin}${p}`;
  return p;
}
