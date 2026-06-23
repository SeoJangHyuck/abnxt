import type { AbConfig, Experiment, Variant } from './types';

export const CURRENT_VERSION = 1;
export const EMPTY_CONFIG: AbConfig = { version: 1, experiments: {} };

type Migration = (raw: Record<string, unknown>) => Record<string, unknown>;
/** from-version → 한 단계 상위로 올리는 함수. 현재 비어 있음(v1이 최초). 확장 지점. */
const migrations: Record<number, Migration> = {};

export interface LoadConfigOptions {
  fallback?: AbConfig;
  onWarn?: (message: string) => void;
}

export function loadConfig(
  raw: unknown,
  opts: LoadConfigOptions = {},
): AbConfig {
  const warn = opts.onWarn ?? (() => {});
  const fallback = opts.fallback ?? EMPTY_CONFIG;
  try {
    const migrated = migrate(raw);
    return normalize(migrated, warn);
  } catch (e) {
    warn(`abnxt: config load failed, using fallback (${(e as Error).message})`);
    return fallback;
  }
}

function migrate(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object')
    throw new Error('config is not an object');
  const obj = raw as Record<string, unknown>;
  const rawVersion = obj.version;
  if (typeof rawVersion !== 'number') throw new Error('missing version');
  if (rawVersion > CURRENT_VERSION)
    throw new Error(`unsupported future version ${rawVersion}`);
  // rawVersion은 number로 좁혀짐 → version 선언 타입을 number로 고정(루프 내 narrowing 유지).
  let version = rawVersion;
  let current = obj;
  while (version < CURRENT_VERSION) {
    const m = migrations[version];
    if (!m) throw new Error(`no migration from version ${version}`);
    current = m(current);
    version = current.version as number;
  }
  return current;
}

function normalize(
  raw: Record<string, unknown>,
  warn: (m: string) => void,
): AbConfig {
  const experimentsRaw = raw.experiments;
  if (!experimentsRaw || typeof experimentsRaw !== 'object') {
    throw new Error('invalid experiments map');
  }
  const experiments: Record<string, Experiment> = {};
  for (const [key, value] of Object.entries(
    experimentsRaw as Record<string, unknown>,
  )) {
    const exp = normalizeExperiment(key, value, warn);
    if (exp) experiments[key] = exp;
  }
  return {
    version: 1,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : undefined,
    resetEpoch:
      typeof raw.resetEpoch === 'number' && raw.resetEpoch > 0
        ? raw.resetEpoch
        : undefined,
    experiments,
  };
}

function normalizeExperiment(
  key: string,
  value: unknown,
  warn: (m: string) => void,
): Experiment | null {
  if (!value || typeof value !== 'object') {
    warn(`abnxt: experiment "${key}" malformed, dropping`);
    return null;
  }
  const v = value as Record<string, unknown>;
  if (!Array.isArray(v.variants) || v.variants.length === 0) {
    warn(`abnxt: experiment "${key}" has no variants, dropping`);
    return null;
  }
  const variants: Variant[] = [];
  for (const raw of v.variants) {
    if (
      !raw ||
      typeof raw !== 'object' ||
      typeof (raw as Variant).key !== 'string'
    ) {
      warn(`abnxt: experiment "${key}" has a malformed variant, skipping it`);
      continue;
    }
    const rv = raw as Record<string, unknown>;
    const weight = typeof rv.weight === 'number' ? Math.max(0, rv.weight) : 1;
    variants.push({ key: rv.key as string, weight });
  }
  if (variants.length === 0) {
    warn(`abnxt: experiment "${key}" has no usable variants, dropping`);
    return null;
  }
  const seed = typeof v.seed === 'string' && v.seed ? v.seed : key;
  const control =
    typeof v.control === 'string' && variants.some((x) => x.key === v.control)
      ? (v.control as string)
      : variants[0].key;
  return {
    name: typeof v.name === 'string' ? v.name : key,
    active: v.active !== false,
    sticky: v.sticky !== false,
    seed,
    control,
    variants,
  };
}
