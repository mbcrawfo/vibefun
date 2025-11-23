# Desugarer Requirements for Vibefun

**Last Updated:** 2025-11-22
**Status:** Comprehensive requirements analysis based on spec and implementation review

## Overview

### Purpose

The **desugarer** is the third phase of the Vibefun compilation pipeline:

```
Source Code → Lexer → Parser → Desugarer → Type Checker → Optimizer → Code Generator
                      ↓         ↓           ↓
                  Surface AST  Core AST   Typed Core AST
```

The desugarer transforms the **Surface AST** (produced by the parser) into a simpler **Core AST** by:
- Eliminating syntactic sugar
- Simplifying complex constructs into primitive operations
- Normalizing representations (e.g., currying multi-parameter functions)
- Preserving semantic meaning while reducing language constructs

### Design Philosophy

1. **Simplification**: Reduce surface syntax to minimal core constructs
2. **Semantic Preservation**: Maintain exact runtime behavior
3. **Type Checker Simplification**: Make type inference easier with fewer node types
4. **Debuggability**: Maintain location information for error reporting
5. **Explicit Over Implicit**: Make implicit behavior explicit (e.g., if-without-else)

### Current Implementation

**Location:** `/packages/core/src/desugarer/`

**Key Files:**
- `desugarer.ts` - Main desugaring orchestration (350+ lines)
- `curryLambda.ts` - Lambda currying transformation
- `desugarPipe.ts` - Pipe operator desugaring
- `desugarComposition.ts` - Composition operator desugaring
- `desugarBinOp.ts` - Binary operator desugaring
- `desugarBlock.ts` - Block expression desugaring
- `desugarListLiteral.ts` - List literal desugaring
- `desugarListPattern.ts` - List pattern desugaring
- `desugarListWithConcats.ts` - List spread handling
- `buildConsChain.ts` - Helper for building cons chains
- Type-related: `desugarTypeDefinition.ts`, `desugarTypeExpr.ts`, etc.
- `FreshVarGen.ts` - Fresh variable name generation
- `DesugarError.ts` - Error handling

All modules have corresponding `.test.ts` files with comprehensive test coverage.

---

## AST Structure

### Surface AST (Parser Output)

**Expression Nodes:**
```typescript
type Expr =
  | { kind: 'IntLit'; value: number }
  | { kind: 'FloatLit'; value: number }
  | { kind: 'StringLit'; value: string }
  | { kind: 'BoolLit'; value: boolean }
  | { kind: 'UnitLit' }
  | { kind: 'Var'; name: string }
  | { kind: 'Let'; pattern: Pattern; value: Expr; body: Expr; mutable: boolean; recursive: boolean }
  | { kind: 'Lambda'; params: Param[]; body: Expr }  // Multi-parameter!
  | { kind: 'App'; func: Expr; args: Expr[] }        // Multi-argument!
  | { kind: 'If'; condition: Expr; thenBranch: Expr; elseBranch: Expr | null }
  | { kind: 'Match'; expr: Expr; cases: MatchCase[] }
  | { kind: 'BinOp'; op: BinOp; left: Expr; right: Expr }
  | { kind: 'UnaryOp'; op: UnaryOp; operand: Expr }
  | { kind: 'Pipe'; left: Expr; right: Expr }
  | { kind: 'Record'; fields: RecordField[] }        // May have spreads
  | { kind: 'RecordAccess'; record: Expr; field: string }
  | { kind: 'RecordUpdate'; record: Expr; updates: RecordField[] }  // May have spreads
  | { kind: 'List'; elements: ListElement[] }        // May have spreads
  | { kind: 'Tuple'; elements: Expr[] }
  | { kind: 'Block'; exprs: Expr[] }
  | { kind: 'While'; condition: Expr; body: Expr }
  | { kind: 'TypeAnnotation'; expr: Expr; typeExpr: TypeExpr }
  | { kind: 'Unsafe'; expr: Expr }
```

**Binary Operators (17 total):**
- Arithmetic: `Add`, `Sub`, `Mul`, `Div`, `Mod`, `Pow`
- Comparison: `Eq`, `Neq`, `Lt`, `Lte`, `Gt`, `Gte`
- Logical: `And`, `Or`
- Special: `Concat` (string &), `Cons` (list ::), `RefAssign` (mutable :=)

**Unary Operators (3 total):**
- `Neg` (numeric negation)
- `Not` (logical negation)
- `Deref` (mutable reference dereference !)

**Pattern Nodes:**
```typescript
type Pattern =
  | { kind: 'VarPattern'; name: string }
  | { kind: 'WildcardPattern' }
  | { kind: 'LiteralPattern'; value: Literal }
  | { kind: 'ConstructorPattern'; name: string; args: Pattern[] }
  | { kind: 'RecordPattern'; fields: RecordPatternField[] }
  | { kind: 'ListPattern'; elements: Pattern[]; rest: Pattern | null }
  | { kind: 'TuplePattern'; elements: Pattern[] }
  | { kind: 'OrPattern'; patterns: Pattern[] }
  | { kind: 'TypeAnnotatedPattern'; pattern: Pattern; typeExpr: TypeExpr }
```

