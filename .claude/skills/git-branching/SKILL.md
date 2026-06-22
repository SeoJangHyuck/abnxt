---
name: git-branching
description: |
  Git Flow 브랜치 명명 표준 + "분기 출발 = PR base" 원칙. Feature / Release / Hotfix / QA 4 작업 브랜치 prefix + main/develop 메인 브랜치 + 비표준 브랜치 처리 가이드.
  Use when user invokes /git-workflow:branching or asks "브랜치 만들어줘", "PR base 결정", "feature/release/hotfix/qa 어떤 거 쓸까", "비표준 브랜치 처리", "gh pr create" 명령어 작성.
---

# Git Flow 브랜치 전략

## 목적

모든 팀원 / AI 가 동일한 접두어 규칙을 따른다.

---

## 메인 브랜치

| 브랜치    | 용도                     |
| --------- | ------------------------ |
| `main`    | 프로덕션                 |
| `develop` | 통합 (feature → develop) |

## 작업 브랜치 (분기 출발 = PR base)

**원칙: 분기 출발 브랜치 = PR base.** `gh pr create` 호출 시 **반드시 `--base {분기 출발}` 명시** — 누락 시 repo 기본값 (보통 `main`) 으로 잘못 들어가 사고 발생.

| 종류    | 접두어     | 분기 출발   | PR base     | 예시                                 |
| ------- | ---------- | ----------- | ----------- | ------------------------------------ |
| Feature | `feature/` | `develop`   | `develop`   | `feature/new`, `feature/<TICKET-ID>` |
| Release | `release/` | `develop`   | `develop`   | `release/sprint-20`, `release/1.0.0` |
| Hotfix  | `hotfix/`  | `main`      | `main`      | `hotfix/<TICKET-ID>`                 |
| QA      | `qa/`      | `release/*` | `release/*` | `qa/<TICKET-ID>`                     |

- Release 이름은 스프린트 이름 또는 시맨틱 버전 둘 다 허용
- Hotfix / QA 는 issue tracker 티켓 번호 권장
- `release/*` 자체는 QA 완료 후 `develop` + `main` 양쪽으로 반영 (각각 별도 PR — 머지 방식은 `/git-workflow:merge` 참조)
- 일반 feature 는 `develop` 분기 / `develop` 머지 기본. **이미 cut 된 release 에 합류**시킬 feature 는 `release/*` 분기 / `release/*` 머지 — 아래 "Release 합류 feature" 참조

```bash
# ✅ DO: 분기 출발을 base 로 명시
git checkout -b feature/foo origin/develop
gh pr create --base develop --title "..." --body "..."

# ❌ DON'T: --base 누락 → main 으로 잘못 들어감
gh pr create --title "..." --body "..."
```

---

## QA 브랜치 사용 조건

`release/*` QA 중 발생한 버그 수정은 **기본적으로 release 브랜치에서 직접** 진행 (이슈 티켓당 하나의 커밋). `qa/*` 브랜치는 다음 케이스에만 생성:

- **다수 개발자가 하나의 QA 이슈에 협업**해 함께 해결할 때
- **변경 사항이 협업자 확인을 거쳐야** 머지 가능할 때

위 두 조건을 만족하지 않으면 release 직접 수정이 기본. `qa/*` 의 PR target 은 **항상 해당 `release/*`** — `develop` / `main` 으로 보내지 말 것.

---

## Release 합류 feature (release-targeted feature)

이미 cut 된 `release/*` 에 **다음 develop→release 사이클을 기다리지 않고** 합류시켜야 하는 기능 / 비-버그픽스 변경은 `feature/<topic>` 을 **`release/*` 에서 분기**하고 PR base 를 **그 `release/*`** 로 둔다.

| 항목      | 값                                                     |
| --------- | ------------------------------------------------------ |
| 접두어    | `feature/` (일반 feature 와 동일)                      |
| 분기 출발 | `release/<release-name>` (대상 release)                |
| PR base   | 동일 `release/<release-name>`                          |
| 전파      | release 가 QA 완료 후 develop + main 반영 시 함께 전파 |

