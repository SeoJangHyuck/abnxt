import { resolveVariant } from './resolve';
import type { AbState, ResolveResult } from './types';

/** AbState 스냅샷에 core resolveVariant를 적용(서버·클라 공유). */
export function resolveFrom(state: AbState, key: string): ResolveResult {
  return resolveVariant({
    exp: state.config.experiments[key],
    key,
    visitorId: state.visitorId,
    stored: state.stored[key],
    override: state.overrides[key],
  });
}
