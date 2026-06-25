import type { Variant } from '../types';
import { VARIANT_KEYS, MAX_VARIANTS } from '../variant-keys';

/**
 * 상대 weight를 100% 합 백분율로(최대잉여법). 합 0이면 균등 분배.
 * 항상 합 100, 모든 값 >= 0(음수/유령 % 없음).
 */
export function normalizeToPercents(
  variants: Variant[],
): Record<string, number> {
  if (variants.length === 0) return {};
  const weights = variants.map((v) => Math.max(0, v.weight));
  const total = weights.reduce((s, w) => s + w, 0);
  // 합 0이면 균등(모든 weight를 1로 취급).
  const base = total <= 0 ? variants.map(() => 1) : weights;
  const baseTotal = base.reduce((s, w) => s + w, 0);

  const raw = base.map((w) => (w / baseTotal) * 100);
  const out: Record<string, number> = {};
  const floors = raw.map((r) => Math.floor(r));
  variants.forEach((v, i) => {
    out[v.key] = floors[i];
  });
  let remainder = 100 - floors.reduce((s, f) => s + f, 0);
  // 소수부가 큰 순서로 +1 분배(동률은 인덱스 순). remainder 만큼.
  const order = raw
    .map((r, i) => ({ i, frac: r - Math.floor(r) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (let k = 0; k < order.length && remainder > 0; k++) {
    out[variants[order[k].i].key] += 1;
    remainder--;
  }
  return out;
}

function nextKey(variants: Variant[]): string {
  const keys = new Set(variants.map((v) => v.key));
  for (const k of VARIANT_KEYS) {
    if (!keys.has(k)) return k;
  }
  // 폴백(이론상 도달하지 않음 — addVariant가 MAX_VARIANTS에서 막는다).
  let n = variants.length;
  while (keys.has(`V${n}`)) n++;
  return `V${n}`;
}

/** 변이 추가. 최대 MAX_VARIANTS(5)개까지만 — 초과 시 변경 없이 그대로 반환. */
export function addVariant(variants: Variant[]): Variant[] {
  if (variants.length >= MAX_VARIANTS) return variants;
  return [...variants, { key: nextKey(variants), weight: 50 }];
}

/**
 * 어드민 가중치 정책 요약(프레임워크 무관, Next/Nuxt 어드민 공유).
 * - 변이 2개 이하: 자동 비례 조정(합 항상 100%).
 * - 3개 이상: 자유 입력. 합(정수 반올림)이 100% 초과면 `over`(저장 차단 신호).
 */
export interface WeightSummary {
  autoBalance: boolean;
  sum: number;
  over: boolean;
}
export function weightSummary(variants: Variant[]): WeightSummary {
  const autoBalance = variants.length <= 2;
  const sum = variants.reduce(
    (s, v) => s + Math.max(0, Math.round(v.weight)),
    0,
  );
  return { autoBalance, sum, over: !autoBalance && sum > 100 };
}

/**
 * 변이별 표시값(%): 2개 이하는 정규화 %, 3개 이상은 raw weight(정수). 슬라이더 값·라벨·막대에 공유.
 * 정규화 실패는 빈 맵 폴백(렌더 경로 예외 금지).
 */
export function weightDisplay(variants: Variant[]): Record<string, number> {
  if (variants.length <= 2) {
    try {
      return normalizeToPercents(variants);
    } catch {
      return {};
    }
  }
  const out: Record<string, number> = {};
  for (const v of variants) out[v.key] = Math.max(0, Math.round(v.weight));
  return out;
}

export function removeVariant(variants: Variant[], key: string): Variant[] {
  if (variants.length <= 1) return variants;
  return variants.filter((v) => v.key !== key);
}

export function setWeight(
  variants: Variant[],
  key: string,
  weight: number,
): Variant[] {
  return variants.map((v) =>
    v.key === key ? { ...v, weight: Math.max(0, weight) } : v,
  );
}

/**
 * 동적 가중치: target을 next(0~100)로 두고 나머지를 `100 - next`로 비례 재분배한다.
 * A를 올리면 나머지 바가 자동으로 줄어 합 100을 유지한다(슬라이더 % 직관).
 * - 나머지 1개: `100 - next`로 직접.
 * - 나머지 weight 합 0: 나머지에 균등 분배.
 */
export function redistributeWeights(
  variants: Variant[],
  key: string,
  next: number,
): Variant[] {
  const clamped = Math.max(0, Math.min(100, next));
  const others = variants.filter((v) => v.key !== key);
  if (others.length === 0) {
    return variants.map((v) => (v.key === key ? { ...v, weight: clamped } : v));
  }
  const remaining = 100 - clamped;
  const otherTotal = others.reduce((s, v) => s + Math.max(0, v.weight), 0);
  return variants.map((v) => {
    if (v.key === key) return { ...v, weight: clamped };
    const share =
      otherTotal > 0
        ? (Math.max(0, v.weight) / otherTotal) * remaining
        : remaining / others.length;
    return { ...v, weight: share };
  });
}
