/**
 * `@abnxt/nuxt/server` — Nitro 서버 라우트 팩토리.
 * 모듈이 어드민을 자동 등록하지 않거나(서버리스/커스텀 storage) 직접 라우트를 정의할 때 사용.
 */
export {
  defineAbnxtConfigHandler,
  handleConfigRequest,
  type VueConfigRouteOptions,
  type ConfigRequestIO,
  type ConfigResponse,
} from './config-route';
export {
  defineAbnxtAuthHandler,
  handleAuthRequest,
  type VueAuthRouteOptions,
  type AuthRequestIO,
  type AuthResponse,
  type AuthCookieIO,
} from './auth-route';
