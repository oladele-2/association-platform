import { defineConfig } from 'astro/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  site: 'https://nmaogun.com.ng',
  output: 'static',
  trailingSlash: 'never',
  build: { format: 'directory', inlineStylesheets: 'always' },
  devToolbar: { enabled: false },
  server: { host: '127.0.0.1', port: 4322 },
  vite: {
    resolve: {
      alias: {
        '#review-portraits': fileURLToPath(
          new URL('./src/data/portraits.empty.ts', import.meta.url),
        ),
      },
    },
  },
});
