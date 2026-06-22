---
name: typescript
description: |
  TypeScript 코드 컨벤션 SoT — 이름 규칙 / 타입 안전성 (any 회피, unknown narrowing) / 유틸리티 타입 / type vs interface / 상수·enum / 함수·클래스 / 모듈·import / 에러 처리 / 주석. 범용 TS 베스트 프랙티스 (프레임워크 무관).
  Use when user invokes /typescript, asks "타입스크립트 작성", "TS 컨벤션", "타입 안전성", "any 제거", "타입 정의", or before invoking Read/Write/Edit on `*.ts` / `*.tsx` files.
paths:
  - '**/*.{ts,tsx}'
---

# TypeScript 코드 컨벤션

## tsconfig 공통 옵션

- 엄격한 타입 검사를 위해 `strict: true` 활성화
- 명시적 override를 위해 `noImplicitOverride: true` 사용
- 빌드 도구에 맞는 `moduleResolution` 정렬 (Vite/Nuxt: "bundler")

- **이름 규칙**
  - **변수, 함수, 프로퍼티**: camelCase 사용
  - **클래스, 타입, 인터페이스**: PascalCase 사용
  - **상수, Enum 멤버**: UPPER_CASE 사용
  - **파일**: camelCase 사용
  - **Boolean 변수**: `is`, `has`, `should` 같은 접두어 사용
  - **ESLint 규칙**: `@typescript-eslint/naming-convention`

  ```typescript
  // ✅ DO: 올바른 이름 규칙
  import { no_camelcased as camelCased } from 'external-module';
  const MAIN_COLOR = '#112C85';
  const isValidForm = true;
  const hasPermission = false;

  function calculateTotalAmount() {}
  class ValidClassName {}
  interface UserProfile {}

  enum UserRole {
    ADMIN,
    MODERATOR,
    USER,
  }

  // ❌ DON'T: 잘못된 이름 규칙
  const valid = true; // isValid여야 함
  const loading = false; // isLoading여야 함
  const Main_Color = '#112C85'; // MAIN_COLOR여야 함
  ```

- **타입 안전성 베스트 프랙티스**
  - `any` 대신 `unknown`을 사용하고 타입 narrowing으로 처리
  - null 체크에는 logical OR보다 nullish coalescing (`??`) 사용
  - 타입 단언에는 `<Type>` 대신 `as Type` 사용
  - non-null assertion (`!`) 회피 - null 체크를 사용한다
  - 원시값으로 초기화한 변수는 명시적 타입 지정 금지
  - **ESLint 규칙**: `@typescript-eslint/no-explicit-any`, `@typescript-eslint/prefer-nullish-coalescing`, `@typescript-eslint/consistent-type-assertions`, `@typescript-eslint/no-non-null-assertion`, `@typescript-eslint/no-inferrable-types`

  ```typescript
  // ✅ DO: 올바른 타입 안전성
  function processValue(value: unknown) {
    if (typeof value === 'string') {
      console.log(value.toUpperCase());
    }
  }

  const config = userConfig ?? defaultConfig;
  const foo = bar as Foo;
  const includesBaz = foo.bar && foo.bar.includes('baz');

  // 타입 추론이 잘 작동함
  const count = 5;
  const userName = 'John';
  const isActive = true;

  // ❌ DON'T: 타입 안전성 위반
  function processAny(value: any) {} // unknown을 사용
  const config = userConfig || defaultConfig; // ??를 사용
  const foo = <Foo>bar; // as Type을 사용
  const includesBaz = foo.bar!.includes('baz'); // null 체크를 사용
  const count: number = 5; // 불필요한 타입 명시

  // ❌ DON'T: 안전하지 않은 optional chaining
  const { bar } = obj?.foo; // obj?.foo || baz 사용
  (obj?.foo)(); // obj?.foo?.() 사용
  ```

- **타입 정의와 유틸리티 타입**
  - 내장 유틸리티 타입을 적극 활용: `Partial<T>`, `Required<T>`, `Pick<T, K>`, `Omit<T, K>`, `Readonly<T>`, `Record<K, T>`
  - 불변 데이터에는 `readonly` 사용
  - wrapper 객체 대신 원시 타입 사용
  - union/intersection에서 중복 타입 구성 회피
  - **ESLint 규칙**: `@typescript-eslint/prefer-readonly`, `@typescript-eslint/ban-types`, `@typescript-eslint/no-redundant-type-constituents`

  ```typescript
  // ✅ DO: 내장 유틸리티 타입 적극 활용
  type PartialUser = Partial<User>;
  type UserWithoutEmail = Omit<User, 'email'>;
  type UserKeys = keyof User;
  type UserName = Pick<User, 'firstName' | 'lastName'>;

  // ✅ DO: 불변 데이터에 readonly 사용
  class User {
    readonly id: number;
    constructor(id: number) {
      this.id = id;
    }
  }

  // ✅ DO: wrapper 객체가 아닌 원시 타입 사용
  const str: string = 'foo';
  const func: () => number = () => 1;

  // ❌ DON'T: wrapper 객체 타입
  const str: String = 'foo';
  const func: Function = () => 1;
  ```

