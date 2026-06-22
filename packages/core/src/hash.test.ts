import { describe, it, expect } from 'vitest';
import { hashToUnit } from './hash';

describe('hashToUnit', () => {
  it('is deterministic for the same input', () => {
    expect(hashToUnit('homepage-hero:abc')).toBe(
      hashToUnit('homepage-hero:abc'),
    );
  });

  it('returns a value in [0, 1)', () => {
    for (const s of ['a', 'b', 'visitor-1:seed', '', '한글', '🔥']) {
      const u = hashToUnit(s);
      expect(u).toBeGreaterThanOrEqual(0);
      expect(u).toBeLessThan(1);
    }
  });

  it('produces different values for different inputs', () => {
    expect(hashToUnit('a:seed')).not.toBe(hashToUnit('b:seed'));
  });
});
