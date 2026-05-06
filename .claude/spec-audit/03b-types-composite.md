# Audit: Composite Types (records, variants, generics, unions, recursive, subtyping)

## Sources Reviewed

**Spec files** (with line counts):
- `docs/spec/03-type-system/record-types.md` (430 lines)
- `docs/spec/03-type-system/variant-types.md` (71 lines)
- `docs/spec/03-type-system/generic-types.md` (160 lines)
- `docs/spec/03-type-system/union-types.md` (140 lines)
- `docs/spec/03-type-system/recursive-types.md` (84 lines)
- `docs/spec/03-type-system/subtyping.md` (299 lines)

**Implementation files**:
- `packages/core/src/typechecker/typechecker.ts`
- `packages/core/src/typechecker/unify.ts`
- `packages/core/src/typechecker/type-declarations.ts`
- `packages/core/src/typechecker/infer/infer-structures.ts`
- `packages/core/src/parser/parse-types.ts`
- `packages/core/src/parser/parse-declarations/type.ts`
- `packages/core/src/desugarer/desugarer.ts`
- `packages/core/src/desugarer/desugarVariantConstructor.ts`

**Test files** (every layer):
- Unit: `packages/core/src/typechecker/infer-records.test.ts`, `typechecker-records.test.ts`, `unify.test.ts`, `type-declarations.test.ts`
- Desugarer unit: `packages/core/src/desugarer/records.test.ts`, `desugarVariantConstructor.test.ts`
- Parser unit: `packages/core/src/parser/expression-records.test.ts`, `record-shorthand.test.ts`, `recursive-types.test.ts`, `multi-line-variants.test.ts`, `external-generics.test.ts`, `opaque-types.test.ts`, `external-types.test.ts`
- Parser snapshot: `packages/core/src/parser/snapshot-tests/snapshot-data-structures.test.ts`, `snapshot-declarations.test.ts`
- Codegen execution: `packages/core/src/codegen/es2020/execution-tests/records.test.ts`, `user-defined-types.test.ts`
- E2E: `tests/e2e/user-defined-types.test.ts`, `tests/e2e/spec-validation/03-type-system.test.ts`
- Property: `packages/core/src/types/test-arbitraries/` (typeArb, groundTypeArb, recordType, variantType helpers used in unify.test.ts, infer-records.test.ts)

## Feature Inventory

### F-01: Record type definitions with named fields

- **Spec ref**: `docs/spec/03-type-system/record-types.md:1-35` — Records are product types with named fields; syntax requires commas between all fields.
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-types.ts:148-230` — parseRecordType parses `{ field: Type, ... }`
  - `packages/core/src/typechecker/type-declarations.ts:84-96` — registerRecord stores record type definitions in env.types with field map
  - `packages/core/src/typechecker/infer/infer-structures.ts:37-77` — inferRecord constructs record type from fields
- **Tests**:
  - Unit: `infer-records.test.ts:"should infer type for simple record"` (line 69), `typechecker-records.test.ts:"should type check record construction and access"` (line 12)
  - Parser: `expression-records.test.ts` (multiple tests)
  - E2E: `spec-validation/03-type-system.test.ts:"record construction"` (line 119)
  - Snapshot: `snapshot-data-structures.test.ts` (line 6)
- **Coverage assessment**: ✅ Adequate — construction, field inference, and parsing all covered with unit and E2E tests.
- **Notes**: Trailing commas tested explicitly in spec-validation.

### F-02: Record field access (dot notation)

- **Spec ref**: `docs/spec/03-type-system/record-types.md:47-52` — Field access via dot notation (e.g., `person.name`); chained access supported.
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-expression-primary.ts` — parseRecordAccess parses `record.field` and chains
  - `packages/core/src/typechecker/infer/infer-structures.ts:88-165` — inferRecordAccess looks up field type, supports width subtyping, expands aliases
- **Tests**:
  - Unit: `infer-records.test.ts:"should infer type of record access"` (multiple tests), `typechecker-records.test.ts:"should type check record with field access"` (line 89)
  - E2E: `spec-validation/03-type-system.test.ts:"record field access"` (line 123), `"chained field access"` (line 127)
- **Coverage assessment**: ✅ Adequate — single and chained access tested, type inference validated.
- **Notes**: Module field access (line 100–111) has dedicated handling for module exports.

### F-03: Record immutable update with spread syntax

