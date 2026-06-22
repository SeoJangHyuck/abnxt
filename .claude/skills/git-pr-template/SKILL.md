---
name: git-pr-template
description: |
  MANDATORY before any `gh pr create` or `gh pr edit` that writes the PR title/body. 생성뿐 아니라 기존 PR 본문/제목 수정 시에도 동일 적용. PR 제목 형식 (type: [TICKET] message) + 본문 섹션 구조 + 체크리스트 최소화 정책. 새 최상위 섹션 추가 금지, 디테일은 하위 섹션 (###). 프로젝트의 .github/pull_request_template.md 가 SoT — 그 형식 / 언어 / 섹션 명 / 순서 그대로.
  Use when user invokes /git-workflow:pr-template, asks "PR 제목", "PR 본문 형식", "PR 템플릿", "PR 양식", "PR 만들기", "PR 만들어줘", "PR 생성", "PR 작성", "PR 올려", "PR 올리기", "PR 보내", "PR 수정", "PR 업데이트", "PR 본문 수정", "PR 내용 수정", "PR 고쳐", "PR 다시 작성", "체크리스트 추가", "pull_request_template", or before invoking `gh pr create` / `gh pr edit`.
---

# Pull Request 템플릿 가이드

## PR 제목

- 형식: `type: [<TICKET-ID>] message` (예: `feat: [PROJ-1234] add login form`)
- type 은 Conventional Commits 와 동일 (`feat`, `fix`, `docs` 등 — `/git-workflow:commit` 참조)
- **message 는 영어 명령형** (커밋 메시지 컨벤션과 동일 — `/git-workflow:commit` 참조). 저장소 PR 템플릿 본문이 한국어 등 다른 언어여도 **제목 message 는 항상 영어**로 작성한다. 본문 언어(아래 "프로젝트 템플릿" SoT)와 제목 언어는 별개 — 템플릿의 "언어 그대로"는 **본문에만** 적용된다.
  - ✅ `fix: [PROJ-1234] reflect toggle state in list UI`
  - ❌ `fix: [PROJ-1234] 목록 토글 상태 즉시 반영` (제목 한국어 — 금지)

---

## PR 템플릿 구조 (절대 규칙)

- 저장소의 `.github/pull_request_template.md` 섹션을 **그대로** 따른다
- **새 최상위 섹션 (`##`) 추가 금지** — "## 작업 배경", "## 개선 사항", "## 기술적 세부사항" 같은 임의 섹션 X
- 추가 디테일이 필요하면 **기존 섹션 안에 하위 섹션 (`###`)** 사용
  - 예: "## 작업 내용" 안에 "### 버그 수정" 추가

---

## 프로젝트 템플릿 vs 본 skill fallback

### 우선순위

1. **저장소의 `.github/pull_request_template.md` 가 존재** → 그 형식 그대로 따름 (섹션 명 / 체크리스트 / 언어 / 순서 모두 SoT)
2. **없거나 비어 있음** → 본 skill 의 fallback 예시 사용 (한국어 5 섹션 기준)

### Fallback (한국어 5 섹션)

```md
## 작업 내용

-

## Reference

-

## 작업 결과

-

## 기타

-

## 체크리스트

- [x] 불필요한 코드는 제거되었나요?
- [x] PR을 올리는 코드의 길이가 적정한가요?
```

> 저장소에 `.github/pull_request_template.md` 가 있으면 (언어 무관) 그 템플릿이 SoT — 본 skill fallback 은 템플릿 부재 시에만 사용. 영어 / 일본어 등 다른 언어 템플릿을 운영하는 저장소면 그 템플릿 형식을 그대로 따른다.

---

## 체크리스트 정책 (기본 최소화)

- 기본적으로 저장소 PR 템플릿의 **최소 체크리스트만** 사용
- PR 작성자가 명시적으로 요청하지 않는 한 항목 추가 / 확장 금지
- 저장소 템플릿이 없으면 위 fallback 예시의 2개 항목만 사용

---

## 본문 작성 패턴

### ✅ DO — 의미 있는 high-level 요약

```md
## 작업 내용

- Add JWT-based user authentication
- Implement login / logout

## Reference

- [Auth0 official docs](https://auth0.com/docs)

## 작업 결과

- Users can sign in safely
- JWT expires after 24 hours

## 체크리스트

- [x] 불필요한 코드는 제거되었나요?
- [x] PR을 올리는 코드의 길이가 적정한가요?
```

### ✅ DO — 디테일은 기존 섹션 안에 하위 섹션 (`###`)

```md
## 작업 내용

### 신규 기능

- Add JWT-based user authentication
- Implement login / logout

### 버그 수정

- Fix session timeout issue
```

### ❌ DON'T — 새 최상위 섹션 추가

```md
## 작업 내용

## 작업 배경 ← 위반: 새 섹션

## 기술 세부 ← 위반: 새 섹션
```

### ❌ DON'T — 요약 없이 커밋 그대로 나열

```md
## 작업 내용

- feat(admin): improve DataTable layout and styling
- style(admin): improve page layout with min-height
- chore(admin): improve form layout and fix JSON format
```

---

## AI 작업 시 책임

- **생성 / 수정 동일 적용** — `gh pr create` (신규) 든 `gh pr edit` (기존 PR 본문·제목 갱신) 든 본문/제목을 쓰는 작업이면 본 skill 을 따른다. 인라인 `gh pr edit --body` 로 임의 양식 작성 금지
- 저장소의 `.github/pull_request_template.md` 가 있으면 그 형식 / 언어 / 섹션 명 그대로 우선 적용 (본 skill fallback 은 템플릿 부재 시만)
- 정해진 형식에 따라 PR 제목 생성
- 템플릿 외 새 최상위 섹션 추가 금지, 디테일은 `###` 하위 섹션으로
- 관련 변경을 high-level 요약으로 묶기 (저수준 디테일 X)
- 5개 auth 커밋이 있으면 "Add user authentication" 으로 묶기
- 변경 파일과 CODEOWNERS 를 기반으로 리뷰어 제안

**참고**: PR 을 생성하거나 수정할 때는 항상 `.github/pull_request_template.md` 를 읽고 정확한 템플릿 형식을 따른다. 서브모듈 / 모노레포는 **해당 PR 이 올라가는 저장소**의 템플릿을 SoT 로 한다 (메인 repo 템플릿과 다를 수 있음).

---

## 관련

- `/git-workflow:branching` — 브랜치 prefix + 분기 출발 = PR base
- `/git-workflow:commit` — 커밋 메시지 type (PR 제목 type 과 동일)
- `/git-workflow:merge` — 머지 매트릭스
