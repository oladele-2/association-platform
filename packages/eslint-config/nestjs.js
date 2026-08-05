import { base } from './base.js';

/** Nest-friendly overrides (decorators, DI). */
export default [
  ...base,
  {
    rules: {
      '@typescript-eslint/no-extraneous-class': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
    },
  },
];
