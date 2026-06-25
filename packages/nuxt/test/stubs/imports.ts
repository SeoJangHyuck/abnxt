// 단위 테스트용 '#imports' 스텁. 런타임(Nitro/Nuxt)이 제공하는 가상 모듈을 대체한다.
// 미들웨어 핸들러는 테스트에서 호출되지 않으므로 import 해소만 되면 충분하다.
export function useRuntimeConfig(): Record<string, unknown> {
  return {};
}
