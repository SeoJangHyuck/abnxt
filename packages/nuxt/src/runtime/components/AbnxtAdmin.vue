<script setup lang="ts">
import { ref, computed, onMounted, h, type VNode } from 'vue';
import type { AbConfig, Experiment, Variant } from '@abnxt/core';
import { MAX_VARIANTS } from '@abnxt/core';
import {
  toggleActive,
  setField,
  upsertExperiment,
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

const props = withDefaults(
  defineProps<{
    configEndpoint?: string;
    authEndpoint?: string;
    title?: string;
  }>(),
  {
    configEndpoint: '/api/abnxt/config',
    authEndpoint: '/api/abnxt/auth',
    title: 'abnxt admin',
  },
);

/* ── 인라인 SVG 아이콘(의존성 0, currentColor) ──────────────── */
function makeIcon(nodes: () => VNode[]) {
  return (p: { size?: number }) =>
    h(
      'svg',
      {
        class: 'abnxt-admin__icon',
        width: p.size ?? 16,
        height: p.size ?? 16,
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        'stroke-width': '2',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
        'aria-hidden': 'true',
      },
      nodes(),
    );
}
const IconCheck = makeIcon(() => [h('path', { d: 'M20 6L9 17l-5-5' })]);
const IconDownload = makeIcon(() => [
  h('path', { d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' }),
  h('path', { d: 'M7 10l5 5 5-5' }),
  h('path', { d: 'M12 15V3' }),
]);
const IconUpload = makeIcon(() => [
  h('path', { d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' }),
  h('path', { d: 'M17 8l-5-5-5 5' }),
  h('path', { d: 'M12 3v12' }),
]);
const IconPower = makeIcon(() => [
  h('path', { d: 'M18.36 6.64a9 9 0 1 1-12.73 0' }),
  h('path', { d: 'M12 2v10' }),
]);
const IconPlus = makeIcon(() => [
  h('path', { d: 'M12 5v14' }),
  h('path', { d: 'M5 12h14' }),
]);
const IconX = makeIcon(() => [
  h('path', { d: 'M18 6L6 18' }),
  h('path', { d: 'M6 6l12 12' }),
]);
const IconRefresh = makeIcon(() => [
  h('path', { d: 'M3 12a9 9 0 0 1 15-6.7L21 8' }),
  h('path', { d: 'M21 3v5h-5' }),
  h('path', { d: 'M21 12a9 9 0 0 1-15 6.7L3 16' }),
  h('path', { d: 'M3 21v-5h5' }),
]);
const IconLock = makeIcon(() => [
  h('rect', { x: '3', y: '11', width: '18', height: '11', rx: '2' }),
  h('path', { d: 'M7 11V7a5 5 0 0 1 10 0v4' }),
]);
const IconHome = makeIcon(() => [
  h('path', { d: 'M3 9.5L12 3l9 6.5' }),
  h('path', { d: 'M5 10v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V10' }),
  h('path', { d: 'M9 21v-6h6v6' }),
]);

type Status = 'loading' | 'gate' | 'ready';

const status = ref<Status>('loading');
const config = ref<AbConfig | null>(null);
// 서버에 저장된 마지막 스냅샷. 실험 전환 시 편집본을 여기로 되돌려 미저장 변경을 폐기.
const savedConfig = ref<AbConfig | null>(null);
const selectedKey = ref<string | null>(null);
const dirty = ref(false);
const message = ref<string | null>(null);
const messageKind = ref<'info' | 'error' | 'success'>('info');
const gateKey = ref('');
const gateError = ref<string | null>(null);
const gateBusy = ref(false);
const saving = ref(false);
const confirmReset = ref(false);

// 호스트 페이지 언어 감지(기본 영어, 한국어면 ko). t는 lang.value를 읽어 렌더 시 반응.
const lang = ref<AdminLang>('en');
function t(
  key: keyof AdminDict,
  vars?: Record<string, string | number>,
): string {
  return adminT(lang.value, key, vars);
}

// ── Shadow DOM: 호스트 CSS 격리(폰트만 상속) ──────────────
const hostRef = ref<HTMLElement | null>(null);
const shadowRoot = ref<ShadowRoot | null>(null);

const storage = computed(() => apiStorage({ base: props.configEndpoint }));

function flash(
  text: string,
  kind: 'info' | 'error' | 'success' = 'info',
): void {
  message.value = text;
  messageKind.value = kind;
}

const experimentEntries = computed<[string, Experiment][]>(() => {
  const c = config.value;
  if (!c || typeof c !== 'object' || !c.experiments) return [];
  return Object.entries(c.experiments);
});

const selected = computed<Experiment | null>(() => {
  const c = config.value;
  if (!c || selectedKey.value == null) return null;
  return c.experiments[selectedKey.value] ?? null;
});

// 가중치 정책·표시값은 core 공유 헬퍼(weightSummary/weightDisplay)로 — 어댑터 간 동일 보장.
// 표시값: 자동(≤2)=정규화 %, 수동(3+)=raw weight. (weightDisplay가 모드 분기 + 폴백 처리)
const selectedPercents = computed<Record<string, number>>(() =>
  selected.value ? weightDisplay(selected.value.variants) : {},
);
const weightSum = computed(
  () => weightSummary(selected.value?.variants ?? []).sum,
);
const autoBalance = computed(
  () => weightSummary(selected.value?.variants ?? []).autoBalance,
);
const weightOver = computed(
  () => weightSummary(selected.value?.variants ?? []).over,
);

function splitLabel(exp: Experiment): string {
  const pcts = weightDisplay(exp.variants);
  return exp.variants.map((v) => `${v.key} ${pcts[v.key] ?? 0}%`).join(' · ');
}

// --- 데이터 로드 / 인증 (브라우저 전용: onMounted) ---

async function loadConfigFromServer(): Promise<void> {
  try {
    const res = await fetch(props.configEndpoint, {
      credentials: 'same-origin',
      headers: { accept: 'application/json' },
    });
    if (res.status === 401) {
      status.value = 'gate';
      return;
    }
    if (!res.ok) {
      status.value = 'gate';
      gateError.value = `Failed to load config (${res.status})`;
      return;
    }
    const raw: unknown = await res.json();
    const parsed = parseConfigJson(JSON.stringify(raw));
    config.value = parsed.config;
    savedConfig.value = parsed.config;
    dirty.value = false;
    status.value = 'ready';
    const keys = Object.keys(parsed.config.experiments);
    if (selectedKey.value == null || !keys.includes(selectedKey.value)) {
      selectedKey.value = keys[0] ?? null;
    }
    if (!parsed.ok && parsed.message)
      flash(t('loadWarn', { msg: parsed.message }), 'error');
  } catch {
    status.value = 'gate';
    gateError.value = 'Network error while loading config';
  }
}

async function submitKey(): Promise<void> {
  gateError.value = null;
  gateBusy.value = true;
  try {
    const res = await fetch(props.authEndpoint, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ key: gateKey.value }),
    });
    if (!res.ok) {
      gateError.value = t('invalidKey');
      return;
    }
    gateKey.value = '';
    await loadConfigFromServer();
  } catch {
    gateError.value = 'Network error';
  } finally {
    gateBusy.value = false;
  }
}

async function logout(): Promise<void> {
  try {
    await fetch(props.authEndpoint, {
      method: 'DELETE',
      credentials: 'same-origin',
    });
  } catch {
    // 무시: 쿠키는 만료 응답으로 제거되며 실패해도 키폼 복귀.
  }
  config.value = null;
  savedConfig.value = null;
  selectedKey.value = null;
  dirty.value = false;
  message.value = null;
  status.value = 'gate';
}

// 어드민은 모달이 아니라 페이지 — 닫기 대신 루트('/')로 이동.
function goHome(): void {
  if (typeof window === 'undefined') return;
  window.location.assign('/');
}

onMounted(() => {
  lang.value = detectAdminLang();
  // Shadow root 구성: ADMIN_CSS를 내부에 주입해 호스트 CSS와 격리.
  const host = hostRef.value;
  if (host) {
    let root = host.shadowRoot;
    if (!root) {
      root = host.attachShadow({ mode: 'open' });
      const style = document.createElement('style');
      style.textContent = ADMIN_CSS;
      root.appendChild(style);
    }
    shadowRoot.value = root;
  }
  void loadConfigFromServer();
});

// --- 편집 (모두 @abnxt/core/admin 함수 경유, save 전까지 미반영) ---

function markDirty(next: AbConfig): void {
  config.value = next;
  dirty.value = true;
  message.value = null;
}

function onToggleActive(key: string): void {
  const c = config.value;
  if (!c) return;
  markDirty(toggleActive(c, key));
}

// 실험 선택 전환 — 미저장 편집을 폐기(저장본 복원)하고 알럿/더티 초기화.
function onSelect(key: string): void {
  if (key === selectedKey.value) return;
  config.value = savedConfig.value;
  dirty.value = false;
  message.value = null;
  selectedKey.value = key;
}

function onSetField(
  fields: Partial<
    Pick<Experiment, 'name' | 'description' | 'sticky' | 'seed' | 'control'>
  >,
): void {
  const c = config.value;
  if (!c || selectedKey.value == null) return;
  markDirty(setField(c, selectedKey.value, fields));
}

function updateSelectedVariants(variants: Variant[]): void {
  const c = config.value;
  const exp = selected.value;
  if (!c || !exp || selectedKey.value == null) return;
  markDirty(upsertExperiment(c, selectedKey.value, { ...exp, variants }));
}

function onAddVariant(): void {
  const exp = selected.value;
  if (!exp) return;
  updateSelectedVariants(addVariant(exp.variants));
}

function onRemoveVariant(key: string): void {
  const exp = selected.value;
  if (!exp) return;
  updateSelectedVariants(removeVariant(exp.variants, key));
}

function onSetWeight(key: string, weight: number): void {
  const exp = selected.value;
  if (!exp) return;
  // 2개 이하: 나머지가 비례 자동 조정(합 100 유지). 3개 이상: 해당 변이만 자유 설정.
  updateSelectedVariants(
    autoBalance.value
      ? redistributeWeights(exp.variants, key, weight)
      : setWeight(exp.variants, key, weight),
  );
}

// --- 전체 사용자 강제 재배정(쿠키 초기화) ---

// 전역 동작이라 확인 즉시 저장(실험별 저장과 독립).
async function onConfirmReset(): Promise<void> {
  const base = savedConfig.value;
  confirmReset.value = false;
  if (!base) return;
  const next = bumpResetEpoch(base);
  saving.value = true;
  try {
    await storage.value.save(next);
    config.value = next;
    savedConfig.value = next;
    dirty.value = false;
    flash(t('resetDone'), 'success');
  } catch (e) {
    flash(`${t('saveFailed')}: ${(e as Error).message}`, 'error');
  } finally {
    saving.value = false;
  }
}

// --- 저장 / Export / Import ---

async function onSave(): Promise<void> {
  const c = config.value;
  if (!c) return;
  saving.value = true;
  try {
    await storage.value.save(c);
    savedConfig.value = c;
    dirty.value = false;
    flash(t('saved'), 'success');
  } catch (e) {
    flash(`${t('saveFailed')}: ${(e as Error).message}`, 'error');
  } finally {
    saving.value = false;
  }
}

function onExport(): void {
  const c = config.value;
  if (!c || typeof document === 'undefined') return;
  const json = serializeConfig(c);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'abnxt-config.json';
  a.click();
  URL.revokeObjectURL(url);
}

function onImportFile(e: Event): void {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const text = String(reader.result ?? '');
    const result = parseConfigJson(text);
    if (!result.ok) {
      flash(`${t('importFailed')}: ${result.message ?? ''}`, 'error');
      return;
    }
    config.value = result.config;
    // import는 전체 교체(미저장) — savedConfig도 갱신해 실험 전환 시 폐기되지 않게.
    savedConfig.value = result.config;
    dirty.value = true;
    selectedKey.value = Object.keys(result.config.experiments)[0] ?? null;
    flash(t('imported'), 'success');
  };
  reader.readAsText(file);
  input.value = '';
}
</script>

<template>
  <div
    ref="hostRef"
    data-abnxt-admin-host
  >
    <Teleport
      v-if="shadowRoot"
      :to="shadowRoot"
    >
      <div class="abnxt-admin">
        <!-- 로딩 -->
        <div
          v-if="status === 'loading'"
          class="abnxt-modal__overlay"
        >
          <div class="abnxt-modal__card">
            <div class="abnxt-admin__empty">
              <span class="abnxt-admin__spinner" />
            </div>
          </div>
        </div>

        <!-- 키 입력 게이트 -->
        <div
          v-else-if="status === 'gate'"
          class="abnxt-modal__overlay"
        >
          <div class="abnxt-modal__card">
            <div class="abnxt-admin__gate-lang">
              <div
                class="abnxt-admin__lang"
                role="group"
                :aria-label="t('langToggle')"
              >
                <button
                  type="button"
                  :data-on="lang === 'en'"
                  @click="lang = 'en'"
                >
                  EN
                </button>
                <button
                  type="button"
                  :data-on="lang === 'ko'"
                  @click="lang = 'ko'"
                >
                  KO
                </button>
              </div>
            </div>
            <div class="abnxt-admin__gate">
              <form
                class="abnxt-admin__gate-card"
                @submit.prevent="submitKey"
              >
                <div class="abnxt-admin__gate-logo">
                  <IconLock :size="22" />
                </div>
                <div class="abnxt-admin__gate-title">{{ title }}</div>
                <p class="abnxt-admin__gate-text">{{ t('gateText') }}</p>
                <input
                  v-model="gateKey"
                  class="abnxt-admin__gate-input"
                  type="password"
                  :placeholder="t('adminKey')"
                  :aria-label="t('adminKey')"
                  autocomplete="current-password"
                />
                <button
                  class="abnxt-admin__btn abnxt-admin__btn--primary"
                  type="submit"
                  :disabled="gateBusy"
                >
                  <IconLock />
                  {{ t('unlock') }}
                </button>
                <div
                  v-if="gateError"
                  class="abnxt-admin__msg abnxt-admin__msg--error"
                  style="margin-top: 12px"
                >
                  {{ gateError }}
                </div>
              </form>
            </div>
          </div>
        </div>

        <!-- 인증된 화면 -->
        <div
          v-else
          class="abnxt-modal__overlay"
        >
          <div class="abnxt-modal__card">
            <header class="abnxt-modal__header">
              <div class="abnxt-modal__brand">
                <span class="abnxt-modal__logo">
                  <span style="font-weight: 800; font-size: 13px">AB</span>
                </span>
                <div style="min-width: 0">
                  <div class="abnxt-modal__title">{{ title }}</div>
                  <div class="abnxt-modal__sub">{{ t('headerSub') }}</div>
                </div>
              </div>
              <span
                v-if="dirty"
                class="abnxt-modal__badge"
              >
                <span class="abnxt-modal__badge-dot" />
                {{ t('unsaved') }}
              </span>
              <div class="abnxt-modal__actions">
                <div
                  class="abnxt-admin__lang"
                  role="group"
                  :aria-label="t('langToggle')"
                >
                  <button
                    type="button"
                    :data-on="lang === 'en'"
                    @click="lang = 'en'"
                  >
                    EN
                  </button>
                  <button
                    type="button"
                    :data-on="lang === 'ko'"
                    @click="lang = 'ko'"
                  >
                    KO
                  </button>
                </div>
                <button
                  class="abnxt-admin__btn abnxt-admin__btn--sm"
                  type="button"
                  :title="t('tipExport')"
                  @click="onExport"
                >
                  <IconDownload />
                  {{ t('export') }}
                </button>
                <label
                  class="abnxt-admin__btn abnxt-admin__btn--sm"
                  :title="t('tipImport')"
                >
                  <IconUpload />
                  {{ t('import') }}
                  <input
                    type="file"
                    accept="application/json"
                    style="display: none"
                    @change="onImportFile"
                  />
                </label>
                <button
                  class="abnxt-admin__btn abnxt-admin__btn--ghost abnxt-admin__btn--sm"
                  type="button"
                  :title="t('tipLogout')"
                  @click="logout"
                >
                  <IconPower />
                  {{ t('logout') }}
                </button>
                <button
                  class="abnxt-admin__btn abnxt-admin__btn--icon abnxt-admin__btn--ghost"
                  type="button"
                  :aria-label="t('home')"
                  :title="t('tipHome')"
                  @click="goHome"
                >
                  <IconHome />
                </button>
              </div>
            </header>

            <div
              v-if="message"
              class="abnxt-admin__msg"
              :class="{
                'abnxt-admin__msg--error': messageKind === 'error',
                'abnxt-admin__msg--success': messageKind === 'success',
              }"
            >
              {{ message }}
            </div>

            <div class="abnxt-modal__body">
              <!-- 좌측 리스트 -->
              <aside class="abnxt-admin__sidebar">
                <div class="abnxt-admin__sidebar-head">
                  <span class="abnxt-admin__sidebar-title">{{
                    t('listTitle')
                  }}</span>
                </div>
                <div class="abnxt-admin__list">
                  <div
                    v-if="experimentEntries.length === 0"
                    class="abnxt-admin__empty"
                  >
                    {{ t('listEmpty') }}
                  </div>
                  <button
                    v-for="[key, exp] in experimentEntries"
                    :key="key"
                    type="button"
                    class="abnxt-admin__list-item"
                    :class="{
                      'abnxt-admin__list-item--selected': key === selectedKey,
                      'abnxt-admin__list-item--inactive': !exp.active,
                    }"
                    @click="onSelect(key)"
                  >
                    <div class="abnxt-admin__list-main">
                      <span class="abnxt-admin__list-name">{{
                        exp.name || key
                      }}</span>
                      <span
                        class="abnxt-admin__list-meta abnxt-admin__list-key"
                        >{{ key }}</span
                      >
                      <span class="abnxt-admin__list-meta">{{
                        splitLabel(exp)
                      }}</span>
                    </div>
                    <span
                      class="abnxt-admin__pill"
                      :class="
                        exp.active
                          ? 'abnxt-admin__pill--on'
                          : 'abnxt-admin__pill--off'
                      "
                      >{{ exp.active ? t('active') : t('inactive') }}</span
                    >
                  </button>
                </div>
                <!-- 전역 위험 영역(전체 실험/전체 사용자 재배정) — 실험별 아님 -->
                <div class="abnxt-admin__sidebar-foot">
                  <div class="abnxt-admin__danger-zone">
                    <div class="abnxt-admin__danger-title">
                      {{ t('secDanger') }}
                    </div>
                    <div class="abnxt-admin__danger-text">
                      {{ t('dangerText') }}
                    </div>
                    <button
                      class="abnxt-admin__btn abnxt-admin__btn--danger"
                      type="button"
                      @click="confirmReset = true"
                    >
                      <IconRefresh />
                      {{ t('dangerBtn') }}
                    </button>
                  </div>
                </div>
              </aside>

              <!-- 우측 에디터 -->
              <div
                v-if="!selected"
                class="abnxt-admin__empty"
              >
                {{ t('noSelection') }}
              </div>
              <div
                v-else
                :key="selectedKey ?? ''"
                class="abnxt-admin__editor"
              >
                <div class="abnxt-admin__editor-head">
                  <div style="margin-right: auto; min-width: 0">
                    <div class="abnxt-admin__editor-title">
                      {{ selected.name || selectedKey }}
                    </div>
                    <div class="abnxt-admin__editor-key">{{ selectedKey }}</div>
                    <p
                      v-if="selected.description"
                      class="abnxt-admin__editor-desc"
                    >
                      {{ selected.description }}
                    </p>
                  </div>
                  <div class="abnxt-admin__editor-actions">
                    <button
                      class="abnxt-admin__btn abnxt-admin__btn--primary"
                      type="button"
                      :disabled="!dirty || weightOver || saving"
                      :title="t('tipSave')"
                      @click="onSave"
                    >
                      <IconCheck />
                      {{ t('save') }}
                    </button>
                  </div>
                </div>

                <!-- 기본 설정 -->
                <section class="abnxt-admin__section">
                  <div class="abnxt-admin__section-title">
                    {{ t('secBasic') }}
                  </div>

                  <div class="abnxt-admin__field">
                    <div class="abnxt-admin__field-head">
                      <label class="abnxt-admin__label">{{ t('fName') }}</label>
                    </div>
                    <input
                      class="abnxt-admin__input"
                      type="text"
                      :value="selected.name"
                      @input="
                        onSetField({
                          name: ($event.target as HTMLInputElement).value,
                        })
                      "
                    />
                    <p class="abnxt-admin__hint">{{ t('hName') }}</p>
                  </div>

                  <div class="abnxt-admin__field">
                    <div class="abnxt-admin__field-head">
                      <label class="abnxt-admin__label">{{
                        t('fDescription')
                      }}</label>
                    </div>
                    <textarea
                      class="abnxt-admin__textarea"
                      :value="selected.description ?? ''"
                      @input="
                        onSetField({
                          description: ($event.target as HTMLTextAreaElement)
                            .value,
                        })
                      "
                    />
                    <p class="abnxt-admin__hint">{{ t('hDescription') }}</p>
                  </div>

                  <div class="abnxt-admin__field abnxt-admin__field--inline">
                    <div class="abnxt-admin__field-text">
                      <label class="abnxt-admin__label">{{
                        t('fActive')
                      }}</label>
                      <p class="abnxt-admin__hint">{{ t('hActive') }}</p>
                    </div>
                    <span
                      class="abnxt-admin__switch"
                      role="switch"
                      :aria-checked="selected.active"
                      :aria-label="t('fActive')"
                      tabindex="0"
                      :data-on="selected.active"
                      @click="selectedKey && onToggleActive(selectedKey)"
                      @keydown.enter.prevent="
                        selectedKey && onToggleActive(selectedKey)
                      "
                      @keydown.space.prevent="
                        selectedKey && onToggleActive(selectedKey)
                      "
                    />
                  </div>

                  <div class="abnxt-admin__field abnxt-admin__field--inline">
                    <div class="abnxt-admin__field-text">
                      <label class="abnxt-admin__label">{{
                        t('fSticky')
                      }}</label>
                      <p class="abnxt-admin__hint">{{ t('hSticky') }}</p>
                    </div>
                    <span
                      class="abnxt-admin__switch"
                      role="switch"
                      :aria-checked="selected.sticky"
                      :aria-label="t('fSticky')"
                      tabindex="0"
                      :data-on="selected.sticky"
                      @click="onSetField({ sticky: !selected.sticky })"
                      @keydown.enter.prevent="
                        onSetField({ sticky: !selected.sticky })
                      "
                      @keydown.space.prevent="
                        onSetField({ sticky: !selected.sticky })
                      "
                    />
                  </div>

                  <div class="abnxt-admin__field">
                    <div class="abnxt-admin__field-head">
                      <label class="abnxt-admin__label">{{ t('fSeed') }}</label>
                    </div>
                    <input
                      class="abnxt-admin__input"
                      type="text"
                      :value="selected.seed"
                      readonly
                      aria-readonly="true"
                    />
                    <p class="abnxt-admin__hint">{{ t('hSeed') }}</p>
                  </div>

                  <div class="abnxt-admin__field">
                    <div class="abnxt-admin__field-head">
                      <label class="abnxt-admin__label">{{
                        t('fControl')
                      }}</label>
                    </div>
                    <select
                      class="abnxt-admin__select"
                      :value="selected.control"
                      @change="
                        onSetField({
                          control: ($event.target as HTMLSelectElement).value,
                        })
                      "
                    >
                      <option
                        v-for="v in selected.variants"
                        :key="v.key"
                        :value="v.key"
                      >
                        {{ v.key }}
                      </option>
                    </select>
                    <p class="abnxt-admin__hint">{{ t('hControl') }}</p>
                  </div>
                </section>

                <!-- 변이 + 가중치 -->
                <section class="abnxt-admin__section">
                  <div class="abnxt-admin__section-title">
                    {{ t('secVariants') }}
                  </div>
                  <p class="abnxt-admin__section-intro">
                    {{ autoBalance ? t('hVariants') : t('hVariantsManual') }}
                  </p>
                  <div
                    v-for="(v, i) in selected.variants"
                    :key="v.key"
                    class="abnxt-admin__variant"
                  >
                    <span
                      class="abnxt-admin__variant-key"
                      :style="{ background: variantColor(i) }"
                      >{{ v.key }}</span
                    >
                    <div class="abnxt-admin__variant-track">
                      <div class="abnxt-admin__bar">
                        <span
                          class="abnxt-admin__bar-fill"
                          :style="{
                            width:
                              Math.min(100, selectedPercents[v.key] ?? 0) + '%',
                            background: variantColor(i),
                          }"
                        />
                        <input
                          class="abnxt-admin__range"
                          type="range"
                          min="0"
                          max="100"
                          :value="selectedPercents[v.key] ?? 0"
                          :aria-label="`weight ${v.key}`"
                          :style="{ color: variantColor(i) }"
                          @input="
                            onSetWeight(
                              v.key,
                              Number(($event.target as HTMLInputElement).value),
                            )
                          "
                        />
                      </div>
                      <span class="abnxt-admin__pct"
                        >{{ selectedPercents[v.key] ?? 0 }}%</span
                      >
                    </div>
                    <div class="abnxt-admin__variant-actions">
                      <button
                        class="abnxt-admin__btn abnxt-admin__btn--icon abnxt-admin__btn--danger"
                        type="button"
                        :aria-label="`remove ${v.key}`"
                        :title="t('tipRemoveVariant')"
                        :disabled="selected.variants.length <= 1"
                        @click="onRemoveVariant(v.key)"
                      >
                        <IconX />
                      </button>
                    </div>
                  </div>
                  <div
                    v-if="!autoBalance"
                    class="abnxt-admin__weight-total"
                    :class="{
                      'abnxt-admin__weight-total--error': weightOver,
                    }"
                  >
                    <span>{{ t('weightTotal', { sum: weightSum }) }}</span>
                    <span v-if="weightOver">{{ t('weightOver') }}</span>
                  </div>
                  <button
                    v-if="selected.variants.length < MAX_VARIANTS"
                    class="abnxt-admin__btn"
                    type="button"
                    style="margin-top: 4px"
                    @click="onAddVariant"
                  >
                    <IconPlus />
                    {{ t('addVariant') }}
                  </button>
                  <p
                    v-else
                    class="abnxt-admin__hint"
                  >
                    {{ t('maxVariants', { n: MAX_VARIANTS }) }}
                  </p>
                </section>
              </div>
            </div>

            <!-- 확인 다이얼로그 -->
            <div
              v-if="confirmReset"
              class="abnxt-admin__confirm"
              role="dialog"
              aria-modal="true"
            >
              <div class="abnxt-admin__confirm-card">
                <div class="abnxt-admin__confirm-title">
                  {{ t('confirmTitle') }}
                </div>
                <div class="abnxt-admin__confirm-text">
                  {{ t('confirmText') }}
                </div>
                <div class="abnxt-admin__confirm-actions">
                  <button
                    class="abnxt-admin__btn"
                    type="button"
                    @click="confirmReset = false"
                  >
                    {{ t('cancel') }}
                  </button>
                  <button
                    class="abnxt-admin__btn abnxt-admin__btn--danger"
                    type="button"
                    @click="onConfirmReset"
                  >
                    <IconRefresh />
                    {{ t('confirmReset') }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
