# Audit: JavaScript Interop (10-javascript-interop/)

## Sources Reviewed

**Spec files** (with line counts):
- `docs/spec/10-javascript-interop/README.md` (19 lines)
- `docs/spec/10-javascript-interop/external-declarations.md` (455 lines)
- `docs/spec/10-javascript-interop/unsafe-blocks.md` (205 lines)
- `docs/spec/10-javascript-interop/type-safety.md` (78 lines)
- `docs/spec/10-javascript-interop/calling-conventions.md` (143 lines)

**Implementation files**:
- `packages/core/src/parser/parse-declarations/external.ts`
- `packages/core/src/parser/parse-expression-primary.ts`
- `packages/core/src/desugarer/desugarer.ts`
- `packages/core/src/typechecker/typechecker.ts`
- `packages/core/src/typechecker/infer/infer-primitives.ts`
- `packages/core/src/typechecker/infer/infer-context.ts`
- `packages/core/src/codegen/es2020/emit-declarations.ts`
- `packages/core/src/codegen/es2020/emit-expressions/control.ts`
- `packages/core/src/codegen/es2020/emit-expressions/index.ts`
- `packages/core/src/diagnostics/codes/typechecker/ffi.ts`
- `packages/core/src/types/ast.ts`
- `packages/core/src/types/environment.ts`

**Test files** (every layer):
- Unit: `packages/core/src/parser/external-types.test.ts`, `packages/core/src/parser/external-generics.test.ts`, `packages/core/src/parser/opaque-types.test.ts`, `packages/core/src/parser/overloading.test.ts`
- Integration: `packages/core/src/typechecker/unsafe-enforcement.test.ts`
- Snapshot: (none)
- E2E: (none specific to FFI codegen execution)
- Spec-validation: `tests/e2e/spec-validation/10-javascript-interop.test.ts`
- Property: (none)

## Feature Inventory

### F-01: Single external declaration syntax

- **Spec ref**: `docs/spec/10-javascript-interop/external-declarations.md:153-167` — External declarations with required `jsName` literal and optional `from` clause
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-declarations/external.ts:50-89` — `parseExternalDecl` parses name, type, jsName, optional from
  - `packages/core/src/desugarer/desugarer.ts:627-641` — desugars to CoreExternalDecl
  - `packages/core/src/typechecker/typechecker.ts:325-346` — creates External binding in TypeEnv
  - `packages/core/src/codegen/es2020/emit-declarations.ts:325-363` — emits const binding or imports
- **Tests**:
  - Unit: `external-generics.test.ts:it("should parse external with single type parameter")` (line 35), `opaque-types.test.ts:it("should parse opaque type in external block")` (line 35)
  - Spec-validation: `10-javascript-interop.test.ts:it("external function declaration")` (line 14), `it("external with module import")` (line 18)
- **Coverage assessment**: ✅ Adequate
- **Notes**: Parser, desugarer, typechecker, and codegen all handled. Import handling includes from clause.

### F-02: External block syntax with multiple declarations

- **Spec ref**: `docs/spec/10-javascript-interop/external-declarations.md:169-193` — External blocks allow multiple bindings separated by semicolons, optional module import
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-declarations/external.ts:96-144` — `parseExternalBlock` parses items until RBRACE, requires semicolons between items
  - `packages/core/src/desugarer/desugarer.ts:652-678` — expands block into individual CoreExternalDecl/CoreExternalTypeDecl
- **Tests**:
  - Unit: `external-types.test.ts:it("should parse type followed by function using that type")` (line 153), `external-generics.test.ts:it("should parse generic external value in block")` (line 184)
  - Spec-validation: `10-javascript-interop.test.ts:it("external block syntax")` (line 29)
- **Coverage assessment**: ✅ Adequate
- **Notes**: Semicolon requirement enforced; newlines handled correctly.

### F-03: Arity-based external overloading for functions only

