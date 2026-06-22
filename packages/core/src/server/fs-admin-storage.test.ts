import { describe, it, expect } from 'vitest';
import { fsAdminStorage, type FsWriteLike } from './fs-admin-storage';
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

function memFs(): FsWriteLike & {
  files: Map<string, string>;
  dirs: Set<string>;
} {
  const files = new Map<string, string>();
  const dirs = new Set<string>();
  return {
    files,
    dirs,
    readFileSync: (p) => {
      const v = files.get(p);
      if (v == null) throw new Error('ENOENT');
      return v;
    },
    writeFileSync: (p, d) => void files.set(p, d),
    mkdirSync: (p) => void dirs.add(p),
  };
}

describe('fsAdminStorage', () => {
  it('returns EMPTY_CONFIG when the file is absent', async () => {
    const s = fsAdminStorage({ path: '/data/ab.json', fs: memFs() });
    expect(await s.load()).toEqual(EMPTY_CONFIG);
  });
  it('round-trips a config through save/load', async () => {
    const fs = memFs();
    const s = fsAdminStorage({ path: '/data/ab.json', fs });
    await s.save(cfg);
    expect((await s.load()).experiments.hero.name).toBe('Hero');
  });
  it('creates the parent directory on save', async () => {
    const fs = memFs();
    await fsAdminStorage({ path: '/data/nested/ab.json', fs }).save(cfg);
    expect(fs.dirs.has('/data/nested')).toBe(true);
  });
  it('falls back to EMPTY_CONFIG on malformed JSON', async () => {
    const fs = memFs();
    fs.files.set('/data/ab.json', 'not json');
    expect(await fsAdminStorage({ path: '/data/ab.json', fs }).load()).toEqual(
      EMPTY_CONFIG,
    );
  });
});
