import { defineConfig } from 'astro/config';
import { fileURLToPath } from 'node:url';
import config from './astro.config.mjs';

export default defineConfig({
  ...config,
  vite: {
    resolve: {
      alias: {
        '#review-portraits': fileURLToPath(
          new URL('./src/data/portraits.review.ts', import.meta.url),
        ),
      },
    },
  },
});
