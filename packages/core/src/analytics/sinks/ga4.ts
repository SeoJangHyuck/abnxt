import { createBufferedEmitter, type BufferedOptions } from '../buffered';
import type { AnalyticsEvent, Sink } from '../../types';

type Gtag = (...args: unknown[]) => void;

export interface Ga4Options extends BufferedOptions {
  getGtag?: () => Gtag | undefined;
}

/** GA4 전용 sink(순수 gtag). dataLayer 연동이 필요하면 createDataLayerSink를 함께 사용. */
export function createGa4Sink(opts: Ga4Options = {}): Sink {
  const getGtag = opts.getGtag ?? (() => (globalThis as { gtag?: Gtag }).gtag);

  const emit = (e: AnalyticsEvent): void => {
    getGtag()?.('event', 'experiment_impression', {
      experiment_id: e.experiment,
      variant_id: e.variant,
    });
  };
  const ready = (): boolean => !!getGtag();

  return createBufferedEmitter(emit, ready, opts);
}