### Core AST (Desugarer Output)

**Simplified Expression Nodes:**
```typescript
type CoreExpr =
  | { kind: 'CoreIntLit'; value: number }
  | { kind: 'CoreFloatLit'; value: number }
  | { kind: 'CoreStringLit'; value: string }
  | { kind: 'CoreBoolLit'; value: boolean }
  | { kind: 'CoreUnitLit' }
  | { kind: 'CoreVar'; name: string }
  | { kind: 'CoreLambda'; param: string; body: CoreExpr }  // Single parameter only!
  | { kind: 'CoreApp'; func: CoreExpr; arg: CoreExpr }     // Single argument only!
  | { kind: 'CoreLet'; pattern: CorePattern; value: CoreExpr; body: CoreExpr }
  | { kind: 'CoreMatch'; expr: CoreExpr; cases: CoreMatchCase[] }
  | { kind: 'CoreIf'; condition: CoreExpr; thenBranch: CoreExpr; elseBranch: CoreExpr }
  | { kind: 'CoreRecord'; fields: CoreRecordField[] }
  | { kind: 'CoreRecordAccess'; record: CoreExpr; field: string }
  | { kind: 'CoreRecordUpdate'; record: CoreExpr; updates: CoreRecordField[] }
  | { kind: 'CoreTuple'; elements: CoreExpr[] }
  | { kind: 'CoreVariantConstruction'; variant: string; args: CoreExpr[] }
  | { kind: 'CoreTypeAnnotation'; expr: CoreExpr; typeExpr: CoreTypeExpr }
  | { kind: 'CoreUnsafe'; expr: CoreExpr }
  | { kind: 'CoreLetRecExpr'; bindings: Array<{ name: string; value: CoreExpr }>; body: CoreExpr }
```

**Simplified Pattern Nodes:**
```typescript
type CorePattern =
  | { kind: 'CoreVarPattern'; name: string }
  | { kind: 'CoreWildcardPattern' }
  | { kind: 'CoreLiteralPattern'; value: Literal }
  | { kind: 'CoreVariantPattern'; variant: string; args: CorePattern[] }
  | { kind: 'CoreRecordPattern'; fields: CoreRecordPatternField[] }
  | { kind: 'CoreTuplePattern'; elements: CorePattern[] }
```

**Key Simplifications:**
- ❌ No `CorePipe` - desugared to applications
- ❌ No `CoreBinOp`/`CoreUnaryOp` - desugared to function calls or core operations
- ❌ No `CoreBlock` - desugared to nested lets
- ❌ No `CoreWhile` - desugared to recursive functions
- ❌ No `CoreList` - desugared to variant constructions (Cons/Nil)
- ❌ No `CoreOrPattern` - expanded to multiple match cases
- ❌ No `CoreListPattern` - desugared to variant patterns
- ❌ No `CoreTypeAnnotatedPattern` - type annotations stripped
- ✅ Single-parameter lambdas and single-argument applications only
- ✅ All if-expressions have explicit else branches

---

## Transformation Requirements

### Category 1: Fully Implemented ✅

These transformations are complete and tested.

#### 1.1 List Literals → Cons/Nil Chains

**Purpose:** Desugar list literal syntax to variant constructions.

**Surface Syntax:**
```vibefun
[1, 2, 3]
[]
```

**Core Representation:**
```vibefun
Cons(1, Cons(2, Cons(3, Nil)))
Nil
```

**Implementation:** `desugarListLiteral.ts`

**Edge Cases:**
- Empty list `[]` → `Nil`
- Single element `[x]` → `Cons(x, Nil)`
- Nested lists `[[1], [2]]` → Recursive desugaring

**Semantic Invariant:** List ordering and nesting preserved.

---

#### 1.2 List Literals with Spreads → Cons Chains with Concatenation

**Purpose:** Handle spread syntax in list literals.

**Surface Syntax:**
```vibefun
[1, ...xs, 2, ...ys]
```

**Core Representation:**
```vibefun
Cons(1, List.concat(xs, Cons(2, ys)))
```

**Implementation:** `desugarListWithConcats.ts`, `buildConsChain.ts`

**Edge Cases:**
- Only spreads: `[...xs, ...ys]` → `List.concat(xs, ys)`
- Spread at start: `[...xs, 1]` → `List.concat(xs, Cons(1, Nil))`
- Spread at end: `[1, ...xs]` → `Cons(1, xs)`

**Semantic Invariant:** Elements in order, spreads flattened correctly.

---

#### 1.3 Multi-Parameter Lambdas → Curried Lambdas

**Purpose:** Convert multi-parameter functions to curried single-parameter functions.

**Surface Syntax:**
```vibefun
(x, y, z) => x + y + z
```

**Core Representation:**
```vibefun
(x) => (y) => (z) => x + y + z
```

**Implementation:** `curryLambda.ts`

**Edge Cases:**
- Single parameter: `(x) => x` → `(x) => x` (no change)
- Zero parameters: Not allowed in surface syntax
- Type annotations: `(x: Int, y: Int) => x + y` → `(x: Int) => (y: Int) => x + y`

