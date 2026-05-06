# Audit: Mutable References (docs/spec/07-mutable-references.md)

## Sources Reviewed

**Spec files** (with line counts):
- `docs/spec/07-mutable-references.md` (400 lines)

**Implementation files**:
- `packages/core/src/parser/parse-declarations/let.ts` (234 lines)
- `packages/core/src/parser/parse-expression-operators.ts` (493 lines)
- `packages/core/src/typechecker/infer/let-binding-helpers.ts` (192 lines)
- `packages/core/src/typechecker/infer/infer-bindings.ts` (200+ lines)
- `packages/core/src/typechecker/infer/infer-operators.ts` (500+ lines)
- `packages/core/src/typechecker/builtins.ts` (170 lines)
- `packages/core/src/codegen/es2020/emit-expressions/operators.ts` (192 lines)
- `packages/core/src/codegen/es2020/runtime-helpers.ts` (110+ lines)
- `packages/core/src/desugarer/` — no dedicated ref ops desugaring

**Test files** (every layer):
- Unit: 
  - `packages/core/src/parser/declarations.test.ts`
  - `packages/core/src/parser/expression-operators.test.ts`
  - `packages/core/src/parser/expression-control-flow.test.ts`
  - `packages/core/src/parser/expression-unary-postfix.test.ts`
  - `packages/core/src/typechecker/infer-operators.test.ts`
  - `packages/core/src/typechecker/infer-bindings-basic.test.ts`
  - `packages/core/src/typechecker/infer-bindings-errors-and-edges.test.ts`
  - `packages/core/src/typechecker/infer/let-binding-helpers.test.ts`
  - `packages/core/src/typechecker/builtins.test.ts`
  - `packages/core/src/codegen/es2020/emit-expressions/operators.test.ts`
- Integration: (none identified)
- Snapshot: (none identified)
- E2E: 
  - `tests/e2e/spec-validation/07-mutable-references.test.ts`
  - `tests/e2e/let-binding-matrix.test.ts`
  - `tests/e2e/prefix-bang.test.ts`
- Spec-validation: `tests/e2e/spec-validation/07-mutable-references.test.ts`
- Property: `packages/core/src/codegen/es2020/execution-tests/mutable-refs.test.ts` + `prefix-bang.test.ts` (property tests via fast-check)

## Feature Inventory

### F-01: `Ref<T>` type as parameterized wrapper

- **Spec ref**: `docs/spec/07-mutable-references.md:12-24` — Ref is a mutable cell containing type `T`, written as `Ref<T>`.
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/typechecker/builtins.ts:129-133` — `ref` builtin is typed as `forall a. (a) -> Ref<a>`, creating `Ref<a>` result type
  - `packages/core/src/typechecker/infer/infer-context.ts:144-146` — `Ref` handled as type constructor
  - `packages/core/src/codegen/es2020/runtime-helpers.ts:19-20` — runtime `ref` helper creates `{ $value: v }` cell
- **Tests**:
  - Unit: `packages/core/src/typechecker/builtins.test.ts:305-313` — `ref` polymorphic type test
  - Unit: `packages/core/src/typechecker/infer-bindings-basic.test.ts:362+` — ref type inference in bindings
  - E2E: `tests/e2e/spec-validation/07-mutable-references.test.ts:14-29` — creates refs with mut keyword
  - Execution: `packages/core/src/codegen/es2020/execution-tests/mutable-refs.test.ts:15-22` — ref/deref round-trip
- **Coverage assessment**: ✅ Adequate — type structure, inference, and runtime representation all covered
- **Notes**: Type is correctly implemented as a type constructor; builtins define polymorphic `ref : forall a. a -> Ref<a>`.

### F-02: `ref(value)` constructor syntax and parser acceptance

- **Spec ref**: `docs/spec/07-mutable-references.md:26-35` — `ref` keyword to create refs; must be used with `let mut`.
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-declarations/let.ts:33-58` — `validateMutableBinding` parses `ref(...)` call detection and enforces `mut` keyword requirement
  - `packages/core/src/parser/parse-declarations/let.ts:34` — checks `value.kind === "App" && value.func.kind === "Var" && value.func.name === "ref"`
  - `packages/core/src/parser/parse-expression-operators.ts:90-111` — `:=` operator parsing (right-associative)
  - Parser admits `ref(...)` as any function call; semantic validation happens in typechecker
