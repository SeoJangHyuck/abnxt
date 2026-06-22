export { AbStateProvider } from './client/context';
export { Experiment, Variant } from './client/Experiment';
export { useExperiment } from './client/useExperiment';
// 어드민은 `@abnxt/next/admin` 서브패스 전용(클라 메인 번들에 어드민 UI 인라인 방지).
export type { AbState, AbStateProviderProps, AnalyticsFlags } from './types';
export type { BuiltinSinkName } from '@abnxt/core';
