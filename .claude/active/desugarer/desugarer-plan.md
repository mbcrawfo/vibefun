# Desugarer Implementation Plan

**Created:** 2025-10-29
**Status:** Planning Complete - Ready for Implementation
**Author:** Claude Code

---

## Overview

Implement the desugaring phase (Phase 3) of the vibefun compiler that transforms surface syntax AST into a simplified Core AST. This phase eliminates syntactic sugar and prepares the AST for type checking.

The desugarer sits between the parser and type checker in the compilation pipeline:

```
Source Code → Lexer → Parser → **DESUGARER** → Type Checker → Code Generator
```

---

## Design Decisions

### 1. Separate Core AST Type System

**Decision:** Create distinct `CoreExpr`, `CorePattern`, `CoreDeclaration` types separate from surface AST.

**Rationale:**
- Type safety: Compiler can enforce that only desugared forms reach type checker
- Clear separation of concerns between parsing and core language semantics
- Easier refactoring and evolution of surface syntax
- Self-documenting: Core types show what's actually "in the language"

**Trade-off:** More code to maintain, but worth it for type safety and clarity.

### 2. Desugar If-Then-Else to Match

**Decision:** Transform `if cond then a else b` into `match cond { | true => a | false => b }`

**Rationale:**
- More uniform core language (only one conditional construct)
- Type checker only needs to handle match expressions
- Simplifies code generation
- Suggested in architecture document

### 3. Inline Object Spread for Record Updates

**Decision:** Transform `{ person | age: 31 }` to `{ name: person.name, age: 31, ... }` (all fields explicitly copied)

**Rationale:**
- No runtime dependency on helper functions
- Straightforward translation to JavaScript object spread
- Type checker can validate field existence
- Clear semantics

**Note:** May need type information to know all fields - if not available, can generate partial record with spread operator for JS to handle.

### 4. Complete Implementation Scope

**Decision:** Implement all transformations in initial phase.

**Transformations included:**
1. Block expressions → nested let bindings
2. Multi-parameter lambdas → curried lambdas
3. Pipe operator → function application
4. Function composition → lambda wrapping
5. List literals → Cons/Nil constructors
6. List spread in expressions → nested cons operations
7. List cons operator → Cons constructor
8. List patterns → Cons/Nil patterns
9. Record updates → inline field copying (pipe syntax only)
10. If-then-else → match on boolean
11. Or-patterns → multiple match cases
12. Mutable references → pass through
13. Type annotations → pass through
14. Unsafe blocks → desugar contents, preserve boundary
15. External blocks → multiple external declarations
16. Module-level desugaring

---

## Core AST Specification

### Core Expression Types (CoreExpr)

Only these expression forms are allowed after desugaring:

```typescript
type CoreExpr =
    // Literals
    | CoreIntLit
    | CoreFloatLit
    | CoreStringLit
    | CoreBoolLit
    | CoreUnitLit

    // Variables and bindings
    | CoreVar
    | CoreLet          // Single binding only

    // Functions
    | CoreLambda       // Single parameter only
    | CoreApp

    // Control flow
    | CoreMatch        // Only conditional construct

    // Data structures
    | CoreRecord       // Record literal
    | CoreRecordAccess // Field access
    | CoreVariant      // Constructor application (e.g., Cons, Nil, Some, None)

    // Operations
    | CoreBinOp        // Binary operations (but NOT pipes or composition)
    | CoreUnaryOp      // Unary operations

    // Other
    | CoreTypeAnnotation
    | CoreUnsafe       // Unsafe JavaScript interop block
```

### Eliminated from Core

These surface syntax constructs are **NOT** allowed in Core AST:

- ❌ `Pipe` - pipe operator
- ❌ `BinOp(ForwardCompose)` and `BinOp(BackwardCompose)` - composition operators
- ❌ `ListCons` - cons operator
- ❌ `List` - list literals
- ❌ `RecordUpdate` - record update syntax
- ❌ `Block` - block expressions
- ❌ `If` - if-then-else expressions
- ❌ Multi-parameter `Lambda` nodes
- ❌ `OrPattern` in pattern matching

### Core Pattern Types (CorePattern)

