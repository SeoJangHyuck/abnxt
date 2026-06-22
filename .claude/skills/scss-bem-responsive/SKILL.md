---
name: scss-bem-responsive
paths:
  - '**/*.scss'
  - '**/*.vue'
description: |
  SCSS 반응형 디자인 — 공유 layer breakpoint mixin (touch / mobile / until 등) + mobile-first 접근 + 디바이스별 변수 패턴 + z-index 레이어 가이드 + SFC scoped / module 스타일 정책.
  Use when user invokes /scss-bem-responsive, asks "반응형", "breakpoint", "mobile-first", "미디어 쿼리", "z-index 레이어", "디바이스별 스타일", "@include touch", "@include until", "scoped vs module", or before invoking Read/Write/Edit on responsive SCSS rules / @media blocks.
---

# SCSS Responsive Skill

SCSS 반응형 디자인 SoT — breakpoint mixin + mobile-first + 레이어 / z-index 가이드.

## 호출 시점

- 반응형 컴포넌트 신규 작성
- breakpoint mixin (`@include touch`, `@include mobile`) 적용 결정
- 디바이스별 변수 명명 (`$touch-*`, `$mobile-*`)
- z-index / 레이어 결정 (고정 UI / 모달 / 툴팁)
- SFC `<style scoped>` vs `<style module>` 결정

## 1. 레이어 & Z-Index (빠른 가이드)

- 고정 UI (헤더, drawer) 에는 `$fixed-z-index` 를 base 로 사용. 모달은 그 위, 툴팁은 필요할 때만 모달 위
- ad-hoc z-index 값 회피. 반복되면 컴포넌트 레이어 토큰을 정의해 하드코딩 대신 사용

## 2. SFC 스타일 사용

- SFC 에서는 `module` 또는 `scoped` 우선 사용:
  - 클래스 바인딩으로 재사용되면 `module`
  - 단순 컴포넌트 로컬은 `scoped`
- SFC 내부에 unscoped 스타일 회피

## 3. Breakpoint 사용

- **공유 layer breakpoint mixin** 사용 (`@include touch`, `@include mobile`, `@include until($size)` 등)
- **mobile-first 접근** 따름
- 레이아웃 컴포넌트에 **반응형 variant** 생성

```scss
// ✅ DO: 디바이스별 변수
$page-margin: 40px !default;
$touch-page-margin: 60px !default;
$mobile-page-margin: 20px !default;

$header-height: 70px !default;
$touch-header-height: 70px !default;
$mobile-header-height: 60px !default;
```

> breakpoint mixin (`touch` / `mobile` / `desktop` / `until($size)`) 이름은 공유 layer mixin SoT 따름. 실제 breakpoint 값은 프로젝트 overlay 룰 또는 공유 layer 변수 참조.

## 4. 컴포넌트 높이 / 디바이스별 변수 패턴

컴포넌트별로 디바이스별 높이 / 마진을 변수로 분리 — 컴포넌트 본문에서 mixin 으로 분기 적용:

```scss
// ✅ DO: 컴포넌트별 디바이스 변수 분리 (예시 — 실제 변수명은 프로젝트별)
$card-default-height: 670px !default;
$touch-card-default-height: 422px !default;
$mobile-card-default-height: 358px !default;

$card-table-default-height: 652px !default;
$touch-card-table-default-height: 752px !default;
$mobile-card-table-default-height: 610px !default;

// 컴포넌트에서 사용
.card {
  &--basic {
    height: $card-default-height;

    @include touch {
      height: $touch-card-default-height;
    }
    @include mobile {
      height: $mobile-card-default-height;
    }
  }

  &--table {
    min-height: $card-table-default-height;

    @include touch {
      min-height: $touch-card-table-default-height;
    }
    @include mobile {
      min-height: $mobile-card-table-default-height;
    }
  }
}
```

> 위 변수명은 generic 예시 — 프로젝트 도메인 컴포넌트별 실제 변수명 (`$<component>-*-height`) 패턴은 프로젝트 overlay 룰 참조.

## 5. Mobile-first 반응형 레이아웃 패턴

```scss
// ✅ DO: mobile-first 접근의 반응형 레이아웃 패턴
@mixin card-list {
  &__card-items {
    &--size-3 {
      $width: calc(33.3333% - #{$list-gap * math.div(2, 3)});
      flex: 1 1 $width;
      max-width: $width;

      @include touch {
        $width: calc(33.3333% - #{$touch-list-gap * math.div(2, 3)});
        flex: 1 1 $width;
        max-width: $width;
      }

      @include until($touch-container-width) {
        $width: calc(50% - #{$touch-list-gap * math.div(1, 2)});
        flex: 1 1 $width;
        max-width: $width;
      }

      @include mobile {
        flex: 1 1 100%;
        max-width: 100%;
      }
    }
  }
}
```

## 관련 (본 plugin 내부)

- [`naming-and-structure`](../naming-and-structure/SKILL.md) — 스타일 룰 선언 순서 (자기 반응형은 자식 선택자 앞에)
- [`component-patterns`](../component-patterns/SKILL.md) — 컴포넌트 variant / 외부 영향 분리
- [`typography`](../typography/SKILL.md) — 반응형 타이포 mixin
