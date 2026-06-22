import type { AnalyticsEvent, Sink } from '../../types';

interface DomEventTarget {
  dispatchEvent(event: Event): boolean;
}

export interface DomEventSinkOptions {
  /** 디스패치 대상. 기본 globalThis.window. 테스트/Node 수집용 주입 가능. */
  target?: DomEventTarget;
  /** target을 늦게 해석하는 게터(우선순위: target > getTarget > window). */
  getTarget?: () => DomEventTarget | undefined;
  /** 디스패치할 이벤트명. 기본 'abnxt:exposure'. */
  eventName?: string;
}

/**
 * 벤더 중립 sink. EventTarget에 CustomEvent를 디스패치해 어떤 분석도구든 구독 가능.
 * window 부재(SSR/노드, 미주입)에서는 무동작(안전).
 */
export function createDomEventSink(opts: DomEventSinkOptions = {}): Sink {
  const eventName = opts.eventName ?? 'abnxt:exposure';
  const resolveTarget = (): DomEventTarget | undefined => {
    if (opts.target) return opts.target;
    if (opts.getTarget) return opts.getTarget();
    return (globalThis as { window?: DomEventTarget }).window;
  };
  return (event: AnalyticsEvent): void => {
    const target = resolveTarget();
    if (!target) return;
    target.dispatchEvent(new CustomEvent(eventName, { detail: event }));
  };
}