- **Spec ref**: `docs/spec/03-type-system/record-types.md:54-58` — Immutable update via spread: `{ ...record, field: newValue }` creates new record.
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-expression-complex.ts` — parseRecordUpdate parses spread syntax
  - `packages/core/src/typechecker/infer/infer-structures.ts:170-240` — inferRecordUpdate handles spread, validates fields, supports width subtyping
  - `packages/core/src/desugarer/records.test.ts` — record update desugaring validated
- **Tests**:
  - Unit: `infer-records.test.ts` (record update tests), `desugarer/records.test.ts` (spread desugaring, 29+ tests)
  - E2E: `spec-validation/03-type-system.test.ts:"record immutable update (spread)"` (line 134)
- **Coverage assessment**: ✅ Adequate — spread semantics, field merging, and immutability all tested.
- **Notes**: Spread desugaring extensively tested (single, multiple fields, expression spreads).

### F-04: Record field shorthand syntax

- **Spec ref**: `docs/spec/03-type-system/record-types.md:278-346` — Shorthand `{ name, age }` expands to `{ name: name, age: age }`; works with inferred types; cannot use keywords as variables.
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-expression-primary.ts` — parseRecord detects shorthand syntax and expands
  - `packages/core/src/desugarer/desugarer.ts` — desugared transparently to explicit syntax
- **Tests**:
  - Unit: `parser/record-shorthand.test.ts` (18 tests covering shorthand parsing)
  - E2E: `spec-validation/03-type-system.test.ts:"record field shorthand"` (line 145), `"keyword field shorthand rejected"` (line 177)
- **Coverage assessment**: ✅ Adequate — shorthand parsing, keyword rejection, and mixed syntax all tested.
- **Notes**: Keyword-as-field-name limitation enforced at parser level.

### F-05: Keywords as record field names (explicit syntax only)

- **Spec ref**: `docs/spec/03-type-system/record-types.md:349-430` — Keywords allowed in explicit field syntax (e.g., `{ type: "foo" }`); cannot be used in shorthand (no keyword variables).
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-types.ts` — parseRecord allows IDENTIFIER | KEYWORD for field names in type positions
  - `packages/core/src/parser/parse-expression-primary.ts` — parseRecord allows keywords in explicit-syntax field names
- **Tests**:
  - Parser: `expression-records.test.ts` (keyword field tests), `record-shorthand.test.ts:"keyword field shorthand rejected"` (line 177)
  - E2E: `spec-validation/03-type-system.test.ts:"keyword field shorthand rejected"` (line 177) — validates error
- **Coverage assessment**: ⚠️ Thin — only shorthand rejection tested; explicit keyword field construction in records not explicitly E2E validated (likely works but inferred).
- **Notes**: Parser accepts keywords; shorthand rejection tested; gap is lack of explicit "use keyword field as property" E2E test.

### F-06: Structural typing for records with width subtyping

- **Spec ref**: `docs/spec/03-type-system/record-types.md:60-134` — Records use structural typing; records with extra fields are subtypes (width subtyping). Unification is directional: expected (narrower) must match actual (possibly wider).
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/typechecker/unify.ts:547-582` — unifyRecords implements directional width subtyping: all fields in r1 (expected) must exist in r2 (actual); extra fields in r2 allowed
  - `packages/core/src/typechecker/unify.ts:314-327` — App-argument unification sets `exact: true` to enforce invariance in generic type parameters
- **Tests**:
  - Unit: `unify.test.ts:"should support width subtyping when actual (r2) has extra fields"` (line 407), `"should reject when expected (r1) has a field the actual (r2) is missing"` (line 422), `"should bind a type var inside an expected field when actual has extras"` (line 437)
  - E2E: `spec-validation/03-type-system.test.ts:"width subtyping - extra fields allowed"` (line 161), `"missing required fields rejected"` (line 169)
- **Coverage assessment**: ✅ Adequate — width subtyping direction, extra field handling, missing field errors all tested at unit and E2E levels.
- **Notes**: Width subtyping does NOT apply at function-type assignment (see F-19), only at call sites and record-to-record unification.

### F-07: Invariant type parameters (no variance for generic containers)

