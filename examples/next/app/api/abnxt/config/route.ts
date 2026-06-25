import { createAbnxtConfigRoute, abnxtCookieAuth } from '@abnxt/next/server';
import { fsAdminStorage } from '@abnxt/core/server';
import { join } from 'node:path';

// 어드민이 읽고 쓰는 config 파일(데모는 기존 public/ab-config.json 재사용).
const PATH = join(process.cwd(), 'public/ab-config.json');

// secret/cookieName은 auth 라우트(createAbnxtAuthRoute)와 반드시 일치해야 한다.
const route = createAbnxtConfigRoute({
  storage: fsAdminStorage({ path: PATH }),
  auth: abnxtCookieAuth({
    secret: process.env.ABNXT_ADMIN_KEY ?? '',
    cookieName: 'abnxt_admin',
  }),
});

export const GET = route.GET;
export const PUT = route.PUT;
export const dynamic = 'force-dynamic';
