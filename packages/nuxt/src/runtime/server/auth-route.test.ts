import { describe, it, expect, vi } from 'vitest';
import { handleAuthRequest, type AuthRequestIO } from './auth-route';
import { verifySession } from '@abnxt/core/server';

const KEY = 'super-secret-admin-key-1234'; // >= 16자.

interface Captured {
  value?: string;
  maxAgeSec?: number;
  cleared: boolean;
}

function io(over: Partial<AuthRequestIO> = {}): {
  req: AuthRequestIO;
  cap: Captured;
} {
  const cap: Captured = { cleared: false };
  const req: AuthRequestIO = {
    method: 'POST',
    expectedKey: KEY,
    secret: undefined,
    isProduction: false,
    maxAgeMs: 86_400_000,
    readBody: async () => ({ key: KEY }),
    cookie: {
      set: (value, maxAgeSec) => {
        cap.value = value;
        cap.maxAgeSec = maxAgeSec;
      },
      clear: () => {
        cap.cleared = true;
      },
    },
    ...over,
  };
  return { req, cap };
}

describe('handleAuthRequest', () => {
  it('issues a signed session cookie on matching key', async () => {
    const { req, cap } = io();
    const res = await handleAuthRequest(req);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(cap.value).toBeTruthy();
    expect(cap.maxAgeSec).toBe(86_400);
    // 발급된 토큰은 같은 secret(=key)으로 검증 가능 + role 'admin'.
    const v = verifySession(cap.value, KEY);
    expect(v.valid).toBe(true);
    expect(v.payload?.role).toBe('admin');
  });

  it('returns 401 on key mismatch (no cookie)', async () => {
    const { req, cap } = io({
      readBody: async () => ({ key: 'wrong-key-xx' }),
    });
    const res = await handleAuthRequest(req);
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ ok: false });
    expect(cap.value).toBeUndefined();
  });

  it('returns 401 on missing/invalid body', async () => {
    const { req } = io({ readBody: async () => undefined });
    expect((await handleAuthRequest(req)).status).toBe(401);
  });

  it('blocks cross-site POST (CSRF) with 403', async () => {
    const { req, cap } = io({ fetchSite: 'cross-site' });
    const res = await handleAuthRequest(req);
    expect(res.status).toBe(403);
    expect(cap.value).toBeUndefined();
  });

  it('allows same-origin POST', async () => {
    const { req } = io({ fetchSite: 'same-origin' });
    expect((await handleAuthRequest(req)).status).toBe(200);
  });

  it('DELETE clears the cookie and returns ok', async () => {
    const { req, cap } = io({ method: 'DELETE' });
    const res = await handleAuthRequest(req);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(cap.cleared).toBe(true);
  });

  it('fail-closed: missing key + production → 401 + warn', async () => {
    const warn = vi.fn();
    const { req, cap } = io({
      expectedKey: '',
      secret: '',
      isProduction: true,
      readBody: async () => ({ key: 'anything' }),
      onWarn: warn,
    });
    const res = await handleAuthRequest(req);
    expect(res.status).toBe(401);
    expect(cap.value).toBeUndefined();
    expect(warn).toHaveBeenCalledOnce();
  });

  it('500 when key/secret shorter than 16 chars', async () => {
    const { req } = io({
      expectedKey: 'short',
      secret: 'short',
      readBody: async () => ({ key: 'short' }),
    });
    const res = await handleAuthRequest(req);
    expect(res.status).toBe(500);
  });

  it('405 on unsupported method', async () => {
    const { req } = io({ method: 'GET' });
    expect((await handleAuthRequest(req)).status).toBe(405);
  });
});
