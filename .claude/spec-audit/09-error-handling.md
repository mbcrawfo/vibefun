# Audit: Error Handling (docs/spec/09-error-handling.md)

## Sources Reviewed

**Spec files** (with line counts):
- `docs/spec/09-error-handling.md` (233 lines)

**Implementation files**:
- `packages/stdlib/src/result.ts` (38 lines)
- `packages/stdlib/src/option.ts` (33 lines)
- `packages/stdlib/src/variants.ts` (42 lines)
- `packages/core/src/typechecker/module-signatures/stdlib/result.ts` (90 lines)
- `packages/core/src/typechecker/module-signatures/stdlib/option.ts` (64 lines)
- `packages/core/src/typechecker/builtins.ts` (326 lines, lines 71-136 relevant)
- `packages/core/src/codegen/es2020/runtime-helpers.ts` (126 lines)
- `packages/core/src/codegen/es2020/emit-expressions/variables.ts` (29 lines)

**Test files** (every layer):
- Unit: `packages/stdlib/src/result.test.ts`, `packages/stdlib/src/option.test.ts`, `packages/stdlib/src/variants.test.ts`
- Integration: (none for error handling specifically)
- Snapshot: (none specific to this section)
- E2E: `tests/e2e/spec-validation/09-error-handling.test.ts`
- Spec-validation: `tests/e2e/spec-validation/09-error-handling.test.ts`
- Execution: `packages/core/src/codegen/es2020/execution-tests/numeric.test.ts`
- Property: `packages/stdlib/src/result.test.ts` (property tests on Result), `packages/stdlib/src/option.test.ts` (property tests on Option), `packages/stdlib/src/variants.test.ts` (property tests on variant constructors)
- Unit: `packages/core/src/codegen/es2020/runtime-helpers.test.ts`

## Feature Inventory

### F-01: Result<T, E> type definition and constructors

- **Spec ref**: `docs/spec/09-error-handling.md:172-187` — Result ADT with Ok and Err constructors, and pattern matching
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/stdlib/src/variants.ts:25-27` — Result type definition
  - `packages/stdlib/src/variants.ts:39-41` — Ok and Err constructors
  - `packages/core/src/typechecker/builtins.ts:103-115` — Ok and Err constructor type schemes
- **Tests**:
  - Unit: `packages/stdlib/src/variants.test.ts:28-31` — "Ok and Err carry the value in $0"
  - Unit: `packages/stdlib/src/variants.test.ts:44-51` — property test "Ok(a).$0 === a and tag is 'Ok'"
  - Unit: `packages/stdlib/src/variants.test.ts:54-61` — property test "Err(e).$0 === e and tag is 'Err'"
  - E2E: `tests/e2e/spec-validation/09-error-handling.test.ts:82-108` — Result Ok/Err pattern matching and behavior
- **Coverage assessment**: ✅ Adequate
- **Notes**: Constructors are polymorphic with proper type schemes. Both Ok and Err are properly typechecked. Constructor behavior (shape) is well-covered in properties and E2E tests.

### F-02: Option<T> type definition and constructors

- **Spec ref**: `docs/spec/09-error-handling.md:189-198` — Option ADT with Some and None constructors
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/stdlib/src/variants.ts:21-23` — Option type definition
  - `packages/stdlib/src/variants.ts:35-37` — Some and None constructors
  - `packages/core/src/typechecker/builtins.ts:91-101` — Some and None constructor type schemes
- **Tests**:
  - Unit: `packages/stdlib/src/variants.test.ts:20-26` — "Some wraps a value" and "None is a singleton zero-field node"
  - Unit: `packages/stdlib/src/variants.test.ts:34-41` — property test "Some(a).$0 === a for any value"
  - E2E: `tests/e2e/spec-validation/09-error-handling.test.ts:111-138` — Option Some/None pattern matching and behavior
- **Coverage assessment**: ✅ Adequate
- **Notes**: Option constructors are properly polymorphic and typechecked. None is a singleton (not a function). E2E tests cover both construction and pattern matching.

### F-03: Result.map function

