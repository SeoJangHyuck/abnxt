import { describe, it, expect } from 'vitest';
import { simulateSplit } from './simulate';
import type { Experiment } from '../types';

const exp: Experiment = {
  name: 'e',
  active: true,
  sticky: true,
  seed: 'split',
  control: 'A',
  variants: [
    { key: 'A', weight: 70 },
    { key: 'B', weight: 30 },
  ],
};

describe('simulateSplit', () => {
  it('approximates the configured split over N virtual visitors', () => {
    const counts = simulateSplit(exp, 10000);
    expect(counts.A + counts.B).toBe(10000);
    expect(counts.A / 10000).toBeGreaterThan(0.66);
    expect(counts.A / 10000).toBeLessThan(0.74);
  });
  it('is deterministic for the same N and seed', () => {
    expect(simulateSplit(exp, 1000)).toEqual(simulateSplit(exp, 1000));
  });
  it('includes every variant key (zero when unassigned)', () => {
    const counts = simulateSplit(
      {
        ...exp,
        variants: [
          { key: 'A', weight: 100 },
          { key: 'B', weight: 0 },
        ],
      },
      500,
    );
    expect(counts.B).toBe(0);
    expect(counts.A).toBe(500);
  });
});
