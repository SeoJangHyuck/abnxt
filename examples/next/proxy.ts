import { createAbProxy } from '@abnxt/next/server';

export const proxy = createAbProxy();
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
