#!/usr/bin/env bash
# SessionStart 훅 — 세션별 활성 모델을 기록한다.
# UserPromptSubmit 훅(model-banner.sh)이 이 값을 읽어 모델 배너를 주입한다.
set -euo pipefail

# jq 부재 시 조용히 종료 (배너는 model-banner.sh에서 unknown 폴백)
command -v jq >/dev/null 2>&1 || exit 0

data="$(cat)"
sid="$(printf '%s' "$data" | jq -r '.session_id // empty')"
model="$(printf '%s' "$data" | jq -r '.model // "unknown"')"

[ -n "$sid" ] || exit 0

dir="$HOME/.claude/.session-models"
mkdir -p "$dir"
printf '%s\n' "$model" >"$dir/$sid"
exit 0
