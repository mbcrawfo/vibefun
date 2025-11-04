# Functions and Composition

### Lambda Expressions

Lambda expressions (anonymous functions) are first-class values in Vibefun.

```vibefun
(x) => x + 1                    // Single parameter
(x, y) => x + y                 // Multiple parameters
() => 42                        // No parameters
(x) => { let y = x + 1; y }     // Block body
```

#### Lambda Syntax

```vibefun
// Single parameter (parentheses optional for one param)
(x) => x * 2
x => x * 2  // Also valid

// Multiple parameters (parentheses required)
(x, y) => x + y

// No parameters (parentheses required)
() => 42

// Block body
(x) => {
    let doubled = x * 2
    doubled + 1
}
```

#### Type Annotations in Lambdas

Lambda parameters can have optional type annotations:

```vibefun
// Parameter type annotations
(x: Int) => x + 1
(x: Int, y: Int) => x + y

// Return type annotation
(x): Int => x + 1

// Both parameter and return annotations
(x: Int, y: Int): Int => x + y

// Usually unnecessary (type inference works well)
let double = (x) => x * 2  // Inferred: <T>(T) -> T where T supports *
```

#### Destructuring in Lambda Parameters

Lambda parameters support pattern destructuring:

```vibefun
// Record destructuring
let getName = ({ name }) => name
let getCoords = ({ x, y }) => (x, y)

// List destructuring
let getFirst = ([first, ..._]) => first
let addPair = ([a, b]) => a + b

// Nested destructuring
let processUser = ({ profile: { name, age } }) => name & " is " & String.fromInt(age)

// Mix regular and destructured parameters
let combine = (prefix, { value }) => prefix & String.fromInt(value)
```

#### Lambdas Cannot Be Recursive

Anonymous lambda expressions **cannot** be directly recursive (they have no name to refer to):

```vibefun
// ❌ Error: Cannot reference lambda from within itself
let factorial = (n) => if n <= 1 then 1 else n * ???(n - 1)

// ✅ Solution: Use named recursive function
let rec factorial = (n) => if n <= 1 then 1 else n * factorial(n - 1)
```

#### Operator Sections

Vibefun **does not support** operator sections (Haskell-style partial application of operators):

```vibefun
// ❌ Not supported: operator sections
// (+)      // Would be a function (Int, Int) -> Int
// (+ 1)    // Would be partial application
// (1 +)    // Would be partial application

// ✅ Instead: Use lambda expressions
let add = (x, y) => x + y
let increment = (x) => x + 1
let addOne = (x) => 1 + x

// Common use: mapping with operators
[1, 2, 3] |> List.map((x) => x + 1)  // Must use lambda
```

**Rationale:** Operator sections would complicate parsing (ambiguity with parenthesized expressions) and are not essential—lambda expressions provide the same functionality with clearer syntax.

### Block Expressions

Blocks are sequences of expressions enclosed in braces `{ }`. The last expression in the block is the result value.

```vibefun
{
    let x = 10
    let y = 20
    x + y    // Result of block: 30
}
```

#### Block Syntax

```vibefun
{
    expression1;
    expression2;
    expression3;
    resultExpression  // No semicolon (or optional semicolon)
}
```

**Rules:**
- Expressions are separated by semicolons or newlines (automatic semicolon insertion)
- The **last expression** is the result value (no semicolon required)
- If the last expression has a semicolon, the block returns `()`

#### Scoping in Blocks

Each block creates a **new lexical scope**. Bindings (`let`) inside a block are local to that block:

```vibefun
let x = 10

{
    let x = 20  // New binding, shadows outer x
    let y = 30  // Local to block
    x + y       // 50
}

// Outside the block:
// x is still 10
// y is not in scope
```

**Shadowing:**
```vibefun
let x = 1
let x = 2  // Shadows previous x (creates new binding)

{
    let x = 3  // Shadows outer x within block
    x          // 3
}

x  // 2 (block doesn't affect outer binding)
```

#### Empty Blocks

An empty block `{}` has type `Unit` and evaluates to `()`:

```vibefun
let nothing = {}  // Type: Unit, value: ()

// Useful for no-op branches
if condition then {} else doSomething()
```

#### Blocks with Side Effects Only

If a block contains only side effects and doesn't produce a meaningful value, it returns `Unit`:

```vibefun
// Block with only side effects
let doWork = () => {
    unsafe { console_log("Step 1") };
    unsafe { console_log("Step 2") };
    unsafe { console_log("Step 3") }
}
// Type: () -> Unit

// If last expression has semicolon, returns Unit
let alsoUnit = {
    let x = 42;
    x + 1;  // Semicolon: value discarded, block returns ()
}
// Type: Unit
```

#### Blocks as Expressions

Blocks can appear anywhere an expression is expected:

