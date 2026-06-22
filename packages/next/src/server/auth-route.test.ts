import { describe, it, expect, afterEach } from 'vitest';
import { createAbnxtAuthRoute } from './auth-route';
import { verifySession } from '@abnxt/core/server';

const KEY = 'super-secret-admin-key-1234'; // >= 16자(세션 secret 재사용)

/** Set-Cookie 문자열에서 cookieName 값 추출. */
function readSetCookie(res: Response, name: string): string | undefined {
  const sc = res.headers.get('set-cookie');
  if (!sc) return undefined;
  for (const part of sc.split('; ')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i) === name) return part.slice(i + 1);
  }
  return undefined;
}

function postReq(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request('https://x/api/abnxt/auth', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

const ORIGINAL_NODE_ENV = process.env.NODE_ENV;

afterEach(() => {
  process.env.NODE_ENV = ORIGINAL_NODE_ENV;
});

describe('createAbnxtAuthRoute POST', () => {
  it('issues a session cookie and 200 on a matching key', async () => {
    const { POST } = createAbnxtAuthRoute({ key: KEY });
    const res = await POST(postReq({ key: KEY }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });

    const sc = res.headers.get('set-cookie');
    expect(sc).toBeTruthy();
    expect(sc).toContain('HttpOnly');
    expect(sc).toContain('SameSite=Lax');
    expect(sc).toContain('Path=/');
    expect(sc).toContain('Max-Age=');

    // 발급 토큰이 동일 secret(=key)으로 검증 가능해야 한다.
    const token = readSetCookie(res, 'abnxt_admin');
    expect(token).toBeTruthy();
    const v = verifySession(token, KEY);
    expect(v.valid).toBe(true);
    expect(v.payload).toMatchObject({ role: 'admin' });
  });

  it('honors a custom cookieName', async () => {
    const { POST } = createAbnxtAuthRoute({ key: KEY, cookieName: 'ab_x' });
    const res = await POST(postReq({ key: KEY }));
    expect(res.headers.get('set-cookie')).toContain('ab_x=');
  });

  it('returns 401 on a wrong key (no cookie)', async () => {
    const { POST } = createAbnxtAuthRoute({ key: KEY });
    const res = await POST(postReq({ key: 'nope' }));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ ok: false });
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it('returns 403 on a cross-site POST (CSRF defense)', async () => {
    const { POST } = createAbnxtAuthRoute({ key: KEY });
    const res = await POST(
      postReq({ key: KEY }, { 'sec-fetch-site': 'cross-site' }),
    );
    expect(res.status).toBe(403);
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it('allows same-origin Sec-Fetch-Site', async () => {
    const { POST } = createAbnxtAuthRoute({ key: KEY });
    const res = await POST(
      postReq({ key: KEY }, { 'sec-fetch-site': 'same-origin' }),
    );
    expect(res.status).toBe(200);
  });

  it('is no-store', async () => {
    const { POST } = createAbnxtAuthRoute({ key: KEY });
    const res = await POST(postReq({ key: KEY }));
    expect(res.headers.get('cache-control')).toContain('no-store');
  });

  it('fail-closed: missing key + production → always 401', async () => {
    process.env.NODE_ENV = 'production';
    const { POST } = createAbnxtAuthRoute({ key: undefined });
    const res = await POST(postReq({ key: 'anything' }));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ ok: false });
  });

  it('returns 500 when secret is shorter than 16 chars', async () => {
    // 키는 일치하지만 secret(=key)이 짧아 signSession이 throw → 500.
    const short = 'short-key';
    const { POST } = createAbnxtAuthRoute({ key: short });
    const res = await POST(postReq({ key: short }));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBeTruthy();
  });

  it('separates secret from key when provided', async () => {
    const secret = 'a-different-long-secret-9999';
    const { POST } = createAbnxtAuthRoute({ key: KEY, secret });
    const res = await POST(postReq({ key: KEY }));
    expect(res.status).toBe(200);
    const token = readSetCookie(res, 'abnxt_admin');
    expect(verifySession(token, secret).valid).toBe(true);
    // key로는 검증 불가(secret 분리 확인).
    expect(verifySession(token, KEY).valid).toBe(false);
  });
});

describe('createAbnxtAuthRoute DELETE', () => {
  it('expires the cookie with Max-Age=0 and 200', async () => {
    const { DELETE } = createAbnxtAuthRoute({ key: KEY });
    const res = await DELETE(
      new Request('https://x/api/abnxt/auth', { method: 'DELETE' }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    const sc = res.headers.get('set-cookie');
    expect(sc).toContain('abnxt_admin=');
    expect(sc).toContain('Max-Age=0');
  });
});
