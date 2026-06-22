import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import type { AbConfig } from '@abnxt/core';
import AbnxtAdmin from './AbnxtAdmin.vue';

const config: AbConfig = {
  version: 1,
  experiments: {
    hero: {
      name: 'Hero',
      active: true,
      sticky: true,
      seed: 'hero',
      control: 'A',
      variants: [
        { key: 'A', weight: 50 },
        { key: 'B', weight: 50 },
      ],
    },
  },
};

/** fetch 모킹: 인증 전 GET은 401, auth POST 후엔 GET 200(config). */
function makeFetch() {
  let authed = false;
  return vi.fn(async (url: string, init?: RequestInit) => {
    const method = (init?.method ?? 'GET').toUpperCase();
    if (url.includes('/auth')) {
      if (method === 'POST') {
        authed = true;
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      if (method === 'DELETE') {
        authed = false;
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
    }
    if (url.includes('/config') && method === 'GET') {
      return authed
        ? new Response(JSON.stringify(config), { status: 200 })
        : new Response(JSON.stringify({ error: 'unauthorized' }), {
            status: 401,
          });
    }
    return new Response('{}', { status: 200 });
  });
}

beforeEach(() => {
  vi.stubGlobal('fetch', makeFetch());
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('<AbnxtAdmin>', () => {
  it('shows the key gate when GET config returns 401', async () => {
    const w = mount(AbnxtAdmin);
    await flushPromises();
    expect(w.find('.abnxt-admin__gate').exists()).toBe(true);
    expect(w.find('input[type="password"]').exists()).toBe(true);
    expect(w.find('.abnxt-admin__list').exists()).toBe(false);
  });

  it('renders list + editor after submitting a valid key', async () => {
    const w = mount(AbnxtAdmin);
    await flushPromises();
    await w.find('input[type="password"]').setValue('the-admin-key-123456');
    await w.find('form').trigger('submit.prevent');
    await flushPromises();
    // 게이트가 사라지고 리스트/에디터가 보인다.
    expect(w.find('.abnxt-admin__gate').exists()).toBe(false);
    expect(w.find('.abnxt-admin__list').exists()).toBe(true);
    expect(w.text()).toContain('Hero');
    expect(w.find('.abnxt-admin__editor').exists()).toBe(true);
    // 첫 실험이 자동 선택되어 에디터에 name 입력이 렌더된다.
    const nameInput = w.find('.abnxt-admin__field input[type="text"]');
    expect((nameInput.element as HTMLInputElement).value).toBe('Hero');
  });

  it('toggles active via the list on/off button', async () => {
    const w = mount(AbnxtAdmin);
    await flushPromises();
    await w.find('input[type="password"]').setValue('the-admin-key-123456');
    await w.find('form').trigger('submit.prevent');
    await flushPromises();
    // 리스트 active 토글은 on/off 버튼(React/Svelte 원본과 동일).
    const toggle = w.find(
      '.abnxt-admin__list-item button[aria-label="active"]',
    );
    expect(toggle.text()).toBe('on');
    await toggle.trigger('click');
    expect(toggle.text()).toBe('off');
    // dirty → Save 버튼 활성 + dirty 클래스.
    const save = w
      .findAll('.abnxt-admin__btn')
      .find((b) => b.text() === 'Save');
    expect(save?.classes()).toContain('abnxt-admin__btn--dirty');
  });

  it('updates the percent label when a weight slider changes', async () => {
    const w = mount(AbnxtAdmin);
    await flushPromises();
    await w.find('input[type="password"]').setValue('the-admin-key-123456');
    await w.find('form').trigger('submit.prevent');
    await flushPromises();
    const ranges = w.findAll('.abnxt-admin__variant input[type="range"]');
    // B의 상대 weight를 0으로 → A 100% / B 0%(normalizeToPercents).
    (ranges[1].element as HTMLInputElement).value = '0';
    await ranges[1].trigger('input');
    const pcts = w
      .findAll('.abnxt-admin__variant .abnxt-admin__variant-pct')
      .map((n) => n.text());
    expect(pcts[0]).toBe('100%');
    expect(pcts[1]).toBe('0%');
  });
});
