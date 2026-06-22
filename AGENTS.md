<!-- BEGIN:nextjs-agent-rules -->

# Next.js: ALWAYS read docs before coding

Before any Next.js work, find and read the relevant doc in `node_modules/next/dist/docs/`. Your training data is outdated — the docs are the source of truth.

<!-- END:nextjs-agent-rules -->

# Nuxt: 공식 자원 우선 참조

Nuxt/Vue 작업 전에는 `nuxt` MCP 서버(`https://nuxt.com/mcp`) 또는 문서 인덱스 `https://nuxt.com/llms.txt`를 먼저 조회한다. 학습 데이터보다 공식 문서가 정확하다.

# 프로젝트 규약 (abnxt)

- 프레임워크 형평: Next(`@abnxt/next`)·Nuxt(`@abnxt/nuxt`) 어댑터는 동일한 `@abnxt/core` 로직을 공유한다. 한쪽에만 분기 로직을 넣지 말고, 공유 가능한 것은 `@abnxt/core`로 승격한다.
- 배정은 순수 결정적 함수(`hash(visitorId + seed)`)다. SSR·CSR이 같은 결과를 내야 하므로 비결정적 입력(`Date.now`/`Math.random`)을 배정 경로에 넣지 않는다.
- 분석은 벤더 중립. 기본 sink은 `domEvent`(`CustomEvent`)이고 특정 벤더(GA4/GTM/Clarity)는 이름으로 opt-in한다.
- 렌더 경로에서 예외를 던지지 않는다. 잘못된 config는 안전하게 폴백한다.
