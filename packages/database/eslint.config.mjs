import config from '@association/eslint-config/base';

export default [
  ...config,
  {
    ignores: ['**/prisma/migrations/**', '**/src/generated/**'],
  },
];
