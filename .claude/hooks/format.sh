#!/usr/bin/env bash
# PostToolUse 훅 — Edit/Write/MultiEdit로 변경된 파일을 자동 포맷·수정.
# stdin 으로 들어온 hook JSON에서 file_path 를 추출해, 해당 파일만 처리한다.
set -euo pipefail

# hook payload(JSON) 읽기
payload="$(cat)"

# tool_input.file_path 추출 (jq 우선, 없으면 grep 폴백)
if command -v jq >/dev/null 2>&1; then
  file="$(printf '%s' "$payload" | jq -r '.tool_input.file_path // empty')"
else
  file="$(printf '%s' "$payload" | grep -oE '"file_path"[[:space:]]*:[[:space:]]*"[^"]+"' | head -1 | sed -E 's/.*"file_path"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/')"
fi

# 대상 파일이 없거나 존재하지 않으면 조용히 종료
[ -n "${file:-}" ] && [ -f "$file" ] || exit 0

# 프로젝트 루트로 이동 (스크립트는 .claude/hooks/ 에 위치)
root="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$root"

# .claude/skills 등 외부 소스는 건드리지 않음
case "$file" in
  */.claude/skills/*) exit 0 ;;
esac

ext="${file##*.}"

# prettier: 지원 확장자 전부 (실패해도 커밋/편집 흐름 막지 않음)
pnpm exec prettier --write --ignore-unknown "$file" >/dev/null 2>&1 || true

# eslint --fix: 코드 파일만
case "$ext" in
  js | jsx | ts | tsx | mts | cts | mjs | cjs | vue)
    pnpm exec eslint --fix "$file" >/dev/null 2>&1 || true
    ;;
esac

# stylelint --fix: 스타일/SFC
case "$ext" in
  css | scss | sass | vue)
    pnpm exec stylelint --fix "$file" >/dev/null 2>&1 || true
    ;;
esac

exit 0
