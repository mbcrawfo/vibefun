# Testing Gaps — Vibefun Spec ↔ Test Coverage

Aggregate of features that are implemented but lack adequate test coverage at one or more layers. Each entry cites the per-section doc and F-NN ID.

## Summary

- Total ❌ Untested features: 28
- Total ⚠️ Thin features: 95
- Sections with 0 testing gaps: (none — every audited section reports at least one gap)
- Sections with most testing gaps: `02-lexical-structure.md` (33), `04a-expressions-core.md` (24), `11b-stdlib-extra.md` (20)

## Layer-Tagging Rubric

For each gap, tag the missing layer(s) so remediation work knows where to add tests:

- **U** — Unit (colocated `*.test.ts` next to implementation)
- **I** — Integration (parser-integration, desugarer-integration, codegen execution-tests)
- **S** — Snapshot (parser/codegen snapshot-tests/)
- **E** — E2E (`tests/e2e/*.test.ts` outside spec-validation)
- **V** — Spec-validation (`tests/e2e/spec-validation/NN-*.test.ts`)
- **P** — Property (uses fast-check arbitraries)

Write the tag(s) alongside each entry, e.g. `[V, P]` for "missing in spec-validation and property layers".

## Gaps by Section

### 02 Lexical Structure

- **F-01** (`02-lexical-structure.md`) — Source file extension and encoding: no test for `.vf` extension or UTF-8 decoding paths. Layers missing: [U, V]. Suggested test: feed CLI a non-`.vf` path and assert error; lex a UTF-8 BOM-prefixed file.
- **F-02** (`02-lexical-structure.md`) — Unicode NFC normalization for identifiers: no test verifying `café` (precomposed) and `café` (decomposed) tokenize to same identifier. Layers missing: [U, V, P]. Suggested test: unit assertion comparing tokens for both decompositions.
- **F-03** (`02-lexical-structure.md`) — Line endings (CRLF): only CR-as-whitespace tested; no CRLF-pair line-ending test. Layers missing: [U, I]. Suggested test: feed `let x = 1;\r\nlet y = 2;` and confirm two NEWLINE tokens collapse correctly.
- **F-04** (`02-lexical-structure.md`) — Single-line comments: only happy path tested; missing edge cases (comment at EOF, empty comment, comment with special characters). Layers missing: [U]. Suggested test: lex `// \n` and EOF-terminated comment.
- **F-07** (`02-lexical-structure.md`) — Newlines not significant for parsing: no integration test that arbitrary newlines in operator chains don't break parsing. Layers missing: [I, V]. Suggested test: parse `1 +\n2\n* 3` and assert AST identity with single-line form.
- **F-08** (`02-lexical-structure.md`) — Explicit semicolons required: only spec-validation level coverage; no lexer-side test. Layers missing: [U]. Suggested test: assert SEMICOLON token emitted for every `;`.
- **F-09** (`02-lexical-structure.md`) — Multi-line expressions allowed without semicolons in middle: no lexer-specific test. Layers missing: [U, I]. Suggested test: lex multi-line list literal and confirm token stream.
- **F-10** (`02-lexical-structure.md`) — Empty blocks valid without semicolons: no lexer-specific test. Layers missing: [U]. Suggested test: tokenize `{}` and confirm LBRACE/RBRACE pair.
- **F-12** (`02-lexical-structure.md`) — Reserved keywords for future use: only 3 of 8 future keywords tested (async, await, return); missing trait, impl, where, do, yield. Layers missing: [V]. Suggested test: add spec-validation rejection cases for the 5 missing keywords.
- **F-13** (`02-lexical-structure.md`) — Keywords as record field names: lexer has no keyword-as-field-name unit test. Layers missing: [U]. Suggested test: tokenize `{ type: 1 }` and confirm KEYWORD token followed by COLON.
- **F-20** (`02-lexical-structure.md`) — Float literals - scientific notation with leading zeros: `1e010` not explicitly tested. Layers missing: [U, V]. Suggested test: lex `1e010` and assert numeric value 10^10.
- **F-28** (`02-lexical-structure.md`) — Unit literal: no test validating `()` is recognized as unit literal. Layers missing: [U, V]. Suggested test: parse `let x = ();` and confirm Unit AST node.
- **F-29** (`02-lexical-structure.md`) — Arithmetic operators: no dedicated spec-validation test; implicit coverage only. Layers missing: [V]. Suggested test: spec-validation case asserting tokenization of `+ - * / %`.
- **F-30** (`02-lexical-structure.md`) — Unary minus context-dependence: no test validating distinction between unary and binary minus. Layers missing: [U, V]. Suggested test: tokenize `-5` vs `1-5` and confirm same single OP_MINUS token.
- **F-31** (`02-lexical-structure.md`) — Comparison operators: no explicit longest-match disambiguation test (`==` vs two `=`). Layers missing: [U]. Suggested test: assert `==` emits OP_EQ not two OP_ASSIGN.
- **F-32** (`02-lexical-structure.md`) — Logical operators: no dedicated spec-validation test. Layers missing: [V]. Suggested test: spec-validation case for `&& || !`.
- **F-33** (`02-lexical-structure.md`) — String concatenation operator (`&`): no lexer-level test. Layers missing: [U, V]. Suggested test: tokenize `"a" & "b"` and confirm OP_AMPERSAND emission.
- **F-34** (`02-lexical-structure.md`) — Pipe operators: no spec-validation test. Layers missing: [V]. Suggested test: spec-validation case for `|> >> <<` tokens.
- **F-35** (`02-lexical-structure.md`) — Special operators (`-> => :: .`): no explicit longest-match test. Layers missing: [U]. Suggested test: assert `>>` is one token, not two `>`.
- **F-36** (`02-lexical-structure.md`) — Spread operator: no explicit longest-match test for `...` vs three `.`. Layers missing: [U]. Suggested test: tokenize `[...x]` and confirm SPREAD.
- **F-37** (`02-lexical-structure.md`) — Reference assignment operator (`:=`): no dedicated spec-validation test. Layers missing: [V]. Suggested test: spec-validation case for `:=` token.
- **F-38** (`02-lexical-structure.md`) — Dereference and NOT operator (`!` disambiguation): no test validating type-based disambiguation. Layers missing: [U, V]. Suggested test: spec-validation cases for `!ref(0)` and `!true`.
- **F-39** (`02-lexical-structure.md`) — Punctuation parens/braces/brackets: only implicit coverage. Layers missing: [V]. Suggested test: explicit spec-validation token assertion.
- **F-41** (`02-lexical-structure.md`) — Longest-match operator parsing algorithm: no explicit longest-match test case (e.g., `>>` vs two `>`). Layers missing: [U]. Suggested test: dedicated longest-match unit test for each multi-char operator.
- **F-42** (`02-lexical-structure.md`) — Invalid number format (multiple decimal points): no dedicated lexer error test. Layers missing: [U]. Suggested test: lex `1.2.3` and assert lex/parse error.
- **F-43** (`02-lexical-structure.md`) — Invalid scientific notation errors (`1e`, `1e+`, `3.14e2.5`): error implemented but never tested. Layers missing: [U, V]. Suggested test: assert VF1104 thrown for missing exponent digit.
- **F-44** (`02-lexical-structure.md`) — Invalid hex/binary digits: no explicit unit test for invalid hex/binary digit detection. Layers missing: [U]. Suggested test: lex `0xGHI` and `0b1012` and assert errors.
- **F-47** (`02-lexical-structure.md`) — Number size limits (`MAX_SAFE_INTEGER`): no test validates large integer handling or precision loss. Layers missing: [U, V, P]. Suggested test: property test that integers above 2^53 round-trip lossily but don't crash.
- **F-50** (`02-lexical-structure.md`) — Multi-line string without triple quotes: no explicit spec-validation test for the error. Layers missing: [V]. Suggested test: assert VF1001 thrown when newline appears inside `"..."`.

