import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // Web/Vercel needs absolute paths; Capacitor APK needs relative paths.
  base: mode === 'capacitor' ? './' : '/',
  // Local dev: proxies match production paths. For Vercel + Render, set VITE_BACKEND_ORIGIN (see .env.example).
  server: {
    port: 5175,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
}));
