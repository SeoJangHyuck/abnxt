import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = resolve(dirname(fileURLToPath(import.meta.url)), '../dist');
const read = (f) => readFileSync(resolve(dist, f), 'utf8');
const hasDirective = (s) => /['"]use client['"]/.test(s.slice(0, 80));

let ok = true;

// 클라 진입점: 상단에 'use client' 보존
for (const f of ['index.js', 'index.cjs', 'admin.js', 'admin.cjs']) {
  if (!hasDirective(read(f))) {
    console.error(`FAIL: ${f} is missing a top-level "use client" directive`);
    ok = false;
  }
}

// 서버 진입점: 'use client' 가 섞이면 안 됨(클라 코드 인라인 금지)
for (const f of ['server.js', 'server.cjs']) {
  if (/['"]use client['"]/.test(read(f))) {
    console.error(`FAIL: ${f} unexpectedly contains a "use client" directive`);
    ok = false;
  }
}

if (!ok) process.exit(1);
console.log('OK: client/server directive boundaries preserved');
