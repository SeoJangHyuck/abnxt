---
name: git-versioning
description: |
  `pnpm version` / `npm version` 호출 전 필수 (MANDATORY before any pnpm version invocation). Semantic Versioning (major.minor.patch) 적용 + `pnpm version` 명령으로 일관 갱신 강제. 수동 package.json 편집 금지 (lockfile sync 누락 위험). git tag 자동 생성 비활성 (.npmrc `git-tag-version=false`) 환경 가정.
  Use when user invokes /git-workflow:versioning, asks "버전 올려줘", "patch / minor / major 어느 거", "release 버전", "hotfix 버전", "pnpm version", "package.json 버전", "semver 적용", or before invoking `pnpm version` / `npm version`.
---

# 시맨틱 버전 관리 (Semantic Versioning)

## 목적

수동 `package.json` 편집은 lockfile / 부수 파일 동기화 누락 위험이 있어 금지.

## 버전 증가 정책

| 변경 유형             | 명령어               | 예시          | 사용 시점               |
| --------------------- | -------------------- | ------------- | ----------------------- |
| **Patch** (버그 픽스) | `pnpm version patch` | 1.0.0 → 1.0.1 | Hotfix / 작은 버그 픽스 |
| **Minor** (신규 기능) | `pnpm version minor` | 1.0.0 → 1.1.0 | Release / 신규 기능     |
| **Major** (Breaking)  | `pnpm version major` | 1.0.0 → 2.0.0 | Breaking change         |

## .npmrc 설정 (전제)

git tag 자동 생성을 비활성화한다 (release 흐름은 별도 git tag / GitHub release 로 관리):

```
git-tag-version=false
```

본 설정이 없으면 `pnpm version` 이 자동으로 git tag 를 생성 — release 흐름과 충돌 가능. 프로젝트 `.npmrc` 에 본 설정 존재 확인 후 진행.

## ✅ DO — 올바른 버전 관리

```bash
pnpm version patch  # 버그 픽스
pnpm version minor  # 신규 기능
pnpm version major  # Breaking change
```

명령어는 자동으로:

1. `package.json` `version` 필드 갱신
2. lockfile (`pnpm-lock.yaml`) 갱신
3. 워크스페이스 안 다른 package 의 버전 의존성 sync (해당 시)

## ❌ DON'T — 수동 편집

`package.json` 의 `version` 필드를 직접 수정하지 않는다 — lockfile / 부수 파일 동기화 누락 위험.

```jsonc
// ❌ 금지 — package.json 직접 편집
{
  "version": "1.2.3", // ← 수동 변경 시 lockfile 미동기화
}
```

## AI 작업 시 책임

- 변경 내용에 따라 적절한 버전 증가 타입 제안 (patch / minor / major)
- changelog 항목 생성 (필요 시)
- 패키지 파일 간 버전 일관성 검증 (monorepo 워크스페이스)
- **사용자 명시 요청 없이 자동 `pnpm version` 실행 금지** — 버전 증가는 사용자 판단 영역

## Branch 흐름과의 관계

| 브랜치 type | 버전 증가     | 시점                                    |
| ----------- | ------------- | --------------------------------------- |
| `feature/*` | 보통 X        | Feature 머지 시 release 브랜치에서 일괄 |
| `release/*` | minor / major | Release 브랜치 작성 시 한 번            |
| `hotfix/*`  | patch         | Hotfix 브랜치 작성 시 한 번             |

`/git-workflow:branching` skill 참조.

## 관련

- `/git-workflow:commit` — 커밋 메시지 / Stash 백업
- `/git-workflow:branching` — 브랜치 전략 (release / hotfix 버전 증가 시점)
- `/git-workflow:merge` — 머지 매트릭스
- `/git-workflow:pr-template` — PR 본문 형식
