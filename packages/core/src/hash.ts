/**
 * FNV-1a 32bit 해시 + murmur3 fmix32 finalizer를 [0,1) 실수로.
 * 서버/엣지/클라 동일 결과(hydration mismatch 없음), Node crypto 불필요.
 *
 * finalizer가 필요한 이유: 순수 FNV-1a는 마지막 바이트 차이를 상위 비트로
 * 확산(avalanche)시키지 못해, `visitorId:seedA` vs `visitorId:seedB`처럼
 * suffix만 다른 입력들이 강하게 상관된다(실험 간 배정 독립성 붕괴 — 설계 15절).
 * fmix32로 전 비트를 섞어 prefix/suffix 어디서 달라도 독립적으로 분포시킨다.
 */
export function hashToUnit(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  // murmur3 fmix32 — 32bit avalanche finalizer
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 0x100000000;
}
