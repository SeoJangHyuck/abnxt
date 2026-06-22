export const MARKER_START = '// abnxt:start';
export const MARKER_END = '// abnxt:end';

export interface InjectResult {
  content: string;
  changed: boolean;
}

/** anchor 줄 다음에 마커로 감싼 snippet을 삽입. 이미 마커 블록이 있으면 no-op(멱등). anchor 없으면 no-op. */
export function injectWithMarkers(
  source: string,
  snippet: string,
  anchor: string,
): InjectResult {
  if (source.includes(MARKER_START)) return { content: source, changed: false };
  const idx = source.indexOf(anchor);
  if (idx < 0) return { content: source, changed: false };
  const lineEnd = source.indexOf('\n', idx);
  const insertAt = lineEnd < 0 ? source.length : lineEnd + 1;
  const block = `${MARKER_START}\n${snippet}\n${MARKER_END}\n`;
  return {
    content: source.slice(0, insertAt) + block + source.slice(insertAt),
    changed: true,
  };
}