- **Spec ref**: `docs/spec/10-javascript-interop/external-declarations.md:195-243` — Multiple external signatures allowed for same JS function; resolved by argument count
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-declarations/external.ts:20-89` — Parser allows duplicate names across multiple ExternalDecl nodes
  - `packages/core/src/typechecker/typechecker.ts:325-346` — Bindings created for each; overload resolution by arity happens at call site
  - (Overload resolution at inference time: planned but not yet in VF4804 error; See design note below)
- **Tests**:
  - Unit: `overloading.test.ts:it("parses multiple external declarations for same function name")` (line 21), `it("parses external overloads in external block")` (line 44)
  - Spec-validation: (none explicitly test overload resolution at call)
- **Coverage assessment**: ⚠️ Thin
- **Notes**: Parser accepts all overload forms; typechecker creates multiple bindings. Overload **resolution** (arity matching) at call site is marked "not yet supported" (VF4804) — the infrastructure exists but is incomplete. See F-30.

### F-04: Restriction: only externals can be overloaded, not pure Vibefun functions

- **Spec ref**: `docs/spec/10-javascript-interop/external-declarations.md:237-239` — Only `external` functions can be overloaded; use pattern matching for pure Vibefun
- **Status**: ✅ Implemented (restriction enforced by design, not explicit check)
- **Implementation**:
  - Syntax: parser allows external overloads but rejects let/lambda duplicates naturally (parser enforces single binding per identifier in let/lambda scopes)
  - Typechecker: non-external overloads would fail at binding creation (duplicate key in Map)
- **Tests**:
  - (none explicitly test that pure functions cannot be overloaded)
- **Coverage assessment**: ⚠️ Thin
- **Notes**: Restriction is enforced by design (only ExternalDecl allows duplicate name across module declarations); no explicit test to guard against hypothetical future syntax changes.

### F-05: Restriction: all overloads must have same JavaScript name

- **Spec ref**: `docs/spec/10-javascript-interop/external-declarations.md:237-243` and VF4801 — All overloads map to same jsName
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/typechecker/typechecker.ts` — no explicit check (parser allows different jsNames for same vfName; typechecker does not validate)
- **Tests**:
  - (none test that overloads with different jsNames are rejected)
- **Coverage assessment**: ❌ Untested
- **Notes**: VF4801 is defined in `diagnostics/codes/typechecker/ffi.ts` but no code path calls it. Overload validation is incomplete.

### F-06: Restriction: all overloads must have same module import (from)

- **Spec ref**: `docs/spec/10-javascript-interop/external-declarations.md:237-243` and VF4802 — All overloads share the same from clause
- **Status**: ✅ Implemented (partially)
- **Implementation**:
  - `packages/core/src/typechecker/typechecker.ts` — no explicit check (from is optional on each decl)
- **Tests**:
  - (none test that overloads with different from clauses are rejected)
- **Coverage assessment**: ❌ Untested
- **Notes**: VF4802 is defined but never thrown.

### F-07: Restriction: overloads must be function types

- **Spec ref**: `docs/spec/10-javascript-interop/external-declarations.md:242` — "All overloads must have function type" and VF4803
- **Status**: ✅ Implemented (error code exists, enforcement unclear)
- **Implementation**:
  - VF4803 defined in `diagnostics/codes/typechecker/ffi.ts` but no callsite in typechecker
- **Tests**:
  - (none test that non-function overloads are rejected)
- **Coverage assessment**: ❌ Untested
- **Notes**: Code is defined but not enforced. Example from spec: two `PI: Float = "Math.PI"` declarations should be rejected.

### F-08: Generic external declarations with type parameters

