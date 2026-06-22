/** @type {import('stylelint').Config} */
export default {
  extends: [
    'stylelint-prettier/recommended',
    'stylelint-config-standard',
    'stylelint-config-recommended-vue',
  ],
  ignoreFiles: [
    '**/node_modules/**',
    '**/dist/**',
    '**/.nuxt/**',
    '**/.output/**',
    '**/.next/**',
    '**/coverage/**',
  ],
  rules: {
    'prettier/prettier': true,
    // 프로젝트 표준은 BEM(block__element--modifier, kebab-case). 순수 kebab만 강제하는
    // config-standard 기본값을 BEM 허용 패턴으로 완화(scss-bem 스킬 표준과 정렬).
    'selector-class-pattern': [
      '^[a-z][a-z0-9]*(-[a-z0-9]+)*(__[a-z0-9]*(-[a-z0-9]+)*)?(--[a-z0-9]*(-[a-z0-9]+)*)?$',
      {
        message:
          'Expected class selector to be kebab-case BEM (block__element--modifier)',
      },
    ],
    'selector-pseudo-element-no-unknown': [
      true,
      {
        ignorePseudoElements: ['v-deep'], // v-deep custom pseudo selector 사용 가능
      },
    ],
    'selector-pseudo-class-no-unknown': [
      true,
      {
        ignorePseudoClasses: ['deep', 'slotted', 'global', 'export'], // Vue scoped + CSS Modules pseudo
      },
    ],
  },
  overrides: [
    {
      files: ['**/*.vue'],
      rules: {
        'declaration-property-value-no-unknown': null,
      },
    },
  ],
};
