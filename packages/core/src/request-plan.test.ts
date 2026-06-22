import { describe, it, expect } from 'vitest';
import { planAbProxy } from './request-plan';

function input(over: Partial<Parameters<typeof planAbProxy>[0]> = {}) {
  return {
    vidCookie: undefined,
    query: new URLSearchParams(),
    overrideCookies: {},
    newVisitorId: () => 'fixed-vid',
    ...over,
  };
}

describe('planAbProxy vid', () => {
  it('creates a new vid when none present', () => {
    const p = planAbProxy(input());
    expect(p.vid).toBe('fixed-vid');
    expect(p.setVidCookie).toBe(true);
    expect(p.forwardVidHeader).toBe(true);
  });

  it('reuses an existing vid', () => {
    const p = planAbProxy(input({ vidCookie: 'keep' }));
    expect(p.vid).toBe('keep');
    expect(p.setVidCookie).toBe(false);
    expect(p.forwardVidHeader).toBe(false);
  });
});

describe('planAbProxy overrides', () => {
  it('sets an override from ?ab_<key>=B', () => {
    const p = planAbProxy(input({ query: new URLSearchParams('ab_hero=B') }));
    expect(p.setOverrides).toEqual({ hero: 'B' });
    expect(p.forwardOverrides).toEqual({ hero: 'B' });
  });

  it('deletes an override from ?ab_<key>= (empty)', () => {
    const p = planAbProxy(
      input({
        query: new URLSearchParams('ab_hero='),
        overrideCookies: { hero: 'A' },
      }),
    );
    expect(p.deleteOverrides).toEqual(['hero']);
    expect(p.forwardOverrides).toEqual({});
  });

  it('resets all override cookies on ?ab_reset=1', () => {
    const p = planAbProxy(
      input({
        query: new URLSearchParams('ab_reset=1'),
        overrideCookies: { a: '1', b: '2' },
      }),
    );
    expect(p.deleteOverrides.sort()).toEqual(['a', 'b']);
    expect(p.forwardOverrides).toEqual({});
  });

  it('explicit set wins over reset (same request)', () => {
    const p = planAbProxy(
      input({
        query: new URLSearchParams('ab_hero=B&ab_reset=1'),
        overrideCookies: { hero: 'A', x: '1' },
      }),
    );
    expect(p.setOverrides).toEqual({ hero: 'B' });
    expect(p.deleteOverrides).toEqual(['x']);
    expect(p.forwardOverrides).toEqual({ hero: 'B' });
  });

  it('ignores non-ab_ query params', () => {
    const p = planAbProxy(
      input({ query: new URLSearchParams('foo=1&ab_hero=B') }),
    );
    expect(p.setOverrides).toEqual({ hero: 'B' });
  });
});
