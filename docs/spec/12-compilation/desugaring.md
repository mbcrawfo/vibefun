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
[1, 2, 3]

// Desugared to
1 :: 2 :: 3 :: []
```

**Empty list:**
```vibefun
[]  // Remains as [] (primitive)
```

**List with spread:**
```vibefun
// Surface syntax
[1, 2, ...rest]

// Desugared to
1 :: 2 :: rest
```

#### Multi-Argument Functions

Functions with multiple parameters are desugared to nested single-parameter functions (currying):

```vibefun
// Surface syntax
let add = (x, y) => x + y

// Desugared to
let add = (x) => (y) => x + y
```

**Multi-argument application:**
```vibefun
// Surface syntax
add(10, 20)

// Desugared to
((add(10))(20))
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
value |> f

// Desugared to
f(value)
```

**Pipe chains:**
```vibefun
// Surface syntax
x |> f |> g |> h

// Desugared to (left-associative)
h(g(f(x)))
```

**Pipe with lambdas:**
```vibefun
// Surface syntax
data |> map((x) => x * 2) |> filter((x) => x > 10)

// Desugared to
filter(map(data, (x) => x * 2), (x) => x > 10)
```

#### Composition Operators

Forward and backward composition are desugared to lambda expressions:

```vibefun
// Surface syntax (forward composition)
let pipeline = f >> g >> h

// Desugared to
let pipeline = (x) => h(g(f(x)))
```

```vibefun
// Surface syntax (backward composition)
let pipeline = h << g << f

// Desugared to
let pipeline = (x) => h(g(f(x)))
```

#### String Concatenation

The `&` operator for strings is desugared to `String.concat`:

```vibefun
// Surface syntax
"hello" & " " & "world"

// Desugared to
String.concat(String.concat("hello", " "), "world")
```

**Note:** Type checker ensures operands are strings before desugaring.

#### Pattern Matching

Complex pattern matching is desugared to nested if/switch expressions and destructuring:

**Simple variant matching:**
```vibefun
// Surface syntax
match opt {
    | Some(x) => x
    | None => 0
}

// Desugared to (conceptual)
if opt.tag == "Some" then opt.value
else if opt.tag == "None" then 0
else panic("Non-exhaustive match")
```

**List pattern matching:**
```vibefun
// Surface syntax
match list {
    | [] => 0
    | [x] => x
    | [x, y, ...rest] => x + y
}

// Desugared to (conceptual)
if list.length == 0 then 0
else if list.length == 1 then list[0]
else
    let x = list[0]
    let y = list[1]
    let rest = list.slice(2)
    x + y
```

**Guards:**
```vibefun
// Surface syntax
match x {
    | n when n > 0 => "positive"
    | n when n < 0 => "negative"
    | _ => "zero"
}

// Desugared to
if x > 0 then "positive"
else if x < 0 then "negative"
else "zero"
```

#### If-Without-Else

If expressions without an else clause are desugared to include a Unit-returning else:

```vibefun
// Surface syntax
if condition then action()

// Desugared to
if condition then action() else ()
```

**Type checking ensures action() returns Unit.**

#### Mutable References

Reference operations are desugared to function calls:

```vibefun
// Surface syntax
let mut counter = ref(0)
let value = !counter
counter := 5

// Desugared to (conceptual)
let counter = ref(0)
let value = deref(counter)
refAssign(counter, 5)
```

**Note:** The actual representation of refs is implementation-specific (likely `{ value: T }` objects).

#### Let-Rec Mutual Recursion

Mutually recursive functions are desugared to a single recursive binding:

```vibefun
// Surface syntax
let rec isEven = (n) =>
    if n == 0 then true else isOdd(n - 1)
and isOdd = (n) =>
    if n == 0 then false else isEven(n - 1)

// Desugared to (conceptual - creates mutually recursive scope)
let rec {
    isEven: (n) => if n == 0 then true else isOdd(n - 1),
    isOdd: (n) => if n == 0 then false else isEven(n - 1)
}
```

#### Implicit Returns

Block expressions with multiple statements return the last expression:

```vibefun
// Surface syntax
{
    let x = 10
    let y = 20
    x + y
}

// Desugared to (explicit return of last expression)
{
    let x = 10;
    let y = 20;
    return x + y
}
```

**Note:** The desugaring ensures the last expression's value is the block's result.

#### Summary of Desugarings

| Surface Syntax | Desugared To |
|----------------|--------------|
| `[a, b, c]` | `a :: b :: c :: []` |
| `(x, y) => e` | `(x) => (y) => e` |
| `f(a, b)` | `((f(a))(b))` |
| `{...r, f: v}` | `{f1: r.f1, f: v}` |
| `x \|> f` | `f(x)` |
| `f >> g` | `(x) => g(f(x))` |
| `s1 & s2` | `String.concat(s1, s2)` |
| `!ref` | `deref(ref)` |
| `ref := v` | `refAssign(ref, v)` |
| `if c then e` | `if c then e else ()` |
| Pattern matching | Nested if/destructuring |

