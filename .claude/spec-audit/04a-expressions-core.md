# Audit: 04a Expressions Core (04-expressions/README.md, basic-expressions.md, control-flow.md, evaluation-order.md)

## Sources Reviewed

**Spec files** (with line counts):
- `docs/spec/04-expressions/README.md` (22 lines)
- `docs/spec/04-expressions/basic-expressions.md` (414 lines)
- `docs/spec/04-expressions/control-flow.md` (490 lines)
- `docs/spec/04-expressions/evaluation-order.md` (562 lines)

**Implementation files**:
- `packages/core/src/parser/parse-expression-operators.ts` (543 lines)
- `packages/core/src/parser/parse-expression-primary.ts` (495 lines)
- `packages/core/src/parser/parse-expression-complex.ts` (423 lines)
- `packages/core/src/parser/parse-expressions.ts` (104 lines)
- `packages/core/src/desugarer/desugarer.ts` (700+ lines)
- `packages/core/src/desugarer/desugarBinOp.ts`
- `packages/core/src/typechecker/infer/infer-operators.ts`
- `packages/core/src/codegen/es2020/emit-operators.ts` (151 lines)

**Test files** (every layer):
- Unit/Parser: `packages/core/src/parser/expression-literals.test.ts`, `expression-operators.test.ts`, `expression-control-flow.test.ts`, `while-loops.test.ts`, `operator-edge-cases.test.ts`, `expression-unary-postfix.test.ts`
- Unit/Desugarer: `packages/core/src/desugarer/while-loops.test.ts`, `desugarer-primitives.test.ts`
- Unit/Typechecker: `packages/core/src/typechecker/infer/infer-operators.test.ts`
- Unit/Codegen: `packages/core/src/codegen/es2020/emit-operators.test.ts`
- Snapshot: `packages/core/src/parser/snapshot-tests/snapshot-control-flow.test.ts`, `snapshot-expressions.test.ts`
- Integration/Execution: `packages/core/src/codegen/es2020/execution-tests/operators.test.ts`, `pattern-matching.test.ts`
- E2E/Spec-validation: `tests/e2e/spec-validation/04-expressions.test.ts`
- Property: `packages/core/src/types/test-arbitraries/ast-arb.ts` (property-based operator tests)

---

## Feature Inventory

### F-01: Integer Literal Expression

- **Spec ref**: `docs/spec/04-expressions/basic-expressions.md:9-10` — Decimal integer constants parse as Int type
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-expression-primary.ts:115-121` — `parsePrimary()` checks INT_LITERAL token
  - `packages/core/src/desugarer/desugarer.ts:98-103` — Case IntLit translates to CoreIntLit
- **Tests**:
  - Unit: `expression-literals.test.ts:integer literal` (none found, but lexer tests exist)
  - Snapshot: `snapshot-expressions.test.ts` (covers literals)
  - E2E: `04-expressions.test.ts:integer literal expression` (line 14-16)
- **Coverage assessment**: ✅ Adequate
- **Notes**: Literals are thoroughly tested at lexer and integration levels.

### F-02: Float Literal Expression

- **Spec ref**: `docs/spec/04-expressions/basic-expressions.md:11` — Decimal float constants parse as Float type
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-expression-primary.ts:125-131` — `parsePrimary()` checks FLOAT_LITERAL token
  - `packages/core/src/desugarer/desugarer.ts:105-110` — Case FloatLit translates to CoreFloatLit
- **Tests**:
  - E2E: `04-expressions.test.ts:float literal expression` (line 18-20)
- **Coverage assessment**: ✅ Adequate

### F-03: String Literal Expression

- **Spec ref**: `docs/spec/04-expressions/basic-expressions.md:12` — Double-quoted string literals parse as String type
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-expression-primary.ts:135-141` — `parsePrimary()` checks STRING_LITERAL token
  - `packages/core/src/desugarer/desugarer.ts:112-117` — Case StringLit translates to CoreStringLit
- **Tests**:
  - E2E: `04-expressions.test.ts:string literal expression` (line 22-24)
- **Coverage assessment**: ✅ Adequate

### F-04: Boolean Literal Expression

- **Spec ref**: `docs/spec/04-expressions/basic-expressions.md:13` — `true`/`false` literals parse as Bool type
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-expression-primary.ts:145-151` — `parsePrimary()` checks BOOL_LITERAL token
  - `packages/core/src/desugarer/desugarer.ts:119-124` — Case BoolLit translates to CoreBoolLit
- **Tests**:
  - E2E: `04-expressions.test.ts:boolean literal expression` (line 26-28)
- **Coverage assessment**: ✅ Adequate

### F-05: Unit Literal Expression

- **Spec ref**: `docs/spec/04-expressions/basic-expressions.md:14` — `()` parses as Unit type
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-expression-primary.ts` — Unit is parsed via parentheses or inserted by parser for missing else branches (line 214-219)
  - `packages/core/src/desugarer/desugarer.ts:126-130` — Case UnitLit translates to CoreUnitLit
- **Tests**:
  - E2E: `04-expressions.test.ts:if without else returns Unit` (line 218-220)
- **Coverage assessment**: ✅ Adequate

### F-06: Variable Reference

- **Spec ref**: `docs/spec/04-expressions/basic-expressions.md:21-34` — Variables referenced by identifier name; immutable, must be in scope, can shadow
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-expression-primary.ts:477-483` — `parsePrimary()` parses IDENTIFIER as Var
  - `packages/core/src/desugarer/desugarer.ts:133-138` — Case Var translates to CoreVar
- **Tests**:
  - E2E: `04-expressions.test.ts:variable reference` (line 32-34), `variable shadowing` (line 36-45)
