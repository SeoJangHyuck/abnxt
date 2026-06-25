# @abnxt/cli

> [abnxt](https://github.com/SeoJangHyuck/abnxt) 설치 스캐폴딩 CLI — `abnxt init`.

기존 Next.js 16 / Nuxt 4 프로젝트에 abnxt A/B 테스트 툴을 멱등하게 주입합니다.

## 사용

설치 없이 바로 실행할 수 있습니다:

```bash
npx abnxt init                       # 프레임워크 감지 → 스캐폴딩
npx abnxt init --dry-run             # 미리보기(파일 미생성)
npx abnxt init --api-route           # 라이브 저장용 config 라우트도 생성
npx abnxt init --sinks=domEvent,ga4  # 분석 sink 지정(기본 domEvent)
```

## 동작

- `package.json`·락파일로 **프레임워크·라우터·TS·패키지매니저를 감지**합니다.
- 마커 주석(`// abnxt:start … // abnxt:end`)으로 **멱등** 주입합니다. 재실행 시 이미 주입된 블록은 skip합니다.
- 자동 편집이 위험한 부분(예: `app/layout.tsx`)은 수동 스니펫을 안내합니다.

## 문서

전체 개요는 [루트 README](https://github.com/SeoJangHyuck/abnxt#readme)를 참고하세요.

## 라이선스

MIT
