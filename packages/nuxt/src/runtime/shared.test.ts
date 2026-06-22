import { describe, it, expect, vi } from 'vitest';
import { AB_INJECTION_KEY, buildRuntime } from './shared';
import type { AbState } from '@abnxt/core';

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

describe('buildRuntime', () => {
  it('exposes a Symbol injection key', () => {
    expect(typeof AB_INJECTION_KEY).toBe('symbol');
  });
  it('builds a runtime that resolves and fires exposure', () => {
    const sink = vi.fn();
    const rt = buildRuntime(() => state, {
      sinks: [sink],
      stickySchedule: (cb) => cb(),
    });
    expect(rt.resolve('hero').variant).toBe('B');
    rt.fireExposure('hero', rt.resolve('hero'));
    expect(sink).toHaveBeenCalledOnce();
  });
});