> 전파 주의: release 에만 머지하면 release 가 develop/main 으로 반영될 때 함께 들어간다 (별도 develop PR 불필요). release 가 폐기되면 변경도 함께 사라지므로, release 에 의존하지 않는 변경은 일반 feature (→develop) 를 쓴다.

### 일반 feature / QA 와의 구분

| 케이스               | 분기 출발   | PR base     | 용도                                             |
| -------------------- | ----------- | ----------- | ------------------------------------------------ |
| 일반 feature         | `develop`   | `develop`   | 다음 release 사이클 대상 기능                    |
| release 합류 feature | `release/*` | `release/*` | 이미 cut 된 release 에 합류할 기능 / 비-버그픽스 |
| QA                   | `release/*` | `release/*` | release stabilization 중 버그 수정 (협업 조건)   |

### 사용 조건 (남용 회피)

- 변경이 **특정 release 와 함께 배포돼야** 하고 develop→release 정규 흐름을 기다릴 수 없을 때만.
- 버그 수정은 본 케이스가 아니라 release 직접 수정 또는 `qa/*` (위 QA 조건) 사용.

```bash
git checkout -b feature/<topic> origin/release/<release-name>
git push -u origin feature/<topic>
gh pr create --base release/<release-name> --head feature/<topic> --title "..." --body "..."
```

> Hook 호환: `pr-branch-name-check.sh` 는 head `feature/` + `--base` 존재만 검증 → 본 케이스 자동 통과 (변경 불필요).

---

## Sub-feature pattern (long-lived integration branch)

대형 feature 를 작은 단위로 분할 PR 진행할 때 사용. **integration branch** 를 develop 에서 분기해 long-lived 로 두고, 그 안에서 **sub-feature branch** 들이 sub-PR 로 머지 → 최종 integration branch 가 develop 으로 한 번에 머지.

### QA 패턴과의 본질 차이

| 비교 항목 | QA → Release                                  | Sub-feature → Integration                                 |
| --------- | --------------------------------------------- | --------------------------------------------------------- |
| 뿌리      | `release/*`                                   | `feature/<integration>` (integration 자체는 develop 분기) |
| 단계      | QA 절차 (release cut 후) — stabilization 모드 | 개발 단계 (release cut 전) — 신규 기능 / refactor 모드    |
| 목적      | release 의 버그 수정                          | 큰 feature 의 작은 단위 분할 PR                           |
| 성격      | 버그픽스 위주                                 | 신규 기능 / refactor 분할                                 |
| 사용 조건 | 다수 협업 / 협업자 확인 필요                  | 대형 작업 / 다단계 의존성 / atomic 의미 보존 필요         |

### 사용 조건 (남용 회피)

다음 중 하나 이상 해당 시 integration branch 사용:

- 대형 refactor / 마이그레이션 (20+ 파일 / 다단계 의존성)
- 단계가 명확히 분리 가능 (예: cleanup → rename → 전환 형태)
- atomic 의미 보존 필요 (모든 단계 완료 후 develop 반영해야 일관성 보존)
- develop 에 중간 상태 노출이 안 좋은 경우 (예: 컨벤션 일관성 일시 깨짐)

작은 작업 / 독립 PR 로 충분한 작업은 일반 `feature → develop` 패턴 사용.

### 분기 명명 + PR base

- **Integration branch**: `feature/<integration-name>` — develop 에서 분기, PR base = develop
- **Sub-feature branch**: `feature/<integration-name>--<sub-task>` — integration 에서 분기, PR base = integration branch
  - separator `--` (double-dash) 로 integration vs sub 구분
  - 예: `feature/i18n-restructure` (integration) + `feature/i18n-restructure--cleanup` / `--rename` / `--nested` (sub)

