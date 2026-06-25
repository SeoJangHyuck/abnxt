/**
 * abnxt 어드민 다국어 사전(프레임워크 무관 단일 소스). Next(React)·Nuxt(Vue) 어드민이 공유한다.
 * 기본 언어는 영어(en). 호스트 페이지가 한국어면 detectAdminLang()이 'ko'를 돌려준다.
 */

export const ADMIN_LANGS = ['en', 'ko'] as const;
export type AdminLang = (typeof ADMIN_LANGS)[number];

/** 어드민 UI 문자열 키(모든 정적 라벨/힌트/메시지). `{x}`는 adminT vars로 치환. */
export interface AdminDict {
  headerSub: string;
  unsaved: string;
  export: string;
  import: string;
  save: string;
  logout: string;
  home: string;
  tipExport: string;
  tipImport: string;
  tipSave: string;
  tipLogout: string;
  tipHome: string;
  langToggle: string;

  listTitle: string;
  add: string;
  tipAdd: string;
  listEmpty: string;
  noSelection: string;

  gateText: string;
  unlock: string;
  adminKey: string;
  invalidKey: string;

  active: string;
  inactive: string;

  secBasic: string;
  fName: string;
  hName: string;
  fDescription: string;
  hDescription: string;
  fActive: string;
  hActive: string;
  fSticky: string;
  hSticky: string;
  fSeed: string;
  hSeed: string;
  fControl: string;
  hControl: string;

  secVariants: string;
  hVariants: string;
  hVariantsManual: string;
  weightTotal: string;
  weightOver: string;
  addVariant: string;
  maxVariants: string;
  tipRemoveVariant: string;

  secDanger: string;
  dangerText: string;
  dangerBtn: string;
  confirmTitle: string;
  confirmText: string;
  cancel: string;
  confirmReset: string;

  saved: string;
  saveFailed: string;
  imported: string;
  importFailed: string;
  exportFailed: string;
  resetDone: string;
  loadWarn: string;
}

const en: AdminDict = {
  headerSub: 'A/B test configuration · changes apply only after Save',
  unsaved: 'Unsaved changes',
  export: 'Export',
  import: 'Import',
  save: 'Save',
  logout: 'Logout',
  home: 'Home',
  tipExport: 'Export current configuration as a JSON file',
  tipImport: 'Import configuration from a JSON file (applies after Save)',
  tipSave: 'Save changes to the server',
  tipLogout: 'End session',
  tipHome: 'Go to home (/)',
  langToggle: 'Language',

  listTitle: 'Experiments',
  add: 'Add',
  tipAdd: 'Add a new experiment',
  listEmpty: 'No experiments yet.',
  noSelection: 'No experiment selected — pick one from the list on the left.',

  gateText:
    'Enter the admin key to access the panel. The key is verified server-side and exchanged for an HMAC session cookie.',
  unlock: 'Unlock',
  adminKey: 'Admin key',
  invalidKey: 'Invalid key',

  active: 'Active',
  inactive: 'Inactive',

  secBasic: 'Basic settings',
  fName: 'Name',
  hName: 'Human-readable name shown in dashboards and analytics.',
  fDescription: 'Description',
  hDescription:
    'Describe what this experiment changes and why. Shown here and stored in the config.',
  fActive: 'Active',
  hActive:
    'When off, all visitors get the control variant and no exposure events fire. (Disable instead of deleting.)',
  fSticky: 'Sticky',
  hSticky:
    'When on, the assigned variant is stored in a cookie and kept across visits.',
  fSeed: 'Seed',
  hSeed:
    'Deterministic hash seed (read-only). The same visitor is assigned independently per seed.',
  fControl: 'Control',
  hControl: 'Baseline variant. Used on fallback or when inactive.',

  secVariants: 'Variants & weights',
  hVariants:
    'Drag a slider to set its share (%); the other rebalances proportionally so the total always stays 100%.',
  hVariantsManual:
    'With 3+ variants, adjust each weight freely. The total must be 100% or less to save.',
  weightTotal: 'Total: {sum}%',
  weightOver: 'Total exceeds 100% — set it to 100% or less to save.',
  addVariant: 'Add variant',
  maxVariants: 'Up to {n} variants per experiment.',
  tipRemoveVariant: 'Remove variant',

  secDanger: 'Danger zone',
  dangerText:
    'Reset every visitor’s assignment cookie to force a full re-assignment. Applies after Save.',
  dangerBtn: 'Reset all-user cookies',
  confirmTitle: 'Reset all user cookies?',
  confirmText:
    'Every visitor’s existing assignment (sticky) is invalidated and re-assigned on their next visit. This applies immediately on confirm.',
  cancel: 'Cancel',
  confirmReset: 'Reset now',

  saved: 'Saved',
  saveFailed: 'Save failed',
  imported: 'Imported (unsaved)',
  importFailed: 'Import failed',
  exportFailed: 'Export failed',
  resetDone: 'All-user reset applied',
  loadWarn: 'Loaded with warning: {msg}',
};

