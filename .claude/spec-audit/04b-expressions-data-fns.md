# Audit: 04b Expressions Data Literals & Functions (04-expressions/data-literals.md, functions-composition.md)

## Sources Reviewed

**Spec files**:
- `docs/spec/04-expressions/data-literals.md` (562 lines)
- `docs/spec/04-expressions/functions-composition.md` (434 lines)

**Implementation files**:
- `packages/core/src/parser/parse-expression-primary.ts` (400+ lines)
- `packages/core/src/parser/parse-expression-complex.ts` (500+ lines)
- `packages/core/src/parser/parse-expression-lambda.ts` (300+ lines)
- `packages/core/src/desugarer/curryLambda.ts` (207 lines)
- `packages/core/src/desugarer/desugarBlock.ts` (86 lines)
- `packages/core/src/desugarer/buildConsChain.ts` (49 lines)
- `packages/core/src/desugarer/desugarListWithConcats.ts` (100+ lines)
- `packages/core/src/desugarer/desugarListLiteral.ts` (70+ lines)
- `packages/core/src/desugarer/desugarPipe.ts` (44 lines)
- `packages/core/src/desugarer/desugarComposition.ts` (96 lines)
- `packages/core/src/typechecker/infer/infer-functions.ts` (129 lines)
- `packages/core/src/codegen/es2020/emit-expressions/functions.ts` (57 lines)
- `packages/core/src/codegen/es2020/emit-expressions/collections.ts` (106 lines)
- `packages/core/src/codegen/es2020/emit-expressions/control.ts` (200+ lines)

**Test files**:
- Unit: `packages/core/src/desugarer/records.test.ts`, `lists.test.ts`, `list-spread.test.ts`, `lambdas.test.ts`, `curryLambda.test.ts`, `blocks.test.ts`, `pipes.test.ts`, `composition.test.ts`
- Snapshot: `packages/core/src/parser/snapshot-tests/snapshot-data-structures.test.ts`, `snapshot-functions.test.ts`
- Codegen: `packages/core/src/codegen/es2020/snapshot-tests/snapshot-data-structures.test.ts`, `snapshot-functions.test.ts`, `snapshot-expressions.test.ts`
- E2E/Spec-validation: `tests/e2e/spec-validation/04-expressions.test.ts`
- Integration: `packages/core/src/desugarer/desugarer-integration.test.ts`, `packages/core/src/desugarer/desugarer-structural.test.ts`

## Feature Inventory

### F-01: Record Literal Construction (positional fields)

- **Spec ref**: `docs/spec/04-expressions/data-literals.md:44-73` — Basic record construction with field: value syntax
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-expression-complex.ts:133-250` — parseRecordExpr entry and field parsing
  - `packages/core/src/parser/parse-expression-primary.ts:375-400+` — Record entry point in parsePrimary
  - `packages/core/src/desugarer/desugarer.ts` — desugar Record kind to CoreRecord
  - `packages/core/src/codegen/es2020/emit-expressions/collections.ts:28-43` — emitRecord generates JS object literal
- **Tests**:
  - Unit: `packages/core/src/desugarer/records.test.ts` (multiple test cases)
  - Snapshot: `packages/core/src/parser/snapshot-tests/snapshot-data-structures.test.ts:it("should parse data-structures.vf")`
  - E2E: `tests/e2e/spec-validation/04-expressions.test.ts:it("record literal")`
- **Coverage assessment**: ✅ Adequate
- **Notes**: Parser handles commas, trailing commas, multiline records; desugarer converts to CoreRecord with field list; codegen emits as JS object literal.

### F-02: Record Field Access

- **Spec ref**: `docs/spec/04-expressions/data-literals.md:75-91` — Dot notation field access
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-expression-operators.ts` — postfix dot field access parsing
  - `packages/core/src/desugarer/desugarer.ts` — desugar RecordAccess kind
  - `packages/core/src/codegen/es2020/emit-expressions/collections.ts:48-54` — emitRecordAccess
