import { describe, it, expect, vi } from 'vitest';
import { createClaritySink } from './clarity';
import type { AnalyticsEvent } from '../../types';

const ev: AnalyticsEvent = {
  type: 'exposure',
  experiment: 'pricing',
  name: 'P',
  variant: 'A',
  visitorId: 'v',
  source: 'assigned',
  ts: 1,
};

describe('createClaritySink', () => {
  it('sets a custom tag and fires an event when ready', () => {
    const clarity = vi.fn();
    const sink = createClaritySink({ getClarity: () => clarity });
    sink(ev);
    expect(clarity).toHaveBeenCalledWith('set', 'ab_pricing', 'A');
    expect(clarity).toHaveBeenCalledWith('event', 'ab_pricing_A');
  });

  it('buffers until clarity becomes available, then flushes', () => {
    const clarity = vi.fn();
    let ready = false;
    const tasks: Array<() => void> = [];
    const sink = createClaritySink({
      getClarity: () => (ready ? clarity : undefined),
      schedule: (cb) => tasks.push(cb),
    });
    sink(ev);
    expect(clarity).not.toHaveBeenCalled();
    ready = true;
    tasks.shift()!();
    expect(clarity).toHaveBeenCalledTimes(2);
  });
});
