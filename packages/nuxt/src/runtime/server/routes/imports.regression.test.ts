import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));

/**
 * 회귀 가드: 모듈이 자동 등록하는 서버 라우트는 useRuntimeConfig를 '#imports'에서
 * 명시 import 해야 한다. 과거 전역 auto-import에 의존했더니(주석만 두고 import 누락)
 * 외부 node_modules로 설치됐을 때 Nitro가 auto-import를 적용하지 않아 런타임에서
 * "useRuntimeConfig is not defined"로 어드민 config/auth 라우트가 500을 냈다.
 * (in-workspace/예제 빌드에서는 unimport가 가려서 타입체크·로컬 테스트가 통과했다.)
 */
describe('server route auto-import 회귀 가드', () => {
  for (const file of ['config.ts', 'auth.ts']) {
    it(`${file}: useRuntimeConfig를 '#imports'에서 명시 import 한다`, () => {
      const src = readFileSync(join(here, file), 'utf8');
      // useRuntimeConfig를 사용한다면
      if (src.includes('useRuntimeConfig')) {
        // 반드시 '#imports'에서 명시 import 되어 있어야 한다(전역 의존 금지).
        expect(src).toMatch(
          /import\s*\{[^}]*\buseRuntimeConfig\b[^}]*\}\s*from\s*['"]#imports['"]/,
        );
      }
    });
  }
});
