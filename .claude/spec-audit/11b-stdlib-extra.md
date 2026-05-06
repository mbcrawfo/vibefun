# Audit: Stdlib-Extra (Numeric, Array, Collections, Math, JSON)

## Sources Reviewed

**Spec files** (with line counts):
- `docs/spec/11-stdlib/numeric.md` (363 lines)
- `docs/spec/11-stdlib/array.md` (54 lines)
- `docs/spec/11-stdlib/collections.md` (91 lines)
- `docs/spec/11-stdlib/math.md` (54 lines)
- `docs/spec/11-stdlib/json.md` (53 lines)

**Implementation files**:
- `packages/stdlib/src/int.ts`
- `packages/stdlib/src/float.ts`
- `packages/stdlib/src/math.ts`
- `packages/core/src/typechecker/module-signatures/stdlib/int.ts`
- `packages/core/src/typechecker/module-signatures/stdlib/float.ts`
- `packages/core/src/typechecker/module-signatures/stdlib/math.ts`

**Test files** (every layer):
- Unit: `packages/stdlib/src/int.test.ts`, `packages/stdlib/src/float.test.ts`, `packages/stdlib/src/math.test.ts`
- Integration: (none for array/map/set/json)
- Snapshot: (none)
- E2E: `tests/e2e/spec-validation/11-stdlib.test.ts`
- Spec-validation: `tests/e2e/spec-validation/11-stdlib.test.ts` (numeric conversions section)
- Property: Multiple in unit tests (fast-check arbitraries embedded)

## Feature Inventory

### F-01: Int.toString

- **Spec ref**: `docs/spec/11-stdlib/numeric.md:9-22` — Convert integer to string representation
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/stdlib/src/int.ts:6` — `toString` function
  - `packages/core/src/typechecker/module-signatures/stdlib/int.ts:16` — Type signature
- **Tests**:
  - Unit: `packages/stdlib/src/int.test.ts:7-11` — `"toString stringifies"` with test cases (42, -100, 0)
  - Spec-validation: (none directly testing Int.toString)
  - Property: (none)
- **Coverage assessment**: ⚠️ Thin — only happy path cases tested, no edge cases (boundary integers, large numbers)
- **Notes**: Implementation uses `String(n)` which is correct. Type signature matches spec. Missing property tests for safe integer boundaries.

---

### F-02: Int.toFloat

- **Spec ref**: `docs/spec/11-stdlib/numeric.md:26-40` — Convert integer to float without loss of precision for typical ranges
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/stdlib/src/int.ts:8` — `toFloat` function (identity in JavaScript)
  - `packages/core/src/typechecker/module-signatures/stdlib/int.ts:17` — Type signature
- **Tests**:
  - Unit: `packages/stdlib/src/int.test.ts:12-14` — `"toFloat is identity"`
  - Property: `packages/stdlib/src/int.test.ts:68-74` — `"property: toFloat is identity for any safe integer"`
  - Spec-validation: `tests/e2e/spec-validation/11-stdlib.test.ts:102-104` — `"Int.toFloat conversion"`
- **Coverage assessment**: ✅ Adequate — happy path tested, property test over all safe integers
- **Notes**: Type signature correct. Property test ensures identity semantics hold.

---

### F-03: Int.abs

- **Spec ref**: `docs/spec/11-stdlib/numeric.md:43-55` — Return absolute value of integer
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/stdlib/src/int.ts:10` — `abs` function using `Math.abs()`
  - `packages/core/src/typechecker/module-signatures/stdlib/int.ts:18` — Type signature
- **Tests**:
  - Unit: `packages/stdlib/src/int.test.ts:15-19` — `"abs returns magnitude"` with (42, -42, 0)
  - Unit: `packages/stdlib/src/int.test.ts:20-26` — `"abs handles integers outside the 32-bit signed range"` guarding against wrapping
  - Property: `packages/stdlib/src/int.test.ts:35-41` — `"property: abs is non-negative for any safe integer"`
  - Property: `packages/stdlib/src/int.test.ts:43-49` — `"property: abs is idempotent"`
  - Property: `packages/stdlib/src/int.test.ts:51-58` — `"property: abs(n) === abs(-n)"`
  - Spec-validation: `tests/e2e/spec-validation/11-stdlib.test.ts:110-112` — `"Int.abs"`
- **Coverage assessment**: ✅ Adequate — edge cases (32-bit boundary, idempotence, negation) covered
- **Notes**: Type signature correct. Implementation guards against JavaScript bitwise truncation.

---

### F-04: Int.max

- **Spec ref**: `docs/spec/11-stdlib/numeric.md:58-69` — Return larger of two integers
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/stdlib/src/int.ts:12-15` — `max` function (curried)
  - `packages/core/src/typechecker/module-signatures/stdlib/int.ts:19` — Type signature
- **Tests**:
  - Unit: `packages/stdlib/src/int.test.ts:27-31` — `"max / min pick the larger/smaller"` with cases (10,20), (5,3)
  - Property: `packages/stdlib/src/int.test.ts:76-82` — `"property: max is commutative"`
  - Property: `packages/stdlib/src/int.test.ts:84-92` — `"property: max(a,b) >= a and >= b"`
  - Spec-validation: `tests/e2e/spec-validation/11-stdlib.test.ts:114-116` — `"Int.max"`
- **Coverage assessment**: ✅ Adequate — commutativity and lower-bound properties tested
- **Notes**: Curried signature matches spec. Properties validate correctness.

---

### F-05: Int.min

- **Spec ref**: `docs/spec/11-stdlib/numeric.md:73-84` — Return smaller of two integers
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/stdlib/src/int.ts:17-20` — `min` function (curried)
  - `packages/core/src/typechecker/module-signatures/stdlib/int.ts:20` — Type signature
- **Tests**:
  - Unit: `packages/stdlib/src/int.test.ts:27-31` — `"max / min pick the larger/smaller"` with cases (10,20), (-1,-10)
  - Property: `packages/stdlib/src/int.test.ts:94-100` — `"property: min is commutative"`
  - Property: `packages/stdlib/src/int.test.ts:102-110` — `"property: min(a,b) <= a and <= b"`
  - Property: `packages/stdlib/src/int.test.ts:112-118` — `"property: min(a,b) <= max(a,b)"`
  - Spec-validation: `tests/e2e/spec-validation/11-stdlib.test.ts:118-120` — `"Int.min"`
- **Coverage assessment**: ✅ Adequate — commutativity, upper-bound, and ordering properties tested
- **Notes**: Curried signature correct. Comprehensive property coverage.

---

### F-06: Float.toString

- **Spec ref**: `docs/spec/11-stdlib/numeric.md:92-106` — Convert float to string, dropping `.0` on whole numbers
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/stdlib/src/float.ts:9-12` — `toString` function with special handling for integer-valued floats
  - `packages/core/src/typechecker/module-signatures/stdlib/float.ts:16` — Type signature
- **Tests**:
  - Unit: `packages/stdlib/src/float.test.ts:7-11` — `"toString drops trailing .0 on whole numbers"` with cases (3.14, -2.5, 1.0)
  - Property: `packages/stdlib/src/float.test.ts:121-127` — `"property: toString does not throw on any double"`
  - Property: `packages/stdlib/src/float.test.ts:129-135` — `"property: toString drops trailing .0 on integer-valued finite floats"`
  - Spec-validation: (none)