- **Tests**:
  - Unit: `packages/core/src/desugarer/records.test.ts` (access patterns)
  - Snapshot: `packages/core/src/parser/snapshot-tests/snapshot-data-structures.test.ts`
  - E2E: `tests/e2e/spec-validation/04-expressions.test.ts:it("field access on record")`
- **Coverage assessment**: ✅ Adequate
- **Notes**: Chained access (person.address.city) works via recursive postfix parsing. Highest precedence per spec (Appendix).

### F-03: Record Update (Immutable) with Spread

- **Spec ref**: `docs/spec/04-expressions/data-literals.md:93-149` — Immutable record update using spread operator
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-expression-complex.ts:133-250` — parseRecordExpr handles Spread in updates array
  - `packages/core/src/desugarer/desugarer.ts` — desugar RecordUpdate kind to CoreRecordUpdate
  - `packages/core/src/codegen/es2020/emit-expressions/collections.ts:63-83` — emitRecordUpdate generates { ...record, field: value }
- **Tests**:
  - Unit: `packages/core/src/desugarer/records.test.ts:describe("Record Update - Single Field")`, `describe("Record Update - Multiple Fields")`, `describe("Record Update - Spread")`, etc.
  - Snapshot: `packages/core/src/parser/snapshot-tests/snapshot-data-structures.test.ts`
  - E2E: `tests/e2e/spec-validation/04-expressions.test.ts:it("record spread (immutable update)")`
- **Coverage assessment**: ✅ Adequate
- **Notes**: Multiple spreads handled left-to-right override semantics. Spec section 130-149 demonstrates rightmost-wins behavior; implementation maintains field order in updates array.

### F-04: Field Shorthand (variable name matching field name)

- **Spec ref**: `docs/spec/04-expressions/data-literals.md:151-192` — Field shorthand { name, age } equivalent to { name: name, age: age }
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-expression-complex.ts:204-234` — parseRecordExpr detects shorthand when no colon follows field name
  - Shorthand desugars to explicit `{ name: name, age: age }` form (handled in parser via Field with name:name var)
- **Tests**:
  - Unit: `packages/core/src/desugarer/records.test.ts` (shorthand patterns)
  - Snapshot: `packages/core/src/parser/snapshot-tests/snapshot-data-structures.test.ts`
  - E2E: implicit (via broader record tests)
- **Coverage assessment**: ⚠️ Thin
- **Notes**: Spec section 194-195 states no special lexer logic needed; parser handles. Spec 183-192 describes type inference behavior (field inherits variable type) — no explicit test found for this inference property.

### F-05: Keywords as Record Field Names

- **Spec ref**: `docs/spec/04-expressions/data-literals.md:197-279` — Language keywords allowed as explicit field names; shorthand forbidden with keywords
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-expression-complex.ts:204-234` — parser.expectFieldName() accepts KEYWORD tokens for field names
  - `packages/core/src/parser/parse-expression-complex.ts:219-222` — VF2201 error thrown on keyword shorthand attempt
- **Tests**:
  - Unit: (no dedicated unit test found for keyword fields)
  - Snapshot: (implicit in data-structures.vf if tested)
  - E2E: (no explicit keyword-field e2e test found)
- **Coverage assessment**: ⚠️ Thin
- **Notes**: Parser accepts keywords in explicit field syntax. Error VF2201 enforced for shorthand with keywords (spec 232-252). No integration test confirming keywords work end-to-end, nor test confirming shorthand error message.

### F-06: List Literal Parsing

- **Spec ref**: `docs/spec/04-expressions/data-literals.md:359-378` — List literals [1, 2, 3] with homogeneous element type
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-expression-primary.ts:318-372` — parsePrimary parses LBRACKET, elements, RBRACKET; handles spread operators
  - `packages/core/src/desugarer/desugarListLiteral.ts` — routes to buildConsChain or desugarListWithConcats based on elements
  - `packages/core/src/desugarer/buildConsChain.ts:20-48` — builds Cons chain from regular elements (right-associative)