- **Spec ref**: `docs/spec/09-error-handling.md:172-187` (implicit from Result stdlib)
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/stdlib/src/result.ts:10-13` — Result.map implementation (curried, data-first)
  - `packages/core/src/typechecker/module-signatures/stdlib/result.ts:15-27` — type signature `forall t e u. Result<t, e> -> (t -> u) -> Result<u, e>`
- **Tests**:
  - Unit: `packages/stdlib/src/result.test.ts:11-14` — "map transforms Ok, leaves Err"
  - Unit: `packages/stdlib/src/result.test.ts:41-58` — property test "map(id) === id (functor identity)"
  - Unit: `packages/stdlib/src/result.test.ts:49-58` — property test "map(f ∘ g) === map(f) ∘ map(g) (functor composition)"
  - Unit: `packages/stdlib/src/result.test.ts:100-114` — property test "map only touches Ok and mapErr only touches Err"
- **Coverage assessment**: ✅ Adequate
- **Notes**: Functor laws are verified. Happy path and error path covered. Currying and data-first design verified.

### F-04: Result.flatMap function

- **Spec ref**: `docs/spec/09-error-handling.md:212-216` — Using flatMap for error propagation chaining
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/stdlib/src/result.ts:15-18` — Result.flatMap implementation (monadic bind)
  - `packages/core/src/typechecker/module-signatures/stdlib/result.ts:29-44` — type signature `forall t e u. Result<t, e> -> (t -> Result<u, e>) -> Result<u, e>`
- **Tests**:
  - Unit: `packages/stdlib/src/result.test.ts:15-18` — "flatMap chains Ok, short-circuits Err"
  - Unit: `packages/stdlib/src/result.test.ts:61-68` — property test "monad left identity"
  - Unit: `packages/stdlib/src/result.test.ts:70-76` — property test "monad right identity"
  - Unit: `packages/stdlib/src/result.test.ts:78-90` — property test "monad associativity"
- **Coverage assessment**: ✅ Adequate
- **Notes**: Monad laws all tested. Error short-circuiting verified.

### F-05: Result.mapErr function

- **Spec ref**: `docs/spec/09-error-handling.md:212-216` (implicit in error handling philosophy)
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/stdlib/src/result.ts:20-23` — Result.mapErr implementation
  - `packages/core/src/typechecker/module-signatures/stdlib/result.ts:46-58` — type signature `forall t e f. Result<t, e> -> (e -> f) -> Result<t, f>`
- **Tests**:
  - Unit: `packages/stdlib/src/result.test.ts:19-22` — "mapErr transforms Err, leaves Ok"
  - Unit: `packages/stdlib/src/result.test.ts:92-98` — property test "mapErr(id) === id"
  - Unit: `packages/stdlib/src/result.test.ts:100-114` — property test "map only touches Ok and mapErr only touches Err"
- **Coverage assessment**: ✅ Adequate
- **Notes**: Error transformation and invariant that mapErr leaves Ok untouched are verified.

### F-06: Result.isOk and Result.isErr predicates

- **Spec ref**: `docs/spec/09-error-handling.md:172-187` (implicit)
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/stdlib/src/result.ts:25-27` — isOk and isErr implementations
  - `packages/core/src/typechecker/module-signatures/stdlib/result.ts:60-72` — type signatures
- **Tests**:
  - Unit: `packages/stdlib/src/result.test.ts:23-28` — "isOk / isErr discriminate"
  - Unit: `packages/stdlib/src/result.test.ts:116-122` — property test "isOk and isErr are exhaustive and exclusive"
- **Coverage assessment**: ✅ Adequate
- **Notes**: Exhaustiveness and exclusivity tested.

### F-07: Result.unwrap function

- **Spec ref**: `docs/spec/09-error-handling.md:218-227` — unwrap panics on Err (last resort)
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/stdlib/src/result.ts:29-32` — Result.unwrap throws Error("Result.unwrap called on Err")
  - `packages/core/src/typechecker/module-signatures/stdlib/result.ts:74-79` — type signature `forall t e. Result<t, e> -> t`
- **Tests**:
  - Unit: `packages/stdlib/src/result.test.ts:29-32` — "unwrap returns value on Ok and throws on Err"
  - Unit: `packages/stdlib/src/result.test.ts:124-130` — property test "unwrap inverts Ok"
- **Coverage assessment**: ⚠️ Thin
- **Notes**: Happy path (Ok) verified. Error case (Err) verifies exception is thrown but does not validate the error message. Spec says unwrap should panic, and JavaScript Error is thrown, but no validation of the panic semantics per F-21.

### F-08: Result.unwrapOr function

- **Spec ref**: `docs/spec/09-error-handling.md:172-187` (implicit)
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/stdlib/src/result.ts:34-37` — Result.unwrapOr returns value on Ok, fallback on Err
  - `packages/core/src/typechecker/module-signatures/stdlib/result.ts:81-86` — type signature `forall t e. Result<t, e> -> t -> t`
