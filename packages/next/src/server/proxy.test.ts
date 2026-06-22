import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { createAbProxy } from './proxy';

function run(
  url: string,
  cookie?: string,
  extraHeaders: Record<string, string> = {},
) {
  const headers: Record<string, string> = { ...extraHeaders };
  if (cookie) headers.cookie = cookie;
  const req = new NextRequest(url, { headers });
  return createAbProxy()(req);
}

describe('createAbProxy', () => {
  it('sets a new vid cookie and forwards x-abnxt-vid on first visit', () => {
    const res = run('https://x.test/');
    const vid = res.cookies.get('abnxt_vid');
    expect(vid?.value).toBeTruthy();
    expect(res.headers.get('x-middleware-request-x-abnxt-vid')).toBe(
      vid?.value,
    );
  });

  it('does not set a vid cookie when one exists', () => {
    const res = run('https://x.test/', 'abnxt_vid=keep');
    expect(res.cookies.get('abnxt_vid')).toBeUndefined();
  });

  it('sets an override cookie and forwards it from ?ab_hero=B', () => {
    const res = run('https://x.test/?ab_hero=B', 'abnxt_vid=keep');
    expect(res.cookies.get('abnxt.ovr.hero')?.value).toBe('B');
    expect(res.headers.get('x-middleware-request-x-abnxt-ovr')).toBe(
      JSON.stringify({ hero: 'B' }),
    );
  });

  it('deletes all override cookies on ?ab_reset=1', () => {
    const res = run(
      'https://x.test/?ab_reset=1',
      'abnxt_vid=keep; abnxt.ovr.old=A',
    );
    // 삭제 쿠키는 빈 값 + 만료로 set 된다(버전에 따라 ''/undefined)
    expect(res.cookies.get('abnxt.ovr.old')?.value).toBeFalsy();
    expect(res.headers.get('x-middleware-request-x-abnxt-ovr')).toBe(
      JSON.stringify({}),
    );
  });

  it('neutralizes a client-supplied x-abnxt-ovr header', () => {
    const res = run('https://x.test/', 'abnxt_vid=keep', {
      'x-abnxt-ovr': '{"evil":"Z"}',
    });
    expect(res.headers.get('x-middleware-request-x-abnxt-ovr')).toBe(
      JSON.stringify({}),
    );
  });

  it('neutralizes a client-supplied x-abnxt-vid header for a returning visitor', () => {
    const res = run('https://x.test/', 'abnxt_vid=keep', {
      'x-abnxt-vid': 'forged',
    });
    expect(res.headers.get('x-middleware-request-x-abnxt-vid')).not.toBe(
      'forged',
    );
  });
});
