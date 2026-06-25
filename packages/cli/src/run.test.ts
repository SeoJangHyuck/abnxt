import { describe, it, expect } from 'vitest';
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  writeFileSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { atomicWrite } from './run';

describe('atomicWrite', () => {
  it('writes content (creating parent dirs) and leaves no temp file behind', () => {
    const dir = mkdtempSync(join(tmpdir(), 'abnxt-aw-'));
    try {
      const target = join(dir, 'sub', 'file.txt');
      atomicWrite(target, 'hello');
      expect(readFileSync(target, 'utf8')).toBe('hello');
      // 원자적 rename 완료 후 같은 디렉토리에 .tmp 잔여물이 없어야 한다.
      const leftover = readdirSync(join(dir, 'sub')).filter((f) =>
        f.includes('.tmp'),
      );
      expect(leftover).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('atomically replaces an existing file with no leftover temp', () => {
    const dir = mkdtempSync(join(tmpdir(), 'abnxt-aw-'));
    try {
      const target = join(dir, 'file.txt');
      writeFileSync(target, 'old');
      atomicWrite(target, 'new');
      expect(readFileSync(target, 'utf8')).toBe('new');
      expect(readdirSync(dir)).toEqual(['file.txt']);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