- **Tests**:
  - Unit: `packages/stdlib/src/result.test.ts:33-36` — "unwrapOr returns value on Ok and fallback on Err"
  - Unit: `packages/stdlib/src/result.test.ts:132-139` — property test "unwrapOr returns value on Ok and fallback on Err"
- **Coverage assessment**: ✅ Adequate
- **Notes**: Both Ok and Err paths tested, fallback behavior verified.

### F-09: Option.map function

- **Spec ref**: `docs/spec/09-error-handling.md:189-198` (implicit)
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/stdlib/src/option.ts:10-13` — Option.map implementation
  - `packages/core/src/typechecker/module-signatures/stdlib/option.ts:15-23` — type signature `forall a b. Option<a> -> (a -> b) -> Option<b>`
- **Tests**:
  - Unit: `packages/stdlib/src/option.test.ts:11-16` — "map transforms Some" and "map passes None through"
  - Unit: `packages/stdlib/src/option.test.ts:41-47` — property test "map(id) === id (functor identity)"
  - Unit: `packages/stdlib/src/option.test.ts:49-59` — property test "map(f ∘ g) === map(f) ∘ map(g) (functor composition)"
  - Unit: `packages/stdlib/src/option.test.ts:122-129` — property test "map preserves the Some/None tag"
- **Coverage assessment**: ✅ Adequate
- **Notes**: Functor laws and tag preservation verified.

### F-10: Option.flatMap function

- **Spec ref**: `docs/spec/09-error-handling.md:189-198` (implicit)
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/stdlib/src/option.ts:15-18` — Option.flatMap implementation
  - `packages/core/src/typechecker/module-signatures/stdlib/option.ts:25-36` — type signature `forall a b. Option<a> -> (a -> Option<b>) -> Option<b>`
- **Tests**:
  - Unit: `packages/stdlib/src/option.test.ts:17-22` — "flatMap chains Some" and "flatMap short-circuits on None"
  - Unit: `packages/stdlib/src/option.test.ts:61-68` — property test "monad left identity"
  - Unit: `packages/stdlib/src/option.test.ts:70-76` — property test "monad right identity"
  - Unit: `packages/stdlib/src/option.test.ts:78-88` — property test "monad associativity"
- **Coverage assessment**: ✅ Adequate
- **Notes**: Monad laws and short-circuiting on None verified.

### F-11: Option.getOrElse function

- **Spec ref**: `docs/spec/09-error-handling.md:189-198` (implicit)
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/stdlib/src/option.ts:20-23` — Option.getOrElse returns value or fallback
  - `packages/core/src/typechecker/module-signatures/stdlib/option.ts:38-42` — type signature `forall a. Option<a> -> a -> a`
- **Tests**:
  - Unit: `packages/stdlib/src/option.test.ts:23-26` — "getOrElse returns value or fallback"
  - Unit: `packages/stdlib/src/option.test.ts:90-104` — property tests for both Some and None paths
- **Coverage assessment**: ✅ Adequate
- **Notes**: Both branches tested.

### F-12: Option.isSome and Option.isNone predicates

- **Spec ref**: `docs/spec/09-error-handling.md:189-198` (implicit)
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/stdlib/src/option.ts:25-27` — isSome and isNone implementations
  - `packages/core/src/typechecker/module-signatures/stdlib/option.ts:44-54` — type signatures
- **Tests**:
  - Unit: `packages/stdlib/src/option.test.ts:27-32` — "isSome / isNone discriminate"
  - Unit: `packages/stdlib/src/option.test.ts:106-112` — property test "isSome and isNone are mutually exclusive and exhaustive"
- **Coverage assessment**: ✅ Adequate
- **Notes**: Exhaustiveness and exclusivity tested.

### F-13: Option.unwrap function

- **Spec ref**: `docs/spec/09-error-handling.md:218-227` — unwrap panics on None (last resort)
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/stdlib/src/option.ts:29-32` — Option.unwrap throws Error("Option.unwrap called on None")
  - `packages/core/src/typechecker/module-signatures/stdlib/option.ts:56-60` — type signature `forall a. Option<a> -> a`
- **Tests**:
  - Unit: `packages/stdlib/src/option.test.ts:33-36` — "unwrap returns value on Some and throws on None"
  - Unit: `packages/stdlib/src/option.test.ts:114-120` — property test "unwrap is the inverse of Some when isSome"
- **Coverage assessment**: ⚠️ Thin
- **Notes**: Happy path (Some) and error case verified. Error message validation missing.

### F-14: Division by zero — integer panic behavior

- **Spec ref**: `docs/spec/09-error-handling.md:11-17` — Integer division by zero causes runtime panic
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/codegen/es2020/runtime-helpers.ts:70-72` — $intDiv helper throws Error("Division by zero")
  - `packages/core/src/codegen/es2020/runtime-helpers.ts:81-82` — $intMod helper throws Error("Division by zero")
