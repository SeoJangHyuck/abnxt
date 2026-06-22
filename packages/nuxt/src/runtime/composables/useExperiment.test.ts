import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { defineComponent, h } from 'vue';
import { mount } from '@vue/test-utils';
import { createAbRuntime, type AbState } from '@abnxt/core';
import { AB_INJECTION_KEY } from '../shared';
import { useExperiment } from './useExperiment';

const state: AbState = {
  visitorId: 'v1',
  config: {
    version: 1,
    experiments: {
      hero: {
        name: 'Hero',
        active: true,
        sticky: true,
        seed: 'hero',
        control: 'A',
        variants: [
          { key: 'A', weight: 0 },
          { key: 'B', weight: 100 },
        ],
      },
    },
  },
  overrides: {},
  stored: {},
};

function memCookies() {
  const jar: Record<string, string> = {};
  return {
    read: (n: string) => jar[n],
    write: (n: string, v: string) => {
      jar[n] = v;
    },
  };
}

let exposures: number;
let onExposure: (e: Event) => void;
beforeEach(() => {
  sessionStorage.clear();
  exposures = 0;
  onExposure = () => {
    exposures++;
  };
  window.addEventListener('abnxt:exposure', onExposure);
});
afterEach(() => window.removeEventListener('abnxt:exposure', onExposure));

function harness() {
  const rt = createAbRuntime({
    getState: () => state,
    cookieIO: memCookies(),
    stickySchedule: (cb) => cb(),
  });
  const Probe = defineComponent({
    setup() {
      const { variant, source, isReady } = useExperiment('hero');
      return () =>
        h('span', `${variant.value}:${source.value}:${isReady.value}`);
    },
  });
  return mount(Probe, {
    global: { provide: { [AB_INJECTION_KEY as symbol]: rt } },
  });
}

describe('useExperiment', () => {
  it('resolves the variant reactively', () => {
    const w = harness();
    expect(w.text()).toBe('B:assigned:true');
  });
  it('fires exposure once on mount', async () => {
    harness();
    await Promise.resolve();
    expect(exposures).toBe(1);
  });
  it('throws when no runtime is provided', () => {
    const Probe = defineComponent({
      setup() {
        useExperiment('hero');
        return () => h('span');
      },
    });
    expect(() => mount(Probe)).toThrow(/abnxt/i);
  });
});
