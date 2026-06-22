import type { InjectionKey } from 'vue';
import {
  createAbRuntime,
  type AbRuntime,
  type AbState,
  type AnalyticsFlags,
  type Sink,
} from '@abnxt/core';

export const AB_INJECTION_KEY: InjectionKey<AbRuntime> = Symbol('abnxt');

export interface BuildRuntimeOptions {
  analytics?: AnalyticsFlags;
  sinks?: Sink[];
  consent?: () => boolean;
  /** 테스트용 sticky 동기 flush 등. */
  stickySchedule?: (cb: () => void) => void;
}

/** AbState 게터로부터 core 런타임을 구성(vue용 얇은 래퍼). */
export function buildRuntime(
  getState: () => AbState,
  opts: BuildRuntimeOptions = {},
): AbRuntime {
  return createAbRuntime({
    getState,
    analytics: opts.analytics,
    sinks: opts.sinks,
    consent: opts.consent,
    stickySchedule: opts.stickySchedule,
  });
}