- **Tests**:
  - Execution: `packages/core/src/codegen/es2020/execution-tests/numeric.test.ts:67-77` — "should panic at runtime on integer division by zero" (fixed and variable divisor)
  - Execution: `packages/core/src/codegen/es2020/execution-tests/numeric.test.ts:75-77` — "should panic at runtime on integer modulo by zero"
  - E2E: `tests/e2e/spec-validation/09-error-handling.test.ts:14-20` — "integer division by zero panics" and "integer modulo by zero panics"
- **Coverage assessment**: ✅ Adequate
- **Notes**: Both literal and variable divisors tested. Both division (/) and modulo (%) covered. Panic behavior validated.

### F-15: Division by zero — float IEEE 754 behavior

- **Spec ref**: `docs/spec/09-error-handling.md:19-25` — Float division by zero returns Infinity/NaN per IEEE 754
- **Status**: ✅ Implemented
- **Implementation**:
  - No special runtime helper — JavaScript / operator handles IEEE 754 directly
- **Tests**:
  - Execution: `packages/core/src/codegen/es2020/execution-tests/numeric.test.ts:79-87` — "should NOT panic on float division by zero" (produces Infinity and NaN)
  - E2E: `tests/e2e/spec-validation/09-error-handling.test.ts:22-32` — "float division by zero returns Infinity", "float 0/0 returns NaN", "negative float division by zero returns -Infinity"
- **Coverage assessment**: ✅ Adequate
- **Notes**: Infinity, -Infinity, and NaN cases all tested. No exception thrown (correct per IEEE 754).

### F-16: Float NaN semantics (NaN != NaN)

- **Spec ref**: `docs/spec/09-error-handling.md:51-63` — NaN self-equality is false, use Float.isNaN
- **Status**: ✅ Implemented
- **Implementation**:
  - JavaScript === operator handles NaN comparison correctly (NaN === NaN is false)
- **Tests**:
  - Execution: `packages/core/src/codegen/es2020/execution-tests/numeric.test.ts:12-29` — "should handle NaN equality correctly" and inequality
  - E2E: `tests/e2e/spec-validation/09-error-handling.test.ts:36-45` — "NaN self-equality is false"
- **Coverage assessment**: ✅ Adequate
- **Notes**: Both == and != operators tested with NaN.

### F-17: Float special value operations (Infinity, -Infinity)

- **Spec ref**: `docs/spec/09-error-handling.md:65-82` — Operations with Infinity/NaN
- **Status**: ✅ Implemented
- **Implementation**:
  - JavaScript handles arithmetic with special values per IEEE 754
- **Tests**:
  - E2E: `tests/e2e/spec-validation/09-error-handling.test.ts:47-78` — "Infinity plus one is still Infinity", "Infinity minus Infinity is NaN", "Infinity comparison with finite number"
- **Coverage assessment**: ✅ Adequate
- **Notes**: Addition, subtraction, and comparison with special values tested.

### F-18: Integer overflow semantics (silent precision loss)

- **Spec ref**: `docs/spec/09-error-handling.md:36-49` — Overflow loses precision but does not panic
- **Status**: ✅ Implemented
- **Implementation**:
  - JavaScript Number type (IEEE 754 double) silently loses precision above 2^53-1
- **Tests**:
  - (none specific to this feature)
- **Coverage assessment**: ❌ Untested
- **Notes**: No explicit test validates the overflow behavior described in the spec (Number.MAX_SAFE_INTEGER boundary and precision loss).

### F-19: Array bounds — safe read returns Option

- **Spec ref**: `docs/spec/09-error-handling.md:84-95` — Array.get returns Option, no panic
- **Status**: ⏸️ Future
- **Implementation**: (not implemented in stdlib yet)
- **Tests**: (none)
- **Coverage assessment**: ❌ Untested
- **Notes**: Array module exists in spec (docs/spec/11-stdlib/array.md) but Array.get/set are not implemented in packages/stdlib/src/. This is part of the broader Array stdlib work.

### F-20: Array bounds — unsafe write panics on out-of-bounds

