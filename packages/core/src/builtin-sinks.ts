import type { Sink, BuiltinSinkName } from './types';
import {
  createDomEventSink,
  type DomEventSinkOptions,
} from './analytics/sinks/dom-event';
import {
  createDataLayerSink,
  type DataLayerSinkOptions,
} from './analytics/sinks/data-layer';
import { createGa4Sink, type Ga4Options } from './analytics/sinks/ga4';
import {
  createClaritySink,
  type ClarityOptions,
} from './analytics/sinks/clarity';

/** 알려진 내장 sink 이름 집합(검증/문서용). */
export const BUILTIN_SINK_NAMES: ReadonlySet<BuiltinSinkName> =
  new Set<BuiltinSinkName>(['domEvent', 'dataLayer', 'ga4', 'clarity']);

export interface ResolveBuiltinSinksOptions {
  onWarn?: (message: string) => void;
  domEvent?: DomEventSinkOptions;
  dataLayer?: DataLayerSinkOptions;
  ga4?: Ga4Options;
  clarity?: ClarityOptions;
}

/** 직렬화 가능한 sink 이름 목록을 Sink 인스턴스 배열로 변환. 알 수 없는 이름은 경고 후 무시. */
export function resolveBuiltinSinks(
  names: readonly BuiltinSinkName[],
  opts: ResolveBuiltinSinksOptions = {},
): Sink[] {
  const warn = opts.onWarn ?? (() => {});
  const sinks: Sink[] = [];
  for (const name of names) {
    switch (name) {
      case 'domEvent':
        sinks.push(createDomEventSink(opts.domEvent));
        break;
      case 'dataLayer':
        sinks.push(createDataLayerSink(opts.dataLayer));
        break;
      case 'ga4':
        sinks.push(createGa4Sink(opts.ga4));
        break;
      case 'clarity':
        sinks.push(createClaritySink(opts.clarity));
        break;
      default:
        warn(`abnxt: unknown analytics sink "${String(name)}", ignoring`);
    }
  }
  return sinks;
}