- **Spec ref**: `docs/spec/03-type-system/generic-types.md:32-51` — Type parameters are strictly invariant; `Box<Point3D>` ≠ `Box<Point2D>` even if `Point3D <: Point2D`.
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/typechecker/unify.ts:308-327` — App-unification sets `exact: true` context for type arguments, enforcing exact field matching (no width subtyping)
  - `packages/core/src/typechecker/unify.ts:564-578` — When exact mode is set, extra fields in either record side trigger VF4504 diagnostic
- **Tests**:
  - Unit: `unify.test.ts:"should enforce invariance of generic type parameters"` (multiple tests asserting exact matching in App args)
  - E2E: `spec-validation/03-type-system.test.ts:"invariant type parameters"` (line 242) — asserts compile error when `Box<Float>` passed where `Box<Int>` expected
- **Coverage assessment**: ✅ Adequate — invariance enforced via exact-mode context, tested at unit and E2E levels.
- **Notes**: Invariance applies to all generic type constructors uniformly; no covariance or contravariance annotations supported.

### F-08: Variant type definitions with named constructors

- **Spec ref**: `docs/spec/03-type-system/variant-types.md:1-42` — Variants are sum types with named constructors; can be nullary (`Red`) or carry data (`Some(T)`).
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-types.ts` — parseVariantType parses `Name | Name(Type, ...)` syntax
  - `packages/core/src/parser/parse-declarations/type.ts` — parseTypeDeclaration handles multi-line variants with `and` keyword
  - `packages/core/src/typechecker/type-declarations.ts:99-142` — registerVariant stores constructor map, creates constructor schemes (values for nullary, curried functions for n-ary)
- **Tests**:
  - Unit: `type-declarations.test.ts` (variant registration), `infer-records.test.ts` (variant type schemes)
  - Parser: `multi-line-variants.test.ts` (18+ tests of variant parsing), `expression-records.test.ts` (variant construction tests)
  - E2E: `spec-validation/03-type-system.test.ts:"variant type definition and construction"` (line 183), `"variant with data"` (line 188)
- **Coverage assessment**: ✅ Adequate — nullary and n-ary constructors, parser handling of multi-line syntax all tested.
- **Notes**: Constructors curried automatically (line 134 in type-declarations.ts); each arg is a separate function application.

### F-09: Variant constructor functions

- **Spec ref**: `docs/spec/03-type-system/variant-types.md:32-42` — Variant constructors are functions: nullary constructors are values, n-ary constructors have type `(arg1) -> (arg2) -> ... -> Variant<...>` (curried).
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/typechecker/type-declarations.ts:131-140` — Constructor type scheme: nullary = variant type (value), n-ary = curriedFunType (function)
  - `packages/core/src/typechecker/type-declarations.ts:148-153` — curriedFunType builds right-associative function chain
- **Tests**:
  - Unit: `type-declarations.test.ts` (constructor scheme creation), `infer-records.test.ts` (infer variant construction)
  - E2E: `spec-validation/03-type-system.test.ts:"variant constructors are functions"` (line 208) — asserts that `Some` can be assigned to a variable
- **Coverage assessment**: ⚠️ Thin — nullary constructors as values tested, but curried application of n-ary constructors only partially tested (parser/desugarer currying, not explicit typechecker test).
- **Notes**: Desugarer curries lambda applications; desugarer.ts and `desugarVariantConstructor.ts` handle this. Gap: no explicit infer/typechecker test of multi-arg variant application.

### F-10: Nominal typing for variants (constructor-name matching required)

- **Spec ref**: `docs/spec/03-type-system/variant-types.md:44-70` — Variants use nominal typing: two variant types with identical constructors but different names are NOT compatible.
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/typechecker/unify.ts:594-648` — unifyVariants requires exact constructor-set match (name, count, arity, types)
- **Tests**:
  - Unit: `unify.test.ts:"should unify identical variant types"` (line 467), `"should fail to unify variants with different constructors"` (multiple scenarios)
  - E2E: `spec-validation/03-type-system.test.ts:"nominal typing - same constructors different types are incompatible"` (line 214)
- **Coverage assessment**: ✅ Adequate — nominal type checking enforced, test explicitly asserts incompatibility of structurally identical but nominally different variants.
- **Notes**: No structural subtyping for variants; name must match exactly.

### F-11: Generic type definitions with type parameters