```typescript
type CorePattern =
    | CoreWildcardPattern
    | CoreVarPattern
    | CoreLitPattern
    | CoreVariantPattern   // Constructor patterns (including Cons, Nil)
    | CoreRecordPattern
```

**Note:**
- `OrPattern` is eliminated - expanded to multiple match arms
- `ListPattern` (`[x, ...rest]`) is desugared to `CoreVariantPattern("Cons", [x, rest])` for uniformity

### Core Declaration Types (CoreDeclaration)

```typescript
type CoreDeclaration =
    | CoreLet              // Let binding (desugared body)
    | CoreType             // Type declaration (pass through)
    | CoreExternal         // External declaration (pass through)
    | CoreImport           // Import (pass through)
```

---

## Transformation Specifications

### 1. Block Expressions → Nested Let

**Surface Syntax:**
```vibefun
{
    let x = 10
    let y = 20
    let z = 30
    x + y + z
}
```

**Core AST:**
```vibefun
let x = 10 in
    let y = 20 in
        let z = 30 in
            x + y + z
```

**Algorithm:**
1. Extract list of statements (let bindings) and final expression
2. Process statements **right-to-left**
3. Build nested `CoreLet` nodes
4. Innermost body is the final expression
5. Each let wraps the next

**Edge Cases:**
- Empty block → Error (should have been caught by parser)
- Block with only expression (no bindings) → Just desugar the expression
- Nested blocks → Recursively desugar inner blocks first

**Source Location:** Use the block's location for outer let, preserve individual statement locations

---

### 2. Multi-Parameter Lambdas → Currying

**Surface Syntax:**
```vibefun
let add = (x, y, z) => x + y + z
```

**Core AST:**
```vibefun
let add = (x) => (y) => (z) => x + y + z
```

**Algorithm:**
1. Check if lambda has > 1 parameter
2. Take first parameter, create `CoreLambda` with it
3. Body is another `CoreLambda` with remaining parameters
4. Recursively curry until single-parameter lambdas
5. Desugar the innermost body expression

**Edge Cases:**
- Single parameter → No transformation needed, just desugar body
- Zero parameters → Error (invalid syntax)
- Nested lambdas → Curry each lambda independently

**Source Location:** Use original lambda location for outermost, generate synthetic locations for nested

---

### 3. Pipe Operator → Function Application

**Surface Syntax:**
```vibefun
data |> filter(pred) |> map(transform) |> sum
```

**Core AST:**
```vibefun
sum(map(transform)(filter(pred)(data)))
```

**Explanation:**
- `data |> filter(pred)` becomes `filter(pred)(data)` (curried application)
- Result pipes to `map(transform)`, becomes `map(transform)(filter(pred)(data))`
- Final result pipes to `sum`, becomes `sum(map(transform)(filter(pred)(data)))`

**Algorithm:**
1. Collect all expressions in pipe chain (left to right)
2. Build nested `CoreApp` nodes **right to left**
3. First expression is the data, rest are partially applied functions
4. Each stage: Apply previous result to next function
5. Recursively desugar each stage

**Note:** Functions in vibefun are curried, so `filter(pred)` returns a function awaiting the list argument.

**Edge Cases:**
- Single pipe → Simple function application
- Pipe with complex expressions → Desugar operands first
- Nested pipes → Should not occur (associativity makes it flat in parser)
- Pipe with lambda → Common pattern, works naturally

**Source Location:** Use pipe operator location, preserve stage locations

**Note:** Pipe associates left: `a |> b |> c` = `(a |> b) |> c`

---

### 4. Function Composition → Lambda Wrapping

**Surface Syntax:**
```vibefun
// Forward composition
let processData = parse >> validate >> transform

// Backward composition
let processData = transform << validate << parse
```

**Core AST:**
```vibefun
// Forward: f >> g >> h = (x) => h(g(f(x)))
let processData = (x) => transform(validate(parse(x)))

// Backward: f << g << h = (x) => f(g(h(x)))
let processData = (x) => transform(validate(parse(x)))
```

**Algorithm:**

**Forward Composition (`>>`):**
1. Generate fresh variable name (e.g., `$composed0`)
2. Create `CoreLambda` with that parameter
3. Build application chain left-to-right: `f(x)`, `g(f(x))`, `h(g(f(x)))`
4. Recursively desugar each function