- **Tests**:
  - Unit: `packages/core/src/parser/declarations.test.ts:207-242` — "should accept mut bindings with ref() call", "with complex expressions", "with nested values"
  - Unit: `packages/core/src/parser/declarations.test.ts:278-293` — "should reject ref() bindings missing the mut keyword" (VF2008)
  - E2E: `tests/e2e/spec-validation/07-mutable-references.test.ts:14-29` — creates refs with mut keyword
- **Coverage assessment**: ✅ Adequate — parser syntax and mut enforcement fully covered
- **Notes**: Parser does not force RHS to be a `ref(...)` call; it admits `let mut b = a` where `a: Ref<T>` (aliasing). Typechecker enforces the Ref type constraint.

### F-03: `let mut` binding form with single variable pattern (no destructuring)

- **Spec ref**: `docs/spec/07-mutable-references.md:36-84` — `let mut x = ref(...)` with `mut` keyword required; mutable bindings cannot destructure; scope of mutation.
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-declarations/let.ts:49-52` — enforces pattern is `VarPattern` for `let mut`; rejects destructuring patterns
  - `packages/core/src/parser/declarations.test.ts:260-276` — parser rejects tuple, record, list destructuring in mutable bindings
  - `packages/core/src/typechecker/infer/let-binding-helpers.ts:157` — `skipGeneralize = binding.mutable || binding.pattern.kind !== "CoreVarPattern"`
- **Tests**:
  - Unit: `packages/core/src/parser/declarations.test.ts:260-276` — rejects record/list/tuple destructuring in mutable (VF2004)
  - E2E: `tests/e2e/spec-validation/07-mutable-references.test.ts` — only simple variable bindings tested
- **Coverage assessment**: ✅ Adequate — parser enforces single-variable restriction; typechecker ensures monomorphism
- **Notes**: Parser rejects destructuring at declaration site; typechecker ensures mutable bindings are not generalized.

### F-04: `:=` reference assignment operator (binary infix)

- **Spec ref**: `docs/spec/07-mutable-references.md:99-107` — `:=` operator updates ref; type is `(Ref<T>, T) -> Unit`; right-associative.
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-expression-operators.ts:93-112` — `parseRefAssign` precedence level 1, right-associative, checks `OP_ASSIGN` token
  - `packages/core/src/parser/parse-expression-operators.ts:100-108` — creates `BinOp` with op `"RefAssign"`
  - `packages/core/src/typechecker/infer/infer-operators.ts:50-71` — special handling: unifies left with `Ref<T>`, right with `T`, returns `Unit`
  - `packages/core/src/codegen/es2020/emit-expressions/operators.ts:127-132` — emits `(left.$value = right, undefined)`
- **Tests**:
  - Unit: `packages/core/src/parser/declarations.test.ts:1018+` — "parses a ref-assignment as a top-level expression"
  - Unit: `packages/core/src/parser/expression-operators.test.ts` — operator precedence tests
  - Unit: `packages/core/src/typechecker/infer-operators.test.ts` — RefAssign type inference
  - E2E: `tests/e2e/spec-validation/07-mutable-references.test.ts:42-82` — "update ref with :=", "multiple updates", "computed value"
  - Execution: `packages/core/src/codegen/es2020/execution-tests/mutable-refs.test.ts:54-67` — assignment side effects
- **Coverage assessment**: ✅ Adequate — parsing, typing, and codegen all covered; edge cases of evaluation order tested
- **Notes**: Right-associativity enables chained assignments like `x := y := z`. Returns `Unit` as per spec.

### F-05: `!` prefix operator for dereference (type-based disambiguation from logical NOT)

