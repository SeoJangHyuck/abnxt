# abnxt

> **AB + NXT** — Next.js 16 / Nuxt 4 공통 골격의 프론트엔드 A/B 테스트 툴

DB·Redis 같은 백엔드 인프라 없이 **정적 config + 쿠키 + 미들웨어**만으로 동작합니다. 모노레포에 모듈처럼 주입해 SSR에서 깜빡임(FOOC) 없이 변이를 렌더하고, 어떤 분석 도구로도 노출(exposure)을 전달할 수 있습니다.

```bash
npx abnxt init
```

---

## 핵심 특징

- **무백엔드 기본** — `public/ab-config.json` 정적 파일 + 쿠키만으로 동작. 새로고침(또는 파일 교체)으로 반영.
- **깜빡임 없는 SSR** — 배정이 `hash(visitorId + seed)`로 **결정적**이라 서버·클라가 같은 변이를 계산. hydration 불일치 없음.
- **가중 sticky 배정** — 70/30 등 가중치 기반, 방문자별 고정. 가중치를 바꿔도 기존 사용자는 유지.
- **프레임워크 형평** — Next/Nuxt 어댑터가 동일한 `@abnxt/core` 로직을 공유. 동작이 양쪽에서 같습니다.
- **분석 도구 비종속** — 기본 `domEvent`(벤더 중립 `CustomEvent`). GA4/GTM(dataLayer)/Clarity는 이름으로 opt-in.
- **네이티브 어드민** — Next는 React, Nuxt는 Vue 네이티브 어드민 페이지(편집 로직은 `@abnxt/core/admin` 공유). 사전 세팅한 **인증키**로 접근 제어(앱 로그인 비의존).
- **설치 CLI** — `npx abnxt init` 한 번으로 프레임워크 감지 → 스캐폴딩(멱등·dry-run).

## 동작 방식

```
요청 ─▶ proxy.ts / Nitro 미들웨어   (visitorId 보장 + ?ab_* override 기록)
        │
        ▼
SSR: 서버 ConfigSource로 config 로드 → resolveVariant(visitorId) → 올바른 변이 렌더(깜빡임 없음)
        │  (직렬화 스냅샷 {visitorId, config, overrides, stored} 을 클라로 전달)
        ▼
클라: useExperiment / <Experiment> 가 스냅샷으로 hydration → 노출 시 sticky 기록 + 분석 발화
        ▼
분석 sinks: domEvent(기본) · dataLayer · GA4 · Clarity · custom
```

배정은 순수 결정적 함수라 멀티 인스턴스(여러 pod)에서도 세션 어피니티 없이 안전합니다. 유일한 변수는 "모든 인스턴스가 같은 config를 보는가"뿐입니다.

## 패키지

| 패키지        | 설명                                                                                                                                             |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `@abnxt/core` | 프레임워크 무관 엔진(해시·배정·해석·config·분석 버스). 의존성 0. `@abnxt/core/server`(Node 전용 소스·인증), `@abnxt/core/admin`(공유 편집 로직). |
| `@abnxt/next` | Next.js 16 App Router 어댑터 + 네이티브 어드민(`@abnxt/next/admin`).                                                                             |
| `@abnxt/nuxt` | Nuxt 4 모듈 어댑터 + 네이티브 어드민(컴포넌트·페이지 자동 주입).                                                                                 |
| `@abnxt/cli`  | 설치 스캐폴딩 CLI (`abnxt init`).                                                                                                                |

## 빠른 시작

### 1) CLI로 주입 (권장)

기존 Next/Nuxt 프로젝트 루트에서:

```bash
npx abnxt init                       # 감지 → 스캐폴딩
npx abnxt init --dry-run             # 미리보기(파일 미생성)
npx abnxt init --api-route           # 라이브 저장용 config 라우트도 생성
npx abnxt init --sinks=domEvent,ga4  # 분석 sink 지정(기본 domEvent)
```

CLI는 `package.json`/락파일로 프레임워크·라우터·TS·패키지매니저를 감지하고, 마커 주석(`// abnxt:start … // abnxt:end`)으로 **멱등** 주입합니다(재실행 시 skip). 자동 편집이 위험한 부분(예: `app/layout.tsx`)은 수동 스니펫을 안내합니다.

생성 후 안내된 의존성을 설치합니다:

```bash
pnpm add @abnxt/next @abnxt/core   # Next
pnpm add @abnxt/nuxt   @abnxt/core   # Nuxt
```

### 2) 프레임워크별 상세 가이드

- **Next.js 16** → [docs/guide-next.md](docs/guide-next.md)
- **Nuxt 4** → [docs/guide-nuxt.md](docs/guide-nuxt.md)

아래는 최소 사용 예시입니다.

#### Next.js (요약)

