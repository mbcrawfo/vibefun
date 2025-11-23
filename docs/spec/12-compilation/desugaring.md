# Desugaring

### Compilation Pipeline

1. **Lexing**: Source code → Tokens
2. **Parsing**: Tokens → AST
3. **Desugaring**: Surface AST → Core AST
4. **Type Checking**: Core AST + Type Inference
5. **Optimization**: Optional transformations
6. **Code Generation**: Core AST → JavaScript

### Desugaring Transformations

The desugaring phase transforms surface syntax (what programmers write) into a simpler core AST. This section documents how each syntactic construct is desugared.

#### List Literals

List literals are desugared to cons operations:

```vibefun
// Surface syntax
[1, 2, 3];

// Desugared to
1 :: 2 :: 3 :: []
```

**Empty list:**
```vibefun
[];  // Remains as [] (primitive)
```

**List with spread:**
```vibefun
// Surface syntax
[1, 2, ...rest];

// Desugared to
1 :: 2 :: rest
```

#### Multi-Argument Functions

Functions with multiple parameters are desugared to nested single-parameter functions (currying):

```vibefun
// Surface syntax
let add = (x, y) => x + y;

// Desugared to
let add = (x) => (y) => x + y;
```

**Multi-argument application:**
```vibefun
// Surface syntax
add(10, 20);

// Desugared to
((add(10))(20));
```

#### Record Updates

Record update syntax is desugared to record construction:

```vibefun
// Surface syntax
{ ...person, age: 31 }

// Desugared to (conceptual - actual implementation may vary)
{ name: person.name, age: 31, email: person.email }
```

**Multiple fields:**
```vibefun
// Surface syntax
{ ...person, age: 31, city: "NYC" }

// Desugared to
{ name: person.name, age: 31, email: person.email, city: "NYC" }
```

**Multiple spreads (right-to-left evaluation):**
```vibefun
// Surface syntax
{ ...defaults, ...overrides, name: "Alice" }

// Desugared to (fields from right override left)
{ field1: overrides.field1, field2: overrides.field2, name: "Alice" }
```

#### Pipe Operator

The pipe operator is desugared to function application:

```vibefun
// Surface syntax
value |> f;

// Desugared to
f(value);
```

**Pipe chains:**
```vibefun
// Surface syntax
x |> f |> g |> h;

// Desugared to (left-associative)
h(g(f(x)));
```

**Pipe with lambdas:**
```vibefun
// Surface syntax
data |> map((x) => x * 2) |> filter((x) => x > 10);

// Desugared to
filter(map(data, (x) => x * 2), (x) => x > 10);
```

#### Composition Operators

Forward and backward composition are desugared to lambda expressions:

```vibefun
// Surface syntax (forward composition)
let pipeline = f >> g >> h;

// Desugared to
let pipeline = (x) => h(g(f(x)));
```

```vibefun
// Surface syntax (backward composition)
let pipeline = h << g << f;

// Desugared to
let pipeline = (x) => h(g(f(x)));
```

#### String Concatenation

The `&` operator for strings is **not desugared** - it is passed through as a core binary operator:

```vibefun
// Surface syntax
"hello" & " " & "world";

// Core representation
CoreBinOp("Concat", CoreBinOp("Concat", "hello", " "), "world")
```

**Rationale:** String concatenation is kept as a core operation to allow the code generator to optimize string concatenation and keep the core AST simpler. The code generator handles the runtime semantics directly rather than requiring `String.concat()` function calls.

**Note:** Type checker ensures operands are strings.

#### Pattern Matching

Complex pattern matching is desugared to nested if/switch expressions and destructuring. Pattern matching follows **first-match semantics**: patterns are evaluated top-to-bottom, and the first matching pattern's body is executed.

##### Evaluation Semantics

Pattern matching evaluation follows this order:

1. **Evaluate the scrutinee** (the expression being matched) once
2. **Test patterns top-to-bottom** in the order they appear
3. **For each pattern**:
   - Check if the pattern matches the scrutinee value
   - If the pattern has a guard (`when`), evaluate the guard expression
   - If both pattern and guard match, execute the body and return its value