**Backward Composition (`<<`):**
1. Generate fresh variable name
2. Create `CoreLambda` with that parameter
3. Build application chain right-to-left: `h(x)`, `g(h(x))`, `f(g(h(x)))`
4. Recursively desugar each function

**Edge Cases:**
- Chain of 2+ compositions → Accumulate all, build single lambda
- Mixed with other operators → Precedence already handled by parser
- Composition of lambdas → Desugar lambdas first

**Fresh Variables:** Use counter-based generation: `$composed0`, `$composed1`, etc.

**Source Location:** Use composition operator location

---

### 5. List Literals → Cons/Nil Constructors

**Surface Syntax:**
```vibefun
[]                  // Empty list
[1]                 // Single element
[1, 2, 3]          // Multiple elements
[[1, 2], [3, 4]]   // Nested lists
```

**Core AST:**
```vibefun
Nil
Cons(1, Nil)
Cons(1, Cons(2, Cons(3, Nil)))
Cons(Cons(1, Cons(2, Nil)), Cons(Cons(3, Cons(4, Nil)), Nil))
```

**Algorithm:**
1. For empty list: `CoreVariant("Nil", [])`
2. For non-empty list: Fold right over elements
3. Start with `Nil` as accumulator
4. For each element (right to left): `Cons(element, accumulator)`
5. Recursively desugar each element

**Edge Cases:**
- Empty list → Direct to Nil
- Single element → Cons(elem, Nil)
- Complex elements → Desugar elements first
- Nested lists → Recursively desugar inner lists

**Source Location:** Use list literal location for outer Cons, element locations for inner

---

### 6. List Spread in Expressions → Nested Cons

**Surface Syntax:**
```vibefun
[1, 2, ...rest]
[x, ...map(f, xs), y]
```

**Core AST:**
```vibefun
Cons(1, Cons(2, rest))
Cons(x, concat(map(f, xs), Cons(y, Nil)))
```

**Algorithm:**
1. Separate elements into segments: regular elements and spread expressions
2. For each segment:
   - Regular elements: Build Cons chain as in list literal desugaring
   - Spread expressions: Use as-is (will be a list value)
3. Concatenate segments using `concat` function from stdlib
4. If no spreads, use simple Cons chain (same as list literal)

**Edge Cases:**
- Single spread with no other elements: `[...xs]` → just `xs`
- Spread at end: `[1, 2, ...rest]` → `Cons(1, Cons(2, rest))`
- Spread at beginning: `[...xs, 1, 2]` → `concat(xs, Cons(1, Cons(2, Nil)))`
- Multiple spreads: `[...xs, 1, ...ys]` → `concat(xs, Cons(1, concat(ys, Nil)))`
- Empty list with spread: Not valid syntax

**Source Location:** Use list literal location

**Note:** This requires `concat` function from stdlib for multiple segments.

---

### 7. List Cons Operator → Cons Constructor

**Surface Syntax:**
```vibefun
x :: xs
1 :: 2 :: 3 :: []
```

**Core AST:**
```vibefun
Cons(x, xs)
Cons(1, Cons(2, Cons(3, Nil)))
```

**Algorithm:**
1. Transform `ListCons(left, right)` to `CoreVariant("Cons", [left, right])`
2. Recursively desugar left and right operands
3. Cons is right-associative (parser handles this)

**Edge Cases:**
- Single cons → Direct transformation
- Chained cons → Parser already builds nested structure
- Cons with complex expressions → Desugar operands

**Source Location:** Use cons operator location

---

### 8. List Patterns → Cons/Nil Patterns

**Surface Syntax:**
```vibefun
match list {
    | [] => 0
    | [x] => x
    | [x, ...rest] => x + sum(rest)
}
```

**Core AST:**
```vibefun
match list {
    | Nil => 0
    | Cons(x, Nil) => x
    | Cons(x, rest) => x + sum(rest)
}
```

**Algorithm:**
1. For `[]` pattern → `CoreVariantPattern("Nil", [])`
2. For `[p1, p2, ..., pN]` without rest → Nested Cons patterns ending in Nil:
   - `Cons(p1, Cons(p2, ... Cons(pN, Nil)))`
3. For `[p1, p2, ..., pN, ...rest]` with rest → Nested Cons patterns ending in rest:
   - `Cons(p1, Cons(p2, ... Cons(pN, rest)))`
