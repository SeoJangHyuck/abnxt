import { createBufferedEmitter, type BufferedOptions } from '../buffered';
import type { AnalyticsEvent, Sink } from '../../types';

export interface DataLayerSinkOptions extends BufferedOptions {
  getDataLayer?: () => unknown[] | undefined;
  /** push되는 event 키 값. 기본 'ab_exposure'. */
  eventName?: string;
}

/**
 * GTM dataLayer 표준 sink. GTM을 통해 다운스트림 벤더로 라우팅(GTM 로드 전제).
 * gtag 직접 호출 없음. dataLayer 미준비 시 버퍼링 후 flush.
 */
export function createDataLayerSink(opts: DataLayerSinkOptions = {}): Sink {
  const eventName = opts.eventName ?? 'ab_exposure';
  const getDataLayer =
    opts.getDataLayer ??
    (() => (globalThis as { dataLayer?: unknown[] }).dataLayer);

  const emit = (e: AnalyticsEvent): void => {
    getDataLayer()?.push({
      event: eventName,
      ab_experiment: e.experiment,
      ab_variant: e.variant,
      ab_source: e.source,
    });
  };
  const ready = (): boolean => !!getDataLayer();

  return createBufferedEmitter(emit, ready, opts);
}
