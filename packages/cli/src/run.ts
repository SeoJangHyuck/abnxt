import {
  readFileSync,
  existsSync,
  writeFileSync,
  mkdirSync,
  renameSync,
  openSync,
  fsyncSync,
  closeSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { detectProject } from './detect';
import { planScaffold } from './plan';
import { applyPlan } from './apply';
import type { InitOptions, PkgManager, Framework } from './types';

/**
 * 원자적 파일 쓰기: 같은 디렉토리 temp에 쓰고 fsync 후 rename으로 교체.
 * 쓰기 중단(디스크풀/크래시) 시 잘린 파일이 원본을 덮어쓰지 않는다(부분 쓰기 방지).
 */
export function atomicWrite(abs: string, content: string): void {
  mkdirSync(dirname(abs), { recursive: true });
  const tmp = `${abs}.abnxt-${process.pid}.tmp`;
  const fd = openSync(tmp, 'w');
  try {
    writeFileSync(fd, content);
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  renameSync(tmp, abs);
}

export function run(cwd: string, opts: InitOptions): string {
  const fsRead = {
    exists: (p: string) => existsSync(join(cwd, p)),
    read: (p: string) =>
      existsSync(join(cwd, p)) ? readFileSync(join(cwd, p), 'utf8') : null,
  };
  const detection = detectProject(fsRead);
  const plan = planScaffold(detection, opts);
  const result = applyPlan(
    plan,
    {
      exists: fsRead.exists,
      read: fsRead.read,
      write: (p, c) => atomicWrite(join(cwd, p), c),
    },
    opts,
  );

  const lines: string[] = [
    `abnxt: detected ${detection.framework} (${detection.router}, ${detection.typescript ? 'ts' : 'js'}, ${detection.pkgManager})`,
  ];
  if (opts.dryRun) lines.push('-- dry run (no files written) --');
  for (const p of result.created)
    lines.push(`  ${opts.dryRun ? 'would create' : 'created'}: ${p}`);
  for (const p of result.injected)
    lines.push(`  ${opts.dryRun ? 'would inject' : 'injected'}: ${p}`);
  for (const p of result.skipped) lines.push(`  skipped (exists): ${p}`);
  for (const m of result.manual) {
    lines.push(`  ⚠ manual step for ${m.path}:`);
    lines.push(`    ${(m.manual ?? '').replace(/\n/g, '\n    ')}`);
  }
  lines.push(
    '',
    `Next: install deps — ${installHint(detection.pkgManager, detection.framework)}`,
  );
  return lines.join('\n');
}

function installHint(pm: PkgManager, fw: Framework): string {
  const pkg =
    fw === 'next' ? '@abnxt/next @abnxt/core' : '@abnxt/nuxt @abnxt/core';
  const add =
    pm === 'npm'
      ? 'npm install'
      : pm === 'yarn'
        ? 'yarn add'
        : pm === 'bun'
          ? 'bun add'
          : 'pnpm add';
  return `${add} ${pkg}`;
}
