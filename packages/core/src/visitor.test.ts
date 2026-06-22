import { describe, it, expect } from 'vitest';
import { createVisitorId } from './visitor';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe('createVisitorId', () => {
  it('returns a UUID-shaped string', () => {
    expect(createVisitorId()).toMatch(UUID_RE);
  });

  it('returns different values on each call', () => {
    expect(createVisitorId()).not.toBe(createVisitorId());
  });
});
