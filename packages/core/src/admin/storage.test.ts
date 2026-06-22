import { describe, it, expect } from 'vitest';
import {
  createLocalDraftStorage,
  serializeConfig,
  parseConfigJson,
  loadInitialConfig,
} from './storage';
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

function memStorage(): Storage {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
    clear: () => m.clear(),
    key: () => null,
    get length() {
      return m.size;
    },
  } as Storage;
}

describe('createLocalDraftStorage', () => {
  it('round-trips a config through localStorage', async () => {
    const s = createLocalDraftStorage(memStorage());
    await s.save(cfg);
    expect((await s.load()).experiments.hero.name).toBe('Hero');
  });
  it('load returns EMPTY when no draft', async () => {
    expect(await createLocalDraftStorage(memStorage()).load()).toEqual(
      EMPTY_CONFIG,
    );
  });
  it('hasDraft distinguishes saved-empty from absent', async () => {
    const s = createLocalDraftStorage(memStorage());
    expect(s.hasDraft()).toBe(false);
    await s.save(EMPTY_CONFIG);
    expect(s.hasDraft()).toBe(true);
  });
});

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

describe('loadInitialConfig', () => {
  it('prefers a saved draft over the remote source', async () => {
    const s = createLocalDraftStorage(memStorage());
    await s.save(cfg);
    const out = await loadInitialConfig({
      draft: s,
      fetchRemote: async () => EMPTY_CONFIG,
    });
    expect(out.experiments.hero).toBeDefined();
  });
  it('keeps an intentionally-empty saved draft (does not overwrite from remote)', async () => {
    const s = createLocalDraftStorage(memStorage());
    await s.save(EMPTY_CONFIG);
    const out = await loadInitialConfig({
      draft: s,
      fetchRemote: async () => cfg,
    });
    expect(out.experiments).toEqual({});
  });
  it('falls back to the remote source when no draft', async () => {
    const out = await loadInitialConfig({
      draft: createLocalDraftStorage(memStorage()),
      fetchRemote: async () => cfg,
    });
    expect(out.experiments.hero).toBeDefined();
  });
});
