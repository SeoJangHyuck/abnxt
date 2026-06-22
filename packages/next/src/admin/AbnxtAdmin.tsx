'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AbConfig, Experiment } from '@abnxt/core';
import {
  toggleActive,
  setField,
  addExperiment,
  removeExperiment,
  normalizeToPercents,
  addVariant,
  removeVariant,
  setWeight,
  simulateSplit,
  setOverride,
  clearOverride,
  serializeConfig,
  parseConfigJson,
  apiStorage,
} from '@abnxt/core/admin';
import { ADMIN_CSS, ADMIN_STYLE_ID } from './styles';

/** React/Vue 공통 props(형평성: 동일 이름/기본값). */
export interface AbnxtAdminProps {
  /** config GET/PUT 엔드포인트. 기본 '/api/abnxt/config'. */
  configEndpoint?: string;
  /** 키 검증/로그아웃 엔드포인트. 기본 '/api/abnxt/auth'. */
  authEndpoint?: string;
  /** 헤더 타이틀. 기본 'abnxt admin'. */
  title?: string;
}

type AuthState = 'loading' | 'gate' | 'authed';

const EMPTY: AbConfig = { version: 1, experiments: {} };
const SIM_N = 1000;

/** `<style>`를 1회만 주입(중복 마운트/HMR 안전). */
function useInjectStyles(): void {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (document.getElementById(ADMIN_STYLE_ID)) return;
    const el = document.createElement('style');
    el.id = ADMIN_STYLE_ID;
    el.textContent = ADMIN_CSS;
    document.head.appendChild(el);
  }, []);
}

/** experiments 레코드의 안정적 key 목록(삽입 순서 유지). */
function expKeys(cfg: AbConfig): string[] {
  return Object.keys(cfg.experiments);
}

