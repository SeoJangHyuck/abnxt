/**
 * QA override 쿠키 접두사. `abnxt.ovr.<experimentKey>=<variant>` 형태로 override를 쿠키에 싣는다.
 * 클라이언트·서버 미들웨어·admin preview가 공유하는 단일 출처(SoT) — 5곳 리터럴 중복 방지.
 */
export const OVERRIDE_COOKIE_PREFIX = 'abnxt.ovr.';
