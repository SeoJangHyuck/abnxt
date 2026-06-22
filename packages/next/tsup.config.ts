import { defineConfig } from 'tsup';
import { preserveDirectivesPlugin } from 'esbuild-plugin-preserve-directives';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    server: 'src/server.ts',
    admin: 'src/admin/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  // splitting:false → 각 진입점 자기완결. 'use client'가 진입점 최상단에 보존되고
  // (공유 청크로 분리되지 않음), 서버 진입점엔 클라 코드가 섞이지 않는다(@abnxt/next external).
  splitting: false,
  metafile: true,
  external: [
    'react',
    'react-dom',
    'next',
    '@abnxt/core',
    '@abnxt/core/server',
    '@abnxt/core/admin',
    '@abnxt/next',
  ],
  esbuildPlugins: [
    preserveDirectivesPlugin({
      directives: ['use client'],
      include: /\.(ts|tsx)$/,
      exclude: /node_modules/,
    }),
  ],
});
