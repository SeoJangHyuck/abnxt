import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  render,
  within,
  waitFor,
  fireEvent,
  cleanup,
  type queries,
  type BoundFunctions,
} from '@testing-library/react';
import type { AbConfig } from '@abnxt/core';
import { AbnxtAdmin } from './AbnxtAdmin';

const CONFIG: AbConfig = {
  version: 1,
  experiments: {
    hero: {
      name: 'Hero Banner',
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

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

let fetchMock: ReturnType<typeof vi.fn>;

/** 어드민은 Shadow DOM에 렌더되므로 shadow root 기준으로 쿼리한다. */
function sq(): BoundFunctions<typeof queries> {
  const host = document.querySelector(
    '[data-abnxt-admin-host]',
  ) as HTMLElement | null;
  if (!host?.shadowRoot) throw new Error('shadow root not ready');
  return within(host.shadowRoot as unknown as HTMLElement);
}

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('<AbnxtAdmin> auth gate', () => {
  it('(a) shows the key form when config GET returns 401', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ error: 'unauthorized' }, 401),
    );
    render(<AbnxtAdmin />);
    await waitFor(() => expect(sq().getByLabelText('Admin key')).toBeDefined());
    expect(sq().getByText('Unlock')).toBeDefined();
  });

  it('(b) submits the key, re-fetches config, and renders list + editor', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ error: 'unauthorized' }, 401),
    );
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }, 200));
    fetchMock.mockResolvedValueOnce(jsonResponse(CONFIG, 200));

    render(<AbnxtAdmin />);
    await waitFor(() => expect(sq().getByLabelText('Admin key')).toBeDefined());
    fireEvent.change(sq().getByLabelText('Admin key'), {
      target: { value: 'my-key' },
    });
    fireEvent.click(sq().getByText('Unlock'));

    await waitFor(() =>
      expect(sq().getAllByText('Hero Banner').length).toBeGreaterThan(0),
    );
    expect(sq().getByDisplayValue('hero')).toBeDefined();

    const postCall = fetchMock.mock.calls.find(
      (c) => (c[1] as RequestInit | undefined)?.method === 'POST',
    );
    expect(postCall).toBeDefined();
    expect(postCall![1]?.body).toContain('my-key');
  });
});

