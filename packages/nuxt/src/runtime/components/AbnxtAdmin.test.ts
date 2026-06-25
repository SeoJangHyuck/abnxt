import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils';
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

/** 어드민은 Shadow DOM(Teleport)에 렌더되므로 shadow root 기준으로 조회한다. */
function shadow(w: VueWrapper): ShadowRoot {
  const host = w.element as HTMLElement;
  if (!host.shadowRoot) throw new Error('shadow root not ready');
  return host.shadowRoot;
}
function q<T extends Element = Element>(w: VueWrapper, sel: string): T | null {
  return shadow(w).querySelector<T>(sel);
}
function qa(w: VueWrapper, sel: string): Element[] {
  return Array.from(shadow(w).querySelectorAll(sel));
}

async function authenticate(w: VueWrapper): Promise<void> {
  const input = q<HTMLInputElement>(w, 'input[type="password"]')!;
  input.value = 'the-admin-key-123456';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  await flushPromises();
  q<HTMLFormElement>(w, 'form')!.dispatchEvent(
    new Event('submit', { bubbles: true, cancelable: true }),
  );
  await flushPromises();
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
    expect(q(w, '.abnxt-admin__gate')).not.toBeNull();
    expect(q(w, 'input[type="password"]')).not.toBeNull();
    expect(q(w, '.abnxt-admin__list')).toBeNull();
  });

  it('renders list + editor after submitting a valid key', async () => {
    const w = mount(AbnxtAdmin);
    await flushPromises();
    await authenticate(w);
    expect(q(w, '.abnxt-admin__gate')).toBeNull();
    expect(q(w, '.abnxt-admin__list')).not.toBeNull();
    expect(shadow(w).textContent).toContain('Hero');
    expect(q(w, '.abnxt-admin__editor')).not.toBeNull();
    const nameInput = q<HTMLInputElement>(
      w,
      '.abnxt-admin__field input[type="text"]',
    )!;
    expect(nameInput.value).toBe('Hero');
  });

  it('toggles active via the editor switch and enables per-experiment Save', async () => {
    const w = mount(AbnxtAdmin);
    await flushPromises();
    await authenticate(w);
    // 저장 전 에디터 Save 비활성
    const saveBefore = qa(w, '.abnxt-admin__btn').find(
      (b) => b.textContent?.trim() === 'Save',
    ) as HTMLButtonElement;
    expect(saveBefore.disabled).toBe(true);
    // 에디터의 첫 스위치 = '활성화'(Active)
    const toggle = q<HTMLElement>(
      w,
      '.abnxt-admin__editor .abnxt-admin__switch',
    )!;
    expect(toggle.getAttribute('data-on')).toBe('true');
    toggle.dispatchEvent(new Event('click', { bubbles: true }));
    await flushPromises();
    const save = qa(w, '.abnxt-admin__btn').find(
      (b) => b.textContent?.trim() === 'Save',
    ) as HTMLButtonElement;
    expect(save.disabled).toBe(false);
  });

  it('redistributes weights when a slider changes (dynamic bars)', async () => {
    const w = mount(AbnxtAdmin);
    await flushPromises();
    await authenticate(w);
    const ranges = qa(
      w,
      '.abnxt-admin__variant input[type="range"]',
    ) as HTMLInputElement[];
    // A를 0으로 → A 0% / B 100%.
    ranges[0].value = '0';
    ranges[0].dispatchEvent(new Event('input', { bubbles: true }));
    await flushPromises();
    const pcts = qa(w, '.abnxt-admin__variant .abnxt-admin__pct').map(
      (n) => n.textContent,
    );
    expect(pcts[0]).toBe('0%');
    expect(pcts[1]).toBe('100%');
  });

  it('applies an all-user reset immediately on confirmation', async () => {
    const w = mount(AbnxtAdmin);
    await flushPromises();
    await authenticate(w);
    const resetBtn = qa(w, '.abnxt-admin__btn').find((b) =>
      b.textContent?.includes('Reset all-user cookies'),
    ) as HTMLButtonElement;
    resetBtn.dispatchEvent(new Event('click', { bubbles: true }));
    await flushPromises();
    expect(shadow(w).textContent).toContain('Reset all user cookies?');
    const confirm = qa(w, '.abnxt-admin__confirm .abnxt-admin__btn').find((b) =>
      b.textContent?.includes('Reset now'),
    ) as HTMLButtonElement;
    confirm.dispatchEvent(new Event('click', { bubbles: true }));
    await flushPromises();
    // 전역 동작 → 즉시 저장 후 성공 메시지
    expect(shadow(w).textContent).toContain('All-user reset applied');
  });
});