const ko: AdminDict = {
  headerSub: 'A/B 테스트 구성 · 저장 전까지 미반영',
  unsaved: '미저장 변경',
  export: '내보내기',
  import: '가져오기',
  save: '저장',
  logout: '로그아웃',
  home: '홈',
  tipExport: '현재 구성을 JSON 파일로 내보내기',
  tipImport: 'JSON 파일에서 구성 가져오기(저장 전까지 미반영)',
  tipSave: '변경사항을 서버에 저장',
  tipLogout: '세션 종료',
  tipHome: '홈으로 이동 (/)',
  langToggle: '언어',

  listTitle: '실험 목록',
  add: '추가',
  tipAdd: '새 실험 추가',
  listEmpty: '아직 실험이 없습니다.',
  noSelection: '선택된 실험이 없습니다 — 왼쪽 목록에서 실험을 선택하세요.',

  gateText:
    '관리자 키를 입력해 어드민에 접근하세요. 키는 서버에서만 검증되며 HMAC 세션 쿠키로 교환됩니다.',
  unlock: '잠금 해제',
  adminKey: '관리자 키',
  invalidKey: '잘못된 키',

  active: '활성',
  inactive: '비활성',

  secBasic: '기본 설정',
  fName: '이름',
  hName: '대시보드/분석에 표시되는 사람이 읽는 이름입니다.',
  fDescription: '설명',
  hDescription:
    '이 실험이 무엇을 어떻게 바꾸는지 설명합니다. 여기에 표시되고 config에 함께 저장됩니다.',
  fActive: '활성화',
  hActive:
    '끄면 모든 방문자에게 control 변이가 강제되고 노출 이벤트가 발생하지 않습니다. (키 삭제 대신 비활성화로 운영)',
  fSticky: 'Sticky',
  hSticky: '켜면 한 번 배정된 변이가 쿠키에 저장되어 재방문 시 유지됩니다.',
  fSeed: 'Seed',
  hSeed:
    '결정적 해시 시드(읽기 전용). 같은 방문자라도 시드가 다르면 다른 실험에 독립적으로 배정됩니다.',
  fControl: 'Control',
  hControl: '기준(대조) 변이. 비활성/폴백 시 이 변이가 사용됩니다.',

  secVariants: '변이 & 가중치',
  hVariants:
    '슬라이더로 비중(%)을 조정하면 나머지 변이가 자동으로 비례 조정되어 합이 항상 100%로 유지됩니다.',
  hVariantsManual:
    '변이가 3개 이상이면 각 가중치를 자유롭게 조정합니다. 합이 100% 이하여야 저장됩니다.',
  weightTotal: '합계: {sum}%',
  weightOver: '합이 100%를 초과했습니다 — 저장하려면 100% 이하로 맞추세요.',
  addVariant: '변이 추가',
  maxVariants: '실험당 최대 {n}개 변이까지 추가할 수 있습니다.',
  tipRemoveVariant: '변이 제거',

  secDanger: '위험 영역',
  dangerText:
    '모든 사용자의 배정 쿠키를 초기화하여 전체 재배정을 강제합니다. 저장 후 적용됩니다.',
  dangerBtn: '모든 사용자 쿠키 초기화',
  confirmTitle: '모든 사용자 쿠키를 초기화할까요?',
  confirmText:
    '모든 방문자의 기존 배정(sticky)이 무효화되어 다음 방문 시 재배정됩니다. 확인 시 즉시 적용됩니다.',
  cancel: '취소',
  confirmReset: '지금 초기화',

  saved: '저장됨',
  saveFailed: '저장 실패',
  imported: '가져옴(미저장)',
  importFailed: '가져오기 실패',
  exportFailed: '내보내기 실패',
  resetDone: '전체 재배정이 적용되었습니다',
  loadWarn: '경고와 함께 로드됨: {msg}',
};

export const ADMIN_STRINGS: Record<AdminLang, AdminDict> = { en, ko };

/** 호스트 페이지 언어 감지: 한국어면 'ko', 그 외/불명은 'en'(기본 영어). */
export function detectAdminLang(): AdminLang {
  if (typeof document !== 'undefined') {
    const htmlLang = (
      document.documentElement.getAttribute('lang') ?? ''
    ).toLowerCase();
    if (htmlLang.startsWith('ko')) return 'ko';
    if (htmlLang) return 'en';
  }
  if (typeof navigator !== 'undefined' && navigator.language) {
    return navigator.language.toLowerCase().startsWith('ko') ? 'ko' : 'en';
  }
  return 'en';
}

/** 사전 조회 + `{x}` 치환. 누락 키는 en으로 폴백. */
export function adminT(
  lang: AdminLang,
  key: keyof AdminDict,
  vars?: Record<string, string | number>,
): string {
  const dict = ADMIN_STRINGS[lang] ?? ADMIN_STRINGS.en;
  let s = dict[key] ?? ADMIN_STRINGS.en[key] ?? String(key);
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      s = s.replace(`{${k}}`, String(v));
    }
  }
  return s;
}
