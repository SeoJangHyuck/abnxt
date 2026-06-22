import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, waitFor, screen } from '@testing-library/react';
import { AbStateProvider } from './context';
import { useExperiment } from './useExperiment';
import type { AbState } from '../types';

function makeState(): AbState {
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
  };
}

function Probe() {
  const { variant, source, isReady } = useExperiment('hero');
  return (
    <span data-testid="out">
      {variant}:{source}:{String(isReady)}
    </span>
  );
}

let exposureCount: number;
let onExposure: (e: Event) => void;

beforeEach(() => {
  sessionStorage.clear();
  exposureCount = 0;
  onExposure = () => {
    exposureCount++;
  };
  window.addEventListener('abnxt:exposure', onExposure);
});

afterEach(() => {
  window.removeEventListener('abnxt:exposure', onExposure);
});

describe('useExperiment', () => {
  it('resolves the variant and reports isReady', () => {
    render(
      <AbStateProvider state={makeState()}>
        <Probe />
      </AbStateProvider>,
    );
    expect(screen.getByTestId('out').textContent).toBe('B:assigned:true');
  });

  it('fires exposure exactly once on mount', async () => {
    render(
      <AbStateProvider state={makeState()}>
        <Probe />
      </AbStateProvider>,
    );
    await waitFor(() => expect(exposureCount).toBe(1));
  });

  it('throws outside a provider', () => {
    expect(() => render(<Probe />)).toThrow(/ABProvider/);
  });
});
