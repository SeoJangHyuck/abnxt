---
name: scss-bem-naming-and-structure
description: |
  SCSS 파일 구성 + BEM 클래스 명명 + 변수 / mixin / function 명명 컨벤션 + 스타일 룰 선언 순서. _utils.scss 진입점 / kebab-case / semantic 이름 / BEM (&__element, &--modifier) / 자기 반응형 선언 순서.
  Use when user invokes /scss-bem-naming-and-structure, asks "BEM 클래스", "SCSS 파일 구조", "_utils 추가", "변수 명명", "mixin 이름", "kebab-case", "&__element", "스타일 룰 순서", or before invoking Read/Write/Edit on `*.scss` files or component <style scoped> blocks.
paths:
  - '**/*.scss'
  - '**/*.vue'
---

# SCSS Naming and Structure Skill

SCSS 파일 구성 + BEM 명명 + 변수 / mixin 컨벤션 SoT.

## 호출 시점

- 신규 SCSS 파일 / 컴포넌트 스타일 작성
- BEM 클래스 명명 일관성 검토
- 변수 / mixin / function 명명 결정
- 스타일 룰 선언 순서 (반응형 / 자식 선택자) 결정

## 1. 파일 구성 구조

- **메인 파일**:
  - `_utils.scss`: 모든 mixin, 변수, 함수를 import 하는 메인 유틸리티 파일
  - `_variables.scss`: 앱 전용 변수와 색상 정의
  - `_override-variables.scss`: 공유 base layer 커스터마이징을 위한 오버라이드 변수
  - `common.scss`: 한 번만 컴파일되는 글로벌 CSS (컴포넌트 중복 X)
  - `mixins/`: 모든 mixin 파일 디렉토리
  - `modules/`: CSS 모듈과 컴포넌트 전용 스타일
  - `global/`: 일회성 글로벌 선언

## 2. Import 전략

```scss
// ✅ DO: 컴포넌트에서는 _utils.scss 사용 (변수/mixin 직접 import 금지)
@use '@/assets/styles/utils' as *;

// {app}/app/assets/styles/_utils.scss
// - 공유 layer 패키지 (`@your-shared-layer`) 의 변수/mixin/function 을 override 후 forward
// - single source of truth 보장
@use '@/assets/styles/override-variables' as var;
@forward '@your-shared-layer/assets/styles/variables' with (
  $desktop: var.$desktop,
  $page-margin: var.$page-margin,
  $content-width: var.$content-width,
  $container-width: var.$container-width
);
@forward '@/assets/styles/variables';
@forward '@your-shared-layer/assets/styles/mixins/all';
@forward '@/assets/styles/mixins/all';
@forward '@your-shared-layer/assets/styles/functions/all';

// ❌ DON'T: Vue SFC 내부에서 변수/mixin 직접 import
// @use '../styles/variables' as var;            // 회피
// @use '../styles/mixins/typography' as typography;  // 회피
```

> `@your-shared-layer` 는 placeholder — 프로젝트 공유 base layer 패키지 npm scope. 실제 패키지명은 프로젝트 overlay 룰 참조.

## 3. 변수 명명

- 변수 이름은 **kebab-case**
- **descriptive 이름보다 semantic 이름** 우선
- 관련 변수는 함께 그룹화
- 라이브러리 / 공유 layer 변수에는 `!default` 사용

```scss
// ✅ DO: semantic + 그룹화된 변수
$primary-color: #0060bd !default;
$secondary-color: #00ad5f !default;

$navy-20: #4e6682 !default;
$navy-40: #1d4865 !default;
$navy-50: #003a62 !default;

$positive: $green !default; // 상승, 긍정
$negative: $red !default; // 하락, 부정
$neutral: $blue !default; // 변동없음

// ❌ DON'T: descriptive 이름
$light-blue-color: #188eff;
$button-background-color: #0060bd;
```

### 변수 사용 전 체크

**프로젝트에 선언된 SCSS 변수만 사용한다.**

```scss
// ❌ DON'T: 존재 확인 없이 변수 사용 - 빌드 에러 발생
border: 1px solid $gray-30; // 정의되지 않은 변수
color: $primary-color; // 정의되지 않은 변수
```

변수 사용 전:

1. `_variables.scss` 파일들에서 변수 존재 여부 확인
2. 유사한 기존 컴포넌트에서 스타일 패턴 참조
3. 불확실하면 변수 선언 검색: `grep -r "\$variable-name:" --include="*.scss"`

## 4. Mixin / Function 명명

