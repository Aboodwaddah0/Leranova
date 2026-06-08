import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Vite plugin — reads src/sw/firebase-messaging-sw.js, replaces %VITE_*% tokens
 * with the actual env values, then:
 *   • dev  : serves the result at /firebase-messaging-sw.js via dev-server middleware
 *   • build: emits the result as a root-level asset so it lands at /firebase-messaging-sw.js
 */
function firebaseSwPlugin(env) {
  const swTemplate = resolve(__dirname, 'src/sw/firebase-messaging-sw.js');

  const inject = (src) =>
    src.replace(/%VITE_([A-Z0-9_]+)%/g, (_, key) => env[`VITE_${key}`] ?? '');

  return {
    name: 'firebase-sw-inject',

    configureServer(server) {
      server.middlewares.use('/firebase-messaging-sw.js', (_req, res) => {
        const src = readFileSync(swTemplate, 'utf-8');
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        res.setHeader('Service-Worker-Allowed', '/');
        res.end(inject(src));
      });
    },

    generateBundle() {
      const src = readFileSync(swTemplate, 'utf-8');
      this.emitFile({
        type: 'asset',
        fileName: 'firebase-messaging-sw.js',
        source: inject(src),
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      firebaseSwPlugin(env),
    ],
  };
});
