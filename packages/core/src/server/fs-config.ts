import { loadConfig, EMPTY_CONFIG } from '../config';
import type { AbConfig, ServerConfigSource } from '../types';

export interface FsLike {
  readFileSync(path: string, encoding: 'utf8'): string;
  statSync(path: string): { mtimeMs: number };
}

export interface FsConfigOptions {
  path: string;
  /** 주입용(테스트/커스텀). 기본 node:fs. */
  fs?: FsLike;
}

/**
 * 파일에서 config를 읽되 mtime 기반 캐시(변경 시에만 재파싱) → Node 호스팅에서 파일 교체만으로 라이브 반영.
 * 읽기/검증 실패는 직전 캐시 또는 EMPTY 폴백(렌더 경로 예외 금지).
 */
export function fsConfig(opts: FsConfigOptions): ServerConfigSource {
  let cached: { mtimeMs: number; cfg: AbConfig } | null = null;
  return {
    async load() {
      try {
        const fs = opts.fs ?? (await getNodeFs());
        const { mtimeMs } = fs.statSync(opts.path);
        if (cached && cached.mtimeMs === mtimeMs) return cached.cfg;
        const cfg = loadConfig(JSON.parse(fs.readFileSync(opts.path, 'utf8')));
        cached = { mtimeMs, cfg };
        return cfg;
      } catch {
        return cached?.cfg ?? EMPTY_CONFIG;
      }
    },
  };
}

async function getNodeFs(): Promise<FsLike> {
  const nodeFs = await import('node:fs');
  return {
    readFileSync: nodeFs.readFileSync as FsLike['readFileSync'],
    statSync: nodeFs.statSync as FsLike['statSync'],
  };
}
