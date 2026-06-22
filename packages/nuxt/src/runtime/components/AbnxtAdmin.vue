<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import type { AbConfig, Experiment, Variant } from '@abnxt/core';
import {
  toggleActive,
  setField,
  addExperiment,
  removeExperiment,
  upsertExperiment,
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

type Status = 'loading' | 'gate' | 'ready';

const status = ref<Status>('loading');
const config = ref<AbConfig | null>(null);
const selectedKey = ref<string | null>(null);
const dirty = ref(false);
const message = ref<string | null>(null);
const gateKey = ref('');
const gateError = ref<string | null>(null);
const gateBusy = ref(false);

const storage = computed(() => apiStorage({ base: props.configEndpoint }));

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

const simulation = computed<{ key: string; count: number; pct: number }[]>(
  () => {
    const exp = selected.value;
    if (!exp) return [];
    try {
      const counts = simulateSplit(exp, 1000);
      return Object.entries(counts).map(([key, count]) => ({
        key,
        count,
        pct: Math.round((count / 1000) * 100),
      }));
    } catch {
      return [];
    }
  },
);

function splitLabel(exp: Experiment): string {
  try {
    const pcts = normalizeToPercents(exp.variants);
    return Object.entries(pcts)
      .map(([k, v]) => `${k} ${v}%`)
      .join(' / ');
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
    // 렌더 경로 예외 금지: parseConfigJson(core 검증·정규화·폴백) 경유(React와 동일).
    const parsed = parseConfigJson(JSON.stringify(raw));
    config.value = parsed.config;
    dirty.value = false;
    status.value = 'ready';
    const keys = Object.keys(parsed.config.experiments);
    if (selectedKey.value == null || !keys.includes(selectedKey.value)) {
      selectedKey.value = keys[0] ?? null;
    }
    message.value =
      !parsed.ok && parsed.message
        ? `Loaded with warning: ${parsed.message}`
        : null;
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

onMounted(() => {
  void loadConfigFromServer();
});

// --- 편집 (모두 @abnxt/core/admin 함수 경유) ---

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

function onRemoveExperiment(key: string): void {
  const c = config.value;
  if (!c) return;
  const next = removeExperiment(c, key);
  markDirty(next);
  if (selectedKey.value === key) {
    selectedKey.value = Object.keys(next.experiments)[0] ?? null;
  }
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
  // setField는 variants를 다루지 않으므로 upsertExperiment로 변이 배열을 반영.
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
  updateSelectedVariants(setWeight(exp.variants, key, weight));
}

// --- Preview (override 쿠키) ---

function onPreview(variant: string): void {
  if (selectedKey.value == null) return;
  setOverride(selectedKey.value, variant);
  message.value = `Preview set: ${selectedKey.value} → ${variant}`;
}

function onClearPreview(): void {
  if (selectedKey.value == null) return;
  clearOverride(selectedKey.value);
  message.value = `Preview cleared: ${selectedKey.value}`;
}

// --- 저장 / Export / Import ---

async function onSave(): Promise<void> {
  const c = config.value;
  if (!c) return;
  try {
    await storage.value.save(c);
    dirty.value = false;
    message.value = 'Saved.';
  } catch (e) {
    message.value = `Save failed: ${(e as Error).message}`;
  }
}

function onExport(): void {
  const c = config.value;
  if (!c) return;
  const json = serializeConfig(c);
  if (typeof document === 'undefined') return;
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
      message.value = `Import failed: ${result.message ?? 'invalid config'}`;
      return;
    }
    config.value = result.config;
    dirty.value = true;
    selectedKey.value = Object.keys(result.config.experiments)[0] ?? null;
    message.value = 'Imported (not yet saved).';
  };
  reader.readAsText(file);
  input.value = '';
}
</script>

<template>
  <div class="abnxt-admin">
    <!-- 로딩 -->
    <div
      v-if="status === 'loading'"
      class="abnxt-admin__empty"
    >
      Loading…
    </div>

    <!-- 키 입력 게이트 -->
    <div
      v-else-if="status === 'gate'"
      class="abnxt-admin__gate"
    >
      <div class="abnxt-admin__title">{{ title }}</div>
      <p>Enter the admin key to continue.</p>
      <form @submit.prevent="submitKey">
        <input
          v-model="gateKey"
          class="abnxt-admin__gate-input"
          type="password"
          placeholder="Admin key"
          autocomplete="current-password"
        />
        <button
          class="abnxt-admin__btn abnxt-admin__btn--primary"
          type="submit"
          :disabled="gateBusy"
        >
          Unlock
        </button>
      </form>
      <div
        v-if="gateError"
        class="abnxt-admin__error"
      >
        {{ gateError }}
      </div>
    </div>

    <!-- 인증된 화면 -->
    <template v-else>
      <div class="abnxt-admin__header">
        <div class="abnxt-admin__title">{{ title }}</div>
        <button
          class="abnxt-admin__btn"
          type="button"
          @click="onAddExperiment"
        >
          + Experiment
        </button>
        <button
          class="abnxt-admin__btn"
          type="button"
          @click="onExport"
        >
          Export
        </button>
        <label class="abnxt-admin__btn">
          Import
          <input
            type="file"
            accept="application/json"
            style="display: none"
            @change="onImportFile"
          />
        </label>
        <button
          class="abnxt-admin__btn"
          :class="{ 'abnxt-admin__btn--dirty': dirty }"
          type="button"
          :disabled="!dirty"
          @click="onSave"
        >
          Save
        </button>
        <button
          class="abnxt-admin__btn"
          type="button"
          @click="logout"
        >
          Logout
        </button>
      </div>

      <div
        v-if="message"
        class="abnxt-admin__msg"
      >
        {{ message }}
      </div>

      <div class="abnxt-admin__body">
        <!-- 좌측 리스트 -->
        <div class="abnxt-admin__list">
          <div
            v-if="experimentEntries.length === 0"
            class="abnxt-admin__empty"
          >
            No experiments yet.
          </div>
          <div
            v-for="[key, exp] in experimentEntries"
            :key="key"
            class="abnxt-admin__list-item"
            :class="{
              'abnxt-admin__list-item--selected': key === selectedKey,
            }"
            @click="onSelect(key)"
          >
            <div class="abnxt-admin__list-main">
              <div class="abnxt-admin__list-name">{{ exp.name || key }}</div>
              <div class="abnxt-admin__list-key">{{ key }}</div>
              <div class="abnxt-admin__list-split">{{ splitLabel(exp) }}</div>
            </div>
            <button
              class="abnxt-admin__btn"
              type="button"
              aria-label="active"
              @click.stop="onToggleActive(key)"
            >
              {{ exp.active ? 'on' : 'off' }}
            </button>
          </div>
        </div>

        <!-- 우측 에디터 -->
        <div class="abnxt-admin__editor">
          <div
            v-if="!selected"
            class="abnxt-admin__empty"
          >
            Select an experiment to edit.
          </div>
          <template v-else>
            <div class="abnxt-admin__field">
              <label>name</label>
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
            </div>
            <div class="abnxt-admin__field">
              <label>active</label>
              <input
                type="checkbox"
                :checked="selected.active"
                @change="selectedKey && onToggleActive(selectedKey)"
              />
            </div>
            <div class="abnxt-admin__field">
              <label>sticky</label>
              <input
                type="checkbox"
                :checked="selected.sticky"
                @change="
                  onSetField({
                    sticky: ($event.target as HTMLInputElement).checked,
                  })
                "
              />
            </div>
            <div class="abnxt-admin__field">
              <label>seed</label>
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
            </div>
            <div class="abnxt-admin__field">
              <label>control</label>
              <select
                class="abnxt-admin__input"
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
            </div>

            <!-- variants -->
            <div
              v-for="v in selected.variants"
              :key="v.key"
              class="abnxt-admin__variant"
            >
              <!-- variant key는 읽기전용(rename은 sticky/배정에 영향 + 원본에 없음). -->
              <span class="abnxt-admin__variant-key">{{ v.key }}</span>
              <input
                type="range"
                min="0"
                max="100"
                :value="v.weight"
                @input="
                  onSetWeight(
                    v.key,
                    Number(($event.target as HTMLInputElement).value),
                  )
                "
              />
              <span class="abnxt-admin__variant-pct"
                >{{ selectedPercents[v.key] ?? 0 }}%</span
              >
              <button
                class="abnxt-admin__btn"
                type="button"
                @click="onPreview(v.key)"
              >
                Preview
              </button>
              <button
                class="abnxt-admin__btn"
                type="button"
                @click="onClearPreview"
              >
                Clear
              </button>
              <button
                class="abnxt-admin__btn abnxt-admin__btn--danger"
                type="button"
                @click="onRemoveVariant(v.key)"
              >
                ×
              </button>
            </div>
            <button
              class="abnxt-admin__btn"
              type="button"
              @click="onAddVariant"
            >
              + Variant
            </button>

            <!-- 시뮬레이션 -->
            <div class="abnxt-admin__sim">
              <div class="abnxt-admin__list-split">Simulation (1000 users)</div>
              <div
                v-for="row in simulation"
                :key="row.key"
                class="abnxt-admin__sim-row"
              >
                <span class="abnxt-admin__variant-key">{{ row.key }}</span>
                <span
                  class="abnxt-admin__sim-bar"
                  :style="{ width: row.pct * 2 + 'px' }"
                />
                <span class="abnxt-admin__variant-pct">{{ row.count }}</span>
              </div>
            </div>

            <div
              class="abnxt-admin__field"
              style="margin-top: 16px"
            >
              <button
                class="abnxt-admin__btn abnxt-admin__btn--danger"
                type="button"
                @click="selectedKey && onRemoveExperiment(selectedKey)"
              >
                Delete
              </button>
            </div>
          </template>
        </div>
      </div>
    </template>
  </div>
