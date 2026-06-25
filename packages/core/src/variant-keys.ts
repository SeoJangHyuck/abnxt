/**
 * 변이 키 enum(실험당 최대 5개). 호스트 컴포넌트는 문자열 리터럴('A'/'B') 대신
 * 이 값을 import해 배정 결과와 비교한다. 어드민의 변이 추가도 이 키 집합으로 제한된다.
 */
export const VARIANT_KEYS = ['A', 'B', 'C', 'D', 'E'] as const;

export type VariantKeyName = (typeof VARIANT_KEYS)[number];

/** `VariantKey.B`처럼 참조하기 위한 상수 맵(TS enum 대신 as const). */
export const VariantKey = {
  A: 'A',
  B: 'B',
  C: 'C',
  D: 'D',
  E: 'E',
} as const satisfies Record<VariantKeyName, VariantKeyName>;

/** 실험당 추가 가능한 최대 변이 수. */
export const MAX_VARIANTS = VARIANT_KEYS.length;
