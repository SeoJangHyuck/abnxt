import { describe, it, expect, vi } from 'vitest';
import { createBufferedEmitter } from './buffered';
import type { AnalyticsEvent } from '../types';

const ev: AnalyticsEvent = {
  type: 'exposure',
  experiment: 'e',
  name: 'E',
  variant: 'B',
  visitorId: 'v',
  source: 'assigned',
  ts: 1,
};

describe('createBufferedEmitter', () => {
  it('emits immediately when ready', () => {
    const emit = vi.fn();
    createBufferedEmitter(emit, () => true)(ev);
    expect(emit).toHaveBeenCalledOnce();
  });

  it('buffers when not ready and flushes once ready via scheduler', () => {
    const emit = vi.fn();
    let ready = false;
    const tasks: Array<() => void> = [];
    const send = createBufferedEmitter(emit, () => ready, {
      schedule: (cb) => tasks.push(cb),
    });

    send(ev);
    expect(emit).not.toHaveBeenCalled(); // 버퍼됨

    ready = true;
    tasks.shift()!(); // 스케줄된 재시도 실행
    expect(emit).toHaveBeenCalledOnce(); // flush됨
  });

  it('keeps polling while still not ready', () => {
    const emit = vi.fn();
    const tasks: Array<() => void> = [];
    const send = createBufferedEmitter(emit, () => false, {
      schedule: (cb) => tasks.push(cb),
    });
    send(ev);
    tasks.shift()!(); // 여전히 미준비 → 재예약
    expect(emit).not.toHaveBeenCalled();
    expect(tasks.length).toBe(1);
  });
});
