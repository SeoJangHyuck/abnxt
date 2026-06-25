import { describe, it, expect } from 'vitest';
import { injectWithMarkers, MARKER_START } from './inject';

describe('injectWithMarkers', () => {
  it('inserts snippet after the anchor with markers', () => {
    const src = `import x\n// ANCHOR\nrest`;
    const r = injectWithMarkers(src, 'INJECTED', '// ANCHOR');
    expect(r.changed).toBe(true);
    expect(r.content).toContain(MARKER_START);
    expect(r.content).toContain('INJECTED');
    expect(r.content.indexOf('// ANCHOR')).toBeLessThan(
      r.content.indexOf('INJECTED'),
    );
  });
  it('is idempotent — re-injecting a present marker block is a no-op', () => {
    const src = `// ANCHOR\n`;
    const once = injectWithMarkers(src, 'INJECTED', '// ANCHOR');
    const twice = injectWithMarkers(once.content, 'INJECTED', '// ANCHOR');
    expect(twice.changed).toBe(false);
    expect(twice.content).toBe(once.content);
  });
  it('returns changed:false when anchor missing', () => {
    const r = injectWithMarkers('no anchor here', 'X', '// ANCHOR');
    expect(r.changed).toBe(false);
  });
  it('re-syncs the block when the snippet changed (no duplicate block)', () => {
    const once = injectWithMarkers('// ANCHOR\n', 'OLD', '// ANCHOR');
    const resync = injectWithMarkers(once.content, 'NEW', '// ANCHOR');
    expect(resync.changed).toBe(true);
    expect(resync.content).toContain('NEW');
    expect(resync.content).not.toContain('OLD');
    expect(resync.content.split(MARKER_START).length - 1).toBe(1);
  });
  it('flags corruption when the END marker is missing (does not touch the file)', () => {
    const src = `// ANCHOR\n${MARKER_START}\nLEFTOVER\n`;
    const r = injectWithMarkers(src, 'SNIP', '// ANCHOR');
    expect(r.corrupted).toBe(true);
    expect(r.changed).toBe(false);
    expect(r.content).toBe(src);
  });
});