### 03a Types Core

- **F-10** (`03a-types-core.md`) — List element type homogeneity: only happy path tested; heterogeneous types like `[1, 2.0, 3]` not exercised. Layers missing: [U, V]. Suggested test: typecheck `[1, 2.0]` and assert error.
- **F-13** (`03a-types-core.md`) — Tuple type syntax: complex nested and polymorphic tuple types lack edge case tests. Layers missing: [U, V]. Suggested test: typecheck `((a, b), (c, d))` shapes.
- **F-15** (`03a-types-core.md`) — Nested tuple destructuring: deeply nested patterns (3+ levels) lack regression tests. Layers missing: [U, V, P]. Suggested test: pattern match `((a, b), (c, (d, e)))`.
- **F-21** (`03a-types-core.md`) — Tuple type equivalence error messages: error message formatting for arity/order mismatch lacks assertions. Layers missing: [U, V]. Suggested test: assert specific `expected (Int, String), got (String, Int)` text.
- **F-46** (`03a-types-core.md`) — String-literal type annotations: edge cases (nested unions, mixed-type unions, non-string literals) lack tests. Layers missing: [U, V]. Suggested test: typecheck nested literal-union annotation.

### 03b Types Composite

- **F-05** (`03b-types-composite.md`) — Keywords as record field names (explicit syntax): no E2E test constructing record with keyword field and accessing it. Layers missing: [V]. Suggested test: spec-validation case `let r = { type: "foo" }; r.type`.
- **F-09** (`03b-types-composite.md`) — Variant constructor functions (curried partial application): no explicit typechecker test of partial variant application. Layers missing: [U]. Suggested test: assert `let f = Rectangle(3.14); f(2.0)` types correctly.
- **F-13** (`03b-types-composite.md`) — Union types for variant constructors: no dedicated union-type unification test. Layers missing: [U, V]. Suggested test: parse + unify standalone union type independent of variant.
- **F-19** (`03b-types-composite.md`) — Function type variance (lack thereof): no explicit test asserting `(Point3D) -> Int` ≠ `(Point2D) -> Int` even with width subtyping at call sites. Layers missing: [V]. Suggested test: spec-validation expectCompileError on function-assignment incompatibility.

