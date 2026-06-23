'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import type { AbConfig, Experiment } from '@abnxt/core';
import {
  toggleActive,
  setField,
  addExperiment,
  normalizeToPercents,
  addVariant,
  removeVariant,
  redistributeWeights,
  bumpResetEpoch,
  simulateSplit,
  setOverride,
  clearOverride,
  serializeConfig,
  parseConfigJson,
  apiStorage,
  variantColor,
  ADMIN_CSS,
} from '@abnxt/core/admin';

/** React/Vue 공통 props(형평성: 동일 이름/기본값). */
export interface AbnxtAdminProps {
  /** config GET/PUT 엔드포인트. 기본 '/api/abnxt/config'. */
  configEndpoint?: string;
  /** 키 검증/로그아웃 엔드포인트. 기본 '/api/abnxt/auth'. */
  authEndpoint?: string;
  /** 헤더 타이틀. 기본 'abnxt admin'. */
  title?: string;
  /** Close(닫기) 동작. 미지정 시 history.back() 폴백. */
  onClose?: () => void;
}

type AuthState = 'loading' | 'gate' | 'authed';

const EMPTY: AbConfig = { version: 1, experiments: {} };
const SIM_N = 1000;

/* ── 인라인 SVG 아이콘(의존성 0, currentColor) ──────────────── */
function Svg({ children, size = 16 }: { children: ReactNode; size?: number }) {
  return (
    <svg
      className="abnxt-admin__icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}
const IconCheck = () => (
  <Svg>
    <path d="M20 6L9 17l-5-5" />
  </Svg>
);
const IconDownload = () => (
  <Svg>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="M7 10l5 5 5-5" />
    <path d="M12 15V3" />
  </Svg>
);
const IconUpload = () => (
  <Svg>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="M17 8l-5-5-5 5" />
    <path d="M12 3v12" />
  </Svg>
);
const IconPower = () => (
  <Svg>
    <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
    <path d="M12 2v10" />
  </Svg>
);
const IconPlus = () => (
  <Svg>
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </Svg>
);
const IconX = ({ size = 16 }: { size?: number }) => (
  <Svg size={size}>
    <path d="M18 6L6 18" />
    <path d="M6 6l12 12" />
  </Svg>
);
const IconEye = () => (
  <Svg>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
    <circle
      cx="12"
      cy="12"
      r="3"
    />
  </Svg>
);
const IconEyeOff = () => (
  <Svg>
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c6.5 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3.5 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
    <path d="M2 2l20 20" />
  </Svg>
);
const IconRefresh = () => (
  <Svg>
    <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
    <path d="M21 3v5h-5" />
    <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
    <path d="M3 21v-5h5" />
  </Svg>
);
const IconLock = ({ size = 16 }: { size?: number }) => (
  <Svg size={size}>
    <rect
      x="3"
      y="11"
      width="18"
      height="11"
      rx="2"
    />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </Svg>
);

/** experiments 레코드의 안정적 key 목록(삽입 순서 유지). */
function expKeys(cfg: AbConfig): string[] {
  return Object.keys(cfg.experiments);
}

export function AbnxtAdmin(props: AbnxtAdminProps) {
  const configEndpoint = props.configEndpoint ?? '/api/abnxt/config';
  const authEndpoint = props.authEndpoint ?? '/api/abnxt/auth';
  const title = props.title ?? 'abnxt admin';

  const storage = useMemo(
    () => apiStorage({ base: configEndpoint }),
    [configEndpoint],
  );

  const [authState, setAuthState] = useState<AuthState>('loading');
  const [config, setConfig] = useState<AbConfig>(EMPTY);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgKind, setMsgKind] = useState<'info' | 'error' | 'success'>('info');
  const [gateError, setGateError] = useState('');
  const [keyInput, setKeyInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Shadow DOM: 호스트 CSS 격리(폰트만 상속) ──────────────
  const hostRef = useRef<HTMLDivElement>(null);
  const [shadow, setShadow] = useState<ShadowRoot | null>(null);
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let root = host.shadowRoot;
    if (!root) {
      root = host.attachShadow({ mode: 'open' });
      const style = document.createElement('style');
      style.textContent = ADMIN_CSS;
      root.appendChild(style);
    }
    setShadow(root);
  }, []);

  const flash = useCallback(
    (text: string, kind: 'info' | 'error' | 'success' = 'info'): void => {
      setMsg(text);
      setMsgKind(kind);
    },
    [],
  );

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
        flash(`Loaded with warning: ${parsed.message}`, 'error');
    } catch (err) {
      setAuthState('gate');
      setGateError(err instanceof Error ? err.message : 'Network error');
    }
  }, [configEndpoint, flash]);

  useEffect(() => {
    void fetchConfig();
  }, [fetchConfig]);

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

  const close = useCallback((): void => {
    if (props.onClose) {
      props.onClose();
      return;
    }
    if (typeof window !== 'undefined') {
      if (window.history.length > 1) window.history.back();
      else window.location.assign('/');
    }
  }, [props]);

  /** 편집 결과 적용 공통(core 함수가 반환한 새 config). save 전까지 서버 미반영. */
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
      flash('Saved', 'success');
    } catch (err) {
      flash(err instanceof Error ? err.message : 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  }, [storage, config, flash]);

  const onAddExperiment = useCallback((): void => {
    const next = addExperiment(config);
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
      flash(err instanceof Error ? err.message : 'Export failed', 'error');
    }
  }, [config, flash]);

  const onImportFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;
      try {
        const text = await file.text();
        const parsed = parseConfigJson(text);
        if (!parsed.ok) {
          flash(
            `Import failed: ${parsed.message ?? 'invalid config'}`,
            'error',
          );
          return;
        }
        setConfig(parsed.config);
        setSelectedKey(expKeys(parsed.config)[0] ?? null);
        setDirty(true);
        flash('Imported (unsaved)', 'success');
      } catch (err) {
        flash(err instanceof Error ? err.message : 'Import failed', 'error');
      }
    },
    [flash],
  );

  /** 전체 사용자 강제 재배정(쿠키 초기화). 확인 후 dirty 처리, save 시 반영. */
  const confirmCookieReset = useCallback((): void => {
    applyConfig(bumpResetEpoch(config));
    setConfirmReset(false);
    flash('All-user reset queued — press Save to apply', 'success');
  }, [config, applyConfig, flash]);

  // ── 화면 컨텐츠 구성 ──────────────────────────────────────
  let content: ReactNode;

  if (authState === 'loading') {
    content = (
      <div className="abnxt-modal__overlay">
        <div className="abnxt-modal__card">
          <div className="abnxt-admin__empty">
            <span className="abnxt-admin__spinner" />
          </div>
        </div>
      </div>
    );
  } else if (authState === 'gate') {
    content = (
      <div className="abnxt-modal__overlay">
        <div className="abnxt-modal__card">
          <div className="abnxt-admin__gate">
            <form
              className="abnxt-admin__gate-card"
              onSubmit={submitKey}
            >
              <div className="abnxt-admin__gate-logo">
                <IconLock size={22} />
              </div>
              <div className="abnxt-admin__gate-title">{title}</div>
              <p className="abnxt-admin__gate-text">
                관리자 키를 입력해 어드민에 접근하세요. 키는 서버에서만 검증되며
                HMAC 세션 쿠키로 교환됩니다.
              </p>
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
                <IconLock />
                Unlock
              </button>
              {gateError ? (
                <div
                  className="abnxt-admin__msg abnxt-admin__msg--error"
                  role="alert"
                  style={{ marginTop: 12 }}
                >
                  {gateError}
                </div>
              ) : null}
            </form>
          </div>
        </div>
      </div>
    );
  } else {
    const keys = expKeys(config);
    const selected =
      selectedKey && config.experiments[selectedKey]
        ? config.experiments[selectedKey]
        : null;

    content = (
      <div className="abnxt-modal__overlay">
        <div className="abnxt-modal__card">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            style={{ display: 'none' }}
            onChange={onImportFile}
            data-testid="abnxt-import-input"
          />
          <header className="abnxt-modal__header">
            <div className="abnxt-modal__brand">
              <span className="abnxt-modal__logo">
                <span style={{ fontWeight: 800, fontSize: 13 }}>AB</span>
              </span>
              <div>
                <div className="abnxt-modal__title">{title}</div>
                <div className="abnxt-modal__sub">
                  A/B 테스트 구성 · 저장 전까지 미반영
                </div>
              </div>
            </div>
            {dirty ? (
              <span className="abnxt-modal__badge">
                <span className="abnxt-modal__badge-dot" />
                미저장 변경
              </span>
            ) : null}
            <div className="abnxt-modal__actions">
              <button
                className="abnxt-admin__btn abnxt-admin__btn--sm"
                type="button"
                onClick={onExport}
                title="현재 구성을 JSON 파일로 내보내기"
              >
                <IconDownload />
                Export
              </button>
              <button
                className="abnxt-admin__btn abnxt-admin__btn--sm"
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="JSON 파일에서 구성 가져오기(저장 전까지 미반영)"
              >
                <IconUpload />
                Import
              </button>
              <button
                className={
                  'abnxt-admin__btn abnxt-admin__btn--primary abnxt-admin__btn--sm'
                }
                type="button"
                onClick={() => void save()}
                disabled={!dirty || saving}
                title="변경사항을 서버에 저장"
              >
                <IconCheck />
                Save
              </button>
              <button
                className="abnxt-admin__btn abnxt-admin__btn--ghost abnxt-admin__btn--sm"
                type="button"
                onClick={() => void logout()}
                title="세션 종료"
              >
                <IconPower />
                Logout
              </button>
              <button
                className="abnxt-admin__btn abnxt-admin__btn--icon abnxt-admin__btn--ghost"
                type="button"
                onClick={close}
                aria-label="Close"
                title="닫기"
              >
                <IconX />
              </button>
            </div>
          </header>

          {msg ? (
            <div
              className={
                'abnxt-admin__msg' +
                (msgKind === 'error'
                  ? ' abnxt-admin__msg--error'
                  : msgKind === 'success'
                    ? ' abnxt-admin__msg--success'
                    : '')
              }
              role="status"
            >
              {msg}
            </div>
          ) : null}

          <div className="abnxt-modal__body">
            <aside className="abnxt-admin__sidebar">
              <div className="abnxt-admin__sidebar-head">
                <span className="abnxt-admin__sidebar-title">실험 목록</span>
                <button
                  className="abnxt-admin__btn abnxt-admin__btn--sm"
                  type="button"
                  onClick={onAddExperiment}
                  title="새 실험 추가"
                >
                  <IconPlus />
                  추가
                </button>
              </div>
              <ExperimentList
                config={config}
                keys={keys}
                selectedKey={selectedKey}
                onSelect={setSelectedKey}
                onToggle={(k) => applyConfig(toggleActive(config, k))}
              />
            </aside>

            {selected && selectedKey ? (
              <ExperimentEditor
                expKey={selectedKey}
                experiment={selected}
                config={config}
                onApply={applyConfig}
                onMessage={flash}
                onReset={() => setConfirmReset(true)}
              />
            ) : (
              <div className="abnxt-admin__empty">
                선택된 실험이 없습니다. 왼쪽에서 실험을 추가해 시작하세요.
              </div>
            )}
          </div>

          {confirmReset ? (
            <div
              className="abnxt-admin__confirm"
              role="dialog"
              aria-modal="true"
            >
              <div className="abnxt-admin__confirm-card">
                <div className="abnxt-admin__confirm-title">
                  모든 사용자 쿠키를 초기화할까요?
                </div>
                <div className="abnxt-admin__confirm-text">
                  모든 방문자의 기존 배정(sticky)이 무효화되어 다음 방문 시
                  재배정됩니다. 이 작업은 <strong>저장(Save)</strong> 후에
                  적용됩니다.
                </div>
                <div className="abnxt-admin__confirm-actions">
                  <button
                    className="abnxt-admin__btn"
                    type="button"
                    onClick={() => setConfirmReset(false)}
                  >
                    취소
                  </button>
                  <button
                    className="abnxt-admin__btn abnxt-admin__btn--danger"
                    type="button"
                    onClick={confirmCookieReset}
                  >
                    <IconRefresh />
                    초기화 예약
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={hostRef}
      data-abnxt-admin-host=""
    >
      {shadow ? createPortal(content, shadow as unknown as Element) : null}
    </div>
  );
}

/* ── 좌측 실험 리스트 ──────────────────────────────────────── */
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
        <div className="abnxt-admin__empty">아직 실험이 없습니다.</div>
      </div>
    );
  }
  return (
    <div className="abnxt-admin__list">
      {props.keys.map((key) => {
        const exp = props.config.experiments[key];
        const pcts = safePercents(exp);
        const split = exp.variants
          .map((v) => `${v.key} ${pcts[v.key] ?? 0}%`)
          .join(' · ');
        const selected = key === props.selectedKey;
        return (
          <button
            key={key}
            type="button"
            className={
              'abnxt-admin__list-item' +
              (selected ? ' abnxt-admin__list-item--selected' : '')
            }
            onClick={() => props.onSelect(key)}
          >
            <div className="abnxt-admin__list-main">
              <span className="abnxt-admin__list-name">{exp.name || key}</span>
              <span className="abnxt-admin__list-meta">
                <span className="abnxt-admin__list-key">{key}</span>
              </span>
              <span className="abnxt-admin__list-meta">{split}</span>
            </div>
            <span
              className={
                'abnxt-admin__pill ' +
                (exp.active
                  ? 'abnxt-admin__pill--on'
                  : 'abnxt-admin__pill--off')
              }
            >
              {exp.active ? 'on' : 'off'}
            </span>
            <span
              className="abnxt-admin__switch"
              role="switch"
              aria-checked={exp.active}
              aria-label={`${exp.name || key} 활성화 토글`}
              tabIndex={0}
              data-on={exp.active}
              onClick={(e) => {
                e.stopPropagation();
                props.onToggle(key);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  props.onToggle(key);
                }
              }}
            />
          </button>
        );
      })}
    </div>
  );
}