export function AbnxtAdmin(props: AbnxtAdminProps) {
  const configEndpoint = props.configEndpoint ?? '/api/abnxt/config';
  const authEndpoint = props.authEndpoint ?? '/api/abnxt/auth';
  const title = props.title ?? 'abnxt admin';

  useInjectStyles();

  const storage = useMemo(
    () => apiStorage({ base: configEndpoint }),
    [configEndpoint],
  );

  const [authState, setAuthState] = useState<AuthState>('loading');
  const [config, setConfig] = useState<AbConfig>(EMPTY);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState('');
  const [gateError, setGateError] = useState('');
  const [keyInput, setKeyInput] = useState('');
  const [saving, setSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  /** config를 GET해 인증 상태를 판별(200=authed, 401=gate, 그 외=메시지 폴백). */
  const fetchConfig = useCallback(async (): Promise<void> => {
    try {
      const res = await fetch(configEndpoint, {
        method: 'GET',
        credentials: 'same-origin',
        headers: { accept: 'application/json' },
      });
      if (res.status === 401) {
        setAuthState('gate');
        return;
      }
      if (!res.ok) {
        setAuthState('gate');
        setGateError(`Failed to load config (${res.status})`);
        return;
      }
      const raw: unknown = await res.json();
      // 렌더 경로 예외 금지: parseConfigJson(검증·폴백) 경유.
      const parsed = parseConfigJson(JSON.stringify(raw));
      setConfig(parsed.config);
      setSelectedKey((prev) => {
        const keys = expKeys(parsed.config);
        if (prev && keys.includes(prev)) return prev;
        return keys[0] ?? null;
      });
      setDirty(false);
      setAuthState('authed');
      if (!parsed.ok && parsed.message)
        setMsg(`Loaded with warning: ${parsed.message}`);
    } catch (err) {
      setAuthState('gate');
      setGateError(err instanceof Error ? err.message : 'Network error');
    }
  }, [configEndpoint]);

  useEffect(() => {
    void fetchConfig();
  }, [fetchConfig]);

  /** 키 제출 → POST auth → 성공 시 config 재GET. */
  const submitKey = useCallback(
    async (e: React.FormEvent): Promise<void> => {
      e.preventDefault();
      setGateError('');
      try {
        const res = await fetch(authEndpoint, {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ key: keyInput }),
        });
        if (!res.ok) {
          setGateError('Invalid key');
          return;
        }
        setKeyInput('');
        await fetchConfig();
      } catch (err) {
        setGateError(err instanceof Error ? err.message : 'Network error');
      }
    },
    [authEndpoint, keyInput, fetchConfig],
  );

  /** 로그아웃 → DELETE auth → 게이트 복귀. */
  const logout = useCallback(async (): Promise<void> => {
    try {
      await fetch(authEndpoint, {
        method: 'DELETE',
        credentials: 'same-origin',
      });
    } catch {
      /* 만료 실패해도 클라 상태는 게이트로 전환 */
    }
    setConfig(EMPTY);
    setSelectedKey(null);
    setDirty(false);
    setMsg('');
    setAuthState('gate');
  }, [authEndpoint]);

  /** 편집 결과 적용 공통(core 함수가 반환한 새 config). */
  const applyConfig = useCallback((next: AbConfig): void => {
    setConfig(next);
    setDirty(true);
    setMsg('');
  }, []);

  const save = useCallback(async (): Promise<void> => {
    setSaving(true);
    setMsg('');
    try {
      await storage.save(config);
      setDirty(false);
      setMsg('Saved');
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }, [storage, config]);

  const onAddExperiment = useCallback((): void => {
    const next = addExperiment(config);
    // 새로 추가된 key 선택(차집합).
    const before = new Set(expKeys(config));
    const added = expKeys(next).find((k) => !before.has(k));
    applyConfig(next);
    if (added) setSelectedKey(added);
  }, [config, applyConfig]);

  const onExport = useCallback((): void => {
    try {
      const json = serializeConfig(config);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'abnxt-config.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Export failed');
    }
  }, [config]);

  const onImportFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
      const file = e.target.files?.[0];
      // 동일 파일 재선택 허용을 위해 input 초기화.
      e.target.value = '';
      if (!file) return;
      try {
        const text = await file.text();
        const parsed = parseConfigJson(text);
        if (!parsed.ok) {
          // 데이터 손실 방지: 검증 실패 시 적용하지 않음.
          setMsg(`Import failed: ${parsed.message ?? 'invalid config'}`);
          return;
        }
        setConfig(parsed.config);
        setSelectedKey(expKeys(parsed.config)[0] ?? null);
        setDirty(true);
        setMsg('Imported (unsaved)');
      } catch (err) {
        setMsg(err instanceof Error ? err.message : 'Import failed');
      }
    },
    [],
  );

  if (authState === 'loading') {
    return (
      <div className="abnxt-admin">
        <div className="abnxt-admin__empty">Loading…</div>
      </div>
    );
  }

  if (authState === 'gate') {
    return (
      <div className="abnxt-admin">
        <form
          className="abnxt-admin__gate"
          onSubmit={submitKey}
        >
          <div className="abnxt-admin__title">{title}</div>
          <p>Enter the admin key to continue.</p>
          <input
            className="abnxt-admin__gate-input"
            type="password"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            placeholder="Admin key"
            aria-label="Admin key"
            autoComplete="current-password"
          />
          <button
            className="abnxt-admin__btn abnxt-admin__btn--primary"
            type="submit"
          >
            Unlock
          </button>
          {gateError ? (
            <div
              className="abnxt-admin__error"
              role="alert"
            >
              {gateError}
            </div>
          ) : null}
        </form>
      </div>
    );
  }

  const keys = expKeys(config);
  const selected =
    selectedKey && config.experiments[selectedKey]
      ? config.experiments[selectedKey]
      : null;

  return (
    <div className="abnxt-admin">
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        style={{ display: 'none' }}
        onChange={onImportFile}
        data-testid="abnxt-import-input"
      />
      <header className="abnxt-admin__header">
        <div className="abnxt-admin__title">{title}</div>
        <button
          className="abnxt-admin__btn"
          type="button"
          onClick={onAddExperiment}
        >
          + Experiment
        </button>
        <button
          className="abnxt-admin__btn"
          type="button"
          onClick={onExport}
        >
          Export
        </button>
        <button
          className="abnxt-admin__btn"
          type="button"
          onClick={() => fileInputRef.current?.click()}
        >
          Import
        </button>
        <button
          className={
            'abnxt-admin__btn' + (dirty ? ' abnxt-admin__btn--dirty' : '')
          }
          type="button"
          onClick={() => void save()}
          disabled={!dirty || saving}
        >
          Save
        </button>
        <button
          className="abnxt-admin__btn"
          type="button"
          onClick={() => void logout()}
        >
          Logout
        </button>
      </header>

      {msg ? (
        <div
          className="abnxt-admin__msg"
          role="status"
        >
          {msg}
        </div>
      ) : null}

      <div className="abnxt-admin__body">
        <ExperimentList
          config={config}
          keys={keys}
          selectedKey={selectedKey}
          onSelect={setSelectedKey}
          onToggle={(k) => applyConfig(toggleActive(config, k))}
        />
        {selected && selectedKey ? (
          <ExperimentEditor
            expKey={selectedKey}
            experiment={selected}
            config={config}
            onApply={applyConfig}
            onDelete={(k) => {
              const next = removeExperiment(config, k);
              applyConfig(next);
              setSelectedKey(expKeys(next)[0] ?? null);
            }}
            onMessage={setMsg}
          />
        ) : (
          <div className="abnxt-admin__empty">
            No experiment selected. Add one to begin.
          </div>
        )}
      </div>
    </div>
  );
}