### 03c Types Errors

- **F-03** (`03c-types-errors.md`) — Deterministic error ordering: no test verifies same source produces errors in same order across runs. Layers missing: [U, V]. Suggested test: run typechecker twice on multi-error fixture and compare orders.
- **F-04** (`03c-types-errors.md`) — Multi-error reporting: no test of typechecker reporting 2+ independent errors in single pass. Layers missing: [U, V]. Suggested test: document current single-error-throw behavior with assertion.
- **F-10** (`03c-types-errors.md`) — Warning codes 900-999 range compliance: no test verifies warnings use the reserved range. Layers missing: [U]. Suggested test: assert all registered warnings have code mod 1000 ≥ 900.
- **F-11** (`03c-types-errors.md`) — Type display convention (Int, String, Bool, Float, Unit): no dedicated tests in diagnostics module (typechecker concern). Layers missing: [U]. Suggested test: snapshot test of formatted error containing primitives.
- **F-12** (`03c-types-errors.md`) — Type variable naming ('a', 'b', 'c' sequentially): no test for ordering convention. Layers missing: [U]. Suggested test: assert error message uses `'a` for first free variable.
- **F-18** (`03c-types-errors.md`) — IDE integration (JSON output, structured locations): no test verifies JSON serialization. Layers missing: [U, E]. Suggested test: serialize a Diagnostic to JSON and validate shape.
- **F-19** (`03c-types-errors.md`) — VFxxxx code registration: no test explicitly counts that all 127 codes register. Layers missing: [U]. Suggested test: assert `registry.size === 127`.
- **F-20** (`03c-types-errors.md`) — Documentation code lookup: no test verifies `docs/errors/` is in sync with code definitions. Layers missing: [E]. Suggested test: CI step running `pnpm docs:errors` and failing on diff.
- **F-22** (`03c-types-errors.md`) — VF4001-VF4018 type mismatch codes: tested E2E but no individual unit tests per code. Layers missing: [U]. Suggested test: per-code factory test asserting message + hint.
- **F-23** (`03c-types-errors.md`) — VF4020-VF4027 unification codes: defined but no unit tests per code. Layers missing: [U]. Suggested test: per-code factory test.
- **F-24** (`03c-types-errors.md`) — VF4100-VF4103 undefined codes: defined but no individual unit tests. Layers missing: [U]. Suggested test: per-code factory test.
- **F-25** (`03c-types-errors.md`) — VF4200-VF4205 arity codes: used in E2E but not unit tested individually. Layers missing: [U]. Suggested test: per-code factory test.
- **F-26** (`03c-types-errors.md`) — VF4300-VF4301 infinite/recursive type codes: defined but never asserted. Layers missing: [U, I, V]. Suggested test: typecheck `type T = T` and assert VF4301; assert occurs-check throws VF4300.
- **F-27** (`03c-types-errors.md`) — VF4400-VF4405 pattern matching codes: lack dedicated unit tests. Layers missing: [U]. Suggested test: per-code factory test.
- **F-28** (`03c-types-errors.md`) — VF4500-VF4504 record codes: used in E2E but no per-code unit tests. Layers missing: [U]. Suggested test: per-code factory test.
- **F-29** (`03c-types-errors.md`) — VF4600-VF4602 variant codes: used in E2E but no unit tests. Layers missing: [U]. Suggested test: per-code factory test.
- **F-30** (`03c-types-errors.md`) — VF4700-VF4701 polymorphism codes (ValueRestriction, TypeEscape): TypeEscape never asserted; ValueRestriction only indirectly. Layers missing: [U, V]. Suggested test: VF4701 trigger via type-escape scenario.
- **F-31** (`03c-types-errors.md`) — VF4800-VF4806 FFI codes: VF4800/4801/4802/4803/4804 never asserted. Layers missing: [U, V]. Suggested test: per-code factory test plus E2E rejection cases.
- **F-32** (`03c-types-errors.md`) — VF4900 unreachable pattern warning: defined but not asserted as warning emission. Layers missing: [U, V]. Suggested test: pattern after wildcard yields VF4900 warning collected (not thrown).
- **F-34** (`03c-types-errors.md`) — VF5102 DuplicateDeclaration: unit tested but no E2E test. Layers missing: [V]. Suggested test: spec-validation case declaring same non-external function twice.
- **F-35** (`03c-types-errors.md`) — VF5901 CaseSensitivityMismatch warning: minimally tested. Layers missing: [E, V]. Suggested test: e2e fixture with case-mismatched import path on case-sensitive FS.

### 04a Expressions Core

