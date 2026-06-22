import { describe, it, expect, vi } from 'vitest';
import { fsConfig } from './fs-config';

const raw = JSON.stringify({
  version: 1,
  experiments: {
    e: { name: 'e', active: true, variants: [{ key: 'A', weight: 1 }] },
  },
});

function fakeFs(content: string, mtimeMs = 1) {
  return {
    readFileSync: vi.fn(() => content),
    statSync: vi.fn(() => ({ mtimeMs })),
  };
}

describe('fsConfig', () => {
  it('reads and normalizes the config file', async () => {
    const fs = fakeFs(raw);
    const cfg = await fsConfig({ path: '/x/ab-config.json', fs }).load();
    expect(cfg.experiments.e.seed).toBe('e');
    expect(fs.readFileSync).toHaveBeenCalledOnce();
  });

  it('caches by mtime — does not re-read/re-parse when unchanged', async () => {
    const fs = fakeFs(raw, 5);
    const src = fsConfig({ path: '/x', fs });
    await src.load();
    await src.load();
    expect(fs.readFileSync).toHaveBeenCalledOnce();
    expect(fs.statSync).toHaveBeenCalledTimes(2);
  });

  it('re-reads when mtime changes (live file replace)', async () => {
    let mtime = 1;
    const fs = {
      readFileSync: vi.fn(() => raw),
      statSync: vi.fn(() => ({ mtimeMs: mtime })),
    };
    const src = fsConfig({ path: '/x', fs });
    await src.load();
    mtime = 2;
    await src.load();
    expect(fs.readFileSync).toHaveBeenCalledTimes(2);
  });

  it('falls back to EMPTY on read error (no throw in render path)', async () => {
    const fs = {
      readFileSync: () => {
        throw new Error('ENOENT');
      },
      statSync: () => {
        throw new Error('ENOENT');
      },
    };
    const cfg = await fsConfig({ path: '/missing', fs }).load();
    expect(cfg.experiments).toEqual({});
  });

  it('returns the last good cache when a later read fails', async () => {
    let fail = false;
    const fs = {
      readFileSync: vi.fn(() => {
        if (fail) throw new Error('gone');
        return raw;
      }),
      statSync: vi.fn(() => {
        if (fail) throw new Error('gone');
        return { mtimeMs: Math.random() };
      }),
    };
    const src = fsConfig({ path: '/x', fs });
    const first = await src.load();
    expect(first.experiments.e).toBeDefined();
    fail = true;
    const second = await src.load();
    expect(second).toEqual(first); // 직전 캐시 폴백
  });
});
