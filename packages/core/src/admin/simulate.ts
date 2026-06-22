import { assign } from '../assign';
import type { Experiment } from '../types';

/** 가상 N명(`sim-<i>`)을 core assign으로 배정해 변이별 카운트 산출(어드민 미리보기). */
export function simulateSplit(
  exp: Experiment,
  n: number,
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const v of exp.variants) counts[v.key] = 0;
  for (let i = 0; i < n; i++) {
    const key = assign(exp, `sim-${i}`);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}
