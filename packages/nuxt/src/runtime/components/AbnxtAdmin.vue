<script setup lang="ts">
import { ref, computed, onMounted, h, type VNode } from 'vue';
import type { AbConfig, Experiment, Variant } from '@abnxt/core';
import {
  toggleActive,
  setField,
  addExperiment,
  upsertExperiment,
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
const IconEye = makeIcon(() => [
  h('path', { d: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z' }),
  h('circle', { cx: '12', cy: '12', r: '3' }),
]);
const IconEyeOff = makeIcon(() => [
  h('path', {
    d: 'M9.9 4.24A9.12 9.12 0 0 1 12 4c6.5 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68',
  }),
  h('path', {
    d: 'M6.61 6.61A13.526 13.526 0 0 0 2 12s3.5 7 10 7a9.74 9.74 0 0 0 5.39-1.61',
  }),
  h('path', { d: 'M2 2l20 20' }),
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

type Status = 'loading' | 'gate' | 'ready';

const status = ref<Status>('loading');
const config = ref<AbConfig | null>(null);
const selectedKey = ref<string | null>(null);
const dirty = ref(false);
const message = ref<string | null>(null);
const messageKind = ref<'info' | 'error' | 'success'>('info');
const gateKey = ref('');
const gateError = ref<string | null>(null);
const gateBusy = ref(false);
const confirmReset = ref(false);

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

// 렌더 경로 예외 금지: 정규화/시뮬레이션은 try/catch 폴백(React와 동일).
const selectedPercents = computed<Record<string, number>>(() => {
  const exp = selected.value;
  if (!exp) return {};
  try {
    return normalizeToPercents(exp.variants);
  } catch {
    return {};
  }
});

const simulation = computed<{ key: string; pct: number }[]>(() => {
  const exp = selected.value;
  if (!exp) return [];
  try {
    const counts = simulateSplit(exp, 1000);
    return exp.variants.map((v) => ({
      key: v.key,
      pct: Math.round(((counts[v.key] ?? 0) / 1000) * 100),
    }));
  } catch {
    return [];
  }
});

function splitLabel(exp: Experiment): string {
  try {
    const pcts = normalizeToPercents(exp.variants);
    return exp.variants.map((v) => `${v.key} ${pcts[v.key] ?? 0}%`).join(' · ');
  } catch {
    return '';
  }
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
    dirty.value = false;
    status.value = 'ready';
    const keys = Object.keys(parsed.config.experiments);
    if (selectedKey.value == null || !keys.includes(selectedKey.value)) {
      selectedKey.value = keys[0] ?? null;
    }
    if (!parsed.ok && parsed.message)
      flash(`Loaded with warning: ${parsed.message}`, 'error');
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
      gateError.value = 'Invalid key';
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
  selectedKey.value = null;
  dirty.value = false;
  message.value = null;
  status.value = 'gate';
}

function closeAdmin(): void {
  if (typeof window === 'undefined') return;
  if (window.history.length > 1) window.history.back();
  else window.location.assign('/');
}

onMounted(() => {
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

function onAddExperiment(): void {
  const c = config.value;
  if (!c) return;
  const before = new Set(Object.keys(c.experiments));
  const next = addExperiment(c);
  markDirty(next);
  const created = Object.keys(next.experiments).find((k) => !before.has(k));
  if (created) selectedKey.value = created;
}

function onToggleActive(key: string): void {
  const c = config.value;
  if (!c) return;
  markDirty(toggleActive(c, key));
}

function onSelect(key: string): void {
  selectedKey.value = key;
}

function onSetField(
  fields: Partial<Pick<Experiment, 'name' | 'sticky' | 'seed' | 'control'>>,
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
  // 동적 가중치: 나머지 변이가 비례 자동 조정되어 합 100 유지.
  updateSelectedVariants(redistributeWeights(exp.variants, key, weight));
}

// --- Preview (override 쿠키, 내 브라우저 한정) ---

function onPreview(variant: string): void {
  if (selectedKey.value == null) return;
  setOverride(selectedKey.value, variant);
  flash(`Preview: ${selectedKey.value} → ${variant}`, 'info');
}

function onClearPreview(): void {
  if (selectedKey.value == null) return;
  clearOverride(selectedKey.value);
  flash(`Preview cleared: ${selectedKey.value}`, 'info');
}

// --- 전체 사용자 강제 재배정(쿠키 초기화) ---

function onConfirmReset(): void {
  const c = config.value;
  if (!c) return;
  markDirty(bumpResetEpoch(c));
  confirmReset.value = false;
  flash('All-user reset queued — press Save to apply', 'success');
}

// --- 저장 / Export / Import ---

async function onSave(): Promise<void> {
  const c = config.value;
  if (!c) return;
  try {
    await storage.value.save(c);
    dirty.value = false;
    flash('Saved', 'success');
  } catch (e) {
    flash(`Save failed: ${(e as Error).message}`, 'error');
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
      flash(`Import failed: ${result.message ?? 'invalid config'}`, 'error');
      return;
    }
    config.value = result.config;
    dirty.value = true;
    selectedKey.value = Object.keys(result.config.experiments)[0] ?? null;
    flash('Imported (unsaved)', 'success');
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
            <div class="abnxt-admin__gate">
              <form
                class="abnxt-admin__gate-card"
                @submit.prevent="submitKey"
              >
                <div class="abnxt-admin__gate-logo">
                  <IconLock :size="22" />
                </div>
                <div class="abnxt-admin__gate-title">{{ title }}</div>
                <p class="abnxt-admin__gate-text">
                  관리자 키를 입력해 어드민에 접근하세요. 키는 서버에서만
                  검증되며 HMAC 세션 쿠키로 교환됩니다.
                </p>
                <input
                  v-model="gateKey"
                  class="abnxt-admin__gate-input"
                  type="password"
                  placeholder="Admin key"
                  aria-label="Admin key"
                  autocomplete="current-password"
                />
                <button
                  class="abnxt-admin__btn abnxt-admin__btn--primary"
                  type="submit"
                  :disabled="gateBusy"
                >
                  <IconLock />
                  Unlock
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
                <div>
                  <div class="abnxt-modal__title">{{ title }}</div>
                  <div class="abnxt-modal__sub">
                    A/B 테스트 구성 · 저장 전까지 미반영
                  </div>
                </div>
              </div>
              <span
                v-if="dirty"
                class="abnxt-modal__badge"
              >
                <span class="abnxt-modal__badge-dot" />
                미저장 변경
              </span>
              <div class="abnxt-modal__actions">
                <button
                  class="abnxt-admin__btn abnxt-admin__btn--sm"
                  type="button"
                  title="현재 구성을 JSON 파일로 내보내기"
                  @click="onExport"
                >
                  <IconDownload />
                  Export
                </button>
                <label
                  class="abnxt-admin__btn abnxt-admin__btn--sm"
                  title="JSON 파일에서 구성 가져오기(저장 전까지 미반영)"
                >
                  <IconUpload />
                  Import
                  <input
                    type="file"
                    accept="application/json"
                    style="display: none"
                    @change="onImportFile"
                  />
                </label>
                <button
                  class="abnxt-admin__btn abnxt-admin__btn--primary abnxt-admin__btn--sm"
                  type="button"
                  :disabled="!dirty"
                  title="변경사항을 서버에 저장"
                  @click="onSave"
                >
                  <IconCheck />
                  Save
                </button>
                <button
                  class="abnxt-admin__btn abnxt-admin__btn--ghost abnxt-admin__btn--sm"
                  type="button"
                  title="세션 종료"
                  @click="logout"
                >
                  <IconPower />
                  Logout
                </button>
                <button
                  class="abnxt-admin__btn abnxt-admin__btn--icon abnxt-admin__btn--ghost"
                  type="button"
                  aria-label="Close"
                  title="닫기"
                  @click="closeAdmin"
                >
                  <IconX />
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
                  <span class="abnxt-admin__sidebar-title">실험 목록</span>
                  <button
                    class="abnxt-admin__btn abnxt-admin__btn--sm"
                    type="button"
                    title="새 실험 추가"
                    @click="onAddExperiment"
                  >
                    <IconPlus />
                    추가
                  </button>
                </div>
                <div class="abnxt-admin__list">
                  <div
                    v-if="experimentEntries.length === 0"
                    class="abnxt-admin__empty"
                  >
                    아직 실험이 없습니다.
                  </div>
                  <button
                    v-for="[key, exp] in experimentEntries"
                    :key="key"
                    type="button"
                    class="abnxt-admin__list-item"
                    :class="{
                      'abnxt-admin__list-item--selected': key === selectedKey,
                    }"
                    @click="onSelect(key)"
                  >
                    <div class="abnxt-admin__list-main">
                      <span class="abnxt-admin__list-name">{{
                        exp.name || key
                      }}</span>
                      <span class="abnxt-admin__list-meta">
                        <span class="abnxt-admin__list-key">{{ key }}</span>
                      </span>
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
                      >{{ exp.active ? 'on' : 'off' }}</span
                    >
                    <span
                      class="abnxt-admin__switch"
                      role="switch"
                      :aria-checked="exp.active"
                      :aria-label="`${exp.name || key} 활성화 토글`"
                      tabindex="0"
                      :data-on="exp.active"
                      @click.stop="onToggleActive(key)"
                      @keydown.enter.prevent.stop="onToggleActive(key)"
                      @keydown.space.prevent.stop="onToggleActive(key)"
                    />
                  </button>
                </div>
              </aside>

              <!-- 우측 에디터 -->
              <div
                v-if="!selected"
                class="abnxt-admin__empty"
              >
                선택된 실험이 없습니다. 왼쪽에서 실험을 추가해 시작하세요.
              </div>
              <div
                v-else
                class="abnxt-admin__editor"
              >
                <div class="abnxt-admin__editor-head">
                  <div style="margin-right: auto">
                    <div class="abnxt-admin__editor-title">
                      {{ selected.name || selectedKey }}
                    </div>
                    <div class="abnxt-admin__editor-key">{{ selectedKey }}</div>
                  </div>
                  <span
                    class="abnxt-admin__pill"
                    :class="
                      selected.active
                        ? 'abnxt-admin__pill--on'
                        : 'abnxt-admin__pill--off'
                    "
                    >{{ selected.active ? '활성' : '비활성' }}</span
                  >
                </div>

                <!-- 기본 설정 -->
                <section class="abnxt-admin__section">
                  <div class="abnxt-admin__section-title">기본 설정</div>

                  <div class="abnxt-admin__field">
                    <div class="abnxt-admin__field-head">
                      <label class="abnxt-admin__label">이름</label>
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
                    <p class="abnxt-admin__hint">
                      대시보드/분석에 표시되는 사람이 읽는 이름입니다.
                    </p>
                  </div>

                  <div class="abnxt-admin__field abnxt-admin__field--inline">
                    <div class="abnxt-admin__field-head">
                      <label class="abnxt-admin__label">활성화</label>
                    </div>
                    <span
                      class="abnxt-admin__switch"
                      role="switch"
                      :aria-checked="selected.active"
                      aria-label="활성화"
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
                  <p
                    class="abnxt-admin__hint"
                    style="margin-top: -8px"
                  >
                    끄면 모든 방문자에게 control 변이가 강제되고 노출 이벤트가
                    발생하지 않습니다. (키 삭제 대신 비활성화로 운영)
                  </p>

                  <div class="abnxt-admin__field abnxt-admin__field--inline">
                    <div class="abnxt-admin__field-head">
                      <label class="abnxt-admin__label">Sticky</label>
                    </div>
                    <span
                      class="abnxt-admin__switch"
                      role="switch"
                      :aria-checked="selected.sticky"
                      aria-label="sticky"
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
                  <p
                    class="abnxt-admin__hint"
                    style="margin-top: -8px"
                  >
                    켜면 한 번 배정된 변이가 쿠키에 저장되어 재방문 시
                    유지됩니다.
                  </p>

                  <div class="abnxt-admin__field">
                    <div class="abnxt-admin__field-head">
                      <label class="abnxt-admin__label">Seed</label>
                    </div>
                    <input
                      class="abnxt-admin__input"
                      type="text"
                      :value="selected.seed"
                      @input="
                        onSetField({
                          seed: ($event.target as HTMLInputElement).value,
                        })
                      "
                    />
                    <p class="abnxt-admin__hint">
                      결정적 해시 시드. 같은 방문자라도 시드가 다르면 다른
                      실험에 독립적으로 배정됩니다.
                    </p>
                  </div>

                  <div class="abnxt-admin__field">
                    <div class="abnxt-admin__field-head">
                      <label class="abnxt-admin__label">Control</label>
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
                    <p class="abnxt-admin__hint">
                      기준(대조) 변이. 비활성/폴백 시 이 변이가 사용됩니다.
                    </p>
                  </div>
                </section>

                <!-- 변이 + 동적 가중치 -->
                <section class="abnxt-admin__section">
                  <div class="abnxt-admin__section-title">변이 & 가중치</div>
                  <p
                    class="abnxt-admin__hint"
                    style="margin-bottom: 12px"
                  >
                    슬라이더로 비중(%)을 조정하면 나머지 변이가 자동으로 비례
                    조정되어 합이 항상 100%로 유지됩니다.
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
                      <div class="abnxt-admin__variant-top">
                        <div class="abnxt-admin__bar">
                          <span
                            class="abnxt-admin__bar-fill"
                            :style="{
                              width: (selectedPercents[v.key] ?? 0) + '%',
                              background: variantColor(i),
                            }"
                          />
                        </div>
                        <span class="abnxt-admin__variant-pct"
                          >{{ selectedPercents[v.key] ?? 0 }}%</span
                        >
                      </div>
                      <input
                        class="abnxt-admin__range"
                        type="range"
                        min="0"
                        max="100"
                        :value="selectedPercents[v.key] ?? 0"
                        :aria-label="`weight ${v.key}`"
                        @input="
                          onSetWeight(
                            v.key,
                            Number(($event.target as HTMLInputElement).value),
                          )
                        "
                      />
                    </div>
                    <div class="abnxt-admin__variant-actions">
                      <button
                        class="abnxt-admin__btn abnxt-admin__btn--icon abnxt-admin__btn--ghost"
                        type="button"
                        :aria-label="`preview ${v.key}`"
                        title="이 변이로 미리보기(내 브라우저 override 쿠키)"
                        @click="onPreview(v.key)"
                      >
                        <IconEye />
                      </button>
                      <button
                        class="abnxt-admin__btn abnxt-admin__btn--icon abnxt-admin__btn--ghost"
                        type="button"
                        :aria-label="`clear preview ${v.key}`"
                        title="미리보기 해제"
                        @click="onClearPreview"
                      >
                        <IconEyeOff />
                      </button>
                      <button
                        class="abnxt-admin__btn abnxt-admin__btn--icon abnxt-admin__btn--danger"
                        type="button"
                        :aria-label="`remove ${v.key}`"
                        title="변이 제거"
                        :disabled="selected.variants.length <= 1"
                        @click="onRemoveVariant(v.key)"
                      >
                        <IconX />
                      </button>
                    </div>
                  </div>
                  <button
                    class="abnxt-admin__btn"
                    type="button"
                    style="margin-top: 4px"
                    @click="onAddVariant"
                  >
                    <IconPlus />
                    변이 추가
                  </button>
                </section>

                <!-- 시뮬레이션 -->
                <section class="abnxt-admin__section">
                  <div class="abnxt-admin__section-title">
                    배정 시뮬레이션 (1,000명)
                  </div>
                  <div class="abnxt-admin__sim">
                    <div
                      v-for="(row, i) in simulation"
                      :key="row.key"
                      class="abnxt-admin__sim-row"
                    >
                      <span
                        class="abnxt-admin__variant-key"
                        :style="{
                          background: variantColor(i),
                          width: '24px',
                          height: '24px',
                        }"
                        >{{ row.key }}</span
                      >
                      <div class="abnxt-admin__sim-track">
                        <span
                          class="abnxt-admin__sim-bar"
                          :style="{
                            width: row.pct + '%',
                            background: variantColor(i),
                          }"
                        />
                      </div>
                      <span
                        class="abnxt-admin__sim-val abnxt-admin__variant-pct"
                        >{{ row.pct }}%</span
                      >
                    </div>
                  </div>
                  <p
                    class="abnxt-admin__hint"
                    style="margin-top: 8px"
                  >
                    가상 방문자 1,000명을 결정적 해시로 배정한 예상 분포입니다.
                  </p>
                </section>

                <!-- 위험 영역 -->
                <section class="abnxt-admin__danger-zone">
                  <div class="abnxt-admin__danger-title">위험 영역</div>
                  <div class="abnxt-admin__danger-text">
                    모든 사용자의 배정 쿠키를 초기화하여 전체 재배정을
                    강제합니다. 저장 후 적용됩니다.
                  </div>
                  <button
                    class="abnxt-admin__btn abnxt-admin__btn--danger"
                    type="button"
                    @click="confirmReset = true"
                  >
                    <IconRefresh />
                    모든 사용자 쿠키 초기화
                  </button>
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
                  모든 사용자 쿠키를 초기화할까요?
                </div>
                <div class="abnxt-admin__confirm-text">
                  모든 방문자의 기존 배정(sticky)이 무효화되어 다음 방문 시
                  재배정됩니다. 이 작업은 <strong>저장(Save)</strong> 후에
                  적용됩니다.
                </div>
                <div class="abnxt-admin__confirm-actions">
                  <button
                    class="abnxt-admin__btn"
                    type="button"
                    @click="confirmReset = false"
                  >
                    취소
                  </button>
                  <button
                    class="abnxt-admin__btn abnxt-admin__btn--danger"
                    type="button"
                    @click="onConfirmReset"
                  >
                    <IconRefresh />
                    초기화 예약
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