- **Coverage assessment**: ⚠️ Thin — special formatting tested, but no validation that format is stable/consistent
- **Notes**: Implementation correctly checks `Number.isFinite(n) && Math.floor(n) === n` before dropping `.0`. Property test covers integer-valued range. Missing spec-validation test.

---

### F-07: Float.toInt

- **Spec ref**: `docs/spec/11-stdlib/numeric.md:109-124` — Convert float to integer by truncating toward zero
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/stdlib/src/float.ts:14` — `toInt` function using `Math.trunc()`
  - `packages/core/src/typechecker/module-signatures/stdlib/float.ts:17` — Type signature
- **Tests**:
  - Unit: `packages/stdlib/src/float.test.ts:12-17` — `"toInt truncates toward zero"` with cases (3.14, 9.99, -2.7, 1.0)
  - Property: `packages/stdlib/src/float.test.ts:86-99` — `"property: toInt truncates toward zero"` verifying direction for positive and negative
  - Spec-validation: `tests/e2e/spec-validation/11-stdlib.test.ts:106-108` — `"Float.toInt truncation"`
- **Coverage assessment**: ✅ Adequate — truncation direction verified in both fixed and property tests
- **Notes**: Type signature and spec both say returns Int; property test validates truncation semantics precisely.

---

### F-08: Float.round

- **Spec ref**: `docs/spec/11-stdlib/numeric.md:127-139` — Round to nearest integer, rounding half away from zero
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/stdlib/src/float.ts:16-20` — `round` function with explicit away-from-zero rounding
  - `packages/core/src/typechecker/module-signatures/stdlib/float.ts:18` — Type signature
- **Tests**:
  - Unit: `packages/stdlib/src/float.test.ts:18-23` — `"round rounds halfway cases away from zero"` with cases (3.4, 3.5, 3.6, -2.5)
  - Property: `packages/stdlib/src/float.test.ts:101-110` — `"property: round respects round-half-away-from-zero direction"`
  - Spec-validation: `tests/e2e/spec-validation/11-stdlib.test.ts:146-148` — `"Float.round"`
