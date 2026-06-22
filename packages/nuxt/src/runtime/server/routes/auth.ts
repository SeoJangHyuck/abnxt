import { defineEventHandler } from 'h3';
import { defineAbnxtAuthHandler } from '../auth-route';

/**
 * 모듈이 자동 등록하는 auth 라우트(POST: 키→세션쿠키, DELETE: 로그아웃).
 * 키/secret은 서버 전용 runtimeConfig.abnxt(env ABNXT_ADMIN_KEY) 경유 — public 비노출.
 *
 * useRuntimeConfig는 eventHandler 내부에서 호출한다(Nitro 자동 import). top-level에서
 * 'nuxt/app'을 import하면 Nitro 서버 번들 빌드가 깨진다("Vue app aliases are not allowed
 * in server runtime"). 내부 호출이라야 런타임 env override(NUXT_*)도 반영된다.
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
