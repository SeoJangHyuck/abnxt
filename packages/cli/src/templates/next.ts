export function nextProxy(): string {
  return `import { createAbProxy } from '@abnxt/next/server'

export const proxy = createAbProxy()
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] }
`;
}

/** layout 수동 통합 안내(자동 JSX 편집 회피 — manual op). */
export function nextLayoutManual(): string {
  return `import { ABProvider } from '@abnxt/next/server'

// app/layout.tsx — wrap {children} with <ABProvider>:
//   export default async function RootLayout({ children }) {
//     return (<html><body><ABProvider>{children}</ABProvider></body></html>)
//   }
// configure the server config source once (e.g. in this module's top level):
//   import { configureServerAb } from '@abnxt/next/server'
//   import { fsConfig } from '@abnxt/core/server'
//   configureServerAb({ source: fsConfig({ path: 'public/ab-config.json' }) })`;
}

export function nextAdminPage(): string {
  // AbnxtAdmin은 그 자체로 client 컴포넌트('use client') — 별도 래퍼 불필요.
  return `import { AbnxtAdmin } from '@abnxt/next/admin'

export default function AbAdminPage() {
  return <AbnxtAdmin />
}
`;
}

export function nextConfigRoute(): string {
  return `import { createAbnxtConfigRoute, abnxtCookieAuth } from '@abnxt/next/server'
import { fsAdminStorage } from '@abnxt/core/server'

const PATH = 'public/ab-config.json'
// secret/cookieName은 auth 라우트(createAbnxtAuthRoute)와 일치해야 발급 세션이 검증된다.
const route = createAbnxtConfigRoute({
  storage: fsAdminStorage({ path: PATH }),
  auth: abnxtCookieAuth({
    secret: process.env.ABNXT_ADMIN_KEY ?? '',
    cookieName: 'abnxt_admin',
  }),
})

export const GET = route.GET
export const PUT = route.PUT
export const dynamic = 'force-dynamic'
`;
}

export function nextAuthRoute(): string {
  // 키→세션 교환. key 기본 env ABNXT_ADMIN_KEY, secret 기본 key 재사용(간편).
  return `import { createAbnxtAuthRoute } from '@abnxt/next/server'

export const { POST, DELETE } = createAbnxtAuthRoute({ cookieName: 'abnxt_admin' })
export const dynamic = 'force-dynamic'
`;
}

export function seedConfig(): string {
  return JSON.stringify(
    {
      version: 1,
      updatedAt: '1970-01-01T00:00:00Z',
      experiments: {
        'homepage-hero': {
          name: 'Homepage Hero',
          active: true,
          sticky: true,
          variants: [
            { key: 'A', weight: 50 },
            { key: 'B', weight: 50 },
          ],
        },
      },
    },
    null,
    2,
  );
}

export function abnxtConfigTs(sinks: string[]): string {
  return `// abnxt SDK options — pass to <ABProvider analytics={analytics}>
export const analytics = { sinks: ${JSON.stringify(sinks)} }
`;
}
