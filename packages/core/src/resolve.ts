import { assign, controlKey } from './assign';
import type { Experiment, ResolveResult } from './types';

export interface ResolveArgs {
  exp?: Experiment;
  key: string;
  visitorId: string;
  stored?: string;
  override?: string;
}

export function resolveVariant(args: ResolveArgs): ResolveResult {
  const { exp, visitorId, stored, override } = args;
  const isValid = (k?: string): boolean =>
    !!k && !!exp && exp.variants.some((v) => v.key === k);

  // 1. QA override — 유효 키면 최우선(비활성이어도 프리뷰 허용)
  if (isValid(override)) return { variant: override!, source: 'override' };

  // 2. 실험 없음 → control(폴백할 변이 정보 없음)
  if (!exp) return { variant: '', source: 'control' };

  // 3. 비활성 → control(노출 미발화)
  if (exp.active === false)
    return { variant: controlKey(exp), source: 'control' };

  // 4. sticky 저장값 — sticky 켜져 있고 현재 변이에 존재할 때만
  if (exp.sticky !== false && isValid(stored))
    return { variant: stored!, source: 'stored' };

  // 5. 가중치 합 0 → control(노출 미발화)
  const total = exp.variants.reduce((s, v) => s + Math.max(0, v.weight), 0);
  if (total <= 0) return { variant: controlKey(exp), source: 'control' };

  // 6. 결정적 배정
  return { variant: assign(exp, visitorId), source: 'assigned' };
}
