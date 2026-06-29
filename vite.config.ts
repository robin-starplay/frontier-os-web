import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

/**
 * Standalone Vite config for frontier-os-web.
 *
 * Environment variables (set in .env or hosting provider):
 *   VITE_FRONTIER_API_BASE_URL  — Railway/backend base URL (no trailing slash)
 *   VITE_CLERK_PUBLISHABLE_KEY  — Clerk publishable key (pk_test_... or pk_live_...)
 */
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
    },
    dedupe: ['react', 'react-dom'],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist'),
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    open: true,
    proxy: {
      // Optional: proxy /api calls to a local backend during development
      // '/api': {
      //   target: 'http://localhost:8080',
      //   changeOrigin: true,
      // },
    },
  },
  preview: {
    port: 4173,
    host: '0.0.0.0',
  },
});
