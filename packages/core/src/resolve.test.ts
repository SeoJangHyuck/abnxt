import { describe, it, expect } from 'vitest';
import { resolveVariant } from './resolve';
import type { Experiment } from './types';

function exp(partial: Partial<Experiment> = {}): Experiment {
  return {
    name: 'e',
    active: true,
    sticky: true,
    seed: 'seed',
    control: 'A',
    variants: [
      { key: 'A', weight: 50 },
      { key: 'B', weight: 50 },
    ],
    ...partial,
  };
}

describe('resolveVariant priority', () => {
  it('override wins over everything (when a valid variant key)', () => {
    const r = resolveVariant({
      exp: exp(),
      key: 'e',
      visitorId: 'v',
      stored: 'A',
      override: 'B',
    });
    expect(r).toEqual({ variant: 'B', source: 'override' });
  });

  it('override applies even when inactive (QA preview)', () => {
    const r = resolveVariant({
      exp: exp({ active: false }),
      key: 'e',
      visitorId: 'v',
      override: 'B',
    });
    expect(r).toEqual({ variant: 'B', source: 'override' });
  });

  it('ignores an invalid override key', () => {
    const r = resolveVariant({
      exp: exp(),
      key: 'e',
      visitorId: 'v',
      override: 'Z',
    });
    expect(r.source).not.toBe('override');
  });

  it('uses stored value when sticky and valid', () => {
    const r = resolveVariant({
      exp: exp(),
      key: 'e',
      visitorId: 'v',
      stored: 'B',
    });
    expect(r).toEqual({ variant: 'B', source: 'stored' });
  });

  it('ignores stored value when sticky is false', () => {
    const r = resolveVariant({
      exp: exp({ sticky: false }),
      key: 'e',
      visitorId: 'v',
      stored: 'B',
    });
    expect(r.source).toBe('assigned');
  });

  it('ignores stored value not in current variants', () => {
    const r = resolveVariant({
      exp: exp(),
      key: 'e',
      visitorId: 'v',
      stored: 'Z',
    });
    expect(r.source).toBe('assigned');
  });

  it('falls back to assigned when no override/stored', () => {
    const r = resolveVariant({ exp: exp(), key: 'e', visitorId: 'v' });
    expect(r.source).toBe('assigned');
    expect(['A', 'B']).toContain(r.variant);
  });

  it('returns control (no exposure) when inactive', () => {
    const r = resolveVariant({
      exp: exp({ active: false, control: 'A' }),
      key: 'e',
      visitorId: 'v',
    });
    expect(r).toEqual({ variant: 'A', source: 'control' });
  });

  it('returns control when total weight is 0', () => {
    const e = exp({
      control: 'A',
      variants: [
        { key: 'A', weight: 0 },
        { key: 'B', weight: 0 },
      ],
    });
    const r = resolveVariant({ exp: e, key: 'e', visitorId: 'v' });
    expect(r).toEqual({ variant: 'A', source: 'control' });
  });

  it('returns empty control when experiment is missing', () => {
    const r = resolveVariant({
      exp: undefined,
      key: 'missing',
      visitorId: 'v',
      override: 'B',
    });
    expect(r).toEqual({ variant: '', source: 'control' });
  });
});