```tsx
// app/page 같은 클라이언트 컴포넌트
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

#### Nuxt (요약)

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

## config 스키마 (`public/ab-config.json`)

```jsonc
{
  "version": 1,
  "updatedAt": "2026-06-18T09:00:00Z",
  "resetEpoch": 1782202406565, // (선택) 전체 사용자 강제 재배정 타임스탬프. 어드민 "쿠키 초기화"가 설정.
  "experiments": {
    "homepage-hero": {
      "name": "Homepage Hero",
      "description": "랜딩 히어로 A/B", // (선택) 사람이 읽는 설명. 어드민에 표시 + config에 저장.
      "active": true, // false면 control 고정 + 노출 미발화
      "sticky": true, // 기본 true. 한 번 배정된 변이 유지
      "seed": "homepage-hero", // 해시 salt(생략 시 key 사용)
      "control": "A", // fallback 변이(생략 시 첫 변이)
      "variants": [
        { "key": "A", "weight": 50 },
        { "key": "B", "weight": 50 }, // 최대 5개. weight는 상대값(정규화됨)
      ],
    },
  },
}
```

`name`/`variants`만 필수이고 나머지는 로드 시 정규화됩니다(`description`은 항상 `''`로 채워짐). 잘못된 형태는 안전하게 폴백하며 렌더 경로에서 예외를 던지지 않습니다. 변이 키는 `@abnxt/core`의 `VariantKey`(A~E, 최대 `MAX_VARIANTS=5`)로도 참조할 수 있어, 소비 컴포넌트에서 `'B'` 리터럴 대신 `VariantKey.B`로 비교할 수 있습니다.

> **재배정 주의:** 진행 중 실험은 **weight만** 조정하세요. 변이 추가/순서 변경·seed 변경은 sticky 쿠키가 없는 사용자의 배정을 바꿉니다. 변이 추가는 새 실험 key로 하세요. 의도적으로 전원 재배정하려면 어드민의 "쿠키 초기화"(= `resetEpoch` 갱신)를 사용하세요.

## 분석 (벤더 중립)

기본 sink은 `domEvent` — `window`에 `CustomEvent('abnxt:exposure', { detail })`를 디스패치합니다. 어떤 분석 도구든 구독할 수 있습니다:

```ts
window.addEventListener('abnxt:exposure', (e) => {
  const { experiment, variant, source } = (e as CustomEvent).detail;
  // 원하는 분석 도구로 전달 (Amplitude/Segment/Mixpanel/자체 로깅 등)
});
```

`detail`: `{ type:'exposure', experiment, name, variant, visitorId, source, ts }`. `source`(`assigned`|`stored`|`override`|`control`)로 QA(override) 트래픽을 분리할 수 있습니다.

내장 sink은 이름으로 opt-in합니다(어댑터 `analytics.sinks`):

| 이름        | 동작                                                                                       |
| ----------- | ------------------------------------------------------------------------------------------ |
| `domEvent`  | `CustomEvent('abnxt:exposure')` (기본·벤더 중립)                                           |
| `dataLayer` | `dataLayer.push({ event:'ab_exposure', ab_experiment, ab_variant, ab_source })` (GTM 표준) |
| `ga4`       | `gtag('event','experiment_impression',{ experiment_id, variant_id })`                      |
| `clarity`   | `clarity('set','ab_'+key, variant)` + `clarity('event', …)`                                |

```ts
// 예: GTM + GA4 동시
analytics={{ sinks: ['dataLayer', 'ga4'] }}
```

동의(consent) 게이트: `analytics={{ requireConsent: true, consentCookie: 'abnxt_consent' }}` — 동의 쿠키가 있을 때만 발화(GA Consent Mode와 병행).

## 어드민 (프레임워크 네이티브)

각 프레임워크 네이티브 어드민 페이지를 제공합니다. UI·기능은 동일하고, 편집 로직(`@abnxt/core/admin`)·스타일(`ADMIN_CSS`)·문구(`@abnxt/core/admin`의 i18n)를 양쪽이 공유합니다. 호스트 CSS와 격리하기 위해 **Shadow DOM**(Next `createPortal` / Nuxt `<Teleport>`)으로 렌더되는 풀스크린 페이지입니다(모달 아님 — 우상단 **홈 버튼**으로 루트 이동).

**Next (React)** — `app/ab-admin/page.tsx`:

```tsx
import { AbnxtAdmin } from '@abnxt/next/admin';

