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
import { MAX_VARIANTS } from '@abnxt/core';
import {
  toggleActive,
  setField,
  weightSummary,
  weightDisplay,
  addVariant,
  removeVariant,
  redistributeWeights,
  setWeight,
  bumpResetEpoch,
  serializeConfig,
  parseConfigJson,
  apiStorage,
  variantColor,
  ADMIN_CSS,
  adminT,
  detectAdminLang,
  type AdminLang,
  type AdminDict,
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
type T = (
  key: keyof AdminDict,
  vars?: Record<string, string | number>,
) => string;

const EMPTY: AbConfig = { version: 1, experiments: {} };

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
const IconHome = () => (
  <Svg>
    <path d="M3 9.5L12 3l9 6.5" />
    <path d="M5 10v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V10" />
    <path d="M9 21v-6h6v6" />
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
  // 서버에 저장된 마지막 스냅샷. 실험 전환 시 편집본(config)을 여기로 되돌려 미저장 변경을 폐기.
  const [savedConfig, setSavedConfig] = useState<AbConfig>(EMPTY);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgKind, setMsgKind] = useState<'info' | 'error' | 'success'>('info');
  const [gateError, setGateError] = useState('');
  const [keyInput, setKeyInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [gateBusy, setGateBusy] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [lang, setLang] = useState<AdminLang>('en');

  // 호스트 페이지 언어 감지(기본 영어, 한국어면 ko). 마운트 후 1회.
  useEffect(() => setLang(detectAdminLang()), []);
  const t = useCallback<T>((key, vars) => adminT(lang, key, vars), [lang]);

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
      setSavedConfig(parsed.config);
      setSelectedKey((prev) => {
        const keys = expKeys(parsed.config);
        if (prev && keys.includes(prev)) return prev;
        return keys[0] ?? null;
      });
      setDirty(false);
      setAuthState('authed');
      if (!parsed.ok && parsed.message)
        flash(adminT(lang, 'loadWarn', { msg: parsed.message }), 'error');
    } catch (err) {
      setAuthState('gate');
      setGateError(err instanceof Error ? err.message : 'Network error');
    }
  }, [configEndpoint, flash, lang]);

  useEffect(() => {
    void fetchConfig();
  }, [fetchConfig]);

  const submitKey = useCallback(
    async (e: React.FormEvent): Promise<void> => {
      e.preventDefault();
      setGateError('');
      setGateBusy(true);
      try {
        const res = await fetch(authEndpoint, {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ key: keyInput }),
        });
        if (!res.ok) {
          setGateError(t('invalidKey'));
          return;
        }
        setKeyInput('');
        await fetchConfig();
      } catch (err) {
        setGateError(err instanceof Error ? err.message : 'Network error');
      } finally {
        setGateBusy(false);
      }
    },
    [authEndpoint, keyInput, fetchConfig, t],
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
    setSavedConfig(EMPTY);
    setSelectedKey(null);
    setDirty(false);
    setMsg('');
    setAuthState('gate');
  }, [authEndpoint]);

  /** 실험 선택 전환 — 미저장 편집을 폐기(저장본 복원)하고 알럿/더티 초기화. */
  const selectExperiment = useCallback(
    (k: string): void => {
      if (k === selectedKey) return;
      setConfig(savedConfig);
      setDirty(false);
      setMsg('');
      setSelectedKey(k);
    },
    [savedConfig, selectedKey],
  );

  // 어드민은 모달이 아니라 페이지 — 닫기 대신 루트('/')로 이동.
  const goHome = useCallback((): void => {
    if (props.onClose) {
      props.onClose();
      return;
    }
    if (typeof window !== 'undefined') window.location.assign('/');
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
      setSavedConfig(config);
      setDirty(false);
      flash(t('saved'), 'success');
    } catch (err) {
      flash(err instanceof Error ? err.message : t('saveFailed'), 'error');
    } finally {
      setSaving(false);
    }
  }, [storage, config, flash, t]);

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
      flash(err instanceof Error ? err.message : t('exportFailed'), 'error');
    }
  }, [config, flash, t]);

  const onImportFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;
      try {
        const text = await file.text();
        const parsed = parseConfigJson(text);
        if (!parsed.ok) {
          flash(`${t('importFailed')}: ${parsed.message ?? ''}`, 'error');
          return;
        }
        setConfig(parsed.config);
        // import는 전체 교체(미저장) — savedConfig도 갱신해 실험 전환 시 폐기되지 않게.
        setSavedConfig(parsed.config);
        setSelectedKey(expKeys(parsed.config)[0] ?? null);
        setDirty(true);
        flash(t('imported'), 'success');
      } catch (err) {
        flash(err instanceof Error ? err.message : t('importFailed'), 'error');
      }
    },
    [flash, t],
  );

  /** 전체 사용자 강제 재배정(쿠키 초기화) — 전역 동작이라 확인 즉시 저장(실험별 저장과 독립). */
  const confirmCookieReset = useCallback(async (): Promise<void> => {
    setConfirmReset(false);
    setSaving(true);
    setMsg('');
    const next = bumpResetEpoch(savedConfig);
    try {
      await storage.save(next);
      setConfig(next);
      setSavedConfig(next);
      setDirty(false);
      flash(t('resetDone'), 'success');
    } catch (err) {
      flash(err instanceof Error ? err.message : t('saveFailed'), 'error');
    } finally {
      setSaving(false);
    }
  }, [savedConfig, storage, flash, t]);

  const langToggle = (
    <div
      className="abnxt-admin__lang"
      role="group"
      aria-label={t('langToggle')}
    >
      <button
        type="button"
        data-on={lang === 'en'}
        onClick={() => setLang('en')}
      >
        EN
      </button>
      <button
        type="button"
        data-on={lang === 'ko'}
        onClick={() => setLang('ko')}
      >
        KO
      </button>
    </div>
  );

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
          <div className="abnxt-admin__gate-lang">{langToggle}</div>
          <div className="abnxt-admin__gate">
            <form
              className="abnxt-admin__gate-card"
              onSubmit={submitKey}
            >
              <div className="abnxt-admin__gate-logo">
                <IconLock size={22} />
              </div>
              <div className="abnxt-admin__gate-title">{title}</div>
              <p className="abnxt-admin__gate-text">{t('gateText')}</p>
              <input
                className="abnxt-admin__gate-input"
                type="password"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder={t('adminKey')}
                aria-label={t('adminKey')}
                autoComplete="current-password"
              />
              <button
                className="abnxt-admin__btn abnxt-admin__btn--primary"
                type="submit"
                disabled={gateBusy}
              >
                <IconLock />
                {t('unlock')}
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
              <div style={{ minWidth: 0 }}>
                <div className="abnxt-modal__title">{title}</div>
                <div className="abnxt-modal__sub">{t('headerSub')}</div>
              </div>
            </div>
            {dirty ? (
              <span className="abnxt-modal__badge">
                <span className="abnxt-modal__badge-dot" />
                {t('unsaved')}
              </span>
            ) : null}
            <div className="abnxt-modal__actions">
              {langToggle}
              <button
                className="abnxt-admin__btn abnxt-admin__btn--sm"
                type="button"
                onClick={onExport}
                title={t('tipExport')}
              >
                <IconDownload />
                {t('export')}
              </button>
              <button
                className="abnxt-admin__btn abnxt-admin__btn--sm"
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title={t('tipImport')}
              >
                <IconUpload />
                {t('import')}
              </button>
              <button
                className="abnxt-admin__btn abnxt-admin__btn--ghost abnxt-admin__btn--sm"
                type="button"
                onClick={() => void logout()}
                title={t('tipLogout')}
              >
                <IconPower />
                {t('logout')}
              </button>
              <button
                className="abnxt-admin__btn abnxt-admin__btn--icon abnxt-admin__btn--ghost"
                type="button"
                onClick={goHome}
                aria-label={t('home')}
                title={t('tipHome')}
              >
                <IconHome />
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
                <span className="abnxt-admin__sidebar-title">
                  {t('listTitle')}
                </span>
              </div>
              <ExperimentList
                config={config}
                keys={keys}
                selectedKey={selectedKey}
                onSelect={selectExperiment}
                t={t}
              />
              {/* 전역 위험 영역(전체 실험/전체 사용자 재배정) — 실험별 아님 */}
              <div className="abnxt-admin__sidebar-foot">
                <div className="abnxt-admin__danger-zone">
                  <div className="abnxt-admin__danger-title">
                    {t('secDanger')}
                  </div>
                  <div className="abnxt-admin__danger-text">
                    {t('dangerText')}
                  </div>
                  <button
                    className="abnxt-admin__btn abnxt-admin__btn--danger"
                    type="button"
                    onClick={() => setConfirmReset(true)}
                  >
                    <IconRefresh />
                    {t('dangerBtn')}
                  </button>
                </div>
              </div>
            </aside>

            {selected && selectedKey ? (
              <ExperimentEditor
                key={selectedKey}
                expKey={selectedKey}
                experiment={selected}
                config={config}
                onApply={applyConfig}
                dirty={dirty}
                saving={saving}
                onSave={() => void save()}
                t={t}
              />
            ) : (
              <div className="abnxt-admin__empty">{t('noSelection')}</div>
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
                  {t('confirmTitle')}
                </div>
                <div className="abnxt-admin__confirm-text">
                  {t('confirmText')}
                </div>
                <div className="abnxt-admin__confirm-actions">
                  <button
                    className="abnxt-admin__btn"
                    type="button"
                    onClick={() => setConfirmReset(false)}
                  >
                    {t('cancel')}
                  </button>
                  <button
                    className="abnxt-admin__btn abnxt-admin__btn--danger"
                    type="button"
                    onClick={confirmCookieReset}
                  >
                    <IconRefresh />
                    {t('confirmReset')}
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
      {shadow
        ? createPortal(
            <div className="abnxt-admin">{content}</div>,
            shadow as unknown as Element,
          )
        : null}
    </div>
  );
}