- **Coverage assessment**: ✅ Adequate

### F-07: Function Call with Argument Evaluation Order

- **Spec ref**: `docs/spec/04-expressions/evaluation-order.md:18-42` — Arguments evaluated left-to-right; function expression evaluated before arguments
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-expression-operators.ts:499+` — `parseCall()` parses function calls
  - `packages/core/src/desugarer/desugarer.ts:190-204` — Desugars multi-arg calls to curried single-arg applications via reduce
  - `packages/core/src/codegen/es2020/emit-expressions/calls.ts` — Emits curried application sequence
- **Tests**:
  - E2E: `04-expressions.test.ts:single-argument function call`, `multi-argument function call` (lines 48-69)
  - Property: `operator-edge-cases.test.ts` (precedence round-trip property test)
- **Coverage assessment**: ✅ Adequate

### F-08: Partial Application (Currying)

- **Spec ref**: `docs/spec/04-expressions/basic-expressions.md:49-57` — Functions can be partially applied; returns function accepting remaining arguments
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/desugarer/desugarer.ts:159-186` — Lambda currying via `curryLambda()`
  - `packages/core/src/desugarer/curryLambda.ts` — Transforms multi-param lambdas to nested single-param lambdas
- **Tests**:
  - E2E: `04-expressions.test.ts:multi-argument function call` (line 60-69) demonstrates currying indirectly
  - Desugarer tests in `desugarer-primitives.test.ts` for lambda handling
- **Coverage assessment**: ⚠️ Thin — only implicit coverage via multi-arg calls; no explicit partial application test

### F-09: Addition Operator (+)

- **Spec ref**: `docs/spec/04-expressions/basic-expressions.md:72-75` — `+` operator for Int and Float; result type matches operand type; no automatic coercion
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-expression-operators.ts:372-405` — `parseAdditive()` matches OP_PLUS token at precedence 12
  - `packages/core/src/desugarer/desugarer.ts:327-328` — BinOp with "Add" desugars via `desugarBinOp()`
  - `packages/core/src/typechecker/infer/infer-operators.ts` — Type inference enforces same type for both operands
  - `packages/core/src/codegen/es2020/emit-operators.ts:124` — Maps Add to "+"
- **Tests**:
  - Unit: `expression-operators.test.ts` (operators at precedence 12 level)
  - E2E: `04-expressions.test.ts:addition` (line 84-86), `float addition` (line 108-110)
- **Coverage assessment**: ✅ Adequate

### F-10: Subtraction Operator (-)

- **Spec ref**: `docs/spec/04-expressions/basic-expressions.md:72-75` — `-` operator for Int and Float; no automatic coercion
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-expression-operators.ts:372-405` — `parseAdditive()` matches OP_MINUS at precedence 12
  - `packages/core/src/desugarer/desugarer.ts:327-328` — BinOp with "Subtract" desugars via `desugarBinOp()`
  - `packages/core/src/codegen/es2020/emit-operators.ts:125` — Maps Subtract to "-"
- **Tests**:
  - E2E: `04-expressions.test.ts:subtraction` (line 88-90), `float subtraction` (line 112-114)
- **Coverage assessment**: ✅ Adequate

### F-11: Multiplication Operator (*)

- **Spec ref**: `docs/spec/04-expressions/basic-expressions.md:72-75` — `*` operator for Int and Float; no automatic coercion
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-expression-operators.ts:411-443` — `parseMultiplicative()` matches OP_STAR at precedence 14
  - `packages/core/src/desugarer/desugarer.ts:327-328` — BinOp with "Multiply" desugars
  - `packages/core/src/codegen/es2020/emit-operators.ts:126` — Maps Multiply to "*"
- **Tests**:
  - E2E: `04-expressions.test.ts:multiplication` (line 92-94), `float multiplication` (line 116-118)
- **Coverage assessment**: ✅ Adequate

### F-12: Division Operator (/) — Integer Division

- **Spec ref**: `docs/spec/04-expressions/basic-expressions.md:76-131` — Integer division truncates toward zero; e.g., `7 / 2 = 3`, `-7 / 2 = -3`; compile-time literal division by zero may be detected
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-expression-operators.ts:411-443` — `parseMultiplicative()` matches OP_SLASH at precedence 14
  - `packages/core/src/desugarer/desugarBinOp.ts` — Desugars Divide to IntDivide or FloatDivide based on inferred operand type
  - `packages/core/src/typechecker/infer/infer-operators.ts` — Type inference determines Int vs Float division from operand types
  - `packages/core/src/codegen/es2020/emit-operators.ts:128-129` — IntDivide emits `Math.trunc(a / b)`; FloatDivide emits `/`
- **Tests**:
  - E2E: `04-expressions.test.ts:integer division` (line 96-98), `float division` (line 120-122)
- **Coverage assessment**: ✅ Adequate

### F-13: Modulo Operator (%)

- **Spec ref**: `docs/spec/04-expressions/basic-expressions.md:78` — `%` operator for Int remainder
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-expression-operators.ts:411-443` — `parseMultiplicative()` matches OP_PERCENT at precedence 14
  - `packages/core/src/desugarer/desugarer.ts:327-328` — BinOp with "Modulo" desugars
  - `packages/core/src/codegen/es2020/emit-operators.ts:130` — Maps Modulo to "%"
- **Tests**:
  - E2E: `04-expressions.test.ts:modulo` (line 100-102)
- **Coverage assessment**: ✅ Adequate

### F-14: Unary Negation Operator (-)

- **Spec ref**: `docs/spec/04-expressions/basic-expressions.md:81-85` — Unary `-` negates numeric value
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-expression-operators.ts:450-493` — `parseUnary()` distinguishes unary minus via context (no preceding value-returning token)
  - `packages/core/src/desugarer/desugarer.ts:331-337` — UnaryOp with "Negate" desugars to CoreUnaryOp
  - `packages/core/src/codegen/es2020/emit-operators.ts:147` — Maps Negate to "-"
