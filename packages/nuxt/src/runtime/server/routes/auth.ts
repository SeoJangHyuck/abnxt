import { defineEventHandler } from 'h3';
import { useRuntimeConfig } from '#imports';
import { defineAbnxtAuthHandler } from '../auth-route';

/**
 * 모듈이 자동 등록하는 auth 라우트(POST: 키→세션쿠키, DELETE: 로그아웃).
 * 키/secret은 서버 전용 runtimeConfig.abnxt(env ABNXT_ADMIN_KEY) 경유 — public 비노출.
 *
 * useRuntimeConfig는 '#imports'에서 명시 import 한다. 'nuxt/app'을 top-level import하면
 * Nitro 서버 번들 빌드가 깨지고("Vue app aliases are not allowed in server runtime"),
 * import 없이 전역 호출에 의존하면 외부 node_modules로 설치됐을 때 Nitro auto-import가
 * 적용되지 않아 런타임에서 undefined가 된다. eventHandler 내부 호출로 env override(NUXT_*)도 반영.
 */
export default defineEventHandler((event) => {
  const rc = useRuntimeConfig(event);
  const abnxt = (rc.abnxt ?? {}) as {
    adminKey?: string;
    adminSecret?: string;
    cookieName?: string;
  };
  return defineAbnxtAuthHandler({
    key: abnxt.adminKey,
    secret: abnxt.adminSecret,
    cookieName: abnxt.cookieName ?? 'abnxt_admin',
  })(event);
});
