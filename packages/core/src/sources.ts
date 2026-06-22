import { EMPTY_CONFIG, loadConfig } from './config';
import type { ClientConfigSource, ServerConfigSource } from './types';

/** 빌드 시 import한 config 객체를 정규화해 서버 소스로 노출. */
export function bundledConfig(raw: unknown): ServerConfigSource {
  const cfg = loadConfig(raw);
  return { load: async () => cfg };
}

/** 클라이언트가 /ab-config.json을 받아오는 소스. 실패 시 EMPTY 폴백. */
export function fetchConfig(
  url = '/ab-config.json',
  fetchImpl: typeof fetch = fetch,
): ClientConfigSource {
  return {
    async load() {
      try {
        const res = await fetchImpl(url, {
          headers: { 'cache-control': 'no-cache' },
        });
        return loadConfig(await res.json());
      } catch {
        return EMPTY_CONFIG;
      }
    },
  };
}