</template>

<style>
.abnxt-admin {
  font-family:
    system-ui,
    -apple-system,
    sans-serif;
  color: #111;
  max-width: 1100px;
  margin: 0 auto;
  padding: 16px;
}

.abnxt-admin *,
.abnxt-admin *::before,
.abnxt-admin *::after {
  box-sizing: border-box;
}

.abnxt-admin__header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.abnxt-admin__title {
  font-size: 16px;
  font-weight: 700;
  margin-right: auto;
}

.abnxt-admin__btn {
  font: inherit;
  padding: 6px 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
}

.abnxt-admin__btn:hover {
  background: #f9fafb;
}

.abnxt-admin__btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.abnxt-admin__btn--primary {
  background: #2563eb;
  border-color: #2563eb;
  color: #fff;
}

.abnxt-admin__btn--primary:hover {
  background: #1d4ed8;
}

.abnxt-admin__btn--danger {
  color: #dc2626;
  border-color: #fca5a5;
}

.abnxt-admin__btn--dirty {
  background: #2563eb;
  border-color: #2563eb;
  color: #fff;
}

.abnxt-admin__msg {
  padding: 8px 12px;
  border-radius: 6px;
  background: #f3f4f6;
  margin-bottom: 12px;
  font-size: 13px;
}

.abnxt-admin__body {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 16px;
}

