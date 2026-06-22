// @ts-check
import eslint from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import pluginVue from 'eslint-plugin-vue';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-plugin-prettier/recommended';

/**
 * 공유 무시 패턴 - 빌드 산출물 / 의존성 / 프레임워크 캐시
 */
export const sharedIgnores = [
  '**/dist/**',
  '**/.nuxt/**',
  '**/.output/**',
  '**/.next/**',
  '**/coverage/**',
  '**/node_modules/**',
  '**/*.tsbuildinfo',
  '**/next-env.d.ts', // Next.js 자동 생성
  '.claude/skills/**', // 외부 소스 스킬 (린트/포맷 대상 아님)
];

/**
 * 공유 규칙 - 계층 구조: typescript → vue (ts 상속)
 */

/** @type {import('eslint').Linter.RulesRecord} */
const typescriptRules = {
  'no-console': 'off',
  // 단일 할당 전에 값을 읽는(undefined 관찰 후 할당) 정당한 패턴 허용
  'prefer-const': ['error', { ignoreReadBeforeAssign: true }],
  '@typescript-eslint/no-explicit-any': 'off',
  '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
};

/** @type {import('eslint').Linter.RulesRecord} */
const vueRules = {
  ...typescriptRules,
  'no-undef': 'off', // SFC <script>는 TS가 미정의 변수를 검사 (브라우저 globals 오탐 방지)
  'vue/no-v-html': 'off',
  'vue/multi-word-component-names': 'off',
  'vue/require-default-prop': 'off',
};

export default defineConfig([
  // 전역 무시 패턴
  { ignores: sharedIgnores },

  // 전역 환경 - 브라우저(react/vue 클라이언트) + node(cli/server/스크립트)
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },

  // ESLint 기본 규칙
  eslint.configs.recommended,

  // TypeScript 추천 규칙
  tseslint.configs.recommended,

  // TypeScript 파일 커스텀 규칙
  {
    files: ['**/*.{ts,tsx,mts,cts}'],
    rules: typescriptRules,
  },

  // Vue SFC - eslint-plugin-vue flat config (vue-eslint-parser 포함)
  ...pluginVue.configs['flat/recommended'],
  {
    files: ['**/*.vue'],
    languageOptions: {
      // <script lang="ts"> 파싱을 위해 vue-eslint-parser 내부 파서를 ts로 지정
      parserOptions: { parser: tseslint.parser },
    },
    rules: vueRules,
  },

  // React Hooks - tsx/jsx 안전성 (검증된 핵심 규칙만; v7 실험적 refs 규칙은 제외)
  {
    files: ['**/*.{jsx,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },

  // 테스트 파일 - 인라인 테스트 컴포넌트 다수 정의 허용
  {
    files: ['**/*.{test,spec}.{ts,tsx,js,jsx}'],
    rules: {
      'vue/one-component-per-file': 'off',
    },
  },

  // Prettier 통합 (항상 마지막 - 충돌 규칙 off)
  prettier,
]);
