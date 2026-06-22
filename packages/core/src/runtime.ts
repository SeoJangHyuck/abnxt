import { resolveFrom } from './resolve-from';
import { createAnalyticsBus, sessionDedupStore } from './analytics/bus';
import {
  resolveBuiltinSinks,
  type ResolveBuiltinSinksOptions,
} from './builtin-sinks';
import { createStickyWriter, type StickyWriterOptions } from './sticky';
import type { AbState, AnalyticsFlags, Sink, ResolveResult } from './types';

const STICKY_COOKIE = 'abnxt_a';
const VID_COOKIE = 'abnxt_vid';
const DEFAULT_CONSENT_COOKIE = 'abnxt_consent';

/** 이름 기반 cookie 접근(브라우저 기본, 주입 가능). */
export interface AbCookieIO {
  read(name: string): string | undefined;
  write(name: string, value: string): void;
}

export interface AbRuntimeOptions {
  /** 최신 스냅샷 게터(소프트 내비 시 최신 반영). */
  getState: () => AbState;
  analytics?: AnalyticsFlags;
  /** 직접 합성 sink(고급) — 있으면 analytics.sinks 무시. */
  sinks?: Sink[];
  /** 직접 합성 consent(고급) — 있으면 analytics.requireConsent 무시. */
  consent?: () => boolean;
  /** cookie IO(기본 브라우저 document.cookie). */
  cookieIO?: AbCookieIO;
  /** 타임스탬프(기본 Date.now). */
  now?: () => number;
  /** 내장 sink 옵션 패스스루(domEvent.target 등). */
  domEvent?: ResolveBuiltinSinksOptions['domEvent'];
  dataLayer?: ResolveBuiltinSinksOptions['dataLayer'];
  ga4?: ResolveBuiltinSinksOptions['ga4'];
  clarity?: ResolveBuiltinSinksOptions['clarity'];
  /** sticky writer 스케줄러(테스트 동기 실행용). */
  stickySchedule?: StickyWriterOptions['schedule'];
}

export interface AbRuntime {
  resolve(key: string): ResolveResult;
  fireExposure(key: string, r: ResolveResult): void;
  persistVid(): void;
  /** 실험의 control 변이 키('' if 미존재). slot/fallback 결정용(vue <Experiment> 등). */
  controlKey(key: string): string;
  /** sticky 배치 즉시 flush(테스트/언마운트용). */
  flush(): void;
}

function browserCookieIO(): AbCookieIO {
  return {
    read: (name) => {
      if (typeof document === 'undefined') return undefined;
      const hit = document.cookie
        .split('; ')
        .find((c) => c.startsWith(name + '='));
      return hit ? hit.slice(name.length + 1) : undefined;
    },
    write: (name, value) => {
      if (typeof document === 'undefined') return;
      document.cookie = `${name}=${value}; path=/; SameSite=Lax`;
    },
  };
}

/** 프레임워크 무관 클라 런타임: resolve + exposure(분석/sticky) + vid 영속. react/vue 공유. */
export function createAbRuntime(opts: AbRuntimeOptions): AbRuntime {
  const cookieIO = opts.cookieIO ?? browserCookieIO();
  const now = opts.now ?? (() => Date.now());

  const resolvedSinks: Sink[] =
    opts.sinks ??
    resolveBuiltinSinks(opts.analytics?.sinks ?? ['domEvent'], {
      domEvent: opts.domEvent,
      dataLayer: opts.dataLayer,
      ga4: opts.ga4,
      clarity: opts.clarity,
    });

  const shouldTrack: (() => boolean) | undefined =
    opts.consent ??
    (opts.analytics?.requireConsent
      ? () =>
          !!cookieIO.read(
            opts.analytics?.consentCookie ?? DEFAULT_CONSENT_COOKIE,
          )
      : undefined);

  const bus = createAnalyticsBus({
    sinks: resolvedSinks,
    dedupStore: sessionDedupStore(),
    shouldTrack,
    debug: opts.analytics?.debug,
  });

  const stickyWriter = createStickyWriter(
    {
      read: () => cookieIO.read(STICKY_COOKIE),
      write: (v) => cookieIO.write(STICKY_COOKIE, v),
    },
    opts.stickySchedule ? { schedule: opts.stickySchedule } : {},
  );

  return {
    resolve: (key) => resolveFrom(opts.getState(), key),
    fireExposure: (key, r) => {
      if (r.source === 'control') return;
      const state = opts.getState();
      const exp = state.config.experiments[key];
      if (!exp) return;
      bus.track({
        type: 'exposure',
        experiment: key,
        name: exp.name,
        variant: r.variant,
        visitorId: state.visitorId,
        source: r.source,
        ts: now(),
      });
      if (r.source === 'assigned' && exp.sticky !== false)
        stickyWriter.record(key, r.variant);
    },
    persistVid: () => {
      if (!cookieIO.read(VID_COOKIE))
        cookieIO.write(VID_COOKIE, opts.getState().visitorId);
    },
    controlKey: (key) => opts.getState().config.experiments[key]?.control ?? '',
    flush: () => stickyWriter.flush(),
  };
}
