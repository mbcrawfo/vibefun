# Audit: 11a Stdlib-Core (List, Option, Result, String)

## Sources Reviewed

**Spec files** (with line counts):
- `docs/spec/11-stdlib/README.md` (24 lines)
- `docs/spec/11-stdlib/list.md` (527 lines)
- `docs/spec/11-stdlib/option.md` (490 lines)
- `docs/spec/11-stdlib/result.md` (534 lines)
- `docs/spec/11-stdlib/string.md` (248 lines)

**Implementation files**:
- `packages/stdlib/src/list.ts` (129 lines)
- `packages/stdlib/src/option.ts` (33 lines)
- `packages/stdlib/src/result.ts` (38 lines)
- `packages/stdlib/src/string.ts` (70 lines)
- `packages/stdlib/src/variants.ts` (42 lines)

**Type signatures**:
- `packages/core/src/typechecker/module-signatures/stdlib/list.ts` (94 lines)
- `packages/core/src/typechecker/module-signatures/stdlib/option.ts` (63 lines)
- `packages/core/src/typechecker/module-signatures/stdlib/result.ts` (90 lines)
- `packages/core/src/typechecker/module-signatures/stdlib/string.ts` (33 lines)

**Test files** (every layer):
- Unit: `packages/stdlib/src/list.test.ts` (277 lines)
- Unit: `packages/stdlib/src/option.test.ts` (130 lines)
- Unit: `packages/stdlib/src/result.test.ts` (141 lines)
- Unit: `packages/stdlib/src/string.test.ts` (166 lines)
- Unit: `packages/stdlib/src/variants.test.ts`
- Property: `packages/stdlib/src/test-arbitraries/variants-arb.ts` (67 lines)
- Property: `packages/stdlib/src/test-arbitraries/variants-arb.test.ts`
- E2E / Spec-validation: `tests/e2e/spec-validation/11-stdlib.test.ts` (495 lines)
- Sync: `packages/core/src/typechecker/module-signatures/stdlib-sync.test.ts` (129 lines)

## Feature Inventory

### F-01: List.map — Transform each element

- **Spec ref**: `docs/spec/11-stdlib/list.md:24-51` — Apply function f to each element, return new list with transformed elements, preserve order, empty list returns empty.
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/stdlib/src/list.ts:21-31` — `map` function, curried data-first, iterates and accumulates results
  - `packages/core/src/typechecker/module-signatures/stdlib/list.ts:19-25` — Type signature: `forall a b. List<a> -> (a -> b) -> List<b>`
- **Tests**:
  - Unit: `packages/stdlib/src/list.test.ts:27-34` — `"transforms each element"`, `"empty list stays empty"`
  - Property: `packages/stdlib/src/list.test.ts:106-113` — Functor identity: `map(id) === id`
  - Property: `packages/stdlib/src/list.test.ts:115-125` — Functor composition: `map(f ∘ g) === map(f) ∘ map(g)`
  - E2E: `tests/e2e/spec-validation/11-stdlib.test.ts:152-165` — `"List.map"` compile-and-run
- **Coverage assessment**: ✅ Adequate
- **Notes**: Currying verified (data-first: list, then function). Both composition laws covered via fixed tests and property tests.

---

### F-02: List.filter — Keep elements matching predicate

- **Spec ref**: `docs/spec/11-stdlib/list.md:55-83` — Keep only elements where predicate(element) is true, preserve relative order, return empty if no match, return copy if all match.
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/stdlib/src/list.ts:33-43` — `filter` function, curried data-first
- **Tests**:
  - Unit: `packages/stdlib/src/list.test.ts:36-43` — `"keeps matching elements in order"`, `"returns empty when no match"`
  - Property: `packages/stdlib/src/list.test.ts:127-134` — `filter(_ => true) === id; filter(_ => false) === Nil`
  - Property: `packages/stdlib/src/list.test.ts:136-145` — Filter idempotence: `filter(filter(xs, p), p) === filter(xs, p)`
  - E2E: `tests/e2e/spec-validation/11-stdlib.test.ts:167-180` — `"List.filter"` compile-and-run
- **Coverage assessment**: ✅ Adequate
- **Notes**: Empty, all-match, partial-match cases covered. Laws verified.

---

### F-03: List.fold — Left fold (reduce)

- **Spec ref**: `docs/spec/11-stdlib/list.md:86-126` — Tail-recursive left fold, `fold(xs, z, f)` → `f(f(f(z, a), b), c)` for `[a,b,c]`, empty returns init.
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/stdlib/src/list.ts:45-56` — `fold` function, curried data-first (list, init, fn), three-argument cascade
  - `packages/core/src/typechecker/module-signatures/stdlib/list.ts:37-45` — Type signature: `forall a b. List<a> -> b -> (b -> a -> b) -> b`
- **Tests**:
  - Unit: `packages/stdlib/src/list.test.ts:45-53` — `"left-folds with data-first curried shape"`, `"returns init for empty list"`
  - Property: `packages/stdlib/src/list.test.ts:235-242` — `fold` sums match `Array.reduce` baseline
  - E2E: `tests/e2e/spec-validation/11-stdlib.test.ts:250-258` — `"List.fold"` sum example: `fold([1,2,3,4,5], 0, (acc,x) => acc+x)` → `"15"`
- **Coverage assessment**: ✅ Adequate
- **Notes**: Currying structure verified: `List.fold(xs)(init)(fn)`. Empty list and sum accumulation both tested.

---

### F-04: List.foldRight — Right fold (tail to head)

- **Spec ref**: `docs/spec/11-stdlib/list.md:129-166` — Right fold `(a, f(b, f(c, z)))`, parameter order reversed from fold `(element, accumulator)`, empty returns init. Not tail-recursive; can overflow >10k elements.
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/stdlib/src/list.ts:58-73` — `foldRight` function, accumulates to array then back-iterates, parameter order `(x, acc)` reversed
  - `packages/core/src/typechecker/module-signatures/stdlib/list.ts:47-55` — Type signature: `forall a b. List<a> -> b -> (a -> b -> b) -> b`
