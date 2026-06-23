import { describe, it, expect } from 'vitest';
import {
  parseStickyCookie,
  serializeStickyCookie,
  createStickyWriter,
} from './sticky';

describe('parse/serialize sticky cookie', () => {
  it('round-trips a map', () => {
    const map = { 'homepage-hero': 'B', pricing: 'A' };
    expect(parseStickyCookie(serializeStickyCookie(map))).toEqual(map);
  });

  it('returns {} for empty/garbage input', () => {
    expect(parseStickyCookie(undefined)).toEqual({});
    expect(parseStickyCookie('')).toEqual({});
    expect(parseStickyCookie('not-json')).toEqual({});
    expect(parseStickyCookie(encodeURIComponent('123'))).toEqual({});
  });

  it('keeps only string values', () => {
    expect(
      parseStickyCookie(encodeURIComponent(JSON.stringify({ a: 'A', b: 5 }))),
    ).toEqual({ a: 'A' });
  });
});

describe('createStickyWriter', () => {
  it('batches multiple records into a single write', () => {
    let stored: string | undefined;
    let writes = 0;
    const tasks: Array<() => void> = [];
    const writer = createStickyWriter(
      {
        read: () => stored,
        write: (v) => {
          stored = v;
          writes++;
        },
      },
      { schedule: (cb) => tasks.push(cb) },
    );
    writer.record('exp1', 'A');
    writer.record('exp2', 'B');
    expect(writes).toBe(0); // 아직 flush 전
    tasks.forEach((t) => t()); // microtask 실행
    expect(writes).toBe(1); // 단일 write
    expect(parseStickyCookie(stored)).toEqual({ exp1: 'A', exp2: 'B' });
  });

  it('merges with the existing cookie value', () => {
    let stored = serializeStickyCookie({ old: 'X' });
    const writer = createStickyWriter(
      {
        read: () => stored,
        write: (v) => {
          stored = v;
        },
      },
      { schedule: (cb) => cb() }, // 동기 실행
    );
    writer.record('new', 'Y');
    expect(parseStickyCookie(stored)).toEqual({ old: 'X', new: 'Y' });
  });

  it('records the epoch alongside assignments when getEpoch > 0', () => {
    let stored: string | undefined;
    const writer = createStickyWriter(
      {
        read: () => stored,
        write: (v) => {
          stored = v;
        },
      },
      { schedule: (cb) => cb(), getEpoch: () => 1234 },
    );
    writer.record('exp', 'A');
    expect(parseStickyCookie(stored)).toEqual({ exp: 'A', __e: '1234' });
  });

  it('omits the epoch key when getEpoch is 0', () => {
    let stored: string | undefined;
    const writer = createStickyWriter(
      {
        read: () => stored,
        write: (v) => {
          stored = v;
        },
      },
      { schedule: (cb) => cb(), getEpoch: () => 0 },
    );
    writer.record('exp', 'A');
    expect(parseStickyCookie(stored)).toEqual({ exp: 'A' });
  });
});
