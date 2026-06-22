import { describe, it, expect, vi } from 'vitest';
import { createDomEventSink } from './dom-event';
import type { AnalyticsEvent } from '../../types';

const ev: AnalyticsEvent = {
  type: 'exposure',
  experiment: 'hero',
  name: 'Hero',
  variant: 'B',
  visitorId: 'v',
  source: 'assigned',
  ts: 1,
};

describe('createDomEventSink', () => {
  it('dispatches a CustomEvent with the analytics event as detail', () => {
    const target = new EventTarget();
    const received: AnalyticsEvent[] = [];
    target.addEventListener('abnxt:exposure', (e) => {
      received.push((e as CustomEvent<AnalyticsEvent>).detail);
    });
    createDomEventSink({ target })(ev);
    expect(received).toEqual([ev]);
  });

  it('uses a custom event name when provided', () => {
    const target = new EventTarget();
    const hits: string[] = [];
    target.addEventListener('my:ab', () => hits.push('x'));
    createDomEventSink({ target, eventName: 'my:ab' })(ev);
    expect(hits.length).toBe(1);
  });

  it('does nothing when no target is available (SSR-safe)', () => {
    expect(() =>
      createDomEventSink({ getTarget: () => undefined })(ev),
    ).not.toThrow();
  });

  it('falls back to globalThis.window when no target injected', () => {
    const spy = vi.fn();
    (globalThis as { window?: unknown }).window = {
      dispatchEvent: spy,
    } as unknown as Window;
    try {
      createDomEventSink()(ev);
      expect(spy).toHaveBeenCalledOnce();
    } finally {
      delete (globalThis as { window?: unknown }).window;
    }
  });
});
