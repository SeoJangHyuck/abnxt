# @abnxt/core

> abnxt의 프레임워크 무관 A/B 테스트 엔진 — 해시·배정·해석·config·분석 버스. **의존성 0.**

[abnxt](https://github.com/SeoJangHyuck/abnxt)는 DB·Redis 없이 정적 config + 쿠키 + 미들웨어만으로 동작하는 Next.js 16 / Nuxt 4 공통 A/B 테스트 툴입니다. 이 패키지는 양쪽 어댑터(`@abnxt/next`, `@abnxt/nuxt`)가 공유하는 핵심 로직을 담습니다.

## 설치

```bash
pnpm add @abnxt/core
```

보통 어댑터(`@abnxt/next` 또는 `@abnxt/nuxt`)와 함께 설치합니다. 어댑터가 이 패키지를 의존성으로 가집니다.

## 진입점

| Export               | 환경      | 내용                                                         |
| -------------------- | --------- | ------------------------------------------------------------ |
| `@abnxt/core`        | universal | `resolveVariant`, config 정규화, `VariantKey`, 분석 버스 등. |
| `@abnxt/core/server` | Node 전용 | config 소스(`bundledConfig`/`fsConfig`/`remoteConfig`)·인증. |
| `@abnxt/core/admin`  | universal | 어드민 공유 편집 로직·i18n·`ADMIN_CSS`.                      |

## 핵심 원칙

- **결정적 배정** — `hash(visitorId + seed)` 순수 함수. SSR·CSR이 같은 변이를 계산해 hydration 불일치가 없습니다. 배정 경로에 `Date.now`/`Math.random` 같은 비결정적 입력을 넣지 않습니다.
- **렌더 안전** — 잘못된 config는 예외 대신 안전하게 폴백합니다.
- **분석 벤더 중립** — 기본 sink은 `domEvent`(`CustomEvent`). GA4/GTM/Clarity는 이름으로 opt-in.

## 문서

전체 개요·config 스키마·분석·어드민은 [루트 README](https://github.com/SeoJangHyuck/abnxt#readme)를 참고하세요.

## 라이선스

MIT