- **F-08** (`04a-expressions-core.md`) — Partial application (currying): only implicit coverage via multi-arg calls; no explicit partial application test. Layers missing: [V]. Suggested test: `let add5 = add(5); expectRunOutput(..., "8")`.
- **F-15** (`04a-expressions-core.md`) — Division by zero (runtime panic): not explicitly tested; relies on JavaScript runtime. Layers missing: [V]. Suggested test: `expectRuntimeError('let x = 10 / 0;')`.
- **F-16** (`04a-expressions-core.md`) — Integer overflow: no explicit overflow test. Layers missing: [U, V, P]. Suggested test: property test at safe-integer boundary.
- **F-23** (`04a-expressions-core.md`) — Chained comparisons not supported: parse-level works; type-check error not explicitly asserted. Layers missing: [V]. Suggested test: spec-validation expectCompileError on `1 < x < 10`.
- **F-26** (`04a-expressions-core.md`) — Logical NOT on Ref<T> (deref disambiguation): not tested in 04-expressions tests. Layers missing: [V]. Suggested test: cross-validate `!` on Ref in 04 spec-validation.
- **F-28** (`04a-expressions-core.md`) — Field access operator: no basic field access test in this section. Layers missing: [V]. Suggested test: spec-validation case for `record.field` chained access.
- **F-29** (`04a-expressions-core.md`) — Pipe operator: tested at desugarer level but no E2E in 04-expressions. Layers missing: [V]. Suggested test: spec-validation case for `data |> f |> g` runtime output.
- **F-30** (`04a-expressions-core.md`) — List cons operator: not tested in 04-expressions section. Layers missing: [V]. Suggested test: spec-validation case for `1 :: [2, 3]`.
- **F-31** (`04a-expressions-core.md`) — Function composition operators (`>>`/`<<`): not tested in 04-expressions E2E. Layers missing: [V]. Suggested test: spec-validation case asserting evaluation order.
- **F-36** (`04a-expressions-core.md`) — If expression short-circuit evaluation: not explicitly tested with side effects. Layers missing: [V]. Suggested test: ref-based counter to verify only one branch executes.
- **F-38** (`04a-expressions-core.md`) — Match expression guards: no explicit guard test in 04-expressions. Layers missing: [V]. Suggested test: spec-validation case for `match x { | n when n > 0 => ... }`.
- **F-40** (`04a-expressions-core.md`) — While loop condition/body type errors: not explicitly tested. Layers missing: [V]. Suggested test: `expectCompileError('while 42 { () };')` and `expectCompileError('while true { 42; };')`.
- **F-43** (`04a-expressions-core.md`) — Try/catch in unsafe blocks: no E2E test in 04-expressions. Layers missing: [V]. Suggested test: spec-validation case for try/catch inside unsafe.
- **F-44** (`04a-expressions-core.md`) — Evaluation order general principles: not explicitly validated with side effects. Layers missing: [V]. Suggested test: ref-counter test for left-to-right evaluation.
- **F-45** (`04a-expressions-core.md`) — Function application argument evaluation order: not explicitly tested. Layers missing: [V, P]. Suggested test: side-effect order test asserting args evaluated left-to-right.
- **F-46** (`04a-expressions-core.md`) — Binary operator evaluation order: not explicitly tested. Layers missing: [V]. Suggested test: side-effect ordering for `f() + g()`.
- **F-49** (`04a-expressions-core.md`) — Record construction evaluation order: not tested in this section. Layers missing: [V]. Suggested test: side-effect order for record fields.
- **F-50** (`04a-expressions-core.md`) — List construction evaluation order: not tested in this section. Layers missing: [V]. Suggested test: side-effect order for list elements.
- **F-51** (`04a-expressions-core.md`) — If expression evaluation order: implicit only. Layers missing: [V]. Suggested test: side-effect-based assertion that only one branch runs.
- **F-52** (`04a-expressions-core.md`) — Match expression scrutinee-once evaluation: not explicitly tested. Layers missing: [V]. Suggested test: side-effect counter showing scrutinee evaluated exactly once.
- **F-54** (`04a-expressions-core.md`) — Block expression sequential evaluation: implicit in block tests but not explicitly validated. Layers missing: [V]. Suggested test: side-effect-ordered block.
- **F-55** (`04a-expressions-core.md`) — Pipe operator evaluation order: tested at desugarer level only. Layers missing: [V]. Suggested test: spec-validation pipe evaluation order.
- **F-56** (`04a-expressions-core.md`) — Reference creation/assignment evaluation order: not tested in this section. Layers missing: [V]. Suggested test: spec-validation case asserting RHS evaluated before assignment.

### 04b Expressions Data Literals & Functions