**Semantic Invariant:** Partial application enabled, same result when fully applied.

---

#### 1.4 Multi-Argument Applications → Nested Applications

**Purpose:** Convert multi-argument function calls to nested single-argument applications.

**Surface Syntax:**
```vibefun
add(10, 20, 30)
```

**Core Representation:**
```vibefun
((add(10))(20))(30)
```

**Implementation:** Main `desugarer.ts` App case

**Edge Cases:**
- Single argument: `f(x)` → `f(x)` (no change)
- Zero arguments: `f()` → Unit application or nullary handling
- Higher-order: `map(f, xs)` → `map(f)(xs)`

**Semantic Invariant:** Left-to-right evaluation, same final result.

---

#### 1.5 Pipe Operator → Reverse Function Application

**Purpose:** Desugar pipeline syntax to function applications.

**Surface Syntax:**
```vibefun
data |> f |> g |> h
```

**Core Representation:**
```vibefun
h(g(f(data)))
```

**Implementation:** `desugarPipe.ts`

**Edge Cases:**
- Single pipe: `x |> f` → `f(x)`
- Pipe with application: `x |> f(y)` → `f(y)(x)`
- Complex expressions: `(x + 1) |> f` → `f(x + 1)`

**Semantic Invariant:** Left-to-right data flow, right-to-left function nesting.

---

#### 1.6 Composition Operators → Lambda Expressions

**Purpose:** Desugar function composition to explicit lambdas.

**Surface Syntax:**
```vibefun
f >> g >> h      // Forward composition
f << g << h      // Backward composition
```

**Core Representation:**
```vibefun
(x) => h(g(f(x)))     // Forward: f then g then h
(x) => f(g(h(x)))     // Backward: h then g then f
```

**Implementation:** `desugarComposition.ts`

**Edge Cases:**
- Single composition: `f >> g` → `(x) => g(f(x))`
- Mixed with application: `(f >> g)(x)` → `((x) => g(f(x)))(x)`
- Composition chains: Left-associative parsing

**Semantic Invariant:** Function composition associativity preserved.

---

#### 1.7 String Concatenation → Core Operation (Pass-Through)

**Purpose:** String concatenation is passed through as a core operation for code generator.

**Surface Syntax:**
```vibefun
"Hello" & " " & "World"
```

**Core Representation:**
```vibefun
CoreBinOp("Concat", CoreBinOp("Concat", "Hello", " "), "World")
```

**Implementation:** `desugarBinOp.ts` - Passes through as `CoreBinOp` "Concat"

**Design Decision:** String concatenation is kept as a core binary operator rather than desugaring to `String.concat()` calls. This allows the code generator to optimize string concatenation and keeps the core AST simpler.

**Edge Cases:**
- Single concatenation: `s1 & s2` → `CoreBinOp("Concat", s1, s2)`
- Chained concatenations: Left-associative
- Mixed with other operators: Precedence rules apply

**Semantic Invariant:** Left-to-right concatenation order.

---

#### 1.8 While Loops → Recursive Functions

**Purpose:** Desugar imperative loops to functional recursion.

**Surface Syntax:**
```vibefun
while condition {
  body
}
```

**Core Representation:**
```vibefun
let rec loop = () =>
  match condition {
    | true => { let _ = body in loop() }
    | false => ()
  }
in loop()
```

**Implementation:** Main `desugarer.ts` While case

**Edge Cases:**
- Empty body: `while c {}` → Loop that does nothing when true
- Complex condition: Condition evaluated each iteration
- Break/continue: Not supported (functional style)

**Semantic Invariant:** Loop continues while condition is true, returns unit.

**Notes:**
- Uses match on boolean instead of if for clarity
- Body result discarded (bound to `_`)
- Returns `()` when loop terminates

---

#### 1.9 Block Expressions → Nested Let Bindings

**Purpose:** Convert sequential expressions to nested let bindings with proper scoping.

**Surface Syntax:**
```vibefun
{
  let x = 10
  let y = x + 5
  y * 2
}
```

**Core Representation:**
```vibefun
let x = 10 in
let y = x + 5 in
y * 2
```

**Implementation:** `desugarBlock.ts`

**Edge Cases:**
- Empty block: `{}` → `()`
- Single expression: `{ x }` → `x`
- Statements without bindings: Need temporary bindings with `_`

**Semantic Invariant:** Sequential evaluation, proper scoping, last expression is result.

---

#### 1.10 List Patterns → Variant Patterns

**Purpose:** Desugar list pattern matching to variant pattern matching.

**Surface Syntax:**
```vibefun
match xs {
  | [] => "empty"
  | [x] => "singleton"
  | [x, y, ...rest] => "multiple"
}
```

**Core Representation:**
```vibefun
match xs {
  | Nil => "empty"
  | Cons(x, Nil) => "singleton"
  | Cons(x, Cons(y, rest)) => "multiple"
}
```

**Implementation:** `desugarListPattern.ts`

**Edge Cases:**
- Empty list pattern: `[]` → `Nil`
- Rest patterns: `[x, ...xs]` → `Cons(x, xs)`
- Nested list patterns: `[[x]]` → `Cons(Cons(x, Nil), Nil)`

