---
name: scss-bem-component-patterns
paths:
  - '**/*.scss'
  - '**/*.vue'
description: |
  SCSS 컴포넌트 아키텍처 + 통합 — 레이아웃 mixin / variant modifier / 외부 영향 속성 분리 / SASS 보간법 specificity / CSS Module export / 성능 최적화 (@forward) / 서드파티 namespace 격리.
  Use when user invokes /scss-bem-component-patterns, asks "컴포넌트 스타일", "variant 추가", "BEM modifier", "&--variant", "CSS Module", "@forward", "서드파티 스타일 격리", "레이아웃 mixin", "specificity 충돌", or before invoking Read/Write/Edit on component-level `*.scss` / `*.vue` <style> blocks.
---

# SCSS Component Patterns Skill

SCSS 컴포넌트 아키텍처 SoT — variant / 외부 영향 분리 / 보간법 specificity / CSS Module / 서드파티 통합.

## 호출 시점

- 컴포넌트 SCSS 신규 작성
- 부모-자식 스타일 결합 (보간법 vs 자식 직접 선언)
- variant modifier 추가
- CSS Module export 결정
- 서드파티 라이브러리 (rich text editor / chart / map 등) 통합

## 1. 레이아웃 컴포넌트

- **일관된 spacing 변수** 사용
- **재사용 가능한 레이아웃 mixin** 생성
- **컴포넌트별 파일 구성** 따름

```scss
// ✅ DO: 일관된 spacing 의 레이아웃 mixin 패턴
@mixin card-list {
  &__card-list {
    display: flex;
    flex-wrap: wrap;
    gap: $list-gap;
    position: relative;

    @include touch {
      gap: $touch-list-gap;
    }

    @include mobile {
      gap: $mobile-list-gap;
    }
  }
}
```

## 2. 컴포넌트 Variant

```scss
// ✅ DO: modifier 패턴으로 컴포넌트 variant (예시 — 실제 변수명은 프로젝트별)
.card {
  &--basic {
    height: $card-basic-default-height;

    @include touch {
      height: $touch-card-basic-default-height;
    }

    @include mobile {
      height: $mobile-card-basic-default-height;
    }
  }

  &--table {
    height: $card-table-default-height;
  }
}
```

## 3. 컴포넌트 외부 영향 속성 분리

**컴포넌트 내부 스타일에는 외부 컨텍스트 (부모 레이아웃) 에 종속되는 배치 속성을 선언하지 않는다.** 컴포넌트는 독립된 구조로, 어디에 어떻게 배치되는지는 그것을 사용하는 상위 컴포넌트나 페이지의 책임이다. 자식 내부에서 외부 종속 속성을 선언하면 재사용 시점마다 외부에서 오버라이드해야 한다.

자식 컴포넌트 내부에서 지양할 속성:

- 배치 좌표: `top` / `right` / `bottom` / `left`, `inset-*`
- 외부 여백: `margin`
- 배치용 변형: `transform: translate(...)`

이런 속성은 **상위 컴포넌트 / 페이지에서 자식 컴포넌트의 클래스를 통해 지정**한다.

```scss
// ❌ DON'T: 자식 컴포넌트 내부에서 외부 종속 배치 속성 선언
// Menu.vue
.menu {
  display: flex;
  position: relative;
  top: 100px; // ← 어디에 배치될지는 외부의 책임
  margin: 50px; // ← 외부 여백도 외부 책임
}

// ✅ DO: 자식 컴포넌트는 자기 내부 속성만 선언
// Menu.vue
.menu {
  display: flex;
  position: relative;
}

// Header.vue (상위) - 보간법으로 자식 클래스 위치 지정
.header {
  position: fixed;
  top: 0;

  #{&}__menu {
    top: 100px;
    margin: 10px;
  }
}
```

## 4. 자식 컴포넌트 오버라이딩 시 보간법 (Interpolation) 사용

상위 컴포넌트가 자식 컴포넌트의 스타일을 오버라이드할 때는 **`#{&}__child` 형태의 SASS 보간법**을 사용한다. 이 패턴은 부모 클래스를 셀렉터에 합성해 specificity 를 한 단계 높이므로, 빌드 결과물의 선언 순서 (컴포넌트 로드 순서) 에 관계없이 상위 선언이 우선 적용되는 것을 보장한다.

