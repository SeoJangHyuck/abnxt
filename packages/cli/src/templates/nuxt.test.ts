import { describe, it, expect } from 'vitest';
import { nuxtAdminPage, nuxtConfigModuleSnippet } from './nuxt';

describe('nuxt templates', () => {
  it('admin page renders auto-registered <AbnxtAdmin/> (no @abnxt/admin)', () => {
    const p = nuxtAdminPage();
    expect(p).toContain('<AbnxtAdmin');
    // 모듈이 컴포넌트를 자동 등록하므로 import도 mount도 없다.
    expect(p).not.toContain('@abnxt/admin');
    expect(p).not.toContain('mount(');
  });
  it('module snippet registers @abnxt/nuxt and enables admin', () => {
    const s = nuxtConfigModuleSnippet();
    expect(s).toContain('@abnxt/nuxt');
    expect(s).toContain('admin');
    expect(s).toContain('adminKey');
    expect(s).toContain('ABNXT_ADMIN_KEY');
  });
});