- **Spec ref**: `docs/spec/09-error-handling.md:84-95` — Array.set in unsafe blocks panics on out-of-bounds index
- **Status**: ⏸️ Future
- **Implementation**: (not implemented in stdlib yet)
- **Tests**: (none)
- **Coverage assessment**: ❌ Untested
- **Notes**: Array module is not yet in stdlib. This is part of the broader Array stdlib work. Unsafe block support exists in parser/typechecker but Array interop and bounds checking not yet implemented.

### F-21: panic function — type and behavior

- **Spec ref**: `docs/spec/09-error-handling.md:97-127` — panic function terminates with error message, Never return type, unrecoverable
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/typechecker/builtins.ts:126-127` — panic is a monomorphic function with type `(String) -> Never`
  - panic is available as an ambient builtin in the typechecker environment
  - `packages/core/src/codegen/es2020/emit-expressions/variables.ts:15-28` — panic is emitted as an external variable reference (like other builtins)
  - JavaScript global `Error` constructor used to throw with panic message
- **Tests**:
  - Unit: `packages/core/src/typechecker/builtins.test.ts:284-301` — "should have monomorphic panic function" with Never return type
- **Coverage assessment**: ⚠️ Thin
- **Notes**: Type signature is verified, but no end-to-end test validates that calling panic("msg") actually throws a JavaScript Error with that message. No test validates the unrecoverability claim or stack trace preservation.

### F-22: Error propagation — manual match dispatch

- **Spec ref**: `docs/spec/09-error-handling.md:200-210` — Manual error propagation via pattern matching
- **Status**: ✅ Implemented
- **Implementation**:
  - Pattern matching on Result/Option built into desugarer and typechecker
  - Match exhaustiveness checking enforces all branches (prevents silent error propagation failures)
- **Tests**:
  - E2E: `tests/e2e/spec-validation/09-error-handling.test.ts:82-155` — multiple Result/Option matches exercising manual and flatMap propagation
- **Coverage assessment**: ✅ Adequate
- **Notes**: Pattern matching well-tested end-to-end. Manual dispatch verified through match expressions.

### F-23: Error propagation — flatMap chaining

- **Spec ref**: `docs/spec/09-error-handling.md:212-216` — Using flatMap for error propagation chaining with pipe operator
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/stdlib/src/result.ts:15-18` — Result.flatMap monad implementation
  - `packages/stdlib/src/option.ts:15-18` — Option.flatMap monad implementation
- **Tests**:
  - Unit: `packages/stdlib/src/result.test.ts:61-90` — monad laws verify chaining behavior
  - Unit: `packages/stdlib/src/option.test.ts:61-88` — monad laws verify chaining behavior
- **Coverage assessment**: ✅ Adequate
- **Notes**: Monad laws ensure correct chaining semantics.

### F-24: Panic as last resort — unwrap use case

- **Spec ref**: `docs/spec/09-error-handling.md:97-127` — unwrap calls panic on error (last resort pattern)
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/stdlib/src/result.ts:29-32` — Result.unwrap throws
  - `packages/stdlib/src/option.ts:29-32` — Option.unwrap throws
  - Both implement panic-equivalent behavior (JavaScript Error)
- **Tests**:
  - Unit: `packages/stdlib/src/result.test.ts:29-32` — unwrap throws on Err
  - Unit: `packages/stdlib/src/option.test.ts:33-36` — unwrap throws on None
- **Coverage assessment**: ⚠️ Thin
- **Notes**: Throwing behavior verified but error messages not validated. Spec recommends avoiding panic in library code — this is honored by providing Result/Option as primary abstractions and unwrap only as last resort.

### F-25: Pattern match exhaustiveness prevents non-exhaustive error handling

- **Spec ref**: `docs/spec/09-error-handling.md:158-171` (summary table) — Non-exhaustive pattern match is compile-time error
- **Status**: ✅ Implemented
- **Implementation**:
  - Exhaustiveness checking in typechecker enforces all Result/Option/List variants must be covered
  - Multiple files in typechecker/infer/ implement exhaustiveness analysis
- **Tests**:
  - (exhaustiveness tested in 05-pattern-matching audit, not error-handling specific)
- **Coverage assessment**: ✅ Adequate
- **Notes**: Exhaustiveness is a cross-cutting feature, tested in pattern matching audit. This feature prevents silent error handling failures.

### F-26: Panic on unwrap failures documented behavior

- **Spec ref**: `docs/spec/09-error-handling.md:111-116` — When panic is used (including unwrap on None/Err)
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/stdlib/src/result.ts:29-32` and `packages/stdlib/src/option.ts:29-32` implement panic-on-unwrap
- **Tests**:
  - Unit: `packages/stdlib/src/result.test.ts:29-32`, `packages/stdlib/src/option.test.ts:33-36`
