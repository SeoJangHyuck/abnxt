import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const dir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      // 더 구체적인 서브패스를 먼저(vite alias는 prefix 치환).
      '@abnxt/core/admin': resolve(dir, '../core/src/admin/index.ts'),
      '@abnxt/core/server': resolve(dir, '../core/src/server.ts'),
      '@abnxt/core': resolve(dir, '../core/src/index.ts'),
      // Nuxt/Nitro 가상 모듈 — 단위 테스트에서는 스텁으로 해소.
      '#imports': resolve(dir, 'test/stubs/imports.ts'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
