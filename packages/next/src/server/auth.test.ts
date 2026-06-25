import { describe, it, expect } from 'vitest';
import { abnxtCookieAuth } from './auth';
import { createAbnxtAuthRoute } from './auth-route';

const KEY = 'super-secret-admin-key-1234'; // >= 16자(세션 secret 재사용)

function postReq(body: unknown): Request {
  return new Request('https://x/api/abnxt/auth', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/** Set-Cookie의 첫 'name=value' 조각만 추출(Cookie 요청 헤더로 재사용). */
function cookiePair(res: Response): string {
  const sc = res.headers.get('set-cookie');
  if (!sc) throw new Error('no set-cookie');
  return sc.split(';')[0];
}

describe('abnxtCookieAuth ↔ createAbnxtAuthRoute 기본 쿠키 이름 일치', () => {
  it('cookieName을 양쪽 다 생략해도 발급 세션이 검증된다(기본값 SoT)', async () => {
    // 발급: cookieName 생략 → 기본값으로 Set-Cookie.
    const { POST } = createAbnxtAuthRoute({ key: KEY });
    const res = await POST(postReq({ key: KEY }));
    expect(res.status).toBe(200);
    const pair = cookiePair(res); // 'abnxt_admin=<token>'

    // 검증: cookieName 생략 → 발급과 동일 기본값을 읽어야 통과.
    const auth = abnxtCookieAuth({ secret: KEY });
    const result = await auth(
      new Request('https://x/admin', { headers: { cookie: pair } }),
    );
    expect(result.ok).toBe(true);
  });

  it('잘못된 secret이면 거부한다(검증 폴백 안전성)', async () => {
    const { POST } = createAbnxtAuthRoute({ key: KEY });
    const res = await POST(postReq({ key: KEY }));
    const pair = cookiePair(res);

    const auth = abnxtCookieAuth({ secret: 'a-totally-different-secret-xyz' });
    const result = await auth(
      new Request('https://x/admin', { headers: { cookie: pair } }),
    );
    expect(result.ok).toBe(false);
  });
});
