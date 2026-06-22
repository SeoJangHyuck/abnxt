import {
  defineEventHandler,
  getHeader,
  getCookie,
  readBody as h3ReadBody,
  setResponseHeader,
  setResponseStatus,
} from 'h3';
import {
  loadConfig,
  EMPTY_CONFIG,
  type AbConfig,
  type AdminStorage,
} from '@abnxt/core';
import {
  verifyBasicAuth,
  verifySession,
  type BasicCreds,
} from '@abnxt/core/server';

export interface ConfigRequestIO {
  method: string;
  /** Sec-Fetch-Site 헤더(cross-site CSRF 방어용). */
  fetchSite?: string;
  isAuthed: () => Promise<boolean>;
  readBody: () => Promise<unknown>;
  load: () => Promise<AbConfig>;
  save: (cfg: AbConfig) => Promise<void>;
}

export interface ConfigResponse {
  status: number;
  body: unknown;
}

function isCrossSite(site: string | undefined): boolean {
  return site != null && site !== 'same-origin' && site !== 'none';
}

/** 순수 매핑(테스트 가능): CSRF→인증→메서드 분기→검증. react config-route와 동작 대칭. */
export async function handleConfigRequest(
  io: ConfigRequestIO,
): Promise<ConfigResponse> {
  if (io.method === 'PUT' && isCrossSite(io.fetchSite)) {
    return { status: 403, body: { error: 'cross-site request blocked' } };
  }
  if (!(await io.isAuthed()))
    return { status: 401, body: { error: 'unauthorized' } };
  if (io.method === 'PUT') {
    let invalid = false;
    const cfg = loadConfig(await io.readBody(), {
      onWarn: () => {
        invalid = true;
      },
      fallback: EMPTY_CONFIG,
    });
    if (invalid && Object.keys(cfg.experiments).length === 0)
      return { status: 400, body: { error: 'invalid config' } };
    await io.save(cfg);
    return { status: 200, body: { ok: true } };
  }
  return { status: 200, body: await io.load() };
}

export interface VueConfigRouteOptions {
  storage: AdminStorage;
  auth: {
    basic?: BasicCreds;
    cookie?: { secret: string; cookieName?: string };
    custom?: (event: unknown) => boolean | Promise<boolean>;
  };
}

/** Nitro 이벤트 핸들러 생성(GET/PUT, 인증, no-store, CSRF). */
export function defineAbnxtConfigHandler(opts: VueConfigRouteOptions) {
  return defineEventHandler(async (event) => {
    const res = await handleConfigRequest({
      method: event.method,
      fetchSite: getHeader(event, 'sec-fetch-site'),
      isAuthed: async () => {
        if (opts.auth.basic)
          return verifyBasicAuth(
            getHeader(event, 'authorization'),
            opts.auth.basic,
          );
        if (opts.auth.cookie) {
          return verifySession(
            getCookie(event, opts.auth.cookie.cookieName ?? 'abnxt_session'),
            opts.auth.cookie.secret,
          ).valid;
        }
        if (opts.auth.custom) return opts.auth.custom(event);
        return false;
      },
      readBody: () => h3ReadBody(event),
      load: () => opts.storage.load(),
      save: (cfg) => opts.storage.save(cfg),
    });
    setResponseHeader(event, 'cache-control', 'no-store');
    setResponseStatus(event, res.status);
    return res.body;
  });
}
