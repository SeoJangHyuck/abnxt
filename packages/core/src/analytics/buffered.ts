import type { AnalyticsEvent } from '../types';

export interface BufferedOptions {
  /** 글로벌 미준비 시 재시도를 예약. 기본 setTimeout(retryMs). */
  schedule?: (cb: () => void) => void;
  retryMs?: number;
}

/** ready()가 true일 때만 emit하고, 아니면 버퍼에 쌓아 schedule로 재시도/flush. */
export function createBufferedEmitter(
  emit: (e: AnalyticsEvent) => void,
  ready: () => boolean,
  opts: BufferedOptions = {},
): (event: AnalyticsEvent) => void {
  const schedule =
    opts.schedule ??
    ((cb: () => void) => {
      if (typeof setTimeout !== 'undefined')
        setTimeout(cb, opts.retryMs ?? 300);
    });
  const buffer: AnalyticsEvent[] = [];
  let polling = false;

  const drain = (): void => {
    while (buffer.length && ready()) emit(buffer.shift()!);
  };

  const poll = (): void => {
    if (polling) return;
    polling = true;
    schedule(() => {
      polling = false;
      drain();
      if (buffer.length) poll();
    });
  };

  return (event) => {
    if (ready()) {
      drain();
      emit(event);
    } else {
      buffer.push(event);
      poll();
    }
  };
}