export default function AbAdminPage() {
  return <AbnxtAdmin />; // configEndpoint/authEndpoint/title 옵션 가능
}
```

**Nuxt (Vue)** — `@abnxt/nuxt` 모듈이 `<AbnxtAdmin>` 컴포넌트와 어드민 페이지(`/abnxt-admin`)·서버 라우트를 자동 주입합니다:

```ts
export default defineNuxtConfig({
  modules: ['@abnxt/nuxt'],
  abnxt: { admin: { enabled: true }, adminKey: process.env.ABNXT_ADMIN_KEY },
});
```

화면 구성:

- **실험 목록** — 선택 전용(비활성 실험은 흐리게 + 상태 배지). 실험을 고르면 우측 편집기가 부드럽게 전환.
- **기본 설정** — 이름 · **설명(`description`)** · 활성화 토글 · sticky 토글 · **Seed(읽기 전용)** · control.
- **변이 & 가중치** — 변이가 **2개면 자동 비례 조정**(합 항상 100%), **3개 이상이면 자유 입력**(합이 100%를 넘으면 경고 + 저장 차단). 변이는 최대 5개(`MAX_VARIANTS`).
- **실험 단위 저장** — 한 번에 한 실험만 편집·저장. 다른 실험으로 전환하면 미저장 변경은 폐기됩니다.
- **언어 토글(EN/KO)** — 기본 영어. 호스트 페이지가 한국어면(`<html lang>`/`navigator`) 자동으로 한국어.
- **전체 사용자 재배정** — "쿠키 초기화"(위험 영역). 확인 즉시 `resetEpoch`를 올려 모든 방문자를 다음 방문에 재배정.
- **Export / Import** — 전체 config를 JSON으로 내보내기/가져오기.

### 어드민 인증 (사전 세팅 인증키)

어드민은 앱 로그인(SSO/OIDC)에 **의존하지 않고**, 사전 세팅한 인증키로 접근합니다(로그인리스).

- 환경변수 `ABNXT_ADMIN_KEY`(16자 이상 권장)를 세팅합니다(`.env` 예: `cp .env.example .env` 후 `ABNXT_ADMIN_KEY=$(openssl rand -hex 24)`). 미설정 시 프로덕션에서는 어드민이 **차단**됩니다(fail-closed).
- 진입 시 키 입력 → 서버가 검증 후 HMAC 서명 **세션 쿠키**(`abnxt_admin`)를 발급 → 이후 재입력 불필요.
- config 읽기/쓰기 API는 이 세션 쿠키로 보호되고, 쓰기는 `Sec-Fetch-Site` 기반 CSRF 방어 + `no-store`.

서버 라우트(키→세션 발급 + config CRUD):

```ts
// Next: app/api/abnxt/auth/route.ts
import { createAbnxtAuthRoute } from '@abnxt/next/server';
export const { POST, DELETE } = createAbnxtAuthRoute(); // 기본 ABNXT_ADMIN_KEY

// Next: app/api/abnxt/config/route.ts
import { createAbnxtConfigRoute, abnxtCookieAuth } from '@abnxt/next/server';
import { fsAdminStorage } from '@abnxt/core/server';
export const { GET, PUT } = createAbnxtConfigRoute({
  storage: fsAdminStorage({ path: '.data/abnxt-config.json' }),
  auth: abnxtCookieAuth({
    secret: process.env.ABNXT_ADMIN_KEY!,
    cookieName: 'abnxt_admin',
  }),
});
```

Nuxt는 모듈이 동일 라우트를 자동 등록합니다(`@abnxt/nuxt/server`의 `defineAbnxtAuthHandler`/`defineAbnxtConfigHandler`로 수동 정의도 가능).

## QA override

분석/QA용으로 URL 쿼리나 쿠키로 변이를 강제할 수 있습니다(인증·기능 게이트로 쓰지 마세요):

```
?ab_homepage-hero=B   # homepage-hero를 B로 강제
?ab_homepage-hero=    # 해당 override 해제
?ab_reset=1           # 모든 override 해제
```

override 경유 노출은 `source: 'override'`로 발화되어 분석에서 분리됩니다.

## config 소스 (서버)

`@abnxt/core/server` / `@abnxt/core`:

| 소스                              | 용도                                                                                                 |
| --------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `bundledConfig(raw)`              | 빌드 시 import한 객체. 서버리스 포함 어디서나 동작(배포 시 반영).                                    |
| `fsConfig({ path })`              | 요청 시 파일 읽기(mtime 캐시). **파일 교체만으로 라이브 반영**(Node 자체호스팅).                     |
| `remoteConfig(loader, { ttlMs })` | 벤더 중립 외부 소스(Edge Config/KV/오브젝트 스토리지 등 async loader 주입). 멀티 인스턴스 스큐 최소. |

## 인증 (무DB)

- `abnxtBasicAuth({ user, password })` — Basic Auth(HTTPS 전제).
- `abnxtCookieAuth({ secret })` — HMAC 서명 세션 쿠키(무상태·만료). **secret은 전 인스턴스 동일**해야 합니다.
- `abnxtCustomAuth(req => boolean)` — 기존 앱 세션 재사용(BYO).
- `verifyAdminKey(provided, expected)` + `createAbnxtAuthRoute`/`defineAbnxtAuthHandler` — 사전 세팅 인증키→세션 쿠키 발급(어드민 기본 방식, 위 [어드민 인증](#어드민-인증-사전-세팅-인증키) 참조).

라이브 config 라우트: Next는 `createAbnxtConfigRoute`, Nuxt는 `defineAbnxtConfigHandler`(`@abnxt/nuxt/server`). 쓰기는 인증 + `Sec-Fetch-Site` 기반 CSRF 방어 + `no-store`.

## 모노레포 개발

```bash
pnpm install
pnpm -r build       # 전 패키지 빌드
pnpm -r test        # 단위 테스트
pnpm -r typecheck   # 타입 검사
pnpm lint           # eslint + stylelint + prettier --check
```

데모: `examples/next`, `examples/nuxt` (둘 다 프로덕션 빌드로 통합 검증). 수동 검증 절차는 [examples/README.md](examples/README.md).

## 라이선스

MIT
