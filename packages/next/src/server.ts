export { createAbProxy } from './server/proxy';
export {
  configureServerAb,
  getServerAbState,
  getVariant,
} from './server/state';
export { ABProvider } from './server/provider';
export {
  createAbnxtConfigRoute,
  type ConfigRouteOptions,
} from './server/config-route';
export {
  createAbnxtAuthRoute,
  type AuthRouteOptions,
} from './server/auth-route';
export {
  abnxtBasicAuth,
  abnxtCookieAuth,
  abnxtCustomAuth,
  type AbAuth,
  type AuthResult,
} from './server/auth';
export type { ABProviderProps, ServerAbConfig } from './types';
