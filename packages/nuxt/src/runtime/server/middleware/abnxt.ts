import {
  defineEventHandler,
  getCookie,
  setCookie,
  deleteCookie,
  parseCookies,
} from 'h3';
import type { H3Event } from 'h3';
// '#imports'는 named import(tree-shake)로만 쓴다 — `import('#imports')` 네임스페이스 전체는
// Nitro에서 #imports 가상모듈 그래프 전체를 끌어와 호스트의 깨진 재export까지 노출시킨다.
// fs/crypto를 쓰는 @abnxt/core/server는 서버 전용 미들웨어라 정적 import해도 클라에 번들되지 않는다.
import { useRuntimeConfig } from '#imports';
import {
  planAbProxy,
  createVisitorId,
  OVERRIDE_COOKIE_PREFIX,
} from '@abnxt/core';
import { fsConfig } from '@abnxt/core/server';

const VID_COOKIE = 'abnxt_vid';

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
    if (name.startsWith(OVERRIDE_COOKIE_PREFIX))
      overrideCookies[name.slice(OVERRIDE_COOKIE_PREFIX.length)] = value;
  }
  const plan = planAbProxy({
    vidCookie: io.getCookie(VID_COOKIE),
    query: io.getQuery(),
    overrideCookies,
    newVisitorId: io.newVisitorId,
  });
  if (plan.setVidCookie) io.setCookie(VID_COOKIE, plan.vid);
  for (const [k, v] of Object.entries(plan.setOverrides))
    io.setCookie(OVERRIDE_COOKIE_PREFIX + k, v);
  for (const k of plan.deleteOverrides)
    io.deleteCookie(OVERRIDE_COOKIE_PREFIX + k);
  io.setContext('abnxt', { vid: plan.vid, overrides: plan.forwardOverrides });
}

function queryFromEvent(event: H3Event): URLSearchParams {
  const url = event.node.req.url ?? '';
  const qIndex = url.indexOf('?');
  return new URLSearchParams(qIndex >= 0 ? url.slice(qIndex + 1) : '');
}

export default defineEventHandler(async (event) => {
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

  // 라이브 config를 어드민 파일(configPath)에서 우선 로드해 ctx에 실어준다.
  // → 어드민 편집이 라이브 배정에 즉시 반영(Next 어댑터와 형평성). 실패/빈 파일이면
  //   plugin이 nuxt.config 인라인 config로 폴백한다.
  try {
    const rc = useRuntimeConfig(event);
    const path = (rc.abnxt as { configPath?: string } | undefined)?.configPath;
    if (!path) return;
    const fromFile = await fsConfig({ path }).load();
    if (Object.keys(fromFile.experiments).length > 0) {
      const ctx = (event.context.abnxt ?? {}) as Record<string, unknown>;
      ctx.config = fromFile;
      event.context.abnxt = ctx;
    }
  } catch {
    /* 파일 없음/파싱 실패/런타임 미구성 → 인라인 폴백 */
  }
});
