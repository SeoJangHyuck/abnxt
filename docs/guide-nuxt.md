# abnxt — Nuxt 4 사용 가이드

`@abnxt/nuxt`(Nuxt 모듈)로 Nuxt 4에 A/B 테스트를 붙이는 방법입니다. 동작하는 전체 예시는 [`examples/nuxt`](../examples/nuxt)를 참고하세요.

Nuxt는 모듈이 미들웨어·플러그인·컴포저블·컴포넌트를 **사용자 파일 없이 런타임 주입**하므로 스캐폴딩이 거의 필요 없습니다.

---

## 1. 설치

```bash
npx abnxt init                 # nuxt.config 주입 안내 / ab-admin 페이지 / 시드 config
pnpm add @abnxt/nuxt @abnxt/core
```

## 2. 모듈 등록 + config

`nuxt.config.ts`에 모듈을 추가하고 config를 인라인으로 줍니다. 모듈이 Nitro 미들웨어(vid/override)·플러그인(SSR 스냅샷)·`useExperiment`·`<Experiment>`를 자동 주입합니다.

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@abnxt/nuxt'],
  abnxt: {
    config: {
      version: 1,
      experiments: {
        'homepage-hero': {
          name: 'Homepage Hero',
          active: true,
          sticky: true,
          variants: [
            { key: 'A', weight: 50 },
            { key: 'B', weight: 50 },
          ],
        },
      },
    },
    analytics: { sinks: ['domEvent'] }, // 기본 벤더 중립. ['dataLayer','ga4'] 등으로 변경
  },
});
```

> `config`는 서버에서 로드되어 SSR 스냅샷으로 클라에 hydration됩니다(`config`는 비밀로 취급하지 마세요). 정적/SPA 모드에서 SSR 스냅샷이 없으면 클라는 빈 config로 폴백(전부 control)합니다.

## 3. 변이 사용

### `<Experiment>` — named slots (관용적)

Vue에서는 named slot이 React의 `<Variant>`를 대체합니다. 컴포넌트는 auto-import되어 import가 필요 없습니다.

```vue
<template>
  <Experiment name="homepage-hero">
    <template #A><HeroA /></template>
    <template #B><HeroB /></template>
  </Experiment>
</template>
```

배정된 변이 slot이 렌더되고, 없으면 control slot으로 폴백합니다.

### `useExperiment` — 컴포저블

`useExperiment`도 auto-import됩니다. 반환값은 reactive `ComputedRef`입니다.

```vue
<script setup lang="ts">
const { variant, source, isReady } = useExperiment('cta-color');
</script>

<template>
  <button :class="variant === 'B' ? 'btn-green' : 'btn-blue'">구매</button>
  <small>{{ variant }} ({{ source }})</small>
</template>
```

노출은 클라 마운트 시 1회 발화됩니다(세션당 실험별 중복 제거). SSR 중에는 발화하지 않으므로 깜빡임 없이 렌더만 됩니다.

> `isReady`는 항상 `true`(첫 렌더부터 변이 확정). 렌더 게이트로 쓰지 마세요.

## 4. 분석 연동

`nuxt.config.ts`의 `abnxt.analytics.sinks`로 정합니다(기본 `['domEvent']`).

```ts
abnxt: { analytics: { sinks: ['dataLayer', 'ga4'] } }
abnxt: { analytics: { sinks: ['domEvent'], requireConsent: true, consentCookie: 'abnxt_consent' } }
```

`domEvent`는 어떤 도구로도 전달할 수 있습니다(클라 플러그인 등에서):

```ts
// plugins/abnxt-analytics.client.ts
export default defineNuxtPlugin(() => {
  if (import.meta.client) {
    window.addEventListener('abnxt:exposure', (e) => {
      const { experiment, variant, source } = (e as CustomEvent).detail;
      // 원하는 분석 도구로 전달
    });
  }
});
```

> Nuxt에서 커스텀 sink 함수가 필요하면 `addEventListener('abnxt:exposure', ...)`로 구독하는 것이 권장 경로입니다(함수는 직렬화 불가).

## 5. 어드민

`@abnxt/nuxt` 모듈이 어드민을 **자동 주입**합니다. `nuxt.config`의 `abnxt.admin`으로 켜고 인증키를 줍니다.

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@abnxt/nuxt'],
  abnxt: {
    admin: { enabled: true }, // 기본 route '/abnxt-admin'
    adminKey: process.env.ABNXT_ADMIN_KEY, // 서버 전용(public runtimeConfig 미노출)
  },
});
```

모듈이 자동 등록하는 것:

