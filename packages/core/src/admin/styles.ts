/**
 * abnxt 어드민 자기완결 CSS(외부 의존 0). Next(React)·Nuxt(Vue) 어드민이 **단일 소스**로 공유한다.
 * Shadow DOM 내부 `<style>`로 주입되어 호스트 CSS와 완전히 격리된다.
 * 루트는 `font-family: inherit`로 호스트 폰트만 상속하고, 그 외 모든 스타일은 자체 토큰을 쓴다.
 * (포털/Teleport 루트에는 반드시 `.abnxt-admin` 클래스를 부여해야 --abx-* 변수가 적용된다.)
 */
export const ADMIN_CSS = `
.abnxt-admin{
  font-family:inherit;
  --abx-bg:#ffffff;
  --abx-surface:#f8fafc;
  --abx-surface-2:#eef2f7;
  --abx-border:#e6eaf0;
  --abx-border-strong:#cbd5e1;
  --abx-text:#0f172a;
  --abx-muted:#64748b;
  --abx-faint:#94a3b8;
  --abx-primary:#4f46e5;
  --abx-primary-hover:#4338ca;
  --abx-primary-soft:#eef2ff;
  --abx-danger:#dc2626;
  --abx-danger-soft:#fef2f2;
  --abx-success:#16a34a;
  --abx-success-soft:#f0fdf4;
  --abx-radius:12px;
  --abx-radius-sm:8px;
  --abx-shadow:0 24px 70px -16px rgba(15,23,42,.4),0 0 0 1px rgba(15,23,42,.05);
  color:var(--abx-text);
  font-size:14px;
  line-height:1.5;
  -webkit-font-smoothing:antialiased;
}
.abnxt-admin *,.abnxt-admin *::before,.abnxt-admin *::after{box-sizing:border-box}

/* ── overlay + card ───────────────────────────────────── */
.abnxt-modal__overlay{
  position:fixed;inset:0;z-index:2147483647;
  display:flex;align-items:center;justify-content:center;
  padding:28px;
  background:rgba(15,23,42,.5);
  backdrop-filter:blur(4px);
}
.abnxt-modal__card{
  position:relative;
  display:flex;flex-direction:column;
  width:min(1140px,100%);height:min(760px,100%);
  background:var(--abx-bg);
  border-radius:18px;
  box-shadow:var(--abx-shadow);
  overflow:hidden;
}
/* 게이트(로그인) 화면의 언어 토글 — 카드 우상단 고정(인증 후 헤더 토글과 동일 위치감) */
.abnxt-admin__gate-lang{position:absolute;top:18px;right:18px;z-index:1}

/* ── header ───────────────────────────────────────────── */
.abnxt-modal__header{
  display:flex;align-items:center;gap:12px;
  padding:16px 22px;
  border-bottom:1px solid var(--abx-border);
  background:var(--abx-bg);
}
.abnxt-modal__brand{display:flex;align-items:center;gap:11px;margin-right:auto;min-width:0}
.abnxt-modal__logo{
  display:flex;align-items:center;justify-content:center;
  width:32px;height:32px;border-radius:9px;
  background:var(--abx-primary);color:#fff;flex:none;
}
.abnxt-modal__title{font-size:15px;font-weight:700;letter-spacing:-.01em;white-space:nowrap}
.abnxt-modal__sub{font-size:12px;color:var(--abx-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.abnxt-modal__badge{
  display:inline-flex;align-items:center;gap:5px;
  padding:4px 10px;border-radius:999px;
  font-size:11px;font-weight:600;
  background:#fef9c3;color:#854d0e;flex:none;
}
.abnxt-modal__badge-dot{width:6px;height:6px;border-radius:50%;background:#ca8a04}
.abnxt-modal__actions{display:flex;align-items:center;gap:8px}

/* ── language toggle ──────────────────────────────────── */
.abnxt-admin__lang{
  display:inline-flex;flex:none;
  border:1px solid var(--abx-border-strong);border-radius:999px;
  overflow:hidden;background:var(--abx-bg);
}
.abnxt-admin__lang button{
  font:inherit;font-size:12px;font-weight:700;letter-spacing:.02em;
  padding:5px 11px;border:none;background:transparent;color:var(--abx-muted);cursor:pointer;
  transition:background .12s,color .12s;
}
.abnxt-admin__lang button:not(:last-child){border-right:1px solid var(--abx-border)}
.abnxt-admin__lang button[data-on="true"]{background:var(--abx-primary);color:#fff}
.abnxt-admin__lang button:focus-visible{outline:none;box-shadow:inset 0 0 0 2px var(--abx-primary-soft)}

/* ── buttons ──────────────────────────────────────────── */
.abnxt-admin__btn{
  display:inline-flex;align-items:center;justify-content:center;gap:6px;
  font:inherit;font-size:13px;font-weight:600;
  padding:8px 13px;
  border:1px solid var(--abx-border-strong);
  border-radius:var(--abx-radius-sm);
  background:var(--abx-bg);color:var(--abx-text);
  cursor:pointer;white-space:nowrap;
  transition:background .12s,border-color .12s,box-shadow .12s,opacity .12s;
}
.abnxt-admin__btn:hover{background:var(--abx-surface)}
.abnxt-admin__btn:focus-visible{outline:none;box-shadow:0 0 0 3px var(--abx-primary-soft)}
.abnxt-admin__btn:disabled{opacity:.5;cursor:default}
.abnxt-admin__btn--primary{background:var(--abx-primary);border-color:var(--abx-primary);color:#fff}
.abnxt-admin__btn--primary:hover:not(:disabled){background:var(--abx-primary-hover);border-color:var(--abx-primary-hover)}
.abnxt-admin__btn--danger{background:var(--abx-danger-soft);border-color:#fecaca;color:var(--abx-danger)}
.abnxt-admin__btn--danger:hover:not(:disabled){background:#fee2e2}
.abnxt-admin__btn--ghost{border-color:transparent;background:transparent;color:var(--abx-muted)}
.abnxt-admin__btn--ghost:hover{background:var(--abx-surface);color:var(--abx-text)}
.abnxt-admin__btn--icon{padding:8px;width:34px;height:34px}
.abnxt-admin__btn--sm{padding:6px 10px;font-size:12px}
.abnxt-admin__icon{display:block;flex:none}

/* ── body grid ────────────────────────────────────────── */
.abnxt-modal__body{flex:1;display:grid;grid-template-columns:360px 1fr;min-height:0}
.abnxt-admin__msg{
  margin:12px 22px 0;padding:10px 13px;border-radius:var(--abx-radius-sm);
  font-size:13px;background:var(--abx-surface-2);color:var(--abx-text);
}
.abnxt-admin__msg--error{background:var(--abx-danger-soft);color:var(--abx-danger)}
.abnxt-admin__msg--success{background:var(--abx-success-soft);color:var(--abx-success)}

/* ── sidebar list ─────────────────────────────────────── */
.abnxt-admin__sidebar{
  display:flex;flex-direction:column;min-height:0;
  border-right:1px solid var(--abx-border);background:var(--abx-surface);
}
.abnxt-admin__sidebar-head{
  display:flex;align-items:center;justify-content:space-between;gap:8px;
  padding:16px 16px 10px;
}
.abnxt-admin__sidebar-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--abx-muted)}
.abnxt-admin__list{flex:1;display:flex;flex-direction:column;gap:7px;padding:4px 14px 16px;overflow:auto}
.abnxt-admin__sidebar-foot{padding:14px;border-top:1px solid var(--abx-border)}
.abnxt-admin__sidebar-foot .abnxt-admin__danger-zone{margin-top:0}
.abnxt-admin__list-item{
  display:flex;align-items:center;gap:12px;
  padding:11px 13px;border:1px solid var(--abx-border);border-radius:var(--abx-radius);
  background:var(--abx-bg);cursor:pointer;text-align:left;width:100%;font:inherit;
  transition:border-color .12s,box-shadow .12s,background .12s;
}
.abnxt-admin__list-item:hover{border-color:var(--abx-border-strong);background:var(--abx-bg)}
.abnxt-admin__list-item--selected{border-color:var(--abx-primary);box-shadow:0 0 0 1px var(--abx-primary);background:var(--abx-bg)}
/* 비활성 실험은 흐리게(목록에서 즉시 구분) — 텍스트만 dim, 상태 pill은 선명 유지 */
.abnxt-admin__list-item--inactive .abnxt-admin__list-main{opacity:.5}
.abnxt-admin__list-main{display:flex;flex-direction:column;gap:3px;min-width:0;flex:1}
.abnxt-admin__list-name{font-weight:600;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.abnxt-admin__list-meta{display:block;font-size:11px;color:var(--abx-faint);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
.abnxt-admin__list-key{font-family:ui-monospace,SFMono-Regular,Menlo,monospace}

.abnxt-admin__pill{
  display:inline-flex;align-items:center;gap:4px;
  padding:3px 9px;border-radius:999px;font-size:10px;font-weight:700;
  text-transform:uppercase;letter-spacing:.03em;flex:none;
}
.abnxt-admin__pill--on{background:var(--abx-success-soft);color:var(--abx-success)}
.abnxt-admin__pill--off{background:var(--abx-surface-2);color:var(--abx-faint)}

/* ── toggle switch ────────────────────────────────────── */
.abnxt-admin__switch{
  position:relative;display:inline-flex;flex:none;
  width:40px;height:23px;border-radius:999px;
  background:var(--abx-border-strong);border:none;cursor:pointer;padding:0;
  transition:background .15s;
}
.abnxt-admin__switch[data-on="true"]{background:var(--abx-primary)}
.abnxt-admin__switch::after{
  content:"";position:absolute;top:2px;left:2px;
  width:19px;height:19px;border-radius:50%;background:#fff;
  box-shadow:0 1px 2px rgba(0,0,0,.2);transition:transform .15s;
}
.abnxt-admin__switch[data-on="true"]::after{transform:translateX(17px)}
.abnxt-admin__switch:focus-visible{outline:none;box-shadow:0 0 0 3px var(--abx-primary-soft)}

/* ── editor ───────────────────────────────────────────── */
.abnxt-admin__editor{padding:22px 26px 28px;overflow:auto;min-height:0;animation:abnxt-fade-in .22s ease}
.abnxt-admin__editor-head{
  display:flex;align-items:flex-start;gap:12px;
  padding:16px 18px;border:1px solid var(--abx-border);border-radius:var(--abx-radius);
  background:var(--abx-surface);
}
.abnxt-admin__editor-title{font-size:17px;font-weight:700;letter-spacing:-.01em}
.abnxt-admin__editor-key{font-size:12px;color:var(--abx-muted);font-family:ui-monospace,SFMono-Regular,Menlo,monospace;margin-top:2px}
.abnxt-admin__editor-desc{font-size:13px;color:var(--abx-muted);margin:6px 0 0;max-width:64ch}
.abnxt-admin__editor-actions{display:flex;align-items:center;gap:10px;flex:none}

.abnxt-admin__section{
  margin-top:22px;padding-top:20px;border-top:1px solid var(--abx-border);
}
.abnxt-admin__section:first-of-type{margin-top:18px}
.abnxt-admin__section-title{
  display:flex;align-items:center;gap:8px;
  font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;
  color:var(--abx-muted);margin-bottom:6px;
}
.abnxt-admin__section-intro{font-size:12px;color:var(--abx-muted);margin:0 0 14px}

/* fields: 각 항목을 구분선으로 분리(구분감) */
.abnxt-admin__field{padding:14px 0;border-bottom:1px solid var(--abx-border)}
.abnxt-admin__field:first-of-type{padding-top:4px}
.abnxt-admin__field:last-child{border-bottom:none;padding-bottom:0}
.abnxt-admin__field-head{display:flex;align-items:center;gap:8px;margin-bottom:7px}
.abnxt-admin__label{font-size:13px;font-weight:600}
.abnxt-admin__hint{font-size:12px;color:var(--abx-muted);margin:7px 0 0;max-width:64ch}
.abnxt-admin__input,.abnxt-admin__select,.abnxt-admin__textarea{
  font:inherit;font-size:13px;width:100%;
  padding:9px 12px;border:1px solid var(--abx-border-strong);
  border-radius:var(--abx-radius-sm);background:var(--abx-bg);color:var(--abx-text);
}
.abnxt-admin__textarea{min-height:62px;resize:vertical;line-height:1.5}
.abnxt-admin__select{
  appearance:none;-webkit-appearance:none;-moz-appearance:none;
  padding-right:38px;cursor:pointer;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat:no-repeat;background-position:right 13px center;background-size:16px 16px;
}
.abnxt-admin__input:focus,.abnxt-admin__select:focus,.abnxt-admin__textarea:focus{outline:none;border-color:var(--abx-primary);box-shadow:0 0 0 3px var(--abx-primary-soft)}
.abnxt-admin__input[readonly]{background:var(--abx-surface-2);color:var(--abx-muted);cursor:default}
.abnxt-admin__input[readonly]:focus{border-color:var(--abx-border-strong);box-shadow:none}
.abnxt-admin__field--inline{display:flex;align-items:center;justify-content:space-between;gap:18px}
.abnxt-admin__field-text{display:flex;flex-direction:column;min-width:0}
.abnxt-admin__field-text .abnxt-admin__label{margin-bottom:0}
.abnxt-admin__field-text .abnxt-admin__hint{margin-top:4px}

/* ── variants + weight sliders (thumb sits ON the bar) ── */
.abnxt-admin__variant{
  display:grid;grid-template-columns:30px 1fr auto;align-items:center;gap:14px;
  padding:14px;border:1px solid var(--abx-border);border-radius:var(--abx-radius);
  background:var(--abx-bg);margin-bottom:10px;
}
.abnxt-admin__variant-key{
  display:flex;align-items:center;justify-content:center;
  width:30px;height:30px;border-radius:8px;
  font-weight:700;font-size:13px;color:#fff;flex:none;
}
.abnxt-admin__variant-track{display:flex;align-items:center;gap:14px;min-width:0}
.abnxt-admin__bar{position:relative;flex:1;height:8px;border-radius:999px;background:var(--abx-surface-2);min-width:0}
.abnxt-admin__bar-fill{position:absolute;left:0;top:0;bottom:0;border-radius:999px;transition:width .12s ease}
.abnxt-admin__range{
  position:absolute;left:0;top:50%;transform:translateY(-50%);
  width:100%;height:20px;margin:0;cursor:pointer;
  -webkit-appearance:none;appearance:none;background:transparent;
}
.abnxt-admin__range:focus{outline:none}
.abnxt-admin__range::-webkit-slider-runnable-track{height:8px;background:transparent}
.abnxt-admin__range::-moz-range-track{height:8px;background:transparent}
.abnxt-admin__range::-webkit-slider-thumb{
  -webkit-appearance:none;appearance:none;margin-top:-4px;
  width:16px;height:16px;border-radius:50%;
  background:#fff;border:3px solid currentColor;box-shadow:0 1px 4px rgba(15,23,42,.28);
}
.abnxt-admin__range::-moz-range-thumb{
  width:14px;height:14px;border-radius:50%;
  background:#fff;border:3px solid currentColor;box-shadow:0 1px 4px rgba(15,23,42,.28);
}
.abnxt-admin__range:focus-visible::-webkit-slider-thumb{box-shadow:0 0 0 4px var(--abx-primary-soft)}
.abnxt-admin__range:focus-visible::-moz-range-thumb{box-shadow:0 0 0 4px var(--abx-primary-soft)}
.abnxt-admin__pct{width:48px;text-align:right;font-weight:700;font-size:13px;font-variant-numeric:tabular-nums;flex:none}
.abnxt-admin__variant-actions{display:flex;align-items:center;gap:4px}

/* 변이 3개+ 수동 합계 표시 */
.abnxt-admin__weight-total{
  display:flex;align-items:center;justify-content:space-between;gap:12px;
  margin-top:6px;padding:10px 13px;border-radius:var(--abx-radius-sm);
  background:var(--abx-surface-2);font-size:13px;color:var(--abx-muted);
}
.abnxt-admin__weight-total b{font-weight:700;color:var(--abx-text);font-variant-numeric:tabular-nums}
.abnxt-admin__weight-total--error{background:var(--abx-danger-soft);color:var(--abx-danger)}
.abnxt-admin__weight-total--error b{color:var(--abx-danger)}
.abnxt-admin__weight-warn{margin-top:8px;font-size:12px;color:var(--abx-danger)}

/* ── danger zone ──────────────────────────────────────── */
.abnxt-admin__danger-zone{
  margin-top:24px;padding:16px;border:1px dashed #fca5a5;border-radius:var(--abx-radius);
  background:var(--abx-danger-soft);
}
.abnxt-admin__danger-title{font-size:13px;font-weight:700;color:var(--abx-danger);margin-bottom:4px}
.abnxt-admin__danger-text{font-size:12px;color:#b91c1c;margin-bottom:12px;max-width:64ch}

/* ── gate ─────────────────────────────────────────────── */
.abnxt-admin__gate{display:flex;align-items:center;justify-content:center;height:100%;padding:24px}
.abnxt-admin__gate-card{width:100%;max-width:360px;text-align:center}
.abnxt-admin__gate-logo{
  display:inline-flex;align-items:center;justify-content:center;
  width:48px;height:48px;border-radius:12px;background:var(--abx-primary);color:#fff;margin-bottom:14px;
}
.abnxt-admin__gate-title{font-size:18px;font-weight:700;margin-bottom:6px}
.abnxt-admin__gate-text{font-size:13px;color:var(--abx-muted);margin-bottom:18px;line-height:1.55}
.abnxt-admin__gate-input{
  font:inherit;font-size:14px;width:100%;text-align:center;
  padding:11px 12px;border:1px solid var(--abx-border-strong);border-radius:var(--abx-radius-sm);
  background:var(--abx-bg);color:var(--abx-text);margin-bottom:12px;
}
.abnxt-admin__gate-input:focus{outline:none;border-color:var(--abx-primary);box-shadow:0 0 0 3px var(--abx-primary-soft)}
.abnxt-admin__gate .abnxt-admin__btn{width:100%;padding:11px}

/* ── confirm dialog ───────────────────────────────────── */
.abnxt-admin__confirm{
  position:absolute;inset:0;z-index:10;
  display:flex;align-items:center;justify-content:center;padding:24px;
  background:rgba(15,23,42,.45);backdrop-filter:blur(2px);
}
.abnxt-admin__confirm-card{
  width:100%;max-width:380px;padding:22px;
  background:var(--abx-bg);border-radius:14px;box-shadow:var(--abx-shadow);
}
.abnxt-admin__confirm-title{font-size:16px;font-weight:700;margin-bottom:8px}
.abnxt-admin__confirm-text{font-size:13px;color:var(--abx-muted);margin-bottom:18px;line-height:1.55}
.abnxt-admin__confirm-actions{display:flex;gap:8px;justify-content:flex-end}

/* ── misc ─────────────────────────────────────────────── */
.abnxt-admin__empty{display:flex;align-items:center;justify-content:center;height:100%;padding:32px;color:var(--abx-muted);font-size:13px;text-align:center}
.abnxt-admin__spinner{
  width:26px;height:26px;border-radius:50%;
  border:3px solid var(--abx-border);border-top-color:var(--abx-primary);
  animation:abnxt-spin .7s linear infinite;
}
@keyframes abnxt-spin{to{transform:rotate(360deg)}}
@keyframes abnxt-fade-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
`;

/** 주입용 style 엘리먼트 id(중복 주입 방지 키). */
export const ADMIN_STYLE_ID = 'abnxt-admin-styles';

/** variant 인덱스별 막대 색상(8색 순환). 모든 어댑터 공유. */
export const VARIANT_COLORS = [
  '#4f46e5',
  '#059669',
  '#d97706',
  '#e11d48',
  '#0284c7',
  '#7c3aed',
  '#0d9488',
  '#db2777',
];

/** variant key 인덱스에 대응하는 색상(순환). */
export function variantColor(index: number): string {
  return VARIANT_COLORS[
    ((index % VARIANT_COLORS.length) + VARIANT_COLORS.length) %
      VARIANT_COLORS.length
  ];
}