- **F-04** (`04b-expressions-data-fns.md`) — Field shorthand type inference: no test that field inherits variable type. Layers missing: [U, V]. Suggested test: assert inferred field type matches bound variable type.
- **F-05** (`04b-expressions-data-fns.md`) — Keywords as record field names: no E2E test of keyword field construction/access. Layers missing: [U, V]. Suggested test: `{ type: "foo" }` round-trip.
- **F-07** (`04b-expressions-data-fns.md`) — Empty list value restriction: no isolated test confirming empty list binding triggers monomorphic type. Layers missing: [U, V]. Suggested test: assert `let xs = [];` is monomorphic.
- **F-09** (`04b-expressions-data-fns.md`) — Cons operator as standalone expression: only pattern-matching context tested. Layers missing: [V]. Suggested test: e2e for `let xs = 1 :: [2, 3]`.
- **F-10** (`04b-expressions-data-fns.md`) — Multi-line list syntax: only implicit snapshot coverage. Layers missing: [V]. Suggested test: spec-validation multi-line list literal.
- **F-15** (`04b-expressions-data-fns.md`) — Lambda type annotations enforcement: no e2e test verifying typechecker rejects wrong-type call. Layers missing: [V]. Suggested test: `((x: Int) => x)("a")` should fail.
- **F-16** (`04b-expressions-data-fns.md`) — Lambda destructuring parameters: no e2e test for destructuring in lambda. Layers missing: [V]. Suggested test: `({x, y}) => x + y` end-to-end.
- **F-17** (`04b-expressions-data-fns.md`) — Lambda cannot be recursive: no test verifying recursive lambda is rejected. Layers missing: [U, V]. Suggested test: `let fact = (n) => fact(n-1)` should fail with undefined.
- **F-18** (`04b-expressions-data-fns.md`) — Operator sections not supported: no test confirming `(+)` or `(1 +)` produces error. Layers missing: [U, V]. Suggested test: spec-validation expectCompileError for operator section.
- **F-22** (`04b-expressions-data-fns.md`) — Block sequential execution: no isolated test verifying side-effect ordering. Layers missing: [V]. Suggested test: ordered ref-mutation block.

### 05 Pattern Matching

- **F-28** (`05-pattern-matching.md`) — Pattern nesting depth: no explicit deep-nesting test (>10 levels). Layers missing: [P]. Suggested test: property test generating deeply nested patterns.
- **F-35** (`05-pattern-matching.md`) — Tuple exhaustiveness (Phase 5.1 limitation): no test that pairwise non-exhaustive tuple does not error. Layers missing: [V]. Suggested test: assert `match (a, b) { | (true, _) => 1 | (false, _) => 2 }` accepted (currently catch-all required).
- **F-51** (`05-pattern-matching.md`) — Or-pattern type compatibility: no explicit test of cross-alternative type unification. Layers missing: [U, V]. Suggested test: `| 0 | "zero"` should fail with type error.

### 06 Functions

- **F-06** (`06-functions.md`) — Arity validation error messages: error condition tested but message content not validated. Layers missing: [U]. Suggested test: assert exact diagnostic code and message for arity mismatch.
- **F-21** (`06-functions.md`) — Polymorphic recursion prohibition: no explicit test rejecting polymorphic recursion. Layers missing: [U, V]. Suggested test: dedicated test asserting unification failure with helpful error.
- **F-24** (`06-functions.md`) — Name shadowing in function scopes: shadowing supported but not explicitly tested. Layers missing: [U, V]. Suggested test: bind parameter same as outer; assert inner used.

### 07 Mutable References

- **F-10** (`07-mutable-references.md`) — Composite types/variants in refs: minimal unit/integration coverage; only basic E2E tests. Layers missing: [U, I]. Suggested test: unit tests with refs to records-with-fields, refs to variants, refs in lists.
- **F-11** (`07-mutable-references.md`) — Pattern matching on refs forbidden without deref: no test validates the error message/code for direct pattern match on Ref. Layers missing: [V]. Suggested test: `match someRef { | Some(x) => ... }` and assert specific type-mismatch error.
- **F-14** (`07-mutable-references.md`) — Reassignment of mutable binding: not explicitly tested in any layer. Layers missing: [U, V]. Suggested test: `let mut x = ref(0); x = ref(10);` end-to-end.

### 08 Modules

- **F-06** (`08-modules.md`) — Named imports with rename (`as`): parser/codegen-tested but no explicit spec-validation case. Layers missing: [V]. Suggested test: `import { x as y } from "./lib"; let z = y;`.
- **F-23** (`08-modules.md`) — Error propagation during module initialization: e2e test covers unsafe block errors but spec-validation lacks test. Layers missing: [V]. Suggested test: spec-validation case for dependency throw at init.
- **F-26** (`08-modules.md`) — Re-export with alias: codegen-tested but no spec-validation. Layers missing: [V]. Suggested test: `export { x as y } from "./lib"` and verify accessibility under `y`.
- **F-29** (`08-modules.md`) — Transitive re-exports: unit-tested but no end-to-end multi-level test. Layers missing: [V]. Suggested test: a→b→c→main re-export chain with usage.
- **F-30** (`08-modules.md`) — Circular dependency initialization (deferred bindings): runtime-correct when called later, but no test that top-level call within cycle fails with `undefined`. Layers missing: [V]. Suggested test: `let result = functionB(10);` at module top-level in cycle should fail.

