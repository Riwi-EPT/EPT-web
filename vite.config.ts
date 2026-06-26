import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

// In dev the SPA and API run on different ports. Proxying /api and /lti to the
// API keeps requests same-origin during development (so session cookies work and
// no CORS dance is needed). In production the SPA calls the API's own origin,
// configured via VITE_API_BASE_URL and allowed by the API's CORS config.
const API_TARGET = process.env.API_TARGET ?? 'http://localhost:3000';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      allowedHosts: ['127.0.0.1:4040', 'imaging-postcard-snowshoe.ngrok-free.dev', 'localhost'],
      proxy: {
        '/api': { target: API_TARGET, changeOrigin: true },
        '/lti': { target: API_TARGET, changeOrigin: true },
      },
    },
  };
});
