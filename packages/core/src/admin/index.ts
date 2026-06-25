/**
 * `@abnxt/core/admin` — 프레임워크 무관 어드민 편집 로직(순수 함수 + IO 주입식).
 * React(`@abnxt/next`)·Vue(`@abnxt/nuxt`) 네이티브 어드민이 동일 로직을 공유한다.
 */
export {
  upsertExperiment,
  toggleActive,
  setField,
  addExperiment,
  removeExperiment,
  bumpResetEpoch,
} from './edit';
export {
  normalizeToPercents,
  addVariant,
  removeVariant,
  setWeight,
  redistributeWeights,
  weightSummary,
  weightDisplay,
  type WeightSummary,
} from './weights';
export {
  ADMIN_CSS,
  ADMIN_STYLE_ID,
  VARIANT_COLORS,
  variantColor,
} from './styles';
export { simulateSplit } from './simulate';
export {
  ADMIN_LANGS,
  ADMIN_STRINGS,
  detectAdminLang,
  adminT,
  type AdminLang,
  type AdminDict,
} from './i18n';
export { setOverride, clearOverride, type PreviewCookieIO } from './preview';
export { serializeConfig, parseConfigJson, type ParseResult } from './storage';
export {
  apiStorage,
  type ApiStorageOptions,
  type FetchLike,
} from './api-storage';