function safePercents(exp: Experiment): Record<string, number> {
  try {
    return normalizeToPercents(exp.variants);
  } catch {
    return {};
  }
}

/* ── 우측 실험 에디터 ──────────────────────────────────────── */
interface EditorProps {
  expKey: string;
  experiment: Experiment;
  config: AbConfig;
  onApply: (next: AbConfig) => void;
  onMessage: (msg: string, kind?: 'info' | 'error' | 'success') => void;
  onReset: () => void;
}

function ExperimentEditor(props: EditorProps) {
  const { expKey, experiment, config } = props;

  const percents = useMemo(() => safePercents(experiment), [experiment]);

  const sim = useMemo<Record<string, number>>(() => {
    try {
      return simulateSplit(experiment, SIM_N);
    } catch {
      return {};
    }
  }, [experiment]);
  const simMax = Math.max(1, ...Object.values(sim));

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
      <div className="abnxt-admin__editor-head">
        <div style={{ marginRight: 'auto' }}>
          <div className="abnxt-admin__editor-title">
            {experiment.name || expKey}
          </div>
          <div className="abnxt-admin__editor-key">{expKey}</div>
        </div>
        <span
          className={
            'abnxt-admin__pill ' +
            (experiment.active
              ? 'abnxt-admin__pill--on'
              : 'abnxt-admin__pill--off')
          }
        >
          {experiment.active ? '활성' : '비활성'}
        </span>
      </div>

      {/* 기본 설정 */}
      <section className="abnxt-admin__section">
        <div className="abnxt-admin__section-title">기본 설정</div>

        <div className="abnxt-admin__field">
          <div className="abnxt-admin__field-head">
            <label
              className="abnxt-admin__label"
              htmlFor="abnxt-f-name"
            >
              이름
            </label>
          </div>
          <input
            id="abnxt-f-name"
            className="abnxt-admin__input"
            type="text"
            value={experiment.name}
            onChange={(e) =>
              props.onApply(setField(config, expKey, { name: e.target.value }))
            }
          />
          <p className="abnxt-admin__hint">
            대시보드/분석에 표시되는 사람이 읽는 이름입니다.
          </p>
        </div>

        <div className="abnxt-admin__field abnxt-admin__field--inline">
          <div className="abnxt-admin__field-head">
            <label className="abnxt-admin__label">활성화</label>
          </div>
          <span
            className="abnxt-admin__switch"
            role="switch"
            aria-checked={experiment.active}
            aria-label="활성화"
            tabIndex={0}
            data-on={experiment.active}
            onClick={() => props.onApply(toggleActive(config, expKey))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                props.onApply(toggleActive(config, expKey));
              }
            }}
          />
        </div>
        <p
          className="abnxt-admin__hint"
          style={{ marginTop: -8 }}
        >
          끄면 모든 방문자에게 control 변이가 강제되고 노출 이벤트가 발생하지
          않습니다. (키 삭제 대신 비활성화로 운영)
        </p>

        <div className="abnxt-admin__field abnxt-admin__field--inline">
          <div className="abnxt-admin__field-head">
            <label className="abnxt-admin__label">Sticky</label>
          </div>
          <span
            className="abnxt-admin__switch"
            role="switch"
            aria-checked={experiment.sticky}
            aria-label="sticky"
            tabIndex={0}
            data-on={experiment.sticky}
            onClick={() =>
              props.onApply(
                setField(config, expKey, { sticky: !experiment.sticky }),
              )
            }
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                props.onApply(
                  setField(config, expKey, { sticky: !experiment.sticky }),
                );
              }
            }}
          />
        </div>
        <p
          className="abnxt-admin__hint"
          style={{ marginTop: -8 }}
        >
          켜면 한 번 배정된 변이가 쿠키에 저장되어 재방문 시 유지됩니다.
        </p>

        <div className="abnxt-admin__field">
          <div className="abnxt-admin__field-head">
            <label
              className="abnxt-admin__label"
              htmlFor="abnxt-f-seed"
            >
              Seed
            </label>
          </div>
          <input
            id="abnxt-f-seed"
            className="abnxt-admin__input"
            type="text"
            value={experiment.seed}
            onChange={(e) =>
              props.onApply(setField(config, expKey, { seed: e.target.value }))
            }
          />
          <p className="abnxt-admin__hint">
            결정적 해시 시드. 같은 방문자라도 시드가 다르면 다른 실험에
            독립적으로 배정됩니다.
          </p>
        </div>

        <div className="abnxt-admin__field">
          <div className="abnxt-admin__field-head">
            <label
              className="abnxt-admin__label"
              htmlFor="abnxt-f-control"
            >
              Control
            </label>
          </div>
          <select
            id="abnxt-f-control"
            className="abnxt-admin__select"
            value={experiment.control}
            onChange={(e) =>
              props.onApply(
                setField(config, expKey, { control: e.target.value }),
              )
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
          <p className="abnxt-admin__hint">
            기준(대조) 변이. 비활성/폴백 시 이 변이가 사용됩니다.
          </p>
        </div>
      </section>

      {/* 변이 + 동적 가중치 */}
      <section className="abnxt-admin__section">
        <div className="abnxt-admin__section-title">변이 & 가중치</div>
        <p
          className="abnxt-admin__hint"
          style={{ marginBottom: 12 }}
        >
          슬라이더로 비중(%)을 조정하면 나머지 변이가 자동으로 비례 조정되어
          합이 항상 100%로 유지됩니다.
        </p>
        {experiment.variants.map((v, i) => (
          <div
            key={v.key}
            className="abnxt-admin__variant"
          >
            <span
              className="abnxt-admin__variant-key"
              style={{ background: variantColor(i) }}
            >
              {v.key}
            </span>
            <div className="abnxt-admin__variant-track">
              <div className="abnxt-admin__variant-top">
                <div className="abnxt-admin__bar">
                  <span
                    className="abnxt-admin__bar-fill"
                    style={{
                      width: `${percents[v.key] ?? 0}%`,
                      background: variantColor(i),
                    }}
                  />
                </div>
                <span className="abnxt-admin__variant-pct">
                  {percents[v.key] ?? 0}%
                </span>
              </div>
              <input
                className="abnxt-admin__range"
                type="range"
                min={0}
                max={100}
                value={percents[v.key] ?? 0}
                aria-label={`weight ${v.key}`}
                onChange={(e) =>
                  applyVariants(
                    redistributeWeights(
                      experiment.variants,
                      v.key,
                      Number(e.target.value),
                    ),
                  )
                }
              />
            </div>
            <div className="abnxt-admin__variant-actions">
              <button
                className="abnxt-admin__btn abnxt-admin__btn--icon abnxt-admin__btn--ghost"
                type="button"
                onClick={() => {
                  setOverride(expKey, v.key);
                  props.onMessage(`Preview: ${expKey} → ${v.key}`, 'info');
                }}
                aria-label={`preview ${v.key}`}
                title="이 변이로 미리보기(내 브라우저 override 쿠키)"
              >
                <IconEye />
              </button>
              <button
                className="abnxt-admin__btn abnxt-admin__btn--icon abnxt-admin__btn--ghost"
                type="button"
                onClick={() => {
                  clearOverride(expKey);
                  props.onMessage(`Preview cleared: ${expKey}`, 'info');
                }}
                aria-label={`clear preview ${v.key}`}
                title="미리보기 해제"
              >
                <IconEyeOff />
              </button>
              <button
                className="abnxt-admin__btn abnxt-admin__btn--icon abnxt-admin__btn--danger"
                type="button"
                aria-label={`remove ${v.key}`}
                title="변이 제거"
                disabled={experiment.variants.length <= 1}
                onClick={() =>
                  applyVariants(removeVariant(experiment.variants, v.key))
                }
              >
                <IconX />
              </button>
            </div>
          </div>
        ))}
        <button
          className="abnxt-admin__btn"
          type="button"
          onClick={() => applyVariants(addVariant(experiment.variants))}
          style={{ marginTop: 4 }}
        >
          <IconPlus />
          변이 추가
        </button>
      </section>

      {/* 시뮬레이션 */}
      <section className="abnxt-admin__section">
        <div className="abnxt-admin__section-title">
          배정 시뮬레이션 ({SIM_N.toLocaleString()}명)
        </div>
        <div className="abnxt-admin__sim">
          {experiment.variants.map((v, i) => {
            const count = sim[v.key] ?? 0;
            const pct = Math.round((count / SIM_N) * 100);
            return (
              <div
                key={v.key}
                className="abnxt-admin__sim-row"
              >
                <span
                  className="abnxt-admin__variant-key"
                  style={{ background: variantColor(i), width: 24, height: 24 }}
                >
                  {v.key}
                </span>
                <div className="abnxt-admin__sim-track">
                  <span
                    className="abnxt-admin__sim-bar"
                    style={{
                      width: `${(count / simMax) * 100}%`,
                      background: variantColor(i),
                    }}
                  />
                </div>
                <span className="abnxt-admin__sim-val abnxt-admin__variant-pct">
                  {pct}%
                </span>
              </div>
            );
          })}
        </div>
        <p
          className="abnxt-admin__hint"
          style={{ marginTop: 8 }}
        >
          가상 방문자 {SIM_N.toLocaleString()}명을 결정적 해시로 배정한 예상
          분포입니다.
        </p>
      </section>

      {/* 위험 영역 */}
      <section className="abnxt-admin__danger-zone">
        <div className="abnxt-admin__danger-title">위험 영역</div>
        <div className="abnxt-admin__danger-text">
          모든 사용자의 배정 쿠키를 초기화하여 전체 재배정을 강제합니다. 저장 후
          적용됩니다.
        </div>
        <button
          className="abnxt-admin__btn abnxt-admin__btn--danger"
          type="button"
          onClick={props.onReset}
        >
          <IconRefresh />
          모든 사용자 쿠키 초기화
        </button>
      </section>
    </div>
  );
}
