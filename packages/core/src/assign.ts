import { hashToUnit } from './hash';
import type { Experiment } from './types';

export function controlKey(exp: Experiment): string {
  return exp.control || exp.variants[0]?.key || '';
}

/** 결정적 가중 배정. config 정규화로 seed는 항상 채워져 있다고 가정. */
export function assign(exp: Experiment, visitorId: string): string {
  const total = exp.variants.reduce((s, v) => s + Math.max(0, v.weight), 0);
  if (total <= 0) return controlKey(exp);
  const u = hashToUnit(`${visitorId}:${exp.seed}`);
  let acc = 0;
  for (const v of exp.variants) {
    acc += Math.max(0, v.weight) / total;
    if (u < acc) return v.key;
  }
  return exp.variants[exp.variants.length - 1].key;
}