```bash
# Integration branch 시작
git checkout develop && git pull
git checkout -b feature/i18n-restructure
git push -u origin feature/i18n-restructure

# Sub-feature 진행
git checkout feature/i18n-restructure
git checkout -b feature/i18n-restructure--cleanup
# ... 작업 ...
git push -u origin feature/i18n-restructure--cleanup
gh pr create --base feature/i18n-restructure --head feature/i18n-restructure--cleanup --title "..." --body "..."

# 모든 sub-PR 머지 완료 후 integration → develop
gh pr create --base develop --head feature/i18n-restructure --title "..." --body "..."
```

### Hook 호환

`pr-branch-name-check.sh` (본 plugin) 가 sub-feature 패턴 **자동 지원** (코드 변경 없음):

- Head regex `^(feature|release|hotfix|qa)/` → sub-feature 명 (`feature/i18n-restructure--cleanup`) 통과
- Base 검증은 `--base` 인자 존재만 → `--base feature/i18n-restructure` 통과

별도 hook 설정 필요 없음.

### Integration branch 동기화 (stale 방지)

integration branch 가 long-lived 라 develop 와 분기 길어지면 stale 위험. sub-PR 머지 후 또는 정기적으로 develop 변경사항을 integration 으로 반영:

```bash
git checkout feature/i18n-restructure
git fetch origin
git merge origin/develop          # 기본 권장 — 협업 안전
git push origin feature/i18n-restructure
```

> **rebase 사용 시 주의**: integration branch 는 이미 origin 에 push 된 long-lived 브랜치이므로 rebase 시 force-push 필요 → sub-feature 작업자에게 영향 (재 fetch / 재 분기). 협업 환경에서는 merge 가 안전. rebase 는 단독 작업 또는 모든 sub-PR 머지 완료 후 develop 머지 직전 단발성으로만 권장.

머지 방식 상세는 `/git-workflow:merge` 참조.

---

## 비표준 브랜치에서 PR 생성

**현재 작업 브랜치**가 표준 prefix 가 아니거나 `main` / `develop` 에서 직접 작업한 경우 (개인 실험 브랜치, 일회성 워크트리 등) PR 생성 직전에 표준 브랜치로 분기 후 작업 내용 이식 (cherry-pick 또는 원 브랜치 기반 분기):

```bash
git checkout -b feature/your-name
git push -u origin feature/your-name
gh pr create --base develop --head feature/your-name --title "..." --body "..."
```

### PR 머지 후 비표준 브랜치 동기화

PR 이 base 브랜치 (보통 `develop`) 로 머지된 후, 비표준 작업자 브랜치를 base 와 동일 상태로 맞춰 다음 작업을 바로 이어갈 수 있게 한다. **squash merge 가 일반적이므로 fast-forward 불가** — `reset --hard` 로 base 에 강제 일치.

```bash
# 0. (안전) 미커밋 변경 백업
git stash push -m "backup before sync"

# 1. base 최신화
git fetch origin

# 2. 비표준 브랜치로 이동 + base 와 정확히 동일하게 맞춤
git checkout {비표준 브랜치}
git reset --hard origin/develop   # base 브랜치명에 맞게 (develop / main / release/*)

# 3. (선택) 백업 복원
git stash apply stash@{0}         # pop 금지 — 백업 보존
```

이후 새 변경부터 시작 → 다음 PR 생성 시 다시 표준 브랜치로 cherry-pick / 분기.

### 자동 차단 메커니즘

- `pr-branch-name-check.sh` (본 plugin hook, PreToolUse Bash) — `gh pr create` 호출 시 head 브랜치 prefix + `--base` 누락 검증, 위반 시 exit 2

---

## 관련

- `/git-workflow:commit` — 커밋 메시지 / Stash 백업
- `/git-workflow:merge` — 머지 매트릭스
- `/git-workflow:pr-template` — PR 본문 형식
- `/git-workflow:versioning` — Release/Hotfix 브랜치 작성 시 버전 증가 시점 (minor/patch)
- 본 plugin `hooks/pr-branch-name-check.sh` — 자동 차단 hook
