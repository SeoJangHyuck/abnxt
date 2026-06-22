export { run } from './run';
export { detectProject, type DetectIO } from './detect';
export { planScaffold } from './plan';
export { applyPlan, type ApplyIO, type ApplyResult } from './apply';
export { injectWithMarkers, MARKER_START, MARKER_END } from './inject';
export type { Detection, InitOptions, FileOp, Plan } from './types';
