import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { index: 'src/index.ts', bin: 'src/bin.ts' },
  format: ['esm'],
  // index만 .d.ts 생성(bin은 실행 진입점이라 타입 불필요).
  dts: { entry: { index: 'src/index.ts' } },
  clean: true,
  sourcemap: true,
  // bin.ts 최상단의 #!/usr/bin/env node shebang은 esbuild가 엔트리에 한해 보존.
});