- **Spec ref**: `docs/spec/07-mutable-references.md:86-127` — `!` dereferences `Ref<T>` to `T`; serves dual purpose with logical NOT on Bool; resolved by type
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-expression-operators.ts:450-493` — `parseUnary` parses `OP_BANG` token, creates `UnaryOp` with op `"LogicalNot"`
  - `packages/core/src/typechecker/infer/infer-operators.ts:338-376` — `inferUnaryOp` special handling: expands type aliases, checks if operand is `Ref<T>`, rewrites `LogicalNot` → `Deref` (line 353)
  - `packages/core/src/codegen/es2020/emit-expressions/operators.ts:178-182` — `Deref` emits as `innerCode.$value`
- **Tests**:
  - Unit: `packages/core/src/parser/expression-unary-postfix.test.ts` — unary operator parsing
  - Unit: `packages/core/src/typechecker/infer-operators.test.ts:522+` — "rewrites LogicalNot to Deref when the operand resolves to Ref<T>"
  - E2E: `tests/e2e/spec-validation/07-mutable-references.test.ts:31-92` — dereference tests, dual-purpose `!` on Bool and Ref
  - Property: `packages/core/src/codegen/es2020/execution-tests/prefix-bang.test.ts:78-91` — property: `!(ref x) === x` for any int
  - Property: `packages/core/src/codegen/es2020/execution-tests/prefix-bang.test.ts:52-62` — dereference through type alias wrapping Ref
- **Coverage assessment**: ✅ Adequate — disambiguation logic, type alias expansion, and property tests all present
- **Notes**: Typechecker rewrites `LogicalNot` → `Deref` after type resolution; aliases like `type Cell<T> = Ref<T>` are expanded before disambiguation.

### F-06: Ref equality and aliasing (identity, not value equality)

- **Spec ref**: `docs/spec/07-mutable-references.md:265-290` — refs use reference equality (identity), not value equality; `ref(v)` always creates a new ref; mutations visible through aliases.
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/codegen/es2020/runtime-helpers.ts:38-58` — `$eq` helper line 42: `if ("$value" in a && "$value" in b) return a === b;` (identity equality for refs)
  - `packages/core/src/codegen/es2020/emit-expressions/operators.ts:135-155` — Equal/NotEqual use `$eq` for composite types; refs handled by identity check
  - Runtime: refs are plain JS objects `{ $value: ... }`; `===` compares identity
- **Tests**:
  - E2E: `tests/e2e/spec-validation/07-mutable-references.test.ts:96-128` — "two refs to same value are not equal", "aliased refs are equal", "mutations visible through aliases"
  - Unit: `packages/core/src/codegen/es2020/runtime-helpers.ts` (builtin) tested implicitly through $eq tests
- **Coverage assessment**: ✅ Adequate — identity equality and aliasing behavior verified end-to-end
- **Notes**: Equality semantics implemented in runtime `$eq` helper. Each `ref(...)` call creates a new object.

### F-07: Mutable bindings cannot be polymorphic (value restriction)

- **Spec ref**: `docs/spec/07-mutable-references.md:361-385` — mutable bindings cannot hold polymorphic functions/values; monomorphic t is fixed once instantiated; refs prevent polymorphic binding.
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/typechecker/infer/let-binding-helpers.ts:148-163` — `computeBindingScheme` skips generalization when `binding.mutable` (line 157)
  - `packages/core/src/typechecker/infer/infer-bindings.ts:104-110` — inference path uses `computeBindingScheme` for mutable bindings
  - `packages/core/src/typechecker/typechecker.ts` (top-level) — similar mutable binding handling in `CoreLetDecl` and `CoreLetRecGroup` branches
- **Tests**:
  - Unit: `packages/core/src/typechecker/infer-bindings-errors-and-edges.test.ts` — mutable binding monomorphism tests
  - E2E: `tests/e2e/spec-validation/07-mutable-references.test.ts:192-199` — "polymorphic ref forbidden by value restriction"
  - E2E: `tests/e2e/let-binding-matrix.test.ts` — comprehensive matrix testing all binding paths for monomorphism
- **Coverage assessment**: ✅ Adequate — monomorphism enforced; value restriction interaction with polymorphic refs tested
- **Notes**: Mutable bindings and destructuring patterns both skip generalization to avoid soundness holes.

### F-08: Mandatory `let mut` keyword when binding a Ref (enforced at parser)

- **Spec ref**: `docs/spec/07-mutable-references.md:38-50` — `let x = ref(...)` without `mut` is a **compile-time error** (VF2008); syntax requires visible mutation marker.
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-declarations/let.ts:36-46` — `validateMutableBinding` checks if immutable binding to `ref(...)` call; throws VF2008 at value location
  - `packages/core/src/parser/parse-declarations/let.ts:64-88` — helper functions build error hint from ref argument
