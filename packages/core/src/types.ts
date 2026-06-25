export type Variant = { key: string; weight: number };

/** loadConfig로 정규화된 실험. seed/sticky/control은 항상 채워져 있다. */
export interface Experiment {
  name: string;
  /**
   * 이 키의 동작을 설명하는 사람이 읽는 설명(어드민/문서용).
   * loadConfig 정규화 시 항상 ''로 채워지므로 런타임에서는 항상 존재한다(타입은 하위호환을 위해 optional).
   */
  description?: string;
  active: boolean;
  sticky: boolean;
  seed: string;
  control: string;
  variants: Variant[];
}

export interface AbConfig {
  version: 1;
  updatedAt?: string;
  /**
   * 전체 사용자 강제 재배정 epoch(타임스탬프, ms). 어드민 "쿠키 초기화"가 설정한다.
   * sticky 쿠키에 저장된 배정 epoch가 이 값보다 오래되면 배정을 무시하고 재배정한다(1회성).
   */
  resetEpoch?: number;
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