- **Spec ref**: `docs/spec/03-type-system/generic-types.md:8-29` — Generic types parameterized by type variables: `type Box<T> = { value: T }`; multiple parameters allowed.
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-types.ts:14-65` — parseTypeParameters parses `<T, U, V>` syntax, handles `>>` lookahead for nested generics
  - `packages/core/src/typechecker/type-declarations.ts:73-82` (alias), `84-96` (record), `99-142` (variant) — buildTypeParams extracts type parameter info, convertTypeExpr binds parameters in type expressions
- **Tests**:
  - Parser: `external-generics.test.ts` (generic parsing in external declarations), `external-types.test.ts` (generic record types)
  - E2E: `spec-validation/03-type-system.test.ts:"generic type definition"` (line 226)
- **Coverage assessment**: ✅ Adequate — type-parameter parsing, binding, and application tested at parser and E2E levels.
- **Notes**: Type parameters are bound during type-expression conversion and applied at usage sites.

### F-12: Generic function types with explicit type parameters

- **Spec ref**: `docs/spec/03-type-system/generic-types.md:17-22` — Generic functions written as `let f: <T>(T) -> T = ...` or inferred polymorphically.
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-types.ts:parseTypeExpr` → `parseFunctionType` → `parsePrimaryType` handles `<T>( ... ) -> ...` syntax
  - `packages/core/src/typechecker/infer/infer-primitives.ts` — type-scheme instantiation and let-polymorphism generalize type variables
- **Tests**:
  - E2E: `spec-validation/03-type-system.test.ts:"generic function"` (line 231), `"polymorphic identity function"` (line 81)
- **Coverage assessment**: ✅ Adequate — generic functions tested via E2E and let-polymorphism tests.
- **Notes**: Polymorphism comes from let-generalization; explicit `<T>` annotations parsed but type-scheme generalization is the primary mechanism.

### F-13: Union types for variant constructors (primary use)

- **Spec ref**: `docs/spec/03-type-system/union-types.md:7-19` — Union types primarily represent variant constructors; syntax is `Name(T) | Name(T)` in type declarations.
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-types.ts:72-112` — parseTypeExpr parses `|`-separated union types when lookahead shows identifier/paren/brace/string
  - `packages/core/src/typechecker/unify.ts:341-359` — unifyUnion checks type arrays element-by-element
- **Tests**:
  - Parser: `types.test.ts` (union type parsing), `multi-line-variants.test.ts` (variant union in declarations)
  - E2E: `spec-validation/03-type-system.test.ts` (variant pattern matching, construction — uses variant union syntax)
- **Coverage assessment**: ⚠️ Thin — variant unions tested implicitly through variant tests, but no dedicated union-type test beyond parsing.
- **Notes**: Union types are primarily a syntactic form for variants; the main feature (variants) is well-tested. General unions (`Int | String`) have limited support.

### F-14: String literal union types

- **Spec ref**: `docs/spec/03-type-system/union-types.md:23-43` — String literal unions restrict values to specific strings: `type Status = "pending" | "active" | "complete"`.
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-types.ts:72-112` — parseTypeExpr accepts STRING_LITERAL as union member
  - `packages/core/src/typechecker/unify.ts:372-395` — StringLit ~ StringLit unification checks exact value match; StringLit ~ Const("String") allowed
  - `packages/core/src/desugarer/desugarTypeExpr.ts` — union type desugaring includes string literal handling
- **Tests**:
  - Parser: `types.test.ts` (string literal parsing in unions)
  - E2E: `spec-validation/03-type-system.test.ts:"string literal union type"` (line 307), `"string literal union rejects invalid literal"` (line 312)
- **Coverage assessment**: ✅ Adequate — parsing and validation of string literal unions tested at E2E level.
- **Notes**: String literals are a narrowing of the general String type; unification is exact-value-based.

### F-15: General union types (limited support)

- **Spec ref**: `docs/spec/03-type-system/union-types.md:45-66` — General unions like `Int | String` have **limited support**; primarily for external declarations; poor inference in pure Vibefun code.
- **Status**: ⚠️ Partial
- **Implementation**:
  - `packages/core/src/parser/parse-types.ts:72-112` — Parsing accepts `|`-separated types (TypeExpr)
  - `packages/core/src/typechecker/unify.ts:341-359` — Unification implemented (element-wise matching)
  - **Gap**: No special inference or pattern-matching support for general unions beyond unification
- **Tests**:
  - Parser: `types.test.ts` (union parsing)
  - (none explicitly for pure-Vibefun general union semantics)