- **Tests**:
  - E2E: `04-expressions.test.ts:unary minus` (line 104-106)
- **Coverage assessment**: ✅ Adequate

### F-15: Division by Zero — Runtime Panic

- **Spec ref**: `docs/spec/04-expressions/basic-expressions.md:104-107` — Integer division by zero panics at runtime; float division by zero follows IEEE 754 (returns Infinity/NaN)
- **Status**: ✅ Implemented — corrected from a previous commit's erroneous ❌ Missing verdict. The codegen does panic on integer division/modulo by zero via runtime helpers; see implementation citations below.
- **Implementation**:
  - `packages/core/src/codegen/es2020/emit-expressions/operators.ts:107-114` — `IntDivide` emits `$intDiv(a, b)` (not raw `Math.trunc(a / b)` as a stale comment in `emit-operators.ts:128` suggests).
  - `packages/core/src/codegen/es2020/emit-expressions/operators.ts:116-125` — `Modulo` emits `$intMod(a, b)`.
  - `packages/core/src/codegen/es2020/runtime-helpers.ts:71` — `$intDiv = (a, b) => { if (b === 0) throw new Error("Division by zero"); return Math.trunc(a / b); };`
  - `packages/core/src/codegen/es2020/runtime-helpers.ts:81-82` — `$intMod` similarly throws on `b === 0`.
  - Float case correctly returns Infinity/NaN per IEEE 754 (no special helper needed).
- **Tests**:
  - Execution: `packages/core/src/codegen/es2020/execution-tests/numeric.test.ts:67-77` — "should panic at runtime on integer division by zero" (and modulo)
  - E2E: `tests/e2e/spec-validation/09-error-handling.test.ts:14-20` — "integer division by zero panics" + modulo
  - Float side: `numeric.test.ts:79-87` — "should NOT panic on float division by zero"; `09-error-handling.test.ts:22-32` — Infinity/NaN/-Infinity cases
- **Coverage assessment**: ✅ Adequate — both code paths have execution-test and spec-validation coverage. The Testing Gaps bullet below for F-15 (E2E in 04-expressions) refers to *cross-section* coverage convenience, not a missing test.
- **Notes**: Reconciled with `09-error-handling.md` F-14/F-15 which already had the correct citations. The earlier ❌ Missing verdict in this audit was based on a misread of `emit-operators.ts:128`'s stale comment; the runtime helper layer was overlooked.

### F-16: Integer Overflow and Underflow

- **Spec ref**: `docs/spec/04-expressions/basic-expressions.md:135-143` — Safe range -(2^53 - 1) to 2^53 - 1; overflow behavior is implementation-defined; recommend Int.safeAdd, Int.safeMul for checked arithmetic
- **Status**: ✅ Implemented (JavaScript numbers naturally follow this range)
- **Implementation**:
  - JavaScript numbers enforce 2^53 range via IEEE 754 double precision
  - `packages/stdlib/src/Int.ts` provides `safeAdd`, `safeMul` etc. for checked operations
- **Tests**:
  - No explicit overflow test (spec allows implementation-defined behavior)
- **Coverage assessment**: ⚠️ Thin — overflow is undefined per spec, so testing not required; safe functions exist in stdlib

### F-17: Equality Operator (==)

- **Spec ref**: `docs/spec/04-expressions/basic-expressions.md:156-174` — Equals operator returns Bool; requires same type for both operands; primitives by value, records structural, variants constructor+value, functions not comparable
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-expression-operators.ts:255-277` — `parseEquality()` matches OP_EQ at precedence 9
  - `packages/core/src/desugarer/desugarer.ts:327-328` — BinOp with "Equal" desugars
  - `packages/core/src/typechecker/infer/infer-operators.ts` — Type inference enforces same type for both operands; rejects function comparison
  - `packages/core/src/codegen/es2020/emit-operators.ts:131` — Maps Equal to "===" for primitives, or calls $eq for structural types
- **Tests**:
  - E2E: `04-expressions.test.ts:equality comparison` (line 126-128), `comparison requires same type` (line 150-152)
- **Coverage assessment**: ✅ Adequate

### F-18: Not-Equal Operator (!=)

- **Spec ref**: `docs/spec/04-expressions/basic-expressions.md:157` — Not-equal operator returns Bool; same type requirement as ==
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-expression-operators.ts:255-277` — `parseEquality()` matches OP_NEQ at precedence 9
  - `packages/core/src/desugarer/desugarer.ts:327-328` — BinOp with "NotEqual" desugars
  - `packages/core/src/codegen/es2020/emit-operators.ts:132` — Maps NotEqual to "!==" or !$eq
- **Tests**:
  - E2E: `04-expressions.test.ts:inequality comparison` (line 130-132)
- **Coverage assessment**: ✅ Adequate

### F-19: Less Than Operator (<)

