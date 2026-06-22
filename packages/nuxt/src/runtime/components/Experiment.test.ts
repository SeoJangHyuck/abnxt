import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createAbRuntime, type AbState } from '@abnxt/core';
import { AB_INJECTION_KEY } from '../shared';
import Experiment from './Experiment.vue';

const state: AbState = {
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
function memCookies() {
  const jar: Record<string, string> = {};
  return {
    read: (n: string) => jar[n],
    write: (n: string, v: string) => {
      jar[n] = v;
    },
  };
}
beforeEach(() => sessionStorage.clear());

function mountExp(slots: Record<string, string>) {
  const rt = createAbRuntime({
    getState: () => state,
    cookieIO: memCookies(),
    stickySchedule: (cb) => cb(),
  });
  return mount(Experiment, {
    props: { name: 'hero' },
    slots,
    global: { provide: { [AB_INJECTION_KEY as symbol]: rt } },
  });
}

describe('<Experiment>', () => {
  it('renders the assigned variant slot', () => {
    const w = mountExp({ A: 'control-ui', B: 'treatment-ui' });
    expect(w.text()).toContain('treatment-ui');
    expect(w.text()).not.toContain('control-ui');
  });
  it('falls back to the control slot when the assigned slot is missing', () => {
    const w = mountExp({ A: 'control-ui' });
    expect(w.text()).toContain('control-ui');
  });
  it('renders nothing when neither assigned nor control slot exists', () => {
    const w = mountExp({ C: 'other' });
    expect(w.text()).toBe('');
  });
});