- **Coverage assessment**: ❌ Untested — general union behavior in expressions not validated by E2E tests.
- **Notes**: Spec says general unions are "primarily for JavaScript interop"; their behavior in pure Vibefun inference is **not** spec-validated. Pattern matching on general unions would require exhaustiveness checking that isn't implemented.

### F-16: Recursive type definitions (guarded by constructor)

- **Spec ref**: `docs/spec/03-type-system/recursive-types.md:5-38` — Recursive types must be **guarded** by a constructor (variant or record field); unguarded self-reference is a compile error.
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/typechecker/type-declarations.ts:46-48` — validateTypeDecl walks type expressions, rejects unguarded recursion (VF4027)
  - `packages/core/src/desugarer/desugarTypeExpr.ts` — type expression validation during desugaring also checks for unguarded recursion
- **Tests**:
  - Unit: `type-declarations.test.ts` (unguarded recursion rejection)
  - E2E: `spec-validation/03-type-system.test.ts:"unguarded recursion rejected"` (line 339), `user-defined-types.test.ts:"rejects an unguardedly recursive type alias at compile time"` (line 59)
- **Coverage assessment**: ✅ Adequate — unguarded recursion detected and rejected with VF4027; both inline aliases and nominal variants validated.
- **Notes**: Validation runs in registerTypeDeclarations before registration, so errors surface early.

### F-17: Mutually recursive types with `and` keyword

- **Spec ref**: `docs/spec/03-type-system/recursive-types.md:40-83` — Multiple types can reference each other via `and` keyword; all types in group simultaneously in scope; must be guarded.
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-declarations/type.ts` — parseTypeDeclaration handles `and` continuation, collects all variants into single CoreTypeDecl with multiple constructors
  - `packages/core/src/typechecker/type-declarations.ts:30-56` — registerTypeDeclarations collects declsByName, validates as group, then registers (mutual recursion possible via simultaneous scope)
- **Tests**:
  - Parser: `recursive-types.test.ts` (mutual recursion parsing, 10+ tests)
  - E2E: `spec-validation/03-type-system.test.ts:"mutually recursive types with and"` (line 331)
- **Coverage assessment**: ✅ Adequate — mutual recursion parsing and type checking both tested; guard validation applies to group.
- **Notes**: Mutual recursion validation defers to existing guard checking (validateTypeDecl).

### F-18: Type aliases (transparent substitution)

- **Spec ref**: `docs/spec/03-type-system/record-types.md:1-430` (alias use), also implied in subtyping — type aliases are transparent.
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/typechecker/type-declarations.ts:72-82` — registerAlias stores alias definition in env.types with `kind: "Alias"`
  - `packages/core/src/typechecker/unify.ts:718-756` — expandAlias and expandAliasFully recursively expand aliases during unification
- **Tests**:
  - Unit: `unify.test.ts:"alias expansion"` (multiple tests), `type-declarations.test.ts`
  - E2E: `user-defined-types.test.ts:"treats a type alias transparently as its aliased type"` (line 32)
- **Coverage assessment**: ✅ Adequate — alias expansion, transitivity (A = B; B = Int), and field-access expansion all tested.
- **Notes**: Aliases are expanded transitively with a depth cap (32 iterations) to guard against pathological cycles.

### F-19: Function type variance (exact matching required, no variance)

- **Spec ref**: `docs/spec/03-type-system/record-types.md:149-205` and `docs/spec/03-type-system/subtyping.md:118-164` — Function types must unify exactly; no contravariance for parameters or covariance for returns. Width subtyping applies at call sites, not function-type assignments.
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/typechecker/unify.ts:271-297` — unifyFun requires exact parameter and return type matching
  - Width subtyping at call sites happens during argument type unification (unifyRecords), not during function-type assignment
- **Tests**:
  - Unit: `unify.test.ts` (function unification tests — no variance logic present)
  - E2E: no explicit test (absence of variance accepted)
- **Coverage assessment**: ⚠️ Thin — function type exact matching validated implicitly (variance tests would assert failure of contravariant/covariant assignments), but no explicit "function variance" test in E2E suite. Spec says width subtyping works at call sites (F-06 covers this).
- **Notes**: Lack of variance is by design; workarounds documented in spec (manual wrapping, generic functions). No test explicitly asserts that variance would fail.

### F-20: Unification with directional width subtyping