4. Recursively desugar nested patterns (e.g., `[Some(x), ...]`)

**Edge Cases:**
- Empty list pattern: `[]` → `Nil`
- Single element: `[x]` → `Cons(x, Nil)`
- Just rest: `[...rest]` → `rest` (variable pattern)
- Nested patterns: `[[x, y], z]` → Desugar outer then inner

**Source Location:** Use original list pattern location

**Rationale:** Uniform pattern representation. Type checker and code generator only need to handle variant patterns.

---

### 9. Record Update → Inline Field Copying

**Supported Syntax:**
Only pipe syntax is supported: `{ record | field: value }`

**Note:** Spread syntax `{ ...record, field: value }` is NOT supported (removed from spec).

**Surface Syntax:**
```vibefun
{ person | age: 31, name: "Alice" }
```

**Core AST (Conceptual):**
```vibefun
// If we know all fields:
{
    name: "Alice",      // Overridden
    age: 31,            // Overridden
    address: person.address,  // Copied
    email: person.email       // Copied
}
```

**Algorithm:**

**Option A (Without Type Info):**
1. Cannot know all fields at this stage
2. Generate partial record with JavaScript spread semantics
3. Type checker will validate later

**Option B (With Type Info):**
1. Look up record type to get all field names
2. For each field:
   - If in updates, use new value
   - Otherwise, use `CoreRecordAccess(record, field)`
3. Create `CoreRecord` with all fields
4. Recursively desugar field values

**Decision:** Start with **Option A** (spread semantics), revisit if needed during type checker integration.

**Transformation:**
```typescript
RecordUpdate { record, updates }
// Becomes:
CoreRecord([
    ...record.fields,  // Conceptually - may need special handling
    ...updates.map(desugar)
])
```

**Edge Cases:**
- Single field update
- Multiple field updates
- Nested record updates → Desugar inner updates first
- Update with complex values → Desugar values

**Source Location:** Use record update location

**Note:** This transformation may need refinement during type checker integration.

---

### 10. If-Then-Else → Match on Boolean

**Surface Syntax:**
```vibefun
if condition then consequent else alternative
```

**Core AST:**
```vibefun
match condition {
    | true => consequent
    | false => alternative
}
```

**Algorithm:**
1. Desugar condition expression
2. Create `CoreMatch` with condition as scrutinee
3. Create two arms:
   - Pattern: `CoreLitPattern(true)`, body: desugared consequent
   - Pattern: `CoreLitPattern(false)`, body: desugared alternative
4. Recursively desugar consequent and alternative

**Edge Cases:**
- Nested if → Each if becomes its own match
- If as expression → Natural, match is an expression
- If in match arm → Recursive desugaring handles this

**Source Location:** Use if expression location for match, preserve branch locations

---

### 11. Or-Patterns → Multiple Match Cases

**Surface Syntax:**
```vibefun
match x {
    | "a" | "b" | "c" => "vowel"
    | "x" | "y" | "z" => "letter"
    | other => "unknown"
}
```

**Core AST:**
```vibefun
match x {
    | "a" => "vowel"
    | "b" => "vowel"
    | "c" => "vowel"
    | "x" => "letter"
    | "y" => "letter"
    | "z" => "letter"
    | other => "unknown"
}
```

**Algorithm:**
1. Process each match arm
2. If arm has `OrPattern`:
   - Extract all pattern alternatives
   - Duplicate the arm body for each alternative
   - Create separate `CoreMatchArm` for each
   - Preserve guards (if any) on each duplicated arm
3. If arm has simple pattern:
   - Process normally, just desugar pattern and body

**Edge Cases:**
- Or-pattern with guards → Duplicate guard to each arm
- Nested or-patterns → Expand recursively (cartesian product)
- Or-pattern in nested position (e.g., in variant) → Flatten at match arm level

**Validation:**
- All alternatives in or-pattern should bind same variables (type checker validates this)

**Source Location:** Use original arm location for all expanded arms

---

### 12. Mutable References → Pass Through

**Surface Syntax:**
```vibefun
let mut x = ref(42)
x := 50
!x
```

**Core AST:**
```vibefun
// Same - no transformation needed
let mut x = ref(42)
x := 50
!x
```

