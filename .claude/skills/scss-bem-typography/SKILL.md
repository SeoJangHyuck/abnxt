---
name: scss-bem-typography
paths:
  - '**/*.scss'
  - '**/*.vue'
description: |
  SCSS 타이포그래피 시스템 — size 기반 mixin map / semantic size 이름 (xs/sm/md/lg/xl) / font-size + line-height 통합 / heading 과 body 분리.
  Use when user invokes /scss-bem-typography, asks "타이포", "font-size mixin", "heading 스타일", "텍스트 크기", "사이즈 추가", "semantic size 이름", "font-size + line-height 통합", or before invoking Read/Write/Edit on `_typography.scss`, `_fonts.scss`, or font/heading mixin definitions.
---

# SCSS Typography Skill

SCSS 타이포그래피 시스템 SoT — size 기반 mixin map 패턴.

## 호출 시점

- 타이포 시스템 신규 정의
- `@mixin heading()` / body 타이포 mixin 작성
- 사이즈 enum (xs / sm / md / lg / xl / 2xl / 3xl) 추가 / 변경

## 핵심 원칙

- 일관성을 위해 **size 기반 mixin map** 생성
- **semantic size 이름** 사용 (xs, sm, md, lg, xl)
- font-size 와 line-height **모두 포함**
- heading 과 body 타이포 **분리**

## 패턴

```scss
// ✅ DO: size 기반 mixin map 으로 구조화된 타이포그래피 시스템
$typography-heading-map: (
  '3xl': (
    'font-size': 64px,
    'line-height': 72px,
  ),
  '2xl': (
    'font-size': 52px,
    'line-height': 58px,
  ),
  'xl': (
    'font-size': 40px,
    'line-height': 48px,
  ), // ... 기타 사이즈
);

@mixin heading($size: 'md') {
  font-weight: 700;

  @if map.has-key($typography-heading-map, $size) {
    $size: map.get($typography-heading-map, $size);

    @each $property, $value in $size {
      #{$property}: $value;
    }
  } @else {
    @warn 'Unknown heading size `#{$size}`.';
  }
}
```

## 적용 예시

```scss
.page-title {
  @include heading('xl');
}

.section-title {
  @include heading('lg');
}
```

## 관련 (본 plugin 내부)

- [`naming-and-structure`](../naming-and-structure/SKILL.md) — SCSS 파일 구조 / mixin 명명 컨벤션
- [`responsive`](../responsive/SKILL.md) — 반응형 mixin / breakpoint
