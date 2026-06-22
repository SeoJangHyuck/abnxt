export interface AbProxyInput {
  vidCookie?: string;
  query: URLSearchParams;
  overrideCookies: Record<string, string>;
  newVisitorId: () => string;
}

export interface AbProxyPlan {
  vid: string;
  setVidCookie: boolean;
  forwardVidHeader: boolean;
  setOverrides: Record<string, string>;
  deleteOverrides: string[];
  forwardOverrides: Record<string, string>;
}

const OVR_QUERY_PREFIX = 'ab_';
const RESET_PARAM = 'ab_reset';

export function planAbProxy(input: AbProxyInput): AbProxyPlan {
  const { vidCookie, query, overrideCookies, newVisitorId } = input;

  const hasVid = !!vidCookie;
  const vid = hasVid ? vidCookie! : newVisitorId();

  const setOverrides: Record<string, string> = {};
  const deleteSet = new Set<string>();

  if (query.get(RESET_PARAM) === '1') {
    for (const k of Object.keys(overrideCookies)) deleteSet.add(k);
  }

  for (const [rawKey, value] of query.entries()) {
    if (rawKey === RESET_PARAM) continue;
    if (!rawKey.startsWith(OVR_QUERY_PREFIX)) continue;
    const key = rawKey.slice(OVR_QUERY_PREFIX.length);
    if (!key) continue;
    if (value === '') deleteSet.add(key);
    else setOverrides[key] = value;
  }

  // 명시 설정이 reset/삭제보다 우선
  for (const k of Object.keys(setOverrides)) deleteSet.delete(k);
  const deleteOverrides = [...deleteSet];

  const forwardOverrides: Record<string, string> = {
    ...overrideCookies,
    ...setOverrides,
  };
  for (const k of deleteOverrides) delete forwardOverrides[k];

  return {
    vid,
    setVidCookie: !hasVid,
    forwardVidHeader: !hasVid,
    setOverrides,
    deleteOverrides,
    forwardOverrides,
  };
}