- **Tests**:
  - Unit: `packages/core/src/desugarer/lists.test.ts:describe("List Literals - Empty List")`, `Single Element`, `Two Elements`, etc.
  - Snapshot: `packages/core/src/parser/snapshot-tests/snapshot-data-structures.test.ts`
  - E2E: `tests/e2e/spec-validation/04-expressions.test.ts:it("list literal")`, `it("empty list")`
- **Coverage assessment**: ✅ Adequate
- **Notes**: Empty list, single, multiple elements all covered. Type homogeneity enforced at typechecker via unification.

### F-07: Empty List Type Inference (value restriction)

- **Spec ref**: `docs/spec/04-expressions/data-literals.md:380-421` — Empty list [] has polymorphic expression type but monomorphic variable binding; value restriction applies
- **Status**: ✅ Implemented
- **Implementation**:
  - Parser accepts `[]` as Expr { kind: "List", elements: [] }
  - Desugarer: empty list → CoreVariant("Nil", [])
  - `packages/core/src/typechecker/infer/infer-bindings.ts` — value restriction logic in computeBindingScheme; `isSyntacticValue` returns false for non-literal list bindings
  - Spec 394-399: first use of ambiguous variable fixes its type
- **Tests**:
  - Unit: (no explicit value-restriction test for lists found)
  - Snapshot: (implicit in broader tests)
  - E2E: `tests/e2e/spec-validation/04-expressions.test.ts` (no explicit value-restriction test for empty lists)
  - Note: `tests/e2e/let-binding-matrix.test.ts` covers value restriction matrix for all let forms
- **Coverage assessment**: ⚠️ Thin
- **Notes**: Value restriction implemented at typechecker; no isolated test confirming empty list specifically triggers it. E2E test for polymorphic empty-list workaround (function wrapper) not found.

### F-08: List Spread Operator (concatenation)

- **Spec ref**: `docs/spec/04-expressions/data-literals.md:423-455` — Spread operator [...list] expands list inline; multiple spreads supported
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-expression-primary.ts:336-343` — parser detects SPREAD token in list elements
  - `packages/core/src/desugarer/desugarListWithConcats.ts` — handles lists with spreads, desugars to Append (concat) calls
  - `packages/core/src/desugarer/desugarListLiteral.ts` — routes mixed element/spread lists to desugarListWithConcats
- **Tests**:
  - Unit: `packages/core/src/desugarer/list-spread.test.ts`, `packages/core/src/desugarer/lists.test.ts:describe("List Spread")`
  - Snapshot: `packages/core/src/parser/snapshot-tests/snapshot-data-structures.test.ts`
  - E2E: `tests/e2e/spec-validation/04-expressions.test.ts:it("list spread")`, `it("list spread runtime verification")`
- **Coverage assessment**: ✅ Adequate
- **Notes**: Multiple spreads tested. Middle-position spread (spec line 435 comment "if supported") — implementation supports; tested in buildConsChain tests.

### F-09: Cons Operator (::)

- **Spec ref**: `docs/spec/04-expressions/data-literals.md:457-474` — Cons operator (::) prepends single element; right-associative; desugars to Cons variant
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-expression-operators.ts` — OP_CONS operator parsing at correct precedence level
  - `packages/core/src/desugarer/desugarer.ts` — BinOp(Cons, left, right) → desugarBinOp → Variant("Cons", [left, right])
  - Spec line 466: right-associativity (1 :: 2 :: 3 :: [] → 1 :: (2 :: (3 :: [])))
- **Tests**:
  - Unit: `packages/core/src/desugarer/lists.test.ts:describe("Cons Operator")`
  - Snapshot: `packages/core/src/parser/snapshot-tests/snapshot-data-structures.test.ts`
  - E2E: implicit (via pattern matching tests that build lists with cons)
  - Property: `packages/core/src/desugarer/buildConsChain.test.ts` — cons chain construction
- **Coverage assessment**: ⚠️ Thin
- **Notes**: Right-associativity asserted in parser tests. No e2e test explicitly verifying cons operator as expression (only pattern matching cons).

