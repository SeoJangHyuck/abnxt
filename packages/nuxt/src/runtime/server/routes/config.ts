import { defineEventHandler } from 'h3';
import { useRuntimeConfig } from '#imports';
import { fsAdminStorage } from '@abnxt/core/server';
import { defineAbnxtConfigHandler } from '../config-route';

/**
 * 모듈이 자동 등록하는 config 라우트(GET/PUT). 인증은 abnxt_admin 세션 쿠키(어드민 키→세션).
 * - load/save: core fsAdminStorage(읽기 실패 EMPTY 폴백 + save 시 상위 디렉터리 자동 생성).
 *   서버리스/읽기전용 FS에서는 사용자 정의 storage 권장.
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
