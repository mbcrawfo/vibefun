# Test 4: Lambda in Function Call (Juxtaposition Application)

## Test Location
`packages/core/src/parser/lambda-precedence.test.ts:133-142`

## Test Description
```typescript
it("should parse lambda in function call: map (x => x + 1) list", () => {
    const expr = parse("let result = map (x => x + 1) list");
    expect(expr.kind).toBe("App");
    if (expr.kind !== "App") return;

    // First arg should be lambda
    const firstArg = expr.args[0];
    if (!firstArg) throw new Error("Expected first argument");
    expect(firstArg.kind).toBe("Lambda");
});
```

## Expected Behavior
Parse `map (x => x + 1) list` as a function application:
```
App {
  func: Var("map"),
  args: [
    Lambda(x => x + 1),  // First argument (parenthesized)
    Var("list")          // Second argument
  ]
}
```

## Actual Behavior
**ParserError: Expected declaration keyword**

The parser stops after `(x => x + 1)` and tries to parse `list` as a new declaration, failing because `list` is not a keyword like `let`, `type`, etc.

## Root Cause Analysis

### Token Sequence
```
KEYWORD:let
IDENTIFIER:result
OP_EQUALS:=
IDENTIFIER:map
LPAREN:(
IDENTIFIER:x
FAT_ARROW:=>
IDENTIFIER:x
OP_PLUS:+
INT_LITERAL:1
RPAREN:)
IDENTIFIER:list      <-- Parser fails here
NEWLINE:\n
EOF
```

### Missing Feature: Juxtaposition Application
The parser **does not implement juxtaposition (space-separated) function application**.

Current function call syntax requires explicit parentheses:
```vibefun
// ✅ Supported: Explicit parentheses
map(f, list)
map((x => x + 1), list)

// ❌ Not supported: Juxtaposition
map f list
map (x => x + 1) list
```

### Parser Structure
The `parseCall()` method (parser.ts:859-945) only handles:
1. **Parenthesized calls**: `func(arg1, arg2)`
2. **Field access**: `obj.field`

It does NOT handle:
3. **Juxtaposition**: `func arg1 arg2` ← Missing!

### Why It Fails
When parsing `map (x => x + 1) list`:

1. Parser sees `map` as a variable
2. Parser sees `(` and parses the lambda as a parenthesized expression
3. **Parser stops** - no more postfix operators (no `.` or `(`)
4. Expression parsing returns: `Var("map")`
5. Let declaration parsing consumes `=` and the expression, expecting end
6. Parser sees `IDENTIFIER:list` where it expects newline/EOF
7. Module-level parsing tries to parse `list` as a declaration
8. **Error**: "Expected declaration keyword" (line 2440)

## What Would Be Needed to Fix

### Implementation Requirements

#### 1. Add Juxtaposition Application Parsing
Modify `parseCall()` or create a new `parseApplication()` method to handle space-separated arguments:

```typescript
private parseApplication(): Expr {
    let expr = this.parseCall(); // Parse primary + postfix ops

    // Check for juxtaposition arguments
    while (this.canStartExpression()) {
        // Don't consume newlines - juxtaposition requires same line
        if (this.check("NEWLINE")) break;

        // Check for expression starters that could be arguments
        const arg = this.parseCall(); // Parse next argument

        // Build application node
        expr = {
            kind: "App",
            func: expr,
            args: [arg],
            loc: expr.loc
        };
    }

    return expr;
}
```

#### 2. Handle Multi-Argument Application
ML-style function application is left-associative and curried:
```vibefun
f x y z  ==  ((f x) y) z

// Should parse as:
App(App(App(f, x), y), z)
```

Or accumulate all arguments:
```vibefun
// Could also parse as:
App(f, [x, y, z])
```

The AST type needs clarification: single arg or arg list?

#### 3. Precedence Considerations
Juxtaposition should have higher precedence than binary operators:
```vibefun
f x + y  ==  (f x) + y      // Not: f (x + y)
f x :: xs == (f x) :: xs    // Not: f (x :: xs)
```

But lower than postfix:
```vibefun
obj.method x == (obj.method) x     // Call method, pass x
list[0] y    == (list[0]) y        // Index list, pass y
```

#### 4. Handle Parenthesized Arguments
Distinguish between:
```vibefun
f (x + 1)     // f applied to one arg: (x + 1)
f(x + 1)      // Same, explicit call syntax
f x + 1       // Different: (f x) + 1
```

