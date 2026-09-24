import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

import runtimeErrorOverlay from '@replit/vite-plugin-runtime-error-modal';

// PORT is only consumed by the dev-server and preview-server blocks below.
// `vite build` never reads those blocks, so PORT is not required during a
// production build. Default to 5173 (Vite's own default) so the config loads
// cleanly in any environment that does not set PORT.
const rawPort = process.env.PORT;
const port = rawPort ? Number(rawPort) : 5173;

// BASE_PATH sets the asset URL prefix. Default to "/" when not provided (the
// correct value for a root-mounted production build).
const basePath = process.env.BASE_PATH || '/';
const apiServerUrl = process.env.API_SERVER_URL;

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss({ optimize: false }),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== 'production' &&
    process.env.REPL_ID !== undefined
      ? [
          await import('@replit/vite-plugin-cartographer').then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, '..'),
            }),
          ),
          await import('@replit/vite-plugin-dev-banner').then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      '@assets': path.resolve(
        import.meta.dirname,
        '..',
        '..',
        'attached_assets',
      ),
    },
    dedupe: ['react', 'react-dom'],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist/public'),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: '0.0.0.0',
    allowedHosts: true,
    ...(apiServerUrl
      ? {
          proxy: {
            '/api': {
              target: apiServerUrl,
              changeOrigin: false,
            },
          },
        }
      : {}),
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: '0.0.0.0',
    allowedHosts: true,
  },
});
