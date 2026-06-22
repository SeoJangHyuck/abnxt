import { loadConfig, EMPTY_CONFIG } from '../config';
import type { AbConfig, AdminStorage } from '../types';

export interface FsWriteLike {
  readFileSync(path: string, encoding: 'utf8'): string;
  writeFileSync(path: string, data: string, encoding: 'utf8'): void;
  mkdirSync(path: string, opts: { recursive: boolean }): void;
}

export interface FsAdminStorageOptions {
  /** config JSON 파일 경로. */
  path: string;
  /** 주입용(테스트/커스텀). 기본 node:fs. */
  fs?: FsWriteLike;
}

/**
 * 파일 기반 AdminStorage(load+save) — 무DB 어드민 영속화(어드민 config 라우트의 storage).
 * load 실패는 EMPTY 폴백(렌더 경로 예외 금지). save는 상위 디렉터리를 자동 생성한다.
 */
export function fsAdminStorage(opts: FsAdminStorageOptions): AdminStorage {
  return {
    async load(): Promise<AbConfig> {
      try {
        const fs = opts.fs ?? (await getNodeFs());
        return loadConfig(JSON.parse(fs.readFileSync(opts.path, 'utf8')));
      } catch {
        return EMPTY_CONFIG;
      }
    },
    async save(cfg: AbConfig): Promise<void> {
      const fs = opts.fs ?? (await getNodeFs());
      const dir = dirOf(opts.path);
      if (dir) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(opts.path, JSON.stringify(cfg, null, 2), 'utf8');
    },
  };
}

/** node:path 없이 상위 디렉터리 추출(POSIX/Windows 구분자 모두). */
function dirOf(p: string): string {
  const i = Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\'));
  return i > 0 ? p.slice(0, i) : '';
}

async function getNodeFs(): Promise<FsWriteLike> {
  const nodeFs = await import('node:fs');
  return {
    readFileSync: nodeFs.readFileSync as FsWriteLike['readFileSync'],
    writeFileSync: nodeFs.writeFileSync as FsWriteLike['writeFileSync'],
    mkdirSync: nodeFs.mkdirSync as FsWriteLike['mkdirSync'],
  };
}