- **Spec ref**: `docs/spec/04-expressions/basic-expressions.md:159` — `<` operator; only Int, Float, String, Bool support ordering
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-expression-operators.ts:284-313` — `parseComparison()` matches OP_LT at precedence level 8 (per the docstring on the function)
  - `packages/core/src/desugarer/desugarer.ts:327-328` — BinOp with "LessThan" desugars
  - `packages/core/src/codegen/es2020/emit-operators.ts:133` — Maps LessThan to "<"
- **Tests**:
  - E2E: `04-expressions.test.ts:less than comparison` (line 134-136)
- **Coverage assessment**: ✅ Adequate

### F-20: Greater Than Operator (>)

- **Spec ref**: `docs/spec/04-expressions/basic-expressions.md:161` — `>` operator; only orderable types
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-expression-operators.ts:284-313` — `parseComparison()` matches OP_GT at precedence level 8
  - `packages/core/src/codegen/es2020/emit-operators.ts:135` — Maps GreaterThan to ">"
- **Tests**:
  - E2E: `04-expressions.test.ts:greater than comparison` (line 138-140)
- **Coverage assessment**: ✅ Adequate

### F-21: Less-Equal Operator (<=)

- **Spec ref**: `docs/spec/04-expressions/basic-expressions.md:160` — `<=` operator; only orderable types
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-expression-operators.ts:284-313` — `parseComparison()` matches OP_LTE at precedence level 8
  - `packages/core/src/codegen/es2020/emit-operators.ts:134` — Maps LessEqual to "<="
- **Tests**:
  - E2E: `04-expressions.test.ts:less than or equal comparison` (line 146-148)
- **Coverage assessment**: ✅ Adequate

### F-22: Greater-Equal Operator (>=)

- **Spec ref**: `docs/spec/04-expressions/basic-expressions.md:162` — `>=` operator; only orderable types
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-expression-operators.ts:284-313` — `parseComparison()` matches OP_GTE at precedence level 8
  - `packages/core/src/codegen/es2020/emit-operators.ts:136` — Maps GreaterEqual to ">="
- **Tests**:
  - E2E: `04-expressions.test.ts:greater than or equal comparison` (line 142-144)
- **Coverage assessment**: ✅ Adequate

### F-23: Chained Comparisons Are Not Supported

- **Spec ref**: `docs/spec/04-expressions/basic-expressions.md:184-198` — Chained comparisons like `1 < x < 10` are NOT supported; must use `1 < x && x < 10`
- **Status**: ✅ Implemented (parser accepts, type checker rejects)
- **Implementation**:
  - `packages/core/src/parser/parse-expression-operators.ts:284-313` — Comparison operators are left-associative, so `a < b < c` parses as `(a < b) < c`
  - `packages/core/src/typechecker/infer/infer-operators.ts` — Type checker rejects because `(a < b)` is Bool, and Bool is not orderable
- **Tests**:
  - Parser accepts it; type checker catches it. E2E spec test may not explicitly test this edge case.
- **Coverage assessment**: ⚠️ Thin — parse-level works; type-check error handling covered implicitly

### F-24: Logical AND Operator (&&)

- **Spec ref**: `docs/spec/04-expressions/basic-expressions.md:206-228` — `&&` operator with short-circuit evaluation; evaluates left operand first, skips right if left is false
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-expression-operators.ts:229-248` — `parseLogicalAnd()` at precedence 6, left-associative
  - `packages/core/src/desugarer/desugarer.ts:327-328` — BinOp with "LogicalAnd" desugars (preserves short-circuit via codegen)
  - `packages/core/src/codegen/es2020/emit-operators.ts:137` — Maps LogicalAnd to "&&" (JavaScript's && already short-circuits)
- **Tests**:
  - E2E: `04-expressions.test.ts:logical AND short-circuit` (line 156-158), `AND short-circuit skips right side` (line 168-181)
- **Coverage assessment**: ✅ Adequate

### F-25: Logical OR Operator (||)

- **Spec ref**: `docs/spec/04-expressions/basic-expressions.md:219-222` — `||` operator with short-circuit evaluation; evaluates left first, skips right if left is true
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-expression-operators.ts:203-223` — `parseLogicalOr()` at precedence 5, left-associative
  - `packages/core/src/desugarer/desugarer.ts:327-328` — BinOp with "LogicalOr" desugars
  - `packages/core/src/codegen/es2020/emit-operators.ts:138` — Maps LogicalOr to "||"
- **Tests**:
  - E2E: `04-expressions.test.ts:logical OR short-circuit` (line 160-162), `OR short-circuit skips right side` (line 183-196)
- **Coverage assessment**: ✅ Adequate

### F-26: Logical NOT Operator (!)

- **Spec ref**: `docs/spec/04-expressions/basic-expressions.md:232-246` — `!` operator has two meanings: logical NOT (Bool → Bool) and dereference (Ref<T> → T); type-based disambiguation
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-expression-operators.ts:450-493` — `parseUnary()` matches OP_BANG; creates UnaryOp with "LogicalNot"
  - `packages/core/src/typechecker/infer/infer-operators.ts` — Type checker determines meaning: if operand is Bool, it's LogicalNot; if operand is Ref<T>, creates Deref
  - `packages/core/src/codegen/es2020/emit-operators.ts:148` — Maps LogicalNot to "!"; Deref maps to null (special handling as x.$value)
- **Tests**:
  - E2E: `04-expressions.test.ts:logical NOT` (line 164-166)
- **Coverage assessment**: ⚠️ Thin — logical NOT on Bool tested, but dereference on Ref<T> not explicitly tested in 04-expressions tests (it's in mutable-references tests)

### F-27: String Concatenation Operator (&)

- **Spec ref**: `docs/spec/04-expressions/basic-expressions.md:250-271` — `&` operator for string concatenation; strict typing (no automatic coercion); both operands must be String
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-expression-operators.ts:346-365` — `parseConcat()` matches OP_AMPERSAND at precedence 12, left-associative
  - `packages/core/src/desugarer/desugarer.ts:327-328` — BinOp with "Concat" desugars
  - `packages/core/src/typechecker/infer/infer-operators.ts` — Type checker enforces both operands are String
  - `packages/core/src/codegen/es2020/emit-operators.ts:139` — Maps Concat to "+" (JavaScript string concatenation)
