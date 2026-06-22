import type { Detection, Framework, PkgManager, Router } from './types';

export interface DetectIO {
  exists(path: string): boolean;
  read(path: string): string | null;
}

export function detectProject(io: DetectIO): Detection {
  const pkgRaw = io.read('package.json');
  let deps: Record<string, string> = {};
  if (pkgRaw) {
    try {
      const pkg = JSON.parse(pkgRaw) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
      deps = { ...pkg.dependencies, ...pkg.devDependencies };
    } catch {
      /* ignore malformed package.json */
    }
  }
  const framework: Framework | null = deps.next
    ? 'next'
    : deps.nuxt
      ? 'nuxt'
      : null;
  if (!framework)
    throw new Error(
      'abnxt: no supported framework found (expected next or nuxt in package.json)',
    );

  const has = (p: string) => io.exists(p) || io.exists(`src/${p}`);
  const srcDir =
    io.exists('src/app') ||
    io.exists('src/pages') ||
    io.exists('src/app/layout.tsx') ||
    io.exists('src/app/layout.jsx') ||
    io.exists('src/pages/_app.tsx') ||
    io.exists('src/pages/_app.jsx');

  let router: Router = 'none';
  if (framework === 'next') {
    if (has('app') || has('app/layout.tsx') || has('app/layout.jsx'))
      router = 'app';
    else if (has('pages') || has('pages/_app.tsx') || has('pages/_app.jsx'))
      router = 'pages';
    else router = 'app'; // 기본 App Router
  }

  const typescript =
    io.exists('tsconfig.json') ||
    io.exists('app/layout.tsx') ||
    io.exists('src/app/layout.tsx') ||
    io.exists('nuxt.config.ts');

  const pkgManager: PkgManager = io.exists('pnpm-lock.yaml')
    ? 'pnpm'
    : io.exists('yarn.lock')
      ? 'yarn'
      : io.exists('bun.lockb')
        ? 'bun'
        : 'npm';

  return { framework, router, typescript, srcDir, pkgManager };
}