- mixin 과 function 이름에 **kebab-case**
- 유틸리티 mixin 은 목적 접두어로 시작
- 기능을 나타내는 descriptive 이름

```scss
// ✅ DO: mixin 의 명확한 목적과 이름
@mixin opacity-hover() { ... }
@mixin bottom-line($line-color: $white, $line-thickness: 1px) { ... }
@mixin heading($size: 'md') { ... }
@mixin card-list { ... }

// ❌ DON'T: 불명확한 목적
@mixin style1() { ... }
@mixin helper($param) { ... }
```

## 5. BEM 클래스 명명

- 컴포넌트 클래스에 **BEM 방법론** 적용
- 클래스 이름에 **kebab-case**
- 디자인 시스템과 일치하는 semantic 클래스 이름

```scss
// ✅ DO: 클래스 이름의 BEM 구조
.card-list {
  &__card-items {
    &--size-1 { ... }
    &--size-2 { ... }
    &--size-3 { ... }
  }
}

// ✅ DO: semantic 이름
.flag {
  &.flag-global { ... }
  &.flag-sea { ... }
}

// ❌ DON'T: non-semantic 이름
.blue-box { ... }
.container-1 { ... }

// ❌ DON'T: 중첩 없는 평면 BEM (& 중첩 사용)
.card-list { ... }
.card-list__items { ... }
.card-list__items--active { ... }
```

### 외부 선택자 참조보다 자체 BEM modifier 우선

컴포넌트 스타일 내에서 외부 컴포넌트의 클래스 선택자 (`.app.has-event-banner &` 등) 를 직접 참조하면 컴포넌트 간 결합도가 높아진다. 상위 컴포넌트의 상태에 따라 스타일을 변경해야 할 경우, **store / props 등으로 상태를 받아 자체 BEM modifier 클래스로 처리하는 방식을 우선한다.**

```scss
// ⚠️ AVOID: 외부 컴포넌트 선택자 직접 참조 (불가피한 경우에만)
.card__search {
  .app.has-banner & {
    inset-block-start: $header-height + $banner-height;
  }
}

// ✅ PREFER: store / props 에서 상태를 받아 자체 BEM modifier 로 처리
// <div class="card__search" :class="{ 'card__search--with-banner': isBannerVisible }">
.card__search {
  &--with-banner {
    inset-block-start: $header-height + $banner-height;
  }
}
```

## 6. 스타일 룰 선언 순서

선택자 블록 내부 선언은 다음 순서를 따른다. **자기 자신의 반응형 분기는 항상 자식 선택자 / 의사 선택자 선언보다 먼저 선언한다.**

순서:

1. 일반 속성
2. 자기 자신의 반응형 믹스인 (`@include touch`, `@include mobile` 등)
3. 언어 분기 (`:lang(ko) &` 등) — 내부도 동일한 순서 적용
4. 의사 클래스 / 요소 (`&:hover`, `&::before` 등)
5. 자식 BEM 선택자 (`&__name`, `&--modifier` 등)

자기 반응형이 자식 선언 뒤로 밀리면 가독성이 떨어지고, stylelint `no-descending-specificity` 등 specificity 관련 규칙과 충돌할 수 있다.

```scss
// ✅ DO: 일반 속성 → 자기 반응형 → 언어 분기 → 의사 선택자 → 자식 선택자
.selector {
  display: flex;
  padding: 20px;

  @include touch {
    padding: 15px;
  }

  @include mobile {
    padding: 10px;
  }

  :lang(ko) & {
    font-family: $font-ko;

    @include touch {
      font-size: 14px;
    }
    @include mobile {
      font-size: 12px;
    }
  }

  &:hover {
    background: $hover-color;
  }

  &__child {
    color: $primary;
  }
}

// ❌ DON'T: 자식 선택자 뒤로 자기 반응형이 밀림
.selector {
  display: flex;
  padding: 20px;

  &__child {
    color: $primary;
  }

  @include mobile {
    padding: 10px; // 자기 자신의 반응형이 자식 선언 뒤에 와서 가독성↓, specificity 충돌 위험↑
  }
}
```

## 관련 (본 plugin 내부)

- [`color-system`](../color-system/SKILL.md) — 색상 변수 / opacity variant / semantic alias
- [`component-patterns`](../component-patterns/SKILL.md) — variant / 외부 영향 / 보간법 / CSS Module
- [`responsive`](../responsive/SKILL.md) — mobile-first / breakpoint mixin / z-index
- [`typography`](../typography/SKILL.md) — 타이포 mixin map / heading 시스템
