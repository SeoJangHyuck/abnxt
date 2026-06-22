import { loadConfig } from '../config';
import type { AbConfig, AdminStorage } from '../types';

/** apiStorage가 사용하는 최소 fetch 시그니처(typeof fetch도 할당 가능). */
export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export interface ApiStorageOptions {
  /** config 엔드포인트(GET/PUT 동일 경로). */
  base: string;
  fetchImpl?: FetchLike;
  /** 매 요청에 추가할 헤더(예: CSRF 토큰). */
  headers?: () => Record<string, string>;
}

/** 라이브 저장소: 인증된 서버 라우트(createAbnxtConfigRoute)와 GET/PUT으로 통신. */
export function apiStorage(opts: ApiStorageOptions): AdminStorage {
  const doFetch = opts.fetchImpl ?? fetch;
  const extra = () => opts.headers?.() ?? {};
  return {
    async load() {
      const res = await doFetch(opts.base, {
        method: 'GET',
        credentials: 'same-origin',
        headers: { ...extra() },
      });
      if (!res.ok) throw new Error(`abnxt: config load failed (${res.status})`);
      return loadConfig(await res.json());
    },
    async save(cfg: AbConfig) {
      const res = await doFetch(opts.base, {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json', ...extra() },
        body: JSON.stringify(cfg),
      });
      if (!res.ok) throw new Error(`abnxt: config save failed (${res.status})`);
    },
  };
}