- **Tests**:
  - E2E: `04-expressions.test.ts:string concat with & operator` (line 200-202), `string concat rejects non-string` (line 204-206)
- **Coverage assessment**: ✅ Adequate

### F-28: Field Access Operator (.)

- **Spec ref**: `docs/spec/04-expressions/basic-expressions.md:278-316` — Field access via dot notation; highest precedence (16); keywords can be field names
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-expression-operators.ts:499+` — `parseCall()` and postfix operators handle field access at highest precedence
  - `packages/core/src/desugarer/desugarer.ts:282-288` — RecordAccess desugars to CoreRecordAccess
  - `packages/core/src/codegen/es2020/emit-expressions/records.ts` — Emits record.field
- **Tests**:
  - No explicit test in 04-expressions; covered in record tests (04 data-literals would cover this, outside scope)
- **Coverage assessment**: ⚠️ Thin — no basic field access test in this section

### F-29: Pipe Operator (|>)

- **Spec ref**: `docs/spec/04-expressions/basic-expressions.md:319-330` — Pipe operator applies value to function left-to-right; syntactic sugar for function application
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-expression-operators.ts:149-167` — `parsePipe()` matches OP_PIPE_GT at precedence 3, left-associative
  - `packages/core/src/desugarer/desugarPipe.ts` — Desugars `a |> f` to `f(a)`
- **Tests**:
  - Desugarer: `desugarer/pipes.test.ts` (covers pipe desugaring)
  - E2E: Pipe tests exist elsewhere (not in 04-expressions.test.ts)
- **Coverage assessment**: ⚠️ Thin — pipe is tested at desugarer level but no E2E test in 04-expressions

### F-30: List Cons Operator (::)

- **Spec ref**: `docs/spec/04-expressions/basic-expressions.md:338-345` — `::` prepends element to list; right-associative
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-expression-operators.ts:320-339` — `parseCons()` matches OP_CONS at precedence 11, right-associative
  - `packages/core/src/desugarer/desugarer.ts:327-328` — BinOp with "Cons" desugars to Cons variant construction
- **Tests**:
  - No explicit test in 04-expressions; covered in list tests (04 data-literals)
- **Coverage assessment**: ⚠️ Thin — cons is not tested in this section

### F-31: Function Composition Operators (>> and <<)

- **Spec ref**: `docs/spec/04-expressions/basic-expressions.md:331-336` — `>>` (forward) and `<<` (backward) composition; right-associative
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-expression-operators.ts:174-196` — `parseComposition()` matches OP_GT_GT and OP_LT_LT at precedence 4, right-associative
  - `packages/core/src/desugarer/desugarComposition.ts` — Desugars composition to lambda wrapping
- **Tests**:
  - Parser: `expression-operators.test.ts` (composition tests)
  - Desugarer: `desugarer/composition.test.ts` (composition desugaring)
- **Coverage assessment**: ⚠️ Thin — composition is not tested in 04-expressions E2E

### F-32: Operator Precedence (All 16 Levels)

- **Spec ref**: `docs/spec/13-appendix.md:83-151` — Complete precedence table from 0 (lambda) to 16 (field access)
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-expression-operators.ts` — Precedence levels per function docstrings: parseLambda (0), parseRefAssign (1), parseTypeAnnotation (2), parsePipe (3), parseComposition (4), parseLogicalOr (5), parseLogicalAnd (6), parseEquality (7), parseComparison (8), parseConcat (10), parseCons (11, right-assoc), parseAdditive (12), parseMultiplicative (13), parseUnary (14), parseCall (15). These now match F-09/F-19 above and are the canonical numbering taken from the parser source docstrings.
  - Parser uses precedence climbing
- **Tests**:
  - Parser: `operator-edge-cases.test.ts` includes property test for precedence round-trip
  - Snapshot: `snapshot-expressions.test.ts` validates precedence via AST shape
- **Coverage assessment**: ✅ Adequate

### F-33: Operator Associativity (Left and Right)

- **Spec ref**: `docs/spec/13-appendix.md:83-151` — Most operators left-associative; lambda, composition, cons, and assignment right-associative
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-expression-operators.ts` — Left-associative operators use while loops; right-associative (lambda, cons, composition) use recursion
  - Examples: parseLambda line 78 (right-assoc), parseCons line 329 (right-assoc), parseComposition line 193 (right-assoc), parseLogicalOr line 204 (left-assoc)
- **Tests**:
  - Parser: `expression-operators.test.ts:associativity` (various tests for associativity)
- **Coverage assessment**: ✅ Adequate

### F-34: If Expression — Complete Form (if-then-else)

- **Spec ref**: `docs/spec/04-expressions/control-flow.md:17-51` — Both branches required; both must have same type; returns value of matching branch
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-expression-primary.ts:185-227` — Parses if/then/else; inserts UnitLit for missing else (line 215-218)
  - `packages/core/src/desugarer/desugarer.ts:208-233` — Desugars If to CoreMatch on boolean (creates two cases for true/false)
  - `packages/core/src/typechecker/infer/infer-expressions.ts` — Type checker enforces same type for both branches
- **Tests**:
  - E2E: `04-expressions.test.ts:if-then-else expression` (line 210-212), `if-then-else with same types required` (line 214-216), `nested if-else chains` (line 222-231)
- **Coverage assessment**: ✅ Adequate

### F-35: If Expression — Missing Else (Returns Unit)

- **Spec ref**: `docs/spec/04-expressions/control-flow.md:53-92` — If without else returns Unit; then branch must have type Unit
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-expression-primary.ts:210-218` — Parser inserts UnitLit as else branch if missing
  - `packages/core/src/typechecker/infer/infer-expressions.ts` — Type checker enforces then branch has type Unit when else is omitted
