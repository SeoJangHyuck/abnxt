import { describe, it, expect } from 'vitest';
import {
  normalizeToPercents,
  addVariant,
  removeVariant,
  setWeight,
  redistributeWeights,
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

describe('redistributeWeights', () => {
  it('keeps the total at 100% when raising one variant (two-way)', () => {
    const out = redistributeWeights(
      [
        { key: 'A', weight: 50 },
        { key: 'B', weight: 50 },
      ],
      'A',
      70,
    );
    expect(out).toEqual([
      { key: 'A', weight: 70 },
      { key: 'B', weight: 30 },
    ]);
  });

  it('distributes the remainder proportionally across the others', () => {
    const out = redistributeWeights(
      [
        { key: 'A', weight: 0 },
        { key: 'B', weight: 30 },
        { key: 'C', weight: 10 },
      ],
      'A',
      60,
    );
    // 나머지 40을 B:C = 3:1 비율로 → B 30, C 10
    expect(out[0]).toEqual({ key: 'A', weight: 60 });
    expect(out[1].weight).toBeCloseTo(30);
    expect(out[2].weight).toBeCloseTo(10);
    expect(normalizeToPercents(out)).toEqual({ A: 60, B: 30, C: 10 });
  });

  it('splits the remainder evenly when others are all zero', () => {
    const out = redistributeWeights(
      [
        { key: 'A', weight: 0 },
        { key: 'B', weight: 0 },
        { key: 'C', weight: 0 },
      ],
      'A',
      40,
    );
    expect(out[0].weight).toBe(40);
    expect(out[1].weight).toBeCloseTo(30);
    expect(out[2].weight).toBeCloseTo(30);
  });

  it('clamps the target to 0..100', () => {
    const out = redistributeWeights(
      [
        { key: 'A', weight: 50 },
        { key: 'B', weight: 50 },
      ],
      'A',
      150,
    );
    expect(out[0].weight).toBe(100);
    expect(out[1].weight).toBe(0);
  });

  it('sets a single variant directly', () => {
    expect(redistributeWeights([{ key: 'A', weight: 10 }], 'A', 80)).toEqual([
      { key: 'A', weight: 80 },
    ]);
  });
});
