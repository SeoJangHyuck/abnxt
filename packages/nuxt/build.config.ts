import { defineBuildConfig } from 'unbuild';

export default defineBuildConfig({
  // @nuxt/module-builder가 기본 프리셋을 적용. core/런타임 가상 모듈을 external로.
  externals: [
    '@abnxt/core',
    'nuxt',
    'nuxt/app',
    'vue',
    'h3',
    '#imports',
    '#app',
  ],
});
