import { createBufferedEmitter, type BufferedOptions } from '../buffered';
import type { AnalyticsEvent, Sink } from '../../types';

type Clarity = (...args: unknown[]) => void;

export interface ClarityOptions extends BufferedOptions {
  getClarity?: () => Clarity | undefined;
}

export function createClaritySink(opts: ClarityOptions = {}): Sink {
  const getClarity =
    opts.getClarity ?? (() => (globalThis as { clarity?: Clarity }).clarity);

  const emit = (e: AnalyticsEvent): void => {
    const c = getClarity();
    if (!c) return;
    c('set', `ab_${e.experiment}`, e.variant);
    c('event', `ab_${e.experiment}_${e.variant}`);
  };
  const ready = (): boolean => !!getClarity();

  return createBufferedEmitter(emit, ready, opts);
}