```vibefun
// Block as function body
let compute = (x) => {
    let double = x * 2
    let triple = x * 3
    double + triple
}

// Block as if branch
let result = if condition then {
    let temp = expensiveComputation()
    process(temp)
} else {
    defaultValue
}

// Block in list
let values = [
    42,
    { let x = 10; x * 2 },
    100
]  // [42, 20, 100]

// Block as function argument
process({
    let data = fetchData()
    transform(data)
})
```

#### Sequential Execution

Expressions in a block are evaluated **sequentially** (top to bottom):

```vibefun
{
    unsafe { console_log("First") };   // Executed first
    unsafe { console_log("Second") };  // Then second
    unsafe { console_log("Third") }    // Then third
}

// With side effects and result
let result = {
    let mut counter = ref(0)
    counter := !counter + 1;  // Side effect
    counter := !counter + 1;  // Side effect
    !counter  // Result: 2
}
```

#### Nested Blocks

Blocks can be nested arbitrarily:

```vibefun
{
    let x = 1
    {
        let y = 2
        {
            let z = 3
            x + y + z  // 6 (all bindings in scope)
        }
    }
}
```

### Pipe Expressions

The pipe operator `|>` enables left-to-right function composition, making data transformation pipelines more readable.

```vibefun
// Forward pipe |>
data
    |> filter((x) => x > 0)
    |> map((x) => x * 2)
    |> sum

// Equivalent to:
sum(map(filter(data, (x) => x > 0), (x) => x * 2))
```

#### Pipe Operator Semantics

The pipe operator `|>` takes a value on the left and applies a function on the right:

```vibefun
// Basic syntax
value |> function

// Equivalent to:
function(value)

// Example
42 |> String.fromInt  // "42"
// Equivalent to: String.fromInt(42)
```

**Type:** `<A, B>(A, (A) -> B) -> B`

#### Pipe Precedence and Associativity

**Precedence:** 3 (very low - see [Operators Reference](../13-appendix.md#operators-reference))
**Associativity:** Left

This means:
- Pipe binds **very loosely** (evaluated after most other operators)
- Pipe chains evaluate **left to right**

```vibefun
// Left-associative: evaluated left-to-right
a |> f |> g |> h
// Equivalent to: ((a |> f) |> g) |> h
// Which is: h(g(f(a)))

// Low precedence: other operators evaluated first
x + 1 |> double
// Equivalent to: (x + 1) |> double
// NOT: x + (1 |> double)
```

#### Piping into Curried Functions

Since Vibefun functions are curried, pipe works naturally with partial application:

```vibefun
// Single-argument function
data |> filter(predicate)

// Multi-argument function: pipe provides first argument
list |> List.map((x) => x * 2)
// Equivalent to: List.map(list, (x) => x * 2)

// Partial application before piping
let increment = add(1)
42 |> increment  // 43

// Pipe into partially applied function
data |> map((x) => x + 1) |> filter((x) => x > 10)
```

#### Multi-Line Pipe Chains

Pipe chains are often formatted across multiple lines for readability:

```vibefun
let result = data
    |> filter((x) => x > 0)
    |> map((x) => x * 2)
    |> List.fold(0, (acc, x) => acc + x)

// Indentation style (start pipe at beginning of line)
let processed =
    rawData
    |> parse
    |> validate
    |> transform
    |> save

// Or align pipes
let processed = rawData
    |> parse
    |> validate
    |> transform
    |> save
```

#### Pipe vs Composition

**Pipe (`|>`)**: applies a value to functions (data flow)
**Composition (`>>`, `<<`)**: combines functions without applying them

```vibefun
// Pipe: immediate evaluation with value
data |> f |> g  // g(f(data))

// Composition: creates new function, no evaluation yet
let pipeline = f >> g  // (x) => g(f(x))
data |> pipeline       // Now evaluate: g(f(data))

// Precedence: composition binds tighter than pipe
data |> f >> g >> h
// Equivalent to: data |> (f >> g >> h)
// Which is: h(g(f(data)))
```

#### Common Pipe Patterns

```vibefun
// Data transformation pipeline
users
    |> List.filter((u) => u.active)
    |> List.map((u) => u.name)
    |> List.sort
    |> List.take(10)

// With intermediate bindings
let activeUsers = users |> List.filter((u) => u.active)
let names = activeUsers |> List.map((u) => u.name)
names |> List.sort

// Debugging: insert trace function
data
    |> transform
    |> tap(console_log)  // Debug: log intermediate value
    |> processMore

// Error handling with Result
fetchData()
    |> Result.flatMap(validate)
    |> Result.flatMap(process)
    |> Result.map(format)
```

#### Pipe with Operators

Operators have higher precedence than pipe, so they're evaluated first:

```vibefun
// Arithmetic before pipe
10 + 5 |> double  // double(15), not 10 + double(5)

// Comparison before pipe
x > 0 |> negate  // negate(x > 0), evaluates x > 0 first

// Field access before pipe
person.age |> String.fromInt

// Use parentheses for different grouping if needed
10 |> (x => x + 5) |> double  // double(15)
```

---