- **Tests**:
  - Unit: `packages/stdlib/src/list.test.ts:55-63` — `"preserves order when rebuilding"`, `"subtraction demonstrates right-to-left order"` (result is 2 not -6)
  - Property: `packages/stdlib/src/list.test.ts:226-233` — `foldRight(xs, Nil, Cons) === xs` (list reconstruction identity)
  - E2E: `tests/e2e/spec-validation/11-stdlib.test.ts:261-269` — `"List.foldRight"` string accumulation: `foldRight([1,2,3], "", (x, acc) => acc & String.fromInt(x))` → `"321"`
- **Coverage assessment**: ✅ Adequate
- **Notes**: Parameter order inversion verified (subtraction test proves `1 - (2 - (3 - 0)) = 2`). Reconstruction law holds.

---

### F-05: List.length — Count elements

- **Spec ref**: `docs/spec/11-stdlib/list.md:170-186` — Return number of elements; O(n) must traverse; not cached. Idiomatic to use pattern matching for empty check.
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/stdlib/src/list.ts:75-83` — `length` function, simple loop counting Cons nodes
  - `packages/core/src/typechecker/module-signatures/stdlib/list.ts:57-61` — Type signature: `forall a. List<a> -> Int`
- **Tests**:
  - Unit: `packages/stdlib/src/list.test.ts:65-70` — `"counts elements"` (3, 0)
  - Property: `packages/stdlib/src/list.test.ts:147-153` — `length(reverse(xs)) === length(xs)` (length invariant)
  - Property: `packages/stdlib/src/list.test.ts:163-169` — `length` matches array round-trip
  - Property: `packages/stdlib/src/list.test.ts:190-196` — `length(concat(a, b)) === length(a) + length(b)`
  - E2E: `tests/e2e/spec-validation/11-stdlib.test.ts:224-233` — `"List.length"` on `[1,2,3]` → `"3"`
  - E2E: `tests/e2e/spec-validation/11-stdlib.test.ts:297-306` — Empty list length → `"0"`
- **Coverage assessment**: ✅ Adequate
- **Notes**: Empty, non-empty, and additivity properties all covered.

---

### F-06: List.head — Get first element

- **Spec ref**: `docs/spec/11-stdlib/list.md:203-233` — Return `Some(element)` for non-empty, `None` for empty. O(1).
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/stdlib/src/list.ts:85` — `head` function, ternary on `$tag === "Cons"`
  - `packages/core/src/typechecker/module-signatures/stdlib/list.ts:63-67` — Type signature: `forall a. List<a> -> Option<a>`
- **Tests**:
  - Unit: `packages/stdlib/src/list.test.ts:72-76` — `"head returns Some for non-empty, None for empty"`
  - Property: `packages/stdlib/src/list.test.ts:198-209` — `head(reverse(xs)) === Some(last(xs))` or `None` on empty
  - Property: `packages/stdlib/src/list.test.ts:211-224` — Head/tail consistency: `Cons(head, tail) === xs` when both Some
  - E2E: `tests/e2e/spec-validation/11-stdlib.test.ts:182-194` — `"List.head returns Option"` on `[42,1,2]` → `Some(42)`
  - E2E: `tests/e2e/spec-validation/11-stdlib.test.ts:196-208` — Empty list head → `None`
- **Coverage assessment**: ✅ Adequate
- **Notes**: Both Some and None cases covered; consistency with tail verified.

---

### F-07: List.tail — Get rest of list

- **Spec ref**: `docs/spec/11-stdlib/list.md:237-259` — Return `Some(rest)` for non-empty (all elements after first), `None` for empty, single-element list returns `Some([])`. O(1).
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/stdlib/src/list.ts:87` — `tail` function, ternary on `$tag === "Cons"`
  - `packages/core/src/typechecker/module-signatures/stdlib/list.ts:69-73` — Type signature: `forall a. List<a> -> Option<List<a>>`
- **Tests**:
  - Unit: `packages/stdlib/src/list.test.ts:77-83` — `"tail returns Some(rest) for non-empty, None for empty"`, verifies result contains `[2,3]` for input `[1,2,3]`
  - Property: `packages/stdlib/src/list.test.ts:211-224` — Head/tail consistency
  - E2E: `tests/e2e/spec-validation/11-stdlib.test.ts:210-222` — `"List.tail returns Option"` on `[1,2,3]` → `Some([2,3])` (length 2)
- **Coverage assessment**: ✅ Adequate
- **Notes**: Single-element edge case implicitly covered via consistency check. Both None and Some branches verified.

---

### F-08: List.reverse — Reverse elements

- **Spec ref**: `docs/spec/11-stdlib/list.md:262-284` — Return new list with elements in reverse order; O(n) time, O(n) space. Can be implemented with fold.
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/stdlib/src/list.ts:89-97` — `reverse` function, iterates and prepends (fold-style)
  - `packages/core/src/typechecker/module-signatures/stdlib/list.ts:75-79` — Type signature: `forall a. List<a> -> List<a>`
