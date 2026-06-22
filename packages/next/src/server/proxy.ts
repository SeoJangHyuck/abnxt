import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createVisitorId, planAbProxy } from '@abnxt/core';

const VID_COOKIE = 'abnxt_vid';
const OVR_COOKIE_PREFIX = 'abnxt.ovr.';
const VID_HEADER = 'x-abnxt-vid';
const OVR_HEADER = 'x-abnxt-ovr';

export function createAbProxy(
  opts: { cookieName?: string } = {},
): (req: NextRequest) => NextResponse {
  const vidCookieName = opts.cookieName ?? VID_COOKIE;
  return (req) => {
    const overrideCookies: Record<string, string> = {};
    for (const c of req.cookies.getAll()) {
      if (c.name.startsWith(OVR_COOKIE_PREFIX)) {
        overrideCookies[c.name.slice(OVR_COOKIE_PREFIX.length)] = c.value;
      }
    }

    const plan = planAbProxy({
      vidCookie: req.cookies.get(vidCookieName)?.value,
      query: req.nextUrl.searchParams,
      overrideCookies,
      newVisitorId: createVisitorId,
    });

    // 신뢰 헤더: 클라가 직접 보낸 동명 헤더를 항상 덮어쓰기/제거
    const headers = new Headers(req.headers);
    if (plan.forwardVidHeader) headers.set(VID_HEADER, plan.vid);
    else headers.delete(VID_HEADER);
    headers.set(OVR_HEADER, JSON.stringify(plan.forwardOverrides));

    const res = NextResponse.next({ request: { headers } });

    if (plan.setVidCookie) {
      res.cookies.set(vidCookieName, plan.vid, { sameSite: 'lax', path: '/' });
    }
    for (const [k, v] of Object.entries(plan.setOverrides)) {
      res.cookies.set(OVR_COOKIE_PREFIX + k, v, { sameSite: 'lax', path: '/' });
    }
    for (const k of plan.deleteOverrides) {
      res.cookies.delete(OVR_COOKIE_PREFIX + k);
    }

    return res;
  };
}
