import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  render,
  screen,
  waitFor,
  fireEvent,
  cleanup,
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
    await waitFor(() =>
      expect(screen.getByLabelText('Admin key')).toBeDefined(),
    );
    expect(screen.getByText('Unlock')).toBeDefined();
  });

  it('(b) submits the key, re-fetches config, and renders list + editor', async () => {
    // 1) initial GET 401 → gate
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ error: 'unauthorized' }, 401),
    );
    // 2) POST auth → 200
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }, 200));
    // 3) GET config → 200
    fetchMock.mockResolvedValueOnce(jsonResponse(CONFIG, 200));

    render(<AbnxtAdmin />);
    const input = await screen.findByLabelText('Admin key');
    fireEvent.change(input, { target: { value: 'my-key' } });
    fireEvent.click(screen.getByText('Unlock'));

    // list item + editor field rendered after re-fetch
    await waitFor(() => expect(screen.getByText('Hero Banner')).toBeDefined());
    // editor "seed" input present (authed view)
    expect(screen.getByDisplayValue('hero')).toBeDefined();

    // POST body included the key
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
    await waitFor(() => expect(screen.getByText('Hero Banner')).toBeDefined());
  }

  it('(c) toggles on/off via the list button', async () => {
    await renderAuthed();
    // active=true → button shows "on"
    const toggle = screen.getByText('on');
    fireEvent.click(toggle);
    await waitFor(() => expect(screen.getByText('off')).toBeDefined());
    // toggling marks dirty → Save enabled
    const save = screen.getByText('Save') as HTMLButtonElement;
    expect(save.disabled).toBe(false);
  });

  it('(d) changing a weight updates the displayed percent', async () => {
    await renderAuthed();
    // initial 50/50
    const pcts = screen
      .getAllByText(/%$/)
      .map((el) => el.textContent)
      .filter((t) => t === '50%');
    expect(pcts.length).toBeGreaterThanOrEqual(2);

    // set variant A weight to 0 → A becomes 0%, B 100%
    const rangeA = screen.getByLabelText('weight A') as HTMLInputElement;
    fireEvent.change(rangeA, { target: { value: '0' } });

    await waitFor(() => {
      const variantPcts = document.querySelectorAll(
        '.abnxt-admin__variant-pct',
      );
      const texts = Array.from(variantPcts).map((e) => e.textContent);
      expect(texts).toContain('0%');
      expect(texts).toContain('100%');
    });
  });

  it('(e) Save issues a PUT to the config endpoint', async () => {
    await renderAuthed();
    // make it dirty first
    fireEvent.click(screen.getByText('on'));
    // next fetch (PUT) resolves ok
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }, 200));
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      const putCall = fetchMock.mock.calls.find(
        (c) => (c[1] as RequestInit | undefined)?.method === 'PUT',
      );
      expect(putCall).toBeDefined();
      expect(putCall![0]).toBe('/api/abnxt/config');
    });
    // success message
    await waitFor(() => expect(screen.getByText('Saved')).toBeDefined());
  });

  it('(f) Logout issues a DELETE and returns to the gate', async () => {
    await renderAuthed();
    // DELETE auth resolves ok, then nothing else
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }, 200));
    fireEvent.click(screen.getByText('Logout'));

    await waitFor(() => {
      const delCall = fetchMock.mock.calls.find(
        (c) => (c[1] as RequestInit | undefined)?.method === 'DELETE',
      );
      expect(delCall).toBeDefined();
      expect(delCall![0]).toBe('/api/abnxt/auth');
    });
    // back to gate
    await waitFor(() =>
      expect(screen.getByLabelText('Admin key')).toBeDefined(),
    );
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
    await waitFor(() => expect(screen.getByText('My Admin')).toBeDefined());
    expect(fetchMock.mock.calls[0][0]).toBe('/x/config');
  });
});