- **Tests**:
  - E2E: `04-expressions.test.ts:if without else returns Unit` (line 218-220), `if without else with non-Unit type is error` (line 282-284)
- **Coverage assessment**: ✅ Adequate

### F-36: If Expression — Short-Circuit Evaluation

- **Spec ref**: `docs/spec/04-expressions/control-flow.md:124-140` — Only one branch is evaluated based on condition
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/desugarer/desugarer.ts:208-233` — Desugars to CoreMatch, which is single-path evaluation at runtime
  - JavaScript if/else inherently short-circuits (codegen emits if/else)
- **Tests**:
  - E2E: Implicit in all if tests; no explicit side-effect test
- **Coverage assessment**: ⚠️ Thin — short-circuit behavior not explicitly tested with side effects

### F-37: Match Expression — Pattern Matching

- **Spec ref**: `docs/spec/04-expressions/control-flow.md:142-153` — Match expressions test patterns top-to-bottom until one matches; exhaustiveness checking required
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-expression-complex.ts:47-109` — `parseMatchExpr()` parses match cases with patterns and optional guards
  - `packages/core/src/desugarer/desugarer.ts:237-255` — Desugars Match with or-pattern expansion
  - `packages/core/src/typechecker/exhaustiveness.ts` — Exhaustiveness checking (outside scope of this audit)
- **Tests**:
  - E2E: `04-expressions.test.ts:match expression with variants` (line 233-247), `nested match as expression` (line 286-300)
- **Coverage assessment**: ✅ Adequate

### F-38: Match Expression — Guards (Pattern Guards)

- **Spec ref**: `docs/spec/04-expressions/control-flow.md:68-76` — Optional `when` guard after pattern; evaluated if pattern matches; full match expression is second-level priority expression
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-expression-complex.ts:71-75` — Parses optional `when` guard expression
  - `packages/core/src/desugarer/desugarer.ts:248-250` — Preserves guard in desugared CoreMatchCase
  - `packages/core/src/typechecker/infer/infer-expressions.ts` — Type checker validates guard has type Bool
- **Tests**:
  - Guard tests exist in pattern-matching tests; not explicitly in 04-expressions
- **Coverage assessment**: ⚠️ Thin — no explicit guard test in 04-expressions

### F-39: While Loop — Syntax and Semantics

- **Spec ref**: `docs/spec/04-expressions/control-flow.md:157-207` — While loops are expressions returning Unit; body executed repeatedly while condition is true; pre-test loop (may execute zero times); no break/continue
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-expression-primary.ts:287-307` — Parses while condition { body }
  - `packages/core/src/desugarer/desugarer.ts:390-454` — Desugars to let rec loop = () => if cond then { body; loop() } else (); loop()
- **Tests**:
  - Parser: `while-loops.test.ts` (while parsing tests)
  - Desugarer: `while-loops.test.ts` (while desugaring tests)
  - E2E: `04-expressions.test.ts:while loop` (line 249-260), `while loop returns Unit` (line 262-267), `while loop with false condition executes zero times` (line 269-280)
- **Coverage assessment**: ✅ Adequate

### F-40: While Loop — Condition Type and Body Type

- **Spec ref**: `docs/spec/04-expressions/control-flow.md:225-250` — Condition must be Bool; body must be Unit
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/typechecker/infer/infer-expressions.ts` — Type checker enforces condition is Bool and body is Unit
- **Tests**:
  - No explicit error test in 04-expressions for these type violations
- **Coverage assessment**: ⚠️ Thin — type violations not explicitly tested

### F-41: For Loops Not Supported

- **Spec ref**: `docs/spec/04-expressions/control-flow.md:397-403` — For loops are NOT supported; use functional operations (List.map, List.fold) or while loops
- **Status**: ✅ Implemented (parser rejects for keyword)
- **Implementation**:
  - `packages/core/src/lexer/tokens.ts` — `for` is reserved keyword
  - Parser and typechecker do not implement for loop syntax
- **Tests**:
  - No test needed; feature explicitly not supported per spec
- **Coverage assessment**: ✅ Adequate (correctly not implemented)

### F-42: Async/Await Not Supported

- **Spec ref**: `docs/spec/04-expressions/control-flow.md:407-420` — async/await reserved for future; cannot be used as identifiers
- **Status**: ✅ Implemented (reserved keywords)
- **Implementation**:
  - `packages/core/src/lexer/tokens.ts` — `async` and `await` are reserved keywords
- **Tests**:
  - No test needed; reserved keywords prevent use
- **Coverage assessment**: ✅ Adequate

### F-43: Try/Catch Is Not Part of Vibefun's Error Model (Use Result/Option)

- **Spec ref**: `docs/spec/04-expressions/control-flow.md:424-475` — Try/catch is **not** Vibefun's error-handling mechanism; use `Result<T, E>` and `Option<T>` instead.
- **Status**: ✅ Implemented as a JS-interop construct (not as a Vibefun error-handling feature). The spec claim is "not part of Vibefun's error model" — that part holds. The construct IS available syntactically, scoped to `unsafe` JS-interop contexts.
- **Implementation**:
  - Parser: `packages/core/src/parser/parse-expression-primary.ts:253-284` — Try/catch is parsed (intended for JavaScript interop within `unsafe` blocks)
  - `packages/core/src/desugarer/desugarer.ts:368-375` — Desugars TryCatch to CoreTryCatch
  - Typechecker: no special Vibefun-level semantics; it operates on external values inside `unsafe`
- **Tests**:
  - E2E: `tests/e2e/try-catch.test.ts` exercises the JS-interop scenario.
  - No E2E test in `04-expressions.test.ts` (and none expected — this construct is for JS interop, not Vibefun semantics)
- **Coverage assessment**: ⚠️ Thin — the JS-interop semantics are exercised end-to-end, but there is no test that explicitly asserts try/catch is rejected outside an `unsafe` block (which would pin down the spec's "not Vibefun error handling" half).
- **Notes**: Read F-43 in two halves: (a) Vibefun-level error handling = ✅ via Result/Option (not try/catch); (b) JS-interop-level try/catch inside `unsafe` blocks = ✅ available, ⚠️ thin coverage of the boundary check.

### F-44: Evaluation Order — General Principles

- **Spec ref**: `docs/spec/04-expressions/evaluation-order.md:1-14` — Strict evaluation; left-to-right; once only; short-circuit for boolean operators
- **Status**: ✅ Implemented
- **Implementation**:
  - Parser and desugarer enforce evaluation order via desugaring; codegen emits sequential JavaScript
- **Tests**:
  - Property: `operator-edge-cases.test.ts` validates output is deterministic
  - E2E: Implicit in all tests; no explicit side-effect test
- **Coverage assessment**: ⚠️ Thin — evaluation order guarantees not explicitly tested in spec-validation suite

### F-45: Function Application — Argument Evaluation Left-to-Right

- **Spec ref**: `docs/spec/04-expressions/evaluation-order.md:18-42` — Arguments evaluated left-to-right before function body executes
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/desugarer/desugarer.ts:190-204` — Function application desugars to curried single-argument applications; arguments are reduced in order
  - JavaScript naturally evaluates arguments left-to-right