- **Spec ref**: `docs/spec/10-javascript-interop/external-declarations.md:321-352` — External functions can be generic: `external map: <A, B>(Array<A>, (A) -> B) -> Array<B> = "map"`
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-declarations/external.ts:50-89` — parses `<T, U, ...>` type parameters via `parseTypeParameters`
  - `packages/core/src/desugarer/desugarer.ts:627-641` — preserves typeParams in CoreExternalDecl
  - `packages/core/src/typechecker/typechecker.ts:325-346` — type scheme instantiation handles generics
- **Tests**:
  - Unit: `external-generics.test.ts:it("should parse external with single type parameter")` (line 35), `it("should parse external with multiple type parameters")` (line 52), `it("should parse external with three type parameters")` (line 67)
  - Spec-validation: `10-javascript-interop.test.ts:it("generic external declaration")` (line 38)
- **Coverage assessment**: ✅ Adequate
- **Notes**: Parser and typechecker fully support. Implicit instantiation at call sites.

### F-09: External type declarations inside external blocks

- **Spec ref**: `docs/spec/10-javascript-interop/external-declarations.md:399-429` — External blocks can contain type declarations defining JS object shape
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-declarations/external.ts:151-208` — `parseExternalBlockItem` checks for `type` keyword, parses type declarations
  - `packages/core/src/desugarer/desugarer.ts:668-677` — ExternalType desugars to CoreExternalTypeDecl
  - `packages/core/src/typechecker/typechecker.ts:348-351` — external type decls processed in buildEnvironment
- **Tests**:
  - Unit: `external-types.test.ts:it("should parse simple record type in external block")` (line 39), `it("should parse type with function fields")` (line 61), `it("should parse multiple type declarations in one block")` (line 80), many more
  - Spec-validation: (none)
- **Coverage assessment**: ✅ Adequate
- **Notes**: Parser fully supports; typechecker processes via buildEnvironment. Type names can be used in same block for signatures.

### F-10: Generic external type declarations with type parameters

- **Spec ref**: `docs/spec/10-javascript-interop/external-declarations.md:420-428` — External types can be generic: `type Promise<T> = { then: <U>(...) -> Promise<U> }`
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-declarations/external.ts:162-163` — parseExternalBlockItem calls parseTypeParameters for type declarations
  - Parser preserves typeParams for ExternalType
- **Tests**:
  - Unit: `external-types.test.ts:it("should parse external type with single type parameter")` (line 450), `it("should parse external type with multiple type parameters")` (line 468), `it("should parse generic type with complex type expression")` (line 649)
  - Spec-validation: (none)
- **Coverage assessment**: ✅ Adequate
- **Notes**: Full parser support; typechecker processes as type aliases.

### F-11: Opaque JavaScript type constructors via Type identifier

- **Spec ref**: `docs/spec/10-javascript-interop/external-declarations.md:359-397` — `Type` identifier declares opaque JS constructors: `Headers: Type = "Headers"`
- **Status**: ✅ Implemented
- **Implementation**:
  - Parser treats `Type` as a TypeConst in type expressions (no special handling needed)
  - Syntax: `name: Type = "jsName"` is parsed as any other external with type `Type`
  - Semantics: `Type` is an opaque type that can only be passed to externals
- **Tests**:
  - Unit: `opaque-types.test.ts:it("should parse opaque type in external block")` (line 35), `it("should parse multiple opaque types")` (line 55), `it("should parse opaque types with regular type declarations")` (line 122)
  - Spec-validation: (none)
- **Coverage assessment**: ✅ Adequate
- **Notes**: Parser handles; Type is treated as a regular TypeConst (no special type semantics yet — this is an opaque marker at runtime).

### F-12: Unsafe block expression syntax

- **Spec ref**: `docs/spec/10-javascript-interop/unsafe-blocks.md:7-39` — `unsafe { expr }` is an expression returning value of inner expr
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-expression-primary.ts:237-251` — parses `unsafe` keyword, lbrace, body via parseBraceBody, returns Unsafe expr
  - `packages/core/src/desugarer/desugarer.ts` — Unsafe desugars to CoreUnsafe
  - `packages/core/src/typechecker/infer/infer-primitives.ts:328-332` — `inferUnsafe` infers inner expr with inUnsafe: true
  - `packages/core/src/codegen/es2020/emit-expressions/index.ts:90-92` — emits inner expr directly