- **Type vs Interface 가이드라인**
  - **기본**: 객체 형태에는 `type` 사용 (IDE 지원과 일관성이 더 좋음)
  - **`interface` 사용 시점**: declaration merging이 필요할 때, 성능을 고려한 multiple extension, 상속 패턴 구현

  ```typescript
  // ✅ DO: 대부분의 객체 형태는 type 사용
  type User = {
    id: number;
    name: string;
    email: string;
  };

  type UserWithPermissions = User & {
    permissions: string[];
  };

  // ✅ DO: declaration merging이 필요하면 interface 사용
  interface Window {
    customProperty: string;
  }

  // ✅ DO: 확장 가능한 API에는 interface 사용
  interface EventTarget {
    addEventListener(type: string, listener: EventListener): void;
  }
  ```

- **상수와 Enum**
  - 값만 가지는 상수 모음에는 `as const` 사용
  - 값과 타입이 모두 필요하면 `enum` 사용
  - `const enum`과 중복 enum 값 회피
  - **ESLint 규칙**: `@typescript-eslint/no-duplicate-enum-values`

  ```typescript
  // ✅ DO: 값만 필요한 상수에는 as const 사용
  const DELIVERY_OPTIONS = [
    'Standard Shipping',
    'Express Shipping',
    'Next Day Shipping',
  ] as const;

  // ✅ DO: 값과 타입 모두 필요하면 enum 사용
  enum UserRole {
    ADMIN = 'admin',
    USER = 'user',
    MODERATOR = 'moderator',
  }

  // ✅ DO: 중복 enum 값 회피
  enum Status {
    PENDING = 'pending',
    APPROVED = 'approved',
    // ACTIVE = 'approved', // ❌ DON'T: 중복 값
  }

  // ❌ DON'T: const enum 사용 (컴파일 이슈)
  const enum Direction {
    UP,
    DOWN,
  } // const enum 회피
  ```

- **변수 관리**
  - 변경되지 않는 변수에는 `const` 사용
  - 문자열 결합에는 template string 사용
  - magic number 회피 - named constant 사용
  - **ESLint 규칙**: `prefer-const`, `prefer-template`, `@typescript-eslint/no-magic-numbers`

  ```typescript
  // ✅ DO: const와 template string 우선
  const message = `Hello, ${userName}!`;
  const TAX_RATE = 0.25;
  const finalPrice = basePrice + basePrice * TAX_RATE;

  // ❌ DON'T: var, 결합, magic number 사용
  var oldVar = 'bad'; // const/let 사용
  const finalPrice = basePrice + basePrice * 0.25; // named constant 사용
  ```