4. **If no pattern matches**, the match is non-exhaustive (compile-time error if detected, runtime panic if not)

**Important properties:**
- **First-match wins**: If multiple patterns could match, only the first one executes
- **Scrutinee evaluated once**: Side effects in the matched expression happen exactly once
- **Guards evaluated in order**: A guard is only evaluated if its pattern matches
- **Guards can fail**: If a pattern matches but its guard returns `false`, matching continues to the next pattern

##### Simple variant matching

**Surface syntax:**
```vibefun
match opt {
    | Some(x) => x
    | None => 0
}
```

**Desugared semantics (implementation-agnostic):**
```
1. Evaluate opt once (call it $scrutinee)
2. Check if $scrutinee is a Some constructor:
   - If yes: bind x to the wrapped value, evaluate body (x), return result
3. Check if $scrutinee is a None constructor:
   - If yes: evaluate body (0), return result
4. If neither matched: panic "Non-exhaustive match" (should be caught at compile time)
```

**Note:** The exact representation of variant tags (string tags, numeric tags, etc.) is implementation-specific. The semantics above describe the **behavior**, not the implementation.

##### List pattern matching

**Surface syntax:**
```vibefun
match list {
    | [] => 0
    | [x] => x
    | [x, y, ...rest] => x + y
}
```

**Desugared semantics:**
```
1. Evaluate list once (call it $scrutinee)
2. Check if $scrutinee is empty:
   - If yes: evaluate body (0), return result
3. Check if $scrutinee has exactly one element:
   - If yes: bind x to first element, evaluate body (x), return result
4. Check if $scrutinee has two or more elements:
   - If yes: bind x to first, y to second, rest to remaining elements
   - Evaluate body (x + y), return result
```

**List pattern properties:**
- List length is checked at match time
- Elements are bound to variables only if the pattern matches
- Rest patterns (`...rest`) bind to a list of remaining elements (may be empty)

##### Pattern Guards

Guards are boolean expressions evaluated **after** a pattern matches:

**Surface syntax:**
```vibefun
match x {
    | n when n > 0 => "positive"
    | n when n < 0 => "negative"
    | _ => "zero"
}
```

**Desugared semantics:**
```
1. Evaluate x once (call it $scrutinee)
2. Pattern: n (binds to $scrutinee), Guard: n > 0
   - Bind n to $scrutinee
   - Evaluate guard: n > 0
   - If guard is true: evaluate body ("positive"), return result
   - If guard is false: continue to next pattern
3. Pattern: n (binds to $scrutinee), Guard: n < 0
   - Bind n to $scrutinee
   - Evaluate guard: n < 0
   - If guard is true: evaluate body ("negative"), return result
   - If guard is false: continue to next pattern
4. Pattern: _ (always matches)
   - Evaluate body ("zero"), return result
```

**Guard evaluation rules:**
- Guards are **only evaluated if the pattern matches**
- Guards are evaluated in **top-to-bottom order**
- A failing guard **does not** make the match non-exhaustive (matching continues to next pattern)
- Guards **must be pure expressions** (no side effects) for predictable behavior
- Multiple patterns with guards on the same value are evaluated sequentially until one succeeds

**Example with overlapping patterns:**
```vibefun
match value {
    | Some(x) when x > 10 => "big"
    | Some(x) when x > 0 => "small"  // Only checked if first guard fails
    | Some(x) => "non-positive"       // Only checked if both guards fail
    | None => "nothing"
}
```

Order of evaluation:
1. Check if `value` is `Some` and `x > 10` → if yes, return "big"
2. Check if `value` is `Some` and `x > 0` → if yes, return "small"
3. Check if `value` is `Some` (no guard) → if yes, return "non-positive"
4. Check if `value` is `None` → if yes, return "nothing"

##### Nested Pattern Matching

Nested patterns are flattened into sequential checks:

**Surface syntax:**
```vibefun
match result {
    | Ok(Some(x)) => x
    | Ok(None) => 0
    | Err(e) => -1
}
```