```scss
// ✅ DO: 보간법으로 specificity 보장
// Header.vue
.header {
  position: fixed;
  top: 0;

  #{&}__menu {
    // 컴파일: .header .header__menu (specificity: 0,2,0)
    top: 100px;
    margin: 10px;
    padding: 30px;
  }

  &--fixed #{&}__menu {
    // 컴파일: .header--fixed .header__menu
    position: fixed;
    margin: 20px;
  }
}

// ❌ DON'T: 보간법 없이 자식 클래스 단독 선언
// Header.vue
.header {
  position: fixed;
}
.header__menu {
  // specificity: 0,1,0 — 자식 컴포넌트 자체 선언과 같은 specificity 여서
  // 빌드 순서/컴포넌트 로드 순서에 따라 결과가 달라질 수 있음
  top: 100px;
}
```

### 적용 결과는 동일

자식 내부에서 선언하든, 외부에서 보간법으로 오버라이드하든 최종 렌더링 결과는 같다. 그러나 **외부에서 지정하는 방식이 컴포넌트 결합도를 낮추고 재사용성을 높인다.**

```scss
// 결과는 동일하지만 권장도가 다름

// 방식 A (지양): 자식이 외부 종속 속성까지 책임 — 다른 위치에서 재사용 시 오버라이드 필요
.menu {
  display: flex;
  position: relative;
  top: 100px;
  margin: 50px;
}

// 방식 B (권장): 자식은 자기 속성만, 배치는 부모가 보간법으로 지정
// Menu.vue
.menu {
  display: flex;
  position: relative;
}
// Header.vue
.header {
  #{&}__menu {
    top: 100px;
    margin: 50px;
  }
}
```

## 5. CSS Modules 통합

### Module 변수 Export

```scss
// ✅ DO: 타입 안전한 CSS module export
@use '../utils' as *;

// stylelint-disable property-no-unknown
:export {
  tablet: $tablet;
  desktop: $desktop;
  laptop: $laptop;
  fixedZIndex: $fixed-z-index;
  navy20: $navy-20;
  positive: $positive;
  negative: $negative;
}
// stylelint-enable property-no-unknown
```

## 6. 성능과 최적화

### Import 전략

- 중복 import 를 피해 **컴파일 오버헤드 최소화**
- 공유 layer 스타일 **재export 에는 `@forward`** 사용
- **글로벌 스타일과 컴포넌트 스타일 분리**

```scss
// ✅ DO: 효율적인 import 구조
// _utils.scss - 컴포넌트 import 시마다 컴파일됨
@use '@/assets/styles/override-variables' as var;
// 공유 layer scope (placeholder — 실제 패키지명은 프로젝트 overlay 참조)
@forward '@your-shared-layer/assets/styles/variables' with (
  $desktop: var.$desktop
);

// common.scss - 한 번만 컴파일됨 (글로벌 스타일)
@use './utils' as *;
@use './global/all' as *;
```

### 에셋 관리

```scss
// ✅ DO: 효율적인 에셋 참조
.flag {
  display: inline-block;
  width: 32px;
  height: 32px;
  background: url('@@/public/static/flags/flags.png') no-repeat;
}

// 커스텀 flag 오버라이드
.flag.flag-global {
  background: url('@@/public/static/flags/flag-global.png') no-repeat;
}
```

## 7. 서드파티 라이브러리 통합

- **서드파티 스타일을 별도 파일에 격리**
- 복잡한 통합에는 **mixin 사용**
- **서드파티 수정은 namespace 적용**

```scss
// ✅ DO: 적절한 namespace 로 격리된 서드파티 스타일 (예: rich text editor)
@mixin third-party-editor {
  /* stylelint-disable */
  .editor-element,
  .editor-element:focus {
    outline: 0 solid transparent;
  }

  .editor-box.basic {
    border-radius: 10px;
    background-clip: padding-box;
  }
  /* stylelint-enable */
}
```

## 관련 (본 plugin 내부)

- [`naming-and-structure`](../naming-and-structure/SKILL.md) — BEM 클래스 명명 / mixin 명명 / 스타일 룰 선언 순서
- [`responsive`](../responsive/SKILL.md) — breakpoint mixin / mobile-first / 디바이스별 변수
- [`color-system`](../color-system/SKILL.md) — 색상 변수 / 도메인 색상 enum
- [`typography`](../typography/SKILL.md) — 타이포 mixin map
