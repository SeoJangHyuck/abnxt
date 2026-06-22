import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { useContext, useEffect } from 'react';
import { parseStickyCookie } from '@abnxt/core';
import { AbStateProvider, AbContext } from './context';
import type { AbState, AnalyticsFlags } from '../types';

function makeState(over: Partial<AbState> = {}): AbState {
  return {
    visitorId: 'v1',
    config: {
      version: 1,
      experiments: {
        hero: {
          name: 'Hero',
          active: true,
          sticky: true,
          seed: 'hero',
          control: 'A',
          variants: [
            { key: 'A', weight: 0 },
            { key: 'B', weight: 100 },
          ],
        },
      },
    },
    overrides: {},
    stored: {},
    ...over,
  };
}

function FireOnce({ k }: { k: string }) {
  const ctx = useContext(AbContext)!;
  useEffect(() => {
    ctx.fireExposure(k, ctx.resolve(k));
  }, [ctx, k]);
  return <span>{ctx.resolve(k).variant}</span>;
}

function clearCookies() {
  for (const c of document.cookie.split('; ')) {
    const name = c.split('=')[0];
    if (name)
      document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  }
}

let exposures: Array<{ ab_experiment: string; ab_variant: string }>;
let onExposure: (e: Event) => void;

beforeEach(() => {
  sessionStorage.clear();
  clearCookies();
  exposures = [];
  onExposure = (e) => {
    const d = (e as CustomEvent).detail as {
      experiment: string;
      variant: string;
    };
    exposures.push({ ab_experiment: d.experiment, ab_variant: d.variant });
  };
  window.addEventListener('abnxt:exposure', onExposure);
});

afterEach(() => {
  window.removeEventListener('abnxt:exposure', onExposure);
});

describe('AbStateProvider runtime', () => {
  it('fires a domEvent exposure for an assigned variant (vendor-neutral default)', async () => {
    render(
      <AbStateProvider state={makeState()}>
        <FireOnce k="hero" />
      </AbStateProvider>,
    );
    await waitFor(() => {
      expect(exposures).toContainEqual({
        ab_experiment: 'hero',
        ab_variant: 'B',
      });
    });
  });

  it('dedups repeated exposures for the same experiment', async () => {
    render(
      <AbStateProvider state={makeState()}>
        <FireOnce k="hero" />
        <FireOnce k="hero" />
      </AbStateProvider>,
    );
    await waitFor(() => expect(exposures.length).toBeGreaterThan(0));
    expect(exposures.length).toBe(1);
  });

  it('records a sticky assignment to the abnxt_a cookie', async () => {
    render(
      <AbStateProvider state={makeState()}>
        <FireOnce k="hero" />
      </AbStateProvider>,
    );
    await waitFor(() => {
      const raw = document.cookie
        .split('; ')
        .find((c) => c.startsWith('abnxt_a='));
      expect(raw).toBeTruthy();
      expect(parseStickyCookie(raw!.slice('abnxt_a='.length))).toEqual({
        hero: 'B',
      });
    });
  });

  it('persists vid to a cookie when none exists (proxy 미설치 대응)', async () => {
    render(
      <AbStateProvider state={makeState()}>
        <FireOnce k="hero" />
      </AbStateProvider>,
    );
    await waitFor(() => expect(document.cookie).toContain('abnxt_vid=v1'));
  });

  it('skips exposure when requireConsent and no consent cookie', async () => {
    const analytics: AnalyticsFlags = { requireConsent: true };
    render(
      <AbStateProvider
        state={makeState()}
        analytics={analytics}
      >
        <FireOnce k="hero" />
      </AbStateProvider>,
    );
    await waitFor(() => expect(document.cookie).toContain('abnxt_vid=v1')); // 마운트 완료 대기
    expect(exposures.length).toBe(0);
  });

  it('fires exposure when the consent cookie is present', async () => {
    document.cookie = 'abnxt_consent=1; path=/';
    const analytics: AnalyticsFlags = { requireConsent: true };
    render(
      <AbStateProvider
        state={makeState()}
        analytics={analytics}
      >
        <FireOnce k="hero" />
      </AbStateProvider>,
    );
    await waitFor(() => expect(exposures.length).toBe(1));
  });

  it('emits no exposure when analytics.sinks is empty', async () => {
    render(
      <AbStateProvider
        state={makeState()}
        analytics={{ sinks: [] }}
      >
        <FireOnce k="hero" />
      </AbStateProvider>,
    );
    await waitFor(() => expect(document.cookie).toContain('abnxt_vid=v1'));
    expect(exposures.length).toBe(0);
  });
});
