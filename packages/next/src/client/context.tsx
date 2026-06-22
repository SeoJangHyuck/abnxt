'use client';

import { createContext, useEffect, useMemo, useRef } from 'react';
import {
  createAbRuntime,
  type AbRuntime,
  type ResolveResult,
} from '@abnxt/core';
import type { AbState, AbStateProviderProps } from '../types';

export interface AbContextValue {
  state: AbState;
  resolve: (key: string) => ResolveResult;
  fireExposure: (key: string, r: ResolveResult) => void;
}

export const AbContext = createContext<AbContextValue | null>(null);

export function AbStateProvider(props: AbStateProviderProps) {
  const { state, analytics, sinks, consent, children } = props;

  // 최신 스냅샷 게터(소프트 내비 시 최신 반영) — 런타임은 한 번만 구성(bus/sticky 연속성).
  const stateRef = useRef(state);
  stateRef.current = state;

  const runtimeRef = useRef<AbRuntime | null>(null);
  if (runtimeRef.current === null) {
    runtimeRef.current = createAbRuntime({
      getState: () => stateRef.current,
      analytics,
      sinks,
      consent,
    });
  }
  const runtime = runtimeRef.current;

  const value = useMemo<AbContextValue>(
    () => ({
      state,
      resolve: (key) => runtime.resolve(key),
      fireExposure: (key, r) => runtime.fireExposure(key, r),
    }),
    [state, runtime],
  );

  // vid 영속화(proxy 미설치 대응).
  useEffect(() => {
    runtime.persistVid();
  }, [runtime, state.visitorId]);

  return <AbContext.Provider value={value}>{children}</AbContext.Provider>;
}
