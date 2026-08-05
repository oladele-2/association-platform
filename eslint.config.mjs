import nestjs from '@association/eslint-config/nestjs';

/** Root flat config so lint-staged can resolve ESLint from the repo root. */
export default [
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/coverage/**',
      '**/.turbo/**',
      'apps/web/**',
      'apps/portal/**',
      'apps/platform/**',
      'mobile/**',
      '**/*.astro',
    ],
  },
  ...nestjs,
];
