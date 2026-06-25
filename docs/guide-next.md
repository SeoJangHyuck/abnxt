# abnxt — Next.js 16 사용 가이드

`@abnxt/next`로 Next.js 16 **App Router**에 A/B 테스트를 붙이는 방법입니다. 동작하는 전체 예시는 [`examples/next`](../examples/next)를 참고하세요.

> Pages Router는 아직 정식 지원하지 않습니다(App Router 필요). CLI는 Pages 프로젝트를 감지하면 명확히 거부합니다.

---

## 1. 설치

```bash
npx abnxt init                 # proxy.ts / layout 안내 / ab-admin / 시드 config 생성
pnpm add @abnxt/next @abnxt/core
```

수동으로 한다면 아래 단계를 직접 만들면 됩니다.

## 2. proxy.ts (요청 경계)

`abnxt_vid`(방문자 식별자)를 보장하고 `?ab_*` override를 기록합니다. config에 접근하지 않는 경량 미들웨어입니다.

```ts
// proxy.ts (프로젝트 루트)
import { createAbProxy } from '@abnxt/next/server';

export const proxy = createAbProxy();
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

> proxy가 없으면 첫 방문에 vid가 클라에서 생성되어 그 방문만 깜빡일 수 있습니다. 깜빡임 없는 첫 방문을 원하면 proxy를 두세요.

## 3. 서버 config 소스 등록 + ABProvider

`app/layout.tsx`(서버 컴포넌트)에서 **모듈 top-level**에 config 소스를 1회 등록하고, `<ABProvider>`로 감쌉니다. `ABProvider`는 내부에서 요청당 1회(React `cache()`) 스냅샷을 만들어 클라로 내립니다.

```tsx
// app/layout.tsx
import { ABProvider, configureServerAb } from '@abnxt/next/server';
import { fsConfig } from '@abnxt/core/server';
import { join } from 'node:path';
import type { ReactNode } from 'react';

// 첫 import 시 1회 실행 — config 소스 등록.
configureServerAb({
  source: fsConfig({ path: join(process.cwd(), 'public/ab-config.json') }),
});

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ABProvider analytics={{ sinks: ['domEvent'] }}>{children}</ABProvider>
      </body>
    </html>
  );
}
```

config 소스 선택:

```ts
import { bundledConfig } from '@abnxt/core'; // 빌드 import(서버리스 어디서나)
import { fsConfig, remoteConfig } from '@abnxt/core/server';

configureServerAb({ source: bundledConfig(myConfigObject) }); // 배포 시 반영
configureServerAb({ source: fsConfig({ path: '.../public/ab-config.json' }) }); // 파일 교체 라이브 반영
configureServerAb({
  source: remoteConfig(() => fetchFromKV(), { ttlMs: 30_000 }),
}); // 외부 소스
```

> `configureServerAb`를 호출하지 않으면 빈 config로 폴백하고 dev 경고가 출력됩니다.

## 4. 변이 사용

### 클라이언트 컴포넌트 — `<Experiment>` / `useExperiment`

```tsx
'use client';
import { Experiment, Variant, useExperiment } from '@abnxt/next';

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

배정된 변이의 `<Variant>`가 렌더되고, 없으면 control 변이로 폴백합니다. 노출(exposure)은 마운트 시 1회 발화됩니다(세션당 실험별 중복 제거).

값으로 직접 분기하려면 훅을 씁니다:

```tsx
'use client';
import { useExperiment } from '@abnxt/next';

export function CTA() {
  const { variant, source, isReady } = useExperiment('cta-color');
  return (
    <button className={variant === 'B' ? 'btn-green' : 'btn-blue'}>구매</button>
  );
}
```

> `isReady`는 config가 스냅샷에 포함되어 첫 렌더부터 확정이므로 항상 `true`입니다(렌더 게이트로 쓰지 마세요 — SSR/CSR 불일치 유발).