- **Tests**:
  - Unit: `packages/core/src/parser/declarations.test.ts:278-293` — "should reject ref() bindings missing the mut keyword" with VF2008
  - Unit: `packages/core/src/parser/declarations.test.ts:286-293` — tests hint variants for int/float/string/bool literals
  - E2E: `tests/e2e/spec-validation/07-mutable-references.test.ts:18-20` — "ref without mut is error"
- **Coverage assessment**: ✅ Adequate — error code, hint generation, and multiple value types covered
- **Notes**: Parser detects `ref(...)` call syntactically; semantic check for any Ref-typed RHS happens in typechecker (VF4018).

### F-09: Typechecker enforcement: `let mut` RHS must be `Ref<T>` type (VF4018)

- **Spec ref**: `docs/spec/07-mutable-references.md:254-261` — type checking rule: creating refs produces `Ref<T>`, assignment requires both operands to have correct Ref/element type.
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/typechecker/infer/let-binding-helpers.ts:100-134` — `enforceMutableRefBinding` unifies RHS against `Ref<fresh>` and throws VF4018 on failure
  - `packages/core/src/typechecker/infer/infer-bindings.ts:83-93` — calls helper for every mutable binding in `inferLet`
  - `packages/core/src/typechecker/typechecker.ts` — top-level paths also call `enforceMutableRefBinding`
- **Tests**:
  - Unit: `packages/core/src/typechecker/infer-bindings-errors-and-edges.test.ts:28-40` — "rejects non-Ref types in mutable bindings"
  - E2E: `tests/e2e/let-binding-matrix.test.ts` — "mutable-non-ref-rejected" scenario tests all binding paths
- **Coverage assessment**: ✅ Adequate — unification logic and error propagation tested
- **Notes**: Allows ref aliasing: `let mut b = a` where `a: Ref<T>` is accepted; only `let mut x = 5` is rejected.

### F-10: Ref can hold any type T, including composite types and variants

- **Spec ref**: `docs/spec/07-mutable-references.md:180-332` — refs hold records, lists, variants; can be stored in data structures; show examples with nested types.
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/typechecker/builtins.ts:132` — `ref` is universally quantified `forall a. a -> Ref<a>`; no restrictions on `a`
  - Typechecker's `Ref<T>` is fully polymorphic in `T`; no special-casing for composite types
- **Tests**:
  - E2E: `tests/e2e/spec-validation/07-mutable-references.test.ts:22-28` — refs to different value types (Int, String, Bool)
  - E2E: `tests/e2e/spec-validation/07-mutable-references.test.ts:148-167` — "refs in data structures" (record field, list element)
  - E2E: `tests/e2e/let-binding-matrix.test.ts` — matrix tests include ref-to-variants
- **Coverage assessment**: ⚠️ Thin — basic types covered; complex composite types and variants less thoroughly tested in unit tests
- **Notes**: No parsing/typing restrictions on what can be stored in a Ref. Codegen treats all refs identically via `{ $value: ... }`.

### F-11: Pattern matching on refs forbidden without explicit dereference

- **Spec ref**: `docs/spec/07-mutable-references.md:334-359` — cannot pattern match directly on `Ref<...>` contents; must dereference first with `!`
- **Status**: ⚠️ Partial
- **Implementation**:
  - Parser: permits `match expr { ... }` without type checking; desugarer lowers to Core match
  - Typechecker: `match !opt { ... }` typechecks as dereference + pattern match on the dereferenced value
  - No explicit error thrown for `match ref { | Some(x) => ... }`; instead, match fails to typecheck because Ref<Option<T>> does not unify with Option<T>
