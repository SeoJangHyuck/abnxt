import { describe, it, expect } from 'vitest';
import {
  normalizeToPercents,
  addVariant,
  removeVariant,
  setWeight,
} from './weights';
import type { Variant } from '../types';

const vs: Variant[] = [
  { key: 'A', weight: 30 },
  { key: 'B', weight: 10 },
];

function sum(p: Record<string, number>): number {
  return Object.values(p).reduce((s, n) => s + n, 0);
}

describe('normalizeToPercents', () => {
  it('returns percentages summing to 100', () => {
    expect(normalizeToPercents(vs)).toEqual({ A: 75, B: 25 });
  });
  it('handles all-zero by splitting evenly', () => {
    expect(
      normalizeToPercents([
        { key: 'A', weight: 0 },
        { key: 'B', weight: 0 },
      ]),
    ).toEqual({ A: 50, B: 50 });
  });
  it('returns empty for no variants', () => {
    expect(normalizeToPercents([])).toEqual({});
  });
  it('distributes a 3-way split without rounding drift (sum 100)', () => {
    const p = normalizeToPercents([
      { key: 'A', weight: 1 },
      { key: 'B', weight: 1 },
      { key: 'C', weight: 1 },
    ]);
    expect(sum(p)).toBe(100);
    expect(Object.values(p).every((n) => n >= 33 && n <= 34)).toBe(true);
  });
  it('never emits a phantom percent for a zero-weight variant', () => {
    const p = normalizeToPercents([
      { key: 'A', weight: 5 },
      { key: 'B', weight: 5 },
      { key: 'C', weight: 5 },
      { key: 'D', weight: 0 },
    ]);
    expect(p.D).toBe(0);
    expect(sum(p)).toBe(100);
  });
  it('never emits a negative percent (6 near-equal + zero)', () => {
    const variants: Variant[] = [
      { key: 'A', weight: 5 },
      { key: 'B', weight: 5 },
      { key: 'C', weight: 5 },
      { key: 'D', weight: 5 },
      { key: 'E', weight: 5 },
      { key: 'F', weight: 5 },
      { key: 'G', weight: 0 },
    ];
    const p = normalizeToPercents(variants);
    expect(Object.values(p).every((n) => n >= 0)).toBe(true);
    expect(sum(p)).toBe(100);
    expect(p.G).toBe(0);
  });
  it('clamps negative weights to 0 before normalizing', () => {
    const p = normalizeToPercents([
      { key: 'A', weight: -5 },
      { key: 'B', weight: 10 },
    ]);
    expect(p).toEqual({ A: 0, B: 100 });
  });
  it('gives a single positive variant 100%', () => {
    expect(
      normalizeToPercents([
        { key: 'A', weight: 100 },
        { key: 'B', weight: 0 },
      ]),
    ).toEqual({ A: 100, B: 0 });
  });
});

describe('addVariant', () => {
  it('appends a new unique key with default weight', () => {
    const out = addVariant(vs);
    expect(out.length).toBe(3);
    expect(new Set(out.map((v) => v.key)).size).toBe(3);
  });
});

describe('removeVariant', () => {
  it('removes by key', () => {
    expect(removeVariant(vs, 'A')).toEqual([{ key: 'B', weight: 10 }]);
  });
  it('never removes the last variant', () => {
    expect(removeVariant([{ key: 'A', weight: 1 }], 'A')).toEqual([
      { key: 'A', weight: 1 },
    ]);
  });
});

describe('setWeight', () => {
  it('updates a variant weight (clamped >= 0)', () => {
    expect(setWeight(vs, 'A', 50)).toEqual([
      { key: 'A', weight: 50 },
      { key: 'B', weight: 10 },
    ]);
    expect(setWeight(vs, 'A', -5)).toEqual([
      { key: 'A', weight: 0 },
      { key: 'B', weight: 10 },
    ]);
  });
});