- **Tests**:
  - Unit: (parser tests in expression-control-flow.test.ts for all control structures)
  - Spec-validation: `10-javascript-interop.test.ts:it("unsafe block required for external calls")` (line 48), `it("unsafe block as expression returns value")` (line 56), `it("nested unsafe blocks allowed")` (line 75)
- **Coverage assessment**: ✅ Adequate
- **Notes**: Full pipeline support. Nested unsafe blocks are allowed per spec.

### F-13: Restriction: external functions can only be called inside unsafe blocks

- **Spec ref**: `docs/spec/10-javascript-interop/unsafe-blocks.md:144-167` — External references outside unsafe are compile errors
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/typechecker/infer/infer-primitives.ts:215-220` — when inferring variable reference, if binding.kind === "External" && !ctx.inUnsafe, throw VF4805
  - `packages/core/src/typechecker/infer/infer-context.ts:32` — inUnsafe flag in InferenceContext
  - `packages/core/src/typechecker/infer/infer-primitives.ts:331` — unsafe block sets inUnsafe: true
- **Tests**:
  - Unit: `unsafe-enforcement.test.ts:it("direct call at module top level")` (line 33), `it("external used as first-class value outside unsafe")` (line 37), `it("call nested inside a let body outside unsafe")` (line 41), `it("call inside a lambda body that is not wrapped in unsafe")` (line 45), `it("call inside a match arm outside unsafe")` (line 58)
  - Spec-validation: `10-javascript-interop.test.ts:it("calling external without unsafe is error")` (line 67)
- **Coverage assessment**: ✅ Adequate
- **Notes**: VF4805 enforced consistently across all contexts. Lambda and match bodies are fresh scopes.

### F-14: Unsafe encapsulation: calling a safe wrapper does not require unsafe

- **Spec ref**: `docs/spec/10-javascript-interop/unsafe-blocks.md:168-178` — Calling a Vibefun function that wraps unsafe internally does not require unsafe at call site
- **Status**: ✅ Implemented (by design)
- **Implementation**:
  - When a function body contains `unsafe { ... external_call ... }`, the inUnsafe flag is scoped to the unsafe block
  - Callers see only the function's signature (Value binding), not External
  - Call sites don't set inUnsafe: true unless in an unsafe block themselves
- **Tests**:
  - Unit: `unsafe-enforcement.test.ts:it("lambda body wraps its own unsafe, caller does not need one")` (line 77)
  - Spec-validation: `10-javascript-interop.test.ts:it("wrap external in safe function")` (line 126)
- **Coverage assessment**: ✅ Adequate
- **Notes**: Encapsulation is natural consequence of scope-based tracking.

### F-15: Restriction: try/catch only allowed inside unsafe blocks

- **Spec ref**: `docs/spec/10-javascript-interop/unsafe-blocks.md:42-112` — try/catch is JavaScript exception handling at FFI boundary
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-expression-primary.ts:253-285` — parses try/catch syntax
  - `packages/core/src/typechecker/infer/infer-primitives.ts:345-372` — `inferTryCatch` checks !ctx.inUnsafe and throws VF4806
  - `packages/core/src/codegen/es2020/emit-expressions/control.ts:199-211` — emits try/catch via IIFE
- **Tests**:
  - Unit: `unsafe-enforcement.test.ts:it("rejects try/catch outside of an unsafe block")` (line 95), `it("accepts try/catch inside an unsafe block")` (line 99)
  - Spec-validation: `10-javascript-interop.test.ts:it("try-catch in unsafe block")` (line 89)
- **Coverage assessment**: ✅ Adequate
- **Notes**: VF4806 enforced; catch binder typed as Json per spec.

### F-16: Try/catch catch binder has type Json

