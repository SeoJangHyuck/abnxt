import { describe, it, expect, vi } from 'vitest';
import { createGa4Sink } from './ga4';
import type { AnalyticsEvent } from '../../types';

const ev: AnalyticsEvent = {
  type: 'exposure',
  experiment: 'homepage-hero',
  name: 'H',
  variant: 'B',
  visitorId: 'v',
  source: 'assigned',
  ts: 1,
};

describe('createGa4Sink', () => {
  it('calls gtag with experiment_impression when ready', () => {
    const gtag = vi.fn();
    const sink = createGa4Sink({ getGtag: () => gtag });
    sink(ev);
    expect(gtag).toHaveBeenCalledWith('event', 'experiment_impression', {
      experiment_id: 'homepage-hero',
      variant_id: 'B',
    });
  });

  it('buffers until gtag becomes available, then flushes', () => {
    const gtag = vi.fn();
    let ready = false;
    const tasks: Array<() => void> = [];
    const sink = createGa4Sink({
      getGtag: () => (ready ? gtag : undefined),
      schedule: (cb) => tasks.push(cb),
    });
    sink(ev);
    expect(gtag).not.toHaveBeenCalled();
    ready = true;
    tasks.shift()!();
    expect(gtag).toHaveBeenCalledOnce();
  });
});