- **Tests**:
  - No explicit left-to-right argument evaluation test in 04-expressions
- **Coverage assessment**: ⚠️ Thin — implicitly correct but not explicitly tested

### F-46: Binary Operators — Evaluation Order (Left-to-Right)

- **Spec ref**: `docs/spec/04-expressions/evaluation-order.md:72-96` — Arithmetic and comparison operators evaluate left operand first, then right
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/desugarer/desugarBinOp.ts` — Binary operations desugar to function calls with operands as arguments
  - JavaScript evaluates left operand before right in binary operations
- **Tests**:
  - No explicit test of left-to-right order with side effects
- **Coverage assessment**: ⚠️ Thin — implicitly correct but not explicitly tested

### F-47: Logical AND Short-Circuit (Left operand false skips right)

- **Spec ref**: `docs/spec/04-expressions/evaluation-order.md:100-121` — Right operand not evaluated if left is false
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/codegen/es2020/emit-operators.ts:137` — Maps LogicalAnd to JavaScript "&&", which naturally short-circuits
- **Tests**:
  - E2E: `04-expressions.test.ts:AND short-circuit skips right side` (line 168-181) — explicitly tests that counter isn't incremented
- **Coverage assessment**: ✅ Adequate

### F-48: Logical OR Short-Circuit (Left operand true skips right)

- **Spec ref**: `docs/spec/04-expressions/evaluation-order.md:122-142` — Right operand not evaluated if left is true
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/codegen/es2020/emit-operators.ts:138` — Maps LogicalOr to JavaScript "||", which naturally short-circuits
- **Tests**:
  - E2E: `04-expressions.test.ts:OR short-circuit skips right side` (line 183-196) — explicitly tests that counter isn't incremented
- **Coverage assessment**: ✅ Adequate

### F-49: Record Construction — Evaluation Order (Left-to-Right)

- **Spec ref**: `docs/spec/04-expressions/evaluation-order.md:155-178` — Record fields evaluated left-to-right in source order
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/desugarer/desugarer.ts:258-279` — Record field values are desugared in order
- **Tests**:
  - No explicit left-to-right field evaluation test in 04-expressions (record tests in 04 data-literals)
- **Coverage assessment**: ⚠️ Thin — not tested in this section

### F-50: List Construction — Evaluation Order (Left-to-Right)

- **Spec ref**: `docs/spec/04-expressions/evaluation-order.md:205-226` — List elements evaluated left-to-right
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/desugarer/desugarListLiteral.ts` — List elements desugared in order
- **Tests**:
  - No explicit test in 04-expressions (list tests in 04 data-literals)
- **Coverage assessment**: ⚠️ Thin — not tested in this section

### F-51: If Expression — Evaluation Order (One Branch Only)

- **Spec ref**: `docs/spec/04-expressions/evaluation-order.md:250-272` — Condition evaluated first; exactly one branch evaluated
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/desugarer/desugarer.ts:208-233` — If desugars to match, which evaluates scrutinee once and branches to one case
- **Tests**:
  - Implicit in if/then/else tests; no explicit side-effect test
- **Coverage assessment**: ⚠️ Thin — implicitly correct but not explicitly tested

### F-52: Match Expression — Evaluation Order (Scrutinee Once, Patterns Top-to-Bottom)

- **Spec ref**: `docs/spec/04-expressions/evaluation-order.md:274-303` — Scrutinee evaluated once; patterns tested top-to-bottom until match; guards evaluated if pattern matches
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/desugarer/desugarer.ts:237-255` — Match expression desugars; scrutinee is captured in let binding before matching
  - `packages/core/src/typechecker/exhaustiveness.ts` — Enforces top-to-bottom checking
- **Tests**:
  - Match tests exist; not explicit about scrutinee-once evaluation
- **Coverage assessment**: ⚠️ Thin — scrutinee-once not explicitly tested

### F-53: While Loop — Evaluation Order (Condition Checked Before Each Iteration)

- **Spec ref**: `docs/spec/04-expressions/evaluation-order.md:305-338` — Condition evaluated before each iteration (pre-test); may execute zero times
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/desugarer/desugarer.ts:390-454` — While desugars to recursive function with if condition { body; loop() } else ()
  - Condition is re-evaluated on each recursive call