**Semantic Invariant:** Same pattern matching semantics, destructuring preserved.

---

#### 1.11 Or-Patterns → Multiple Match Cases

**Purpose:** Expand or-patterns into separate match cases.

**Surface Syntax:**
```vibefun
match x {
  | Some(1) | Some(2) | Some(3) => "small"
  | Some(n) => "other"
  | None => "none"
}
```

**Core Representation:**
```vibefun
match x {
  | Some(1) => "small"
  | Some(2) => "small"
  | Some(3) => "small"
  | Some(n) => "other"
  | None => "none"
}
```

**Implementation:** Main `desugarer.ts` - expands or-patterns at match case level

**Edge Cases:**
- Single pattern in or: `| p => e` → `| p => e` (no change)
- Or-patterns with guards: Each expanded case gets same guard
- Nested or-patterns: Flattened recursively

**Semantic Invariant:** First-match semantics preserved, same variables bound.

**Constraints:**
- All patterns in or must bind same variables with same types
- Guards (if present) duplicated to each expanded case

---

#### 1.12 Type Definitions Desugaring

**Purpose:** Simplify type definitions for the type checker.

**Transformations:**
- Type aliases desugared
- Variant constructors normalized
- Record types simplified
- Generic type parameters preserved

**Implementation:** `desugarTypeDefinition.ts`, `desugarTypeExpr.ts`, `desugarRecordTypeField.ts`, `desugarVariantConstructor.ts`

**Details:**
- Type expressions converted to core type expressions
- Location information preserved for error reporting
- External types passed through

---

### Category 2: Core Operations (Pass-Through) ✅

These transformations were initially considered for desugaring but are now kept as core operations passed through to the code generator.

#### 2.1 Mutable Reference Dereference → Core Operation (Pass-Through)

**Purpose:** Mutable reference dereference is passed through as a core operation for code generator.

**Surface Syntax:**
```vibefun
let x = ref(10)
let y = !x
```

**Core Representation:**
```vibefun
let x = ref(10) in
let y = CoreUnaryOp("Deref", x)
```

**Current Status:** ✅ Done - Parser produces `UnaryOp` "Deref", desugarer passes through as `CoreUnaryOp`

**Implementation:** `desugarer.ts` - Passes through as `CoreUnaryOp` "Deref"

**Design Decision:** Mutable reference dereference is kept as a core unary operator rather than desugaring to `Ref.get()` calls. This is simpler and consistent with other operators, allowing the code generator to handle the runtime semantics directly.

**Edge Cases:**
- Nested dereferences: `!!x` → `CoreUnaryOp("Deref", CoreUnaryOp("Deref", x))`
- Dereference in patterns: Not allowed (compile error)

**Semantic Invariant:** Dereference returns current value of mutable reference.

---

#### 2.2 Mutable Reference Assignment → Core Operation (Pass-Through)

**Purpose:** Mutable reference assignment is passed through as a core operation for code generator.

**Surface Syntax:**
```vibefun
let x = ref(10)
x := 20
```

**Core Representation:**
```vibefun
let x = ref(10) in
CoreBinOp("RefAssign", x, 20)
```

**Current Status:** ✅ Done - Parser produces `BinOp` "RefAssign", desugarer passes through as `CoreBinOp`

**Implementation:** `desugarBinOp.ts` - Passes through as `CoreBinOp` "RefAssign"

**Design Decision:** Mutable reference assignment is kept as a core binary operator rather than desugaring to `Ref.set()` calls. This is simpler and consistent with other operators, allowing the code generator to handle the runtime semantics directly.

**Edge Cases:**
- Chained assignment: `x := y := 5` → `CoreBinOp("RefAssign", x, CoreBinOp("RefAssign", y, 5))` (returns unit)
- Assignment in expression context: Result is unit

**Semantic Invariant:** Updates reference value, returns unit.

---

#### 2.3 List Cons Operator → Variant Construction

**Purpose:** Desugar cons operator to explicit variant construction.

**Surface Syntax:**
```vibefun
let xs = 1 :: 2 :: []
```

**Core Representation:**
```vibefun
let xs = CoreVariant("Cons", [1, CoreVariant("Cons", [2, CoreVariant("Nil", [])])])
```

**Current Status:** ✅ Done - Parser produces `BinOp` "Cons", desugarer transforms to variant construction

**Implementation:** `desugarBinOp.ts` - Converts to `CoreVariant` "Cons" construction

**Design Decision:** List cons operator is desugared to variant construction rather than function calls. This is more direct and consistent with how list literals are desugared.

**Edge Cases:**
- Right-associative: `1 :: 2 :: 3 :: []` parses as `1 :: (2 :: (3 :: []))`
- Mixed with list literals: `1 :: [2, 3]` → `Cons(1, Cons(2, Cons(3, Nil)))`
- Type inference: Type of `[]` must be inferred from context

**Semantic Invariant:** Constructs list with element prepended to tail.

---

### Category 3: Parser-Level Transformations ✅

