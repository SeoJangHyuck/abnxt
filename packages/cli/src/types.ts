export type Framework = 'next' | 'nuxt';
export type Router = 'app' | 'pages' | 'none';
export type PkgManager = 'pnpm' | 'npm' | 'yarn' | 'bun';

export interface Detection {
  framework: Framework;
  router: Router; // next만 의미. nuxt는 'none'
  typescript: boolean;
  srcDir: boolean; // src/ 사용 여부
  pkgManager: PkgManager;
}

export interface InitOptions {
  /** 라이브 저장 config 라우트 생성 여부. 기본 false(무백엔드). */
  apiRoute?: boolean;
  /** 분석 내장 sink 이름(직렬화). 기본 ['domEvent']. */
  sinks?: string[];
  /** 덮어쓰기. 기본 false(존재 시 skip). */
  force?: boolean;
  /** 미리보기만. 기본 false. */
  dryRun?: boolean;
}

export type FileOpKind = 'create' | 'inject' | 'manual';

export interface FileOp {
  kind: FileOpKind;
  /** cwd 기준 상대 경로(manual은 안내 대상 파일). */
  path: string;
  /** create: 파일 내용. */
  content?: string;
  /** inject: 삽입 스니펫 + 앵커. */
  snippet?: string;
  anchor?: string;
  /** inject: 대상에 이 문자열이 이미 있으면 자동 주입 대신 manual 폴백(예: nuxt.config의 기존 'modules'). */
  skipIfPresent?: string;
  /** inject 실패/manual: 사용자에게 안내할 수동 스니펫. */
  manual?: string;
}

export interface Plan {
  detection: Detection;
  ops: FileOp[];
}
