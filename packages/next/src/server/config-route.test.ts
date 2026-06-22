import { describe, it, expect } from 'vitest';
import { createAbnxtConfigRoute } from './config-route';
import { abnxtBasicAuth } from './auth';
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
function mem() {
  let stored = cfg;
  return {
    load: async () => stored,
    save: async (c: AbConfig) => {
      stored = c;
    },
  };
}
const goodAuth = abnxtBasicAuth({ user: 'a', password: 'b' });
const authHeader = {
  authorization: 'Basic ' + Buffer.from('a:b').toString('base64'),
};

describe('createAbnxtConfigRoute', () => {
  it('GET returns config with no-store when authed', async () => {
    const { GET } = createAbnxtConfigRoute({ storage: mem(), auth: goodAuth });
    const res = await GET(
      new Request('https://x/api', { headers: authHeader }),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toContain('no-store');
    expect((await res.json()).experiments.e).toBeDefined();
  });
  it('GET 401 without auth', async () => {
    const { GET } = createAbnxtConfigRoute({ storage: mem(), auth: goodAuth });
    expect((await GET(new Request('https://x/api'))).status).toBe(401);
  });
  it('PUT saves a valid config when authed (intentional empty allowed)', async () => {
    const storage = mem();
    const { PUT } = createAbnxtConfigRoute({ storage, auth: goodAuth });
    const res = await PUT(
      new Request('https://x/api', {
        method: 'PUT',
        headers: { ...authHeader, 'content-type': 'application/json' },
        body: JSON.stringify({ version: 1, experiments: {} }),
      }),
    );
    expect(res.status).toBe(200);
    expect(Object.keys((await storage.load()).experiments)).toEqual([]);
  });
  it('PUT 401 without auth (no write)', async () => {
    const storage = mem();
    const { PUT } = createAbnxtConfigRoute({ storage, auth: goodAuth });
    const res = await PUT(
      new Request('https://x/api', { method: 'PUT', body: '{}' }),
    );
    expect(res.status).toBe(401);
    expect((await storage.load()).experiments.e).toBeDefined();
  });
  it('PUT 400 on malformed body', async () => {
    const { PUT } = createAbnxtConfigRoute({ storage: mem(), auth: goodAuth });
    const res = await PUT(
      new Request('https://x/api', {
        method: 'PUT',
        headers: { ...authHeader, 'content-type': 'application/json' },
        body: 'not json',
      }),
    );
    expect(res.status).toBe(400);
  });
  it('PUT 403 on a cross-site request (CSRF defense)', async () => {
    const storage = mem();
    const { PUT } = createAbnxtConfigRoute({ storage, auth: goodAuth });
    const res = await PUT(
      new Request('https://x/api', {
        method: 'PUT',
        headers: {
          ...authHeader,
          'content-type': 'application/json',
          'sec-fetch-site': 'cross-site',
        },
        body: JSON.stringify(cfg),
      }),
    );
    expect(res.status).toBe(403);
  });
  it('PUT allows same-origin Sec-Fetch-Site', async () => {
    const { PUT } = createAbnxtConfigRoute({ storage: mem(), auth: goodAuth });
    const res = await PUT(
      new Request('https://x/api', {
        method: 'PUT',
        headers: {
          ...authHeader,
          'content-type': 'application/json',
          'sec-fetch-site': 'same-origin',
        },
        body: JSON.stringify(cfg),
      }),
    );
    expect(res.status).toBe(200);
  });
});
