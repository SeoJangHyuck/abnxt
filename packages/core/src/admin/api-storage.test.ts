import { describe, it, expect, vi } from 'vitest';
import { apiStorage } from './api-storage';
import type { AbConfig } from '../types';

const cfg: AbConfig = {
  version: 1,
  experiments: {
    e: {
      name: 'e',
      active: true,
      sticky: true,
      seed: 'e',
      control: 'A',
      variants: [{ key: 'A', weight: 1 }],
    },
  },
};

describe('apiStorage', () => {
  it('GETs and normalizes config from base', async () => {
    const fetchImpl = vi.fn(
      async () => ({ ok: true, json: async () => cfg }) as Response,
    );
    const s = apiStorage({ base: '/api/abnxt/config', fetchImpl });
    const out = await s.load();
    expect(out.experiments.e.seed).toBe('e');
    expect(fetchImpl).toHaveBeenCalledWith(
      '/api/abnxt/config',
      expect.objectContaining({ method: 'GET' }),
    );
  });
  it('PUTs config as JSON with credentials', async () => {
    const fetchImpl = vi.fn(
      async (_url: string, _init?: RequestInit) => ({ ok: true }) as Response,
    );
    const s = apiStorage({ base: '/api/abnxt/config', fetchImpl });
    await s.save(cfg);
    const init = fetchImpl.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body as string).experiments.e).toBeDefined();
    expect(init.credentials).toBe('same-origin');
  });
  it('throws on a failed save (surface to UI)', async () => {
    const fetchImpl = vi.fn(
      async () => ({ ok: false, status: 401 }) as Response,
    );
    await expect(
      apiStorage({ base: '/x', fetchImpl }).save(cfg),
    ).rejects.toThrow();
  });
  it('includes extra headers (e.g. CSRF)', async () => {
    const fetchImpl = vi.fn(
      async (_url: string, _init?: RequestInit) => ({ ok: true }) as Response,
    );
    await apiStorage({
      base: '/x',
      fetchImpl,
      headers: () => ({ 'x-csrf': 't' }),
    }).save(cfg);
    const init = fetchImpl.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>)['x-csrf']).toBe('t');
  });
});
