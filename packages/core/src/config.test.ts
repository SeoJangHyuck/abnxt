import { describe, it, expect, vi } from 'vitest';
import { loadConfig, EMPTY_CONFIG, CURRENT_VERSION } from './config';

const valid = {
  version: 1,
  experiments: {
    'homepage-hero': {
      name: 'Homepage Hero',
      active: true,
      variants: [
        { key: 'A', weight: 50 },
        { key: 'B', weight: 50 },
      ],
    },
  },
};

describe('loadConfig normalization', () => {
  it('fills defaults: seed=key, sticky=true, control=variants[0].key', () => {
    const cfg = loadConfig(valid);
    const exp = cfg.experiments['homepage-hero'];
    expect(exp.seed).toBe('homepage-hero');
    expect(exp.sticky).toBe(true);
    expect(exp.control).toBe('A');
  });

  it('clamps negative weights to 0', () => {
    const cfg = loadConfig({
      version: 1,
      experiments: {
        x: {
          name: 'x',
          active: true,
          variants: [
            { key: 'A', weight: -5 },
            { key: 'B', weight: 10 },
          ],
        },
      },
    });
    expect(cfg.experiments.x.variants[0].weight).toBe(0);
  });

  it('drops malformed experiments (no variants) with a warning', () => {
    const onWarn = vi.fn();
    const cfg = loadConfig(
      {
        version: 1,
        experiments: {
          bad: { name: 'bad', active: true },
          good: valid.experiments['homepage-hero'],
        },
      },
      { onWarn },
    );
    expect(cfg.experiments.bad).toBeUndefined();
    expect(cfg.experiments.good).toBeDefined();
    expect(onWarn).toHaveBeenCalled();
  });

  it('respects explicit control when valid, ignores invalid control', () => {
    const cfg = loadConfig({
      version: 1,
      experiments: {
        a: {
          name: 'a',
          active: true,
          control: 'B',
          variants: [
            { key: 'A', weight: 1 },
            { key: 'B', weight: 1 },
          ],
        },
        b: {
          name: 'b',
          active: true,
          control: 'Z',
          variants: [{ key: 'A', weight: 1 }],
        },
      },
    });
    expect(cfg.experiments.a.control).toBe('B');
    expect(cfg.experiments.b.control).toBe('A');
  });
});

describe('loadConfig migration & fallback', () => {
  it('passes current version through', () => {
    expect(loadConfig(valid).version).toBe(CURRENT_VERSION);
  });

  it('falls back to EMPTY_CONFIG on unknown/old version with no migration', () => {
    const onWarn = vi.fn();
    expect(loadConfig({ version: 0, experiments: {} }, { onWarn })).toEqual(
      EMPTY_CONFIG,
    );
    expect(onWarn).toHaveBeenCalled();
  });

  it('falls back on future version', () => {
    expect(loadConfig({ version: 99, experiments: {} })).toEqual(EMPTY_CONFIG);
  });

  it('falls back on invalid shape (not an object / missing version)', () => {
    expect(loadConfig(null)).toEqual(EMPTY_CONFIG);
    expect(loadConfig('nope')).toEqual(EMPTY_CONFIG);
    expect(loadConfig({ experiments: {} })).toEqual(EMPTY_CONFIG);
  });

  it('uses provided fallback when given', () => {
    const fb = { version: 1 as const, experiments: {} };
    expect(loadConfig(undefined, { fallback: fb })).toBe(fb);
  });
});