- **Tests**:
  - E2E: not directly tested in spec-validation suite; pattern matching and refs tested separately
- **Coverage assessment**: ❌ Untested — no test explicitly validates the error message for attempting direct pattern match on a Ref
- **Notes**: The restriction is enforced through type unification (pattern expects dereferenced type, but ref is still wrapped), not an explicit error code. Spec says "cannot match", but implementation silently rejects via type mismatch.

### F-12: Refs in closures and stateful functions (closure capture)

- **Spec ref**: `docs/spec/07-mutable-references.md:215-237` — refs can be captured by closures; makeCounter pattern shows state persistence across calls; each function instance has independent state.
- **Status**: ✅ Implemented
- **Implementation**:
  - Parser/desugarer: closures capture refs as free variables; no special handling needed
  - Typechecker: refs in closure scopes typed normally
  - Codegen: closures close over ref variables; mutations through closure affect the original ref
- **Tests**:
  - E2E: `tests/e2e/spec-validation/07-mutable-references.test.ts:171-189` — "closure captures ref (makeCounter pattern)" with independent counters
  - E2E: `tests/e2e/let-binding-matrix.test.ts` — closures with ref bindings tested in matrix
- **Coverage assessment**: ✅ Adequate — makeCounter pattern and closure semantics verified end-to-end
- **Notes**: Closure capture of refs relies on standard free-variable capture mechanism; no special semantics needed.

### F-13: Evaluation order: ref assignment returns Unit and executes for side effects

- **Spec ref**: `docs/spec/07-mutable-references.md:99-107` — `:=` updates ref and returns `()` (Unit); assignment is a side effect (not a pure value expression).
- **Status**: ✅ Implemented
- **Implementation**:
  - Parser: `:=` creates `BinOp` with op `RefAssign`
  - Typechecker: `inferBinOp` for `RefAssign` returns `Unit` type (line 71 of infer-operators.ts)
  - Codegen: `(left.$value = right, undefined)` — JavaScript sequence operator ensures side effect then returns undefined (Unit)
- **Tests**:
  - Unit: `packages/core/src/typechecker/infer-operators.test.ts` — RefAssign type inference returns Unit
  - E2E: `tests/e2e/spec-validation/07-mutable-references.test.ts:53-58` — "assignment returns Unit" with type annotation
  - Execution: `packages/core/src/codegen/es2020/execution-tests/mutable-refs.test.ts:54-67` — block statement evaluation order; side effects execute before final expression
- **Coverage assessment**: ✅ Adequate — Unit return type, side effect semantics, and evaluation order all tested
- **Notes**: Implemented correctly as JavaScript sequence expression. Assignment side effect executes as part of block evaluation.

### F-14: Reassignment of mutable binding (binding variable can be reassigned to new Ref)

- **Spec ref**: `docs/spec/07-mutable-references.md:54-82` — `let mut x = ref(0)` binding can be reassigned to a new ref (`x = ref(10)`), though rare in practice; contrasts with immutable bindings.
- **Status**: ✅ Implemented
- **Implementation**:
  - Parser: `let mut x = ...` creates mutable binding (tracked in AST)
  - Typechecker: mutable bindings allow reassignment (no restriction enforced)
  - Codegen: `let x = ...` or `var x = ...` depending on scope; reassignment via `x = ref(10)` is standard assignment
- **Tests**:
  - No explicit test for reassignment of mutable binding variable itself (only `:=` mutation of ref contents is tested)
- **Coverage assessment**: ⚠️ Thin — binding reassignment allowed by implementation but not explicitly tested
- **Notes**: Spec distinguishes "binding reassignment" (change what variable refers to) from "ref mutation" (change contents of ref). Reassignment is less common, hence thin coverage.

### F-15: Runtime representation: refs as objects with `$value` property

