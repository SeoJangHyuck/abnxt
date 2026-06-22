export type Variant = { key: string; weight: number };

/** loadConfig로 정규화된 실험. seed/sticky/control은 항상 채워져 있다. */
export interface Experiment {
  name: string;
  active: boolean;
  sticky: boolean;
  seed: string;
  control: string;
  variants: Variant[];
}

export interface AbConfig {
  version: 1;
  updatedAt?: string;
  experiments: Record<string, Experiment>;
}

export type ResolveSource = 'override' | 'stored' | 'assigned' | 'control';

export interface ResolveResult {
  variant: string;
  source: ResolveSource;
}

/** config 읽기 소스 (read-only) */
export interface ServerConfigSource {
  load(): Promise<AbConfig>;
}
export interface ClientConfigSource {
  load(): Promise<AbConfig>;
}

/** 어드민 저장소 (read/write) */
export interface AdminStorage {
  load(): Promise<AbConfig>;
  save(cfg: AbConfig): Promise<void>;
}

export interface AnalyticsEvent {
  type: 'exposure';
  experiment: string;
  name: string;
  variant: string;
  visitorId: string;
  source: ResolveSource;
  ts: number;
}

export type Sink = (event: AnalyticsEvent) => void;

/** 서버가 클라로 내리는 직렬화 가능 스냅샷(react/vue 공유). */
export interface AbState {
  visitorId: string;
  config: AbConfig;
  overrides: Record<string, string>;
  stored: Record<string, string>;
}

/** 내장 sink 이름(직렬화 가능). resolveBuiltinSinks와 AnalyticsFlags가 공유. */
export type BuiltinSinkName = 'domEvent' | 'dataLayer' | 'ga4' | 'clarity';

/** RSC/SSR 경계를 넘는 직렬화 가능 분석 플래그(react/vue 공유). */
export interface AnalyticsFlags {
  /** 활성화할 내장 sink 이름. 기본 ['domEvent'](벤더 중립). 빈 배열이면 내장 sink 없음. */
  sinks?: BuiltinSinkName[];
  debug?: boolean;
  requireConsent?: boolean;
  consentCookie?: string;
}