- **Tests**:
  - Unit: `packages/stdlib/src/list.test.ts:85-90` — `"reverses elements"` on `[1,2,3]` → `[3,2,1]`, empty → empty
  - Property: `packages/stdlib/src/list.test.ts:155-161` — Involution: `reverse(reverse(xs)) === xs`
  - Property: `packages/stdlib/src/list.test.ts:147-153` — `length(reverse(xs)) === length(xs)`
  - E2E: `tests/e2e/spec-validation/11-stdlib.test.ts:235-248` — `"List.reverse"` on `[1,2,3]` → first element is 3
- **Coverage assessment**: ✅ Adequate
- **Notes**: Empty, involution, and length preservation all verified.

---

### F-09: List.concat — Concatenate two lists

- **Spec ref**: `docs/spec/11-stdlib/list.md:288-314` — Return new list with all elements from first, then second. Does not modify inputs. `concat([], ys)` is copy of ys, `concat(xs, [])` is copy of xs. O(n) in first list length.
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/stdlib/src/list.ts:99-113` — `concat` function, curried data-first, accumulates first list to array, rebuilds prepending second
  - `packages/core/src/typechecker/module-signatures/stdlib/list.ts:81-85` — Type signature: `forall a. List<a> -> List<a> -> List<a>`
- **Tests**:
  - Unit: `packages/stdlib/src/list.test.ts:92-100` — `"joins two lists preserving order"`, handles empty operands (left and right identity)
  - Property: `packages/stdlib/src/list.test.ts:171-179` — Associativity: `concat(concat(a, b), c) === concat(a, concat(b, c))`
  - Property: `packages/stdlib/src/list.test.ts:181-188` — Nil is left and right identity
  - Property: `packages/stdlib/src/list.test.ts:190-196` — Length additivity: `length(concat(a, b)) === length(a) + length(b)`
  - E2E: `tests/e2e/spec-validation/11-stdlib.test.ts:272-283` — `"List.concat"` on `[1,2]` and `[3,4]` → length 4
- **Coverage assessment**: ✅ Adequate
- **Notes**: Empty edges, associativity, identity, and additivity all verified. Currying (data-first) confirmed.

---

### F-10: List.flatten — Flatten one level of nesting

- **Spec ref**: `docs/spec/11-stdlib/list.md:317-357` — Flatten list of lists into single list by one level; only flattens one level (not recursive); preserves order; empty outer or all-empty inner → empty result.
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/stdlib/src/list.ts:115-128` — `flatten` function, double loop (outer, inner), accumulates to array, rebuilds
  - `packages/core/src/typechecker/module-signatures/stdlib/list.ts:87-91` — Type signature: `forall a. List<List<a>> -> List<a>`
- **Tests**:
  - Unit: (no dedicated unit test for flatten alone, but indirectly tested)
  - Property: `packages/stdlib/src/list.test.ts:245-259` — `flatten` produces correct order (concatenation semantics)
  - Property: `packages/stdlib/src/list.test.ts:261-275` — `length(flatten(xss)) === sum of inner lengths`
  - E2E: `tests/e2e/spec-validation/11-stdlib.test.ts:285-295` — `"List.flatten"` on `[[1,2], [3,4], [5]]` → length 5
