import { describe, it, expect } from 'vitest';
import { resolveFrom } from './resolve-from';
import { loadConfig } from './config';
import type { AbState } from './types';

function state(over: Partial<AbState> = {}): AbState {
  return {
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
    ...over,
  };
}

describe('resolveFrom', () => {
  it('assigns deterministically from snapshot (weights force B)', () => {
    expect(resolveFrom(state(), 'hero')).toEqual({
      variant: 'B',
      source: 'assigned',
    });
  });
  it('honors a valid override', () => {
    expect(resolveFrom(state({ overrides: { hero: 'A' } }), 'hero')).toEqual({
      variant: 'A',
      source: 'override',
    });
  });
  it('honors a stored sticky value', () => {
    expect(resolveFrom(state({ stored: { hero: 'A' } }), 'hero')).toEqual({
      variant: 'A',
      source: 'stored',
    });
  });
  it('returns empty control for a missing experiment', () => {
    expect(resolveFrom(state(), 'nope')).toEqual({
      variant: '',
      source: 'control',
    });
  });
  it('does not throw resolving a builtin-named key like "constructor" (render-safe)', () => {
    const cfg = loadConfig({
      version: 1,
      experiments: { real: { name: 'r', variants: [{ key: 'A', weight: 1 }] } },
    });
    const s: AbState = {
      visitorId: 'v',
      config: cfg,
      overrides: {},
      stored: {},
    };
    expect(() => resolveFrom(s, 'constructor')).not.toThrow();
    expect(resolveFrom(s, 'constructor')).toEqual({
      variant: '',
      source: 'control',
    });
  });
});
