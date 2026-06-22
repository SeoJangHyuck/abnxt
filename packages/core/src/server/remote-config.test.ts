import { describe, it, expect, vi } from 'vitest';
import { remoteConfig } from './remote-config';

const raw = {
  version: 1,
  experiments: {
    e: { name: 'e', active: true, variants: [{ key: 'A', weight: 1 }] },
  },
};

describe('remoteConfig', () => {
  it('normalizes whatever the loader returns', async () => {
    const cfg = await remoteConfig(async () => raw).load();
    expect(cfg.experiments.e.control).toBe('A');
  });
  it('falls back to EMPTY when the loader throws', async () => {
    const cfg = await remoteConfig(async () => {
      throw new Error('kv down');
    }).load();
    expect(cfg.experiments).toEqual({});
  });
  it('caches for ttlMs and refreshes after expiry', async () => {
    const loader = vi.fn(async () => raw);
    let now = 1000;
    const src = remoteConfig(loader, { ttlMs: 100, now: () => now });
    await src.load();
    await src.load();
    expect(loader).toHaveBeenCalledOnce();
    now = 1200;
    await src.load();
    expect(loader).toHaveBeenCalledTimes(2);
  });
});
