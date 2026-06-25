import type { AbConfig, Experiment } from '../types';

function clone(cfg: AbConfig): AbConfig {
  return { ...cfg, experiments: { ...cfg.experiments } };
}

export function upsertExperiment(
  cfg: AbConfig,
  key: string,
  exp: Experiment,
): AbConfig {
  const next = clone(cfg);
  next.experiments[key] = exp;
  return next;
}

export function toggleActive(cfg: AbConfig, key: string): AbConfig {
  const exp = cfg.experiments[key];
  if (!exp) return cfg;
  return upsertExperiment(cfg, key, { ...exp, active: !exp.active });
}

export function setField(
  cfg: AbConfig,
  key: string,
  fields: Partial<
    Pick<Experiment, 'name' | 'description' | 'sticky' | 'seed' | 'control'>
  >,
): AbConfig {
  const exp = cfg.experiments[key];
  if (!exp) return cfg;
  return upsertExperiment(cfg, key, { ...exp, ...fields });
}

export function addExperiment(cfg: AbConfig): AbConfig {
  const keys = new Set(Object.keys(cfg.experiments));
  let n = keys.size + 1;
  let key = `experiment-${n}`;
  while (keys.has(key)) key = `experiment-${++n}`;
  const exp: Experiment = {
    name: key,
    description: '',
    active: false,
    sticky: true,
    seed: key,
    control: 'A',
    variants: [
      { key: 'A', weight: 50 },
      { key: 'B', weight: 50 },
    ],
  };
  return upsertExperiment(cfg, key, exp);
}

export function removeExperiment(cfg: AbConfig, key: string): AbConfig {
  const next = clone(cfg);
  delete next.experiments[key];
  return next;
}

/**
 * 전체 사용자 강제 재배정: resetEpoch를 now로 올린다(불변 반환).
 * now는 어드민 편집 시점 값(배정 경로 아님 → 비결정성 허용). save 후 방문자 재배정 발동.
 */
export function bumpResetEpoch(
  cfg: AbConfig,
  now: number = Date.now(),
): AbConfig {
  return { ...cfg, resetEpoch: now };
}
