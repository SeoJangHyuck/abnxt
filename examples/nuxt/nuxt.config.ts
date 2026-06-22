export default defineNuxtConfig({
  modules: ['@abnxt/nuxt'],
  abnxt: {
    config: {
      version: 1,
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
    analytics: { sinks: ['domEvent'] },
    // 네이티브 Vue 어드민 자동 주입: /abnxt-admin 페이지 + AbnxtAdmin 컴포넌트
    // + config/auth Nitro 서버 라우트(/api/abnxt/{config,auth}). serverRoutes 기본 true.
    admin: { enabled: true },
    // 서버 전용 어드민 인증키(env ABNXT_ADMIN_KEY). public에 노출되지 않는다.
    adminKey: process.env.ABNXT_ADMIN_KEY,
  },
});
