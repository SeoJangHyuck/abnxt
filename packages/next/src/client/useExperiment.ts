'use client';

import { useContext, useEffect } from 'react';
import type { ResolveSource } from '@abnxt/core';
import { AbContext } from './context';

export function useExperiment(key: string): {
  variant: string;
  source: ResolveSource;
  isReady: boolean;
} {
  const ctx = useContext(AbContext);
  if (!ctx)
    throw new Error(
      'useExperiment must be used within <ABProvider> / <AbStateProvider>',
    );

  const result = ctx.resolve(key);

  useEffect(() => {
    ctx.fireExposure(key, result);
  }, [ctx, key, result.variant, result.source]);

  // MVP: config가 스냅샷에 포함돼 첫 렌더부터 확정 → 항상 true(렌더 게이트 금지).
  return { variant: result.variant, source: result.source, isReady: true };
}
