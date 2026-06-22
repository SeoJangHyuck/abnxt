export function nuxtAdminPage(): string {
  // @abnxt/nuxt 모듈이 AbnxtAdmin 컴포넌트를 자동 등록한다(import 불필요).
  // 모듈 admin 옵션(기본 enabled)은 /abnxt-admin 페이지도 자동 주입하므로 이 수동 페이지는 선택이다.
  return `<template>
  <AbnxtAdmin />
</template>
`;
}

export function nuxtConfigModuleSnippet(): string {
  // 모듈 등록 + 어드민/서버라우트 자동 주입. adminKey는 서버 전용(env ABNXT_ADMIN_KEY).
  return `modules: ['@abnxt/nuxt'],
  abnxt: {
    admin: { enabled: true },
    adminKey: process.env.ABNXT_ADMIN_KEY,
  },`;
}