#### 5. Interaction with Lambdas
Lambda precedence (lowest) means:
```vibefun
f x => x + 1  ==  f (x => x + 1)   // Lambda is the argument
map x => x + 1  // NOT: (map x) => x + 1
```

The parser must stop juxtaposition parsing before consuming `=>`.

### Grammar Changes Needed

```ebnf
# Current (explicit calls only):
call_expr = primary ( "(" expr_list? ")" | "." IDENTIFIER )*

# Proposed (with juxtaposition):
application = call_expr call_expr*
call_expr = primary ( "(" expr_list? ")" | "." IDENTIFIER )*

# With precedence:
expr = lambda_expr
lambda_expr = pattern_list "=>" expr | pipe_expr
pipe_expr = application ("|>" application)*
application = call_expr call_expr*  # Left-associative
call_expr = unary ( "(" expr_list? ")" | "." IDENTIFIER )*
```

### Complexity Assessment

**Moderate to High Complexity:**

1. **Parsing logic**: ~50-100 lines of new code
2. **Precedence**: Integration with existing precedence levels
3. **AST changes**: May need to unify `App` and `Call` nodes
4. **Lookahead**: Need to detect when to stop consuming arguments
5. **Testing**: Extensive tests for precedence interactions
6. **Desugarer**: May need updates if AST structure changes
7. **Type checker**: May need updates for curried application

### AST Type Consideration

Current AST may have both:
```typescript
interface App {
    kind: "App";
    func: Expr;
    args: Expr[];  // Could be single or multiple
    loc: Location;
}
```

Need to verify if `args` is:
- Single argument: `args: [Expr]` (curried style)
- Argument list: `args: Expr[]` (n-ary style)

## Examples to Handle

```vibefun
// Basic juxtaposition
f x                  // App(f, [x])
f x y                // App(App(f, [x]), [y]) or App(f, [x, y])

// With parentheses
f (x + 1)            // App(f, [(x + 1)])
(f) (x)              // App(f, [x])

// Mixed with explicit calls
f(x) y               // App(Call(f, [x]), [y])
f x(y)               // App(f, [Call(x, [y])])

// With operators
f x + y              // BinOp(App(f, [x]), +, y)
f (x + y)            // App(f, [(x + y)])

// Lambda arguments
map (x => x + 1) list   // App(App(map, [Lambda]), [list])
filter (x => x > 0) xs  // App(App(filter, [Lambda]), [xs])

// Curried functions
add 1 2              // App(App(add, [1]), [2])
```

## Related Language Features

### Type Inference Implications
Juxtaposition application requires:
- Function types to be curried: `Int -> Int -> Int`
- Type checker to handle partial application
- Unification of application argument types

### Relationship to Other Syntax
```vibefun
// Pipe operator (already supported?)
list |> map (x => x + 1) |> filter (x => x > 0)

// With juxtaposition:
list |> map (x => x + 1) |> filter (x => x > 0)  // Same?

// Or:
filter (x => x > 0) (map (x => x + 1) list)  // Juxtaposition
```

## Investigation Needed

1. **Check AST types**: What does `App` node structure look like?
2. **Review desugarer**: Does it expect specific `App` structure?
3. **Check type checker**: How does it handle function application?
4. **Language spec**: Does spec define juxtaposition application?
5. **Other tests**: Do other tests assume explicit call syntax only?

## Recommendation

### Approach 1: Full Implementation
Implement juxtaposition application as a proper parser feature:

**Pros**:
- Essential for ML-style functional programming
- Enables elegant function composition
- Standard in similar languages

**Cons**:
- Significant implementation effort (~200-300 lines with tests)
- Requires careful precedence handling
- May affect other parts of compiler

**Estimated effort**: 4-6 hours

### Approach 2: Update Test
If juxtaposition is not intended for the language, update the test:

```typescript
it("should parse lambda in function call", () => {
    // Explicit call syntax
    const expr = parse("let result = map((x => x + 1), list)");
    expect(expr.kind).toBe("App");
});
```

**Pros**:
- Immediate fix
- No parser changes needed

**Cons**:
- Less elegant syntax
- Inconsistent with ML-family languages
- May disappoint users expecting functional syntax

## Status
**Requires implementation of juxtaposition application feature** - Not a simple bug fix.

**Before proceeding**, confirm:
1. Is juxtaposition application intended for Vibefun?
2. What should the AST structure be for curried vs n-ary application?
3. Should this be prioritized now or deferred to a future milestone?
