import { parseStickyCookie, STICKY_EPOCH_KEY } from './sticky';
import type { AbConfig, AbState } from './types';

export interface BuildStateDeps {
  getVid: () => string | undefined;
  getOverrides: () => Record<string, string>;
  getStickyCookie: () => string | undefined;
  loadConfig: () => Promise<AbConfig>;
  newVisitorId: () => string;
}

export async function buildAbState(deps: BuildStateDeps): Promise<AbState> {
  const visitorId = deps.getVid() ?? deps.newVisitorId();
  const config = await deps.loadConfig();
  const overrides = deps.getOverrides();

  // sticky 쿠키에서 배정 epoch(__e)를 분리. 실험 배정 map에는 포함하지 않는다.
  const rawStored = parseStickyCookie(deps.getStickyCookie());
  const cookieEpoch = Number(rawStored[STICKY_EPOCH_KEY] ?? 0) || 0;
  delete rawStored[STICKY_EPOCH_KEY];

  // 전체 사용자 강제 재배정: 저장된 epoch가 config.resetEpoch보다 오래되면 배정을 무시(재배정).
  const resetEpoch = config.resetEpoch ?? 0;
  const stored = resetEpoch > 0 && cookieEpoch < resetEpoch ? {} : rawStored;

  return { visitorId, config, overrides, stored };
}