/* ── 좌측 실험 리스트 ──────────────────────────────────────── */
interface ListProps {
  config: AbConfig;
  keys: string[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
  t: T;
}

function ExperimentList(props: ListProps) {
  const { t } = props;
  if (props.keys.length === 0) {
    return (
      <div className="abnxt-admin__list">
        <div className="abnxt-admin__empty">{t('listEmpty')}</div>
      </div>
    );
  }
  return (
    <div className="abnxt-admin__list">
      {props.keys.map((key) => {
        const exp = props.config.experiments[key];
        const pcts = weightDisplay(exp.variants);
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
              (selected ? ' abnxt-admin__list-item--selected' : '') +
              (exp.active ? '' : ' abnxt-admin__list-item--inactive')
            }
            onClick={() => props.onSelect(key)}
          >
            <div className="abnxt-admin__list-main">
              <span className="abnxt-admin__list-name">{exp.name || key}</span>
              <span className="abnxt-admin__list-meta abnxt-admin__list-key">
                {key}
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
              {exp.active ? t('active') : t('inactive')}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ── 우측 실험 에디터 ──────────────────────────────────────── */
interface EditorProps {
  expKey: string;
  experiment: Experiment;
  config: AbConfig;
  onApply: (next: AbConfig) => void;
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
  t: T;
}

function ExperimentEditor(props: EditorProps) {
  const { expKey, experiment, config, dirty, saving, onSave, t } = props;

  // 가중치 정책·표시값은 core 공유 헬퍼(weightSummary/weightDisplay)로 — 어댑터 간 동일 보장.
  const percents = useMemo(
    () => weightDisplay(experiment.variants),
    [experiment],
  );
  const {
    autoBalance,
    sum: weightSum,
    over: weightOver,
  } = useMemo(() => weightSummary(experiment.variants), [experiment]);

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
        <div style={{ marginRight: 'auto', minWidth: 0 }}>
          <div className="abnxt-admin__editor-title">
            {experiment.name || expKey}
          </div>
          <div className="abnxt-admin__editor-key">{expKey}</div>
          {experiment.description ? (
            <p className="abnxt-admin__editor-desc">{experiment.description}</p>
          ) : null}
        </div>
        <div className="abnxt-admin__editor-actions">
          <button
            className="abnxt-admin__btn abnxt-admin__btn--primary"
            type="button"
            onClick={onSave}
            disabled={!dirty || saving || weightOver}
            title={t('tipSave')}
          >
            <IconCheck />
            {t('save')}
          </button>
        </div>
      </div>

      {/* 기본 설정 */}
      <section className="abnxt-admin__section">
        <div className="abnxt-admin__section-title">{t('secBasic')}</div>

        <div className="abnxt-admin__field">
          <div className="abnxt-admin__field-head">
            <label
              className="abnxt-admin__label"
              htmlFor="abnxt-f-name"
            >
              {t('fName')}
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
          <p className="abnxt-admin__hint">{t('hName')}</p>
        </div>

        <div className="abnxt-admin__field">
          <div className="abnxt-admin__field-head">
            <label
              className="abnxt-admin__label"
              htmlFor="abnxt-f-desc"
            >
              {t('fDescription')}
            </label>
          </div>
          <textarea
            id="abnxt-f-desc"
            className="abnxt-admin__textarea"
            value={experiment.description ?? ''}
            onChange={(e) =>
              props.onApply(
                setField(config, expKey, { description: e.target.value }),
              )
            }
          />
          <p className="abnxt-admin__hint">{t('hDescription')}</p>
        </div>

        <div className="abnxt-admin__field abnxt-admin__field--inline">
          <div className="abnxt-admin__field-text">
            <label className="abnxt-admin__label">{t('fActive')}</label>
            <p className="abnxt-admin__hint">{t('hActive')}</p>
          </div>
          <span
            className="abnxt-admin__switch"
            role="switch"
            aria-checked={experiment.active}
            aria-label={t('fActive')}
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

        <div className="abnxt-admin__field abnxt-admin__field--inline">
          <div className="abnxt-admin__field-text">
            <label className="abnxt-admin__label">{t('fSticky')}</label>
            <p className="abnxt-admin__hint">{t('hSticky')}</p>
          </div>
          <span
            className="abnxt-admin__switch"
            role="switch"
            aria-checked={experiment.sticky}
            aria-label={t('fSticky')}
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

        <div className="abnxt-admin__field">
          <div className="abnxt-admin__field-head">
            <label
              className="abnxt-admin__label"
              htmlFor="abnxt-f-seed"
            >
              {t('fSeed')}
            </label>
          </div>
          <input
            id="abnxt-f-seed"
            className="abnxt-admin__input"
            type="text"
            value={experiment.seed}
            readOnly
            aria-readonly="true"
          />
          <p className="abnxt-admin__hint">{t('hSeed')}</p>
        </div>

        <div className="abnxt-admin__field">
          <div className="abnxt-admin__field-head">
            <label
              className="abnxt-admin__label"
              htmlFor="abnxt-f-control"
            >
              {t('fControl')}
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
          <p className="abnxt-admin__hint">{t('hControl')}</p>
        </div>
      </section>

      {/* 변이 + 가중치 */}
      <section className="abnxt-admin__section">
        <div className="abnxt-admin__section-title">{t('secVariants')}</div>
        <p className="abnxt-admin__section-intro">
          {autoBalance ? t('hVariants') : t('hVariantsManual')}
        </p>
        {experiment.variants.map((v, i) => {
          const shown = percents[v.key] ?? 0;
          return (
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
                <div className="abnxt-admin__bar">
                  <span
                    className="abnxt-admin__bar-fill"
                    style={{
                      width: `${Math.min(100, shown)}%`,
                      background: variantColor(i),
                    }}
                  />
                  <input
                    className="abnxt-admin__range"
                    type="range"
                    min={0}
                    max={100}
                    value={shown}
                    aria-label={`weight ${v.key}`}
                    style={{ color: variantColor(i) }}
                    onChange={(e) =>
                      applyVariants(
                        autoBalance
                          ? redistributeWeights(
                              experiment.variants,
                              v.key,
                              Number(e.target.value),
                            )
                          : setWeight(
                              experiment.variants,
                              v.key,
                              Number(e.target.value),
                            ),
                      )
                    }
                  />
                </div>
                <span className="abnxt-admin__pct">{shown}%</span>
              </div>
              <div className="abnxt-admin__variant-actions">
                <button
                  className="abnxt-admin__btn abnxt-admin__btn--icon abnxt-admin__btn--danger"
                  type="button"
                  aria-label={`remove ${v.key}`}
                  title={t('tipRemoveVariant')}
                  disabled={experiment.variants.length <= 1}
                  onClick={() =>
                    applyVariants(removeVariant(experiment.variants, v.key))
                  }
                >
                  <IconX />
                </button>
              </div>
            </div>
          );
        })}
        {!autoBalance ? (
          <div
            className={
              'abnxt-admin__weight-total' +
              (weightOver ? ' abnxt-admin__weight-total--error' : '')
            }
          >
            <span>{t('weightTotal', { sum: weightSum })}</span>
            {weightOver ? <span>{t('weightOver')}</span> : null}
          </div>
        ) : null}
        {experiment.variants.length < MAX_VARIANTS ? (
          <button
            className="abnxt-admin__btn"
            type="button"
            onClick={() => applyVariants(addVariant(experiment.variants))}
            style={{ marginTop: 4 }}
          >
            <IconPlus />
            {t('addVariant')}
          </button>
        ) : (
          <p className="abnxt-admin__hint">
            {t('maxVariants', { n: MAX_VARIANTS })}
          </p>
        )}
      </section>
    </div>
  );
}
