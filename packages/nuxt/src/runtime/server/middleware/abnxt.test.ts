import { describe, it, expect } from 'vitest';
import { applyAbRequest, type AbRequestIO } from './abnxt';

interface SpyIO extends AbRequestIO {
  setCalls: Array<[string, string]>;
  delCalls: string[];
  ctx: Record<string, unknown>;
}

function io(over: Partial<AbRequestIO> = {}): SpyIO {
  const setCalls: Array<[string, string]> = [];
  const delCalls: string[] = [];
  const ctx: Record<string, unknown> = {};
  return {
    getCookie: () => undefined,
    getAllCookies: () => ({}),
    getQuery: () => new URLSearchParams(),
    setCookie: (n, v) => setCalls.push([n, v]),
    deleteCookie: (n) => delCalls.push(n),
    setContext: (k, v) => {
      ctx[k] = v;
    },
    newVisitorId: () => 'fixed-vid',
    setCalls,
    delCalls,
    ctx,
    ...over,
  };
}

describe('applyAbRequest', () => {
  it('creates and sets a vid cookie on first visit, stores context', () => {
    const x = io();
    applyAbRequest(x);
    expect(x.setCalls).toContainEqual(['abnxt_vid', 'fixed-vid']);
    expect((x.ctx.abnxt as { vid: string }).vid).toBe('fixed-vid');
  });

  it('reuses existing vid (no set)', () => {
    const x = io({
      getCookie: (n) => (n === 'abnxt_vid' ? 'keep' : undefined),
    });
    applyAbRequest(x);
    expect(x.setCalls.find((c) => c[0] === 'abnxt_vid')).toBeUndefined();
    expect((x.ctx.abnxt as { vid: string }).vid).toBe('keep');
  });

  it('sets an override cookie from ?ab_hero=B and forwards via context', () => {
    const x = io({
      getCookie: (n) => (n === 'abnxt_vid' ? 'keep' : undefined),
      getQuery: () => new URLSearchParams('ab_hero=B'),
    });
    applyAbRequest(x);
    expect(x.setCalls).toContainEqual(['abnxt.ovr.hero', 'B']);
    expect(
      (x.ctx.abnxt as { overrides: Record<string, string> }).overrides,
    ).toEqual({ hero: 'B' });
  });

  it('deletes override cookies on ?ab_reset=1', () => {
    const x = io({
      getCookie: (n) => (n === 'abnxt_vid' ? 'keep' : undefined),
      getAllCookies: () => ({ 'abnxt.ovr.old': 'A' }),
      getQuery: () => new URLSearchParams('ab_reset=1'),
    });
    applyAbRequest(x);
    expect(x.delCalls).toContain('abnxt.ovr.old');
    expect(
      (x.ctx.abnxt as { overrides: Record<string, string> }).overrides,
    ).toEqual({});
  });
});
