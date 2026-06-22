---
name: git-merge
description: |
  Git Flow 머지 매트릭스 표준 — Feature/QA → Squash merge / Release/Hotfix → 일반 merge (main + develop 양쪽 반영). 머지 방식 혼동 방지 + 머지 후 브랜치 삭제 정책.
  Use when user invokes /git-workflow:merge, asks "머지 방식", "PR 머지해줘", "squash vs merge commit", "release 머지", "hotfix 머지", "feature 머지 후 브랜치 처리", "main develop 양쪽 반영", "머지 후 브랜치 삭제", or before invoking `gh pr merge` / `git merge` to confirm squash-vs-merge-commit choice.
---

# 머지 전략

## 기본 원칙

- **단일 작업 단위 브랜치** (Feature, QA) → **Squash merge 필수** (작은 커밋들을 하나의 단위로 정리)
- **통합 브랜치** (Release, Hotfix) → **일반 merge (merge commit) 필수** + **`main` 과 `develop` 양쪽 모두 반영** (워크트리 보존)

---

## 머지 매트릭스

| 머지 방향                            | 전략                  | 비고                                                                                    |
| ------------------------------------ | --------------------- | --------------------------------------------------------------------------------------- |
| **Feature → Develop**                | **Squash merge 필수** | 작은 작업 커밋들을 단일 단위로 정리                                                     |
| **Sub-feature → Integration branch** | **Squash merge 필수** | 단일 sub 작업 단위로 정리 (sub-PR 의 작은 커밋들 squash)                                |
| **Integration branch → Develop**     | **Squash merge 필수** | 모든 sub-PR 머지 완료 후 전체 통합 결과를 atomic 단위로 develop 반영 (히스토리 한 커밋) |
| **QA → Release**                     | **Squash merge 필수** | 협업 커밋들을 단일 QA 이슈 단위로 정리                                                  |
| **Release → Develop**                | **일반 merge 필수**   | release 워크트리 보존                                                                   |
| **Release → Main**                   | **일반 merge 필수**   | release 워크트리 보존 — develop 과 동시 반영                                            |
| **Hotfix → Main**                    | **일반 merge 필수**   | hotfix 워크트리 보존                                                                    |
| **Hotfix → Develop**                 | **일반 merge 필수**   | hotfix 워크트리 보존 — main 과 동시 반영                                                |

> ⚠️ **Release / Hotfix 는 `main` + `develop` 양쪽 모두 일반 merge 로 반영** 한다 (한쪽만 머지 금지). 통합 브랜치 워크트리가 양쪽 히스토리에 그대로 보존되어야 추적 가능.

### 머지 후 브랜치 처리

- Feature / QA: 머지 후 브랜치 삭제
- Sub-feature: integration branch 로 머지 완료 후 삭제
- Integration branch: 모든 sub-PR 완료 + develop 머지 완료 후 삭제
- Release / Hotfix: `main` + `develop` 양쪽 머지 완료 후 삭제 (한쪽만 머지된 상태로 삭제 금지)

---

## Sub-feature pattern 머지 정책

Sub-feature → Integration / Integration → Develop 머지는 **모두 Squash merge** — 이유:

- **Sub-feature → Integration**: 단일 sub 작업 단위 (cleanup / rename 등) 의 작은 커밋들을 sub-PR 단위로 정리. `Feature → Develop` 의 squash 정책과 동일.
- **Integration → Develop**: 전체 통합 결과를 atomic 단위로 develop 에 반영. develop 히스토리에는 integration 단위 한 커밋만 남음 (sub-PR 들의 commit 은 squash 의 squash 가 되어 합쳐짐).

### Release / Hotfix 와의 차이

| 항목          | Release / Hotfix                                                                    | Integration branch                                                       |
| ------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| 머지 대상     | `main` + `develop` 양쪽                                                             | `develop` 만                                                             |
| 머지 방식     | 일반 merge (양쪽 동시 반영)                                                         | Squash merge                                                             |
| 워크트리 보존 | 필수 — release / hotfix 단위 추적                                                   | 불필요 — 개발 단계 분할 PR 의 통합 단위                                  |
| 본질          | 배포 단위 자체가 의미 (히스토리 보존 필수 — 어떤 release 가 무엇을 포함했는지 추적) | 분할 PR 의 통합 컨테이너 (develop 히스토리에는 squash 된 한 단위만 표현) |

sub-feature 패턴 분기/명명 상세는 `/git-workflow:branching` §"Sub-feature pattern (long-lived integration branch)" 참조.

---

## AI 작업 시 책임

- 머지 매트릭스 그대로 적용 (squash vs 일반 merge 혼동 금지)
- Release / Hotfix 머지 시 `main` + `develop` 양쪽 모두 일반 merge 진행 확인
- 충돌 확인 및 해결 전략 제안
- 머지 후 작업 브랜치 삭제 권장 (Release / Hotfix 는 양쪽 머지 완료 후)
- 머지 차단 정책: P1 / P2 = Request changes (머지 차단), P3 = Approve 가능

---

## 관련

- `/git-workflow:branching` — 브랜치 prefix + 분기 출발 = PR base 원칙
- `/git-workflow:commit` — 커밋 메시지 형식
- `/git-workflow:pr-template` — PR 본문 형식
