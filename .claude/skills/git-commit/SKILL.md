---
name: git-commit
description: |
  MANDATORY before any `git commit` invocation. Conventional Commits 형식 + 본문 3줄 제한 + Stash 백업 패턴 (pop 금지, apply + 성공 후 drop) 강제. 영어 명령형 + 첫 글자 대문자 + 마침표 없음 50자 제목 + 본문 bullet 3줄 이하 + type(scope) 형식.
  Use when user invokes /git-workflow:commit, asks "커밋 메시지", "커밋 만들어줘", "커밋 작성", "커밋해줘", "변경사항 커밋", "stash 백업", "stash 처리", "conventional commits", "type(scope) 형식", "본문 3줄 제한", or before invoking `git commit` / `git stash`.
---

# 커밋 워크플로우 (Conventional Commits + Stash 백업)

## 1. 커밋 메시지 컨벤션

### 본문 3줄 제한 (CRITICAL)

- 커밋 본문은 **정확히 3줄 이하** (bullet 1개 = 1줄)
- 4줄 이상이 필요하면 → 여러 커밋으로 분리하거나 PR description 으로 옮긴다
- **작성 전에 bullet 개수를 센다**

### 형식

```
type(scope)!: message
```

| 필드        | 규칙                                                                               |
| ----------- | ---------------------------------------------------------------------------------- |
| **type**    | `feat`, `fix`, `build`, `ci`, `docs`, `perf`, `refactor`, `style`, `test`, `chore` |
| **scope**   | 모듈 / 도메인 (선택)                                                               |
| **`!`**     | breaking change 표시 (선택)                                                        |
| **message** | 영어, 명령형, **첫 글자 대문자**, 마침표 없음, **최대 50자**                       |
| **본문**    | 무엇을 / 왜 변경했는지 (선택, 최대 3줄)                                            |
| **Footer**  | issue tracker 티켓, PR, 문서 참조 (선택)                                           |

### message 대소문자/태 (CRITICAL)

- **첫 글자 대문자** + 영어 **명령형**(현재형) + **마침표 없음**
- `type(scope):` 접두부는 소문자 유지, 그 뒤 message 의 첫 글자만 대문자

```bash
# ✅ DO: 첫 글자 대문자, 명령형, 마침표 없음
feat(auth): Add Google OAuth provider
fix(cart): Handle empty cart state
docs(api): Update endpoint documentation
chore(release): Bump version to 1.0.0

# ❌ DON'T: 소문자 시작, 과거형, 마침표
feat(auth): added Google OAuth provider.
fix(cart): fixed the cart bug
```

### 예시

#### ✅ DO — 최대 3줄

```
feat(auth): Add user authentication

- Add login form with validation
- Implement JWT token handling
- Add logout functionality
```

#### ✅ DO — 2줄

```
feat(api): Add user endpoints

- Add GET /users and POST /users
- Include pagination support
```

#### ❌ DON'T — 4줄 이상 (위반)

```
feat(admin): Add user pages

- Add user info management pages
- Add permission group management pages
- Add server API mocks
- Remove old pages
```

#### ❌ DON'T — 잘못된 형식

```
added new feature
feat(auth): fixed the bug.
```

---

## 2. 커밋 크기와 범위

- 각 커밋은 **하나의 논리적 변경** 만 포함 (코드 리뷰와 롤백이 쉬워진다)
- 큰 변경은 작은 커밋으로 분리 (예: 5개 파일 → 2-3 개 커밋)
- 다른 종류의 변경 섞지 않음 (예: 기능 추가 + 리팩토링은 별개 커밋)

### ✅ DO — 적절한 분할

```
feat(auth): Add login form validation
feat(auth): Implement JWT token handling
feat(auth): Add logout functionality

docs: Add conventions for team
docs: Update API documentation
```

### ❌ DON'T — 너무 크거나 혼합

```
feat(auth): Add complete authentication system with login, logout, validation, JWT handling, and password reset
```

---

## 3. Stash 백업 패턴 (CRITICAL)

커밋 작업 전후 안전망. 핵심 원칙: **`git stash pop` 절대 사용 금지** — 항상 `git stash apply` 로 백업 보존.

### 핵심 규칙

- 커밋 작업 **전에** `git stash push -m "backup: [description]"` 로 stash 백업 생성
- **`git stash pop` 절대 사용 금지** — 항상 `git stash apply` 로 백업 보존
- 작업이 완전히 끝나고 검증되기 전까지 백업 stash 유지
- 작업을 분할 커밋할 때는 **각 논리 커밋마다 개별 백업** 생성

### 커밋 성공 시 stash 자동 정리

커밋이 성공적으로 완료되면 (`git log` 로 새 SHA 확인) **곧바로 해당 백업 stash 를 `git stash drop stash@{N}` 으로 제거**한다.

이유:

- 백업의 목적은 실패 시 복구이므로 커밋이 정상 반영된 시점에 stash 는 불필요
- 누적된 stash 는 `git stash list` 만 어지럽힘
- **커밋 실패 · 훅 거부 · 롤백 등 복구가 필요한 경우에만** stash 를 남겨둔다

### 워크플로우 예시

#### 단일 커밋

```bash
# 1. 백업 stash 생성
git stash push -m "backup before commit: add git conventions"

# 2. 적절한 형식으로 stage + commit
git add .
git commit -m "docs: update git conventions with stash workflow"

# 3. 커밋 성공 확인 후 stash 제거
git log -1                    # 커밋 SHA 확인
git stash drop stash@{0}      # 백업 역할 다했으므로 제거
```

#### 분할 커밋 (논리별 개별 백업)

```bash
git stash push -m "backup: auth validation changes"
git add src/auth/validation.ts
git commit -m "feat(auth): add form validation rules"
git stash drop stash@{0}      # 성공 시 곧바로 제거

git stash push -m "backup: auth api changes"
git add src/auth/api.ts
git commit -m "feat(auth): implement JWT token handling"
git stash drop stash@{0}
```

#### 백업 보존 적용 (`apply` 사용)

```bash
# ✅ 안전을 위해 백업을 보존하면서 복원
git stash apply stash@{0}     # 특정 백업을 제거 없이 적용
git stash apply               # 가장 최근 백업을 제거 없이 적용

# ❌ git stash pop 사용 금지 (백업 제거됨)
git stash pop                 # 절대 사용 금지
```

---

## 4. AI 작업 시 책임

- **CRITICAL: 커밋 본문이 3줄을 넘지 않는지 반드시 검증** (bullet 1개 = 1줄)
- **CRITICAL: message 첫 글자 대문자 + 명령형 + 마침표 없음 검증**
- Conventional commit 형식에 따라 메시지 생성
- 변경 내용에 따라 적절한 type 제안
- 큰 변경은 작은 논리 커밋으로 분할
- 혼합된 관심사 식별 → 별도 커밋 분리 제안
- 커밋 작업 전 stash 백업 생성, 성공 후 즉시 drop

---

## 관련

- `/git-workflow:branching` — 브랜치 전략
- `/git-workflow:merge` — 머지 매트릭스
- `/git-workflow:pr-template` — PR 본문 형식
- `/git-workflow:versioning` — Semantic Versioning (`pnpm version` 명령 / package.json 수동 편집 금지)
