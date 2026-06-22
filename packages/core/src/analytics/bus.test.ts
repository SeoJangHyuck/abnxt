import { describe, it, expect, vi } from 'vitest';
import { createAnalyticsBus, sessionDedupStore } from './bus';
import type { AnalyticsEvent } from '../types';

function ev(over: Partial<AnalyticsEvent> = {}): AnalyticsEvent {
  return {
    type: 'exposure',
    experiment: 'e',
    name: 'E',
    variant: 'B',
    visitorId: 'v',
    source: 'assigned',
    ts: 1,
    ...over,
  };
}

describe('createAnalyticsBus', () => {
  it('forwards events to sinks', () => {
    const sink = vi.fn();
    createAnalyticsBus({ sinks: [sink] }).track(ev());
    expect(sink).toHaveBeenCalledOnce();
  });

  it('dedups per experiment', () => {
    const sink = vi.fn();
    const bus = createAnalyticsBus({ sinks: [sink] });
    bus.track(ev());
    bus.track(ev());
    expect(sink).toHaveBeenCalledOnce();
  });

  it('suppresses when consent gate denies', () => {
    const sink = vi.fn();
    createAnalyticsBus({ sinks: [sink], shouldTrack: () => false }).track(ev());
    expect(sink).not.toHaveBeenCalled();
  });

  it('suppresses control-source events', () => {
    const sink = vi.fn();
    createAnalyticsBus({ sinks: [sink] }).track(ev({ source: 'control' }));
    expect(sink).not.toHaveBeenCalled();
  });

  it('still fires override-source events', () => {
    const sink = vi.fn();
    createAnalyticsBus({ sinks: [sink] }).track(ev({ source: 'override' }));
    expect(sink).toHaveBeenCalledOnce();
  });

  it('isolates sink errors', () => {
    const bad = vi.fn(() => {
      throw new Error('boom');
    });
    const good = vi.fn();
    const bus = createAnalyticsBus({ sinks: [bad, good] });
    expect(() => bus.track(ev())).not.toThrow();
    expect(good).toHaveBeenCalledOnce();
  });

  it('supports addSink', () => {
    const sink = vi.fn();
    const bus = createAnalyticsBus();
    bus.addSink(sink);
    bus.track(ev());
    expect(sink).toHaveBeenCalledOnce();
  });
});

describe('sessionDedupStore', () => {
  it('uses an injected storage-like object', () => {
    const mem = new Map<string, string>();
    const fake = {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
    };
    const store = sessionDedupStore('p.', fake as unknown as Storage);
    expect(store.has('x')).toBe(false);
    store.add('x');
    expect(store.has('x')).toBe(true);
  });
});