### F-10: Multi-Line List Syntax

- **Spec ref**: `docs/spec/04-expressions/data-literals.md:496-515` — Multi-line list syntax with optional trailing comma
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-expression-primary.ts:318-372` — parser handles NEWLINE tokens inside brackets; trailing comma check at line 357-359
- **Tests**:
  - Snapshot: `packages/core/src/parser/snapshot-tests/snapshot-data-structures.test.ts` (implicit if .vf has multiline lists)
  - Integration: `packages/core/src/desugarer/desugarer-structural.test.ts` (implicit)
  - E2E: (no explicit multiline list syntax test found)
- **Coverage assessment**: ⚠️ Thin
- **Notes**: Parser handles syntax correctly. No dedicated e2e test for multiline lists; only implicit coverage via snapshot tests.

### F-11: Trailing Commas in Records and Lists

- **Spec ref**: `docs/spec/04-expressions/data-literals.md:517-562` — Trailing commas permitted in both record and list literals
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-expression-primary.ts:349-362` (lists) — trailing comma check before RBRACKET
  - `packages/core/src/parser/parse-expression-complex.ts:166-188` (records) — trailing comma check before RBRACE
- **Tests**:
  - Unit: (implicit in broader record/list tests)
  - Snapshot: (if .vf fixtures include trailing commas)
  - E2E: `tests/e2e/spec-validation/04-expressions.test.ts` (implicit via broader tests)
- **Coverage assessment**: ✅ Adequate
- **Notes**: Parser explicitly allows trailing commas. Spec rationale (section 545-549) validated by version-control-friendly parsing.

### F-12: Tuple Literal Construction

- **Spec ref**: `docs/spec/04-expressions/data-literals.md` (implicit in data literals; spec section on tuples not shown in provided text, but type syntax suggests (Int, String))
- **Status**: ✅ Implemented
- **Implementation**:
  - Parser: tuples as parenthesized comma-separated expressions (disambiguated from lambda via `isLikelyLambda`)
  - `packages/core/src/desugarer/desugarer.ts` — Tuple kind desugared to CoreTuple
  - `packages/core/src/codegen/es2020/emit-expressions/collections.ts:16-19` — emitTuple emits [element1, element2, ...]
- **Tests**:
  - Snapshot: `packages/core/src/parser/snapshot-tests/snapshot-data-structures.test.ts`
  - E2E: `tests/e2e/spec-validation/04-expressions.test.ts:it("tuple literal")`
- **Coverage assessment**: ✅ Adequate
- **Notes**: Tuples parsed as parenthesized comma lists; desugarer lifts to CoreTuple. Codegen emits as JS arrays. Full lifecycle implemented.

### F-13: Lambda Single-Parameter (with/without parentheses)

- **Spec ref**: `docs/spec/04-expressions/functions-composition.md:14-32` — Single parameter lambda (x) => expr or x => expr
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-expression-lambda.ts:193-250+` — parseLambdaOrParen handles both forms; parses simple identifiers as single param without parens
  - `packages/core/src/parser/parse-expression-primary.ts:154-174` — type-parameter prefix <T> handling for generic lambdas
  - `packages/core/src/desugarer/curryLambda.ts:39-62` — curryLambda wraps single param in CoreLambda (no further currying needed)
- **Tests**:
  - Unit: `packages/core/src/desugarer/curryLambda.test.ts:it("single parameter lambda")`
  - Snapshot: `packages/core/src/parser/snapshot-tests/snapshot-functions.test.ts`
  - E2E: `tests/e2e/spec-validation/04-expressions.test.ts:it("lambda with single param")`, `it("lambda single param without parens")`
- **Coverage assessment**: ✅ Adequate
- **Notes**: Both syntactic forms (parenthesized and bare) parsed and tested. Single param case tested separately in unit and e2e.

### F-14: Lambda Multi-Parameter (curried)

- **Spec ref**: `docs/spec/04-expressions/functions-composition.md:7-32` — Multi-parameter lambdas (x, y) => expr desugar to curried form (x) => (y) => expr
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-expression-lambda.ts:193-250+` — parseLambdaOrParen parses comma-separated parameters
  - `packages/core/src/desugarer/curryLambda.ts:68-131` — buildLambda recursively nests single-param lambdas for multi-param input