- **Coverage assessment**: ⚠️ Thin
- **Notes**: No fixed unit test verifying the spec examples (e.g., empty outer list, nested structure with empty sublists). Only property tests and one e2e test covering the happy path. Add fixed tests for: (1) empty outer list, (2) outer list with empty inner lists, (3) two-level nesting (to verify it's one level only).

---

### F-11: Option.map — Transform value inside Option

- **Spec ref**: `docs/spec/11-stdlib/option.md:24-52` — If `Some(value)`, apply function and return `Some(newValue)`. If `None`, return `None`.
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/stdlib/src/option.ts:10-13` — `map` function, curried data-first, ternary on `$tag === "Some"`
  - `packages/core/src/typechecker/module-signatures/stdlib/option.ts:15-23` — Type signature: `forall a b. Option<a> -> (a -> b) -> Option<b>`
- **Tests**:
  - Unit: `packages/stdlib/src/option.test.ts:11-16` — `"map transforms Some"`, `"map passes None through"`
  - Property: `packages/stdlib/src/option.test.ts:41-47` — Functor identity: `map(id) === id`
  - Property: `packages/stdlib/src/option.test.ts:49-59` — Functor composition: `map(f ∘ g) === map(f) ∘ map(g)`
  - Property: `packages/stdlib/src/option.test.ts:122-128` — `map` preserves Some/None tag
  - E2E: `tests/e2e/spec-validation/11-stdlib.test.ts:310-322` — `"Option.map"` on `Some(5)` with `*2` → `Some(10)`
- **Coverage assessment**: ✅ Adequate
- **Notes**: Functor laws covered. Currying verified (data-first).

---

### F-12: Option.flatMap — Chain operations returning Options

- **Spec ref**: `docs/spec/11-stdlib/option.md:56-96` — If `Some(value)`, apply function (which returns Option) and return flattened result. If `None`, return `None` without calling function. Flattens nested Options.
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/stdlib/src/option.ts:15-18` — `flatMap` function, curried data-first
  - `packages/core/src/typechecker/module-signatures/stdlib/option.ts:25-36` — Type signature: `forall a b. Option<a> -> (a -> Option<b>) -> Option<b>`
- **Tests**:
  - Unit: `packages/stdlib/src/option.test.ts:17-22` — `"flatMap chains Some"`, `"flatMap short-circuits on None"`
  - Property: `packages/stdlib/src/option.test.ts:61-68` — Monad left identity: `flatMap(Some(a))(k) === k(a)`
  - Property: `packages/stdlib/src/option.test.ts:70-76` — Monad right identity: `flatMap(opt)(Some) === opt`
  - Property: `packages/stdlib/src/option.test.ts:78-88` — Monad associativity: `flatMap(flatMap(opt)(f))(g) === flatMap(opt)(x => flatMap(f(x))(g))`
  - E2E: `tests/e2e/spec-validation/11-stdlib.test.ts:324-336` — `"Option.flatMap"` chaining with condition
- **Coverage assessment**: ✅ Adequate
- **Notes**: All three monad laws verified via property tests. Short-circuit behavior on None confirmed.

---

### F-13: Option.getOrElse — Extract value or default

- **Spec ref**: `docs/spec/11-stdlib/option.md:99-127` — Return value if `Some(value)`, return provided default if `None`. Never panics.
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/stdlib/src/option.ts:20-23` — `getOrElse` function, curried data-first
  - `packages/core/src/typechecker/module-signatures/stdlib/option.ts:38-42` — Type signature: `forall a. Option<a> -> a -> a`
- **Tests**:
  - Unit: `packages/stdlib/src/option.test.ts:23-26` — `"getOrElse returns value or fallback"` (Some → 42, None → 0)
  - Property: `packages/stdlib/src/option.test.ts:90-96` — On None, returns fallback
  - Property: `packages/stdlib/src/option.test.ts:98-104` — On Some(a), returns a regardless of fallback
  - E2E: `tests/e2e/spec-validation/11-stdlib.test.ts:338-347` — `"Option.getOrElse"` on None with fallback 42
- **Coverage assessment**: ✅ Adequate
- **Notes**: Both branches and fallback semantics verified.

---

### F-14: Option.isSome — Check if Option contains value

- **Spec ref**: `docs/spec/11-stdlib/option.md:130-146` — Return `true` if `Some`, `false` if `None`. O(1).
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/stdlib/src/option.ts:25` — `isSome` function, simple tag check
  - `packages/core/src/typechecker/module-signatures/stdlib/option.ts:44-48` — Type signature: `forall a. Option<a> -> Bool`
- **Tests**:
  - Unit: `packages/stdlib/src/option.test.ts:27-32` — `"isSome / isNone discriminate"` (Some → true, None → false)
  - Property: `packages/stdlib/src/option.test.ts:106-112` — Exclusivity/exhaustivity: `isSome(opt) === !isNone(opt)`
  - E2E: `tests/e2e/spec-validation/11-stdlib.test.ts:349-358` — `"Option.isSome"` on `Some(5)` → `true`
- **Coverage assessment**: ✅ Adequate
- **Notes**: Tag-check verified; mutually exclusive with isNone.

---

### F-15: Option.isNone — Check if Option is absent

- **Spec ref**: `docs/spec/11-stdlib/option.md:162-178` — Return `true` if `None`, `false` if `Some`. O(1).
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/stdlib/src/option.ts:27` — `isNone` function, simple tag check
  - `packages/core/src/typechecker/module-signatures/stdlib/option.ts:50-54` — Type signature: `forall a. Option<a> -> Bool`
- **Tests**:
  - Unit: `packages/stdlib/src/option.test.ts:27-32` — `"isSome / isNone discriminate"` (None → true, Some → false)
  - Property: `packages/stdlib/src/option.test.ts:106-112` — Exhaustivity check
  - E2E: `tests/e2e/spec-validation/11-stdlib.test.ts:360-369` — `"Option.isNone"` on `None` → `true`
- **Coverage assessment**: ✅ Adequate
- **Notes**: Complementary to isSome; both verified together.

---

### F-16: Option.unwrap — Extract value or panic

- **Spec ref**: `docs/spec/11-stdlib/option.md:181-210` — Return value if `Some(value)`. **Panic if `None`** with runtime error. O(1).
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/stdlib/src/option.ts:29-32` — `unwrap` function, returns `opt.$0` on Some, throws on None
  - `packages/core/src/typechecker/module-signatures/stdlib/option.ts:56-60` — Type signature: `forall a. Option<a> -> a`
- **Tests**:
  - Unit: `packages/stdlib/src/option.test.ts:33-36` — `"unwrap returns value on Some and throws on None"` (Some → 9, None → throws with regex match)
  - Property: `packages/stdlib/src/option.test.ts:114-120` — Inverse of Some: `unwrap(Some(a)) === a`
  - (No E2E test for panic case — correctly avoided per spec validation design)
- **Coverage assessment**: ✅ Adequate
- **Notes**: Success case and panic case both tested. Error message verified.

---

### F-17: Result.map — Transform success value

- **Spec ref**: `docs/spec/11-stdlib/result.md:24-55` — If `Ok(value)`, apply function and return `Ok(newValue)`. If `Err(error)`, return `Err(error)` unchanged. Error type `E` remains same.
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/stdlib/src/result.ts:10-13` — `map` function, curried data-first, ternary on `$tag === "Ok"`
  - `packages/core/src/typechecker/module-signatures/stdlib/result.ts:15-27` — Type signature: `forall t e u. Result<t, e> -> (t -> u) -> Result<u, e>`
- **Tests**:
  - Unit: `packages/stdlib/src/result.test.ts:11-14` — `"map transforms Ok, leaves Err"` (Ok → transforms, Err → unchanged)
  - Property: `packages/stdlib/src/result.test.ts:41-47` — Functor identity: `map(id) === id`
  - Property: `packages/stdlib/src/result.test.ts:49-59` — Functor composition
  - Property: `packages/stdlib/src/result.test.ts:100-114` — `map` only touches Ok (Err invariant)
  - E2E: `tests/e2e/spec-validation/11-stdlib.test.ts:373-385` — `"Result.map"` on `Ok(5)` with `*2` → `Ok(10)`
- **Coverage assessment**: ✅ Adequate
- **Notes**: Both Ok and Err branches; functor laws verified.

---

### F-18: Result.mapErr — Transform error value

- **Spec ref**: `docs/spec/11-stdlib/result.md:59-92` — If `Err(error)`, apply function and return `Err(newError)`. If `Ok(value)`, return `Ok(value)` unchanged. Success type `T` remains same.
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/stdlib/src/result.ts:20-23` — `mapErr` function, curried data-first, ternary on `$tag === "Ok"`
  - `packages/core/src/typechecker/module-signatures/stdlib/result.ts:46-58` — Type signature: `forall t e f. Result<t, e> -> (e -> f) -> Result<t, f>`
- **Tests**:
  - Unit: `packages/stdlib/src/result.test.ts:19-22` — `"mapErr transforms Err, leaves Ok"` (Err → transforms, Ok → unchanged)
  - Property: `packages/stdlib/src/result.test.ts:92-98` — Identity: `mapErr(id) === id`
  - Property: `packages/stdlib/src/result.test.ts:100-114` — `mapErr` only touches Err (Ok invariant)
  - E2E: `tests/e2e/spec-validation/11-stdlib.test.ts:387-399` — `"Result.mapErr"` on `Err("bad")` with string concatenation
- **Coverage assessment**: ✅ Adequate
- **Notes**: Both Ok and Err branches; error transformation verified.

---

### F-19: Result.flatMap — Chain operations that may fail

- **Spec ref**: `docs/spec/11-stdlib/result.md:95-151` — If `Ok(value)`, apply function (which returns Result) and return flattened result. If `Err(error)`, return `Err(error)` without calling function. Flattens nested Results. Error type `E` must be same across all operations.
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/stdlib/src/result.ts:15-18` — `flatMap` function, curried data-first
  - `packages/core/src/typechecker/module-signatures/stdlib/result.ts:29-44` — Type signature: `forall t e u. Result<t, e> -> (t -> Result<u, e>) -> Result<u, e>`
- **Tests**:
  - Unit: `packages/stdlib/src/result.test.ts:15-18` — `"flatMap chains Ok, short-circuits Err"` (Ok → chains, Err → unchanged)
  - Property: `packages/stdlib/src/result.test.ts:61-68` — Monad left identity: `flatMap(Ok(a))(k) === k(a)`
  - Property: `packages/stdlib/src/result.test.ts:70-76` — Monad right identity: `flatMap(r)(Ok) === r`
  - Property: `packages/stdlib/src/result.test.ts:78-90` — Monad associativity
  - E2E: `tests/e2e/spec-validation/11-stdlib.test.ts:401-413` — `"Result.flatMap"` chaining with condition
- **Coverage assessment**: ✅ Adequate
- **Notes**: All three monad laws; short-circuit on Err; currying verified (data-first).

---

### F-20: Result.isOk — Check if Result is success

- **Spec ref**: `docs/spec/11-stdlib/result.md:154-182` — Return `true` if `Ok`, `false` if `Err`. O(1).
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/stdlib/src/result.ts:25` — `isOk` function, simple tag check
  - `packages/core/src/typechecker/module-signatures/stdlib/result.ts:60-65` — Type signature: `forall t e. Result<t, e> -> Bool`
- **Tests**:
  - Unit: `packages/stdlib/src/result.test.ts:23-28` — `"isOk / isErr discriminate"` (Ok → true, Err → false)
  - Property: `packages/stdlib/src/result.test.ts:116-122` — Exhaustivity/exclusivity: `isOk(r) === !isErr(r)`
  - E2E: `tests/e2e/spec-validation/11-stdlib.test.ts:426-435` — `"Result.isOk"` on `Ok(42)` → `true`
- **Coverage assessment**: ✅ Adequate
- **Notes**: Tag check; complementary to isErr.

---

### F-21: Result.isErr — Check if Result is error

- **Spec ref**: `docs/spec/11-stdlib/result.md:186-202` — Return `true` if `Err`, `false` if `Ok`. O(1).
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/stdlib/src/result.ts:27` — `isErr` function, simple tag check
  - `packages/core/src/typechecker/module-signatures/stdlib/result.ts:67-72` — Type signature: `forall t e. Result<t, e> -> Bool`
- **Tests**:
  - Unit: `packages/stdlib/src/result.test.ts:23-28` — `"isOk / isErr discriminate"` (Err → true, Ok → false)
  - Property: `packages/stdlib/src/result.test.ts:116-122` — Exclusivity check
  - E2E: `tests/e2e/spec-validation/11-stdlib.test.ts:437-446` — `"Result.isErr"` on `Err("bad")` → `true`
- **Coverage assessment**: ✅ Adequate
- **Notes**: Complementary to isOk.

---

### F-22: Result.unwrap — Extract success or panic

- **Spec ref**: `docs/spec/11-stdlib/result.md:205-235` — Return value if `Ok(value)`. **Panic if `Err(error)`** with runtime error. O(1).
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/stdlib/src/result.ts:29-32` — `unwrap` function, returns `result.$0` on Ok, throws on Err
  - `packages/core/src/typechecker/module-signatures/stdlib/result.ts:74-79` — Type signature: `forall t e. Result<t, e> -> t`
- **Tests**:
  - Unit: `packages/stdlib/src/result.test.ts:29-32` — `"unwrap returns value on Ok and throws on Err"` (Ok → 9, Err → throws with regex match)
  - Property: `packages/stdlib/src/result.test.ts:124-130` — Inverse of Ok: `unwrap(Ok(a)) === a`
  - (No E2E test for panic case)
- **Coverage assessment**: ✅ Adequate
- **Notes**: Success and panic cases tested.

---

### F-23: Result.unwrapOr — Extract success or default

- **Spec ref**: `docs/spec/11-stdlib/result.md:238-268` — Return value if `Ok(value)`, return provided default if `Err(error)`. Never panics.
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/stdlib/src/result.ts:34-37` — `unwrapOr` function, curried data-first
  - `packages/core/src/typechecker/module-signatures/stdlib/result.ts:81-86` — Type signature: `forall t e. Result<t, e> -> t -> t`
- **Tests**:
  - Unit: `packages/stdlib/src/result.test.ts:33-36` — `"unwrapOr returns value on Ok and fallback on Err"` (Ok → 9, Err → 0)
  - Property: `packages/stdlib/src/result.test.ts:132-139` — Fallback semantics on both Ok and Err branches
  - E2E: `tests/e2e/spec-validation/11-stdlib.test.ts:415-424` — `"Result.unwrapOr"` on `Err("failed")` with fallback 0
- **Coverage assessment**: ✅ Adequate
- **Notes**: Both branches; currying (data-first) verified.

---

### F-24: String.length — Count Unicode code points

- **Spec ref**: `docs/spec/11-stdlib/string.md:14-25` — Return number of characters (Unicode code points, not bytes). "🎉" is 1. Empty → 0.
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/stdlib/src/string.ts:10` — `length` function, uses spread iterator `[...s].length`
  - `packages/core/src/typechecker/module-signatures/stdlib/string.ts:16` — Type signature: `String -> Int`
- **Tests**:
  - Unit: `packages/stdlib/src/string.test.ts:21-25` — `"length counts Unicode code points"` (hello→5, ""→0, "🎉"→1)
  - Property: `packages/stdlib/src/string.test.ts:79-85` — Length matches code-point count via spread for any string
  - E2E: `tests/e2e/spec-validation/11-stdlib.test.ts:26-28` — `"String.length"` on "hello" → `"5"`
- **Coverage assessment**: ✅ Adequate
- **Notes**: Unicode-awareness verified; empty case; property test ensures correctness on arbitrary strings.

---

### F-25: String.concat — Concatenate two strings

- **Spec ref**: `docs/spec/11-stdlib/string.md:29-40` — Concatenate two strings. Infix operator `&` is alias for this function.
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/stdlib/src/string.ts:12-15` — `concat` function, curried data-first, simple `+` concatenation
  - `packages/core/src/typechecker/module-signatures/stdlib/string.ts:17` — Type signature: `String -> String -> String`
- **Tests**:
  - Unit: `packages/stdlib/src/string.test.ts:26-28` — `"concat glues two strings"` ("hello" + " world")
  - Property: `packages/stdlib/src/string.test.ts:87-93` — Associativity: `concat(concat(a,b),c) === concat(a,concat(b,c))`
  - Property: `packages/stdlib/src/string.test.ts:95-102` — Empty string is left and right identity
  - Property: `packages/stdlib/src/string.test.ts:104-110` — Length additivity: `length(concat(a,b)) === length(a) + length(b)`
  - E2E: `tests/e2e/spec-validation/11-stdlib.test.ts:30-32` — `"String concatenation with &"` via operator
- **Coverage assessment**: ✅ Adequate
- **Notes**: Function form tested (curried); operator form tested in e2e. Associativity and identities verified.

---

### F-26: String.toUpperCase — Convert to uppercase

- **Spec ref**: `docs/spec/11-stdlib/string.md:43-53` — Convert all characters to uppercase per Unicode rules. "Café" → "CAFÉ".
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/stdlib/src/string.ts:26` — `toUpperCase` function, delegates to `s.toUpperCase()`
  - `packages/core/src/typechecker/module-signatures/stdlib/string.ts:21` — Type signature: `String -> String`
- **Tests**:
  - Unit: `packages/stdlib/src/string.test.ts:43-46` — `"toUpperCase / toLowerCase / trim"` (hello → HELLO)
  - Property: `packages/stdlib/src/string.test.ts:112-121` — Preserves length for ASCII (Unicode may expand: ß→SS)
  - Property: `packages/stdlib/src/string.test.ts:131-136` — Idempotent: `toUpperCase(toUpperCase(s)) === toUpperCase(s)`
  - E2E: `tests/e2e/spec-validation/11-stdlib.test.ts:34-36` — `"String.toUpperCase"` on "hello" → "HELLO"
- **Coverage assessment**: ✅ Adequate
- **Notes**: ASCII and idempotence verified; Unicode caveat mentioned in property test.

---

### F-27: String.toLowerCase — Convert to lowercase

- **Spec ref**: `docs/spec/11-stdlib/string.md:57-67` — Convert all characters to lowercase per Unicode rules. "Café" → "café".
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/stdlib/src/string.ts:28` — `toLowerCase` function, delegates to `s.toLowerCase()`
  - `packages/core/src/typechecker/module-signatures/stdlib/string.ts:22` — Type signature: `String -> String`
- **Tests**:
  - Unit: `packages/stdlib/src/string.test.ts:43-46` — `"toUpperCase / toLowerCase / trim"` (HELLO → hello)
  - Property: `packages/stdlib/src/string.test.ts:112-121` — Preserves length for ASCII
  - Property: `packages/stdlib/src/string.test.ts:123-128` — Idempotent
  - E2E: `tests/e2e/spec-validation/11-stdlib.test.ts:38-40` — `"String.toLowerCase"` on "HELLO" → "hello"
- **Coverage assessment**: ✅ Adequate
- **Notes**: Complementary to toUpperCase; idempotence verified.

---

### F-28: String.trim — Remove leading/trailing whitespace

- **Spec ref**: `docs/spec/11-stdlib/string.md:71-82` — Remove leading and trailing whitespace. Handles newlines, tabs, spaces.
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/stdlib/src/string.ts:30` — `trim` function, delegates to `s.trim()`
  - `packages/core/src/typechecker/module-signatures/stdlib/string.ts:23` — Type signature: `String -> String`
- **Tests**:
  - Unit: `packages/stdlib/src/string.test.ts:43-46` — `"toUpperCase / toLowerCase / trim"` ("  hi  " → "hi")
  - Property: `packages/stdlib/src/string.test.ts:139-144` — Idempotent: `trim(trim(s)) === trim(s)`
  - E2E: `tests/e2e/spec-validation/11-stdlib.test.ts:42-44` — `"String.trim"` on "  hello  " → "hello"
- **Coverage assessment**: ✅ Adequate
- **Notes**: Whitespace handling; idempotence verified.

---

### F-29: String.split — Split string by separator

- **Spec ref**: `docs/spec/11-stdlib/string.md:86-98` — Split into list of substrings using separator. Returns `List<String>`.
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/stdlib/src/string.ts:32-41` — `split` function, curried data-first, uses `s.split(sep)` then builds List from array
  - `packages/core/src/typechecker/module-signatures/stdlib/string.ts:24` — Type signature: `String -> String -> List<String>`
- **Tests**:
  - Unit: `packages/stdlib/src/string.test.ts:48-51` — `"split returns a List"` ("a,b,c" with "," → 3 parts, "no-sep" with "," → 1 part)
  - E2E: `tests/e2e/spec-validation/11-stdlib.test.ts:67-72` — `"String.split"` produces list of length 3
- **Coverage assessment**: ⚠️ Thin
- **Notes**: Only happy path tested (with separator present, with separator absent). Missing edge case: empty string, empty separator. No property test verifying length of result or order of parts.

---

### F-30: String.contains — Check if string contains substring

- **Spec ref**: `docs/spec/11-stdlib/string.md:101-112` — Check if string contains substring. Empty substring in any string is true.
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/stdlib/src/string.ts:43-46` — `contains` function, curried data-first, delegates to `s.includes(substr)`
  - `packages/core/src/typechecker/module-signatures/stdlib/string.ts:25` — Type signature: `String -> String -> Bool`
- **Tests**:
  - Unit: `packages/stdlib/src/string.test.ts:52-54` — `"contains / startsWith / endsWith"` (contains: true and false cases)
  - E2E: `tests/e2e/spec-validation/11-stdlib.test.ts:46-50` — `"String.contains"` (present and absent)
- **Coverage assessment**: ⚠️ Thin
- **Notes**: No explicit test for empty substring case (`"hello".contains("") === true`). Only presence/absence of non-empty substrings tested.

---

### F-31: String.startsWith — Check if string starts with prefix

- **Spec ref**: `docs/spec/11-stdlib/string.md:116-126` — Check if string starts with given prefix.
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/stdlib/src/string.ts:48-51` — `startsWith` function, curried data-first, delegates to `s.startsWith(prefix)`
  - `packages/core/src/typechecker/module-signatures/stdlib/string.ts:26` — Type signature: `String -> String -> Bool`
- **Tests**:
  - Unit: `packages/stdlib/src/string.test.ts:52-59` — `"contains / startsWith / endsWith"` (true and false cases)
  - E2E: `tests/e2e/spec-validation/11-stdlib.test.ts:53-58` — `"String.startsWith"` on "hello world" with "hello"
- **Coverage assessment**: ⚠️ Thin
- **Notes**: Only non-empty prefix tested. Missing: empty prefix, prefix longer than string.

---

### F-32: String.endsWith — Check if string ends with suffix

- **Spec ref**: `docs/spec/11-stdlib/string.md:130-140` — Check if string ends with given suffix.
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/stdlib/src/string.ts:53-56` — `endsWith` function, curried data-first, delegates to `s.endsWith(suffix)`
  - `packages/core/src/typechecker/module-signatures/stdlib/string.ts:27` — Type signature: `String -> String -> Bool`
- **Tests**:
  - Unit: `packages/stdlib/src/string.test.ts:52-59` — `"contains / startsWith / endsWith"` (true and false cases)
  - E2E: `tests/e2e/spec-validation/11-stdlib.test.ts:60-65` — `"String.endsWith"` on "hello world" with "world"
- **Coverage assessment**: ⚠️ Thin
- **Notes**: Only non-empty suffix tested. Missing: empty suffix, suffix longer than string.

---

### F-33: String.fromInt — Convert int to string

- **Spec ref**: `docs/spec/11-stdlib/string.md:146-157` — Convert integer to string representation. Negatives included. 0 → "0".
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/stdlib/src/string.ts:17` — `fromInt` function, uses `String(n)`
  - `packages/core/src/typechecker/module-signatures/stdlib/string.ts:18` — Type signature: `Int -> String`
- **Tests**:
  - Unit: `packages/stdlib/src/string.test.ts:29-33` — `"fromInt stringifies integers"` (42 → "42", -10 → "-10", 0 → "0")
  - E2E: `tests/e2e/spec-validation/11-stdlib.test.ts:14-16` — `"String.fromInt"` on 42 → "42"
- **Coverage assessment**: ✅ Adequate
- **Notes**: Positive, negative, and zero cases covered.

---

### F-34: String.fromFloat — Convert float to string

- **Spec ref**: `docs/spec/11-stdlib/string.md:161-172` — Convert float to string representation. Renders integers without .0 suffix.
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/stdlib/src/string.ts:19-22` — `fromFloat` function, checks if finite integer, removes .0 suffix or uses String(n)
  - `packages/core/src/typechecker/module-signatures/stdlib/string.ts:19` — Type signature: `Float -> String`
- **Tests**:
  - Unit: `packages/stdlib/src/string.test.ts:34-38` — `"fromFloat renders integers without .0 suffix"` (3.14 → "3.14", -2.5 → "-2.5", 1.0 → "1")
  - E2E: `tests/e2e/spec-validation/11-stdlib.test.ts:18-20` — `"String.fromFloat"` on 3.14 → "3.14"
- **Coverage assessment**: ✅ Adequate
- **Notes**: Integer (with .0 removal), decimal, and negative cases tested.

---

### F-35: String.toInt — Parse string as integer

- **Spec ref**: `docs/spec/11-stdlib/string.md:176-188` — Parse string as integer. Returns `Some(n)` if valid, `None` otherwise. Handles negatives. Non-integers (floats) return None.
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/stdlib/src/string.ts:58-62` — `toInt` function, regex check for `-?\d+`, verifies safe integer, returns Option
  - `packages/core/src/typechecker/module-signatures/stdlib/string.ts:28` — Type signature: `String -> Option<Int>`
- **Tests**:
  - Unit: `packages/stdlib/src/string.test.ts:60-66` — `"toInt returns Some for valid integers, None otherwise"` (42→Some(42), -10→Some(-10), 3.14→None, hello→None, ""→None)
  - E2E: `tests/e2e/spec-validation/11-stdlib.test.ts:74-85` — `"String.toInt returns Option"` on "42" → Some(42) matched and extracted
- **Coverage assessment**: ✅ Adequate
- **Notes**: Valid positive/negative, non-integers (float, string), and empty string all tested.

---

### F-36: String.toFloat — Parse string as float

- **Spec ref**: `docs/spec/11-stdlib/string.md:192-204` — Parse string as float. Returns `Some(n)` if valid number, `None` otherwise.
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/stdlib/src/string.ts:64-69` — `toFloat` function, trims, checks not empty, calls Number(), checks finite, returns Option
  - `packages/core/src/typechecker/module-signatures/stdlib/string.ts:29` — Type signature: `String -> Option<Float>`
- **Tests**:
  - Unit: `packages/stdlib/src/string.test.ts:67-73` — `"toFloat returns Some for valid numbers, None otherwise"` (3.14→Some(3.14), 42→Some(42), -2.5→Some(-2.5), hello→None, ""→None)
  - E2E: `tests/e2e/spec-validation/11-stdlib.test.ts:87-98` — `"String.toFloat returns Option"` on "3.14" → Some(3.14)
- **Coverage assessment**: ✅ Adequate
- **Notes**: Float, integer-as-float, negative, invalid, and empty all tested.

---

### F-37: String.fromBool — Convert bool to string

- **Spec ref**: `docs/spec/11-stdlib/string.md` (not explicitly spec'd in the file but mentioned in signature spec) — Convert boolean to "true" or "false".
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/stdlib/src/string.ts:24` — `fromBool` function, ternary on boolean value
  - `packages/core/src/typechecker/module-signatures/stdlib/string.ts:20` — Type signature: `Bool -> String`
- **Tests**:
  - Unit: `packages/stdlib/src/string.test.ts:39-42` — `"fromBool stringifies booleans"` (true → "true", false → "false")
  - E2E: `tests/e2e/spec-validation/11-stdlib.test.ts:22-24` — `"String.fromBool"` on true → "true"
- **Coverage assessment**: ✅ Adequate
- **Notes**: Both true and false covered.

---

## Feature Gaps (this section)

_None._ All 37 features in scope are ✅ Implemented.

---

## Testing Gaps (this section)

- **F-10**: `List.flatten` — ✅ Implemented but ⚠️ Thin: missing fixed unit tests for spec examples. Recommend adding: (1) `flattenEmpty`, (2) `flattenWithEmptyInners`, (3) `flattenTwoLevelsOnlyFlattensOne` to confirm one-level-only semantics.
- **F-29**: `String.split` — No explicit test for edge cases: empty string input, empty separator. Recommend adding fixed test: (1) `split("", ",")` → `[""]`, (2) `split("hello", "")` (if spec'd behavior).
- **F-30**: `String.contains` — No test for empty substring case (`contains("hello", "") === true`). Recommend adding fixed test.
- **F-31**: `String.startsWith` — No test for empty prefix or prefix longer than string. Recommend adding edge-case fixed test.
- **F-32**: `String.endsWith` — No test for empty suffix or suffix longer than string. Recommend adding edge-case fixed test.

---

## Testing Redundancies (this section)

_None_. Every test layer (unit fixed, property, e2e) covers distinct aspects: fixed tests verify concrete spec examples and edge cases, property tests verify laws (functor, monad, associativity), and e2e tests verify end-to-end compilation and execution. The union is complementary, not redundant.

---

**Summary**:
- **Features**: 37 (List: 10, Option: 6, Result: 8, String: 13)
- **Feature gaps**: 0 (all implemented).
- **Testing gaps**: 5 (F-10 List.flatten thin; F-29/30/31/32 String edge cases).
- **Redundancies**: 0
- **Output file**: `.claude/spec-audit/11a-stdlib-core.md`
