import { parseStickyCookie } from './sticky';
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
  const stored = parseStickyCookie(deps.getStickyCookie());
  return { visitorId, config, overrides, stored };
}
