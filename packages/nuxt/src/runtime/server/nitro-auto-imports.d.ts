// Nitro 서버 컨텍스트의 '#imports' 가상 모듈 타입 보강.
// 서버 라우트(runtime/server/routes/*)는 useRuntimeConfig를 '#imports'에서 가져온다.
// - 'nuxt/app'을 top-level import하면 Nitro 서버 번들 빌드가 깨진다("Vue app aliases
//   are not allowed in server runtime").
// - import 없이 전역 auto-import에 의존하면 외부 node_modules로 설치됐을 때 Nitro가
//   auto-import를 적용하지 않아 런타임에서 useRuntimeConfig가 undefined가 된다.
// 따라서 소비 앱의 Nitro가 제공하는 '#imports'에서 명시적으로 가져오고, 패키지 단독
// typecheck(tsc --noEmit)를 위해 여기서 '#imports' 모듈의 타입만 보강한다. 빌드 시
// nuxt-module-build는 '#imports'를 external로 유지하므로 dist에 import가 보존된다.
declare module '#imports' {
  import type { H3Event } from 'h3';
  import type { RuntimeConfig } from '@nuxt/schema';

  export function useRuntimeConfig(event?: H3Event): RuntimeConfig;
}
