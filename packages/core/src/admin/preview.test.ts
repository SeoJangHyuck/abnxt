import { describe, it, expect } from 'vitest';
import { setOverride, clearOverride, type PreviewCookieIO } from './preview';

function io(): PreviewCookieIO & { jar: Record<string, string> } {
  const jar: Record<string, string> = {};
  return {
    jar,
    set: (n, v) => {
      jar[n] = v;
    },
    remove: (n) => {
      delete jar[n];
    },
  };
}

describe('setOverride', () => {
  it('writes abnxt.ovr.<key> = variant', () => {
    const x = io();
    setOverride('hero', 'B', x);
    expect(x.jar['abnxt.ovr.hero']).toBe('B');
  });
});
describe('clearOverride', () => {
  it('removes abnxt.ovr.<key>', () => {
    const x = io();
    x.jar['abnxt.ovr.hero'] = 'B';
    clearOverride('hero', x);
    expect(x.jar['abnxt.ovr.hero']).toBeUndefined();
  });
});
