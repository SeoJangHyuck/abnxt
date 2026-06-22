---
name: scss-bem-color-system
paths:
  - '**/*.scss'
  - '**/*.vue'
description: |
  SCSS 색상 시스템 — base 색상 + opacity variant + semantic alias + family/purpose 그룹화 + 도메인 색상 enum 추상 패턴 (`$domain-colors` + `@mixin domain-color` / `@mixin domain-badge`). 실제 도메인 매핑 (게임 / 카테고리 enum) 은 프로젝트 overlay 우선.
  Use when user invokes /scss-bem-color-system, asks "색상 변수", "도메인 색상", "색상 토큰", "팔레트", "color mixin", "opacity variant", "semantic alias", "$color- 추가", or before invoking Read/Write/Edit on `_colors.scss`, `_palette.scss`, or other SCSS color definition files.
---

# SCSS Color System Skill

SCSS 색상 시스템 SoT — base 색상 + opacity variant + semantic alias + 도메인 색상 추상 패턴.

## 호출 시점

- 색상 변수 신규 정의 (`_variables.scss`)
- 도메인 색상 enum mixin 작성 (게임 / 브랜드 / 카테고리 등)
- semantic alias (positive / negative / neutral 등) 추가
- opacity variant 패턴 결정

## 1. 색상 정의 전략

- **base 색상** 먼저 정의
- `rgba()` 를 사용하여 **opacity variant** 생성
- 컨텍스트에는 **semantic 색상 alias** 사용
- 색상을 family / purpose 별로 그룹화

```scss
// ✅ DO: 구조화된 색상 시스템
$blue: #0060bd !default;
$blue-op-50: rgba($blue, 0.5) !default;
$positive: $green !default; // semantic alias
```

## 2. 도메인 색상 enum 추상 패턴

도메인 색상 enum (게임 / 브랜드 / 카테고리 등) 의 generic SCSS 적용 패턴 — 추상 변수명 (`$domain-colors`) 사용, 실제 enum 키 / hex 값은 **프로젝트 overlay 룰에서 정의**:

```scss
// 도메인 색상 enum 의 generic SCSS 패턴
$domain-colors: (
  item-a: #color-hex,
  item-b: #color-hex,
);

// 색상별 클래스 변형 (color / background / border + hover 활성 상태)
@mixin domain-color {
  @each $name, $color in $domain-colors {
    &--#{$name} {
      color: $color;
      background-color: rgba($color, 0.2);
      border-color: rgba($color, 0.5);

      &.active,
      &:hover {
        color: #fff;
        background-color: $color;
        border-color: $color;
      }
    }
  }
}

// badge 스타일 변형 (solid + outline)
@mixin domain-badge {
  @each $name, $color in $domain-colors {
    &.badge-#{$name} {
      background-color: $color;
      color: #fff;

      &.outline {
        background-color: transparent;
        color: $color;
        border: 1px solid $color;
      }
    }
  }
}
```

## 3. 도메인 색상 매핑 — 프로젝트 overlay 우선

> 본 plugin 은 **default 추상 패턴** (`$domain-colors` map + `@mixin domain-color` + `@mixin domain-badge`) 만 제공. 실제 도메인 매핑 (게임 키 / 카테고리 enum / 브랜드 색상 등) 은 **프로젝트 overlay 룰 (`.claude/rules/{앱}.md` 같은 위치) 에서 정의**하며, overlay 가 본 plugin 의 default 보다 우선.

### Overlay 작성 가이드

도메인 enum 이 앱별 type 정의 (예: 게임 abbr enum) 와 동기화 필요한 경우, **그 동기화 책임은 앱별 룰 본문 주석으로 명시**:

```markdown
# 프로젝트 룰 예시 (rules/{앱}.md)

## SCSS 게임 색상 매핑

| Game key | Hex      | 게임   |
| -------- | -------- | ------ |
| `game-a` | `#color` | Game A |
| `game-b` | `#color` | Game B |

> 도메인 key 는 앱의 도메인 type enum (예: 게임 / 카테고리 / 브랜드 abbr) 과 동기화 필요. 불일치 시 SCSS 클래스 미적용 — 신규 도메인 추가 시 type enum + 본 표 동시 갱신.
```

### 사용 예시

```scss
// 프로젝트 styles/_variables.scss 또는 components/{name}.vue style
@use '@/assets/styles/utils' as *;

$domain-colors: (
  game-a: #color-hex,
  game-b: #color-hex,
);

.game-card {
  @include domain-color;
  // .game-card--game-a / .game-card--game-b 자동 생성
}

.game-badge {
  @include domain-badge;
  // .game-badge.badge-game-a / .game-badge.badge-game-b 자동 생성
}
```

## 관련 (본 plugin 내부)

- [`naming-and-structure`](../naming-and-structure/SKILL.md) — `_variables.scss` 파일 구성 + 변수 명명 (kebab-case + semantic)
- [`component-patterns`](../component-patterns/SKILL.md) — variant 적용 / 외부 영향 분리
