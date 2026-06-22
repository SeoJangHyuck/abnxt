/**
 * 어드민 자기완결 CSS(외부 의존 0). Vue 어드민과 **동일 클래스명/규칙**으로 형평성 유지.
 * `<AbnxtAdmin>`가 `<style id="abnxt-admin-styles">`로 1회 주입한다.
 */
export const ADMIN_CSS = `
.abnxt-admin{font-family:system-ui,-apple-system,sans-serif;color:#111;max-width:1100px;margin:0 auto;padding:16px}
.abnxt-admin *,.abnxt-admin *::before,.abnxt-admin *::after{box-sizing:border-box}
.abnxt-admin__header{display:flex;align-items:center;gap:8px;padding-bottom:12px;border-bottom:1px solid #e5e7eb;margin-bottom:12px;flex-wrap:wrap}
.abnxt-admin__title{font-size:16px;font-weight:700;margin-right:auto}
.abnxt-admin__btn{font:inherit;padding:6px 10px;border:1px solid #d1d5db;border-radius:6px;background:#fff;cursor:pointer}
.abnxt-admin__btn:hover{background:#f9fafb}
.abnxt-admin__btn:disabled{opacity:.5;cursor:default}
.abnxt-admin__btn--primary{background:#2563eb;border-color:#2563eb;color:#fff}
.abnxt-admin__btn--primary:hover{background:#1d4ed8}
.abnxt-admin__btn--danger{color:#dc2626;border-color:#fca5a5}
.abnxt-admin__btn--dirty{background:#2563eb;border-color:#2563eb;color:#fff}
.abnxt-admin__msg{padding:8px 12px;border-radius:6px;background:#f3f4f6;margin-bottom:12px;font-size:13px}
.abnxt-admin__body{display:grid;grid-template-columns:280px 1fr;gap:16px}
.abnxt-admin__list{display:flex;flex-direction:column;gap:4px}
.abnxt-admin__list-item{display:flex;align-items:center;gap:8px;padding:8px;border:1px solid #e5e7eb;border-radius:6px;cursor:pointer;background:#fff}
.abnxt-admin__list-item--selected{background:#eff6ff;border-color:#93c5fd}
.abnxt-admin__list-main{display:flex;flex-direction:column;min-width:0;margin-right:auto}
.abnxt-admin__list-name{font-weight:600;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.abnxt-admin__list-key{font-size:11px;color:#6b7280}
.abnxt-admin__list-split{font-size:11px;color:#6b7280}
.abnxt-admin__editor{border:1px solid #e5e7eb;border-radius:8px;padding:16px}
.abnxt-admin__field{display:flex;align-items:center;gap:8px;margin-bottom:10px}
.abnxt-admin__field label{width:80px;font-size:12px;color:#374151}
.abnxt-admin__input{font:inherit;padding:4px 8px;border:1px solid #d1d5db;border-radius:4px}
.abnxt-admin__variant{display:flex;align-items:center;gap:8px;margin-bottom:6px}
.abnxt-admin__variant-key{width:40px;font-weight:600}
.abnxt-admin__variant-pct{width:44px;text-align:right;font-variant-numeric:tabular-nums}
.abnxt-admin__sim{margin-top:16px}
.abnxt-admin__sim-row{display:flex;align-items:center;gap:8px;margin-bottom:4px;font-size:12px}
.abnxt-admin__sim-bar{height:12px;background:#2563eb;border-radius:3px;min-width:1px}
.abnxt-admin__gate{max-width:360px;margin:48px auto;text-align:center}
.abnxt-admin__gate-input{font:inherit;width:100%;padding:8px;border:1px solid #d1d5db;border-radius:6px;margin:12px 0}
.abnxt-admin__empty{color:#6b7280;font-size:13px;padding:24px;text-align:center}
.abnxt-admin__error{color:#dc2626;font-size:13px;margin-top:8px}
`;

/** 주입용 style 엘리먼트 id(중복 주입 방지 키). */
export const ADMIN_STYLE_ID = 'abnxt-admin-styles';
