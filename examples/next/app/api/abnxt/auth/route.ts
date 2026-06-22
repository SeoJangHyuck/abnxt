import { createAbnxtAuthRoute } from '@abnxt/next/server';

// 키→세션 교환. key 기본 env ABNXT_ADMIN_KEY, secret 기본 key 재사용(간편).
// cookieName은 config 라우트(abnxtCookieAuth)와 일치해야 발급 세션이 검증된다.
export const { POST, DELETE } = createAbnxtAuthRoute({
  key: process.env.ABNXT_ADMIN_KEY ?? 'dev-admin-key-change-me',
  cookieName: 'abnxt_admin',
});
export const dynamic = 'force-dynamic';
