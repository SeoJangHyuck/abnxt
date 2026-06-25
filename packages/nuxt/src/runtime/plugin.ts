import {
  defineNuxtPlugin,
  useState,
  useRequestEvent,
  useRuntimeConfig,
} from 'nuxt/app';
import {
  buildAbState,
  loadConfig,
  createVisitorId,
  EMPTY_CONFIG,
  OVERRIDE_COOKIE_PREFIX,
  type AbState,
  type AnalyticsFlags,
} from '@abnxt/core';
import { AB_INJECTION_KEY, buildRuntime } from './shared';

const STICKY_COOKIE = 'abnxt_a';

export default defineNuxtPlugin(async (nuxtApp) => {
  const rc = useRuntimeConfig();
  const analytics = ((
    rc.public.abnxt as { analytics?: AnalyticsFlags } | undefined
  )?.analytics ?? {}) as AnalyticsFlags;
  const state = useState<AbState | null>('abnxt:state', () => null);

  // state.value는 SSR이 채워 클라로 hydration된다. 비어 있으면(=정적/SPA/미들웨어 미실행)
  // 서버는 요청에서, 클라는 document.cookie에서 구성(CSR-only 제한 모드: config는 EMPTY → control).
  if (!state.value) {
    if (import.meta.server) {
      const event = useRequestEvent();
      const ctx = (event?.context?.abnxt ?? {}) as {
        vid?: string;
        overrides?: Record<string, string>;
        config?: unknown;
      };
      const cookies = parseRequestCookies(event);
      state.value = await buildAbState({
        getVid: () => ctx.vid ?? cookies['abnxt_vid'],
        getOverrides: () => ctx.overrides ?? readOverrideCookies(cookies),
        getStickyCookie: () => cookies[STICKY_COOKIE],
        // 서버 미들웨어(abnxt)가 configPath 파일을 읽어 ctx.config에 실어준다(어드민↔라이브 공유).
        // 없으면 nuxt.config 인라인 config로 폴백(하위호환).
        loadConfig: async () =>
          loadConfig(
            ctx.config ??
              (rc.abnxt as { config?: unknown } | undefined)?.config,
          ),
        newVisitorId: createVisitorId,
      });
    } else {
      const cookies = splitCookieHeader(
        typeof document !== 'undefined' ? document.cookie : '',
      );
      state.value = await buildAbState({
        getVid: () => cookies['abnxt_vid'],
        getOverrides: () => readOverrideCookies(cookies),
        getStickyCookie: () => cookies[STICKY_COOKIE],
        loadConfig: async () => EMPTY_CONFIG, // 클라는 서버 config 접근 불가 → CSR-only 폴백
        newVisitorId: createVisitorId,
      });
    }
  }

  // 클라/서버 공통: 런타임 구성(분석/sticky는 클라에서만 실효, 서버는 resolve만).
  // state.value는 위에서 항상 채워지므로 non-null.
  const runtime = buildRuntime(() => state.value as AbState, { analytics });
  nuxtApp.vueApp.provide(AB_INJECTION_KEY, runtime);

  if (import.meta.client) {
    runtime.persistVid();
  }
});

function parseRequestCookies(event: unknown): Record<string, string> {
  const header = (
    event as { node?: { req?: { headers?: Record<string, string> } } }
  )?.node?.req?.headers?.cookie;
  return splitCookieHeader(header);
}
function splitCookieHeader(header?: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split('; ')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i)] = part.slice(i + 1);
  }
  return out;
}
function readOverrideCookies(
  cookies: Record<string, string>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(cookies)) {
    if (k.startsWith(OVERRIDE_COOKIE_PREFIX))
      out[k.slice(OVERRIDE_COOKIE_PREFIX.length)] = v;
  }
  return out;
}