### 09 Error Handling

- **F-07** (`09-error-handling.md`) — Result.unwrap error message: exception thrown but message not validated against spec. Layers missing: [U]. Suggested test: assert thrown message matches spec text.
- **F-13** (`09-error-handling.md`) — Option.unwrap error message: exception thrown but message not validated. Layers missing: [U]. Suggested test: assert thrown message matches spec text.
- **F-18** (`09-error-handling.md`) — Integer overflow semantics: no explicit test of overflow above Number.MAX_SAFE_INTEGER. Layers missing: [U, V, P]. Suggested test: property test at safe-integer boundary.
- **F-21** (`09-error-handling.md`) — `panic` function behavior: type signature tested but no end-to-end call validating thrown Error message. Layers missing: [V]. Suggested test: `panic("msg")` inside unsafe block; assert Error and message.
- **F-24** (`09-error-handling.md`) — Panic as last resort (unwrap message): hardcoded message in unwrap not validated against spec recommendation. Layers missing: [U]. Suggested test: assert message preserved through stack trace.
- **F-26** (`09-error-handling.md`) — Panic on unwrap failures: hardcoded messages not asserted against spec. Layers missing: [U]. Suggested test: regex-match or exact-string assertion on panic message.
- **F-27** (`09-error-handling.md`) — Stack overflow JS error message: not tested. Layers missing: [E]. Suggested test: deep-recursion fixture asserting "Maximum call stack size exceeded" surfaces.

### 10 JavaScript Interop

- **F-03** (`10-javascript-interop.md`) — Arity-based external overloading (parser only): typechecker creates multiple bindings but no resolution test. Layers missing: [V]. Suggested test: spec-validation case asserting parsed multiple overloads stored.
- **F-04** (`10-javascript-interop.md`) — Restriction: only externals can be overloaded: no explicit test that pure functions cannot be overloaded. Layers missing: [U, V]. Suggested test: declare two `let f = ...` with same name and assert error.
- **F-05** (`10-javascript-interop.md`) — Overload validation (same jsName VF4801): error code defined but never thrown; no test. Layers missing: [U, V]. Suggested test: declare two overloads with different jsNames; assert VF4801.
- **F-06** (`10-javascript-interop.md`) — Overload validation (same from VF4802): error code defined but never thrown. Layers missing: [U, V]. Suggested test: declare two overloads with different `from` clauses; assert VF4802.
- **F-07** (`10-javascript-interop.md`) — Overload type-shape validation (VF4803): error code defined but never thrown. Layers missing: [U, V]. Suggested test: two non-function externals with same name; assert VF4803.
- **F-18** (`10-javascript-interop.md`) — Opaque type Json: no integration tests; only catch-binder type asserted. Layers missing: [V]. Suggested test: external returning Json + parse + access.
- **F-19** (`10-javascript-interop.md`) — Opaque type JsObject: no integration tests. Layers missing: [V]. Suggested test: external returning JsObject and using through interop.
- **F-20** (`10-javascript-interop.md`) — Opaque type Promise<T>: thin coverage; no async-flow tests. Layers missing: [V]. Suggested test: spec-validation Promise<Response> wiring.
- **F-21** (`10-javascript-interop.md`) — Opaque type Error: no tests. Layers missing: [U, V]. Suggested test: assert Error type unifies in catch binder.
- **F-22** (`10-javascript-interop.md`) — Opaque type Any: no unification tests. Layers missing: [U, V]. Suggested test: assert Any unifies with various concrete types.
- **F-25** (`10-javascript-interop.md`) — Handling JS null/undefined via Option: no test validating null → None pattern. Layers missing: [V]. Suggested test: external returning `Option<T>` for nullable JS function; assert None on null.
- **F-30** (`10-javascript-interop.md`) — Arity-based overload resolution at call site: VF4804 says "not yet supported"; no resolution test. Layers missing: [U, V]. Suggested test: once implemented, spec-validation case selecting overload by arity.
- **F-31** (`10-javascript-interop.md`) — Parser error VF2007 (missing semicolon in external block): enforced but no dedicated test. Layers missing: [U]. Suggested test: parse external block missing semicolons; assert VF2007.

### 11a Stdlib Core

