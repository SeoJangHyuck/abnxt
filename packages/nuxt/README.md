# @abnxt/nuxt

> [abnxt](https://github.com/SeoJangHyuck/abnxt)의 Nuxt 4 모듈 어댑터 + 네이티브 어드민.

DB·Redis 없이 정적 config + 쿠키 + Nitro 미들웨어만으로 동작하는 프론트엔드 A/B 테스트 툴입니다. SSR에서 깜빡임(FOOC) 없이 변이를 렌더합니다.

## 설치

```bash
pnpm add @abnxt/nuxt @abnxt/core
```

`nuxt`(^4) · `vue`(^3.5)는 peer 의존성입니다.

가장 쉬운 방법은 CLI 스캐폴딩입니다:

```bash
npx abnxt init
```

## 사용

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@abnxt/nuxt'],
  abnxt: { admin: { enabled: true }, adminKey: process.env.ABNXT_ADMIN_KEY },
});
```

모듈이 `<Experiment>`·`<AbnxtAdmin>` 컴포넌트, `useExperiment` 컴포저블, 어드민 페이지(`/abnxt-admin`)와 서버 라우트를 자동 주입합니다.

```vue
<script setup lang="ts">
const { variant, isReady } = useExperiment('homepage-hero');
</script>

<template>
  <Experiment name="homepage-hero">
    <template #A><HeroA /></template>
    <template #B><HeroB /></template>
  </Experiment>
</template>
```

## 진입점

| Export               | 내용                                                  |
| -------------------- | ----------------------------------------------------- |
| `@abnxt/nuxt`        | Nuxt 모듈(`defineNuxtConfig`의 `modules`에 등록).     |
| `@abnxt/nuxt/server` | `defineAbnxtAuthHandler`, `defineAbnxtConfigHandler`. |

## 문서

설치 가이드는 [docs/guide-nuxt.md](https://github.com/SeoJangHyuck/abnxt/blob/main/docs/guide-nuxt.md), 전체 개요는 [루트 README](https://github.com/SeoJangHyuck/abnxt#readme)를 참고하세요.

## 라이선스

MIT