describe('<AbnxtAdmin> authed actions', () => {
  async function renderAuthed() {
    fetchMock.mockResolvedValueOnce(jsonResponse(CONFIG, 200));
    render(<AbnxtAdmin />);
    await waitFor(() =>
      expect(sq().getAllByText('Hero Banner').length).toBeGreaterThan(0),
    );
  }

  it('(c) toggles active via the editor switch and enables per-experiment Save', async () => {
    await renderAuthed();
    // 저장 전 에디터 Save 비활성
    const saveBefore = sq()
      .getByText('Save')
      .closest('button') as HTMLButtonElement;
    expect(saveBefore.disabled).toBe(true);
    // 에디터 '활성화' 스위치(aria-label 'Active')로 토글 → dirty → Save 활성
    fireEvent.click(sq().getByLabelText('Active'));
    await waitFor(() => {
      const save = sq()
        .getByText('Save')
        .closest('button') as HTMLButtonElement;
      expect(save.disabled).toBe(false);
    });
  });

  it('(d) raising a weight redistributes the others (dynamic bars)', async () => {
    await renderAuthed();
    const rangeA = sq().getByLabelText('weight A') as HTMLInputElement;
    fireEvent.change(rangeA, { target: { value: '0' } });

    await waitFor(() => {
      const variantPcts = sq()
        .getByLabelText('weight A')
        .closest('.abnxt-modal__card')!
        .querySelectorAll('.abnxt-admin__pct');
      const texts = Array.from(variantPcts).map((e) => e.textContent);
      expect(texts).toContain('0%');
      expect(texts).toContain('100%');
    });
  });

  it('(e) Save issues a PUT to the config endpoint', async () => {
    await renderAuthed();
    fireEvent.click(sq().getByLabelText('Active'));
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }, 200));
    fireEvent.click(sq().getByText('Save'));

    await waitFor(() => {
      const putCall = fetchMock.mock.calls.find(
        (c) => (c[1] as RequestInit | undefined)?.method === 'PUT',
      );
      expect(putCall).toBeDefined();
      expect(putCall![0]).toBe('/api/abnxt/config');
    });
    await waitFor(() => expect(sq().getByText('Saved')).toBeDefined());
  });

  it('(f) Logout issues a DELETE and returns to the gate', async () => {
    await renderAuthed();
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }, 200));
    fireEvent.click(sq().getByText('Logout'));

    await waitFor(() => {
      const delCall = fetchMock.mock.calls.find(
        (c) => (c[1] as RequestInit | undefined)?.method === 'DELETE',
      );
      expect(delCall).toBeDefined();
      expect(delCall![0]).toBe('/api/abnxt/auth');
    });
    await waitFor(() => expect(sq().getByLabelText('Admin key')).toBeDefined());
  });

  it('(g) cookie reset requires confirmation then saves immediately', async () => {
    await renderAuthed();
    fireEvent.click(sq().getByText('Reset all-user cookies'));
    // 확인 다이얼로그 노출
    await waitFor(() =>
      expect(sq().getByText('Reset all user cookies?')).toBeDefined(),
    );
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }, 200));
    fireEvent.click(sq().getByText('Reset now'));
    // 전역 동작 → 즉시 PUT 저장
    await waitFor(() => {
      const putCall = fetchMock.mock.calls.find(
        (c) => (c[1] as RequestInit | undefined)?.method === 'PUT',
      );
      expect(putCall).toBeDefined();
      expect(putCall![0]).toBe('/api/abnxt/config');
    });
  });

  it('(h) switching experiments discards unsaved edits', async () => {
    const TWO: AbConfig = {
      version: 1,
      experiments: {
        hero: { ...CONFIG.experiments.hero },
        promo: { ...CONFIG.experiments.hero, name: 'Promo' },
      },
    };
    fetchMock.mockResolvedValueOnce(jsonResponse(TWO, 200));
    render(<AbnxtAdmin />);
    await waitFor(() =>
      expect(sq().getAllByText('Hero Banner').length).toBeGreaterThan(0),
    );
    // hero 편집(dirty) → promo 선택 시 폐기 → 다시 hero 선택 시 원복(Save 비활성)
    fireEvent.click(sq().getByLabelText('Active'));
    await waitFor(() => {
      const save = sq()
        .getByText('Save')
        .closest('button') as HTMLButtonElement;
      expect(save.disabled).toBe(false);
    });
    fireEvent.click(sq().getByText('Promo'));
    await waitFor(() => {
      const save = sq()
        .getByText('Save')
        .closest('button') as HTMLButtonElement;
      expect(save.disabled).toBe(true);
    });
  });

  it('(i) blocks save when 3+ variants exceed 100% total', async () => {
    await renderAuthed();
    // 변이 추가 → 3개([50,50,50]=150) → 합 초과 경고 + Save 차단
    fireEvent.click(sq().getByText('Add variant'));
    await waitFor(() =>
      expect(sq().getByText(/Total exceeds 100%/)).toBeDefined(),
    );
    const save = sq().getByText('Save').closest('button') as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    // C를 0으로 → 합 100 → Save 활성
    const rangeC = sq().getByLabelText('weight C') as HTMLInputElement;
    fireEvent.change(rangeC, { target: { value: '0' } });
    await waitFor(() => {
      const s = sq().getByText('Save').closest('button') as HTMLButtonElement;
      expect(s.disabled).toBe(false);
    });
  });

  it('uses custom endpoints when provided', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(CONFIG, 200));
    render(
      <AbnxtAdmin
        configEndpoint="/x/config"
        authEndpoint="/x/auth"
        title="My Admin"
      />,
    );
    await waitFor(() => expect(sq().getByText('My Admin')).toBeDefined());
    expect(fetchMock.mock.calls[0][0]).toBe('/x/config');
  });
});