- **Coverage assessment**: ✅ Adequate — away-from-zero semantics explicitly tested; property validates rounding bounds
- **Notes**: Implementation custom: `n >= 0 ? Math.round(n) : -Math.round(Math.abs(n))` to enforce away-from-zero for negatives (JavaScript's default rounds half toward even). Returns Int per spec.

---

### F-09: Float.floor

- **Spec ref**: `docs/spec/11-stdlib/numeric.md:143-156` — Round down toward negative infinity
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/stdlib/src/float.ts:22` — `floor` function using `Math.floor()`
  - `packages/core/src/typechecker/module-signatures/stdlib/float.ts:19` — Type signature
- **Tests**:
  - Unit: `packages/stdlib/src/float.test.ts:24-28` — `"floor rounds toward -inf"` with cases (3.9, -2.1, 5.0)
  - Property: `packages/stdlib/src/float.test.ts:59-66` — `"property: floor(n) <= n <= ceil(n) for finite floats"`
  - Property: `packages/stdlib/src/float.test.ts:77-85` — `"property: floor and ceil are idempotent"`
  - Spec-validation: `tests/e2e/spec-validation/11-stdlib.test.ts:138-140` — `"Float.floor"`
- **Coverage assessment**: ✅ Adequate — direction and idempotence validated
- **Notes**: Type signature says returns Int; implementation and tests consistent with spec.

---

### F-10: Float.ceil

- **Spec ref**: `docs/spec/11-stdlib/numeric.md:159-171` — Round up toward positive infinity
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/stdlib/src/float.ts:24` — `ceil` function using `Math.ceil()`
  - `packages/core/src/typechecker/module-signatures/stdlib/float.ts:20` — Type signature
- **Tests**:
  - Unit: `packages/stdlib/src/float.test.ts:29-33` — `"ceil rounds toward +inf"` with cases (3.1, -2.9, 5.0)
  - Property: `packages/stdlib/src/float.test.ts:59-66` — `"property: floor(n) <= n <= ceil(n) for finite floats"`
  - Property: `packages/stdlib/src/float.test.ts:68-75` — `"property: ceil(n) - floor(n) is 0 or 1"`
  - Property: `packages/stdlib/src/float.test.ts:77-85` — `"property: floor and ceil are idempotent"`
  - Spec-validation: `tests/e2e/spec-validation/11-stdlib.test.ts:142-144` — `"Float.ceil"`
- **Coverage assessment**: ✅ Adequate — direction, idempotence, and spacing validated
- **Notes**: Type signature returns Int; consistent with spec.

---

### F-11: Float.abs

- **Spec ref**: `docs/spec/11-stdlib/numeric.md:175-187` — Return absolute value of float
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/stdlib/src/float.ts:26` — `abs` function using `Math.abs()`
  - `packages/core/src/typechecker/module-signatures/stdlib/float.ts:21` — Type signature
- **Tests**:
  - Unit: `packages/stdlib/src/float.test.ts:34-38` — `"abs returns magnitude"` with cases (3.14, -2.5, 0.0)
  - Property: `packages/stdlib/src/float.test.ts:43-49` — `"property: abs is non-negative on finite floats"`
  - Property: `packages/stdlib/src/float.test.ts:51-57` — `"property: abs is idempotent on finite floats"`
  - Spec-validation: `tests/e2e/spec-validation/11-stdlib.test.ts:122-124` — `"Float.abs"`
- **Coverage assessment**: ✅ Adequate — non-negativity and idempotence validated
- **Notes**: Type signature returns Float (correct per spec). Properties cover finite floats; NaN/Inf behavior implicit.

---

### F-12: Float.isNaN

- **Spec ref**: `docs/spec/11-stdlib/numeric.md:190-203` — Check if float is NaN
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/stdlib/src/float.ts:28` — `isNaN` function using `Number.isNaN()`
  - `packages/core/src/typechecker/module-signatures/stdlib/float.ts:22` — Type signature
- **Tests**:
  - Property: `packages/stdlib/src/float.test.ts:112-119` — `"property: isNaN, isInfinite, isFinite are mutually exclusive and exhaustive"`
  - Spec-validation: `tests/e2e/spec-validation/11-stdlib.test.ts:126-128` — `"Float.isNaN"`
  - Unit: (implicit in property test which checks `0.0 / 0.0` case)
- **Coverage assessment**: ✅ Adequate — mutual exclusion with other classifications guaranteed by property test
- **Notes**: Spec example at line 198 shows `0.0 / 0.0` produces NaN; property test validates against both finite and infinite cases.

---

### F-13: Float.isInfinite

- **Spec ref**: `docs/spec/11-stdlib/numeric.md:207-219` — Check if float is positive or negative infinity
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/stdlib/src/float.ts:30` — `isInfinite` function: `!Number.isFinite(n) && !Number.isNaN(n)`
  - `packages/core/src/typechecker/module-signatures/stdlib/float.ts:23` — Type signature
- **Tests**:
  - Property: `packages/stdlib/src/float.test.ts:112-119` — `"property: isNaN, isInfinite, isFinite are mutually exclusive and exhaustive"`
  - Spec-validation: `tests/e2e/spec-validation/11-stdlib.test.ts:130-132` — `"Float.isInfinite"`
- **Coverage assessment**: ✅ Adequate — mutual exclusion and exhaustiveness property-tested
- **Notes**: Implementation correctly distinguishes infinity from NaN using double negation. Spec examples (1.0/0.0 = positive infinity, -1.0/0.0 = negative infinity) covered by property test.

---

### F-14: Float.isFinite

- **Spec ref**: `docs/spec/11-stdlib/numeric.md:223-235` — Check if float is finite (not NaN, not infinity)
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/stdlib/src/float.ts:32` — `isFinite` function using `Number.isFinite()`
  - `packages/core/src/typechecker/module-signatures/stdlib/float.ts:24` — Type signature
- **Tests**:
  - Property: `packages/stdlib/src/float.test.ts:112-119` — `"property: isNaN, isInfinite, isFinite are mutually exclusive and exhaustive"`
  - Spec-validation: `tests/e2e/spec-validation/11-stdlib.test.ts:134-136` — `"Float.isFinite"`
- **Coverage assessment**: ✅ Adequate — exhaustiveness property-tested; examples from spec (3.14, 0.0, 1.0/0.0, 0.0/0.0) covered
- **Notes**: Direct delegation to `Number.isFinite()` correct.

---

### F-15: Math.pi

- **Spec ref**: `docs/spec/11-stdlib/math.md:8-10` — Constant pi (3.141592...)
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/stdlib/src/math.ts:9` — `pi` constant bound to `Math.PI`
  - `packages/core/src/typechecker/module-signatures/stdlib/math.ts:21` — Type signature (Float)
- **Tests**:
  - Unit: `packages/stdlib/src/math.test.ts:28-31` — `"constants match JS Math"` verifies `M.pi === Math.PI`
  - Spec-validation: (none directly)
- **Coverage assessment**: ⚠️ Thin — only identity test with JavaScript; no numerical properties
- **Notes**: Constant value correct. Missing spec-validation test for Math.pi.

---

### F-16: Math.e

- **Spec ref**: `docs/spec/11-stdlib/math.md:8-10` — Constant e (2.718281...)
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/stdlib/src/math.ts:10` — `e` constant bound to `Math.E`
  - `packages/core/src/typechecker/module-signatures/stdlib/math.ts:22` — Type signature (Float)
- **Tests**:
  - Unit: `packages/stdlib/src/math.test.ts:28-31` — `"constants match JS Math"` verifies `M.e === Math.E`
  - Spec-validation: (none directly)
- **Coverage assessment**: ⚠️ Thin — only identity test
- **Notes**: Constant value correct. Missing spec-validation test for Math.e.

---

### F-17: Math.sin

- **Spec ref**: `docs/spec/11-stdlib/math.md:12-19` — Sine function
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/stdlib/src/math.ts:12` — `sin` function
  - `packages/core/src/typechecker/module-signatures/stdlib/math.ts:25` — Type signature
- **Tests**:
  - Property: `packages/stdlib/src/math.test.ts:90-98` — `"property: sin^2 + cos^2 === 1 (Pythagorean identity)"`
  - Property: `packages/stdlib/src/math.test.ts:100-108` — `"property: sin and cos stay within [-1, 1]"`
  - Spec-validation: (none)
- **Coverage assessment**: ⚠️ Thin — only Pythagorean identity and bound properties; no specific value tests
- **Notes**: Implementation delegates to `Math.sin()`. Missing spec-validation tests.

---

### F-18: Math.cos

- **Spec ref**: `docs/spec/11-stdlib/math.md:12-19` — Cosine function
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/stdlib/src/math.ts:13` — `cos` function
  - `packages/core/src/typechecker/module-signatures/stdlib/math.ts:26` — Type signature
- **Tests**:
  - Property: `packages/stdlib/src/math.test.ts:90-98` — `"property: sin^2 + cos^2 === 1 (Pythagorean identity)"`
  - Property: `packages/stdlib/src/math.test.ts:100-108` — `"property: sin and cos stay within [-1, 1]"`
  - Spec-validation: (none)
- **Coverage assessment**: ⚠️ Thin — only Pythagorean identity and bound properties
- **Notes**: Implementation correct. Missing spec-validation tests.

---

### F-19: Math.tan

- **Spec ref**: `docs/spec/11-stdlib/math.md:12-19` — Tangent function
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/stdlib/src/math.ts:14` — `tan` function
  - `packages/core/src/typechecker/module-signatures/stdlib/math.ts:27` — Type signature
- **Tests**:
  - Spec-validation: (none)
  - Unit: (none)
  - Property: (none)
- **Coverage assessment**: ❌ Untested — no tests whatsoever
- **Notes**: Implementation correct but lacks coverage. Recommend adding property or spec-validation tests for tan.

---

### F-20: Math.asin

- **Spec ref**: `docs/spec/11-stdlib/math.md:12-19` — Inverse sine (arcsine)
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/stdlib/src/math.ts:15` — `asin` function
  - `packages/core/src/typechecker/module-signatures/stdlib/math.ts:28` — Type signature
- **Tests**:
  - Spec-validation: (none)
  - Unit: (none)
  - Property: (none)
- **Coverage assessment**: ❌ Untested — no tests
- **Notes**: Implementation correct but untested. Missing spec-validation tests.

---

### F-21: Math.acos

- **Spec ref**: `docs/spec/11-stdlib/math.md:12-19` — Inverse cosine (arccosine)
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/stdlib/src/math.ts:16` — `acos` function
  - `packages/core/src/typechecker/module-signatures/stdlib/math.ts:29` — Type signature
- **Tests**:
  - Spec-validation: (none)
  - Unit: (none)
  - Property: (none)
- **Coverage assessment**: ❌ Untested
- **Notes**: Implementation correct but untested.

---

### F-22: Math.atan

- **Spec ref**: `docs/spec/11-stdlib/math.md:12-19` — Inverse tangent (arctangent)
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/stdlib/src/math.ts:17` — `atan` function
  - `packages/core/src/typechecker/module-signatures/stdlib/math.ts:30` — Type signature
- **Tests**:
  - Spec-validation: (none)
  - Unit: (none)
  - Property: (none)
- **Coverage assessment**: ❌ Untested
- **Notes**: Implementation correct but untested.

---

### F-23: Math.atan2

- **Spec ref**: `docs/spec/11-stdlib/math.md:12-19` — Two-argument arctangent
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/stdlib/src/math.ts:18-21` — `atan2` function (curried)
  - `packages/core/src/typechecker/module-signatures/stdlib/math.ts:31` — Type signature
- **Tests**:
  - Unit: `packages/stdlib/src/math.test.ts:19-27` — `"curried binary functions"` includes `M.atan2(0)(1)` returning 0
  - Spec-validation: (none)
  - Property: (none)
- **Coverage assessment**: ⚠️ Thin — only single fixed test case (0, 1) → 0
- **Notes**: Curried signature correct. Single test insufficient for comprehensive coverage.

---

### F-24: Math.exp

- **Spec ref**: `docs/spec/11-stdlib/math.md:21-27` — e^x exponential
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/stdlib/src/math.ts:23` — `exp` function
  - `packages/core/src/typechecker/module-signatures/stdlib/math.ts:34` — Type signature
- **Tests**:
  - Property: `packages/stdlib/src/math.test.ts:63-69` — `"property: log(exp(n)) === n for finite n in safe range"`
  - Spec-validation: (none)
  - Unit: (none)
- **Coverage assessment**: ⚠️ Thin — only tested via log-exp inverse property
- **Notes**: Implementation correct. Missing direct spec-validation tests.

---

### F-25: Math.log

- **Spec ref**: `docs/spec/11-stdlib/math.md:21-27` — Natural logarithm (ln)
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/stdlib/src/math.ts:24` — `log` function
  - `packages/core/src/typechecker/module-signatures/stdlib/math.ts:35` — Type signature
- **Tests**:
  - Property: `packages/stdlib/src/math.test.ts:63-69` — `"property: log(exp(n)) === n for finite n in safe range"`
  - Property: `packages/stdlib/src/math.test.ts:145-152` — `"property: log/log10/log2 agree up to base change on positive inputs"`
  - Spec-validation: (none)
  - Unit: (none)
- **Coverage assessment**: ⚠️ Thin — only tested via inverses and base-change property
- **Notes**: Implementation correct. Missing direct spec-validation tests and unit tests for specific values.

---

### F-26: Math.log10

- **Spec ref**: `docs/spec/11-stdlib/math.md:21-27` — Base-10 logarithm
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/stdlib/src/math.ts:25` — `log10` function
  - `packages/core/src/typechecker/module-signatures/stdlib/math.ts:36` — Type signature
- **Tests**:
  - Property: `packages/stdlib/src/math.test.ts:145-152` — `"property: log/log10/log2 agree up to base change on positive inputs"`
  - Spec-validation: (none)
  - Unit: (none)
- **Coverage assessment**: ⚠️ Thin — only tested via base-change equivalence
- **Notes**: Implementation correct. Missing direct tests.

---

### F-27: Math.log2

- **Spec ref**: `docs/spec/11-stdlib/math.md:21-27` — Base-2 logarithm
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/stdlib/src/math.ts:26` — `log2` function
  - `packages/core/src/typechecker/module-signatures/stdlib/math.ts:37` — Type signature
- **Tests**:
  - Property: `packages/stdlib/src/math.test.ts:145-152` — `"property: log/log10/log2 agree up to base change on positive inputs"`
  - Spec-validation: (none)
  - Unit: (none)
- **Coverage assessment**: ⚠️ Thin — only tested via base-change property
- **Notes**: Implementation correct. Missing direct tests.

---

### F-28: Math.pow

- **Spec ref**: `docs/spec/11-stdlib/math.md:21-27` — Power function (base^exponent)
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/stdlib/src/math.ts:27-30` — `pow` function (curried)
  - `packages/core/src/typechecker/module-signatures/stdlib/math.ts:38` — Type signature
- **Tests**:
  - Unit: `packages/stdlib/src/math.test.ts:19-27` — `"curried binary functions"` tests `M.pow(2)(3) === 8`, `M.pow(5)(0) === 1`
  - Property: `packages/stdlib/src/math.test.ts:71-80` — `"property: pow(b, 0) === 1 for any non-zero finite base"`
  - Property: `packages/stdlib/src/math.test.ts:82-88` — `"property: pow(b, 1) === b for any finite base"`
  - Spec-validation: (none)
- **Coverage assessment**: ✅ Adequate — identity cases (b^0=1, b^1=b) and specific examples tested
- **Notes**: Curried signature correct. Type signature returns Float (correct). Property tests identity and neutral cases.

---

### F-29: Math.sqrt

- **Spec ref**: `docs/spec/11-stdlib/math.md:21-27` — Square root
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/stdlib/src/math.ts:31` — `sqrt` function
  - `packages/core/src/typechecker/module-signatures/stdlib/math.ts:39` — Type signature
- **Tests**:
  - Unit: `packages/stdlib/src/math.test.ts:7-10` — `"sqrt"` tests `M.sqrt(16) === 4`, `M.sqrt(0) === 0`
  - Property: `packages/stdlib/src/math.test.ts:39-53` — `"property: sqrt(n*n) === abs(n) when n*n stays representable"` with range guards for overflow
  - Property: `packages/stdlib/src/math.test.ts:55-61` — `"property: sqrt is monotonically non-decreasing on non-negative inputs"`
  - Spec-validation: (none)
- **Coverage assessment**: ✅ Adequate — perfect squares, monotonicity, and inverse property tested with overflow guards
- **Notes**: Implementation correct. Properties carefully bounded to avoid numeric overflow.

---

### F-30: Math.round (Float → Float variant)

- **Spec ref**: `docs/spec/11-stdlib/math.md:29-33` — Rounding function (returns Float per spec)
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/stdlib/src/math.ts:33` — `round` function using `Math.round()`
  - `packages/core/src/typechecker/module-signatures/stdlib/math.ts:42` — Type signature says Float → Float
- **Tests**:
  - Unit: `packages/stdlib/src/math.test.ts:11-14` — `"floor / ceil"` includes floor/ceil but NOT round
  - Spec-validation: (none for Math.round)
- **Coverage assessment**: ❌ Untested — Math.round has no direct tests (Float.round F-08 is separate and returns Int)
- **Notes**: INCONSISTENCY ALERT: Spec says `Math.round: (Float) -> Float` (line 30), but Float.round (line 129 of numeric.md spec) returns Int. Type signature correctly declares Float → Float. Missing test.

---

### F-31: Math.floor (Float → Float variant)

- **Spec ref**: `docs/spec/11-stdlib/math.md:29-33` — Floor function (returns Float per spec)
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/stdlib/src/math.ts:34` — `floor` function
  - `packages/core/src/typechecker/module-signatures/stdlib/math.ts:43` — Type signature Float → Float
- **Tests**:
  - Unit: `packages/stdlib/src/math.test.ts:11-14` — `"floor / ceil"` tests `M.floor(3.9) === 3`, `M.ceil(3.1) === 4`
  - Spec-validation: (none for Math.floor directly)
- **Coverage assessment**: ⚠️ Thin — single example (3.9). Math module has separate return type (Float) vs Float module (Int); single test for Math.floor
- **Notes**: Type signature Math.floor: Float → Float (correct per spec). Fewer tests than Float.floor which returns Int.

---

### F-32: Math.ceil (Float → Float variant)

- **Spec ref**: `docs/spec/11-stdlib/math.md:29-33` — Ceiling function (returns Float per spec)
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/stdlib/src/math.ts:35` — `ceil` function
  - `packages/core/src/typechecker/module-signatures/stdlib/math.ts:44` — Type signature Float → Float
- **Tests**:
  - Unit: `packages/stdlib/src/math.test.ts:11-14` — `"floor / ceil"` includes `M.ceil(3.1) === 4`
  - Spec-validation: (none for Math.ceil directly)
- **Coverage assessment**: ⚠️ Thin — single example
- **Notes**: Type signature correct. Fewer tests than Float.ceil.

---

### F-33: Math.trunc

- **Spec ref**: `docs/spec/11-stdlib/math.md:29-33` — Truncate (remove fractional part)
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/stdlib/src/math.ts:36` — `trunc` function
  - `packages/core/src/typechecker/module-signatures/stdlib/math.ts:45` — Type signature Float → Float
- **Tests**:
  - Property: `packages/stdlib/src/math.test.ts:163-176` — `"property: trunc(n) is between 0 and n inclusive"` (directional bounds)
  - Unit: (none)
  - Spec-validation: (none)
- **Coverage assessment**: ⚠️ Thin — only property test, no fixed examples
- **Notes**: Implementation correct. Missing spec-validation tests.

---

### F-34: Math.abs (Float → Float variant)

- **Spec ref**: `docs/spec/11-stdlib/math.md:36-39` — Absolute value function
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/stdlib/src/math.ts:38` — `abs` function
  - `packages/core/src/typechecker/module-signatures/stdlib/math.ts:48` — Type signature Float → Float
- **Tests**:
  - Unit: `packages/stdlib/src/math.test.ts:15-18` — `"abs"` tests `M.abs(-2.5) === 2.5`, `M.abs(3.14) === 3.14`
  - Property: `packages/stdlib/src/math.test.ts:111-117` — `"property: abs is non-negative on finite floats"`
  - Spec-validation: (none for Math.abs)
- **Coverage assessment**: ✅ Adequate — non-negativity property tested
- **Notes**: Type signature Float → Float (correct). Tested alongside Int.abs and Float.abs but with different modules.

---

### F-35: Math.sign

- **Spec ref**: `docs/spec/11-stdlib/math.md:36-39` — Sign function (-1, 0, or 1)
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/stdlib/src/math.ts:39` — `sign` function using `Math.sign()`
  - `packages/core/src/typechecker/module-signatures/stdlib/math.ts:49` — Type signature
- **Tests**:
  - Property: `packages/stdlib/src/math.test.ts:119-126` — `"property: sign returns -1, 0, or 1 for finite floats"`
  - Unit: (none)
  - Spec-validation: (none)
- **Coverage assessment**: ⚠️ Thin — only property test verifying ternary values, no unit examples
- **Notes**: Implementation correct. Missing examples of actual -1, 0, +1 returns.

---

### F-36: Math.min (Float, Float → Float variant)

- **Spec ref**: `docs/spec/11-stdlib/math.md:36-39` — Minimum of two floats
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/stdlib/src/math.ts:40-43` — `min` function (curried, Float → Float → Float)
  - `packages/core/src/typechecker/module-signatures/stdlib/math.ts:50` — Type signature
- **Tests**:
  - Unit: `packages/stdlib/src/math.test.ts:19-27` — `"curried binary functions"` includes `M.min(10)(4) === 4`, `M.min(-1)(1) === -1`
  - Property: `packages/stdlib/src/math.test.ts:128-135` — `"property: min/max are commutative"`
  - Property: `packages/stdlib/src/math.test.ts:137-143` — `"property: min(a,b) <= max(a,b) for finite floats"`
  - Spec-validation: (none)
- **Coverage assessment**: ✅ Adequate — commutativity and ordering properties tested
- **Notes**: Curried signature correct. Type signature Float → Float → Float per spec.

---

### F-37: Math.max (Float, Float → Float variant)

- **Spec ref**: `docs/spec/11-stdlib/math.md:36-39` — Maximum of two floats
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/stdlib/src/math.ts:44-47` — `max` function (curried)
  - `packages/core/src/typechecker/module-signatures/stdlib/math.ts:51` — Type signature
- **Tests**:
  - Unit: `packages/stdlib/src/math.test.ts:19-27` — `"curried binary functions"` includes `M.max(10)(4) === 10`, `M.max(-1)(1) === 1`
  - Property: `packages/stdlib/src/math.test.ts:128-135` — `"property: min/max are commutative"`
  - Property: `packages/stdlib/src/math.test.ts:137-143` — `"property: min(a,b) <= max(a,b) for finite floats"`
  - Spec-validation: (none)
- **Coverage assessment**: ✅ Adequate — commutativity and ordering properties tested
- **Notes**: Curried signature correct. Type signature Float → Float → Float.

---

### F-38: Math.random

- **Spec ref**: `docs/spec/11-stdlib/math.md:40` — Random number in [0, 1)
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/stdlib/src/math.ts:49` — `random` function using `Math.random()`
  - `packages/core/src/typechecker/module-signatures/stdlib/math.ts:54` — Type signature Unit → Float (impure)
- **Tests**:
  - Unit: (none)
  - Spec-validation: (none)
  - Property: (none — impure function, cannot property-test without effect tracking)
- **Coverage assessment**: ❌ Untested — impure, so no practical test layer available at unit level; would require unsafe block spec-validation
- **Notes**: Type signature correct (Unit → Float). Spec notes impure, should be used inside unsafe blocks. No tests available because JavaScript's Math.random() is impure by design.

---

### F-39: Array.make

- **Spec ref**: `docs/spec/11-stdlib/array.md:12` — Create array of fixed size with default value
- **Status**: ❌ Missing
- **Implementation**: (none)
- **Tests**: (none)
- **Coverage assessment**: ❌ Missing
- **Notes**: Spec defines function signature `Array.make: <T>(Int, T) -> Array<T>`. No implementation file exists. Array module entirely missing from codebase.

---

### F-40: Array.fromList

- **Spec ref**: `docs/spec/11-stdlib/array.md:13` — Convert list to array
- **Status**: ❌ Missing
- **Implementation**: (none)
- **Tests**: (none)
- **Coverage assessment**: ❌ Missing
- **Notes**: Spec signature defined. Array module missing entirely.

---

### F-41: Array.empty

- **Spec ref**: `docs/spec/11-stdlib/array.md:14` — Create empty array
- **Status**: ❌ Missing
- **Implementation**: (none)
- **Tests**: (none)
- **Coverage assessment**: ❌ Missing
- **Notes**: Spec signature defined. Array module missing.

---

### F-42: Array.get

- **Spec ref**: `docs/spec/11-stdlib/array.md:17` — Safe indexed access returning Option
- **Status**: ❌ Missing
- **Implementation**: (none)
- **Tests**: (none)
- **Coverage assessment**: ❌ Missing
- **Notes**: Spec signature: `Array.get: <T>(Array<T>, Int) -> Option<T>`. Array module missing.

---

### F-43: Array.set

- **Spec ref**: `docs/spec/11-stdlib/array.md:18` — Update element at index (mutates)
- **Status**: ❌ Missing
- **Implementation**: (none)
- **Tests**: (none)
- **Coverage assessment**: ❌ Missing
- **Notes**: Spec signature: `Array.set: <T>(Array<T>, Int, T) -> Unit`. Mutable operation. Array module missing.

---

### F-44: Array.length

- **Spec ref**: `docs/spec/11-stdlib/array.md:19` — Get array length
- **Status**: ❌ Missing
- **Implementation**: (none)
- **Tests**: (none)
- **Coverage assessment**: ❌ Missing
- **Notes**: Spec signature: `Array.length: <T>(Array<T>) -> Int`. Array module missing.

---

### F-45: Array.map

- **Spec ref**: `docs/spec/11-stdlib/array.md:22` — Transform array elements (pure)
- **Status**: ❌ Missing
- **Implementation**: (none)
- **Tests**: (none)
- **Coverage assessment**: ❌ Missing
- **Notes**: Spec signature: `Array.map: <A, B>(Array<A>, (A) -> B) -> Array<B>`. Array module missing.

---

### F-46: Array.filter

- **Spec ref**: `docs/spec/11-stdlib/array.md:23` — Filter array (pure)
- **Status**: ❌ Missing
- **Implementation**: (none)
- **Tests**: (none)
- **Coverage assessment**: ❌ Missing
- **Notes**: Spec signature: `Array.filter: <A>(Array<A>, (A) -> Bool) -> Array<A>`. Array module missing.

---

### F-47: Array.fold

- **Spec ref**: `docs/spec/11-stdlib/array.md:24` — Fold over array (pure)
- **Status**: ❌ Missing
- **Implementation**: (none)
- **Tests**: (none)
- **Coverage assessment**: ❌ Missing
- **Notes**: Spec signature: `Array.fold: <A, B>(Array<A>, B, (B, A) -> B) -> B`. Array module missing.

---

### F-48: Array.toList

- **Spec ref**: `docs/spec/11-stdlib/array.md:27` — Convert array to list
- **Status**: ❌ Missing
- **Implementation**: (none)
- **Tests**: (none)
- **Coverage assessment**: ❌ Missing
- **Notes**: Spec signature: `Array.toList: <T>(Array<T>) -> List<T>`. Array module missing.

---

### F-49: Array.slice

- **Spec ref**: `docs/spec/11-stdlib/array.md:28` — Extract subarray
- **Status**: ❌ Missing
- **Implementation**: (none)
- **Tests**: (none)
- **Coverage assessment**: ❌ Missing
- **Notes**: Spec signature: `Array.slice: <T>(Array<T>, Int, Int) -> Array<T>`. Array module missing.

---

### F-50: Array.push

- **Spec ref**: `docs/spec/11-stdlib/array.md:31` — Append to end (mutates)
- **Status**: ❌ Missing
- **Implementation**: (none)
- **Tests**: (none)
- **Coverage assessment**: ❌ Missing
- **Notes**: Spec signature: `Array.push: <T>(Array<T>, T) -> Unit`. Mutable operation. Array module missing.

---

### F-51: Array.pop

- **Spec ref**: `docs/spec/11-stdlib/array.md:32` — Remove from end (mutates)
- **Status**: ❌ Missing
- **Implementation**: (none)
- **Tests**: (none)
- **Coverage assessment**: ❌ Missing
- **Notes**: Spec signature: `Array.pop: <T>(Array<T>) -> Option<T>`. Mutable operation. Array module missing.

---

### F-52: Array.reverse

- **Spec ref**: `docs/spec/11-stdlib/array.md:33` — Reverse in-place (mutates)
- **Status**: ❌ Missing
- **Implementation**: (none)
- **Tests**: (none)
- **Coverage assessment**: ❌ Missing
- **Notes**: Spec signature: `Array.reverse: <T>(Array<T>) -> Unit`. Mutable operation. Array module missing.

---

### F-53: Array.sort

- **Spec ref**: `docs/spec/11-stdlib/array.md:34` — Sort in-place (mutates)
- **Status**: ❌ Missing
- **Implementation**: (none)
- **Tests**: (none)
- **Coverage assessment**: ❌ Missing
- **Notes**: Spec signature: `Array.sort: <T>(Array<T>, (T, T) -> Int) -> Unit`. Mutable operation. Array module missing.

---

### F-54: Map.empty

- **Spec ref**: `docs/spec/11-stdlib/collections.md:11` — Create empty map
- **Status**: ❌ Missing
- **Implementation**: (none)
- **Tests**: (none)
- **Coverage assessment**: ❌ Missing
- **Notes**: Spec signature: `Map.empty: <K, V>() -> Map<K, V>`. Map module missing entirely.

---

### F-55: Map.fromList

- **Spec ref**: `docs/spec/11-stdlib/collections.md:12` — Create map from list of pairs
- **Status**: ❌ Missing
- **Implementation**: (none)
- **Tests**: (none)
- **Coverage assessment**: ❌ Missing
- **Notes**: Spec signature: `Map.fromList: <K, V>(List<(K, V)>) -> Map<K, V>`. Map module missing.

---

### F-56: Map.get

- **Spec ref**: `docs/spec/11-stdlib/collections.md:15` — Get value by key
- **Status**: ❌ Missing
- **Implementation**: (none)
- **Tests**: (none)
- **Coverage assessment**: ❌ Missing
- **Notes**: Spec signature: `Map.get: <K, V>(Map<K, V>, K) -> Option<V>`. Map module missing.

---

### F-57: Map.has

- **Spec ref**: `docs/spec/11-stdlib/collections.md:16` — Check if key exists
- **Status**: ❌ Missing
- **Implementation**: (none)
- **Tests**: (none)
- **Coverage assessment**: ❌ Missing
- **Notes**: Spec signature: `Map.has: <K, V>(Map<K, V>, K) -> Bool`. Map module missing.

---

### F-58: Map.size

- **Spec ref**: `docs/spec/11-stdlib/collections.md:17` — Get number of entries
- **Status**: ❌ Missing
- **Implementation**: (none)
- **Tests**: (none)
- **Coverage assessment**: ❌ Missing
- **Notes**: Spec signature: `Map.size: <K, V>(Map<K, V>) -> Int`. Map module missing.

---

### F-59: Map.set

- **Spec ref**: `docs/spec/11-stdlib/collections.md:20` — Insert or update key (immutable)
- **Status**: ❌ Missing
- **Implementation**: (none)
- **Tests**: (none)
- **Coverage assessment**: ❌ Missing
- **Notes**: Spec signature: `Map.set: <K, V>(Map<K, V>, K, V) -> Map<K, V>`. Map module missing.

---

### F-60: Map.delete

- **Spec ref**: `docs/spec/11-stdlib/collections.md:21` — Remove key (immutable)
- **Status**: ❌ Missing
- **Implementation**: (none)
- **Tests**: (none)
- **Coverage assessment**: ❌ Missing
- **Notes**: Spec signature: `Map.delete: <K, V>(Map<K, V>, K) -> Map<K, V>`. Map module missing.

---

### F-61: Map.update

- **Spec ref**: `docs/spec/11-stdlib/collections.md:22` — Update value with function
- **Status**: ❌ Missing
- **Implementation**: (none)
- **Tests**: (none)
- **Coverage assessment**: ❌ Missing
- **Notes**: Spec signature: `Map.update: <K, V>(Map<K, V>, K, (Option<V>) -> Option<V>) -> Map<K, V>`. Map module missing.

---

### F-62: Map.map

- **Spec ref**: `docs/spec/11-stdlib/collections.md:25` — Transform all values
- **Status**: ❌ Missing
- **Implementation**: (none)
- **Tests**: (none)
- **Coverage assessment**: ❌ Missing
- **Notes**: Spec signature: `Map.map: <K, A, B>(Map<K, A>, (A) -> B) -> Map<K, B>`. Map module missing.

---

### F-63: Map.filter

- **Spec ref**: `docs/spec/11-stdlib/collections.md:26` — Filter entries by predicate
- **Status**: ❌ Missing
- **Implementation**: (none)
- **Tests**: (none)
- **Coverage assessment**: ❌ Missing
- **Notes**: Spec signature: `Map.filter: <K, V>(Map<K, V>, (K, V) -> Bool) -> Map<K, V>`. Map module missing.

---

### F-64: Map.fold

- **Spec ref**: `docs/spec/11-stdlib/collections.md:27` — Fold over entries
- **Status**: ❌ Missing
- **Implementation**: (none)
- **Tests**: (none)
- **Coverage assessment**: ❌ Missing
- **Notes**: Spec signature: `Map.fold: <K, V, A>(Map<K, V>, A, (A, K, V) -> A) -> A`. Map module missing.

---

### F-65: Map.keys

- **Spec ref**: `docs/spec/11-stdlib/collections.md:30` — Get all keys
- **Status**: ❌ Missing
- **Implementation**: (none)
- **Tests**: (none)
- **Coverage assessment**: ❌ Missing
- **Notes**: Spec signature: `Map.keys: <K, V>(Map<K, V>) -> List<K>`. Map module missing.

---

### F-66: Map.values

- **Spec ref**: `docs/spec/11-stdlib/collections.md:31` — Get all values
- **Status**: ❌ Missing
- **Implementation**: (none)
- **Tests**: (none)
- **Coverage assessment**: ❌ Missing
- **Notes**: Spec signature: `Map.values: <K, V>(Map<K, V>) -> List<V>`. Map module missing.

---

### F-67: Map.toList

- **Spec ref**: `docs/spec/11-stdlib/collections.md:32` — Convert map to list of pairs
- **Status**: ❌ Missing
- **Implementation**: (none)
- **Tests**: (none)
- **Coverage assessment**: ❌ Missing
- **Notes**: Spec signature: `Map.toList: <K, V>(Map<K, V>) -> List<(K, V)>`. Map module missing.

---

### F-68: Set.empty

- **Spec ref**: `docs/spec/11-stdlib/collections.md:56` — Create empty set
- **Status**: ❌ Missing
- **Implementation**: (none)
- **Tests**: (none)
- **Coverage assessment**: ❌ Missing
- **Notes**: Spec signature: `Set.empty: <T>() -> Set<T>`. Set module missing entirely.

---

### F-69: Set.fromList

- **Spec ref**: `docs/spec/11-stdlib/collections.md:57` — Create set from list
- **Status**: ❌ Missing
- **Implementation**: (none)
- **Tests**: (none)
- **Coverage assessment**: ❌ Missing
- **Notes**: Spec signature: `Set.fromList: <T>(List<T>) -> Set<T>`. Set module missing.

---

### F-70: Set.singleton

- **Spec ref**: `docs/spec/11-stdlib/collections.md:58` — Create set with one element
- **Status**: ❌ Missing
- **Implementation**: (none)
- **Tests**: (none)
- **Coverage assessment**: ❌ Missing
- **Notes**: Spec signature: `Set.singleton: <T>(T) -> Set<T>`. Set module missing.

---

### F-71: Set.has

- **Spec ref**: `docs/spec/11-stdlib/collections.md:61` — Check membership
- **Status**: ❌ Missing
- **Implementation**: (none)
- **Tests**: (none)
- **Coverage assessment**: ❌ Missing
- **Notes**: Spec signature: `Set.has: <T>(Set<T>, T) -> Bool`. Set module missing.

---

### F-72: Set.size

- **Spec ref**: `docs/spec/11-stdlib/collections.md:62` — Get number of elements
- **Status**: ❌ Missing
- **Implementation**: (none)
- **Tests**: (none)
- **Coverage assessment**: ❌ Missing
- **Notes**: Spec signature: `Set.size: <T>(Set<T>) -> Int`. Set module missing.

---

### F-73: Set.isEmpty

- **Spec ref**: `docs/spec/11-stdlib/collections.md:63` — Check if empty
- **Status**: ❌ Missing
- **Implementation**: (none)
- **Tests**: (none)
- **Coverage assessment**: ❌ Missing
- **Notes**: Spec signature: `Set.isEmpty: <T>(Set<T>) -> Bool`. Set module missing.

---

### F-74: Set.add

- **Spec ref**: `docs/spec/11-stdlib/collections.md:66` — Add element to set
- **Status**: ❌ Missing
- **Implementation**: (none)
- **Tests**: (none)
- **Coverage assessment**: ❌ Missing
- **Notes**: Spec signature: `Set.add: <T>(Set<T>, T) -> Set<T>`. Set module missing.

---

### F-75: Set.delete

- **Spec ref**: `docs/spec/11-stdlib/collections.md:67` — Remove element from set
- **Status**: ❌ Missing
- **Implementation**: (none)
- **Tests**: (none)
- **Coverage assessment**: ❌ Missing
- **Notes**: Spec signature: `Set.delete: <T>(Set<T>, T) -> Set<T>`. Set module missing.

---

### F-76: Set.union

- **Spec ref**: `docs/spec/11-stdlib/collections.md:70` — Combine two sets
- **Status**: ❌ Missing
- **Implementation**: (none)
- **Tests**: (none)
- **Coverage assessment**: ❌ Missing
- **Notes**: Spec signature: `Set.union: <T>(Set<T>, Set<T>) -> Set<T>`. Set module missing.

---

### F-77: Set.intersect

- **Spec ref**: `docs/spec/11-stdlib/collections.md:71` — Common elements of two sets
- **Status**: ❌ Missing
- **Implementation**: (none)
- **Tests**: (none)
- **Coverage assessment**: ❌ Missing
- **Notes**: Spec signature: `Set.intersect: <T>(Set<T>, Set<T>) -> Set<T>`. Set module missing.

---

### F-78: Set.diff

- **Spec ref**: `docs/spec/11-stdlib/collections.md:72` — Difference of two sets
- **Status**: ❌ Missing
- **Implementation**: (none)
- **Tests**: (none)
- **Coverage assessment**: ❌ Missing
- **Notes**: Spec signature: `Set.diff: <T>(Set<T>, Set<T>) -> Set<T>`. Set module missing.

---

### F-79: Set.isSubset

- **Spec ref**: `docs/spec/11-stdlib/collections.md:73` — Check if first set is subset of second
- **Status**: ❌ Missing
- **Implementation**: (none)
- **Tests**: (none)
- **Coverage assessment**: ❌ Missing
- **Notes**: Spec signature: `Set.isSubset: <T>(Set<T>, Set<T>) -> Bool`. Set module missing.

---

### F-80: Set.filter

- **Spec ref**: `docs/spec/11-stdlib/collections.md:76` — Filter set by predicate
- **Status**: ❌ Missing
- **Implementation**: (none)
- **Tests**: (none)
- **Coverage assessment**: ❌ Missing
- **Notes**: Spec signature: `Set.filter: <T>(Set<T>, (T) -> Bool) -> Set<T>`. Set module missing.

---

### F-81: Set.fold

- **Spec ref**: `docs/spec/11-stdlib/collections.md:77` — Fold over set
- **Status**: ❌ Missing
- **Implementation**: (none)
- **Tests**: (none)
- **Coverage assessment**: ❌ Missing
- **Notes**: Spec signature: `Set.fold: <T, A>(Set<T>, A, (A, T) -> A) -> A`. Set module missing.

---

### F-82: Set.toList

- **Spec ref**: `docs/spec/11-stdlib/collections.md:80` — Convert set to list
- **Status**: ❌ Missing
- **Implementation**: (none)
- **Tests**: (none)
- **Coverage assessment**: ❌ Missing
- **Notes**: Spec signature: `Set.toList: <T>(Set<T>) -> List<T>`. Set module missing.

---

### F-83: JSON type definition

- **Spec ref**: `docs/spec/11-stdlib/json.md:9-15` — JSON value discriminated union type
- **Status**: ❌ Missing
- **Implementation**: (none)
- **Tests**: (none)
- **Coverage assessment**: ❌ Missing
- **Notes**: Spec defines `type JSON = | JNull | JBool(Bool) | JNumber(Float) | JString(String) | JArray(List<JSON>) | JObject(Map<String, JSON>)`. Json module entirely missing.

---

### F-84: JSON.parse

- **Spec ref**: `docs/spec/11-stdlib/json.md:18` — Parse JSON string to JSON value
- **Status**: ❌ Missing
- **Implementation**: (none)
- **Tests**: (none)
- **Coverage assessment**: ❌ Missing
- **Notes**: Spec signature: `JSON.parse: (String) -> Result<JSON, String>`. Json module missing.

---

### F-85: JSON.stringify

- **Spec ref**: `docs/spec/11-stdlib/json.md:19` — Convert JSON value to string
- **Status**: ❌ Missing
- **Implementation**: (none)
- **Tests**: (none)
- **Coverage assessment**: ❌ Missing
- **Notes**: Spec signature: `JSON.stringify: (JSON) -> String`. Json module missing.

---

### F-86: JSON.stringifyPretty

- **Spec ref**: `docs/spec/11-stdlib/json.md:20` — Convert JSON value to pretty-printed string with indentation
- **Status**: ❌ Missing
- **Implementation**: (none)
- **Tests**: (none)
- **Coverage assessment**: ❌ Missing
- **Notes**: Spec signature: `JSON.stringifyPretty: (JSON, Int) -> String`. Json module missing.

---

### F-87: JSON.asNull

- **Spec ref**: `docs/spec/11-stdlib/json.md:23` — Extract null value
- **Status**: ❌ Missing
- **Implementation**: (none)
- **Tests**: (none)
- **Coverage assessment**: ❌ Missing
- **Notes**: Spec signature: `JSON.asNull: (JSON) -> Option<Unit>`. Json module missing.

---

### F-88: JSON.asBool

- **Spec ref**: `docs/spec/11-stdlib/json.md:24` — Extract boolean value
- **Status**: ❌ Missing
- **Implementation**: (none)
- **Tests**: (none)
- **Coverage assessment**: ❌ Missing
- **Notes**: Spec signature: `JSON.asBool: (JSON) -> Option<Bool>`. Json module missing.

---

### F-89: JSON.asNumber

- **Spec ref**: `docs/spec/11-stdlib/json.md:25` — Extract number value
- **Status**: ❌ Missing
- **Implementation**: (none)
- **Tests**: (none)
- **Coverage assessment**: ❌ Missing
- **Notes**: Spec signature: `JSON.asNumber: (JSON) -> Option<Float>`. Json module missing.

---

### F-90: JSON.asString

- **Spec ref**: `docs/spec/11-stdlib/json.md:26` — Extract string value
- **Status**: ❌ Missing
- **Implementation**: (none)
- **Tests**: (none)
- **Coverage assessment**: ❌ Missing
- **Notes**: Spec signature: `JSON.asString: (JSON) -> Option<String>`. Json module missing.

---

### F-91: JSON.asArray

- **Spec ref**: `docs/spec/11-stdlib/json.md:27` — Extract array value
- **Status**: ❌ Missing
- **Implementation**: (none)
- **Tests**: (none)
- **Coverage assessment**: ❌ Missing
- **Notes**: Spec signature: `JSON.asArray: (JSON) -> Option<List<JSON>>`. Json module missing.

---

### F-92: JSON.asObject

- **Spec ref**: `docs/spec/11-stdlib/json.md:28` — Extract object value
- **Status**: ❌ Missing
- **Implementation**: (none)
- **Tests**: (none)
- **Coverage assessment**: ❌ Missing
- **Notes**: Spec signature: `JSON.asObject: (JSON) -> Option<Map<String, JSON>>`. Json module missing.

---

### F-93: JSON.getField

- **Spec ref**: `docs/spec/11-stdlib/json.md:31` — Safe object field access
- **Status**: ❌ Missing
- **Implementation**: (none)
- **Tests**: (none)
- **Coverage assessment**: ❌ Missing
- **Notes**: Spec signature: `JSON.getField: (JSON, String) -> Option<JSON>`. Json module missing.

---

### F-94: JSON.getFieldAs

- **Spec ref**: `docs/spec/11-stdlib/json.md:32` — Safe object field access with type extraction
- **Status**: ❌ Missing
- **Implementation**: (none)
- **Tests**: (none)
- **Coverage assessment**: ❌ Missing
- **Notes**: Spec signature: `JSON.getFieldAs: <T>(JSON, String, (JSON) -> Option<T>) -> Option<T>`. Json module missing.

---

## Feature Gaps (this section)

- **F-39 through F-53**: Array module entirely unimplemented — 15 functions missing (construction, access, mutation, transformation)
- **F-54 through F-67**: Map module entirely unimplemented — 14 functions missing (construction, access, modification, transformation)
- **F-68 through F-82**: Set module entirely unimplemented — 15 functions missing (construction, access, set operations, transformation)
- **F-83 through F-94**: Json module entirely unimplemented — 12 functions + type definition missing (parsing, serialization, extraction)
- **F-30**: Math.round returns Float per spec but has no tests (Float.round F-08 returns Int; separate modules, both correct but confusing)
- **F-38**: Math.random is impure; cannot be unit-tested effectively (by design; spec correctly marks as unsafe); no spec-validation test

---

## Testing Gaps (this section)

- **F-01**: Int.toString — add property tests for safe-integer boundaries (Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER)
- **F-06**: Float.toString — add spec-validation test; verify formatting stability (e.g., multiple calls produce identical output)
- **F-15, F-16**: Math.pi, Math.e — add spec-validation tests exercising constants in computation
- **F-17, F-18, F-19**: Math.sin, Math.cos, Math.tan — add unit/spec-validation tests for specific angles (0, π/2, π, etc.)
- **F-20, F-21, F-22**: Math.asin, Math.acos, Math.atan — add unit tests for domain and inverse relationships
- **F-23**: Math.atan2 — add more fixed test cases beyond (0, 1)
- **F-24, F-25, F-26, F-27**: Math.exp, log, log10, log2 — add unit tests for specific values
- **F-30**: Math.round — add fixed tests for rounding behavior (0.5, 1.5, -0.5, etc.)
- **F-31, F-32**: Math.floor, Math.ceil — add more fixed test examples; test edge cases
- **F-33**: Math.trunc — add fixed test examples
- **F-35**: Math.sign — add fixed tests for negative, zero, and positive inputs explicitly
- **F-38**: Math.random — no practical tests available (impure); consider marking as known limitation
- **F-39 through F-82**: Array, Map, Set modules — add comprehensive unit, integration, and spec-validation tests (priority: critical)
- **F-83 through F-94**: Json module — add comprehensive tests for parsing, stringification, and type extraction

---

## Testing Redundancies (this section)

_None_. (No duplicate assertions detected across test layers.)

