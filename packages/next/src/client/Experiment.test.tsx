import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AbStateProvider } from './context';
import { Experiment, Variant } from './Experiment';
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

beforeEach(() => {
  sessionStorage.clear();
});

describe('<Experiment>/<Variant>', () => {
  it('renders the matching variant', () => {
    render(
      <AbStateProvider state={makeState()}>
        <Experiment name="hero">
          <Variant name="A">control-ui</Variant>
          <Variant name="B">treatment-ui</Variant>
        </Experiment>
      </AbStateProvider>,
    );
    expect(screen.getByText('treatment-ui')).toBeTruthy();
    expect(screen.queryByText('control-ui')).toBeNull();
  });

  it('falls back to the control variant when the assigned variant has no <Variant>', () => {
    render(
      <AbStateProvider state={makeState()}>
        <Experiment name="hero">
          <Variant name="A">control-ui</Variant>
        </Experiment>
      </AbStateProvider>,
    );
    expect(screen.getByText('control-ui')).toBeTruthy();
  });

  it('renders nothing and warns when no variant matches', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { container } = render(
      <AbStateProvider state={makeState()}>
        <Experiment name="hero">
          <Variant name="C">other</Variant>
        </Experiment>
      </AbStateProvider>,
    );
    expect(container.textContent).toBe('');
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
