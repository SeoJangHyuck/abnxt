import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { detectProject } from './detect';
import { planScaffold } from './plan';
import { applyPlan } from './apply';
import type { InitOptions, PkgManager, Framework } from './types';

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
      write: (p, c) => {
        const abs = join(cwd, p);
        mkdirSync(dirname(abs), { recursive: true });
        writeFileSync(abs, c);
      },
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