interface ListProps {
  config: AbConfig;
  keys: string[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
  onToggle: (key: string) => void;
}

function ExperimentList(props: ListProps) {
  if (props.keys.length === 0) {
    return (
      <div className="abnxt-admin__list">
        <div className="abnxt-admin__empty">No experiments yet.</div>
      </div>
    );
  }
  return (
    <div className="abnxt-admin__list">
      {props.keys.map((key) => {
        const exp = props.config.experiments[key];
        const split = exp.variants.map((v) => v.key).join('/');
        const selected = key === props.selectedKey;
        return (
          <div
            key={key}
            className={
              'abnxt-admin__list-item' +
              (selected ? ' abnxt-admin__list-item--selected' : '')
            }
            onClick={() => props.onSelect(key)}
          >
            <div className="abnxt-admin__list-main">
              <span className="abnxt-admin__list-name">{exp.name}</span>
              <span className="abnxt-admin__list-key">{key}</span>
              <span className="abnxt-admin__list-split">{split}</span>
            </div>
            <button
              className="abnxt-admin__btn"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                props.onToggle(key);
              }}
            >
              {exp.active ? 'on' : 'off'}
            </button>
          </div>
        );
      })}
    </div>
  );
}

interface EditorProps {
  expKey: string;
  experiment: Experiment;
  config: AbConfig;
  onApply: (next: AbConfig) => void;
  onDelete: (key: string) => void;
  onMessage: (msg: string) => void;
}

