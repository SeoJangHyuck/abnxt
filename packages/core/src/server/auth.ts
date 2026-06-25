import { createHmac, timingSafeEqual, randomBytes } from 'node:crypto';

const DEFAULT_MAX_AGE_MS = 86_400_000; // 24h — 무기한 토큰 방지

/** 어드민 세션 쿠키 기본 이름. 발급(auth-route)과 검증(config-route)이 공유하는 단일 출처(SoT). */
export const DEFAULT_ADMIN_COOKIE = 'abnxt_admin';

/** 상수시간 문자열 비교(길이 차만 노출). */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export interface BasicCreds {
  user: string;
  password: string;
}

/** `Authorization: Basic base64(user:pass)` 검증(상수시간). HTTPS 전제(설계 §12). */
export function verifyBasicAuth(
  header: string | undefined | null,
  creds: BasicCreds,
): boolean {
  if (!header || !header.startsWith('Basic ')) return false;
  // Buffer.from(_, 'base64')는 잘못된 입력에도 throw하지 않고 관대하게 디코드한다(주석: dead try/catch 제거).
  const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
  const i = decoded.indexOf(':');
  if (i < 0) return false;
  const user = decoded.slice(0, i);
  const password = decoded.slice(i + 1);
  // 양쪽 모두 비교(단락 평가로 인한 타이밍 차 최소화).
  const okUser = safeEqual(user, creds.user);
  const okPass = safeEqual(password, creds.password);
  return okUser && okPass;
}

/**
 * 사전 세팅 인증키 검증(상수시간). `expected`가 빈값(env 미설정)이면 항상 false(fail-closed).
 * 어드민 키→세션 교환 라우트에서 사용한다. HTTPS 전제(설계 §12).
 */
export function verifyAdminKey(
  provided: string | undefined | null,
  expected: string | undefined | null,
): boolean {
  if (!provided || !expected) return false;
  return safeEqual(provided, expected);
}

export interface SignOptions {
  now?: () => number;
  /** 토큰 만료(ms). 미설정이면 기본 24h. */
  maxAgeMs?: number;
}

/** HMAC 키 최소 길이(빈/약한 secret로 인한 위조 방지). */
const MIN_SECRET_LENGTH = 16;

/**
 * HMAC-SHA256 서명 세션 토큰: base64url(json).base64url(hmac). payload에 iat/exp 주입.
 * **secret은 전 replica 동일**해야 한다(env/k8s Secret; pod별 상이 시 다른 pod에서 검증 실패 → 설계 §7.4).
 * 빈/짧은 secret은 환경변수 누락 신호이므로 즉시 throw(fail-fast).
 */
export function signSession(
  payload: Record<string, unknown>,
  secret: string,
  opts: SignOptions = {},
): string {
  if (!secret || secret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `abnxt: session secret must be at least ${MIN_SECRET_LENGTH} characters`,
    );
  }
  const now = opts.now ?? (() => Date.now());
  const maxAge = opts.maxAgeMs ?? DEFAULT_MAX_AGE_MS;
  const at = now();
  const body = { ...payload, iat: at, exp: at + maxAge };
  const data = b64url(JSON.stringify(body));
  const sig = b64url(createHmac('sha256', secret).update(data).digest());
  return `${data}.${sig}`;
}

export interface VerifyResult {
  valid: boolean;
  payload?: Record<string, unknown>;
}

export function verifySession(
  token: string | undefined | null,
  secret: string,
  opts: { now?: () => number } = {},
): VerifyResult {
  // 빈/짧은 secret(env 누락)으로는 어떤 토큰도 유효 처리하지 않는다(방어적).
  if (!token || !secret || secret.length < MIN_SECRET_LENGTH)
    return { valid: false };
  const dot = token.indexOf('.');
  if (dot < 0) return { valid: false };
  const data = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = b64url(createHmac('sha256', secret).update(data).digest());
  if (!safeEqual(sig, expected)) return { valid: false };
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(fromB64url(data));
  } catch {
    return { valid: false };
  }
  const now = (opts.now ?? (() => Date.now()))();
  // 모든 세션은 만료 가능해야 한다: exp가 숫자가 아니면(누락/변조) 거부(fail-closed).
  if (typeof payload.exp !== 'number' || now > payload.exp)
    return { valid: false };
  const { iat: _iat, exp: _exp, ...rest } = payload;
  void _iat;
  void _exp;
  return { valid: true, payload: rest };
}

/** CSRF 토큰 등 난수 hex(CSPRNG). */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('hex');
}

function b64url(input: string | Buffer): string {
  return Buffer.from(input).toString('base64url');
}
function fromB64url(s: string): string {
  return Buffer.from(s, 'base64url').toString('utf8');
}
