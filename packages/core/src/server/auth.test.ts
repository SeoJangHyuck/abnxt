import { describe, it, expect } from 'vitest';
import { createHmac } from 'node:crypto';
import {
  verifyBasicAuth,
  verifyAdminKey,
  signSession,
  verifySession,
  randomToken,
  DEFAULT_ADMIN_COOKIE,
} from './auth';

describe('verifyBasicAuth', () => {
  const creds = { user: 'admin', password: 's3cret' };
  it('accepts a correct Basic header', () => {
    const header = 'Basic ' + Buffer.from('admin:s3cret').toString('base64');
    expect(verifyBasicAuth(header, creds)).toBe(true);
  });
  it('rejects wrong password / user / scheme / missing / no-colon', () => {
    expect(
      verifyBasicAuth(
        'Basic ' + Buffer.from('admin:nope').toString('base64'),
        creds,
      ),
    ).toBe(false);
    expect(
      verifyBasicAuth(
        'Basic ' + Buffer.from('x:s3cret').toString('base64'),
        creds,
      ),
    ).toBe(false);
    expect(verifyBasicAuth('Bearer abc', creds)).toBe(false);
    expect(verifyBasicAuth(undefined, creds)).toBe(false);
    expect(
      verifyBasicAuth(
        'Basic ' + Buffer.from('nocolon').toString('base64'),
        creds,
      ),
    ).toBe(false);
  });
  it('allows colons in the password (RFC 7617)', () => {
    const header = 'Basic ' + Buffer.from('admin:a:b:c').toString('base64');
    expect(verifyBasicAuth(header, { user: 'admin', password: 'a:b:c' })).toBe(
      true,
    );
  });
});

describe('verifyAdminKey', () => {
  it('accepts a matching key (constant-time)', () => {
    expect(verifyAdminKey('a-preset-admin-key', 'a-preset-admin-key')).toBe(
      true,
    );
  });
  it('rejects a wrong key', () => {
    expect(verifyAdminKey('wrong', 'a-preset-admin-key')).toBe(false);
  });
  it('rejects when the expected key is unset (fail-closed)', () => {
    expect(verifyAdminKey('anything', undefined)).toBe(false);
    expect(verifyAdminKey('anything', '')).toBe(false);
  });
  it('rejects when no key is provided', () => {
    expect(verifyAdminKey(undefined, 'a-preset-admin-key')).toBe(false);
    expect(verifyAdminKey('', 'a-preset-admin-key')).toBe(false);
  });
});

describe('signSession / verifySession (HMAC)', () => {
  const secret = 'a-very-long-shared-secret';
  it('round-trips a valid token', () => {
    const t = signSession({ sub: 'admin' }, secret, { now: () => 1000 });
    expect(verifySession(t, secret, { now: () => 1000 })).toEqual({
      valid: true,
      payload: { sub: 'admin' },
    });
  });
  it('rejects a tampered token', () => {
    const t = signSession({ sub: 'admin' }, secret);
    expect(verifySession(t + 'x', secret).valid).toBe(false);
  });
  it('rejects a wrong-secret signature', () => {
    const t = signSession({ sub: 'admin' }, secret);
    expect(verifySession(t, 'other-secret').valid).toBe(false);
  });
  it('rejects an expired token', () => {
    const t = signSession({ sub: 'admin' }, secret, {
      now: () => 1000,
      maxAgeMs: 100,
    });
    expect(verifySession(t, secret, { now: () => 2000 }).valid).toBe(false);
  });
  it('accepts within maxAge', () => {
    const t = signSession({ sub: 'admin' }, secret, {
      now: () => 1000,
      maxAgeMs: 5000,
    });
    expect(verifySession(t, secret, { now: () => 2000 }).valid).toBe(true);
  });
  it('applies a default 24h expiry when maxAgeMs is omitted', () => {
    const t = signSession({ sub: 'admin' }, secret, { now: () => 0 });
    expect(verifySession(t, secret, { now: () => 86_400_001 }).valid).toBe(
      false,
    );
    expect(verifySession(t, secret, { now: () => 1000 }).valid).toBe(true);
  });
  it('throws when signing with an empty/short secret (env misconfig)', () => {
    expect(() => signSession({ sub: 'admin' }, '')).toThrow();
    expect(() => signSession({ sub: 'admin' }, 'short')).toThrow();
  });
  it('never validates with an empty/short secret', () => {
    const t = signSession({ sub: 'admin' }, secret);
    expect(verifySession(t, '').valid).toBe(false);
    expect(verifySession(t, 'short').valid).toBe(false);
  });
  it('rejects a validly-signed token that lacks a numeric exp (every session must expire)', () => {
    // signSession 우회: exp 없는 payload를 올바른 secret으로 직접 서명.
    const b64url = (s: string) => Buffer.from(s).toString('base64url');
    const data = b64url(JSON.stringify({ role: 'admin' }));
    const sig = Buffer.from(
      createHmac('sha256', secret).update(data).digest(),
    ).toString('base64url');
    expect(verifySession(`${data}.${sig}`, secret).valid).toBe(false);
  });
});

describe('randomToken', () => {
  it('returns distinct hex tokens', () => {
    expect(randomToken()).not.toBe(randomToken());
    expect(randomToken()).toMatch(/^[0-9a-f]+$/);
  });
});

describe('DEFAULT_ADMIN_COOKIE', () => {
  it('is the shared default admin session cookie name (issue ↔ verify SoT)', () => {
    expect(DEFAULT_ADMIN_COOKIE).toBe('abnxt_admin');
  });
});