- **Spec ref**: `docs/spec/03-type-system/subtyping.md:55-90` — Unification is directional: expected (narrower) checked against actual (possibly wider); extra fields in actual allowed, missing fields error (VF4503).
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/typechecker/unify.ts:547-582` — unifyRecords implements full directional logic; calls loop over r1 fields, checks r2 has them; ignores r2 extras unless `exact` mode
  - VF4503 thrown for missing required field (line 554)
  - VF4504 thrown for unexpected field in exact mode (line 571)
- **Tests**:
  - Unit: `unify.test.ts:"should support width subtyping when actual (r2) has extra fields"` (line 407), `"should reject when expected (r1) has a field the actual (r2) is missing"` (line 422)
  - E2E: `spec-validation/03-type-system.test.ts:"width subtyping - extra fields allowed"` (line 161), `"missing required fields rejected"` (line 169)
- **Coverage assessment**: ✅ Adequate — both width-subtyping acceptance and missing-field rejection tested at unit and E2E levels.
- **Notes**: Directional semantics critical for correct inference; well-covered.

### F-21: Record field type unification respecting width subtyping

- **Spec ref**: `docs/spec/03-type-system/subtyping.md:119-135` — During unification, corresponding field types must unify; extra fields in wider record allowed.
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/typechecker/unify.ts:550-562` — Field-by-field unification with recursion into field types (applySubst, unify each field)
- **Tests**:
  - Unit: `unify.test.ts:"should fail to unify incompatible field types"` (line 455)
  - E2E: (covered by width-subtyping tests, implicit in record tests)
- **Coverage assessment**: ✅ Adequate — field-type compatibility tested.
- **Notes**: Field unification itself is standard; width subtyping works through the loop structure (not all fields required from wider record).

### F-22: Invariance enforcement in generic type-application arguments

- **Spec ref**: `docs/spec/03-type-system/subtyping.md:166-226` — Generic type parameters are invariant; inside `App(..., [arg])` position, records must match exactly (no width subtyping).
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/typechecker/unify.ts:314-327` — App-unification sets `exact: true` when unifying arguments, passed to unifyRecords
  - `packages/core/src/typechecker/unify.ts:564-578` — unifyRecords checks `ctx.exact` and rejects extra fields in either record side
- **Tests**:
  - Unit: `unify.test.ts` (multiple tests asserting exact matching in invariant positions)
  - E2E: `spec-validation/03-type-system.test.ts:"invariant type parameters"` (line 242)
- **Coverage assessment**: ✅ Adequate — invariance enforced via exact-mode context switching; tested at unit and E2E levels.
- **Notes**: Invariance applies uniformly; the `exact` flag is the implementation mechanism.

### F-23: Variant type expansion (not transparent, nominal only)

- **Spec ref**: `docs/spec/03-type-system/subtyping.md:710-740` — Variants are **NOT** expanded during unification; they use dedicated nominal rules.
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/typechecker/unify.ts:246-252` — sameGenericApplication check prevents expansion when both sides are App applications with same constructor
  - `packages/core/src/typechecker/unify.ts:594-648` — unifyVariants has dedicated nominal matching (no expansion)
  - Line 742 comment in unify.test.ts confirms variants are not expanded
- **Tests**:
  - Unit: `unify.test.ts:"ignores Variant bindings — variants are nominal, not expanded"` (line 741)
  - (Nominal tests cover variant matching without expansion)
- **Coverage assessment**: ✅ Adequate — variant non-expansion validated as intentional design.
- **Notes**: Variants use nominal typing exclusively; no structural matching.

### F-24: Type-variable occurs check (prevent infinite types)

