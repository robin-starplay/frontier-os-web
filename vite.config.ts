import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, loadEnv } from 'vite';

/**
 * Standalone Vite config for frontier-os-web.
 *
 * Environment variables (set in .env or hosting provider):
 *   VITE_FRONTIER_API_BASE_URL  — Railway/backend base URL (no trailing slash)
 *   VITE_CLERK_PUBLISHABLE_KEY  — Clerk publishable key (pk_test_... or pk_live_...)
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, import.meta.dirname, '');
  const frontierApiBaseUrl = (env.VITE_FRONTIER_API_BASE_URL || '').replace(/\/$/, '');

  return {
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
      proxy: frontierApiBaseUrl
        ? {
            '/api': {
              target: frontierApiBaseUrl,
              changeOrigin: true,
              secure: true,
            },
          }
        : undefined,
    },
    preview: {
      port: 4173,
      host: '0.0.0.0',
    },
  };
});
