import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const dir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      // 더 구체적인 서브패스를 먼저(vite alias는 prefix 치환).
      '@abnxt/core/server': resolve(dir, '../core/src/server.ts'),
      '@abnxt/core/admin': resolve(dir, '../core/src/admin/index.ts'),
      '@abnxt/core': resolve(dir, '../core/src/index.ts'),
      '@abnxt/next': resolve(dir, './src/index.ts'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