- **Tests**:
  - Unit: `packages/core/src/desugarer/curryLambda.test.ts:it("two parameter lambda")`, `it("three parameter lambda")`, etc.
  - Snapshot: `packages/core/src/parser/snapshot-tests/snapshot-functions.test.ts`
  - E2E: `tests/e2e/spec-validation/04-expressions.test.ts:it("lambda with multiple params")`
- **Coverage assessment**: ✅ Adequate
- **Notes**: Currying tested with 2, 3+ parameters. Implementation correctly builds nested CoreLambda chain (not flat params).

### F-15: Lambda Type Annotations (parameter and return)

- **Spec ref**: `docs/spec/04-expressions/functions-composition.md:34-51` — Type annotations on lambda parameters and return type: (x: Int): Int => expr
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-expression-lambda.ts:70-100` — parseLambdaParam extracts optional type annotation after colon
  - `packages/core/src/parser/parse-expression-lambda.ts:131-176` — return type annotation parsing (colon after closing paren)
  - `packages/core/src/desugarer/curryLambda.ts:97-151` — preserves annotations via CoreTypeAnnotation wrapping or param-level attachment
  - Spec section 50: "Usually unnecessary" — inference works without annotations
- **Tests**:
  - Unit: `packages/core/src/desugarer/curryLambda.test.ts:it("lambda with type annotation on param")`, `it("lambda with return type annotation")`
  - Snapshot: (implicit in broader function tests)
  - E2E: (implicit; no dedicated test for type annotations)
  - Integration: `packages/core/src/typechecker/infer/infer-functions.test.ts` (implicit coverage via type inference)
- **Coverage assessment**: ⚠️ Thin
- **Notes**: Parser and desugarer handle annotations; typechecker enforces them (via unification with inference). No e2e test explicitly verifying annotation enforcement.

### F-16: Lambda with Destructuring Parameters (records, lists, variants)

- **Spec ref**: `docs/spec/04-expressions/functions-composition.md:53-71` — Destructuring patterns in lambda parameters: ({ x, y }) => body, ([a, b]) => body
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-expression-lambda.ts:70-100` — parseLambdaParam calls parsePatternFn to accept pattern (not just identifiers)
  - `packages/core/src/desugarer/curryLambda.ts:135-170` — destructuring params lifted into synthesized match: ($tmp) => match $tmp { | pattern => body }
- **Tests**:
  - Unit: `packages/core/src/desugarer/curryLambda.test.ts:it("lambda with record destructuring")`, `it("lambda with list destructuring")`
  - Snapshot: (implicit in broader tests)
  - E2E: (no explicit destructuring-in-lambda test found)
  - Integration: pattern matching tests cover patterns in general
- **Coverage assessment**: ⚠️ Thin
- **Notes**: Desugarer correctly lifts destructuring into match. Parser accepts patterns. No e2e test confirming destructuring in lambdas works end-to-end.

### F-17: Lambda Cannot Be Recursive

- **Spec ref**: `docs/spec/04-expressions/functions-composition.md:73-83` — Anonymous lambdas cannot reference themselves; use named `let rec` instead
- **Status**: ✅ Implemented (as language design, not explicit check)
- **Implementation**:
  - Typechecker: desugarer lifts lambda to anonymous CoreLambda (no name); environment has no recursive binding for the lambda itself
- **Tests**:
  - Unit: (no unit test for this invariant)
  - E2E: (no e2e test confirming error on recursive lambda attempt)
- **Coverage assessment**: ❌ Untested
- **Notes**: Spec section 78-79 shows ❌ Error and recommends `let rec` solution. No test verifies that attempting lambda recursion produces an error. Implicit in that lambdas have no name; explicit test would be valuable.

### F-18: Operator Sections Not Supported

