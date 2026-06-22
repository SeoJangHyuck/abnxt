import { describe, it, expect, vi } from 'vitest';
import { resolveBuiltinSinks, BUILTIN_SINK_NAMES } from './builtin-sinks';
import type { AnalyticsEvent } from './types';

const ev: AnalyticsEvent = {
  type: 'exposure',
  experiment: 'hero',
  name: 'Hero',
  variant: 'B',
  visitorId: 'v',
  source: 'assigned',
  ts: 1,
};

describe('resolveBuiltinSinks', () => {
  it('returns one sink per known name', () => {
    const sinks = resolveBuiltinSinks(['domEvent', 'dataLayer']);
    expect(sinks).toHaveLength(2);
    expect(sinks.every((s) => typeof s === 'function')).toBe(true);
  });

  it('drops unknown names with a warning', () => {
    const onWarn = vi.fn();
    const sinks = resolveBuiltinSinks(['domEvent', 'bogus' as never], {
      onWarn,
    });
    expect(sinks).toHaveLength(1);
    expect(onWarn).toHaveBeenCalled();
  });

  it('returns an empty array for an empty list', () => {
    expect(resolveBuiltinSinks([])).toEqual([]);
  });

  it('wires domEvent to dispatch on the injected target', () => {
    const target = new EventTarget();
    const hits: AnalyticsEvent[] = [];
    target.addEventListener('abnxt:exposure', (e) =>
      hits.push((e as CustomEvent<AnalyticsEvent>).detail),
    );
    const [sink] = resolveBuiltinSinks(['domEvent'], { domEvent: { target } });
    sink(ev);
    expect(hits).toEqual([ev]);
  });

  it('wires dataLayer to the injected dataLayer getter', () => {
    const dataLayer: unknown[] = [];
    const [sink] = resolveBuiltinSinks(['dataLayer'], {
      dataLayer: { getDataLayer: () => dataLayer },
    });
    sink(ev);
    expect(dataLayer.length).toBe(1);
  });

  it('exposes the set of known names', () => {
    expect([...BUILTIN_SINK_NAMES].sort()).toEqual([
      'clarity',
      'dataLayer',
      'domEvent',
      'ga4',
    ]);
  });
});
