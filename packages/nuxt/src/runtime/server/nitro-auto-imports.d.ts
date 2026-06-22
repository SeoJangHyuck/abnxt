// Nitro 서버 컨텍스트 auto-import 타입 보강.
// 서버 라우트(runtime/server/routes/*)는 useRuntimeConfig를 import 없이 호출한다
// — 'nuxt/app'을 top-level import하면 Nitro 서버 번들 빌드가 깨지기 때문(설계 §어드민).
// 런타임에는 Nitro가 자동 주입하므로 여기서는 타입만 선언한다(.nuxt 생성 타입과 동등).
import type { H3Event } from 'h3';
import type { RuntimeConfig } from '@nuxt/schema';

declare global {
  function useRuntimeConfig(event?: H3Event): RuntimeConfig;
}

export {};
