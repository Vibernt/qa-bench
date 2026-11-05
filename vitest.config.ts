import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['**/*.test.ts'],
    exclude: ['node_modules/**', 'apps/*/upstream/**', 'runs/**', '**/node_modules/**'],
  },
});
