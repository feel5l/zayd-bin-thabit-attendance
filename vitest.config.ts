import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    environmentMatchGlobs: [
      ['tests/crossTabSync.test.ts', 'happy-dom'],
      ['tests/applyServerSubmissions.test.ts', 'happy-dom'],
      ['tests/deviceAuth.test.ts', 'happy-dom'],
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
