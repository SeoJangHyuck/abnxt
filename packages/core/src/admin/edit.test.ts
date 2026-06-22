import { describe, it, expect } from 'vitest';
import {
  toggleActive,
  setField,
  addExperiment,
  removeExperiment,
  upsertExperiment,
} from './edit';
import type { AbConfig, Experiment } from '../types';

function cfg(): AbConfig {
  return {
    version: 1,
    experiments: {
      hero: {
        name: 'Hero',
        active: true,
        sticky: true,
        seed: 'hero',
        control: 'A',
        variants: [
          { key: 'A', weight: 1 },
          { key: 'B', weight: 1 },
        ],
      },
    },
  };
}

describe('toggleActive', () => {
  it('flips active for an experiment', () => {
    expect(toggleActive(cfg(), 'hero').experiments.hero.active).toBe(false);
  });
  it('is a no-op for a missing key', () => {
    const c = cfg();
    expect(toggleActive(c, 'nope')).toEqual(c);
  });
});

describe('setField', () => {
  it('sets sticky/seed/control/name', () => {
    const c = setField(cfg(), 'hero', {
      sticky: false,
      seed: 's',
      control: 'B',
      name: 'H2',
    });
    expect(c.experiments.hero).toMatchObject({
      sticky: false,
      seed: 's',
      control: 'B',
      name: 'H2',
    });
  });
});

describe('addExperiment', () => {
  it('adds a new experiment with a unique key and 2 default variants', () => {
    const c = addExperiment(cfg());
    const keys = Object.keys(c.experiments);
    expect(keys.length).toBe(2);
    const added = c.experiments[keys.find((k) => k !== 'hero')!];
    expect(added.variants.length).toBe(2);
    expect(added.active).toBe(false);
  });
});

describe('removeExperiment', () => {
  it('removes by key', () => {
    expect(Object.keys(removeExperiment(cfg(), 'hero').experiments)).toEqual(
      [],
    );
  });
});

describe('upsertExperiment', () => {
  it('replaces an experiment definition immutably', () => {
    const exp: Experiment = {
      name: 'X',
      active: true,
      sticky: true,
      seed: 'hero',
      control: 'A',
      variants: [
        { key: 'A', weight: 2 },
        { key: 'B', weight: 1 },
      ],
    };
    const original = cfg();
    const c = upsertExperiment(original, 'hero', exp);
    expect(c.experiments.hero.variants[0].weight).toBe(2);
    expect(c).not.toBe(original);
    expect(original.experiments.hero.variants[0].weight).toBe(1);
  });
});