**Desugared semantics:**
```
1. Evaluate result once (call it $scrutinee)
2. Check if $scrutinee is Ok:
   - If yes: extract inner value (call it $inner)
   - Check if $inner is Some:
     - If yes: bind x to wrapped value, evaluate body (x), return result
     - If no: continue to next pattern
3. Check if $scrutinee is Ok:
   - If yes: extract inner value (call it $inner)
   - Check if $inner is None:
     - If yes: evaluate body (0), return result
     - If no: continue to next pattern
4. Check if $scrutinee is Err:
   - If yes: bind e to error value, evaluate body (-1), return result
```

**Nested pattern properties:**
- Outer patterns are checked first, then inner patterns
- Nested pattern variables are only bound if all levels match
- Arbitrary nesting depth is supported (limited by compiler/stack constraints)

#### If-Without-Else

If expressions without an else clause are **handled by the parser**, not the desugarer. The parser automatically inserts a Unit literal when the else branch is omitted:

```vibefun
// Source syntax
if condition then action();

// Parser produces AST
If {
  condition: condition,
  then: action(),
  else_: UnitLit  // Inserted by parser
}
```

**Rationale:** The parser handles this transformation to ensure the AST always has a complete if-expression. The AST type `else_: Expr` (not optional) enforces this contract, simplifying the desugarer and type checker.

**Note:** Type checking ensures `action()` returns Unit to make the branches compatible.

#### Mutable References

Reference operations are **not desugared** - they are passed through as core operations:

```vibefun
// Surface syntax
let mut counter = ref(0);
let value = !counter;
counter := 5;

// Core representation
let counter = ref(0) in
let value = CoreUnaryOp("Deref", counter) in
CoreBinOp("RefAssign", counter, 5)
```

**Rationale:** Mutable reference operations (`!` for dereference and `:=` for assignment) are kept as core operations rather than desugaring to `Ref.get()` and `Ref.set()` function calls. This is simpler and consistent with other operators, allowing the code generator to handle the runtime semantics directly.

**Note:** The actual representation of refs is implementation-specific (likely `{ value: T }` objects in JavaScript).

#### Let-Rec Mutual Recursion

Mutually recursive functions are desugared to a single recursive binding:

```vibefun
// Surface syntax
let rec isEven = (n) =>
    if n == 0 then true else isOdd(n - 1);
and isOdd = (n) =>
    if n == 0 then false else isEven(n - 1);

// Desugared to (conceptual - creates mutually recursive scope)
let rec {
    isEven: (n) => if n == 0 then true else isOdd(n - 1),
    isOdd: (n) => if n == 0 then false else isEven(n - 1);
}
```

#### Implicit Returns

Block expressions with multiple statements return the last expression:

```vibefun
// Surface syntax
{
    let x = 10;
    let y = 20;
    x + y;
}

// Desugared to (explicit return of last expression)
{
    let x = 10;
    let y = 20;
    return x + y;
}
```

**Note:** The desugaring ensures the last expression's value is the block's result.

#### Summary of Transformations

| Surface Syntax | Transform | Handler |
|----------------|-----------|---------|
| `[a, b, c]` | `a :: b :: c :: []` | Desugarer |
| `(x, y) => e` | `(x) => (y) => e` | Desugarer |
| `f(a, b)` | `((f(a))(b))` | Desugarer |
| `{...r, f: v}` | `{f1: r.f1, f: v}` | Desugarer |
| `x \|> f` | `f(x)` | Desugarer |
| `f >> g` | `(x) => g(f(x))` | Desugarer |
| `s1 & s2` | `CoreBinOp("Concat", s1, s2)` | Pass-through |
| `!ref` | `CoreUnaryOp("Deref", ref)` | Pass-through |
| `ref := v` | `CoreBinOp("RefAssign", ref, v)` | Pass-through |
| `if c then e` | AST with `else_: UnitLit` | Parser |
| `{name, age}` | `{name: name, age: age}` | Parser |
| `(x: Int)` | Strip annotation → `x` | Desugarer |
| Pattern matching | Nested if/destructuring | Desugarer |

**Key:**
- **Desugarer**: Surface syntax transformed to simpler core AST
- **Pass-through**: Kept as core operation for code generator
- **Parser**: Handled before desugarer sees it

