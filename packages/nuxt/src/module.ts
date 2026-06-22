import {
  defineNuxtModule,
  addPlugin,
  addServerHandler,
  addImports,
  addComponentsDir,
  extendPages,
  createResolver,
} from '@nuxt/kit';
import type { AnalyticsFlags } from '@abnxt/core';

export interface AbnxtAdminOptions {
  /** 어드민 페이지/서버라우트 자동 주입 여부. 기본 true. */
  enabled?: boolean;
  /** 어드민 페이지 경로. 기본 '/abnxt-admin'. */
  route?: string;
  /** config 라우트 경로(GET/PUT). 기본 '/api/abnxt/config'. */
  configEndpoint?: string;
  /** auth 라우트 경로(POST/DELETE). 기본 '/api/abnxt/auth'. */
  authEndpoint?: string;
  /** 어드민 헤더 타이틀. 기본 'abnxt admin'. */
  title?: string;
  /** config/auth 서버 라우트 자동 등록 여부. 기본 true. */
  serverRoutes?: boolean;
  /** 자동 등록 config 라우트가 읽고 쓰는 파일 경로. 기본 '.data/abnxt-config.json'. */
  configPath?: string;
}

export interface AbnxtModuleOptions {
  /** 인라인 config(원문). 서버 buildAbState가 loadConfig로 정규화. */
  config?: unknown;
  /** 클라 분석 플래그(직렬화). 기본 sinks: ['domEvent']. */
  analytics?: AnalyticsFlags;
  /** 어드민(네이티브 Vue UI + 키 인증). */
  admin?: AbnxtAdminOptions;
  /** 사전 세팅 어드민 인증키. 기본 env ABNXT_ADMIN_KEY(서버 전용, public 비노출). */
  adminKey?: string;
  /** 세션 서명 secret. 기본 adminKey 재사용(서버 전용). */
  adminSecret?: string;
}

const DEFAULT_CONFIG_ENDPOINT = '/api/abnxt/config';
const DEFAULT_AUTH_ENDPOINT = '/api/abnxt/auth';
const DEFAULT_ADMIN_ROUTE = '/abnxt-admin';
const DEFAULT_ADMIN_TITLE = 'abnxt admin';
const DEFAULT_CONFIG_PATH = '.data/abnxt-config.json';
const ADMIN_COOKIE = 'abnxt_admin';

export default defineNuxtModule<AbnxtModuleOptions>({
  meta: { name: '@abnxt/nuxt', configKey: 'abnxt' },
  defaults: {},
  setup(options, nuxt) {
    const { resolve } = createResolver(import.meta.url);

    const admin = options.admin ?? {};
    const adminEnabled = admin.enabled ?? true;
    const configEndpoint = admin.configEndpoint ?? DEFAULT_CONFIG_ENDPOINT;
    const authEndpoint = admin.authEndpoint ?? DEFAULT_AUTH_ENDPOINT;
    const adminRoute = admin.route ?? DEFAULT_ADMIN_ROUTE;
    const adminTitle = admin.title ?? DEFAULT_ADMIN_TITLE;
    const serverRoutes = admin.serverRoutes ?? true;
    const configPath = admin.configPath ?? DEFAULT_CONFIG_PATH;

    // 서버 전용 config + 어드민 키/secret(절대 public에 노출 금지).
    nuxt.options.runtimeConfig.abnxt = {
      config: options.config ?? { version: 1, experiments: {} },
      adminKey: options.adminKey ?? process.env.ABNXT_ADMIN_KEY ?? '',
      adminSecret: options.adminSecret ?? '',
      configPath,
      cookieName: ADMIN_COOKIE,
    };
    // 클라 분석 플래그 + 어드민 페이지가 읽을 엔드포인트/타이틀(비밀 아님).
    nuxt.options.runtimeConfig.public.abnxt = {
      analytics: options.analytics ?? {},
      admin: { configEndpoint, authEndpoint, title: adminTitle },
    };

    addServerHandler({
      handler: resolve('./runtime/server/middleware/abnxt'),
      middleware: true,
    });
    addPlugin(resolve('./runtime/plugin'));
    addImports({
      name: 'useExperiment',
      from: resolve('./runtime/composables/useExperiment'),
    });
    // AbnxtAdmin.vue + Experiment.vue 자동 컴포넌트 등록.
    addComponentsDir({ path: resolve('./runtime/components') });

    if (adminEnabled) {
      // 어드민 페이지 자동 주입(extendPages로 runtime 페이지를 route에 등록).
      extendPages((pages) => {
        if (pages.some((p) => p.path === adminRoute)) return; // 멱등.
        pages.push({
          name: 'abnxt-admin',
          path: adminRoute,
          file: resolve('./runtime/pages/abnxt-admin.vue'),
        });
      });

      // config/auth 서버 라우트 자동 등록(옵션). storage는 파일 기반(fsConfig + write).
      if (serverRoutes) {
        addServerHandler({
          route: configEndpoint,
          handler: resolve('./runtime/server/routes/config'),
        });
        addServerHandler({
          route: authEndpoint,
          handler: resolve('./runtime/server/routes/auth'),
        });
      }
    }
  },
});

// runtimeConfig 타입 보강(@nuxt/schema) — `as any` 대신 정식 선언 병합.
declare module '@nuxt/schema' {
  interface RuntimeConfig {
    abnxt: {
      config: unknown;
      adminKey: string;
      adminSecret: string;
      configPath: string;
      cookieName: string;
    };
  }
  interface PublicRuntimeConfig {
    abnxt: {
      analytics: AnalyticsFlags;
      admin: {
        configEndpoint: string;
        authEndpoint: string;
        title: string;
      };
    };
  }
}