- **Spec ref**: `docs/spec/04-expressions/functions-composition.md:85-104` — Operator sections (Haskell-style partial application) not supported; use lambdas instead
- **Status**: ✅ Implemented (as non-feature)
- **Implementation**:
  - `packages/core/src/parser/parse-expression-lambda.ts:43-64` — isOperatorToken checks for operator tokens
  - `packages/core/src/parser/parse-expression-lambda.ts:197-250+` — parseLambdaOrParen detects operators in parentheses and rejects them (error VF2101 or similar)
- **Tests**:
  - Unit: (no unit test for operator-section rejection)
  - E2E: (no e2e test confirming error on operator section)
- **Coverage assessment**: ❌ Untested
- **Notes**: Spec 104 provides rationale (parsing ambiguity, clarity). Parser has operator detection logic; no test confirms that `(+)` or `(1 +)` produces an error message as intended.

### F-19: Block Expressions (sequence of statements)

- **Spec ref**: `docs/spec/04-expressions/functions-composition.md:106-229` — Blocks as expressions: { expr1; expr2; resultExpr }
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-expression-primary.ts:375-410+` — parseBlockExpr in parseExpression disambiguates block vs. record via lookahead
  - `packages/core/src/parser/parse-expression-complex.ts:260+` — parseBlockExpr parses statements separated by semicolons
  - `packages/core/src/desugarer/desugarBlock.ts:25-85` — desugarBlock converts block to nested let bindings (all but last statement wrap in let _ = expr)
- **Tests**:
  - Unit: `packages/core/src/desugarer/blocks.test.ts` (multiple scenarios)
  - Snapshot: `packages/core/src/parser/snapshot-tests/snapshot-expressions.test.ts`
  - E2E: `tests/e2e/spec-validation/04-expressions.test.ts:it("block expression returns last value")`
- **Coverage assessment**: ✅ Adequate
- **Notes**: Blocks parsed, desugared to nested lets, tested end-to-end. Spec section 129-132 requires explicit semicolons — parser enforces this.

### F-20: Block Empty Block (Unit type)

- **Spec ref**: `docs/spec/04-expressions/functions-composition.md:165-174` — Empty block {} has type Unit and evaluates to ()
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-expression-primary.ts:384-390` — parser detects empty block and returns Block { exprs: [] }
  - `packages/core/src/desugarer/desugarBlock.ts:32-34` — empty block desugared to CoreUnitLit
- **Tests**:
  - Unit: `packages/core/src/desugarer/blocks.test.ts:describe("Empty Block")`
  - E2E: `tests/e2e/spec-validation/04-expressions.test.ts:it("empty block returns Unit")`
- **Coverage assessment**: ✅ Adequate
- **Notes**: Empty block correctly returns Unit. Spec example (173) uses empty block in conditional no-op branch.

### F-21: Block Scoping and Shadowing

- **Spec ref**: `docs/spec/04-expressions/functions-composition.md:134-163` — Blocks create lexical scopes; bindings shadow outer scope; scope ends at block boundary
- **Status**: ✅ Implemented (as language design via desugaring)
- **Implementation**:
  - `packages/core/src/desugarer/desugarBlock.ts` — each let binding increases scope depth
  - Typechecker: let bindings extend environment; scope boundary at block end (environment not carried outside)
- **Tests**:
  - Unit: `packages/core/src/desugarer/blocks.test.ts:describe("Block Scope")`
  - E2E: `tests/e2e/spec-validation/04-expressions.test.ts:it("block scope isolation")`
- **Coverage assessment**: ✅ Adequate
- **Notes**: Scoping enforced via desugaring to nested lets and typechecker environment handling. Shadowing test confirms inner binding hides outer.

### F-22: Block Sequential Execution

- **Spec ref**: `docs/spec/04-expressions/functions-composition.md:231-249` — Expressions in blocks evaluated top-to-bottom sequentially; side effects occur in order
- **Status**: ✅ Implemented (as execution model)
- **Implementation**:
  - `packages/core/src/desugarer/desugarBlock.ts:63-83` — desugaring builds nested lets left-to-right, preserving evaluation order
  - Codegen: ES2020 emits statements in source order
