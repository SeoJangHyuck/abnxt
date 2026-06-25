import { cookies, headers } from 'next/headers';
import { cache } from 'react';
import {
  createVisitorId,
  EMPTY_CONFIG,
  buildAbState,
  resolveFrom,
  OVERRIDE_COOKIE_PREFIX,
} from '@abnxt/core';
import type { AbConfig } from '@abnxt/core';
import type { AbState, ServerAbConfig } from '../types';

const VID_COOKIE = 'abnxt_vid';
const STICKY_COOKIE = 'abnxt_a';
const VID_HEADER = 'x-abnxt-vid';
const OVR_HEADER = 'x-abnxt-ovr';

let configured: ServerAbConfig | undefined;

export function configureServerAb(opts: ServerAbConfig): void {
  configured = opts;
}

async function loadConfig(): Promise<AbConfig> {
  if (!configured) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        'abnxt: configureServerAb() not called — using EMPTY_CONFIG',
      );
    }
    return EMPTY_CONFIG;
  }
  return configured.source.load();
}

export const getServerAbState: () => Promise<AbState> = cache(async () => {
  const cookieStore = await cookies();
  const headerStore = await headers();

  return buildAbState({
    getVid: () =>
      cookieStore.get(VID_COOKIE)?.value ??
      headerStore.get(VID_HEADER) ??
      undefined,
    getOverrides: () => {
      const headerOvr = headerStore.get(OVR_HEADER);
      if (headerOvr) {
        try {
          const parsed = JSON.parse(headerOvr) as unknown;
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            const out: Record<string, string> = {};
            for (const [k, v] of Object.entries(
              parsed as Record<string, unknown>,
            )) {
              if (typeof v === 'string') out[k] = v;
            }
            return out;
          }
        } catch {
          /* fall through to cookies */
        }
      }
      const out: Record<string, string> = {};
      for (const c of cookieStore.getAll()) {
        if (c.name.startsWith(OVERRIDE_COOKIE_PREFIX)) {
          out[c.name.slice(OVERRIDE_COOKIE_PREFIX.length)] = c.value;
        }
      }
      return out;
    },
    getStickyCookie: () => cookieStore.get(STICKY_COOKIE)?.value,
    loadConfig,
    newVisitorId: createVisitorId,
  });
});

export async function getVariant(key: string): Promise<string> {
  return resolveFrom(await getServerAbState(), key).variant;
}