- 어드민 페이지 `/abnxt-admin`(`<AbnxtAdmin>` 렌더).
- 서버 라우트 `/api/abnxt/auth`(키→세션) + `/api/abnxt/config`(GET/PUT).
- `<AbnxtAdmin>` 컴포넌트(수동 페이지로도 사용 가능, auto-import).

`<AbnxtAdmin>`은 미인증 시 키 입력 폼을 보여주고, 키 검증 후 세션 쿠키로 실험 목록·편집·시뮬레이션·Preview·Export/Import를 제공합니다(편집 로직은 `@abnxt/core/admin` 공유).

## 6. 어드민 인증 + 라이브 저장

어드민은 앱 로그인(SSO 등)에 의존하지 않고 **사전 세팅 인증키**(`ABNXT_ADMIN_KEY`, 16자 이상)로 접근합니다. 모듈의 자동 서버 라우트(5장)가 키→세션·config CRUD를 처리하며, `adminKey`는 서버 전용 runtimeConfig로만 흐릅니다(클라 노출 없음). 미설정 시 프로덕션에서 어드민이 **차단**됩니다(fail-closed).

자동 등록을 끄고(`admin: { serverRoutes: false }`) 직접 라우트를 정의하려면 `@abnxt/nuxt/server` 팩토리를 씁니다:

```ts
// server/api/abnxt/auth.ts — 키 → 세션 쿠키(abnxt_admin)
import { defineAbnxtAuthHandler } from '@abnxt/nuxt/server';
export default defineAbnxtAuthHandler(); // 기본 key=process.env.ABNXT_ADMIN_KEY
```

```ts
// server/api/abnxt/config.ts — 세션 쿠키로 보호되는 GET/PUT
import { defineAbnxtConfigHandler } from '@abnxt/nuxt/server';
import { fsAdminStorage } from '@abnxt/core/server';

export default defineAbnxtConfigHandler({
  storage: fsAdminStorage({ path: '.data/abnxt-config.json' }),
  auth: {
    cookie: { secret: process.env.ABNXT_ADMIN_KEY!, cookieName: 'abnxt_admin' },
  },
});
```

인증은 `cookie`(어드민 키 세션, 기본) / `basic` / `custom` 중 선택합니다:

```ts
auth: { cookie: { secret, cookieName: 'abnxt_admin' } } // 어드민 키 세션
auth: { basic: { user, password } }                     // Basic(HTTPS 전제)
auth: { custom: (event) => isLoggedInAdmin(event) }      // 기존 세션 재사용
```

GET/PUT 모두 인증되고, PUT은 `Sec-Fetch-Site` 기반 CSRF 방어 + `no-store` 응답을 적용합니다.

> 라이브 쓰기 저장소는 멀티 인스턴스에서 **모든 인스턴스 공유 위치**여야 합니다(외부 KV/오브젝트 스토리지 등).

## 7. 동작 흐름 (깜빡임 없음)

1. Nitro 미들웨어가 `abnxt_vid` 보장 + `?ab_*` override를 쿠키/`event.context`에 기록.
2. 플러그인(SSR)이 config + vid로 `AbState` 스냅샷을 만들어 `useState('abnxt:state')`에 저장 → 클라로 직렬화.
3. 클라는 hydration된 스냅샷을 그대로 사용(독립 fetch 없음) → 서버와 동일 변이 → 깜빡임 없음.
4. 클라 마운트 시 노출 발화 + sticky 기록.

## 8. config 라이브 반영

- `fsConfig`로 `public/ab-config.json` 파일을 교체하면(또는 k8s ConfigMap 볼륨 마운트) mtime 기반으로 재로드됩니다.
- 무배포 라이브가 필요하면 `remoteConfig(loader)`로 외부 소스를 쓰세요(플러그인이 아닌 서버 라우트/플러그인 config 로딩 지점에서 사용).

## 9. 검증

```bash
pnpm --filter <your-app> build      # nuxt build 통과로 통합 확인
pnpm --filter <your-app> typecheck  # nuxt typecheck
```

`nuxt typecheck`는 `vue-tsc`/`typescript`(devDependencies)와 `.nuxt`의 생성 tsconfig를 참조하는 루트 `tsconfig.json`이 필요합니다(`examples/nuxt/tsconfig.json` 참고):

```jsonc
{
  "files": [],
  "references": [
    { "path": "./.nuxt/tsconfig.app.json" },
    { "path": "./.nuxt/tsconfig.server.json" },
    { "path": "./.nuxt/tsconfig.shared.json" },
    { "path": "./.nuxt/tsconfig.node.json" },
  ],
}
```

dev 서버에서 슬롯 렌더·`?ab_*` override·`/abnxt-admin`을 확인하세요. 자세한 절차는 [examples/README.md](../examples/README.md).