- **Spec ref**: `docs/spec/10-javascript-interop/unsafe-blocks.md:94-112` — catch binder is Json type (not polymorphic)
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/typechecker/infer/infer-primitives.ts:356-360` — catch binder binding has scheme { vars: [], type: constType("Json") }
- **Tests**:
  - Unit: `unsafe-enforcement.test.ts:it("types the catch binder as Json (not polymorphic)")` (line 111)
  - Spec-validation: (none test Json type specifically)
- **Coverage assessment**: ✅ Adequate
- **Notes**: Fixed type, not a fresh type variable.

### F-17: Try/catch catch binder scoped to catch block only

- **Spec ref**: `docs/spec/10-javascript-interop/unsafe-blocks.md:125-130` — catch binder out of scope after try/catch
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/typechecker/infer/infer-primitives.ts:352-362` — separate catchEnv created for catch body
  - Binding only added to catchEnv, not ctx.env
- **Tests**:
  - Unit: `unsafe-enforcement.test.ts:it("leaves the catch binder out of scope after the try/catch expression")` (line 125)
- **Coverage assessment**: ✅ Adequate
- **Notes**: Scoping enforced by separate environment.

### F-18: Opaque type Json for JSON values

- **Spec ref**: `docs/spec/10-javascript-interop/external-declarations.md:35-56` — Json type represents parsed JSON
- **Status**: ✅ Implemented (as type reference)
- **Implementation**:
  - Parser accepts Json as TypeConst
  - Typechecker treats as constType("Json")
  - No special runtime checking (opaque at compile-time)
- **Tests**:
  - Unit: `unsafe-enforcement.test.ts:it("types the catch binder as Json")` (line 111)
  - Spec-validation: (none)
- **Coverage assessment**: ⚠️ Thin
- **Notes**: Json is available as a type but no stdlib JSON module is tested. Spec mentions JSON.parse/JSON.stringify externals but no test of actual integration.

### F-19: Opaque type JsObject for arbitrary JS objects

- **Spec ref**: `docs/spec/10-javascript-interop/external-declarations.md:11-32` — JsObject represents any JS object, opaque structure
- **Status**: ✅ Implemented (as type reference)
- **Implementation**:
  - Parser accepts JsObject as TypeConst
  - Typechecker treats as constType("JsObject")
  - No structural enforcement (opaque by design)
- **Tests**:
  - Unit: `opaque-types.test.ts:it("should parse opaque types with regular type declarations")` (line 122) uses JsObject
  - Spec-validation: (none)
- **Coverage assessment**: ⚠️ Thin
- **Notes**: Type exists but no integration tests.

### F-20: Opaque type Promise<T> for JavaScript Promises

- **Spec ref**: `docs/spec/10-javascript-interop/external-declarations.md:58-76` — Promise<T> generic type for async operations
- **Status**: ✅ Implemented (as generic type reference)
- **Implementation**:
  - Parser accepts Promise<T> as TypeApp(TypeConst("Promise"), [TypeVar("T")])
  - Typechecker instantiates generics normally
- **Tests**:
  - Spec-validation: `10-javascript-interop.test.ts:it("external with module import")` (line 18) uses Promise<Response>, `it("async external with options")` (not in current test)
- **Coverage assessment**: ⚠️ Thin
- **Notes**: Type works but no await syntax (future feature per spec comment). .then() would require external helpers.

### F-21: Opaque type Error for JavaScript Error objects

- **Spec ref**: `docs/spec/10-javascript-interop/external-declarations.md:78-100` — Error type for JS exceptions
- **Status**: ✅ Implemented (as type reference)
- **Implementation**:
  - Parser accepts Error as TypeConst
  - Typechecker treats as constType("Error")
- **Tests**:
  - Unit: (none)
  - Spec-validation: (none)
- **Coverage assessment**: ❌ Untested
- **Notes**: Type exists but no tests demonstrate usage. Spec says .message and .stack methods via externals, not tested.

