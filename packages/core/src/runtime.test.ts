import { describe, it, expect, vi } from 'vitest';
import { createAbRuntime, type AbCookieIO } from './runtime';
import { parseStickyCookie } from './sticky';
import type { AbState } from './types';

// core는 node 환경(sessionStorage 부재) → sessionDedupStore()는 메모리 폴백.
// 각 테스트가 fresh runtime을 만들므로 dedup은 인스턴스별 독립 → 케이스 간 오염 없음.

function makeState(over: Partial<AbState> = {}): AbState {
  return {
    visitorId: 'v1',
    config: {
      version: 1,
      experiments: {
        hero: {
          name: 'Hero',
          active: true,
          sticky: true,
          seed: 'hero',
          control: 'A',
          variants: [
            { key: 'A', weight: 0 },
            { key: 'B', weight: 100 },
          ],
        },
      },
    },
    overrides: {},
    stored: {},
    ...over,
  };
}

/** 인메모리 cookie IO */
function memCookies(
  initial: Record<string, string> = {},
): AbCookieIO & { jar: Record<string, string> } {
  const jar = { ...initial };
  return {
    jar,
    read: (n) => jar[n],
    write: (n, v) => {
      jar[n] = v;
    },
  };
}

describe('createAbRuntime', () => {
  it('resolves from the current state via getState', () => {
    const rt = createAbRuntime({
      getState: () => makeState(),
      cookieIO: memCookies(),
      sinks: [],
    });
    expect(rt.resolve('hero')).toEqual({ variant: 'B', source: 'assigned' });
  });

  it('fires exposure to sinks and records sticky for assigned', () => {
    const sink = vi.fn();
    const cookies = memCookies();
    const rt = createAbRuntime({
      getState: () => makeState(),
      cookieIO: cookies,
      sinks: [sink],
      now: () => 7,
      stickySchedule: (cb) => cb(),
    });
    rt.fireExposure('hero', rt.resolve('hero'));
    rt.flush();
    expect(sink).toHaveBeenCalledWith(
      expect.objectContaining({
        experiment: 'hero',
        variant: 'B',
        source: 'assigned',
        ts: 7,
      }),
    );
    expect(parseStickyCookie(cookies.jar['abnxt_a'])).toEqual({ hero: 'B' });
  });

  it('does not fire or record for control source', () => {
    const sink = vi.fn();
    const cookies = memCookies();
    const rt = createAbRuntime({
      getState: () =>
        makeState({
          config: {
            version: 1,
            experiments: {
              hero: {
                name: 'Hero',
                active: false,
                sticky: true,
                seed: 'hero',
                control: 'A',
                variants: [{ key: 'A', weight: 1 }],
              },
            },
          },
        }),
      cookieIO: cookies,
      sinks: [sink],
    });
    rt.fireExposure('hero', rt.resolve('hero'));
    expect(sink).not.toHaveBeenCalled();
    expect(cookies.jar['abnxt_a']).toBeUndefined();
  });

  it('persistVid writes the vid cookie only when missing', () => {
    const cookies = memCookies();
    const rt = createAbRuntime({
      getState: () => makeState(),
      cookieIO: cookies,
      sinks: [],
    });
    rt.persistVid();
    expect(cookies.jar['abnxt_vid']).toBe('v1');
    cookies.jar['abnxt_vid'] = 'keep';
    rt.persistVid();
    expect(cookies.jar['abnxt_vid']).toBe('keep');
  });

  it('uses analytics.sinks names when no explicit sinks given', () => {
    const target = new EventTarget();
    const hits: unknown[] = [];
    target.addEventListener('abnxt:exposure', (e) =>
      hits.push((e as CustomEvent).detail),
    );
    const rt = createAbRuntime({
      getState: () => makeState(),
      cookieIO: memCookies(),
      analytics: { sinks: ['domEvent'] },
      domEvent: { target },
    });
    rt.fireExposure('hero', rt.resolve('hero'));
    expect(hits.length).toBe(1);
  });

  it('gates exposure behind a consent function', () => {
    const sink = vi.fn();
    let consented = false;
    const rt = createAbRuntime({
      getState: () => makeState(),
      cookieIO: memCookies(),
      sinks: [sink],
      consent: () => consented,
    });
    rt.fireExposure('hero', rt.resolve('hero'));
    expect(sink).not.toHaveBeenCalled();
    consented = true;
    rt.fireExposure('hero', rt.resolve('hero'));
    expect(sink).toHaveBeenCalledOnce();
  });

  it('exposes controlKey for an experiment', () => {
    const rt = createAbRuntime({
      getState: () => makeState(),
      cookieIO: memCookies(),
      sinks: [],
    });
    expect(rt.controlKey('hero')).toBe('A');
    expect(rt.controlKey('nope')).toBe('');
  });
});
