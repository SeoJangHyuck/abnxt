#!/usr/bin/env node
import { run } from './run';
import type { InitOptions } from './types';

const argv = process.argv.slice(2);
const cmd = argv[0];

if (cmd !== 'init') {
  console.log(
    'Usage: abnxt init [--api-route] [--dry-run] [--force] [--sinks=domEvent,ga4]',
  );
  process.exit(cmd ? 1 : 0);
}

const opts: InitOptions = {
  apiRoute: argv.includes('--api-route'),
  dryRun: argv.includes('--dry-run'),
  force: argv.includes('--force'),
};
const sinksArg = argv.find((a) => a.startsWith('--sinks='));
if (sinksArg)
  opts.sinks = sinksArg.slice('--sinks='.length).split(',').filter(Boolean);

try {
  console.log(run(process.cwd(), opts));
} catch (e) {
  // detect/plan 에러 메시지는 이미 'abnxt:' 접두를 포함한다(이중 접두 방지).
  console.error((e as Error).message);
  process.exit(1);
}
