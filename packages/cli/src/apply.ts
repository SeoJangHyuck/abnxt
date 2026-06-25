import { injectWithMarkers, MARKER_START } from './inject';
import type { FileOp, Plan } from './types';

export interface ApplyIO {
  exists(path: string): boolean;
  read(path: string): string | null;
  write(path: string, content: string): void;
}

export interface ApplyOptions {
  force?: boolean;
  dryRun?: boolean;
}

export interface ApplyResult {
  created: string[];
  injected: string[];
  skipped: string[];
  manual: Array<{ path: string; manual?: string }>;
  planned: FileOp[];
}

export function applyPlan(
  plan: Plan,
  io: ApplyIO,
  opts: ApplyOptions,
): ApplyResult {
  const res: ApplyResult = {
    created: [],
    injected: [],
    skipped: [],
    manual: [],
    planned: plan.ops,
  };
  for (const op of plan.ops) {
    if (op.kind === 'manual') {
      res.manual.push({ path: op.path, manual: op.manual });
      continue;
    }
    if (op.kind === 'create') {
      if (io.exists(op.path) && !opts.force) {
        res.skipped.push(op.path);
        continue;
      }
      if (!opts.dryRun) io.write(op.path, op.content ?? '');
      res.created.push(op.path);
      continue;
    }
    // inject
    const src = io.read(op.path);
    if (src == null) {
      res.manual.push({ path: op.path, manual: op.manual }); // 대상 파일 부재 → 수동 안내
      continue;
    }
    // 이미 충돌 가능한 구조가 있으면(예: 기존 modules 배열) 자동 주입 대신 수동 안내(중복 키 방지).
    if (
      op.skipIfPresent &&
      !src.includes(MARKER_START) &&
      src.includes(op.skipIfPresent)
    ) {
      res.manual.push({ path: op.path, manual: op.manual });
      continue;
    }
    const r = injectWithMarkers(src, op.snippet ?? '', op.anchor ?? '');
    if (r.corrupted) {
      // START만 있고 END가 없는 손상 블록 → 자동 수정 대신 수동 안내(원본 보존).
      res.manual.push({ path: op.path, manual: op.manual });
      continue;
    }
    if (!r.changed) {
      if (src.includes(MARKER_START)) res.skipped.push(op.path);
      else res.manual.push({ path: op.path, manual: op.manual }); // 앵커 부재 → 수동 안내
      continue;
    }
    if (!opts.dryRun) io.write(op.path, r.content);
    res.injected.push(op.path);
  }
  return res;
}
