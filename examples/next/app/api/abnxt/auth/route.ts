import { createAbnxtAuthRoute } from '@abnxt/next/server';

// 키→세션 교환. key 기본 env ABNXT_ADMIN_KEY, secret 기본 key 재사용(간편).
// cookieName은 config 라우트(abnxtCookieAuth)와 일치해야 발급 세션이 검증된다.
// key 미설정 시 createAbnxtAuthRoute가 fail-closed(dev/prod 모두 401). 로컬 dev는 .env로 주입.
export const { POST, DELETE } = createAbnxtAuthRoute({
  cookieName: 'abnxt_admin',
});
export const dynamic = 'force-dynamic';
