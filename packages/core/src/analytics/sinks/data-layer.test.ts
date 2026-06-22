import { describe, it, expect } from 'vitest';
import { createDataLayerSink } from './data-layer';
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

describe('createDataLayerSink', () => {
  it('pushes a GTM-standard event when the dataLayer is ready', () => {
    const dataLayer: unknown[] = [];
    createDataLayerSink({ getDataLayer: () => dataLayer })(ev);
    expect(dataLayer).toEqual([
      {
        event: 'ab_exposure',
        ab_experiment: 'hero',
        ab_variant: 'B',
        ab_source: 'assigned',
      },
    ]);
  });

  it('uses a custom event name when provided', () => {
    const dataLayer: unknown[] = [];
    createDataLayerSink({
      getDataLayer: () => dataLayer,
      eventName: 'experiment_view',
    })(ev);
    expect((dataLayer[0] as { event: string }).event).toBe('experiment_view');
  });

  it('buffers until the dataLayer becomes available, then flushes', () => {
    let dl: unknown[] | undefined;
    const tasks: Array<() => void> = [];
    const sink = createDataLayerSink({
      getDataLayer: () => dl,
      schedule: (cb) => tasks.push(cb),
    });
    sink(ev);
    expect(dl).toBeUndefined();
    dl = [];
    tasks.shift()!();
    expect(dl.length).toBe(1);
  });
});
