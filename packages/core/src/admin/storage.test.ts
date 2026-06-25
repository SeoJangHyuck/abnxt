import { describe, it, expect } from 'vitest';
import { serializeConfig, parseConfigJson } from './storage';
import { EMPTY_CONFIG } from '../config';
import type { AbConfig } from '../types';

const cfg: AbConfig = {
  version: 1,
  experiments: {
    hero: {
      name: 'Hero',
      active: true,
      sticky: true,
      seed: 'hero',
      control: 'A',
      variants: [{ key: 'A', weight: 1 }],
    },
  },
};

describe('serializeConfig / parseConfigJson', () => {
  it('serializes pretty JSON with a bumped updatedAt', () => {
    const json = serializeConfig(cfg, () => '2026-06-18T00:00:00Z');
    expect(JSON.parse(json).updatedAt).toBe('2026-06-18T00:00:00Z');
  });
  it('parses + validates via core loadConfig (ok)', () => {
    const r = parseConfigJson(JSON.stringify(cfg));
    expect(r.ok).toBe(true);
    expect(r.config.experiments.hero.seed).toBe('hero');
  });
  it('reports ok:false on malformed JSON (no silent data loss)', () => {
    const r = parseConfigJson('not json');
    expect(r.ok).toBe(false);
    expect(r.message).toBeTruthy();
    expect(r.config).toEqual(EMPTY_CONFIG);
  });
  it('reports ok:false when loadConfig warns (e.g. unsupported version)', () => {
    const r = parseConfigJson(JSON.stringify({ version: 99, experiments: {} }));
    expect(r.ok).toBe(false);
  });
});
