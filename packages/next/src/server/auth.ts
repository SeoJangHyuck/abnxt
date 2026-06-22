import {
  verifyBasicAuth,
  verifySession,
  type BasicCreds,
} from '@abnxt/core/server';

/** 요청 인증 결과. ok면 통과, 아니면 challenge(선택)로 401 응답 구성. */
export interface AuthResult {
  ok: boolean;
  challenge?: Record<string, string>;
}
export type AbAuth = (req: Request) => AuthResult | Promise<AuthResult>;

const SESSION_COOKIE = 'abnxt_session';

export function abnxtBasicAuth(creds: BasicCreds): AbAuth {
  return (req) => {
    const ok = verifyBasicAuth(req.headers.get('authorization'), creds);
    return ok
      ? { ok: true }
      : { ok: false, challenge: { 'WWW-Authenticate': 'Basic realm="abnxt"' } };
  };
}

/** HMAC 서명 세션 쿠키 검증. secret은 **전 replica 동일**해야 한다(설계 §7.4). */
export function abnxtCookieAuth(opts: {
  secret: string;
  cookieName?: string;
}): AbAuth {
  const name = opts.cookieName ?? SESSION_COOKIE;
  return (req) => {
    const token = readCookie(req.headers.get('cookie'), name);
    return { ok: verifySession(token, opts.secret).valid };
  };
}

export function abnxtCustomAuth(
  fn: (req: Request) => boolean | Promise<boolean>,
): AbAuth {
  return async (req) => ({ ok: await fn(req) });
}

export function readCookie(
  header: string | null,
  name: string,
): string | undefined {
  if (!header) return undefined;
  for (const part of header.split('; ')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i) === name) return part.slice(i + 1);
  }
  return undefined;
}