These transformations are handled by the parser, not the desugarer. The parser produces a complete AST that the desugarer consumes.

#### 3.1 If-Without-Else → Parser Handles This

**Purpose:** Make implicit else branch explicit.

**Surface Syntax:**
```vibefun
if condition then action()
```

**AST Representation:**
```vibefun
If {
  condition: condition,
  then: action(),
  else_: UnitLit
}
```

**Current Status:** ✅ Done - Parser handles this transformation, not desugarer

**Implementation:** Parser (`parse-expressions.ts:678-682`) inserts `{ kind: "UnitLit" }` when else is omitted

**Design Decision:** The parser handles if-without-else by automatically inserting a Unit literal when the else branch is omitted. This means the desugarer always receives a complete if-expression with both branches present. The AST type `else_: Expr` (not optional) enforces this contract.

**Verification:** Parser tests in `expressions.test.ts:1828-1904` confirm:
- Parser inserts UnitLit when else is omitted
- `else_` field is never undefined
- UnitLit has proper location information

**Edge Cases:**
- Nested ifs: Inner ifs also get UnitLit else branches from parser
- If in expression context: Type must be unit if no explicit else

**Semantic Invariant:** If without else returns unit when condition is false.

---

#### 3.2 Record Update Spread Expansion

**Purpose:** Expand record spreads to explicit field copying.

**Surface Syntax:**
```vibefun
let person2 = { ...person, age: 31, ...updates }
```

**Core Representation (Option A - Preserve Spreads):**
```vibefun
CoreRecordUpdate {
  record: person,
  updates: [Spread(person), Field(age, 31), Spread(updates)]
}
```

**Core Representation (Option B - Expand Spreads):**
```vibefun
{ name: person.name, age: 31, city: updates.city, ... }
// Requires knowing all fields at desugar time - not feasible!
```

**Current Status:** `CoreRecordUpdate` exists and preserves spreads

**Verification Needed:**
- Confirm current implementation choice is correct
- Spreads likely need type information to expand
- Probably correct to preserve spreads for type checker

**Edge Cases:**
- Multiple spreads: Order matters (later spreads override earlier)
- Empty spread: `{ ...{} }` → `{}`
- Conflicting fields: Later wins

**Semantic Invariant:** Spreads merge fields, later values override earlier.

**Decision:** Likely preserve spreads, let type checker/code generator handle expansion.

---

#### 3.3 Type Annotations in Patterns → Strip Annotations

**Purpose:** Strip type annotations from patterns during desugaring.

**Surface Syntax:**
```vibefun
match value {
  | (x: Int) => x + 1
}

let (x: Int, y: String) = pair
```

**Core Representation:**
```vibefun
match value {
  | x => x + 1  // Type annotation removed
}

let (x, y) = pair  // Type annotations removed
```

**Current Status:** ✅ Done - Desugarer strips type annotations from patterns

**Implementation:** `desugarer.ts:desugarPattern()` case "TypeAnnotatedPattern" recursively desugars inner pattern, stripping the annotation

**Design Decision:** Type annotations in patterns are stripped during desugaring because:
1. The type checker uses Hindley-Milner inference and doesn't need pattern annotations
2. Type information flows from context (expected types) rather than annotations
3. Annotations are **optional** for documentation/disambiguation only
4. Core AST is simpler without `CoreTypeAnnotatedPattern`
5. Location information is preserved on the inner pattern

**Verification:**
- Parser tests in `pattern-type-annotations.test.ts` (730 lines) confirm parser creates TypeAnnotatedPattern
- Desugarer tests in `type-annotated-patterns.test.ts` (15 tests) confirm annotations are stripped
- Type checker exists and works without pattern annotations

**Edge Cases:**
- Nested annotations: `((x: Int): Option<Int>)` - both levels stripped
- In various contexts: match, let, lambda parameters - all stripped
- Complex patterns: `Some((x: Int))` - annotation on inner pattern stripped

---

#### 3.4 Record Field Shorthand → Parser Handles This

**Purpose:** Expand shorthand field syntax to explicit field: value pairs.

**Surface Syntax:**
```vibefun
let name = "Alice"
let age = 30
{ name, age }
```

**AST Representation:**
```vibefun
Record {
  fields: [
    Field { name: "name", value: Var("name") },
    Field { name: "age", value: Var("age") }
  ]
}
```

**Current Status:** ✅ Done - Parser handles this transformation, not desugarer

**Implementation:** Parser expands record field shorthand before AST creation

**Design Decision:** The parser handles record field shorthand expansion. The AST type `RecordField` always has an explicit `value: Expr`, not an optional field. This means the desugarer always receives fully expanded record literals.

**Verification:** Parser tests in `record-shorthand.test.ts` (399 lines) comprehensively test:
- Single and multiple shorthand fields
- Mixed shorthand and regular fields
- Shorthand with spreads in record updates
- Shorthand in record patterns
- Nested shorthand and all edge cases

**Edge Cases:**
- Mixed: `{ name, age: age + 1 }` → `{ name: name, age: age + 1 }`
- In patterns: `match person { | { name, age } => ... }` - parser expands to full patterns
- With spreads: `{ ...person, name }` → `{ ...person, name: name }`

