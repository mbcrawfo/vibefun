# Code Generator Task List

**Last Updated:** 2026-02-01

**Maintenance Note:** Line numbers below are best-effort; re-verify at implementation time.

## Phase 1: Core Infrastructure
**Status:** ✅ Done

- [x] Create directory structure `packages/core/src/codegen/es2020/`
- [x] Create directory structure `packages/core/src/codegen/es2020/tests/`
- [x] Create directory structure `packages/core/src/codegen/es2020/snapshot-tests/`
- [x] Create `packages/core/src/codegen/es2020/CLAUDE.md` - Module documentation
- [x] Implement `context.ts` - EmitContext type and helper functions (include indentString config)
- [x] Implement `reserved-words.ts` - JS reserved words set and escapeIdentifier()
- [x] Implement `emit-operators.ts` - Precedence table and needsParens()
- [x] Implement `tests/test-helpers.ts` - createTestContext(), generateExpr()
- [x] Write `tests/reserved-words.test.ts`
- [x] Write `tests/operators.test.ts` (precedence tests)

## Phase 2: Expression Emission - Literals & Variables
**Status:** ✅ Done

- [x] Create `emit-expressions.ts` with emitExpr() dispatcher
- [x] Implement CoreIntLit emission (including negative wrapping)
- [x] Implement CoreFloatLit emission (including Infinity, -Infinity, NaN, -0)
- [x] Implement CoreStringLit emission (with proper escaping)
- [x] Implement string escape helper (\\n, \\t, \\r, \\\\, \\", U+2028, U+2029, control chars)
- [x] Implement CoreBoolLit emission
- [x] Implement CoreUnitLit emission
- [x] Implement CoreVar emission (with reserved word escaping)
- [x] Implement CoreVar external lookup (check TypeEnv for External/ExternalOverload, use jsName)
- [x] Write `tests/expressions.test.ts` - Literals section

## Phase 3: Expression Emission - Operators
**Status:** ✅ Done

- [x] Implement CoreBinOp emission with precedence handling
- [x] Handle Add, Subtract, Multiply, Modulo
- [x] Handle IntDivide (Math.trunc)
- [x] Handle FloatDivide (direct division)
- [x] Handle unlowered Divide (throw internal error - typechecker bug)
- [x] Handle Equal, NotEqual (primitive vs composite detection via TypeEnv)
- [x] Implement `getExprType()` helper for $eq detection using TypeEnv and declarationTypes
- [x] Handle comparison operators (LessThan, LessEqual, etc.)
- [x] Handle LogicalAnd, LogicalOr (short-circuit)
- [x] Handle Concat (string +)
- [x] Handle RefAssign (context-dependent)
- [x] Implement CoreUnaryOp emission
- [x] Handle Negate, LogicalNot, Deref
- [x] Write `tests/expressions.test.ts` - Operators section

## Phase 4: Expression Emission - Functions
**Status:** ✅ Done

- [x] Implement CoreLambda emission (arrow functions)
- [x] Implement CoreApp emission (curried calls - note: args is always single-element)
- [x] Implement CoreTuple emission (as arrays)
- [x] Write `tests/expressions.test.ts` - Functions section

## Phase 5: Pattern Emission
**Status:** 🔜 Not Started

- [ ] Create `emit-patterns.ts` with DI setup
- [ ] Implement emitPattern() for destructuring contexts
- [ ] Implement emitMatchPattern() for match case contexts
- [ ] Implement CoreWildcardPattern
- [ ] Implement CoreVarPattern
- [ ] Implement CoreLiteralPattern (handle `null` → `undefined` for unit)
- [ ] Implement CoreTuplePattern
- [ ] Implement CoreRecordPattern
- [ ] Implement CoreVariantPattern (tag checking + field extraction)
- [ ] Wire up DI between expressions and patterns
- [ ] Write `tests/patterns.test.ts`

## Phase 6: Match Expressions
**Status:** 🔜 Not Started

- [ ] Implement CoreMatch emission (IIFE with if-chain)
- [ ] Handle pattern matching with bindings
- [ ] Handle guard expressions
- [ ] Handle nested patterns
- [ ] Handle exhaustiveness fallback (throw)
- [ ] Write `tests/expressions.test.ts` - Match section

## Phase 7: Let Expressions and Mutability
**Status:** 🔜 Not Started

- [ ] Implement `runtime-helpers.ts` - ref() and $eq() generation
- [ ] Implement CoreLet in statement context (const declaration)
- [ ] Implement CoreLet in expression context (IIFE)
- [ ] Implement CoreLet with pattern destructuring
- [ ] Implement CoreLet with mutable: true
- [ ] Implement CoreLet with recursive: true
- [ ] Implement CoreLetRecExpr (mutual recursion in expression context - IIFE with let declarations)
- [ ] Track needsRefHelper usage
- [ ] Write `tests/expressions.test.ts` - Let section

## Phase 8: Records and Variants
**Status:** 🔜 Not Started

- [ ] Implement CoreRecord emission (object literals)
- [ ] Handle CoreRecordField (named fields)
- [ ] Handle CoreRecordField spread
- [ ] Implement CoreRecordAccess emission (dot notation)
- [ ] Implement CoreRecordUpdate emission (spread + updates)
- [ ] Implement CoreVariant emission (tagged objects)
- [ ] Handle zero-arg constructors (emit as object literal, not function)
- [ ] Handle multi-arg constructors (emit as curried function returning tagged object)
- [ ] Write `tests/expressions.test.ts` - Records/Variants section

## Phase 9: Type Annotations and Unsafe
**Status:** 🔜 Not Started

- [ ] Implement CoreTypeAnnotation emission (pass through)
- [ ] Implement CoreUnsafe emission (pass through)
- [ ] Write tests for annotation/unsafe pass-through

## Phase 10: Declaration Emission
**Status:** 🔜 Not Started

- [ ] Create `emit-declarations.ts` with DI setup
- [ ] Implement CoreLetDecl emission
- [ ] Handle exported declarations (collect exports)
- [ ] Implement `extractPatternNames()` helper for pattern destructuring exports
- [ ] Handle pattern destructuring in declarations (export all bound names)
- [ ] Implement CoreLetRecGroup emission (use let declarations for forward references)
- [ ] Implement CoreTypeDecl emission (variant constructors only)
- [ ] Handle record types (no output)
- [ ] Handle type aliases (no output)
- [ ] Implement CoreExternalDecl emission
- [ ] Handle ExternalOverload bindings (same jsName, different type signatures)
- [ ] Handle dotted JS names (Math.floor)
- [ ] Handle module imports
- [ ] Implement CoreExternalTypeDecl (no output)
- [ ] Implement CoreImportDecl emission
- [ ] Handle type-only import filtering
- [ ] Handle ALL type-only imports (emit no import statement)
- [ ] Handle import path extension (.js)
- [ ] Write `tests/declarations.test.ts`

## Phase 11: Generator Integration
**Status:** 🔜 Not Started

- [ ] Create `generator.ts` - ES2020Generator class
- [ ] Implement generate() method
- [ ] Implement header comment emission
- [ ] Implement import collection and emission
- [ ] Implement import deduplication (same module, multiple items; type+value → value)
- [ ] Implement declaration emission loop
- [ ] Implement runtime helper tracking (needsEqHelper, needsRefHelper)
- [ ] Implement runtime helper emission (conditional, at top after imports)
- [ ] Implement export collection during declaration emission
- [ ] Implement export statement emission at end of module (`export { ... }`)
- [ ] Handle empty modules (emit valid JS with just header)
- [ ] Create `es2020/index.ts` - public API
- [ ] Update `codegen/index.ts` - target selection
- [ ] Wire up all DI dependencies
- [ ] Add internal error handling for unknown AST node kinds

## Phase 12: Structural Equality
**Status:** 🔜 Not Started

- [ ] Implement $eq helper generation in runtime-helpers.ts
- [ ] Track needsEqHelper during emission
- [ ] Emit $eq only when needed
- [ ] Handle primitive equality (use ===) - Int, Float, String, Bool, Unit
- [ ] Handle composite equality (use $eq) - records, variants, tuples, lists
- [ ] Handle type variable case (conservatively use $eq)
- [ ] Write equality edge case tests (NaN, refs, nested structures)

## Phase 13: Unit Test Completion
**Status:** 🔜 Not Started

- [ ] Complete `tests/expressions.test.ts`
- [ ] Complete `tests/patterns.test.ts`
- [ ] Complete `tests/declarations.test.ts`
- [ ] Complete `tests/operators.test.ts`
- [ ] Complete `tests/reserved-words.test.ts`
- [ ] Achieve target coverage

## Phase 14: Snapshot Tests
**Status:** 🔜 Not Started

- [ ] Create `snapshot-tests/test-helpers.ts` - compileFixture()
- [ ] Create `snapshot-tests/expressions.vf` fixture
- [ ] Create `snapshot-tests/snapshot-expressions.test.ts`
- [ ] Create `snapshot-tests/declarations.vf` fixture
- [ ] Create `snapshot-tests/snapshot-declarations.test.ts`
- [ ] Create `snapshot-tests/patterns.vf` fixture
- [ ] Create `snapshot-tests/snapshot-patterns.test.ts`
- [ ] Create `snapshot-tests/functions.vf` fixture
- [ ] Create `snapshot-tests/snapshot-functions.test.ts`
- [ ] Create `snapshot-tests/data-structures.vf` fixture
- [ ] Create `snapshot-tests/snapshot-data-structures.test.ts`
- [ ] Create `snapshot-tests/real-world.vf` fixture
- [ ] Create `snapshot-tests/snapshot-real-world.test.ts`
- [ ] Generate and review initial snapshots

## Phase 14B: Execution Tests (NEW)
**Status:** 🔜 Not Started

Uses Node's `vm` module for sandboxed execution of generated JavaScript.

- [ ] Create `tests/execution-test-helpers.ts` - compileAndRun() using vm.createContext()
- [ ] Implement export statement stripping for vm execution (ES modules not supported in vm)
- [ ] Create `tests/execution.test.ts`
- [ ] Test curried function application
- [ ] Test pattern matching with guards
- [ ] Test short-circuit evaluation (&&, ||)
- [ ] Test mutable reference operations (ref, !, :=)
- [ ] Test NaN equality semantics
- [ ] Test integer division truncation (negative numbers)
- [ ] Test record structural equality
- [ ] Test variant structural equality
- [ ] Test tuple structural equality
- [ ] Test zero-arg variant constructor usage (None, Nil)
- [ ] Test mutual recursion (let rec ... and ...)
- [ ] Test nested pattern matching with variable extraction

## Phase 15: Polish and Edge Cases
**Status:** 🔜 Not Started

- [ ] Handle empty modules
- [ ] Handle deeply nested structures
- [ ] Verify indentation is correct
- [ ] Test all JavaScript reserved words
- [ ] Test Unicode identifiers
- [ ] Test string escape sequences (\\n, \\t, \\r, \\\\, \\", control chars)
- [ ] Test U+2028 and U+2029 line separator escaping (critical edge case)
- [ ] Test operator precedence edge cases
- [ ] Test NaN equality behavior
- [ ] Test negative zero (-0) handling
- [ ] Test -Infinity handling
- [ ] Run `npm run verify` - all checks pass
- [ ] Document any limitations

---

## Progress Summary

| Phase | Status | Tasks |
|-------|--------|-------|
| 1. Core Infrastructure | ✅ | 10/10 |
| 2. Literals & Variables | ✅ | 10/10 |
| 3. Operators | ✅ | 14/14 |
| 4. Functions | ✅ | 4/4 |
| 5. Patterns | 🔜 | 0/11 |
| 6. Match Expressions | 🔜 | 0/6 |
| 7. Let & Mutability | 🔜 | 0/9 |
| 8. Records & Variants | 🔜 | 0/9 |
| 9. Annotations | 🔜 | 0/3 |
| 10. Declarations | 🔜 | 0/20 |
| 11. Generator Integration | 🔜 | 0/15 |
| 12. Structural Equality | 🔜 | 0/7 |
| 13. Unit Tests | 🔜 | 0/6 |
| 14. Snapshot Tests | 🔜 | 0/14 |
| 14B. Execution Tests | 🔜 | 0/15 |
| 15. Polish | 🔜 | 0/13 |

**Overall:** 38/166 tasks complete (23%)