**Algorithm:**
1. `Let` bindings with `mutable: true` → `CoreLet` with `mutable: true`
2. `RefAssign` operator → `CoreBinOp("RefAssign", ...)`
3. `Deref` operator → `CoreUnaryOp("Deref", ...)`
4. Desugar operands but preserve operators

**Rationale:** Mutable reference semantics are core language features, not sugar. Type checker needs to track mutability.

**Source Location:** Preserve original locations

---

### 13. Type Annotations → Pass Through

**Surface Syntax:**
```vibefun
(x : Int)
(f(x) : String)
```

**Core AST:**
```vibefun
// Same structure
CoreTypeAnnotation(x, Int)
CoreTypeAnnotation(CoreApp(f, x), String)
```

**Algorithm:**
1. Preserve `TypeAnnotation` nodes in Core AST
2. Desugar the annotated expression
3. Keep type unchanged (type checker will validate)

**Rationale:** Type annotations are essential for type checking. Cannot be eliminated.

**Source Location:** Preserve annotation location

---

### 14. Unsafe Blocks → Desugar Contents, Preserve Boundary

**Surface Syntax:**
```vibefun
unsafe {
    let x = jsFunction()
    x + 1
}
```

**Core AST:**
```vibefun
CoreUnsafe(
    let x = jsFunction() in (x + 1)
)
```

**Algorithm:**
1. Preserve `Unsafe` boundary in Core AST
2. Desugar the inner expression (may be block, if-then-else, etc.)
3. Wrap desugared expression in `CoreUnsafe`

**Rationale:** Unsafe boundaries are semantic markers for type checker. Inner expressions still need desugaring.

**Source Location:** Preserve unsafe block location

---

### 15. External Blocks → Multiple External Declarations

**Surface Syntax:**
```vibefun
external {
    log: (String) -> Unit = "console.log"
    warn: (String) -> Unit = "console.warn"
}
```

**Core AST:**
```vibefun
CoreExternal("log", Type, "console.log")
CoreExternal("warn", Type, "console.warn")
```

**Algorithm:**
1. Extract each declaration from external block
2. Create separate `CoreExternal` declaration for each
3. Preserve types and JavaScript paths
4. Maintain declaration order

**Rationale:** Simpler Core AST. Type checker processes individual externals.

**Source Location:** Use individual declaration locations

---

### 16. Module-Level Desugaring

**Algorithm:**
1. Process module declarations in order
2. For each declaration:
   - **Let binding:** Desugar the binding expression
   - **Type declaration:** Pass through (no desugaring needed)
   - **External declaration:** Pass through (no desugaring needed)
   - **Import:** Pass through (no desugaring needed)
3. Return `CoreModule` with desugared declarations

**Structure:**
```typescript
desugarModule(module: Module): CoreModule {
    return {
        declarations: module.declarations.map(decl =>
            decl.kind === 'let'
                ? { ...decl, expr: desugar(decl.expr) }
                : decl  // Pass through
        )
    }
}
```

---

## Implementation Plan

### Phase 1: Core AST Type System
**File:** `packages/core/src/types/core-ast.ts`

1. Define all Core AST types:
   - `CoreExpr` union type
   - `CorePattern` union type
   - `CoreDeclaration` union type
   - `CoreModule` type
2. Add type guards: `isCoreExpr()`, `isCorePattern()`, etc.
3. Add utility functions: `coreExprKind()`, etc.
4. Export through `packages/core/src/types/index.ts`
5. Add comprehensive JSDoc documentation

**Test:** Type system compiles, exports work

---

### Phase 2: Desugarer Foundation
**File:** `packages/core/src/desugarer/desugarer.ts`

1. Create main `desugar()` function: `Expr → CoreExpr`
2. Create `desugarPattern()`: `Pattern → CorePattern`
3. Create `desugarDecl()`: `Declaration → CoreDeclaration`
4. Create `desugarModule()`: `Module → CoreModule`
5. Implement pass-through for already-core nodes
6. Add error handling with source locations
7. Add fresh variable generation utility

**Test:** `desugarer.test.ts` - Basic pass-through works

---

### Phase 3-11: Individual Transformations

Each transformation gets:
- Implementation in `desugarer.ts`
- Dedicated test file (e.g., `blocks.test.ts`)
- Comprehensive test coverage