---

### Category 4: Explicitly Not Desugared ✋

These constructs are **not** syntactic sugar and pass through to core AST.

#### 4.1 Literals

**Nodes:** IntLit, FloatLit, StringLit, BoolLit, UnitLit

**Reason:** Primitive values, no simpler representation.

**Transformation:** Direct conversion to CoreIntLit, CoreFloatLit, etc.

---

#### 4.2 Variables

**Node:** Var

**Reason:** Primitive operation, no simpler representation.

**Transformation:** Direct conversion to CoreVar.

---

#### 4.3 Let Bindings

**Node:** Let (non-recursive, non-mutable)

**Reason:** Core construct for introducing bindings.

**Transformation:** Direct conversion to CoreLet, with pattern and value desugared.

**Note:** Recursive and mutable lets are not sugar - they're different binding forms.

---

#### 4.4 Pattern Matching (Match Expression)

**Node:** Match

**Reason:** Core construct, not sugar (though or-patterns within it are).

**Transformation:** Convert to CoreMatch, desugar nested patterns and or-patterns.

---

#### 4.5 Tuples

**Node:** Tuple

**Reason:** First-class values, not sugar over records or other structures.

**Transformation:** Direct conversion to CoreTuple, with elements desugared.

**Note:** Some languages desugar tuples to records - Vibefun keeps them distinct.

---

#### 4.6 Records

**Node:** Record, RecordAccess

**Reason:** First-class values and operations.

**Transformation:** Direct conversion to CoreRecord, CoreRecordAccess.

**Note:** Record updates may desugar spreads, but records themselves are not sugar.

---

#### 4.7 Variant Construction

**Node:** Implicit in Match patterns, explicit in expressions

**Reason:** Core construct for algebraic data types.

**Transformation:** Convert to CoreVariantConstruction.

---

#### 4.8 Type Annotations

**Node:** TypeAnnotation

**Reason:** Provide type hints to type checker, not sugar.

**Transformation:** Convert to CoreTypeAnnotation (preserved for type checker).

---

#### 4.9 Unsafe Blocks

**Node:** Unsafe

**Reason:** Boundary marker for FFI, not sugar.

**Transformation:** Convert to CoreUnsafe (preserved as boundary marker).

---

#### 4.10 Type Declarations

**Node:** TypeDecl, ExternalTypeDecl

**Reason:** Top-level declarations, not sugar.

**Transformation:** Desugar internal structure, but declaration itself preserved.

---

#### 4.11 External Declarations

**Node:** ExternalDecl, ExternalBlock

**Reason:** FFI interface, not sugar.

**Transformation:** Pass through to core AST.

---

#### 4.12 Module System

**Node:** ImportDecl, ReExportDecl

**Reason:** Module system, not sugar.

**Transformation:** Pass through to module resolution phase.

---

## Edge Cases & Special Considerations

### 1. Nested Transformations

**Challenge:** Some transformations interact and must be applied in correct order.

**Example:**
```vibefun
[1, 2] |> map(x => x + 1)
```

**Desugaring Steps:**
1. List literal: `Cons(1, Cons(2, Nil)) |> map(x => x + 1)`
2. Pipe: `map(x => x + 1)(Cons(1, Cons(2, Nil)))`
3. Multi-arg app: `map(x => x + 1)(Cons(1, Cons(2, Nil)))`

**Order Matters:** Bottom-up desugaring (inner expressions first) handles this correctly.

---

### 2. Variable Shadowing

**Challenge:** Generated variables (e.g., for while loops) must not shadow user variables.

**Solution:** Use `FreshVarGen` to generate unique names.

**Example:**
```vibefun
while !loop_fresh { ... }  // User variable named "loop_fresh"
```

Generated code must avoid collision:
```vibefun
let rec loop_fresh_1 = () => match ... // Fresh name
```

---

### 3. Location Information

**Challenge:** Desugared code must preserve location information for error reporting.

**Solution:** Every core AST node includes `loc: SourceLocation` from surface AST.

**Example:**
```vibefun
// Surface: x |> f (at line 10, col 5)
// Core: f(x) - location should point to original pipe expression
```

---

### 4. Exhaustiveness Checking

**Challenge:** Or-patterns affect exhaustiveness analysis.

**Solution:** Expand or-patterns before exhaustiveness checking, or handle specially.

**Example:**
```vibefun
match x {
  | Some(1) | Some(2) => "small"
  | None => "none"
}
```

Must detect non-exhaustive (missing `Some(n)` for n ≠ 1, 2).

---

### 5. Type Inference Interaction

**Challenge:** Some transformations affect type inference (e.g., currying, empty lists).

**Empty List Example:**
```vibefun
let xs = []  // What type?
```

Type checker must infer `List<'a>` with value restriction or monomorphism restriction.

**Currying Example:**
```vibefun
let add = (x, y) => x + y
// Type: Int -> Int -> Int (after currying)
```

Type inference must handle curried form.

---

### 6. Evaluation Order

**Challenge:** Desugaring must preserve evaluation order semantics.

**Example - Pipe:**
```vibefun
sideEffect() |> f |> g
```

