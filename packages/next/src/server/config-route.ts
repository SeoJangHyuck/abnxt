import { loadConfig, EMPTY_CONFIG, type AdminStorage } from '@abnxt/core';
import type { AbAuth } from './auth';

export interface ConfigRouteOptions {
  storage: AdminStorage;
  auth: AbAuth;
}

const NO_STORE = {
  'cache-control': 'no-store',
  'content-type': 'application/json',
};

/** Sec-Fetch-Site 기반 1차 CSRF 방어: 헤더가 있고 same-origin/none이 아니면 cross-site로 간주. */
function isCrossSite(req: Request): boolean {
  const site = req.headers.get('sec-fetch-site');
  return site != null && site !== 'same-origin' && site !== 'none';
}

/** Next 16 Route Handler 호환 GET/PUT(인증 필수·no-store·검증·PUT CSRF 방어). */
export function createAbnxtConfigRoute(opts: ConfigRouteOptions): {
  GET: (req: Request) => Promise<Response>;
  PUT: (req: Request) => Promise<Response>;
} {
  const guard = async (req: Request): Promise<Response | null> => {
    const r = await opts.auth(req);
    if (r.ok) return null;
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { ...NO_STORE, ...(r.challenge ?? {}) },
    });
  };
  return {
    async GET(req) {
      const denied = await guard(req);
      if (denied) return denied;
      const cfg = await opts.storage.load();
      return new Response(JSON.stringify(cfg), {
        status: 200,
        headers: NO_STORE,
      });
    },
    async PUT(req) {
      // CSRF: 브라우저 cross-site 변이 차단(쿠키 인증 보호).
      if (isCrossSite(req)) {
        return new Response(
          JSON.stringify({ error: 'cross-site request blocked' }),
          { status: 403, headers: NO_STORE },
        );
      }
      const denied = await guard(req);
      if (denied) return denied;
      let body: unknown;
      try {
        body = await req.json();
      } catch {
        return new Response(JSON.stringify({ error: 'invalid json' }), {
          status: 400,
          headers: NO_STORE,
        });
      }
      let invalid = false;
      const cfg = loadConfig(body, {
        onWarn: () => {
          invalid = true;
        },
        fallback: EMPTY_CONFIG,
      });
      if (invalid && Object.keys(cfg.experiments).length === 0) {
        return new Response(JSON.stringify({ error: 'invalid config' }), {
          status: 400,
          headers: NO_STORE,
        });
      }
      await opts.storage.save(cfg);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: NO_STORE,
      });
    },
  };
}