**Test Coverage Per Transformation:**
- Happy path (basic case)
- Multiple/chained cases
- Nested cases
- Edge cases (single, empty, etc.)
- Complex expressions within
- Source location preservation

---

### Phase 12: Integration Testing
**File:** `packages/core/src/desugarer/integration.test.ts`

1. Test multiple transformations in single expression
2. Test complete programs from vibefun-spec.md examples
3. Test all features combined
4. Verify source locations throughout

---

## Testing Strategy

### Unit Tests (Per Transformation)

Each transformation has dedicated test file:

```
packages/core/src/desugarer/
├── blocks.test.ts          # Block → nested let
├── lambdas.test.ts         # Currying
├── pipes.test.ts           # Pipes
├── composition.test.ts     # Function composition
├── lists.test.ts           # List literals & cons
├── records.test.ts         # Record updates
├── conditionals.test.ts    # If → match
├── patterns.test.ts        # Or-patterns
└── integration.test.ts     # End-to-end
```

### Test Structure Pattern

```typescript
import { describe, it, expect } from 'vitest';
import { desugar } from './desugarer.js';
import type { Expr, CoreExpr } from '../types/index.js';

describe('Block Desugaring', () => {
    it('should desugar single-binding block to let', () => {
        const block: Expr = {
            kind: 'Block',
            statements: [
                { kind: 'Let', name: 'x', value: intLit(10) }
            ],
            expr: varExpr('x'),
            loc: testLoc
        };

        const result = desugar(block);

        expect(result.kind).toBe('CoreLet');
        expect(result.name).toBe('x');
        expect(result.body.kind).toBe('CoreVar');
    });

    it('should desugar multi-binding block to nested lets', () => {
        // ...
    });

    it('should preserve source locations', () => {
        // ...
    });
});
```

### Coverage Requirements

- **Minimum:** 95% code coverage
- **All error paths** must be tested
- **All edge cases** must be covered
- **Source locations** must be preserved

### Integration Test Examples

Test complete programs:

```typescript
describe('Integration - Complete Programs', () => {
    it('should desugar list sum example from spec', () => {
        // let sum = (list) => match list {
        //     | [] => 0
        //     | [x, ...rest] => x + sum(rest)
        // }
        const program = parseModule(`
            let sum = (list) => match list {
                | [] => 0
                | [x, ...rest] => x + sum(rest)
            }
        `);

        const desugared = desugarModule(program);

        // Verify:
        // - Lambda is single-parameter (curried)
        // - [] is Nil pattern
        // - List pattern preserved
        // - No surface syntax remains
    });
});
```

---

## Integration with Compiler Pipeline

### Before Desugarer

```
Parser → Surface AST (with sugar)
```

Surface AST may contain:
- Multi-parameter lambdas
- Pipe operators
- List literals
- Block expressions
- If expressions
- Or-patterns
- etc.

### After Desugarer

```
Desugarer → Core AST (no sugar)
```

Core AST guarantees:
- Single-parameter lambdas only
- No pipes or composition
- Only Cons/Nil for lists
- Only match for conditionals
- No or-patterns
- No blocks

### Type Checker Integration

Type checker works on Core AST:

```typescript
// In type checker
function inferExpr(expr: CoreExpr, env: TypeEnv): Type {
    switch (expr.kind) {
        case 'CoreLet': ...
        case 'CoreLambda': ...  // Always single parameter
        case 'CoreMatch': ...   // Only conditional
        case 'CoreVariant': ... // Including Cons/Nil
        // No cases for Pipe, Block, If, etc.
    }
}
```

---

## Error Handling

### Desugaring Errors

Errors that can occur during desugaring:

1. **Empty block** (should be prevented by parser)
2. **Invalid pattern in or-pattern** (inconsistent bindings)
3. **Fresh variable collision** (unlikely but possible)
4. **Unsupported node type** (indicates parser bug)

### Error Reporting

```typescript
class DesugarError extends Error {
    constructor(
        message: string,
        public loc: SourceLocation,
        public hint?: string
    ) {
        super(message);
    }
}

// Usage:
throw new DesugarError(
    'Empty block expression',
    block.loc,
    'Block must contain at least one expression'
);
```

---

## Fresh Variable Generation