- **Spec ref**: Implicit in unification theory; prevents `α = List<α>` etc.
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/typechecker/unify.ts:183-210` — occursIn checks all type structures for variable presence
  - `packages/core/src/typechecker/unify.ts:437-455` — unifyVar calls occursIn before binding, throws VF4300 on cycle
- **Tests**:
  - Unit: `unify.test.ts:"should detect variable occurs in itself"` (line 177), `"should detect variable occurs in nested structure"` (line 198), `"should fail occurs check when unifying variable with type containing itself"` (line 290)
- **Coverage assessment**: ⚠️ Thin (speculative) — occurs check tested on direct variable bindings across major type constructors. There is a *hypothesized* gap around cyclic substitution chains in genuinely bidirectional mutual `let rec` groups (`α → β → α`) that the unification-time occurs check would not catch when chasing existing substitutions in `applySubst`. **No reproducer is currently in hand**; this hypothesis was raised by review and has not been validated against the implementation in this audit.
- **Notes**: Treat the bidirectional-mutual-recursion concern as speculative until a reproducer exists. Suggested follow-up: write a property test that builds a bidirectional mutual-recursive group and asserts the typechecker either rejects with a sane diagnostic or terminates without stack-overflow; if the test fails, the speculative gap is confirmed and this entry should be promoted to ⚠️ Partial with the failing fixture cited.

## Feature Gaps (this section)

- **F-15**: General union types (`Int | String`) have limited support and no E2E validation. Spec says support is limited; implementation accepts syntax but lacks inference/pattern-matching for pure Vibefun use. Gap: no E2E test of general-union semantics (spec explicitly marks this as limited). Remediation: add E2E test validating that general unions cannot be pattern-matched in pure Vibefun (or document if they can).

- **F-19**: Function type variance (lack thereof) is not explicitly tested. Spec documents that width subtyping does NOT apply at function-type assignments, only call sites. Gap: no E2E test explicitly asserting that `(Point3D) -> Int` ≠ `(Point2D) -> Int` even though `Point3D <: Point2D`. Remediation: add E2E test of function-assignment incompatibility.

## Testing Gaps (this section)

- **F-05**: Keywords as explicit record field names lack E2E validation. Parsing/shorthand rejection is tested, but no E2E test constructs a record with keyword field names and accesses them. Remediation: add E2E test of form `let r = { type: "foo" }; r.type`.

- **F-09**: Curried multi-argument variant constructor application not explicitly tested in typechecker. Desugarer handles currying, but typechecker test of inferring type of partial application (e.g., `let f = Rectangle(3.14);`) is missing. Remediation: add unit test in infer-records.test.ts or similar of variant partial application.

- **F-13**: Union types used only implicitly (variant unions tested, but not as a general union-type feature). Remediation: add dedicated test of union-type unification (parsing + unification independent of variant context).

- **F-15**: General union-type inference/pattern-matching never validated. Spec says "limited support"; no test clarifies what that limitation is. Remediation: add E2E test documenting whether `let x: (Int | String) = ...` works, whether pattern matching works, and what error messages appear.

- **F-19**: Function-parameter contravariance not explicitly tested (absence is correct, but absence of explicit test means regressions could slip through). Remediation: add E2E test asserting that function-type assignments require exact matching.

## Testing Redundancies (this section)

- **Candidate**: `unify.test.ts:"should unify identical record types"` (line 390) and multiple `infer-records.test.ts` tests both validate record construction and field inference. Recommendation: keep both — unit tests of unification are independent of inference tests; complementary layers.

- **Candidate**: `spec-validation/03-type-system.test.ts:"width subtyping - extra fields allowed"` and `unify.test.ts:"should support width subtyping when actual (r2) has extra fields"` both assert width subtyping acceptance. Recommendation: keep both — unit test validates algorithm, E2E test validates user-visible behavior end-to-end.

- **Candidate**: `desugarer/records.test.ts` (24 tests) and `parser/expression-records.test.ts` extensively cover record syntax. Recommendation: keep both — desugarer tests validate lowering semantics (field merging, spread expansion), parser tests validate syntactic acceptance.

- **Candidate**: `recursive-types.test.ts` (parser) and `spec-validation/03-type-system.test.ts` both test recursive variant parsing. Recommendation: keep both — parser test validates syntax, E2E test validates semantics (execution, type checking).

- **Candidate**: Multiple tests validate variant constructor function behavior (type-declarations.test.ts currying, infer tests, desugarer currying). Recommendation: keep — different layers test different aspects (scheme generation, type inference, desugaring).

_None_ additional high-confidence redundancies detected. The test suite spans parser, desugarer, typechecker, codegen, and E2E layers with minimal overlap.

---

**Summary**: 
- **Features**: 24 F-NN entries covering records, variants, generics, unions, recursion, subtyping, invariance, nominal typing, width subtyping, field access, updates, shorthand, keywords, constructors, currying, aliasing.
- **Gaps**: 2 (general unions lacking E2E validation, function-type variance lacking E2E test).
- **Testing gaps**: 5 (keyword field use, partial variant application, standalone union-type unification, general union semantics, function-type assignment incompatibility).
- **Redundancies**: None flagged with high confidence; test suite spans complementary layers.
- **Output file**: `.claude/spec-audit/03b-types-composite.md`

