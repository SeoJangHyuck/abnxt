import { inject, onMounted, computed, type ComputedRef } from 'vue';
import type { ResolveSource } from '@abnxt/core';
import { AB_INJECTION_KEY } from '../shared';

export interface UseExperimentResult {
  variant: ComputedRef<string>;
  source: ComputedRef<ResolveSource>;
  isReady: ComputedRef<boolean>;
}

export function useExperiment(key: string): UseExperimentResult {
  const runtime = inject(AB_INJECTION_KEY);
  if (!runtime) {
    throw new Error(
      'abnxt: useExperiment must be used within an app where the abnxt Nuxt module is installed',
    );
  }

  const result = computed(() => runtime.resolve(key));

  onMounted(() => {
    runtime.fireExposure(key, result.value);
  });

  return {
    variant: computed(() => result.value.variant),
    source: computed(() => result.value.source),
    isReady: computed(() => true),
  };
}
