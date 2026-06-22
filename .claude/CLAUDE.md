@../AGENTS.md

# abnxt

Next.js 16 / Nuxt 4 공통 골격의 프론트엔드 A/B 테스트 툴. DB·Redis 없이 정적 config + 쿠키 + 미들웨어만으로 동작한다. 자세한 개요는 [README.md](../README.md).

## 모노레포 구조 (pnpm workspace)

| 패키지        | 역할                                                                                                                                   |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `@abnxt/core` | 프레임워크 무관 엔진(해시·배정·해석·config·분석 버스). 의존성 0. `@abnxt/core/server`(Node 전용), `@abnxt/core/admin`(공유 편집 로직). |
| `@abnxt/next` | Next.js 16 App Router 어댑터 + 네이티브 어드민(`@abnxt/next/admin`).                                                                   |
| `@abnxt/nuxt` | Nuxt 4 모듈 어댑터 + 네이티브 어드민(컴포넌트·페이지 자동 주입).                                                                       |
| `@abnxt/cli`  | 설치 스캐폴딩 CLI (`abnxt init`).                                                                                                      |

데모: `examples/next`, `examples/nuxt`.

## 명령

```bash
pnpm install
pnpm -r build          # 전 패키지 빌드
pnpm -r test           # 단위 테스트 (vitest)
pnpm -r typecheck      # 타입 검사
pnpm lint              # eslint + stylelint + prettier --check
pnpm lint:fix          # 자동 수정
pnpm format            # prettier --write
```

## 아키텍처 규약

- **프레임워크 형평**: Next/Nuxt 어댑터는 동일한 `@abnxt/core` 로직을 공유한다. 공유 가능한 로직은 한쪽에 두지 말고 `@abnxt/core`로 승격한다.
- **결정적 배정**: `hash(visitorId + seed)` 순수 함수. SSR·CSR이 같은 결과를 내야 하므로 배정 경로에 `Date.now`/`Math.random` 등 비결정적 입력 금지.
- **분석 벤더 중립**: 기본 sink `domEvent`(`CustomEvent`). GA4/GTM/Clarity는 이름으로 opt-in.
- **렌더 안전**: 잘못된 config는 예외 대신 안전 폴백.
- **어드민 인증**: 앱 로그인 비의존 + 사전 세팅 인증키(`ABNXT_ADMIN_KEY`)→HMAC 세션 쿠키. prod 키 미설정 시 fail-closed.
- **CLI 멱등**: 주입은 마커 주석(`// abnxt:start … // abnxt:end`)으로 멱등 처리. 재실행 시 skip.

## 코드 품질 자동화

- **pre-commit**: husky + lint-staged가 staged 파일에 eslint --fix / prettier / stylelint 실행.
- **자동 포맷 hook**: Edit/Write/MultiEdit 후 `.claude/hooks/format.sh`가 변경 파일을 자동 포맷(`.claude/settings.json`).

## 스킬

- **Git** (`.claude/skills/git-*`): git-branching / git-commit / git-merge / git-pr-template / git-versioning — Git Flow + Conventional Commits 표준.
- **Next.js** (vercel-labs/next-skills): next-best-practices / next-cache-components / next-upgrade.
- **Nuxt/Vue** (onmax/nuxt-skills): nuxt / nuxt-modules / vue / vueuse / ts-library / vitest / vite / pnpm.
- **TypeScript** (kad): typescript — 프레임워크 무관 TS 컨벤션(이름 규칙·타입 안전성·에러 처리).
- **SCSS BEM** (kad): scss-bem-naming-and-structure / -color-system / -component-patterns / -responsive / -typography.
- **Browser** (kad): chrome-devtools MCP — 멀티프로필 풀(`.claude/scripts/chrome-mcp-pool.sh`)로 브라우저 자동화/E2E.
