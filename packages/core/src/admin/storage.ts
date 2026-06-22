import { loadConfig, EMPTY_CONFIG } from '../config';
import type { AbConfig, AdminStorage } from '../types';

const DRAFT_KEY = 'abnxt:draft';

export interface DraftStorage extends AdminStorage {
  /** 저장된 초안이 존재하는지(빈 config 저장과 미저장을 구별). */
  hasDraft(): boolean;
}

/** localStorage 기반 무백엔드 초안 저장소(AdminStorage + hasDraft). */
export function createLocalDraftStorage(storage?: Storage): DraftStorage {
  const ss = storage ?? (globalThis as { localStorage?: Storage }).localStorage;
  return {
    hasDraft() {
      return ss?.getItem(DRAFT_KEY) != null;
    },
    async load() {
      const raw = ss?.getItem(DRAFT_KEY);
      if (!raw) return EMPTY_CONFIG;
      return loadConfig(safeParse(raw));
    },
    async save(cfg) {
      ss?.setItem(DRAFT_KEY, JSON.stringify(cfg));
    },
  };
}

function safeParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

/** Export용 직렬화(보기 좋은 JSON + updatedAt 갱신). */
export function serializeConfig(
  cfg: AbConfig,
  now: () => string = () => new Date().toISOString(),
): string {
  return JSON.stringify({ ...cfg, updatedAt: now() }, null, 2);
}

export interface ParseResult {
  config: AbConfig;
  ok: boolean;
  message?: string;
}

/** Import용 파싱 + core 검증/정규화. JSON 실패/검증 경고 시 ok:false(데이터 손실 방지). */
export function parseConfigJson(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { config: EMPTY_CONFIG, ok: false, message: 'Invalid JSON' };
  }
  let warned = '';
  const config = loadConfig(raw, {
    onWarn: (m) => {
      if (!warned) warned = m;
    },
  });
  return { config, ok: !warned, message: warned || undefined };
}

/** 초기 로드: 저장된 초안이 있으면 우선(빈 초안 포함), 없으면 원격(fetchConfig). */
export async function loadInitialConfig(opts: {
  draft: DraftStorage;
  fetchRemote: () => Promise<AbConfig>;
}): Promise<AbConfig> {
  if (opts.draft.hasDraft()) return opts.draft.load();
  return opts.fetchRemote();
}
