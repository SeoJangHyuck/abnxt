import { verifyAdminKey, signSession } from '@abnxt/core/server';

/** 어드민 키→세션 교환 라우트 옵션. */
export interface AuthRouteOptions {
  /** 사전 세팅 인증키. 기본 `process.env.ABNXT_ADMIN_KEY`. */
  key?: string;
  /** 세션 서명 secret. 기본 `key`(키 하나로 운영, 간편). 16자 이상 필요. */
  secret?: string;
  /** 세션 쿠키 이름. 기본 'abnxt_admin'. config 라우트의 cookieName과 짝을 맞춰야 한다. */
  cookieName?: string;
  /** 세션 만료(ms). signSession 기본(24h)에 위임하려면 미설정. */
  maxAgeMs?: number;
  /** 결정적 테스트용 시계 주입. */
  now?: () => number;
}

const DEFAULT_COOKIE = 'abnxt_admin';

const NO_STORE = {
  'cache-control': 'no-store',
  'content-type': 'application/json',
};

/** Sec-Fetch-Site 기반 1차 CSRF 방어: 헤더가 있고 same-origin/none이 아니면 cross-site로 간주. */
function isCrossSite(req: Request): boolean {
  const site = req.headers.get('sec-fetch-site');
  return site != null && site !== 'same-origin' && site !== 'none';
}

function json(
  body: unknown,
  status: number,
  extra: Record<string, string> = {},
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...NO_STORE, ...extra },
  });
}

/**
 * Next 16 Route Handler 호환 POST/DELETE.
 * POST: 키 검증 → 세션 쿠키 발급(httpOnly·SameSite=Lax·Secure=prod·Path=/·Max-Age).
 * DELETE: 동일 쿠키 만료(Max-Age=0).
 *
 * config 라우트(createAbnxtConfigRoute)의 세션 검증은 abnxtCookieAuth로 짝을 맞춘다.
 * **cookieName/secret이 이 라우트와 동일**해야 발급한 세션이 검증된다:
 *
 * ```ts
 * // app/api/abnxt/auth/route.ts
 * export const { POST, DELETE } = createAbnxtAuthRoute({
 *   key: process.env.ABNXT_ADMIN_KEY,
 *   cookieName: 'abnxt_admin',
 * });
 * // app/api/abnxt/config/route.ts
 * export const { GET, PUT } = createAbnxtConfigRoute({
 *   storage: ...,
 *   auth: abnxtCookieAuth({
 *     secret: process.env.ABNXT_ADMIN_KEY!, // auth-route의 secret(기본 key)과 동일
 *     cookieName: 'abnxt_admin',            // auth-route의 cookieName과 동일
 *   }),
 * });
 * ```
 *
 * fail-closed(설계 §4.3): key 미설정 + production → 항상 401.
 * secret이 16자 미만이면 signSession이 throw → 500 + 명확한 경고.
 */
export function createAbnxtAuthRoute(opts: AuthRouteOptions = {}): {
  POST: (req: Request) => Promise<Response>;
  DELETE: (req: Request) => Promise<Response>;
} {
  const expected = opts.key ?? process.env.ABNXT_ADMIN_KEY;
  const secret = opts.secret ?? expected;
  const cookieName = opts.cookieName ?? DEFAULT_COOKIE;
  const isProd = process.env.NODE_ENV === 'production';

  const buildCookie = (value: string, maxAgeSec: number): string => {
    const parts = [
      `${cookieName}=${value}`,
      'HttpOnly',
      'SameSite=Lax',
      'Path=/',
      `Max-Age=${maxAgeSec}`,
    ];
    if (isProd) parts.push('Secure');
    return parts.join('; ');
  };

  return {
    async POST(req) {
      // CSRF: 브라우저 cross-site 변이 차단.
      if (isCrossSite(req)) {
        return json({ error: 'cross-site request blocked' }, 403);
      }

      // fail-closed: 키 미설정 시 prod는 항상 차단(어드민 비활성).
      if (!expected) {
        if (isProd) {
          console.warn(
            'abnxt: ABNXT_ADMIN_KEY is not set — admin auth is disabled (fail-closed).',
          );
          return json({ ok: false }, 401);
        }
        // dev: 키 미설정 시에도 인증 불가가 안전 기본(키 없이는 통과시키지 않음).
        console.warn(
          'abnxt: ABNXT_ADMIN_KEY is not set — admin auth will reject all keys (dev).',
        );
        return json({ ok: false }, 401);
      }

      let body: unknown;
      try {
        body = await req.json();
      } catch {
        return json({ ok: false }, 401);
      }
      const key =
        body && typeof body === 'object' && 'key' in body
          ? (body as { key?: unknown }).key
          : undefined;
      const provided = typeof key === 'string' ? key : undefined;

      if (!verifyAdminKey(provided, expected)) {
        return json({ ok: false }, 401);
      }

      // signSession은 secret<16자에 throw → 명확한 500 메시지로 변환.
      let token: string;
      try {
        token = signSession({ role: 'admin' }, secret as string, {
          maxAgeMs: opts.maxAgeMs,
          now: opts.now,
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'session signing failed';
        console.warn(`abnxt: ${message}`);
        return json({ error: message }, 500);
      }

      const maxAgeSec = Math.floor((opts.maxAgeMs ?? 86_400_000) / 1000);
      return json({ ok: true }, 200, {
        'set-cookie': buildCookie(token, maxAgeSec),
      });
    },

    async DELETE(_req: Request) {
      return json({ ok: true }, 200, {
        'set-cookie': buildCookie('', 0),
      });
    },
  };
}
