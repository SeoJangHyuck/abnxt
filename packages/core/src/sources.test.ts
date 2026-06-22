import { describe, it, expect } from 'vitest';
import { bundledConfig, fetchConfig } from './sources';

const raw = {
  version: 1,
  experiments: {
    e: { name: 'e', active: true, variants: [{ key: 'A', weight: 1 }] },
  },
};

describe('bundledConfig', () => {
  it('returns a source that loads the normalized config', async () => {
    const cfg = await bundledConfig(raw).load();
    expect(cfg.experiments.e.seed).toBe('e'); // 정규화 확인
  });
});

describe('fetchConfig', () => {
  it('fetches and normalizes the config', async () => {
    const fakeFetch = async () => ({ json: async () => raw }) as Response;
    const cfg = await fetchConfig(
      '/ab-config.json',
      fakeFetch as typeof fetch,
    ).load();
    expect(cfg.experiments.e.control).toBe('A');
  });

  it('falls back to empty config on fetch error', async () => {
    const fakeFetch = async () => {
      throw new Error('network');
    };
    const cfg = await fetchConfig(
      '/ab-config.json',
      fakeFetch as unknown as typeof fetch,
    ).load();
    expect(cfg.experiments).toEqual({});
  });
});