- **Tests**:
  - Unit: (implicit in block desugaring tests)
  - E2E: `tests/e2e/spec-validation/04-expressions.test.ts` (implicit in broader block tests)
  - Note: Spec section 235-240 shows unsafe { console_log(...) } calls — e2e test exercises this
- **Coverage assessment**: ⚠️ Thin
- **Notes**: Sequential execution guaranteed by desugaring to nested lets. No isolated test explicitly verifying order of side effects within a block.

### F-23: Block Nested Blocks

- **Spec ref**: `docs/spec/04-expressions/functions-composition.md:251-266` — Blocks can be nested arbitrarily
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-expression-complex.ts` — recursive block parsing
  - `packages/core/src/desugarer/desugarBlock.ts:63-83` — handles any expression in block, including nested blocks (recursive desugar call)
- **Tests**:
  - Unit: `packages/core/src/desugarer/blocks.test.ts:describe("Nested Blocks")`
  - E2E: `tests/e2e/spec-validation/04-expressions.test.ts:it("nested blocks")`
- **Coverage assessment**: ✅ Adequate
- **Notes**: Nested scopes tested. Spec example (256-265) shows three-level nesting with all bindings in scope.

### F-24: Pipe Operator (|>)

- **Spec ref**: `docs/spec/04-expressions/functions-composition.md:268-341` — Pipe operator |> for left-to-right function composition; semantics: value |> func == func(value)
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-expression-operators.ts` — OP_PIPE_GT operator parsing at low precedence (3, per spec)
  - `packages/core/src/desugarer/desugarPipe.ts:24-43` — desugarPipe(data, func) → CoreApp(func, [data])
- **Tests**:
  - Unit: `packages/core/src/desugarer/pipes.test.ts`
  - Snapshot: (implicit in broader operator tests)
  - E2E: `tests/e2e/spec-validation/04-expressions.test.ts:it("pipe operator basic")`, `it("pipe operator chaining")`
- **Coverage assessment**: ✅ Adequate
- **Notes**: Pipe desugars to function application. Left-associativity and low precedence tested.

### F-25: Pipe Operator Precedence (3, very low) and Associativity (left)

- **Spec ref**: `docs/spec/04-expressions/functions-composition.md:301-320` — Pipe precedence 3 (lowest); left-associative: a |> f |> g |> h == ((a |> f) |> g) |> h
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-expression-operators.ts` — precedence climbing parser assigns OP_PIPE_GT lowest precedence tier
  - `packages/core/src/desugarer/desugarPipe.ts` — recursive desugar builds left-to-right applications
- **Tests**:
  - Unit: `packages/core/src/desugarer/pipes.test.ts:it("left-associativity")`, `it("precedence interaction")`
  - E2E: `tests/e2e/spec-validation/04-expressions.test.ts:it("pipe operator chaining")` (asserts h(g(f(a))) order)
- **Coverage assessment**: ✅ Adequate
- **Notes**: Spec section 310-320 shows left-associativity and interaction with other operators (e.g., x + 1 |> double evaluates as (x + 1) |> double).

### F-26: Piping into Curried Functions

- **Spec ref**: `docs/spec/04-expressions/functions-composition.md:322-340` — Pipe works with curried functions; partial application: data |> List.map((x) => x * 2) passes data as first arg
- **Status**: ✅ Implemented
- **Implementation**:
  - Vibefun functions are curried (multi-arg → nested single-arg lambdas via desugarer)
  - Pipe desugars to CoreApp with one arg; curried functions naturally accept partial application
- **Tests**:
  - Unit: (implicit in pipe + lambda tests)
  - E2E: `tests/e2e/spec-validation/04-expressions.test.ts:it("pipe operator chaining")` (chains multiple curried stdlib functions)
- **Coverage assessment**: ✅ Adequate
- **Notes**: Currying and piping interact naturally; no explicit test needed beyond piping stdlib functions.

### F-27: Forward Composition Operator (>>)

- **Spec ref**: `docs/spec/04-expressions/functions-composition.md:370-384` — Forward composition f >> g creates (x) => g(f(x))
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-expression-operators.ts` — OP_GT_GT operator parsing
  - `packages/core/src/desugarer/desugarComposition.ts:24-95` — desugarComposition with op="ForwardCompose" builds lambda(x) => g(f(x))