function ExperimentEditor(props: EditorProps) {
  const { expKey, experiment, config } = props;

  // 변이별 % (정규화) — 표시 전용, 항상 합 100.
  const percents = useMemo(
    () => normalizeToPercents(experiment.variants),
    [experiment.variants],
  );

  // 시뮬레이션 분배(1000명). 렌더 경로 예외 금지를 위해 try/catch 폴백.
  const sim = useMemo<Record<string, number>>(() => {
    try {
      return simulateSplit(experiment, SIM_N);
    } catch {
      return {};
    }
  }, [experiment]);
  const simMax = Math.max(1, ...Object.values(sim));

  /** variants를 갈아끼운 새 config 적용(setField가 variants를 다루지 않으므로 upsert 경유). */
  const applyVariants = useCallback(
    (variants: Experiment['variants']): void => {
      props.onApply({
        ...config,
        experiments: {
          ...config.experiments,
          [expKey]: { ...experiment, variants },
        },
      });
    },
    [config, expKey, experiment, props],
  );

  return (
    <div className="abnxt-admin__editor">
      <div className="abnxt-admin__field">
        <label htmlFor="abnxt-f-name">name</label>
        <input
          id="abnxt-f-name"
          className="abnxt-admin__input"
          type="text"
          value={experiment.name}
          onChange={(e) =>
            props.onApply(setField(config, expKey, { name: e.target.value }))
          }
        />
      </div>

      <div className="abnxt-admin__field">
        <label htmlFor="abnxt-f-active">active</label>
        <input
          id="abnxt-f-active"
          type="checkbox"
          checked={experiment.active}
          onChange={() => props.onApply(toggleActive(config, expKey))}
        />
      </div>

      <div className="abnxt-admin__field">
        <label htmlFor="abnxt-f-sticky">sticky</label>
        <input
          id="abnxt-f-sticky"
          type="checkbox"
          checked={experiment.sticky}
          onChange={(e) =>
            props.onApply(
              setField(config, expKey, { sticky: e.target.checked }),
            )
          }
        />
      </div>

      <div className="abnxt-admin__field">
        <label htmlFor="abnxt-f-seed">seed</label>
        <input
          id="abnxt-f-seed"
          className="abnxt-admin__input"
          type="text"
          value={experiment.seed}
          onChange={(e) =>
            props.onApply(setField(config, expKey, { seed: e.target.value }))
          }
        />
      </div>

      <div className="abnxt-admin__field">
        <label htmlFor="abnxt-f-control">control</label>
        <select
          id="abnxt-f-control"
          className="abnxt-admin__input"
          value={experiment.control}
          onChange={(e) =>
            props.onApply(setField(config, expKey, { control: e.target.value }))
          }
        >
          {experiment.variants.map((v) => (
            <option
              key={v.key}
              value={v.key}
            >
              {v.key}
            </option>
          ))}
        </select>
      </div>

      <div className="abnxt-admin__field">
        <label>variants</label>
      </div>
      {experiment.variants.map((v) => (
        <div
          key={v.key}
          className="abnxt-admin__variant"
        >
          <span className="abnxt-admin__variant-key">{v.key}</span>
          <input
            className="abnxt-admin__input"
            type="range"
            min={0}
            max={100}
            value={v.weight}
            aria-label={`weight ${v.key}`}
            onChange={(e) =>
              applyVariants(
                setWeight(experiment.variants, v.key, Number(e.target.value)),
              )
            }
          />
          <span className="abnxt-admin__variant-pct">
            {percents[v.key] ?? 0}%
          </span>
          <button
            className="abnxt-admin__btn"
            type="button"
            onClick={() => setOverride(expKey, v.key)}
          >
            Preview
          </button>
          <button
            className="abnxt-admin__btn"
            type="button"
            onClick={() => clearOverride(expKey)}
          >
            Clear
          </button>
          <button
            className="abnxt-admin__btn abnxt-admin__btn--danger"
            type="button"
            aria-label={`remove ${v.key}`}
            onClick={() =>
              applyVariants(removeVariant(experiment.variants, v.key))
            }
          >
            ✕
          </button>
        </div>
      ))}
      <div className="abnxt-admin__field">
        <button
          className="abnxt-admin__btn"
          type="button"
          onClick={() => applyVariants(addVariant(experiment.variants))}
        >
          + Variant
        </button>
      </div>

      <div className="abnxt-admin__sim">
        <strong>Simulation ({SIM_N})</strong>
        {experiment.variants.map((v) => {
          const count = sim[v.key] ?? 0;
          const pct = Math.round((count / SIM_N) * 100);
          return (
            <div
              key={v.key}
              className="abnxt-admin__sim-row"
            >
              <span className="abnxt-admin__variant-key">{v.key}</span>
              <span
                className="abnxt-admin__sim-bar"
                style={{ width: `${(count / simMax) * 200}px` }}
              />
              <span className="abnxt-admin__variant-pct">{pct}%</span>
            </div>
          );
        })}
      </div>

      <div
        className="abnxt-admin__field"
        style={{ marginTop: 16 }}
      >
        <button
          className="abnxt-admin__btn abnxt-admin__btn--danger"
          type="button"
          onClick={() => props.onDelete(expKey)}
        >
          Delete
        </button>
      </div>
    </div>
  );
}
