# @abnxt/next

> [abnxt](https://github.com/SeoJangHyuck/abnxt)의 Next.js 16 App Router 어댑터 + 네이티브 어드민.

DB·Redis 없이 정적 config + 쿠키 + 미들웨어만으로 동작하는 프론트엔드 A/B 테스트 툴입니다. SSR에서 깜빡임(FOOC) 없이 변이를 렌더합니다.

## 설치

```bash
pnpm add @abnxt/next @abnxt/core
```

`react` `react-dom`(^19) · `next`(^16)는 peer 의존성입니다.

가장 쉬운 방법은 CLI 스캐폴딩입니다:

```bash
npx abnxt init
```

## 사용

```tsx
'use client';
import { Experiment, Variant } from '@abnxt/next';

export function Hero() {
  return (
    <Experiment name="homepage-hero">
      <Variant name="A">
        <HeroA />
      </Variant>
      <Variant name="B">
        <HeroB />
      </Variant>
    </Experiment>
  );
}
```

## 진입점

| Export               | 내용                                                         |
| -------------------- | ------------------------------------------------------------ |
| `@abnxt/next`        | `<Experiment>`, `<Variant>`, `useExperiment` 등 클라 API.    |
| `@abnxt/next/server` | `createAbnxtAuthRoute`, `createAbnxtConfigRoute`, 인증 헬퍼. |
| `@abnxt/next/admin`  | 네이티브 어드민 페이지 컴포넌트 `<AbnxtAdmin>`.              |

## 문서

설치 가이드는 [docs/guide-next.md](https://github.com/SeoJangHyuck/abnxt/blob/main/docs/guide-next.md), 전체 개요는 [루트 README](https://github.com/SeoJangHyuck/abnxt#readme)를 참고하세요.

## 라이선스

MIT
