import { describe, it, expect } from 'vitest';
import * as abnxt from './index';

describe('public API', () => {
  it('exports the documented surface', () => {
    const expected = [
      'hashToUnit',
      'loadConfig',
      'EMPTY_CONFIG',
      'CURRENT_VERSION',
      'assign',
      'controlKey',
      'resolveVariant',
      'createVisitorId',
      'parseStickyCookie',
      'serializeStickyCookie',
      'createStickyWriter',
      'bundledConfig',
      'fetchConfig',
      'createAnalyticsBus',
      'sessionDedupStore',
      'createBufferedEmitter',
      'createGa4Sink',
      'createClaritySink',
      'createDomEventSink',
      'createDataLayerSink',
      'resolveBuiltinSinks',
      'BUILTIN_SINK_NAMES',
      'resolveFrom',
      'planAbProxy',
      'buildAbState',
      'createAbRuntime',
    ];
    for (const name of expected) {
      expect(abnxt, `missing export: ${name}`).toHaveProperty(name);
    }
  });
});
