import {
  defineEventHandler,
  getHeader,
  readBody as h3ReadBody,
  setCookie,
  deleteCookie,
  setResponseHeader,
  setResponseStatus,
} from 'h3';
import { verifyAdminKey, signSession } from '@abnxt/core/server';

const DEFAULT_COOKIE = 'abnxt_admin';
const MIN_SECRET_LENGTH = 16; // signSession과 동일(짧은 secret = env 누락 신호).

/** 쿠키 set/delete 추상화(테스트 가능): h3 setCookie/deleteCookie를 주입식으로. */
export interface AuthCookieIO {
  set(value: string, maxAgeSec: number): void;
  clear(): void;
}

/** 순수 매핑(테스트 가능): CSRF→키 검증→세션 발급/삭제. react createAbnxtAuthRoute와 동작 대칭. */
export interface AuthRequestIO {
  method: string;
  /** Sec-Fetch-Site 헤더(cross-site CSRF 방어용). */
  fetchSite?: string;
  /** 사전 세팅 인증키(env/runtimeConfig). 미설정이면 빈 문자열/undefined. */
  expectedKey?: string;
  /** 세션 서명 secret(기본 expectedKey 재사용). */
  secret?: string;
  /** production 환경 여부(fail-closed 판단). */
  isProduction: boolean;
  /** 세션 만료(ms). */
  maxAgeMs: number;
  readBody: () => Promise<unknown>;
  cookie: AuthCookieIO;
  /** 키 미설정+prod fail-closed 시 경고 로그. */
  onWarn?: (message: string) => void;
}

export interface AuthResponse {
  status: number;
  body: unknown;
}

function isCrossSite(site: string | undefined): boolean {
  return site != null && site !== 'same-origin' && site !== 'none';
}

/**
 * 키→세션 교환 핸들러의 순수 로직. POST(키 검증→쿠키 발급) / DELETE(쿠키 삭제).
 * - 렌더 경로가 아니므로 예외 메시지화(잘못된 secret → 500).
 * - fail-closed: 키 미설정 + production → 항상 401(설계 §4.3).
 */
export async function handleAuthRequest(
  io: AuthRequestIO,
): Promise<AuthResponse> {
  if (io.method === 'DELETE') {
    io.cookie.clear();
    return { status: 200, body: { ok: true } };
  }
  if (io.method !== 'POST') {
    return { status: 405, body: { ok: false, error: 'method not allowed' } };
  }
  // CSRF: 브라우저 cross-site 인증 시도 차단.
  if (isCrossSite(io.fetchSite)) {
    return {
      status: 403,
      body: { ok: false, error: 'cross-site request blocked' },
    };
  }

  const expected = io.expectedKey ?? '';
  const secret = io.secret && io.secret.length > 0 ? io.secret : expected;

  // 키 미설정 시 prod·dev 모두 즉시 401(React createAbnxtAuthRoute와 동일).
  // 키 없이는 통과시키지 않는 것이 안전 기본 — secret<16 경로(500)로 새지 않도록 여기서 종결.
  if (!expected) {
    io.onWarn?.(
      io.isProduction
        ? 'abnxt: ABNXT_ADMIN_KEY is not set — admin auth is disabled in production (fail-closed).'
        : 'abnxt: ABNXT_ADMIN_KEY is not set — admin auth will reject all keys (dev).',
    );
    return { status: 401, body: { ok: false } };
  }
  // secret이 너무 짧으면(키<16) signSession이 throw하므로 사전 검증해 메시지화(fail-fast).
  if (!secret || secret.length < MIN_SECRET_LENGTH) {
    return {
      status: 500,
      body: {
        ok: false,
        error: `admin key/secret must be at least ${MIN_SECRET_LENGTH} characters`,
      },
    };
  }

  let provided: string | undefined;
  const body = (await io.readBody()) as { key?: unknown } | null | undefined;
  if (body && typeof body.key === 'string') provided = body.key;

  if (!verifyAdminKey(provided, expected)) {
    return { status: 401, body: { ok: false } };
  }

  // signSession은 secret<16에서 throw하나 위에서 가드됨. 방어적으로 try/catch.
  try {
    const token = signSession({ role: 'admin' }, secret, {
      maxAgeMs: io.maxAgeMs,
    });
    io.cookie.set(token, Math.floor(io.maxAgeMs / 1000));
  } catch (e) {
    return {
      status: 500,
      body: { ok: false, error: (e as Error).message },
    };
  }
  return { status: 200, body: { ok: true } };
}

export interface VueAuthRouteOptions {
  /** 사전 세팅 인증키. 기본: process.env.ABNXT_ADMIN_KEY. */
  key?: string;
  /** 세션 서명 secret. 기본: key 재사용. */
  secret?: string;
  /** 세션 쿠키 이름. 기본: 'abnxt_admin'. */
  cookieName?: string;
  /** 세션 만료(ms). 기본: 24h. */
  maxAgeMs?: number;
}

const DEFAULT_MAX_AGE_MS = 86_400_000; // 24h.

/**
 * Nitro 이벤트 핸들러 생성(POST: 키→세션쿠키, DELETE: 로그아웃). react createAbnxtAuthRoute와 동등.
 * 쿠키: httpOnly, sameSite='lax', secure=prod, path='/'.
 */
export function defineAbnxtAuthHandler(opts: VueAuthRouteOptions = {}) {
  const cookieName = opts.cookieName ?? DEFAULT_COOKIE;
  const maxAgeMs = opts.maxAgeMs ?? DEFAULT_MAX_AGE_MS;
  return defineEventHandler(async (event) => {
    const isProduction = process.env.NODE_ENV === 'production';
    const expectedKey = opts.key ?? process.env.ABNXT_ADMIN_KEY ?? '';
    const secret = opts.secret ?? expectedKey;
    const res = await handleAuthRequest({
      method: event.method,
      fetchSite: getHeader(event, 'sec-fetch-site'),
      expectedKey,
      secret,
      isProduction,
      maxAgeMs,
      readBody: async () => {
        try {
          return await h3ReadBody(event);
        } catch {
          return undefined;
        }
      },
      cookie: {
        set: (value, maxAgeSec) =>
          setCookie(event, cookieName, value, {
            httpOnly: true,
            sameSite: 'lax',
            secure: isProduction,
            path: '/',
            maxAge: maxAgeSec,
          }),
        clear: () => deleteCookie(event, cookieName, { path: '/' }),
      },
      onWarn: (m) => console.warn(m),
    });
    setResponseHeader(event, 'cache-control', 'no-store');
    setResponseStatus(event, res.status);
    return res.body;
  });
}
