import { loadConfig, EMPTY_CONFIG } from '../config';
import type { AbConfig } from '../types';

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
