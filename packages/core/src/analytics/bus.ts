import type { AnalyticsEvent, Sink } from '../types';

export interface KVStore {
  has(key: string): boolean;
  add(key: string): void;
}

export interface BusOptions {
  sinks?: Sink[];
  dedupStore?: KVStore;
  /** consent 게이트. false면 미발화. 기본 항상 true. */
  shouldTrack?: () => boolean;
  debug?: boolean;
}

export interface AnalyticsBus {
  track(event: AnalyticsEvent): void;
  addSink(sink: Sink): void;
}

function memoryDedupStore(): KVStore {
  const set = new Set<string>();
  return { has: (k) => set.has(k), add: (k) => void set.add(k) };
}

/** sessionStorage 기반 dedup 저장소. 없으면 인메모리로 폴백. */
export function sessionDedupStore(
  prefix = 'abnxt.exp.',
  storage?: Storage,
): KVStore {
  const ss =
    storage ?? (globalThis as { sessionStorage?: Storage }).sessionStorage;
  if (!ss) return memoryDedupStore();
  return {
    has: (k) => ss.getItem(prefix + k) !== null,
    add: (k) => {
      try {
        ss.setItem(prefix + k, '1');
      } catch {
        /* quota/blocked → 무시 */
      }
    },
  };
}

export function createAnalyticsBus(opts: BusOptions = {}): AnalyticsBus {
  const sinks: Sink[] = [...(opts.sinks ?? [])];
  const dedup = opts.dedupStore ?? memoryDedupStore();
  const shouldTrack = opts.shouldTrack ?? (() => true);
  const log = (...a: unknown[]) => {
    if (opts.debug) console.debug('[abnxt]', ...a);
  };

  return {
    addSink(sink) {
      sinks.push(sink);
    },
    track(event) {
      if (event.source === 'control')
        return log('skip control', event.experiment);
      if (!shouldTrack()) return log('skip consent', event.experiment);
      const dedupKey = `${event.type}:${event.experiment}`;
      if (dedup.has(dedupKey)) return log('skip dup', dedupKey);
      dedup.add(dedupKey);
      log('track', event);
      for (const sink of sinks) {
        try {
          sink(event);
        } catch (e) {
          log('sink error', e);
        }
      }
    },
  };
}