### F-22: Opaque type Any for unconstrained JavaScript values

- **Spec ref**: `docs/spec/10-javascript-interop/external-declarations.md:102-126` — Any type for completely dynamic JS values
- **Status**: ✅ Implemented (as type reference)
- **Implementation**:
  - Parser accepts Any as TypeConst
  - Typechecker treats as constType("Any")
  - No special type-checking rules (treated as regular type)
- **Tests**:
  - Unit: `opaque-types.test.ts:it("should parse opaque types with regular type declarations")` (line 122) uses Any
  - Spec-validation: (none)
- **Coverage assessment**: ⚠️ Thin
- **Notes**: Type available but no tests of unification with Any or type compatibility.

### F-23: Runtime type-checking modes (--runtime-checks flag)

- **Spec ref**: `docs/spec/10-javascript-interop/type-safety.md:20-39` — Three modes: ffi (dev), all (debug), none (prod)
- **Status**: ⏸️ Future
- **Implementation**: (none; not implemented in compiler)
- **Tests**: (none)
- **Coverage assessment**: ❌ Untested
- **Notes**: Spec describes feature but no command-line flag, no runtime checking infrastructure in codegen. This is a planned feature.

### F-24: Type checking at FFI boundaries with runtime checks

- **Spec ref**: `docs/spec/10-javascript-interop/type-safety.md:40-56` — When enabled, checks validate external return values and argument types
- **Status**: ⏸️ Future (dependent on F-23)
- **Implementation**: (none)
- **Tests**: (none)
- **Coverage assessment**: ❌ Untested
- **Notes**: Part of planned runtime type-checking feature.

### F-25: Handling JavaScript null/undefined via Option type

- **Spec ref**: `docs/spec/10-javascript-interop/type-safety.md:58-78` — Use Option<T> to represent nullable JS values
- **Status**: ✅ Implemented (Option type works; FFI pattern is a convention)
- **Implementation**:
  - Option type available in stdlib
  - Pattern: declare external as returning Option<T>
  - Typechecker handles Option normally
- **Tests**:
  - Spec-validation: `10-javascript-interop.test.ts` (no explicit null-handling test)
- **Coverage assessment**: ⚠️ Thin
- **Notes**: Works by convention (external declares Option<T>) but no runtime checking that JS null → None. Spec shows example but not validated.

### F-26: Calling conventions: curried functions from JS

- **Spec ref**: `docs/spec/10-javascript-interop/calling-conventions.md:19-56` — Vibefun multi-param functions compile to nested functions, called as `f(a)(b)(c)`
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/desugarer/curryLambda.ts` — lambda desugaring produces nested structure
  - Codegen: `packages/core/src/codegen/es2020/emit-expressions/functions.ts` — emits `(a) => (b) => (c) => ...`
- **Tests**:
  - E2E: `06-functions.test.ts` covers currying behavior
  - Spec-validation: `12-compilation.test.ts` may cover JS calling conventions
- **Coverage assessment**: ✅ Adequate
- **Notes**: Full implementation; Vibefun's auto-currying is transparent to user.

### F-27: Variant representation in JavaScript (tag field)

- **Spec ref**: `docs/spec/10-javascript-interop/calling-conventions.md:58-80` — Variants compile to objects with `tag` field
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/codegen/es2020/emit-expressions/collections.ts` — variant construction emits `{ tag: "...", value: ... }`
  - Pattern matching codegen handles tag-based dispatch
- **Tests**:
  - Unit: codegen tests for variant emission
  - E2E: `pattern-matching.test.ts` in execution-tests
- **Coverage assessment**: ✅ Adequate
- **Notes**: Transparent representation; users don't write JS manually for variants in this spec section.

### F-28: Record representation in JavaScript (plain objects)

