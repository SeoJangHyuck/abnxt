#!/usr/bin/env bash
# UserPromptSubmit 훅 — 세션 활성 모델을 응답 컨텍스트에 주입한다.
# session-model-record.sh(SessionStart)가 기록한 모델을 읽고,
# 기록이 없으면 prompt payload의 model 필드로 폴백한다.
set -euo pipefail

# jq 부재 시 배너 주입 skip (출력 JSON 생성 불가)
command -v jq >/dev/null 2>&1 || exit 0

data="$(cat)"
sid="$(printf '%s' "$data" | jq -r '.session_id // empty')"

# 1순위: SessionStart가 기록한 파일, 2순위: payload의 model, 최종: unknown
model="$(cat "$HOME/.claude/.session-models/$sid" 2>/dev/null || true)"
[ -n "$model" ] || model="$(printf '%s' "$data" | jq -r '.model // "unknown"')"

ctx="활성 모델: ${model}. 응답 첫 줄에 반드시 배너를 출력: [모델 <읽기 좋은 모델명> · 처리 <메인 직접 | 위임 권장 (agent명) | 하이브리드 (agent명 + 메인)> · 적용 <활성 skill/command, 없으면 —>]. 모델명은 사람이 읽기 좋게 표기(예: claude-opus-4-8 → Opus 4.8, [1m] 표기는 (1M)). 처리는 이번 작업을 메인에서 직접 할지 서브에이전트 위임이 나을지 판단해 표기하고, 위임/하이브리드면 작업 시작 전 사용자에게 제안 후 의사 확인(안전한 read-only는 즉시 진행 가능). 모델 전환은 사용자 결정이므로 권장하지 않음. 적용 칸은 활성 skill/command만 적고 rule은 제외."

jq -nc --arg ctx "$ctx" '{hookSpecificOutput: {hookEventName: "UserPromptSubmit", additionalContext: $ctx}}'
exit 0