Need unique variable names for generated code (composition, etc.):

```typescript
class FreshVarGen {
    private counter = 0;

    fresh(prefix: string = 'tmp'): string {
        return `$${prefix}${this.counter++}`;
    }
}

// Usage:
const gen = new FreshVarGen();
const varName = gen.fresh('composed');  // $composed0
```

**Naming Convention:**
- Prefix with `$` to avoid user-defined name collisions
- Use descriptive prefix: `$composed`, `$piped`, `$tmp`
- Counter ensures uniqueness

---

## Source Location Preservation

**Goal:** Maintain accurate source locations through transformations for error reporting.

**Strategy:**

1. **Direct transformations:** Copy location from source node
2. **Generated nodes:** Use source location of triggering construct
3. **Synthetic spans:** For deeply nested generated code, create span covering original expression

**Example:**

```typescript
// Desugaring: [1, 2, 3] at line 10, col 5
// Becomes: Cons(1, Cons(2, Cons(3, Nil)))

const listLoc = list.loc;  // { line: 10, col: 5, ... }

const desugared: CoreVariant = {
    kind: 'CoreVariant',
    name: 'Cons',
    args: [
        element1,  // Uses element1's location
        innerCons  // Uses list location
    ],
    loc: listLoc  // Use original list location
};
```

---

## Resolved Design Questions

### 1. Record Update Syntax ✅

**Question:** Support pipe syntax `{ r | f: v }`, spread syntax `{ ...r, f: v }`, or both?

**Decision:** Only pipe syntax `{ record | field: value }` is supported. Spread syntax removed from spec.

**Rationale:** Single, clear syntax. Less parser complexity. JavaScript spread handled at code generation.

### 2. List Pattern Desugaring ✅

**Question:** Should `[x, ...rest]` patterns be desugared to cons patterns?

**Decision:** YES - Desugar to `CoreVariantPattern("Cons", [x, rest])` for uniformity.

**Rationale:** Type checker and code generator only need to handle variant patterns. Simpler Core AST.

### 3. Mutable References ✅

**Question:** Include mutable references in desugaring phase or defer?

**Decision:** Include in initial implementation as pass-through transformations.

**Rationale:** They're in the AST and spec. Pass-through is simple. Type checker needs them.

### 4. List Spread in Expressions ✅

**Question:** Support list spread in expression context (e.g., `[1, ...xs, 2]`)?

**Decision:** YES - Add to AST and desugar to cons chains with concat for multiple segments.

**Rationale:** Spec mentions it. Natural feature. Can be desugared to concat operations.

### 5. Exhaustiveness Checking

**Question:** Should desugarer validate pattern match exhaustiveness?

**Decision:** No, leave to type checker. Desugarer is pure transformation.

### 6. Record Update Type Information

**Question:** Do we need type information to fully desugar record updates?

**Current Decision:** Start without type info, generate spread semantics. Revisit during type checker integration if needed.

**Alternative:** Defer record update desugaring to type checker phase where types are known.

---

## Success Criteria

Implementation is complete when:

✅ All Core AST types defined and documented
✅ All 10 transformations implemented
✅ Test coverage ≥ 95%
✅ All tests passing (`npm test`)
✅ Type checking passes (`npm run check`)
✅ Linting passes (`npm run lint`)
✅ Code formatted (`npm run format`)
✅ Integration tests with parser work
✅ Ready for type checker integration
✅ Documentation complete

---

## Timeline Estimate

- **Phase 1:** Core AST types - 2-3 hours
- **Phase 2:** Foundation - 2 hours
- **Phase 3-11:** Transformations - 1.5 hours each × 9 = 13.5 hours
- **Phase 12:** Integration - 3 hours
- **Documentation & Polish:** 2 hours

**Total:** ~22-25 hours of focused implementation

---

## References

- **Language Spec:** `vibefun-spec.md`
- **Architecture:** `.claude/plans/compiler-architecture.md`
- **Type System:** `.claude/plans/type-system.md`
- **Parser Source:** `packages/core/src/parser/`
- **AST Types:** `packages/core/src/types/ast.ts`
- **Coding Standards:** `.claude/CODING_STANDARDS.md`

---

**Last Updated:** 2025-10-29 (Updated with gap analysis resolutions)