- **Spec ref**: `docs/spec/07-mutable-references.md` (implicit in design) — refs emit as single-wrapped mutable cells; no double-wrapping in codegen
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/codegen/es2020/runtime-helpers.ts:19-20` — `ref` helper: `const ref = ($value) => ({ $value });`
  - `packages/core/src/codegen/es2020/emit-expressions/operators.ts:178-182` — `Deref` emits `innerCode.$value`
  - `packages/core/src/codegen/es2020/emit-expressions/operators.ts:127-132` — `RefAssign` emits `left.$value = right`
- **Tests**:
  - Execution: `packages/core/src/codegen/es2020/execution-tests/mutable-refs.test.ts:24-39` — "does not double-wrap" by checking JS output
  - Execution: `packages/core/src/codegen/es2020/execution-tests/mutable-refs.test.ts:41-52` — nested let mut in lambda does not double-wrap
- **Coverage assessment**: ✅ Adequate — runtime representation and non-double-wrapping verified
- **Notes**: Correct implementation prevents double-wrapping `{ $value: { $value: v } }` through proper codegen.

### F-16: ref() creates a builtin function (not a keyword, but a polymorphic value)

- **Spec ref**: `docs/spec/07-mutable-references.md:26-35` — refers to `ref` as creating references via function call syntax
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/typechecker/builtins.ts:129-133` — `ref` is a builtin value in the environment, polymorphic type `forall a. a -> Ref<a>`
  - Parser treats `ref` as any other identifier; function application via `()`
  - Not a keyword; referred to in spec as `ref(...)` call
- **Tests**:
  - Unit: `packages/core/src/typechecker/builtins.test.ts:106` — `env.has("ref")` returns true
  - Unit: `packages/core/src/typechecker/builtins.test.ts:305-313` — ref polymorphic type test
- **Coverage assessment**: ✅ Adequate — builtin definition and type verified
- **Notes**: Correctly implemented as a polymorphic builtin value, not a special form.

---

## Feature Gaps (this section)

- **F-11**: Pattern matching error detection is implicit via type unification rather than explicit. No specific error code for `match Ref<T> { | Some(x) => ... }`. Spec says "cannot pattern match directly on Ref", but users see a generic type mismatch error.
- **F-14**: Binding reassignment (changing what `let mut x` points to) is allowed but not explicitly tested. Only ref mutation (`:=`) is exercised.

## Testing Gaps (this section)

- **F-10**: Composite types and variants in refs (records with ref fields, refs containing variants) have minimal unit/integration test coverage. Only basic E2E tests and matrix tests cover these.
- **F-11**: Direct pattern matching on refs should fail with a clear error; no test validates the error message or error code.
- **F-14**: Binding reassignment of mutable bindings (e.g., `x = ref(100)`) is not explicitly tested in any layer.

## Testing Redundancies (this section)

- **Candidate**: `packages/core/src/codegen/es2020/execution-tests/prefix-bang.test.ts:78-91` and `packages/core/src/codegen/es2020/execution-tests/mutable-refs.test.ts:77-89` both test the property `!(ref x) === x`. The same property is asserted in both files with identical arbitrary (safe integers in [-1000, 1000]). Recommendation: keep both — one lives in `prefix-bang.test.ts` (home for `!` disambiguation tests) and one in `mutable-refs.test.ts` (home for ref semantics); the intentional duplication is documented in comments and justified by navigability.

- **Candidate**: `tests/e2e/spec-validation/07-mutable-references.test.ts:31-38` ("dereference with !" and "dereference string ref") overlap with `packages/core/src/codegen/es2020/execution-tests/prefix-bang.test.ts:15-40` (ref/bool deref tests). However, spec-validation tests focus on language specification coverage via the CLI, while execution tests focus on runtime semantics. Not redundant — different layers catching different regression types.

- **Candidate**: `packages/core/src/parser/declarations.test.ts:207-242` (mut + ref syntax acceptance) and `tests/e2e/spec-validation/07-mutable-references.test.ts:14-29` (create ref with mut keyword). First is unit, second is E2E. Not redundant — unit tests rapid parser iteration, E2E tests full pipeline.

_None sufficiently redundant to consolidate._

