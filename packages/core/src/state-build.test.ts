import { describe, it, expect } from 'vitest';
import { serializeStickyCookie } from './sticky';
import { EMPTY_CONFIG } from './config';
import type { AbConfig } from './types';
import { buildAbState, type BuildStateDeps } from './state-build';

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

function deps(over: Partial<BuildStateDeps> = {}): BuildStateDeps {
  return {
    getVid: () => 'v9',
    getOverrides: () => ({}),
    getStickyCookie: () => undefined,
    loadConfig: async () => cfg,
    newVisitorId: () => 'generated',
    ...over,
  };
}

describe('buildAbState', () => {
  it('uses the provided vid', async () => {
    const s = await buildAbState(deps());
    expect(s.visitorId).toBe('v9');
  });

  it('generates a vid when absent', async () => {
    const s = await buildAbState(deps({ getVid: () => undefined }));
    expect(s.visitorId).toBe('generated');
  });

  it('passes overrides through and parses the sticky cookie', async () => {
    const s = await buildAbState(
      deps({
        getOverrides: () => ({ hero: 'B' }),
        getStickyCookie: () => serializeStickyCookie({ hero: 'A' }),
      }),
    );
    expect(s.overrides).toEqual({ hero: 'B' });
    expect(s.stored).toEqual({ hero: 'A' });
  });

  it('uses the loaded config', async () => {
    const s = await buildAbState(deps());
    expect(s.config).toEqual(cfg);
  });

  it('accepts an empty config', async () => {
    const s = await buildAbState(
      deps({ loadConfig: async () => EMPTY_CONFIG }),
    );
    expect(s.config).toEqual(EMPTY_CONFIG);
  });
});