- **F-10** (`11a-stdlib-core.md`) — List.flatten: missing fixed unit tests for spec examples (empty outer, empty inners, two-level confirmation). Layers missing: [U]. Suggested test: `flatten([])`, `flatten([[], []])`, `flatten([[[1]], [[2]]])` (one level only).
- **F-29** (`11a-stdlib-core.md`) — String.split: no edge case tests (empty input, empty separator). Layers missing: [U]. Suggested test: `split("", ",")` and `split("hello", "")`.
- **F-30** (`11a-stdlib-core.md`) — String.contains: no test for empty substring case. Layers missing: [U]. Suggested test: `contains("hello", "") === true`.
- **F-31** (`11a-stdlib-core.md`) — String.startsWith: no test for empty prefix or longer-than-string prefix. Layers missing: [U]. Suggested test: `startsWith("hi", "")` and `startsWith("hi", "hello")`.
- **F-32** (`11a-stdlib-core.md`) — String.endsWith: no test for empty suffix or longer-than-string suffix. Layers missing: [U]. Suggested test: same shape as F-31 for endsWith.

### 11b Stdlib Extra

- **F-01** (`11b-stdlib-extra.md`) — Int.toString: no property tests for safe-integer boundaries (MIN/MAX_SAFE_INTEGER). Layers missing: [P]. Suggested test: property over safe integer range.
- **F-06** (`11b-stdlib-extra.md`) — Float.toString: no spec-validation; formatting stability not asserted. Layers missing: [V]. Suggested test: spec-validation case asserting deterministic format.
- **F-15** (`11b-stdlib-extra.md`) — Math.pi: only identity-with-JS test; no spec-validation. Layers missing: [V]. Suggested test: spec-validation case using pi in computation.
- **F-16** (`11b-stdlib-extra.md`) — Math.e: only identity-with-JS test; no spec-validation. Layers missing: [V]. Suggested test: spec-validation case using e in computation.
- **F-17** (`11b-stdlib-extra.md`) — Math.sin: only Pythagorean-identity property; no specific-value tests. Layers missing: [U, V]. Suggested test: assert sin(0)=0, sin(π/2)≈1.
- **F-18** (`11b-stdlib-extra.md`) — Math.cos: only Pythagorean property; no specific-value tests. Layers missing: [U, V]. Suggested test: assert cos(0)=1, cos(π)≈-1.
- **F-19** (`11b-stdlib-extra.md`) — Math.tan: no tests at all. Layers missing: [U, V, P]. Suggested test: assert tan(0)=0; property tan = sin/cos.
- **F-20** (`11b-stdlib-extra.md`) — Math.asin: no tests. Layers missing: [U, V, P]. Suggested test: assert asin(sin(x))=x within domain.
- **F-21** (`11b-stdlib-extra.md`) — Math.acos: no tests. Layers missing: [U, V, P]. Suggested test: assert acos(cos(x))=x within domain.
- **F-22** (`11b-stdlib-extra.md`) — Math.atan: no tests. Layers missing: [U, V, P]. Suggested test: assert atan(tan(x))=x within domain.
- **F-23** (`11b-stdlib-extra.md`) — Math.atan2: only single test (0,1)→0. Layers missing: [U, V, P]. Suggested test: quadrant-coverage tests + property.
- **F-24** (`11b-stdlib-extra.md`) — Math.exp: only via log inverse property; no direct values. Layers missing: [U, V]. Suggested test: assert exp(0)=1, exp(1)=e.
- **F-25** (`11b-stdlib-extra.md`) — Math.log: no direct value tests. Layers missing: [U, V]. Suggested test: assert log(1)=0, log(e)=1.
- **F-26** (`11b-stdlib-extra.md`) — Math.log10: only base-change property; no direct values. Layers missing: [U, V]. Suggested test: assert log10(1)=0, log10(100)=2.
- **F-27** (`11b-stdlib-extra.md`) — Math.log2: only base-change property; no direct values. Layers missing: [U, V]. Suggested test: assert log2(1)=0, log2(8)=3.
- **F-28** (`11b-stdlib-extra.md`) — Math.pow: no spec-validation tests. Layers missing: [V]. Suggested test: spec-validation case for `pow(2, 10) === 1024`.
- **F-29** (`11b-stdlib-extra.md`) — Math.sqrt: no spec-validation tests. Layers missing: [V]. Suggested test: spec-validation case asserting sqrt(2) ≈ 1.414.
- **F-30** (`11b-stdlib-extra.md`) — Math.round (Float→Float): no direct tests. Layers missing: [U, V]. Suggested test: cover 0.5/1.5/-0.5 cases; assert returns Float.
- **F-31** (`11b-stdlib-extra.md`) — Math.floor (Float→Float): single fixed example only. Layers missing: [U, V]. Suggested test: edge cases (-0.0, integer values, large values).
- **F-32** (`11b-stdlib-extra.md`) — Math.ceil (Float→Float): single fixed example only. Layers missing: [U, V]. Suggested test: same shape as F-31.
- **F-33** (`11b-stdlib-extra.md`) — Math.trunc: only property test; no fixed examples. Layers missing: [U, V]. Suggested test: trunc(1.7)=1, trunc(-1.7)=-1.
- **F-35** (`11b-stdlib-extra.md`) — Math.sign: only property; no fixed examples for -1, 0, +1. Layers missing: [U, V]. Suggested test: assert sign(-3.14)=-1, sign(0)=0, sign(2.5)=1.
- **F-36** (`11b-stdlib-extra.md`) — Math.min (Float): no spec-validation. Layers missing: [V]. Suggested test: spec-validation case for `min(2.5)(1.0)`.
- **F-37** (`11b-stdlib-extra.md`) — Math.max (Float): no spec-validation. Layers missing: [V]. Suggested test: spec-validation case for `max(2.5)(1.0)`.
- **F-38** (`11b-stdlib-extra.md`) — Math.random: impure; no test layer. Layers missing: [V]. Suggested test: spec-validation inside unsafe asserting two calls produce floats in [0, 1) (best-effort).

