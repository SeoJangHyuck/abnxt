import {
  defineEventHandler,
  getCookie,
  setCookie,
  deleteCookie,
  parseCookies,
} from 'h3';
import type { H3Event } from 'h3';
import { planAbProxy, createVisitorId } from '@abnxt/core';

const VID_COOKIE = 'abnxt_vid';
const OVR_COOKIE_PREFIX = 'abnxt.ovr.';

/** 매핑 로직(테스트 가능): plan을 io에 적용. */
export interface AbRequestIO {
  getCookie(name: string): string | undefined;
  getAllCookies(): Record<string, string>;
  getQuery(): URLSearchParams;
  setCookie(name: string, value: string): void;
  deleteCookie(name: string): void;
  setContext(key: string, value: unknown): void;
  newVisitorId(): string;
}

export function applyAbRequest(io: AbRequestIO): void {
  const overrideCookies: Record<string, string> = {};
  for (const [name, value] of Object.entries(io.getAllCookies())) {
    if (name.startsWith(OVR_COOKIE_PREFIX))
      overrideCookies[name.slice(OVR_COOKIE_PREFIX.length)] = value;
  }
  const plan = planAbProxy({
    vidCookie: io.getCookie(VID_COOKIE),
    query: io.getQuery(),
    overrideCookies,
    newVisitorId: io.newVisitorId,
  });
  if (plan.setVidCookie) io.setCookie(VID_COOKIE, plan.vid);
  for (const [k, v] of Object.entries(plan.setOverrides))
    io.setCookie(OVR_COOKIE_PREFIX + k, v);
  for (const k of plan.deleteOverrides) io.deleteCookie(OVR_COOKIE_PREFIX + k);
  io.setContext('abnxt', { vid: plan.vid, overrides: plan.forwardOverrides });
}

function queryFromEvent(event: H3Event): URLSearchParams {
  const url = event.node.req.url ?? '';
  const qIndex = url.indexOf('?');
  return new URLSearchParams(qIndex >= 0 ? url.slice(qIndex + 1) : '');
}

export default defineEventHandler((event) => {
  applyAbRequest({
    getCookie: (name) => getCookie(event, name),
    getAllCookies: () => parseCookies(event),
    getQuery: () => queryFromEvent(event),
    setCookie: (name, value) =>
      setCookie(event, name, value, { sameSite: 'lax', path: '/' }),
    deleteCookie: (name) => deleteCookie(event, name, { path: '/' }),
    setContext: (key, value) => {
      event.context[key] = value;
    },
    newVisitorId: createVisitorId,
  });
});