> 변이 키는 `@abnxt/core`의 `VariantKey`로도 비교할 수 있습니다 — `import { VariantKey } from '@abnxt/core'` 후 `variant === VariantKey.B`. 문자열 리터럴 오타를 줄이고 싶을 때 권장합니다.

### 서버 컴포넌트(RSC) — `getVariant`

```tsx
// app/page.tsx
import { getVariant } from '@abnxt/next/server';

export default async function Home() {
  const variant = await getVariant('homepage-hero');
  return <main>{variant === 'B' ? <HeroBServer /> : <HeroAServer />}</main>;
}
```

> RSC `getVariant`만 쓰고 클라 컴포넌트를 거치지 않으면 노출/sticky가 발화되지 않습니다(둘 다 클라에서 발화). 추적이 필요하면 해당 지점에 클라 경로를 두세요.

## 5. 분석 연동

`ABProvider`의 `analytics` 플래그(직렬화 가능)로 sink을 정합니다. 기본은 벤더 중립 `domEvent`입니다.

```tsx
<ABProvider analytics={{ sinks: ['domEvent'] }}>          {/* 기본 */}
<ABProvider analytics={{ sinks: ['dataLayer', 'ga4'] }}>  {/* GTM + GA4 */}
<ABProvider analytics={{ sinks: [], requireConsent: true, consentCookie: 'abnxt_consent' }}>
```

`domEvent`는 어떤 도구로도 전달할 수 있습니다:

```tsx
'use client';
import { useEffect } from 'react';

export function AnalyticsBridge() {
  useEffect(() => {
    const onExposure = (e: Event) => {
      const { experiment, variant, source } = (e as CustomEvent).detail;
      window.amplitude?.track('experiment_exposure', {
        experiment,
        variant,
        source,
      });
    };
    window.addEventListener('abnxt:exposure', onExposure);
    return () => window.removeEventListener('abnxt:exposure', onExposure);
  }, []);
  return null;
}
```

커스텀 sink 함수나 동적 consent가 필요하면(고급), 클라에서 `AbStateProvider`를 직접 합성해 `sinks`/`consent` prop을 주입합니다(서버 `ABProvider` 경유로는 함수 전달 불가 — RSC 직렬화 제약).

## 6. 어드민

`@abnxt/next/admin`의 `<AbnxtAdmin>`을 라우트에 렌더합니다. 키 입력 게이트 + 어드민 UI가 한 컴포넌트에 포함되어 별도 `mount` 호출이 필요 없습니다.

```tsx
// app/ab-admin/page.tsx
import { AbnxtAdmin } from '@abnxt/next/admin';

export default function AbAdminPage() {
  return <AbnxtAdmin />;
  // 옵션: <AbnxtAdmin configEndpoint="/api/abnxt/config" authEndpoint="/api/abnxt/auth" title="..." />
}
```

`<AbnxtAdmin>`은 마운트 시 config API를 호출하고, 미인증(401)이면 키 입력 폼을 보여줍니다. 호스트 CSS와 격리하기 위해 **Shadow DOM**(`createPortal`)으로 렌더되는 풀스크린 페이지입니다(모달 아님 — 우상단 **홈 버튼**으로 `/` 이동). 아래 7장의 auth/config 라우트가 필요합니다.

인증 후 화면(편집 로직은 `@abnxt/core/admin` 공유):

- **실험 목록** — 선택 전용(비활성은 흐림 + 상태 배지). 항목 전환 시 우측 편집기가 부드럽게 전환됩니다.
- **기본 설정** — 이름 · **설명(`description`)** · 활성화 · sticky · **Seed(읽기 전용)** · control.
- **변이 & 가중치** — 변이 **2개=자동 비례**(합 100% 유지), **3개 이상=자유 입력**(합 100% 초과 시 경고 + 저장 차단, 최대 5개).
- **실험 단위 저장** — 한 실험만 편집·저장. 다른 실험 선택 시 미저장 변경은 폐기됩니다.
- **언어 토글(EN/KO)** — 기본 영어, 호스트가 한국어면 자동 한국어. **전체 사용자 재배정**(쿠키 초기화) · **Export/Import**.

