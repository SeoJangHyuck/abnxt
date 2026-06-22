import { loadConfig, EMPTY_CONFIG } from '../config';
import type { AbConfig, ServerConfigSource } from '../types';

export interface RemoteConfigOptions {
  /** 캐시 TTL(ms). 0/미설정이면 매 load마다 호출. */
  ttlMs?: number;
  now?: () => number;
}

/**
 * 벤더 중립 외부 소스: 사용자가 주입한 async loader(Edge Config/KV/오브젝트 스토리지/HTTP 등)에서 원문을 받아 정규화.
 * 실패 시 직전 캐시 또는 EMPTY 폴백. 멀티 replica에서 모든 pod가 같은 외부 소스를 보면 스큐 최소(설계 §7.4).
 */
export function remoteConfig(
  loader: () => Promise<unknown>,
  opts: RemoteConfigOptions = {},
): ServerConfigSource {
  const now = opts.now ?? (() => Date.now());
  const ttl = opts.ttlMs ?? 0;
  let cached: { at: number; cfg: AbConfig } | null = null;
  return {
    async load() {
      if (cached && ttl > 0 && now() - cached.at < ttl) return cached.cfg;
      try {
        const cfg = loadConfig(await loader());
        cached = { at: now(), cfg };
        return cfg;
      } catch {
        return cached?.cfg ?? EMPTY_CONFIG;
      }
    },
  };
}