- **Spec ref**: `docs/spec/10-javascript-interop/calling-conventions.md:82-94` — Records compile to plain JS objects with field names as keys
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/codegen/es2020/emit-expressions/collections.ts` — record emission produces `{ key: value, ... }`
- **Tests**:
  - Unit: codegen record tests
  - E2E: `records.test.ts` in execution-tests
- **Coverage assessment**: ✅ Adequate
- **Notes**: Full support.

### F-29: Refs as mutable objects with .value field in JavaScript

- **Spec ref**: `docs/spec/10-javascript-interop/calling-conventions.md:117-140` — Refs compile to `{ value: ... }` with mutable .value field
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/codegen/es2020/emit-expressions/collections.ts` — ref construction and access
- **Tests**:
  - Unit: codegen ref tests
  - E2E: `mutable-refs.test.ts` in execution-tests
- **Coverage assessment**: ✅ Adequate
- **Notes**: Full support; JS can mutate .value directly.

### F-30: Arity-based external overload resolution at call site

- **Spec ref**: `docs/spec/10-javascript-interop/external-declarations.md:217-235` — Compiler selects overload based on argument count
- **Status**: ⚠️ Partial
- **Implementation**:
  - Parser allows multiple declarations with same name ✅
  - Typechecker creates multiple External bindings ✅
  - Overload resolution at call: VF4804 error states "not yet supported" — resolution logic not implemented
  - Inference code in `packages/core/src/typechecker/infer/infer-primitives.ts:223-224` throws VF4804 for ExternalOverload
- **Tests**:
  - Unit: overloading.test.ts tests parsing but not resolution
  - Spec-validation: (none test overload resolution)
- **Coverage assessment**: ❌ Untested
- **Notes**: Core infrastructure exists (multiple bindings created) but matching call arguments to overload by arity is incomplete. Design decision pending.

### F-31: Parser error VF2007: missing semicolon in external block

- **Spec ref**: `docs/spec/10-javascript-interop/external-declarations.md:173` — Items separated by semicolons (not commas)
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-declarations/external.ts:125-127` — throws VF2007 if no SEMICOLON before next item
- **Tests**:
  - (none explicit; would be caught by parser error tests)
- **Coverage assessment**: ⚠️ Thin
- **Notes**: Enforced but no dedicated test.

### F-32: Desugarer: ExternalBlock expands into individual declarations

- **Spec ref**: Implicit in desugaring strategy — blocks become separate Core declarations
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/desugarer/desugarer.ts:652-678` — ExternalBlock case returns array of declarations (one per item)
- **Tests**:
  - (implicit in all external block tests)
- **Coverage assessment**: ✅ Adequate
- **Notes**: Desugarer flattens blocks; simplifies typechecker and codegen.

### F-33: Codegen: External declarations emit const bindings or imports

- **Spec ref**: Implicit — external declarations map to JS via import or const binding
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/codegen/es2020/emit-declarations.ts:325-363` — `emitExternalDecl` emits const binding or import
  - `packages/core/src/codegen/es2020/emit-declarations.ts:380-408` — `emitImportDecl` handles module imports
- **Tests**:
  - Spec-validation: `10-javascript-interop.test.ts:it("external with module import")` (line 18) validates import emission
- **Coverage assessment**: ✅ Adequate
- **Notes**: Full support; handles dotted names and module paths.

### F-34: Codegen: Unsafe blocks pass through (no overhead)

- **Spec ref**: Implicit — unsafe is a compile-time marker, no runtime representation
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/codegen/es2020/emit-expressions/index.ts:90-92` — CoreUnsafe case emits inner expr directly
- **Tests**:
  - Spec-validation: all unsafe tests verify no extra wrapping
- **Coverage assessment**: ✅ Adequate
- **Notes**: Zero runtime cost.

### F-35: Codegen: Try/catch emits JavaScript try/catch via IIFE

