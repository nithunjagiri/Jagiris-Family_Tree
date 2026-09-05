/**
 * CORS allow-list for production. Set CORS_ORIGINS or FRONTEND_ORIGIN (comma-separated).
 * Capacitor Android WebView often sends no Origin or a capacitor/https origin.
 */
function parseOriginList(raw) {
  return String(raw || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function defaultAllowedOrigins() {
  return [
    'https://jagiris-family.vercel.app',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'https://localhost',
    'capacitor://localhost',
    'http://localhost',
  ];
}

function getAllowedOrigins() {
  const fromEnv = [
    ...parseOriginList(process.env.CORS_ORIGINS),
    ...parseOriginList(process.env.FRONTEND_ORIGIN),
  ];
  const merged = [...new Set([...fromEnv, ...defaultAllowedOrigins()])];
  return merged;
}

function corsOptions() {
  const allowed = getAllowedOrigins();
  return {
    origin(origin, callback) {
      // Same-origin / native / curl / server-to-server: no Origin header
      if (!origin) return callback(null, true);
      if (allowed.includes(origin)) return callback(null, true);
      if (process.env.NODE_ENV !== 'production') return callback(null, true);
      console.warn(`[cors] Blocked origin: ${origin}`);
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  };
}

module.exports = { corsOptions, getAllowedOrigins };
