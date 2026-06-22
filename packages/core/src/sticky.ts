export function parseStickyCookie(
  raw: string | undefined | null,
): Record<string, string> {
  if (!raw) return {};
  try {
    const obj = JSON.parse(decodeURIComponent(raw)) as unknown;
    if (!obj || typeof obj !== 'object') return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      if (typeof v === 'string') out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

export function serializeStickyCookie(map: Record<string, string>): string {
  return encodeURIComponent(JSON.stringify(map));
}

export interface CookieIO {
  read(): string | undefined;
  write(value: string): void;
}

export interface StickyWriter {
  record(key: string, variant: string): void;
  flush(): void;
}

export interface StickyWriterOptions {
  /** flush를 예약하는 스케줄러. 기본 queueMicrotask. */
  schedule?: (cb: () => void) => void;
}

/** 인메모리 누적 + 단일 배치 write로 document.cookie read-modify-write 경합을 방지. */
export function createStickyWriter(
  io: CookieIO,
  opts: StickyWriterOptions = {},
): StickyWriter {
  const schedule = opts.schedule ?? ((cb) => queueMicrotask(cb));
  let pending: Record<string, string> | null = null;
  let scheduled = false;

  const flush = (): void => {
    scheduled = false;
    if (!pending) return;
    const merged = { ...parseStickyCookie(io.read()), ...pending };
    pending = null;
    io.write(serializeStickyCookie(merged));
  };

  return {
    record(key, variant) {
      if (!pending) pending = {};
      pending[key] = variant;
      if (!scheduled) {
        scheduled = true;
        schedule(flush);
      }
    },
    flush,
  };
}
