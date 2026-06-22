import { describe, it, expect } from 'vitest';
import { handleConfigRequest, type ConfigRequestIO } from './config-route';
import type { AbConfig } from '@abnxt/core';

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
function io(over: Partial<ConfigRequestIO> = {}): ConfigRequestIO {
  return {
    method: 'GET',
    isAuthed: async () => true,
    readBody: async () => ({}),
    load: async () => cfg,
    save: async () => {},
    ...over,
  };
}

describe('handleConfigRequest', () => {
  it('GET returns config when authed', async () => {
    const r = await handleConfigRequest(io());
    expect(r.status).toBe(200);
    expect((r.body as AbConfig).experiments.e).toBeDefined();
  });
  it('401 when not authed', async () => {
    expect(
      (await handleConfigRequest(io({ isAuthed: async () => false }))).status,
    ).toBe(401);
  });
  it('PUT saves a valid config (intentional empty allowed)', async () => {
    let saved: AbConfig | undefined;
    const r = await handleConfigRequest(
      io({
        method: 'PUT',
        readBody: async () => ({ version: 1, experiments: {} }),
        save: async (c) => {
          saved = c;
        },
      }),
    );
    expect(r.status).toBe(200);
    expect(Object.keys((saved as AbConfig).experiments)).toEqual([]);
  });
  it('PUT 400 on invalid config body', async () => {
    const r = await handleConfigRequest(
      io({ method: 'PUT', readBody: async () => ({ version: 99 }) }),
    );
    expect(r.status).toBe(400);
  });
  it('PUT 403 on a cross-site request (CSRF defense)', async () => {
    const r = await handleConfigRequest(
      io({ method: 'PUT', fetchSite: 'cross-site', readBody: async () => cfg }),
    );
    expect(r.status).toBe(403);
  });
  it('PUT allows same-origin', async () => {
    const r = await handleConfigRequest(
      io({
        method: 'PUT',
        fetchSite: 'same-origin',
        readBody: async () => cfg,
      }),
    );
    expect(r.status).toBe(200);
  });
});
