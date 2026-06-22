import { describe, it, expect } from 'vitest';
import { applyPlan, type ApplyIO } from './apply';
import type { Plan } from './types';

function memIO(
  initial: Record<string, string> = {},
): ApplyIO & { files: Record<string, string> } {
  const files = { ...initial };
  return {
    files,
    exists: (p) => p in files,
    read: (p) => files[p] ?? null,
    write: (p, c) => {
      files[p] = c;
    },
  };
}

const plan: Plan = {
  detection: {
    framework: 'next',
    router: 'app',
    typescript: true,
    srcDir: false,
    pkgManager: 'pnpm',
  },
  ops: [
    { kind: 'create', path: 'proxy.ts', content: 'PROXY' },
    { kind: 'manual', path: 'app/layout.tsx', manual: 'wrap with ABProvider' },
    {
      kind: 'inject',
      path: 'nuxt.config.ts',
      anchor: 'defineNuxtConfig({',
      snippet: 'SNIP',
      manual: 'add module',
    },
  ],
};

describe('applyPlan', () => {
  it('creates files, reports manual ops, and injects into existing files', () => {
    const io = memIO({
      'nuxt.config.ts': 'export default defineNuxtConfig({\n})',
    });
    const r = applyPlan(plan, io, {});
    expect(io.files['proxy.ts']).toBe('PROXY');
    expect(io.files['nuxt.config.ts']).toContain('SNIP');
    expect(r.created).toContain('proxy.ts');
    expect(r.injected).toContain('nuxt.config.ts');
    expect(r.manual.some((m) => m.path === 'app/layout.tsx')).toBe(true);
  });
  it('skips existing create files without force', () => {
    const io = memIO({
      'proxy.ts': 'OLD',
      'nuxt.config.ts': 'defineNuxtConfig({',
    });
    applyPlan(plan, io, {});
    expect(io.files['proxy.ts']).toBe('OLD');
  });
  it('overwrites create files with force', () => {
    const io = memIO({
      'proxy.ts': 'OLD',
      'nuxt.config.ts': 'defineNuxtConfig({',
    });
    applyPlan(plan, io, { force: true });
    expect(io.files['proxy.ts']).toBe('PROXY');
  });
  it('dryRun writes nothing and reports planned ops', () => {
    const io = memIO({ 'nuxt.config.ts': 'defineNuxtConfig({' });
    const r = applyPlan(plan, io, { dryRun: true });
    expect(io.files['proxy.ts']).toBeUndefined();
    expect(r.planned.length).toBeGreaterThan(0);
  });
  it('reports manual when inject anchor is missing', () => {
    const io = memIO({ 'nuxt.config.ts': 'no anchor' });
    const r = applyPlan(plan, io, {});
    expect(r.manual.some((m) => m.path === 'nuxt.config.ts')).toBe(true);
  });
  it('falls back to manual when skipIfPresent matches (existing modules array)', () => {
    const planWithSkip: Plan = {
      detection: plan.detection,
      ops: [
        {
          kind: 'inject',
          path: 'nuxt.config.ts',
          anchor: 'defineNuxtConfig({',
          snippet: 'SNIP',
          skipIfPresent: 'modules',
          manual: 'add module manually',
        },
      ],
    };
    const io = memIO({
      'nuxt.config.ts':
        'export default defineNuxtConfig({\n  modules: ["x"],\n})',
    });
    const r = applyPlan(planWithSkip, io, {});
    expect(io.files['nuxt.config.ts']).not.toContain('SNIP'); // 자동 주입 안 함(중복 키 방지)
    expect(r.manual.some((m) => m.path === 'nuxt.config.ts')).toBe(true);
  });

  it('is idempotent on re-run', () => {
    const io = memIO({
      'nuxt.config.ts': 'export default defineNuxtConfig({\n})',
    });
    applyPlan(plan, io, {});
    const before = { ...io.files };
    applyPlan(plan, io, {});
    expect(io.files).toEqual(before);
  });
});
