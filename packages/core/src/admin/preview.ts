const OVR_PREFIX = 'abnxt.ovr.';

export interface PreviewCookieIO {
  set(name: string, value: string): void;
  remove(name: string): void;
}

function browserPreviewIO(): PreviewCookieIO {
  return {
    set: (name, value) => {
      if (typeof document !== 'undefined')
        document.cookie = `${name}=${value}; path=/; SameSite=Lax`;
    },
    remove: (name) => {
      if (typeof document !== 'undefined')
        document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    },
  };
}

/** Preview as: override 쿠키로 실제 사이트에서 특정 변이 강제(QA). */
export function setOverride(
  key: string,
  variant: string,
  io: PreviewCookieIO = browserPreviewIO(),
): void {
  io.set(OVR_PREFIX + key, variant);
}
export function clearOverride(
  key: string,
  io: PreviewCookieIO = browserPreviewIO(),
): void {
  io.remove(OVR_PREFIX + key);
}
