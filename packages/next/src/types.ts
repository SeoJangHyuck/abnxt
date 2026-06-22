import type {
  ServerConfigSource,
  Sink,
  AnalyticsFlags,
  AbState,
} from '@abnxt/core';
import type { ReactNode } from 'react';

export type { AnalyticsFlags, AbState };

/** configureServerAb 옵션(공개 타입). */
export interface ServerAbConfig {
  source: ServerConfigSource;
}

export interface ABProviderProps {
  children: ReactNode;
  analytics?: AnalyticsFlags;
}

export interface AbStateProviderProps {
  state: AbState;
  /** 서버 ABProvider 경유 시 사용(직렬화 가능). */
  analytics?: AnalyticsFlags;
  /** 클라 직접 합성 시에만(고급/CSR-only). */
  sinks?: Sink[];
  /** 클라 직접 합성 시에만(고급). */
  consent?: () => boolean;
  children: ReactNode;
}