- **함수와 클래스 패턴**
  - 오버로드된 멤버는 인접하게 배치
  - 클래스 멤버 순서: fields, constructor, methods
  - 생성자 할당에는 parameter property 사용
  - 메서드 오버라이드 시 `override` 키워드 사용 (TypeScript 4.3+)
  - **함수 표현식보다 화살표 함수를 반드시 사용**
  - `await`이 없는 함수에서는 `async` 제거
  - **`#private` 필드 절대 사용 금지** (테스트/상속 유연성을 위해 `private` 사용)
  - **ESLint 규칙**: `@typescript-eslint/adjacent-overload-signatures`, `@typescript-eslint/member-ordering`, `@typescript-eslint/explicit-member-accessibility`, `prefer-arrow-callback`, `@typescript-eslint/require-await`

  ```typescript
  // ✅ DO: parameter property를 사용한 올바른 클래스 구조
  class UserService {
    constructor(
      private readonly apiClient: ApiClient,
      private readonly logger: Logger,
    ) {}

    override processData() {
      // 오버라이드 시 override 키워드 사용
    }

    private validateUser(user: User): boolean {
      // 내부 로직은 private 메서드
    }
  }

  // ✅ DO: 콜백에는 화살표 함수
  const processItems = (items: Item[]) => {
    return items.map((item) => transformItem(item));
  };

  // ✅ DO: 적절한 async/await 사용
  async function fetchUserData(): Promise<User> {
    try {
      const response = await api.getUser();
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch user: ${error.message}`);
    }
  }

  // ✅ DO: 함수 파라미터 기본값
  function processOptions({ timeout = 5000, retries = 3 }: Options = {}) {
    // 구현
  }

  // ❌ DON'T: 빈 생성자나 불필요한 패턴
  class BadExample {
    private service: Service;
    constructor(service: Service) {
      // parameter property 사용
      this.service = service;
    }

    async unnecessaryAsync() {
      // await 없으면 async 제거
      return 'hello';
    }

    #privateField = 'bad'; // private 사용
  }
  ```

- **객체와 배열 패턴**
  - 객체 메서드는 shorthand 사용
  - for-in 루프는 필터링하거나 Object.keys/entries 사용
  - `apply` 대신 spread operator 사용
  - 특정 경우 외에는 `Array` 생성자 회피
  - 불필요한 computed key와 boolean cast 회피
  - **ESLint 규칙**: `object-shorthand`, `guard-for-in`, `prefer-spread`, `@typescript-eslint/no-array-constructor`, `no-useless-computed-key`, `no-extra-boolean-cast`

  ```typescript
  // ✅ DO: object shorthand와 적절한 iteration
  const userService = {
    fetchUser(id: number) {
      return api.getUser(id);
    },

    updateUser(user: User) {
      return api.updateUser(user);
    },
  };

  // 안전한 객체 iteration
  for (const key of Object.keys(userObject)) {
    console.log(userObject[key]);
  }

  // 적절한 배열 생성
  const numbers: number[] = [1, 2, 3];
  const dynamicArray = Array.from({ length: 5 }, (_, i) => i);

  // ❌ DON'T: 안전하지 않은 패턴
  const badService = {
    fetchUser: function(id: number) { ... }, // shorthand 사용
  };

  for (const key in userObject) {            // Object.keys 사용
    // key가 prototype에서 올 수 있음
  }

  const badArray = Array(1, 2, 3);          // 배열 리터럴 사용
  const unnecessaryKey = { ['key']: value }; // { key: value }로 충분
  ```

- **Switch 문과 동등 비교**
  - case 블록 내 선언은 중괄호로 감쌈
  - switch 문에서 fallthrough 방지
  - 엄격한 동등 비교 (`===`, `!==`) 사용
  - `==`는 null 체크에만 허용 (undefined 포함)
  - enum에는 명시적 비교 연산자 사용
  - **ESLint 규칙**: `no-case-declarations`, `no-fallthrough`, `eqeqeq`

  ```typescript
  // ✅ DO: 올바른 switch와 동등 비교 패턴
  switch (userType) {
    case UserType.ADMIN: {
      const adminUser = user as AdminUser;
      return adminUser.permissions;
    }
    case UserType.REGULAR:
      return defaultPermissions;
    default:
      throw new Error(`Unknown user type: ${userType}`);
  }

  // ✅ DO: 엄격한 동등 비교와 enum 비교
  if (status === 'active') { ... }
  if (value == null) { ... }          // null/undefined 체크 시에만 예외
  let enabled = level !== SupportLevel.NONE;

  // ❌ DON'T: 느슨한 동등 비교와 boolean cast
  if (status == 'active') { ... }     // === 사용
  let enabled = Boolean(level);       // 명시적 비교 사용
  if (!!value) { ... }                // 명시적 boolean 체크 사용
  ```

- **모듈 시스템과 import**
  - type-only import/export 구문 사용
  - 모든 import는 파일 상단에 배치
  - 모듈당 import 한 줄
  - 동일한 이름으로 rename 금지
  - alias로 절대 경로 사용
  - 커스텀 TypeScript 모듈/네임스페이스 사용 금지
  - constant 참조만 export
  - **ESLint 규칙**: `@typescript-eslint/consistent-type-imports`, `import/first`, `no-duplicate-imports`, `no-useless-rename`, `@typescript-eslint/no-namespace`, `import/no-mutable-exports`

  ```typescript
  // ✅ DO: 적절한 import 구성과 type-only import
  import type { User, UserPermissions } from '~/types/user';
  import { validateUser, formatUserName } from '~/utils/userHelpers';
  import { ApiClient } from '~/services/apiClient';

  // 여러 rename은 namespace import 사용
  import * as TableView from './TableView';

  // container 클래스가 아닌 개별 함수 export
  export const CONFIG_TIMEOUT = 5000;
  export function processUser(user: User): ProcessedUser {
    return { ...user, processed: true };
  }

  // ❌ DON'T: container 클래스나 mixed import
  export class Container {           // 개별 함수로 export
    static CONFIG = 5000;
    static process() { ... }
  }

  import { User, validateUser } from '~/types'; // type import 분리

  // ❌ DON'T: namespace 사용과 require 구문
  namespace MyNamespace { ... }               // module 사용
  const lib = require('library');             // import 구문 사용
  export { mutableValue };                    // constant만 export
  ```

- **에러 처리**
  - Error 인스턴스 생성 시 항상 `new` 키워드 사용
  - Error 또는 Error 서브클래스만 throw
  - 의미 없는 빈 export 금지
  - **ESLint 규칙**: `@typescript-eslint/no-useless-empty-export`

  ```typescript
  // ✅ DO: 적절한 에러 생성과 처리
  class ValidationError extends Error {
    constructor(
      message: string,
      public readonly field: string,
    ) {
      super(message);
      this.name = 'ValidationError';
    }
  }

  function validateInput(input: unknown): string {
    if (typeof input !== 'string') {
      throw new ValidationError('Input must be a string', 'input');
    }
    return input;
  }

  // ❌ DON'T: Error 객체가 아닌 것 throw
  throw 'String error'; // Error 객체 사용
  throw { message: 'Object error' }; // Error 객체 사용
  throw Error('Missing new'); // new 키워드 사용
  ```

- **고급 TypeScript 패턴**
  - 빈 interface 선언 금지
  - 잘못된 생성자 정의 회피
  - 의미 없는 export 금지
  - getter는 순수 함수로 구현
  - pass-through accessor 만들지 않음 (속성을 public으로 만든다)
  - **ESLint 규칙**: `@typescript-eslint/no-empty-interface`, `@typescript-eslint/no-misused-new`

  ```typescript
  // ✅ DO: 적절한 TypeScript 패턴
  interface UserConfig {
    timeout: number;
    retries: number;
  }

  class ApiService {
    private _cache = new Map();

    get cacheSize(): number {
      return this._cache.size; // 순수 함수 getter
    }

    // public 데이터에 불필요한 getter/setter 만들지 말 것
    public readonly config: UserConfig;
  }

  // ❌ DON'T: 빈 interface와 pass-through accessor
  interface EmptyInterface {} // 기존 타입 확장 사용

  class BadService {
    private _value: string;

    get value(): string {
      // value를 public으로 만든다
      return this._value;
    }

    set value(val: string) {
      this._value = val;
    }
  }
  ```

- **주석과 문서화**
  - 코드만으로 이해하기 어려운 비즈니스 로직만 주석으로 남긴다
  - "무엇"이 아니라 "왜"를 설명한다
  - 섹션 주석(예: // Helpers, // Methods, // State) 회피
  - 코드가 무엇을 하는지 설명하는 명확한 주석 회피

  ```typescript
  // ✅ DO: 비즈니스 이유 설명
  // 결제 취소는 24시간 이내만 가능 (배송 준비 전)
  if (dayjs().diff(order.createdAt, 'hour') > 24) {
    throw new Error('Cancellation period expired');
  }

  // 이진 탐색으로 10,000개 이상 데이터 성능 최적화
  const index = binarySearch(sortedData, targetValue);

  // ❌ DON'T: 명확하거나 중복된 주석
  // Call API
  const data = await fetchUser(userId);

  // Initialize array
  const items: Item[] = [];

  // Increment counter
  counter += 1;
  ```

- **AI Agent 작업 - TypeScript 개발**
  - 이름 규칙 준수 확인 (camelCase, PascalCase, UPPER_CASE)
  - 코드에서 섹션 주석(// Helpers, // Methods) 제거
  - 주석이 코드 설명이 아닌 비즈니스 로직 설명인지 검증
  - 타입 안전성 관행 검증 (`any` 회피, `unknown` 사용)
  - TypeScript 기능 적절한 사용 보장 (readonly, 유틸리티 타입)
  - boolean 변수에 적절한 접두어가 있는 더 나은 이름 권장
  - magic number 식별 후 named constant 제안
  - `any` 타입을 적절한 타입이나 `unknown` + 타입 narrowing으로 교체
  - 생성자 할당에 parameter property 제안
  - import 구성 (type-only와 일반 import 분리)
  - 불변이어야 하는 데이터에 readonly 속성 제안

**참고**: TypeScript 베스트 프랙티스를 따르고 타입 시스템을 활용해 안전성과 개발자 경험을 극대화한다. 기존 타입 정의가 있는 프로젝트라면 해당 타입 모듈을 먼저 참조해 중복 정의를 피한다.
