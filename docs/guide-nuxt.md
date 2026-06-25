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

> **라이브 반영(어드민 편집):** 서버는 어드민이 읽고 쓰는 파일(`admin.configPath`, 기본 `.data/abnxt-config.json`)이 **존재하면 그 파일을 우선** 로드하고, 없으면 위 인라인 `config`로 폴백합니다. 즉 인라인 `config`는 **초기 시드/폴백**이고, 어드민에서 저장하면 다음 요청부터 라이브 배정에 즉시 반영됩니다(Next의 `public/ab-config.json` 공유와 동등). 어드민에 동일 실험이 처음부터 보이게 하려면 인라인 `config`와 같은 내용으로 `.data/abnxt-config.json`을 시드해 두세요.

> **버전 무관:** `@abnxt/nuxt`는 `@nuxt/kit`을 `^4.0.0`(peer `nuxt ^4.0.0`와 동일 범위)으로만 의존하므로 호스트의 nuxt 버전을 끌어올리지 않습니다.

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

> 변이 키는 `@abnxt/core`의 `VariantKey`로도 비교할 수 있습니다 — `import { VariantKey } from '@abnxt/core'` 후 `variant === VariantKey.B`(컴포저블 반환은 `ComputedRef`이므로 `variant.value === VariantKey.B`). 리터럴 오타 방지에 유용합니다.

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

- 어드민 페이지 `/abnxt-admin`(`<AbnxtAdmin>` 렌더). **i18n `strategy: 'prefix'`면 로케일 프리픽스 경로**(`/{locale}/abnxt-admin`, 예: `/en/abnxt-admin`)가 됩니다.
- 서버 라우트 `/api/abnxt/auth`(키→세션) + `/api/abnxt/config`(GET/PUT).
- `<AbnxtAdmin>` 컴포넌트(수동 페이지로도 사용 가능, auto-import).

`<AbnxtAdmin>`은 미인증 시 키 입력 폼을 보여주고, 키 검증 후 세션 쿠키로 진입합니다. Shadow DOM(`<Teleport>`)으로 렌더되는 풀스크린 페이지이며(모달 아님 — 우상단 홈 버튼), 화면은 Next와 동일합니다(편집 로직·문구 `@abnxt/core/admin` 공유):

- **실험 목록**(선택 전용·비활성 흐림) · **기본 설정**(이름·설명·활성·sticky·Seed[읽기전용]·control)
- **변이 & 가중치**(2개=자동 비례 / 3개 이상=자유 입력, 합 100% 초과 시 경고+저장 차단, 최대 5개)
- **실험 단위 저장**(전환 시 미저장 폐기) · **EN/KO 언어 토글**(기본 영어, 한국어 페이지면 자동 한국어) · **전체 사용자 재배정**(쿠키 초기화) · **Export/Import**

> 호스트에 전역 인증 가드(예: SSO global middleware)가 있으면 `/abnxt-admin`도 그 가드를 거칩니다(앱 로그인 → abnxt 키, 2단). 가드를 우회시키려면 해당 미들웨어에서 경로 예외를 두세요.

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

- 모듈의 Nitro 미들웨어가 매 요청 서버에서 `admin.configPath`(기본 `.data/abnxt-config.json`) 파일을 읽어 `event.context`로 실어주고, 플러그인이 이를 우선 사용합니다 → **어드민 저장(또는 파일 교체)이 다음 요청부터 라이브 배정에 반영**됩니다. 파일이 없으면 인라인 `config`로 폴백합니다(2장 참고).
- `configPath`는 노드 서버(자체호스팅·docker)에서 동작합니다. 읽기전용/서버리스 FS라면 외부 KV/오브젝트 스토리지 기반 storage로 교체하세요(아래 멀티 인스턴스 주의).
- 멀티 인스턴스에서는 라이브 저장소가 **모든 인스턴스 공유 위치**여야 일관됩니다(로컬 파일 쓰기는 그 인스턴스에만 반영).

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