Must evaluate as:
```vibefun
let temp = sideEffect() in g(f(temp))
```

Not:
```vibefun
g(f(sideEffect()))  // Same order, but might introduce temp anyway for clarity
```

**Example - Multi-arg application:**
```vibefun
f(e1, e2, e3)
```

Left-to-right: `e1` then `e2` then `e3`, then applications left-to-right.

---

### 7. Pattern Match Compilation

**Challenge:** Complex patterns need systematic transformation.

**Example:**
```vibefun
match pair {
  | (Some(x), [1, 2, ...rest]) => ...
}
```

**Desugaring:**
```vibefun
match pair {
  | (Some(x), Cons(1, Cons(2, rest))) => ...
}
```

Nested patterns recursively desugared.

---

### 8. Recursive Bindings

**Challenge:** Mutually recursive functions need special handling.

**Surface Syntax:**
```vibefun
let rec even = (n) => if n == 0 then true else odd(n - 1)
and odd = (n) => if n == 0 then false else even(n - 1)
```

**Core Representation:**
```vibefun
CoreLetRecGroup {
  bindings: [
    { name: "even", value: (n) => if n == 0 then true else odd(n - 1) },
    { name: "odd", value: (n) => if n == 0 then false else even(n - 1) }
  ],
  body: ...
}
```

**Not Desugared:** Kept as special construct for type checker.

---

### 9. Operator Precedence

**Challenge:** Ensure operator desugaring respects precedence.

**Example:**
```vibefun
1 :: 2 :: [] |> map(x => x + 1)
```

**Parse Tree (with precedence):**
```
Pipe(
  BinOp(Cons, 1, BinOp(Cons, 2, [])),
  map(x => x + 1)
)
```

**Desugaring:**
1. Inner cons: `Cons(2, Nil)`
2. Outer cons: `Cons(1, Cons(2, Nil))`
3. Pipe: `map(x => x + 1)(Cons(1, Cons(2, Nil)))`

**Precedence handled by parser** - desugarer works on already-structured AST.

---

### 10. Guards in Match Cases

**Challenge:** Guards must be preserved during pattern desugaring.

**Surface Syntax:**
```vibefun
match xs {
  | [x, ...rest] when x > 0 => ...
}
```

**Core Representation:**
```vibefun
match xs {
  | Cons(x, rest) when x > 0 => ...  // Guard preserved
}
```

**Implementation:** `CoreMatchCase` includes optional `guard: CoreExpr | null`.

---

## Implementation Guidelines

### 1. Testing Requirements

Every desugaring transformation must have:
- **Unit tests** in corresponding `.test.ts` file
- **Edge case tests** (empty, single, nested)
- **Error case tests** (invalid inputs)
- **Integration tests** with other transformations

### 2. Error Handling

Desugarer errors should:
- Include precise location information
- Provide helpful messages explaining what went wrong
- Suggest fixes when possible

Example:
```typescript
throw new DesugarError(
  'Cannot desugar or-pattern with inconsistent bindings',
  pattern.loc,
  `All patterns in 'p1 | p2' must bind the same variables. Found: ${vars1} vs ${vars2}`
);
```

### 3. Fresh Variable Generation

When generating temporary variables:
- Use `FreshVarGen` class
- Use descriptive prefixes: `loop_`, `temp_`, `acc_`
- Avoid common user variable names
- Ensure uniqueness within scope

### 4. Recursive Desugaring

Most nodes require recursive desugaring:
```typescript
function desugar(expr: Expr): CoreExpr {
  switch (expr.kind) {
    case 'App':
      // Desugar function and arguments first
      const func = desugar(expr.func);
      const args = expr.args.map(desugar);
      // Then apply transformation
      return buildNestedApplications(func, args);
    // ...
  }
}
```

### 5. Location Preservation

Always preserve source locations:
```typescript
const coreExpr: CoreExpr = {
  kind: 'CoreLambda',
  param: 'x',
  body: ...,
  loc: originalExpr.loc  // IMPORTANT!
};
```

### 6. Immutability

Desugarer should be pure:
- Don't modify input AST
- Create new core AST nodes
- Use functional patterns (map, filter, reduce)

---

## Action Items

### Critical (Blocking Type Checker)

1. **Implement Mutable Reference Desugaring**
   - [ ] Decide: Function calls vs core nodes for `!` and `:=`
   - [ ] Implement `desugarUnaryOp.ts` for dereference
   - [ ] Update `desugarBinOp.ts` for assignment
   - [ ] Add comprehensive tests
   - [ ] Document in spec

2. **Verify List Cons Operator Desugaring**
   - [ ] Check if `::` is currently desugared
   - [ ] If not, implement desugaring to `Cons` variant
   - [ ] Test with complex cases (`1 :: 2 :: []`, `x :: xs`)
   - [ ] Verify right-associativity handling

3. **Verify If-Without-Else Handling**
   - [ ] Check parser output for `if cond then e` (no else)
   - [ ] If `elseBranch` can be null, add desugaring to `()`
   - [ ] Ensure all `CoreIf` nodes have non-null else
   - [ ] Test type checking rejects non-unit if-without-else in non-unit context

