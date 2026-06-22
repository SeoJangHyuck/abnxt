import { defineEventHandler } from 'h3';
import { fsAdminStorage } from '@abnxt/core/server';
import { defineAbnxtConfigHandler } from '../config-route';

/**
 * 모듈이 자동 등록하는 config 라우트(GET/PUT). 인증은 abnxt_admin 세션 쿠키(어드민 키→세션).
 * - load/save: core fsAdminStorage(읽기 실패 EMPTY 폴백 + save 시 상위 디렉터리 자동 생성).
 *   서버리스/읽기전용 FS에서는 사용자 정의 storage 권장.
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
    configPath?: string;
    cookieName?: string;
  };
  const path = abnxt.configPath ?? '.data/abnxt-config.json';
  return defineAbnxtConfigHandler({
    storage: fsAdminStorage({ path }),
    auth: {
      cookie: {
        secret: abnxt.adminSecret || abnxt.adminKey || '',
        cookieName: abnxt.cookieName ?? 'abnxt_admin',
      },
    },
  })(event);
});
