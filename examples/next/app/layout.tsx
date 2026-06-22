import { ABProvider, configureServerAb } from '@abnxt/next/server';
import { fsConfig } from '@abnxt/core/server';
import { join } from 'node:path';
import type { ReactNode } from 'react';

// 모듈 top-level에서 1회 등록(첫 import 시 실행). cwd 기준 절대경로로 견고하게.
configureServerAb({
  source: fsConfig({ path: join(process.cwd(), 'public/ab-config.json') }),
});

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ABProvider analytics={{ sinks: ['domEvent'] }}>{children}</ABProvider>
      </body>
    </html>
  );
}