- **Coverage assessment**: ⚠️ Thin
- **Notes**: Panic behavior on unwrap is working but error message is hardcoded ("Result.unwrap called on Err", "Option.unwrap called on None") rather than parameterized. This matches spec semantics but no test validates the exact message per spec recommendation to preserve stack trace.

### F-27: Stack overflow — recursive exhaustion causes JS error

- **Spec ref**: `docs/spec/09-error-handling.md:129-141` — Deep recursion causes "Maximum call stack size exceeded"
- **Status**: ✅ Implemented (via JavaScript)
- **Implementation**:
  - JavaScript runtime enforces call stack limit; vibefun code cannot catch or handle this
- **Tests**:
  - (none specific; this is a JavaScript runtime behavior)
- **Coverage assessment**: ❌ Untested
- **Notes**: Spec correctly documents this as an environmental limit, not a vibefun language feature. No test validates the error message or that tail-call optimization is not applied (which would prevent stack overflow in some cases).

### F-28: Out of memory — data structure exhaustion causes JS error

- **Spec ref**: `docs/spec/09-error-handling.md:143-156` — Large data structures can exhaust memory
- **Status**: ✅ Implemented (via JavaScript)
- **Implementation**:
  - JavaScript runtime memory management; vibefun code cannot catch or handle this
- **Tests**:
  - (none; testing this would require massive allocations and is not practical)
- **Coverage assessment**: ❌ Untested
- **Notes**: Spec correctly documents as runtime environment limit. Not a language feature per se.

### F-29: No exceptions mechanism in vibefun (Result/Option only)

- **Spec ref**: `docs/spec/09-error-handling.md:1-9` — Vibefun uses ADTs for error handling, not exceptions
- **Status**: ✅ Implemented
- **Implementation**:
  - Type system enforces Result/Option for recoverable errors
  - Typechecker rejects try-catch (not a language construct)
  - Only panic (unrecoverable) and match (recovery via pattern matching) available
- **Tests**:
  - (none specific to "no exceptions" — verified by absence of try-catch support)
- **Coverage assessment**: ✅ Adequate
- **Notes**: Philosophy is enforced at language level through type system and lack of exception syntax.

## Feature Gaps (this section)

- **F-18**: Integer overflow semantics — No explicit test validates that overflow above Number.MAX_SAFE_INTEGER loses precision without panicking. Should add property test or fixed test with large numbers at boundary.
- **F-19**: Array.get returns Option — Not yet implemented in stdlib (Array module is future work).
- **F-20**: Array.set panics on bounds violation — Not yet implemented in stdlib (Array module is future work).
- **F-27**: Stack overflow error message — Spec mentions "Maximum call stack size exceeded" but no test validates this exact message from JavaScript runtime.
- **F-28**: Out of memory behavior — Spec mentions this but no practical test (would require allocating gigabytes).

## Testing Gaps (this section)

- **F-07**: Result.unwrap error message — Test verifies exception is thrown but does not validate the message matches "unwrap called on Err" (or custom message per panic semantics).
- **F-13**: Option.unwrap error message — Test verifies exception is thrown but does not validate message.
- **F-21**: panic function behavior — No end-to-end test calls panic directly and validates the thrown Error message, stack trace preservation, and unrecoverability.
- **F-26**: Panic error messages — Hardcoded messages in unwrap not validated against spec recommendation to preserve stack trace.

## Testing Redundancies (this section)

- **Candidate**: `result.test.ts:29-32` "unwrap returns value on Ok and throws on Err" overlaps with `result.test.ts:124-130` property test "unwrap inverts Ok" on the Ok path. The property test is stronger (uses fast-check) and the fixed test is redundant for the Ok case. Recommendation: Keep both because the fixed test also covers the Err exception case which the property test does not. The exception case should be split into a separate dedicated test for error message validation.
- **Candidate**: `option.test.ts:27-32` "isSome / isNone discriminate" overlaps with `option.test.ts:106-112` property test "isSome and isNone are mutually exclusive and exhaustive". The property test is equivalent and stronger. Recommendation: The property test already covers this behavior; the fixed test is redundant and could be removed in favor of keeping only the property test.