.abnxt-admin__list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.abnxt-admin__list-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  cursor: pointer;
  background: #fff;
}

.abnxt-admin__list-item--selected {
  background: #eff6ff;
  border-color: #93c5fd;
}

.abnxt-admin__list-main {
  display: flex;
  flex-direction: column;
  min-width: 0;
  margin-right: auto;
}

.abnxt-admin__list-name {
  font-weight: 600;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.abnxt-admin__list-key {
  font-size: 11px;
  color: #6b7280;
}

.abnxt-admin__list-split {
  font-size: 11px;
  color: #6b7280;
}

.abnxt-admin__editor {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
}

.abnxt-admin__field {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.abnxt-admin__field label {
  width: 80px;
  font-size: 12px;
  color: #374151;
}

.abnxt-admin__input {
  font: inherit;
  padding: 4px 8px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
}

.abnxt-admin__variant {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.abnxt-admin__variant-key {
  width: 40px;
  font-weight: 600;
}

.abnxt-admin__variant-pct {
  width: 44px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.abnxt-admin__sim {
  margin-top: 16px;
}

.abnxt-admin__sim-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
  font-size: 12px;
}

.abnxt-admin__sim-bar {
  height: 12px;
  background: #2563eb;
  border-radius: 3px;
  min-width: 1px;
}

.abnxt-admin__gate {
  max-width: 360px;
  margin: 48px auto;
  text-align: center;
}

.abnxt-admin__gate-input {
  font: inherit;
  width: 100%;
  padding: 8px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  margin: 12px 0;
}

.abnxt-admin__empty {
  color: #6b7280;
  font-size: 13px;
  padding: 24px;
  text-align: center;
}

.abnxt-admin__error {
  color: #dc2626;
  font-size: 13px;
  margin-top: 8px;
}
</style>