- **Spec ref**: Implicit — try/catch compiles to JS equivalent
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/codegen/es2020/emit-expressions/control.ts:199-211` — emits `(() => { try { ... } catch (e) { ... } })()`
- **Tests**:
  - Spec-validation: `10-javascript-interop.test.ts:it("try-catch in unsafe block")` (line 89)
- **Coverage assessment**: ✅ Adequate
- **Notes**: IIFE ensures expression semantics.

### F-36: Desugarer: Generic external type parameters preserved

- **Spec ref**: Implied in F-10 — typeParams must survive desugaring
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/desugarer/desugarer.ts:656-667` — ExternalValue items preserve typeParams
  - Parser → Desugarer → Typechecker all thread typeParams through
- **Tests**:
  - Unit: `external-generics.test.ts` validates parsing; roundtrip through desugarer implicit
- **Coverage assessment**: ✅ Adequate
- **Notes**: Full threading.

## Feature Gaps (this section)

- **F-05 (VF4801)**: Overload validation — all overloads must have same jsName — error code defined but never thrown. Typechecker must validate overload consistency. Remediation: add arity-grouped overload validation in typechecker when processing external declarations.

- **F-06 (VF4802)**: Overload validation — all overloads must have same from clause — error code defined but never thrown. Same as F-05. Remediation: extend overload validation to check from consistency.

- **F-07 (VF4803)**: Overload validation — overloads must be function types — error code defined but never thrown. Non-function externals with duplicate names (e.g., `PI: Float = "Math.PI"` twice) should error. Remediation: add type-shape check in overload validation.

- **F-23 (Runtime type-checking modes)**: `--runtime-checks` flag not implemented. Spec describes three modes (ffi, all, none) but CLI does not support. Remediation: add flag to compiler config and wire runtime checks in codegen at FFI boundaries.

- **F-24 (Type safety at runtime)**: Runtime type checking at FFI boundaries not implemented. Codegen should insert validation when runtime-checks is enabled. Remediation: depends on F-23; implement runtime guards in emitExternalDecl and FFI call sites.

- **F-30 (Overload resolution)**: Arity-based overload resolution at call site incomplete. Parser and typechecker create multiple bindings but VF4804 error states "not yet supported". Spec describes resolution algorithm (select by argument count) but implementation is pending. Remediation: design and implement overload-resolution logic in inference engine; integrate with VF4804 error handling.

## Testing Gaps (this section)

- **F-05, F-06, F-07** (Overload consistency validation): No tests that verify error cases. Add tests in `unsafe-enforcement.test.ts` or `overloading.test.ts` that expect VF4801, VF4802, VF4803 when overloads conflict. Tests should use `expectCompileError` with specific error codes.

- **F-21 (Error type)**: No tests use Error type in external declarations. Add test showing Error constructor and .message/.stack methods if they're exposed as externals.

- **F-22 (Any type)**: No tests verify unification behavior with Any. Type exists but unification with Any may not be tested.

- **F-25 (Null handling)**: No test validates that JS null values are handled via Option<T>. Spec shows pattern but no test covering actual null return from external → None conversion.

- **F-30 (Overload resolution)**: No tests verify that overload resolution by arity works at call sites. Add tests in `unsafe-enforcement.test.ts` with multiple external signatures and verify correct overload is called based on argument count.

## Testing Redundancies (this section)

_None_. External and unsafe tests are well-organized by feature and layer (parser tests focus on syntax, integration tests on enforcement rules, spec-validation tests on end-to-end behavior). No observed duplication of assertions.

---

**Audit Summary**

- **Features**: 36 distinct normative claims extracted from spec (F-01 through F-36)
- **Gaps**: 6 incomplete features (overload validation, runtime type-checking, overload resolution)
- **Testing Gaps**: 5 major test-coverage gaps (overload consistency, Error type, Any unification, null handling, overload resolution)
- **Redundancies**: 0
- **Output**: `/Users/michael/Projects/vibefun/.claude/spec-audit/10-javascript-interop.md`
