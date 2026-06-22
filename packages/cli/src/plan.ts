import type { Detection, FileOp, InitOptions, Plan } from './types';
import * as next from './templates/next';
import * as nuxt from './templates/nuxt';

export function planScaffold(d: Detection, opts: InitOptions): Plan {
  const sinks = opts.sinks ?? ['domEvent'];
  const ops: FileOp[] = [];
  const appPrefix = d.srcDir ? 'src/' : '';

  if (d.framework === 'next') {
    if (d.router === 'pages') {
      // react 어댑터는 App Router 전용(설계 §16.3에서 Pages 보조는 후속).
      throw new Error(
        'abnxt: Next Pages Router is not yet supported — the App Router is required',
      );
    }
    ops.push({ kind: 'create', path: 'proxy.ts', content: next.nextProxy() });
    // layout은 자동 JSX 편집 위험이 커 manual 안내(설계 §9.4).
    ops.push({
      kind: 'manual',
      path: `${appPrefix}app/layout.${d.typescript ? 'tsx' : 'jsx'}`,
      manual: next.nextLayoutManual(),
    });
    ops.push({
      kind: 'create',
      path: `${appPrefix}app/ab-admin/page.${d.typescript ? 'tsx' : 'jsx'}`,
      content: next.nextAdminPage(),
    });
    ops.push({
      kind: 'create',
      path: 'abnxt.config.ts',
      content: next.abnxtConfigTs(sinks),
    });
    if (opts.apiRoute) {
      // config 라우트(쿠키 인증) + 키→세션 교환 auth 라우트는 짝을 이룬다.
      ops.push({
        kind: 'create',
        path: `${appPrefix}app/api/abnxt/config/route.${d.typescript ? 'ts' : 'js'}`,
        content: next.nextConfigRoute(),
      });
      ops.push({
        kind: 'create',
        path: `${appPrefix}app/api/abnxt/auth/route.${d.typescript ? 'ts' : 'js'}`,
        content: next.nextAuthRoute(),
      });
    }
  } else {
    ops.push({
      kind: 'inject',
      path: 'nuxt.config.ts',
      anchor: 'defineNuxtConfig({',
      snippet: `  ${nuxt.nuxtConfigModuleSnippet()}`,
      // 기존 modules 배열이 있으면 중복 키를 만들지 않도록 수동 안내로 폴백.
      skipIfPresent: 'modules',
      manual: `Add '@abnxt/nuxt' to your nuxt.config.ts modules array, then set abnxt.admin.enabled = true and abnxt.adminKey = process.env.ABNXT_ADMIN_KEY`,
    });
    // 모듈이 어드민 페이지(/abnxt-admin)와 config/auth 서버 라우트를 자동 주입하므로
    // 별도 페이지는 선택사항. 호환을 위해 <AbnxtAdmin/> 페이지를 남겨둔다(컴포넌트 자동 등록).
    ops.push({
      kind: 'create',
      path: 'pages/ab-admin.vue',
      content: nuxt.nuxtAdminPage(),
    });
  }

  // 공통: config 시드(루트 public/).
  ops.push({
    kind: 'create',
    path: 'public/ab-config.json',
    content: next.seedConfig(),
  });

  return { detection: d, ops };
}
