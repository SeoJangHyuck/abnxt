import { describe, it, expect } from 'vitest';
import { detectProject, type DetectIO } from './detect';

function io(files: Record<string, string>): DetectIO {
  return { exists: (p) => p in files, read: (p) => files[p] ?? null };
}

const nextPkg = JSON.stringify({
  dependencies: { next: '^16.0.0', react: '^19' },
});
const nuxtPkg = JSON.stringify({ devDependencies: { nuxt: '^4.0.0' } });

describe('detectProject', () => {
  it('detects Next App Router + TS + pnpm', () => {
    const d = detectProject(
      io({
        'package.json': nextPkg,
        'app/layout.tsx': '',
        'tsconfig.json': '',
        'pnpm-lock.yaml': '',
      }),
    );
    expect(d).toMatchObject({
      framework: 'next',
      router: 'app',
      typescript: true,
      srcDir: false,
      pkgManager: 'pnpm',
    });
  });
  it('detects Next Pages Router under src/', () => {
    const d = detectProject(
      io({
        'package.json': nextPkg,
        'src/pages/_app.tsx': '',
        'tsconfig.json': '',
        'package-lock.json': '',
      }),
    );
    expect(d).toMatchObject({
      framework: 'next',
      router: 'pages',
      srcDir: true,
      pkgManager: 'npm',
    });
  });
  it('detects Nuxt + yarn', () => {
    const d = detectProject(
      io({ 'package.json': nuxtPkg, 'nuxt.config.ts': '', 'yarn.lock': '' }),
    );
    expect(d).toMatchObject({
      framework: 'nuxt',
      router: 'none',
      typescript: true,
      pkgManager: 'yarn',
    });
  });
  it('detects JS (no tsconfig) + bun', () => {
    const d = detectProject(
      io({ 'package.json': nextPkg, 'app/layout.jsx': '', 'bun.lockb': '' }),
    );
    expect(d).toMatchObject({ typescript: false, pkgManager: 'bun' });
  });
  it('throws when no supported framework found', () => {
    expect(() => detectProject(io({ 'package.json': '{}' }))).toThrow(
      /next.*nuxt/i,
    );
  });
});
