import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  mkdtempSync,
  rmSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  readFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { run } from '../src/run';

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'abnxt-cli-'));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function writeNextFixture() {
  writeFileSync(
    join(dir, 'package.json'),
    JSON.stringify({ dependencies: { next: '^16', react: '^19' } }),
  );
  writeFileSync(join(dir, 'tsconfig.json'), '{}');
  writeFileSync(join(dir, 'pnpm-lock.yaml'), '');
  mkdirSync(join(dir, 'app'), { recursive: true });
  writeFileSync(
    join(dir, 'app/layout.tsx'),
    'export default function L({children}){return (<html><body>{children}</body></html>)}',
  );
}

describe('abnxt init (next fixture)', () => {
  it('creates expected files and is idempotent', () => {
    writeNextFixture();
    const out = run(dir, {});
    expect(existsSync(join(dir, 'proxy.ts'))).toBe(true);
    expect(existsSync(join(dir, 'app/ab-admin/page.tsx'))).toBe(true);
    expect(
      JSON.parse(readFileSync(join(dir, 'public/ab-config.json'), 'utf8'))
        .experiments['homepage-hero'],
    ).toBeDefined();
    // layout은 manual 안내(자동 편집 안 함).
    expect(out).toContain('manual step for app/layout.tsx');
    expect(readFileSync(join(dir, 'app/layout.tsx'), 'utf8')).not.toContain(
      'abnxt:start',
    );

    // 재실행 멱등(생성 파일 skip).
    const proxyAfter = readFileSync(join(dir, 'proxy.ts'), 'utf8');
    const out2 = run(dir, {});
    expect(readFileSync(join(dir, 'proxy.ts'), 'utf8')).toBe(proxyAfter);
    expect(out2).toContain('skipped (exists): proxy.ts');
  });

  it('dry-run writes nothing', () => {
    writeNextFixture();
    run(dir, { dryRun: true });
    expect(existsSync(join(dir, 'proxy.ts'))).toBe(false);
  });

  it('rejects the Pages Router with a clear message', () => {
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({ dependencies: { next: '^16' } }),
    );
    writeFileSync(join(dir, 'tsconfig.json'), '{}');
    mkdirSync(join(dir, 'pages'), { recursive: true });
    writeFileSync(join(dir, 'pages/_app.tsx'), '');
    expect(() => run(dir, {})).toThrow(/Pages Router/i);
  });
});

describe('abnxt init (nuxt fixture)', () => {
  it('injects module into nuxt.config and creates admin page, idempotently', () => {
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({ devDependencies: { nuxt: '^4' } }),
    );
    writeFileSync(
      join(dir, 'nuxt.config.ts'),
      'export default defineNuxtConfig({\n})',
    );
    writeFileSync(join(dir, 'pnpm-lock.yaml'), '');
    run(dir, {});
    const cfgAfter = readFileSync(join(dir, 'nuxt.config.ts'), 'utf8');
    expect(cfgAfter).toContain('@abnxt/nuxt');
    expect(cfgAfter).toContain('abnxt:start');
    expect(existsSync(join(dir, 'pages/ab-admin.vue'))).toBe(true);
    // 재실행 멱등(마커 존재 → skip).
    run(dir, {});
    expect(readFileSync(join(dir, 'nuxt.config.ts'), 'utf8')).toBe(cfgAfter);
  });
});