### Medium Priority (Cleanup & Verification)

4. **Record Update Spread Handling**
   - [ ] Document current approach (preserve spreads)
   - [ ] Verify type checker handles spreads correctly
   - [ ] Add tests for multiple spreads, ordering
   - [ ] Consider if expansion is needed for code generation

5. **Type Annotation Stripping**
   - [ ] Confirm `TypeAnnotatedPattern` is not in core AST
   - [ ] Verify desugarer strips pattern type annotations
   - [ ] Ensure location info preserved for errors
   - [ ] Test type checking still works without annotations in patterns

6. **Field Shorthand Verification**
   - [ ] Check if parser handles `{ name, age }` expansion
   - [ ] Document parser vs desugarer responsibility
   - [ ] Add tests if desugarer needs to handle

### Low Priority (Future Enhancements)

7. **Optimize Nested Let Chains**
   - [ ] Consider flattening unnecessary nesting
   - [ ] Profile performance on large blocks
   - [ ] Maintain readability of core AST

8. **Better Error Messages**
   - [ ] Add context to desugaring errors
   - [ ] Show surface syntax in error messages
   - [ ] Suggest fixes for common mistakes

9. **Desugarer Diagnostics**
   - [ ] Add optional verbose mode showing transformations
   - [ ] Helpful for debugging and learning
   - [ ] Consider `--show-desugared` flag in CLI

---

## Testing Strategy

### Unit Tests (Per Transformation)

Each transformation file has corresponding tests:
- `desugarPipe.test.ts` tests pipe desugaring
- `curryLambda.test.ts` tests lambda currying
- etc.

**Coverage Requirements:**
- ✅ Basic case
- ✅ Edge cases (empty, single, complex)
- ✅ Nested transformations
- ✅ Error cases (if applicable)
- ✅ Location preservation

### Integration Tests

Test combinations of transformations:
```typescript
// Test: List literal in pipe with lambda
const input = `[1, 2, 3] |> map((x, y) => x + y)`
// Should desugar list, curry lambda, desugar pipe
```

### End-to-End Tests

Full pipeline tests in `packages/core/src/desugarer/desugarer.test.ts`:
- Complex real-world examples
- Multiple interacting transformations
- Verify core AST is valid for type checker

---

## Appendix: Transformation Reference Table

| Surface Syntax | Core Representation | Status | Implementation File |
|---|---|---|---|
| `[1, 2, 3]` | `Cons(1, Cons(2, Cons(3, Nil)))` | ✅ Done | `desugarListLiteral.ts` |
| `[...xs, 1]` | `List.concat(xs, Cons(1, Nil))` | ✅ Done | `desugarListWithConcats.ts` |
| `(x, y) => e` | `(x) => (y) => e` | ✅ Done | `curryLambda.ts` |
| `f(x, y)` | `f(x)(y)` | ✅ Done | `desugarer.ts` |
| `x \|> f` | `f(x)` | ✅ Done | `desugarPipe.ts` |
| `f >> g` | `(x) => g(f(x))` | ✅ Done | `desugarComposition.ts` |
| `s1 & s2` | `String.concat(s1, s2)` | ✅ Done | `desugarBinOp.ts` |
| `while c { e }` | `let rec loop = () => match c ...` | ✅ Done | `desugarer.ts` |
| `{ e1; e2 }` | `let _ = e1 in e2` | ✅ Done | `desugarBlock.ts` |
| `[x, ...xs]` pattern | `Cons(x, xs)` pattern | ✅ Done | `desugarListPattern.ts` |
| `p1 \| p2` | Multiple cases | ✅ Done | `desugarer.ts` |
| `!ref` | `Ref.get(ref)` or `CoreDeref(ref)` | ❌ TODO | Need to implement |
| `ref := val` | `Ref.set(ref, val)` or `CoreRefAssign` | ❌ TODO | Need to implement |
| `x :: xs` | `Cons(x, xs)` or `List.cons(x, xs)` | ⚠️ Verify | Check `desugarBinOp.ts` |
| `if c then e` | `if c then e else ()` | ⚠️ Verify | Check parser/desugarer |
| `{ ...r }` | Expand or preserve? | ⚠️ Verify | Check current impl |
| `(x: T)` pattern | Strip annotation? | ⚠️ Verify | Check desugarer |
| `{ name, age }` | `{ name: name, age: age }` | ⚠️ Verify | Likely in parser |

---

## References

### Specification Documents
- **Desugaring Spec:** `docs/spec/12-compilation/desugaring.md`
- **Syntax Spec:** `docs/spec/01-syntax/`
- **Semantics Spec:** `docs/spec/02-semantics/`

### Implementation Files
- **Main Desugarer:** `packages/core/src/desugarer/desugarer.ts`
- **Core AST Types:** `packages/core/src/types/core-ast.ts`
- **Surface AST Types:** `packages/core/src/types/ast.ts`

### Design Documents
- **Type System Design:** `.claude/design/type-system.md`
- **Language Design:** `.claude/design/language-design.md`

---

**End of Requirements Document**