### 12 Compilation

- **F-11** (`12-compilation.md`) — Pattern guard evaluation: basic guards tested; missing complex overlapping patterns with multiple guards. Layers missing: [U, I]. Suggested test: nested patterns + overlapping guards.
- **F-13** (`12-compilation.md`) — If-without-else (UnitLit injection): integration tests cover this implicitly but no dedicated snapshot test asserting else branch is UnitLit. Layers missing: [S]. Suggested test: snapshot of parsed `if c then e` showing inserted UnitLit.
- **F-19** (`12-compilation.md`) — Source maps support: documented in CLI but never tested (also a feature gap). Layers missing: [E, V]. Suggested test: once implemented, validate `--source-maps` produces `.map` file.
- **F-38** (`12-compilation.md`) — Guard evaluation/fallthrough: same as F-11; no tests for guard-failure-continues-to-next-pattern semantics. Layers missing: [U, I]. Suggested test: pattern with failing guard followed by successful pattern.

### 13 Appendix

- **F-19** (`13-appendix.md`) — Pipe operator edge cases: thin coverage; no explicit composition-precedence-interaction test. Layers missing: [U, V]. Suggested test: `f >> g |> value` parses as `(f >> g) |> value`.
- **F-25** (`13-appendix.md`) — Keywords table completeness: documentation gap (`try`, `catch` missing from table) but also no enumeration test. Layers missing: [U]. Suggested test: assert KEYWORDS set matches documented table 1:1.
- **F-31** (`13-appendix.md`) — Composition operators precedence: snapshot-tested but no focused operator-semantics tests. Layers missing: [U, V]. Suggested test: composed function applied at different precedence neighbours.
- **F-33** (`13-appendix.md`) — List indexing operator (`[]`): tests sparse; record indexing path largely untested. Layers missing: [U, V]. Suggested test: indexing on records and error cases.
- **F-36** (`13-appendix.md`) — Pipe operator precedence interaction: thin coverage. Layers missing: [U, V]. Suggested test: explicit precedence assertion `f >> g |> value`.

## Cross-Cutting Test Gaps

Pull from `cross-cutting.md`:

- **F-CC06** Source arbitrary (`source-arb.ts`): no meta-test (`source-arb.test.ts` missing). Risk: silently-broken generator wouldn't be detected. Layers missing: [U]. Suggested test: model after `token-arb.test.ts` to confirm totality and well-formedness.
- **F-CC07** Optimizable-expr arbitrary (`optimizable-expr-arb.ts`): no meta-test. Same risk as F-CC06. Layers missing: [U]. Suggested test: same shape as F-CC06.
- **F-CC09** Stdlib-sync expansion: when Array/Map/Set/Json land, the sync test must be expanded to gate them. Layers missing: [U]. Suggested action: extend `packages/core/src/typechecker/stdlib-sync.test.ts` in the same commit that introduces each missing module.
- **F-CC12** Module-loader fixture validation: no test asserts each fixture itself is a valid `.vf` project. Drift between fixture content and spec semantics would only surface indirectly via consuming tests. Layers missing: [U, I]. Suggested test: a meta-test that compiles every fixture under `__fixtures__/` and asserts no diagnostic.

## Notes on Distribution

The largest cluster of testing gaps lies in **02 lexical structure** (33 entries, dominated by missing tokenizer-level edge cases and operator-tokenization checks) and **04a expressions core** (24 entries, largely evaluation-order side-effect assertions that the spec promises but no test demonstrates with refs/console). The most under-tested *layer* is **V (spec-validation)** — appearing in roughly 70% of gap entries — because many features have unit/integration coverage but never get exercised through the full CLI pipeline. The **U (unit)** layer is the second most-tagged, especially in the diagnostics module (F-22 through F-31 in `03c-types-errors.md`), where 60+ typechecker error codes lack per-code factory tests.

A handful of features are missing across multiple layers simultaneously — notably the **Math trigonometric/inverse functions** (F-19 through F-22 in `11b-stdlib-extra.md`: tan/asin/acos/atan with **no tests at any layer**) and the **lexer NFC normalization paths** (F-02, F-27 in `02-lexical-structure.md`: implementation present but unverified at every layer). Most other gaps are single-layer omissions where one or two adjacent tests would close the loop.
