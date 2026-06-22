import { describe, it, expect } from 'vitest';
import {
  nextProxy,
  nextAdminPage,
  nextConfigRoute,
  nextAuthRoute,
  seedConfig,
  abnxtConfigTs,
  nextLayoutManual,
} from './next';

describe('next templates', () => {
  it('proxy uses createAbProxy from @abnxt/next/server', () => {
    expect(nextProxy()).toContain("from '@abnxt/next/server'");
    expect(nextProxy()).toContain('createAbProxy');
  });
  it('layout manual guidance mentions ABProvider', () => {
    expect(nextLayoutManual()).toContain('ABProvider');
  });
  it('admin page renders native <AbnxtAdmin/> from @abnxt/next/admin', () => {
    const p = nextAdminPage();
    expect(p).toContain("from '@abnxt/next/admin'");
    expect(p).toContain('AbnxtAdmin');
    expect(p).toContain('<AbnxtAdmin');
    // 네이티브 어드민은 더 이상 @abnxt/admin을 mount하지 않는다.
    expect(p).not.toContain('@abnxt/admin');
    expect(p).not.toContain('mount(');
  });
  it('config route exposes GET/PUT with fsAdminStorage + cookie auth', () => {
    const r = nextConfigRoute();
    expect(r).toContain('createAbnxtConfigRoute');
    expect(r).toContain('fsAdminStorage');
    expect(r).toContain('abnxtCookieAuth');
    expect(r).toMatch(/export const GET/);
    expect(r).toMatch(/export const PUT/);
  });
  it('auth route exposes POST/DELETE via createAbnxtAuthRoute', () => {
    const r = nextAuthRoute();
    expect(r).toContain('createAbnxtAuthRoute');
    expect(r).toMatch(/export const \{ POST, DELETE \}/);
  });
  it('seedConfig is valid JSON with a sample experiment', () => {
    expect(JSON.parse(seedConfig()).experiments['homepage-hero']).toBeDefined();
  });
  it('abnxtConfigTs lists default sinks', () => {
    expect(abnxtConfigTs(['domEvent'])).toContain('domEvent');
  });
});