> 어드민 경로는 자유입니다. i18n(예: `app/[locale]/ab-admin/page.tsx`)을 쓰면 로케일 프리픽스 경로(`/{locale}/ab-admin`)가 됩니다. 호스트에 전역 인증 가드가 있으면 어드민 경로도 그 가드를 거치므로(앱 로그인 후 abnxt 키), 필요 시 가드에서 경로 예외를 두세요.

## 7. 어드민 인증 + 라이브 저장

어드민은 앱 로그인(SSO/OIDC)에 의존하지 않고 **사전 세팅 인증키**(`ABNXT_ADMIN_KEY`, 16자 이상)로 접근합니다. 키→세션 발급 라우트와 config CRUD 라우트를 둡니다.

```ts
// app/api/abnxt/auth/route.ts — 키 검증 → 세션 쿠키(abnxt_admin) 발급/삭제
import { createAbnxtAuthRoute } from '@abnxt/next/server';

export const { POST, DELETE } = createAbnxtAuthRoute(); // 기본 key=process.env.ABNXT_ADMIN_KEY
```

```ts
// app/api/abnxt/config/route.ts — 세션 쿠키로 보호되는 GET/PUT
import { createAbnxtConfigRoute, abnxtCookieAuth } from '@abnxt/next/server';
import { fsAdminStorage } from '@abnxt/core/server';

const route = createAbnxtConfigRoute({
  storage: fsAdminStorage({ path: '.data/abnxt-config.json' }),
  auth: abnxtCookieAuth({
    secret: process.env.ABNXT_ADMIN_KEY!, // auth-route와 동일 secret/cookieName이어야 검증됨
    cookieName: 'abnxt_admin',
  }),
});

export const GET = route.GET;
export const PUT = route.PUT;
export const dynamic = 'force-dynamic';
```

- `ABNXT_ADMIN_KEY` 미설정 시 프로덕션에서 어드민이 **차단**됩니다(fail-closed).
- `createAbnxtAuthRoute`의 secret과 `abnxtCookieAuth`의 secret/cookieName이 **일치**해야 발급 세션이 검증됩니다.
- 쓰기(PUT)는 인증 + `Sec-Fetch-Site` 기반 CSRF 방어 + `no-store`.

대안 인증(기존 앱 세션 재사용 등)도 config 라우트의 `auth`로 쓸 수 있습니다:

```ts
import { abnxtBasicAuth, abnxtCustomAuth } from '@abnxt/next/server';

abnxtBasicAuth({ user, password }); // Basic(HTTPS 전제)
abnxtCustomAuth((req) => isLoggedInAdmin(req)); // 기존 세션 재사용
```

> 멀티 인스턴스에서 라이브 쓰기 저장소는 **모든 인스턴스가 공유하는 위치**(외부 KV/오브젝트 스토리지/k8s ConfigMap 등)여야 합니다. `fsAdminStorage`의 로컬 파일 쓰기는 그 인스턴스에만 반영됩니다.

## 8. 정적/SSR 주의

- `cookies()`/`headers()`를 쓰는 페이지는 동적 렌더로 전환됩니다. 정적 유지가 필요하면 client-only 모드(첫 방문 깜빡임 감수) 또는 PPR과 조합하세요.
- `state.config` 전체가 클라 스냅샷으로 전달됩니다. config에 비밀 값을 두지 마세요.

## 9. 검증

```bash
pnpm --filter <your-app> build   # 빌드 통과로 통합 확인
```

dev 서버에서 깜빡임 없음(`?ab_homepage-hero=B`/`?ab_reset=1`)과 노출 발화를 확인하세요. 자세한 절차는 [examples/README.md](../examples/README.md).
