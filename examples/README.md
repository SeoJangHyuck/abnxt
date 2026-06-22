# abnxt examples — manual verification

두 데모는 abnxt 패키지(core/next/nuxt/cli)가 실제 앱에서 동작함을 보여준다. 프로덕션 빌드로 통합 검증한다(`pnpm --filter example-next build`, `pnpm --filter example-nuxt build`). 아래는 dev 서버에서의 수동 검증 절차다.

## .env 세팅 (어드민 인증)

어드민(`/ab-admin`·`/abnxt-admin`)은 `ABNXT_ADMIN_KEY`로 보호된다. 각 예제 디렉터리에서:

```bash
cp .env.example .env
# .env의 ABNXT_ADMIN_KEY에 16자 이상 키 설정 (예: openssl rand -hex 24)
```

dev는 키 미설정 시 경고 후 통과(편의), 프로덕션은 fail-closed로 차단된다.

## Next (examples/next)

1. `pnpm --filter example-next dev`
2. 첫 로드에서 Hero A/B가 **깜빡임 없이** 즉시 렌더되는지 확인 — 서버 변이(`server-resolved variant`)와 클라 변이(`client variant`)가 일치해야 한다.
3. `?ab_homepage-hero=B`로 강제 변이, `?ab_reset=1`로 해제 확인(QA override).
4. `exposures`에 domEvent 노출이 1회 표시되는지 확인(벤더 중립). 다른 분석 도구는 `window.addEventListener('abnxt:exposure', ...)`로 동일하게 수신한다. GA4를 쓰려면 `app/layout.tsx`의 analytics를 `{ sinks: ['domEvent', 'ga4'] }`로 바꾸고 gtag를 로드한다.
5. `/ab-admin`에서 어드민 키 입력(`ABNXT_ADMIN_KEY`) → 인증 후 weight 슬라이더·시뮬레이션·Export/Import가 동작하는지 확인.

## Nuxt (examples/nuxt)

1. `pnpm --filter example-nuxt dev`
   2~5. Next와 동일 — `<template #A>/#B>` 슬롯 렌더, `?ab_*` override, `/abnxt-admin` 어드민(모듈 자동 주입). 분석 sink은 `nuxt.config.ts`의 `abnxt.analytics.sinks`로 설정.

> 노출(`exposures`)은 변이가 control로 떨어지면 발화되지 않는다(설계상 control은 분석에서 제외). assigned/override 변이에서만 표시된다.