- **Tests**:
  - Unit: `packages/core/src/desugarer/composition.test.ts:it("forward composition")`
  - Snapshot: (implicit in broader operator tests)
  - E2E: `tests/e2e/spec-validation/04-expressions.test.ts:it("forward composition >>")`
- **Coverage assessment**: ✅ Adequate
- **Notes**: Forward composition desugars to nested lambda with correct function application order.

### F-28: Backward Composition Operator (<<)

- **Spec ref**: `docs/spec/04-expressions/functions-composition.md:370-384` — Backward composition f << g creates (x) => f(g(x))
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-expression-operators.ts` — OP_LT_LT operator parsing
  - `packages/core/src/desugarer/desugarComposition.ts:70-86` — desugarComposition with op="BackwardCompose" builds lambda(x) => f(g(x))
- **Tests**:
  - Unit: `packages/core/src/desugarer/composition.test.ts:it("backward composition")`
  - Snapshot: (implicit)
  - E2E: `tests/e2e/spec-validation/04-expressions.test.ts:it("backward composition <<")`
- **Coverage assessment**: ✅ Adequate
- **Notes**: Backward composition correctly applies functions in opposite order from forward. Tested end-to-end.

### F-29: Composition vs. Pipe Precedence

- **Spec ref**: `docs/spec/04-expressions/functions-composition.md:381-385` — Composition binds tighter than pipe: data |> f >> g >> h == data |> (f >> g >> h)
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-expression-operators.ts` — composition (>>, <<) at higher precedence than pipe (|>)
- **Tests**:
  - Unit: `packages/core/src/desugarer/composition.test.ts:it("composition with pipe")`, `it("pipe vs composition precedence")`
  - E2E: (implicit in broader tests)
- **Coverage assessment**: ✅ Adequate
- **Notes**: Precedence rules implemented and tested in desugarer tests.

## Feature Gaps (this section)

_None_.

All features specified in data-literals.md and functions-composition.md are implemented (some with thin test coverage; see testing gaps below).

## Testing Gaps (this section)

- **F-05** (Keywords as Record Field Names): No end-to-end test confirming keyword field names work in record construction/access/update, nor testing the VF2201 error message for shorthand with keywords.
  
- **F-07** (Empty List Value Restriction): No isolated test confirming empty list binding triggers monomorphic type variable; workaround (function wrapper) not tested end-to-end.

- **F-09** (Cons Operator): No e2e test exercising cons operator as standalone expression (e.g., x :: [1, 2]); only pattern-matching context tested.

- **F-10** (Multi-Line List Syntax): No explicit e2e test for multi-line list literals; only implicit coverage via snapshots.

- **F-15** (Lambda Type Annotations): No e2e test verifying that parameter/return type annotations are enforced by typechecker (e.g., passing wrong type at call site triggers error).

- **F-16** (Lambda Destructuring): No e2e test for destructuring patterns in lambda parameters; unit tests exist but end-to-end validation missing.

- **F-17** (Lambda Cannot Be Recursive): No test verifying that attempting lambda recursion (e.g., `let fact = (n) => if n <= 1 then 1 else n * fact(n - 1)`) produces an error.

- **F-18** (Operator Sections Not Supported): No test confirming that `(+)` or `(1 +)` produces an error message as intended.

- **F-22** (Block Sequential Execution): No isolated test explicitly verifying order of side effects within a block (e.g., alternating unsafe console_log calls).

## Testing Redundancies (this section)

_None_.

All identified tests assert distinct aspects (parser output shape, desugarer transformation, type inference behavior, codegen output, end-to-end execution). No tests duplicate the same observable behavior on the same input class.

