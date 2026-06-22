import { describe, it, expect } from 'vitest';
import { assign, controlKey } from './assign';
import type { Experiment } from './types';

function exp(
  partial: Partial<Experiment> & Pick<Experiment, 'variants'>,
): Experiment {
  return {
    name: 'e',
    active: true,
    sticky: true,
    seed: 'seed',
    control: partial.variants[0].key,
    ...partial,
  };
}

describe('assign', () => {
  it('approximates the weighted split over 10k visitors (70/30 ±3%)', () => {
    const e = exp({
      seed: 'split',
      variants: [
        { key: 'A', weight: 70 },
        { key: 'B', weight: 30 },
      ],
    });
    let a = 0;
    const N = 10000;
    for (let i = 0; i < N; i++) if (assign(e, `visitor-${i}`) === 'A') a++;
    const ratio = a / N;
    expect(ratio).toBeGreaterThan(0.67);
    expect(ratio).toBeLessThan(0.73);
  });

  it('assigns experiments independently (low cross-correlation)', () => {
    const e1 = exp({
      seed: 's1',
      variants: [
        { key: 'A', weight: 50 },
        { key: 'B', weight: 50 },
      ],
    });
    const e2 = exp({
      seed: 's2',
      variants: [
        { key: 'A', weight: 50 },
        { key: 'B', weight: 50 },
      ],
    });
    let same = 0;
    const N = 10000;
    for (let i = 0; i < N; i++)
      if (assign(e1, `v-${i}`) === assign(e2, `v-${i}`)) same++;
    // 독립이면 ~50% 일치. 0.45~0.55 범위.
    expect(same / N).toBeGreaterThan(0.45);
    expect(same / N).toBeLessThan(0.55);
  });

  it('is deterministic per visitor', () => {
    const e = exp({
      variants: [
        { key: 'A', weight: 50 },
        { key: 'B', weight: 50 },
      ],
    });
    expect(assign(e, 'v1')).toBe(assign(e, 'v1'));
  });

  it('returns the only variant when there is one', () => {
    const e = exp({ variants: [{ key: 'A', weight: 100 }] });
    expect(assign(e, 'anyone')).toBe('A');
  });

  it('returns control when total weight is 0', () => {
    const e = exp({
      control: 'A',
      variants: [
        { key: 'A', weight: 0 },
        { key: 'B', weight: 0 },
      ],
    });
    expect(assign(e, 'v1')).toBe('A');
  });
});

describe('controlKey', () => {
  it('returns control field', () => {
    expect(
      controlKey(
        exp({
          control: 'B',
          variants: [
            { key: 'A', weight: 1 },
            { key: 'B', weight: 1 },
          ],
        }),
      ),
    ).toBe('B');
  });
});
