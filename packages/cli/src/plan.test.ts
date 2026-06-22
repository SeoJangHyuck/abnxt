import { describe, it, expect } from 'vitest';
import { planScaffold } from './plan';
import type { Detection } from './types';

const nextApp: Detection = {
  framework: 'next',
  router: 'app',
  typescript: true,
  srcDir: false,
  pkgManager: 'pnpm',
};
const nextSrc: Detection = { ...nextApp, srcDir: true };
const nextPages: Detection = { ...nextApp, router: 'pages' };
const nuxt: Detection = {
  framework: 'nuxt',
  router: 'none',
  typescript: true,
  srcDir: false,
  pkgManager: 'pnpm',
};

function paths(plan: ReturnType<typeof planScaffold>) {
  return plan.ops.map((o) => o.path);
}

describe('planScaffold next', () => {
  it('plans proxy, layout manual, admin page, seed, config', () => {
    const p = planScaffold(nextApp, {});
    expect(paths(p)).toEqual(
      expect.arrayContaining([
        'proxy.ts',
        'app/layout.tsx',
        'app/ab-admin/page.tsx',
        'public/ab-config.json',
        'abnxt.config.ts',
      ]),
    );
    expect(p.ops.find((o) => o.path === 'app/layout.tsx')?.kind).toBe('manual');
  });
  it('prefixes app/ paths with src/ when srcDir', () => {
    const p = planScaffold(nextSrc, {});
    expect(paths(p)).toEqual(
      expect.arrayContaining([
        'src/app/layout.tsx',
        'src/app/ab-admin/page.tsx',
      ]),
    );
    expect(paths(p)).toContain('public/ab-config.json');
    expect(paths(p)).toContain('proxy.ts');
  });
  it('adds config + auth routes only when apiRoute option set', () => {
    const without = paths(planScaffold(nextApp, {}));
    expect(without).not.toContain('app/api/abnxt/config/route.ts');
    expect(without).not.toContain('app/api/abnxt/auth/route.ts');
    const withRoute = paths(planScaffold(nextApp, { apiRoute: true }));
    expect(withRoute).toContain('app/api/abnxt/config/route.ts');
    expect(withRoute).toContain('app/api/abnxt/auth/route.ts');
  });
  it('throws for the unsupported Pages Router', () => {
    expect(() => planScaffold(nextPages, {})).toThrow(/Pages Router/i);
  });
});

describe('planScaffold nuxt', () => {
  it('plans nuxt.config inject, admin page, seed', () => {
    const p = planScaffold(nuxt, {});
    expect(paths(p)).toEqual(
      expect.arrayContaining([
        'nuxt.config.ts',
        'pages/ab-admin.vue',
        'public/ab-config.json',
      ]),
    );
    expect(p.ops.find((o) => o.path === 'nuxt.config.ts')?.kind).toBe('inject');
  });
  it('does not scaffold server routes — the module auto-registers them', () => {
    // Nuxt 모듈이 config/auth 라우트를 자동 등록하므로 CLI는 라우트를 만들지 않는다.
    expect(paths(planScaffold(nuxt, { apiRoute: true }))).not.toContain(
      'server/api/abnxt/config.ts',
    );
  });
});