- **Tests**:
  - E2E: `04-expressions.test.ts:while loop with false condition executes zero times` (line 269-280) — tests zero-iteration case
- **Coverage assessment**: ✅ Adequate

### F-54: Block Expression — Evaluation Order (Sequential, Return Last)

- **Spec ref**: `docs/spec/04-expressions/evaluation-order.md:320-354` — Expressions evaluated sequentially; last expression returned
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-expression-complex.ts:200+` — `parseBlockExpr()` parses block statements
  - `packages/core/src/desugarer/desugarBlock.ts` — Desugars block to nested let bindings
- **Tests**:
  - Block tests exist; sequencing evaluated via desugarer
- **Coverage assessment**: ⚠️ Thin — implicit in block tests but not explicitly validated

### F-55: Pipe Operator — Evaluation Order (Left-to-Right)

- **Spec ref**: `docs/spec/04-expressions/evaluation-order.md:356-381` — Piped value evaluated first, then functions applied left-to-right
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/desugarer/desugarPipe.ts` — Desugars pipe to function application
- **Tests**:
  - Desugarer tests validate pipe desugaring; no E2E test in 04-expressions
- **Coverage assessment**: ⚠️ Thin — not tested in this section

### F-56: Reference Creation and Assignment — Evaluation Order

- **Spec ref**: `docs/spec/04-expressions/evaluation-order.md:393-435` — mut x = expr: expr evaluated first, then ref created; ref := expr: ref evaluated first, then expr, then assigned
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/desugarer/desugarer.ts:331-337` — Reference operations are desugared in order
- **Tests**:
  - Reference tests exist elsewhere (outside scope of 04-expressions)
- **Coverage assessment**: ⚠️ Thin — not tested in this section

---

## Feature Gaps (this section)

- **F-08**: Partial application is not explicitly tested; only implicit via multi-argument functions. Add a test like `let add5 = add(5); let result = add5(3);` to validate partial application explicitly.
- **F-15**: Division by zero at runtime is not explicitly tested. While JavaScript handles it, add a test that verifies the panic behavior or delegates to stdlib tests.
- **F-26**: Dereference operator (! on Ref<T>) is not tested in 04-expressions tests; it belongs in mutable-references tests but should be cross-validated here.
- **F-28**: Field access operator is not tested in 04-expressions tests; it belongs in 04-expressions/data-literals tests (outside scope).
- **F-29, F-30, F-31**: Pipe and composition operators are not tested in 04-expressions E2E tests; they are tested at parser/desugarer level but not end-to-end.
- **F-36**: If expression short-circuit evaluation is not explicitly tested with side effects to confirm only one branch executes.
- **F-38**: Match expression guards are not tested in 04-expressions; guard validation is tested elsewhere.
- **F-40**: While loop type violations (non-Bool condition, non-Unit body) are not explicitly tested in 04-expressions.
- **F-44, F-45, F-46, F-49, F-50, F-51, F-52, F-54, F-55**: Evaluation order guarantees are not comprehensively tested; most are implicitly correct but unvalidated with side effects.

---

## Testing Gaps (this section)

- **Partial application (F-08)**: Add E2E test: `let add = (x: Int, y: Int) => x + y; let add5 = add(5); expectRunOutput(..., "8")` to validate currying behavior.
- **Division by zero panic (F-15)** — covered: integer panic + float Infinity/NaN are tested at the codegen execution-tests layer and in `09-error-handling.test.ts`. An additional E2E case in `04-expressions.test.ts` would be a convenience cross-link, not a coverage gap. Item retained here for navigability only.
- **Dereference in expressions (F-26)**: Add cross-validation test in 04-expressions for `!` on Ref<T>.
- **If short-circuit with side effects (F-36)**: Add E2E test: `let mut x = ref(0); let r = if true then { x := 1; } else { x := 2; }; expectRunOutput(..., String.fromInt(!x), "1")` to verify only one branch executes.
- **While loop type errors (F-40)**: Add error tests: `expectCompileError('while 42 { () };')` (non-Bool) and `expectCompileError('while true { 42; };')` (non-Unit body).
- **Match scrutinee-once evaluation (F-52)**: Add test verifying side effects in scrutinee occur exactly once.
- **Evaluation order left-to-right (F-45, F-46)**: Add property tests or explicit side-effect tests for argument evaluation order.
- **Evaluation order in records/lists (F-49, F-50)**: Add tests validating field/element evaluation order via side effects.
- **Block sequential evaluation (F-54)**: Add explicit test for block statement ordering.
- **Pipe evaluation order (F-55)**: Add E2E test validating pipe evaluation order.

---

## Testing Redundancies (this section)

_None_.

All tests serve distinct purposes (parser acceptance, type validation, runtime behavior, short-circuit verification). No duplicate assertions detected.

---

**Summary**: 56 features identified; 23 entries marked ⚠️ Partial / ⚠️ Thin / ❌ Missing / ❌ Untested across status and coverage assessments combined (recounted after the F-15 correction). The "Testing Gaps (this section)" list contains 10 explicit bullets covering 12 distinct F-NN IDs (some bullets reference multiple IDs, e.g. F-45/F-46, F-49/F-50). 0 redundant tests.
