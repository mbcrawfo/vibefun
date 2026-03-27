# Feature Audit: Expressions

**Spec files**: 04-expressions/*.md
**Date**: 2026-03-26

## Results

### Basic Expressions

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 1 | Integer literal expression | basic-expressions.md (Literal Expressions) | positive | PASS | `let x = 42;` compiles and outputs `42` |
| 2 | String literal expression | basic-expressions.md (Literal Expressions) | positive | PASS | `let x = "hello world";` compiles and outputs correctly |
| 3 | Boolean literal expression | basic-expressions.md (Literal Expressions) | positive | PASS | `true` and `false` both work correctly |
| 4 | Variable reference | basic-expressions.md (Variable References) | positive | PASS | `let y = x;` correctly reads value of `x` |
| 5 | Let binding | basic-expressions.md (Variable References) | positive | PASS | `let x = 42;` compiles and outputs `42` |
| 6 | Variable shadowing | basic-expressions.md (Scoping) | positive | **FAIL** | Compiles but runtime error: `SyntaxError: Identifier 'x' has already been declared`. Code generator emits `const x = 1; const x = 2;` which JS rejects. Shadowing should use different variable names in generated JS. |
| 7 | Parenthesized expression | basic-expressions.md (Parentheses for Grouping) | positive | PASS | `(1 + 2) * 3` correctly outputs `9` |

### Arithmetic

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 8 | Addition `1 + 2` | basic-expressions.md (Arithmetic Operators) | positive | PASS | Outputs `3` |
| 9 | Subtraction `5 - 3` | basic-expressions.md (Arithmetic Operators) | positive | PASS | Outputs `2` |
| 10 | Multiplication `3 * 4` | basic-expressions.md (Arithmetic Operators) | positive | PASS | Outputs `12` |
| 11 | Division `10 / 3` | basic-expressions.md (Division Semantics) | positive | PASS | Outputs `3`; generated JS correctly uses `Math.trunc(10 / 3)` for integer division |
| 12 | Modulo `10 % 3` | basic-expressions.md (Arithmetic Operators) | positive | PASS | Outputs `1` |
| 13 | Operator precedence `2 + 3 * 4` | basic-expressions.md (Operator Precedence) | positive | PASS | Outputs `14` (multiplication before addition) |
| 14 | Unary negation `-42` | basic-expressions.md (Unary operator) | positive | PASS | Outputs `-42` |

### Comparison

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 15 | Equal `==` | basic-expressions.md (Comparison Operators) | positive | PASS | `5 == 5` is `true`, `5 == 3` is `false` |
| 16 | Not equal `!=` | basic-expressions.md (Comparison Operators) | positive | PASS | `5 != 3` is `true`, `5 != 5` is `false` |
| 17 | Less than `<` | basic-expressions.md (Comparison Operators) | positive | PASS | `3 < 5` is `true`, `5 < 3` is `false` |
| 18 | Greater than `>` | basic-expressions.md (Comparison Operators) | positive | PASS | `5 > 3` is `true`, `3 > 5` is `false` |
| 19 | Less or equal `<=` | basic-expressions.md (Comparison Operators) | positive | PASS | `5 <= 5` true, `3 <= 5` true, `5 <= 3` false |
| 20 | Greater or equal `>=` | basic-expressions.md (Comparison Operators) | positive | PASS | `5 >= 5` true, `5 >= 3` true, `3 >= 5` false |

### Logical Operators

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 21 | AND `&&` | basic-expressions.md (Logical Operators) | positive | PASS | `true && true` = true, `true && false` = false, `false && true` = false |
| 22 | OR `\|\|` | basic-expressions.md (Logical Operators) | positive | PASS | `true \|\| false` = true, `false \|\| true` = true, `false \|\| false` = false |
| 23 | NOT `!` | basic-expressions.md (NOT Operator) | positive | PASS | `!true` = false, `!false` = true |
| 24 | Short-circuit AND | evaluation-order.md (And Operator) | positive | PASS | `false && (10 / 0 == 1)` does not trigger division by zero, confirming right side not evaluated |
| 25 | Short-circuit OR | evaluation-order.md (Or Operator) | positive | PASS | `true \|\| (10 / 0 == 1)` does not trigger division by zero, confirming right side not evaluated |

### String Operations

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 26 | String concatenation `&` | basic-expressions.md (String Concatenation) | positive | PASS | `"hello" & " " & "world"` outputs `hello world` |

### If-Then-Else

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 27 | Basic if-then-else | control-flow.md (If Expressions) | positive | **FAIL** | `if true then 1 else 0` fails with `error[VF4400]: Non-exhaustive pattern match. Missing cases: <other values>`. The if-expression appears to be desugared to a match on Bool, but the exhaustiveness checker does not recognize `true`/`false` as covering all cases. Also fails with variable conditions. |
| 28 | If-then-else as expression | control-flow.md (If Expressions) | positive | **FAIL** | Same exhaustiveness error as test 27. `if x > 3 then "big" else "small"` fails. |
| 29 | Nested if/else-if chains | control-flow.md (If Expressions) | positive | **FAIL** | Same exhaustiveness error on the inner if. |
| 30 | If without else | control-flow.md (If Without Else) | positive | **FAIL** | `if true then unsafe { log("executed") };` at top level fails with `error[VF2001]: Unexpected keyword in declaration: if`. Parser does not accept if as a standalone expression/declaration at the top level. Wrapping in `let _ = ...` also fails with the exhaustiveness error. |

### Match Expressions

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 31 | Match on variant (Some/None) | control-flow.md (Match Expressions) | positive | **FAIL** | Compiles successfully but fails at runtime: `ReferenceError: Some is not defined`. The generated JS references `Some(42)` without defining the variant constructor. Built-in variant constructors are not emitted in the generated code. |

### Block Expressions

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 32 | Block as expression | functions-composition.md (Block Expressions) | positive | PASS | `{ let x = 1; let y = 2; x + y; }` outputs `3` |
| 33 | Nested blocks | functions-composition.md (Nested Blocks) | positive | PASS | Nested blocks with inner variables correctly outputs `13` |

### List Literals

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 34 | Empty list `[]` | data-literals.md (List Literals) | positive | PASS | `let xs: List<Int> = [];` compiles and runs |
| 35 | List with elements `[1, 2, 3]` | data-literals.md (List Literals) | positive | PASS | Compiles and runs |
| 36 | List cons `1 :: [2, 3]` | data-literals.md (Cons Operator) | positive | PASS | Compiles and runs |
| 37 | List spread `[0, 1, ...xs]` | data-literals.md (List Spread Operator) | positive | PASS | Compiles and runs |

### Record Literals

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 38 | Record construction | data-literals.md (Record Construction) | positive | PASS | `{ name: "Alice", age: 30 }` compiles and runs |
| 39 | Field access | data-literals.md (Field Access) | positive | PASS | `r.name` outputs `Alice`, `r.age` outputs `30` |
| 40 | Record spread update | data-literals.md (Record Update) | positive | PASS | `{ ...r, age: 31 }` correctly updates age to 31 while preserving name |

### Functions and Composition

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 41 | Lambda expression | functions-composition.md (Lambda Expressions) | positive | PASS | `(x: Int) => x + 1` applied to 41 outputs `42` |
| 42 | Multi-parameter lambda call | basic-expressions.md (Function Calls) | positive | **FAIL** | `let add = (x: Int, y: Int) => x + y; add(3, 4);` fails with `error[VF4021]: Cannot unify functions with different arity: 1 vs 2`. The spec shows `add(1, 2)` as valid multi-arg call syntax, but the compiler requires curried form `add(3)(4)` which works. |
| 43 | Pipe operator `\|>` | functions-composition.md (Pipe Expressions) | positive | PASS | `41 \|> inc` outputs `42` |
| 44 | Forward composition `>>` | functions-composition.md (Composition Operators) | positive | PASS | `double >> inc` applied to 5 outputs `11` (double(5)=10, inc(10)=11) |
| 45 | Backward composition `<<` | functions-composition.md (Composition Operators) | positive | PASS | `double << inc` applied to 5 outputs `12` (inc(5)=6, double(6)=12) |

### Evaluation Order

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 46 | Left-to-right evaluation of function arguments | evaluation-order.md (Argument Evaluation) | positive | **FAIL** | Cannot properly test with side effects because blocks with non-let expressions (like `:=` assignment) fail with `Internal error: Non-let expression in block (except final expression)`. The `let _ = counter := ...` workaround also fails with `Pattern matching in let-bindings not yet implemented`. Generated JS uses standard JS evaluation order which is left-to-right, so underlying behavior is likely correct. |
| 47 | Strict evaluation | evaluation-order.md (General Principles) | positive | PASS | `let x = 1 + 2;` is eagerly evaluated to `3`. Vibefun compiles to JS which is strict by default. |

### Negative Tests

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 48 | If branches with different types | control-flow.md (Type requirements) | negative | PASS | `if true then 42 else "hello"` correctly rejected with `Cannot unify Int with String` |
| 49 | Undefined variable | basic-expressions.md (Scoping) | negative | PASS | `let x = y + 1;` correctly rejected with `Undefined variable 'y'` |
| 50 | Type mismatch in arithmetic | basic-expressions.md (Type Requirements) | negative | PASS | `42 + "hello"` correctly rejected with `Cannot unify String with Int` |

## Additional Observations

### Zero-parameter lambdas crash the compiler
Attempting `let f = () => 42;` or similar zero-parameter lambdas causes `Internal error: Lambda with zero parameters`. The spec shows `() => 42;` as valid syntax (functions-composition.md line 10).

### Blocks cannot contain non-let side effects (except as final expression)
Block bodies like `{ counter := !counter + 1; !counter; }` fail with `Internal error: Non-let expression in block (except final expression)`. Only `let` bindings and a final expression are supported, which limits the ability to perform side effects in blocks.

### `let _` pattern matching not implemented for assignment results
`let _ = counter := !counter + 1;` fails with `Pattern matching in let-bindings not yet implemented`, making it impossible to discard `:=` results.

## Summary
- Total: 50 tests
- Pass: 40
- Fail: 10

### Failures by Category

| Category | Count | Issue |
|----------|-------|-------|
| If-then-else | 4 | Exhaustiveness checker rejects all if-then-else expressions (tests 27-30) |
| Match/Variants | 1 | Built-in variant constructors (Some/None) not defined in generated JS (test 31) |
| Variable shadowing | 1 | Code generator emits duplicate `const` declarations (test 6) |
| Multi-arg call syntax | 1 | Compiler requires curried call `f(a)(b)` instead of spec-allowed `f(a, b)` (test 42) |
| Side-effect blocks | 1 | Blocks reject non-let expressions except as final expression (test 46) |
| Zero-param lambdas | 1 | `() => expr` crashes compiler (discovered in tests 24/25 workarounds) |
| If without else at top-level | 1 | Parser rejects `if` at top level even with else (test 30) |

### Critical Issues
1. **If-then-else completely broken**: All if-then-else expressions fail with a spurious exhaustiveness error, blocking a fundamental control flow feature.
2. **Variant constructors not emitted**: Some/None/Ok/Err constructors are not included in generated JS, making pattern matching on variants fail at runtime.
3. **Variable shadowing broken at runtime**: Code generator doesn't rename shadowed variables, causing JS `const` redeclaration errors.
