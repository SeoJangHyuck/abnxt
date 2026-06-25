export const MARKER_START = '// abnxt:start';
export const MARKER_END = '// abnxt:end';

export interface InjectResult {
  content: string;
  changed: boolean;
  /** START 마커는 있으나 END가 없어 안전하게 재동기화할 수 없는 손상 상태. */
  corrupted?: boolean;
}

/** 마커 블록 경계 [start, end) 탐지. indexOf 기반(정규식 메타문자 안전). END 없으면 null. */
function findBlock(source: string): { start: number; end: number } | null {
  const start = source.indexOf(MARKER_START);
  if (start < 0) return null;
  const endMarker = source.indexOf(MARKER_END, start + MARKER_START.length);
  if (endMarker < 0) return null;
  const lineEnd = source.indexOf('\n', endMarker);
  return { start, end: lineEnd < 0 ? source.length : lineEnd + 1 };
}

/**
 * anchor 줄 다음에 마커로 감싼 snippet을 삽입한다.
 * - 마커 쌍(START+END)이 이미 있으면 블록을 새 snippet으로 치환(버전업 재동기화). 내용 동일 시 no-op(멱등).
 * - START만 있고 END가 없으면 손상으로 보고 건드리지 않는다(corrupted=true).
 * - 마커가 없고 anchor가 있으면 삽입. anchor가 없으면 no-op.
 */
export function injectWithMarkers(
  source: string,
  snippet: string,
  anchor: string,
): InjectResult {
  const block = `${MARKER_START}\n${snippet}\n${MARKER_END}\n`;
  const found = findBlock(source);
  if (found) {
    const next = source.slice(0, found.start) + block + source.slice(found.end);
    return { content: next, changed: next !== source };
  }
  // START는 있는데 END가 없음 = 손상 → 자동 수정하지 않는다(더 망치는 것 방지).
  if (source.includes(MARKER_START)) {
    return { content: source, changed: false, corrupted: true };
  }
  const idx = source.indexOf(anchor);
  if (idx < 0) return { content: source, changed: false };
  const lineEnd = source.indexOf('\n', idx);
  const insertAt = lineEnd < 0 ? source.length : lineEnd + 1;
  return {
    content: source.slice(0, insertAt) + block + source.slice(insertAt),
    changed: true,
  };
}
