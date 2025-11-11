# Code Generation

This document specifies the semantic guarantees of code generation from Vibefun to JavaScript. The focus is on **what behavior is guaranteed**, not on the specific implementation strategy chosen by a compiler.

## JavaScript Target

Vibefun generates JavaScript code targeting **ECMAScript 2020 (ES2020)**.

### Guaranteed Features

The generated JavaScript is guaranteed to be valid ES2020, which includes:

- Arrow functions, `const`/`let` declarations
- Destructuring, spread operators
- Promises, `async`/`await`
- Optional chaining (`?.`), nullish coalescing (`??`)
- All ES2020 standard library features

### Compatibility

- **Node.js**: 14.0+ (Node.js 16+ recommended)
- **Browsers**: Modern browsers (2020+)
- **Legacy targets**: Transpilation for older environments is the user's responsibility

### Source Maps

Vibefun generates source maps for debugging:

```bash
vibefun compile main.vf -o main.js --source-maps
```

This allows stepping through original Vibefun code in browser/Node.js debuggers.

## Code Generation Semantics

The sections below specify the **behavioral guarantees** of code generation. Specific implementation strategies (e.g., whether to use classes, objects, arrays, or other JavaScript constructs) are left to compiler implementers, provided the semantic guarantees are met.

### Philosophy

Code generation focuses on three principles:

1. **Correctness**: Generated code must preserve Vibefun semantics
2. **Debuggability**: Output should be readable and debuggable with source maps
3. **Performance**: Generated code should be reasonably efficient for the JavaScript runtime

Implementation strategies may change between compiler versions to improve performance or readability, as long as semantic guarantees are maintained.

---

## Value Representations

This section specifies the **semantic requirements** for how Vibefun values must behave at runtime. Compilers may choose different JavaScript representations as long as these semantics are preserved.

### Primitive Types

#### Int
- **Semantic mapping**: Vibefun `Int` values map to JavaScript `number` type
- **Range guarantee**: Values must behave correctly for integers in the safe integer range (-(2^53 - 1) to 2^53 - 1)
- **Overflow behavior**: Operations that exceed safe integer range have implementation-defined behavior (may wrap, throw, or produce incorrect results)
- **No automatic coercion**: Int values must not automatically convert to Float

#### Float
- **Semantic mapping**: Vibefun `Float` values map to JavaScript `number` type
- **IEEE 754 compliance**: Must support standard IEEE 754 double-precision semantics
- **Special values**: Must correctly handle `Infinity`, `-Infinity`, and `NaN` as specified in error handling
- **No automatic coercion**: Float values must not automatically convert to Int

#### String
- **Semantic mapping**: Vibefun `String` values map to JavaScript `string` type
- **Encoding**: Strings use JavaScript's native string encoding (UTF-16)
- **Immutability**: String values must be immutable
- **Length semantics**: `String.length` returns the number of UTF-16 code units (matching JavaScript behavior)

#### Bool
- **Semantic mapping**: Vibefun `Bool` values map to JavaScript `boolean` type
- **Values**: Only `true` and `false` are valid Bool values
- **Truthiness**: Vibefun Bools must not participate in JavaScript truthiness coercion in generated code

#### Unit
- **Semantic mapping**: Vibefun `Unit` (`()`) has implementation-defined representation
- **Common representations**: May be represented as `undefined`, `null`, or any other JavaScript value
- **Equality**: All Unit values must be considered equal
- **Usage**: Typically used for functions called only for side effects

### Record Types

Records are structural types with named fields.

#### Structural Typing
- **Field access**: Records must support field access by name with correct type
- **Field presence**: Accessing a field that exists at compile time must succeed at runtime
- **Extra fields**: Records may contain additional fields beyond those in the type (width subtyping)
- **Field order**: Field order is not significant for type equality or runtime behavior

#### Field Operations
- **Immutability**: Record values are immutable - field updates create new records
- **Update semantics**: Record update `{ ...r, field: value }` creates a new record with updated field
- **Spread semantics**: Spread operators must preserve all fields and evaluate left-to-right

#### Common Representations
- **Plain objects**: Records typically map to plain JavaScript objects
- **Field names**: Record field names map directly to JavaScript property names (with escaping if needed)
- **Freezing**: Records may optionally be frozen (`Object.freeze`) to enforce immutability

### Variant Types (Algebraic Data Types)

Variants are nominal sum types with named constructors.

#### Constructor Identity
- **Tag preservation**: Each variant constructor must have a distinct, preserved identity at runtime
- **Type distinction**: Values of different variant types must be distinguishable
- **Constructor distinction**: Values of the same type but different constructors must be distinguishable

#### Constructor Arguments
- **Arity preservation**: Constructor arity (number of arguments) must be preserved
- **Argument access**: Pattern matching must be able to extract constructor arguments by position
- **Immutability**: Variant values are immutable

#### Pattern Matching Support
- **Exhaustiveness**: Generated code must support exhaustive pattern matching
- **Constructor testing**: Must be possible to determine which constructor created a value
- **Argument extraction**: Must be possible to extract constructor arguments in order

#### Common Representations
Variants may be represented using various JavaScript patterns, such as:
- Tagged objects: `{ tag: "Some", value: x }`
- Constructor functions with instanceof checks
- Symbol-based tagging schemes
- Other representations that preserve constructor identity

The specific representation is an implementation detail.

### List Types

Lists are immutable linked lists as defined in the standard library.

#### List Structure
- **Cons cells**: Lists are built from cons cells (head/tail pairs) and an empty list
- **Immutability**: List values are immutable - operations create new lists
- **Structural sharing**: Implementations should share structure for efficiency (e.g., `tail` returns same list)

#### Pattern Matching Support
- **Empty list test**: Must be able to test if a list is empty
- **Head/tail extraction**: Must be able to extract head and tail from non-empty lists
- **Type safety**: Pattern matching must preserve type safety of list elements

#### Common Representations
- Linked list structures with `{ head, tail }` pairs
- Arrays (with appropriate immutability guarantees)
- Persistent data structure libraries
- Other representations that provide correct semantics

The specific representation is an implementation detail.

### Tuple Types

Tuples are immutable, fixed-arity product types.

#### Arity Preservation
- **Fixed size**: Tuple arity is fixed and known at compile time
- **Element access**: Elements must be accessible by position (0-indexed)
- **Immutability**: Tuple values are immutable

#### Type Safety
- **Position types**: Each position has a specific type preserved at compile time
- **Arity checking**: Tuple destructuring must validate arity at compile time

#### Common Representations
- Arrays with fixed length: `[a, b, c]`
- Plain objects with numeric keys: `{ 0: a, 1: b, 2: c }`
- Other representations that preserve arity and element access

The specific representation is an implementation detail.

### Mutable References (Ref<T>)

References provide mutable cells with controlled mutation.

#### Mutation Semantics
- **Boxing**: Ref values must box their contents to enable mutation
- **Identity**: Each `mut` creates a distinct reference with unique identity
- **Aliasing**: Multiple variables can reference the same mutable cell

#### Operations
- **Creation (`mut`)**: Creates a new mutable reference with initial value
- **Dereference (`!r`)**: Reads the current value from reference
- **Assignment (`r := value`)**: Updates the value in the reference
- **Sharing**: References can be shared (multiple variables refer to same cell)

#### Common Representations
- Objects with value property: `{ value: x }`
- Arrays with single element: `[x]`
- ES6 WeakMap or other indirection mechanisms
- Other representations that provide mutable cell semantics

The specific representation is an implementation detail.

---

## Function Compilation

This section specifies the behavioral guarantees for how functions are compiled and called.

### Currying Semantics

All multi-parameter functions support automatic currying and partial application.

#### Partial Application
- **Underapplication**: Calling a function with fewer arguments than parameters returns a new function expecting remaining arguments
- **Full application**: Calling with exact number of arguments evaluates the function body
- **Overapplication**: Not allowed - compile-time error

**Example behavior:**
```vibefun
let add = (x, y) => x + y;

// Partial application
let add5 = add(5);  // Returns function waiting for y
let result = add5(3);  // Returns 8

// Full application
let result = add(5, 3);  // Returns 8 directly
```

#### Evaluation Guarantee
- **Lazy evaluation**: Partial application does not evaluate the function body
- **Argument capture**: Partially applied arguments are captured and available when function body executes
- **Evaluation timing**: Function body evaluates only when all arguments are provided

### Calling Conventions

#### Arity Checking
- **Compile-time arity**: Function arity is known at compile time for all Vibefun functions
- **Type checking**: Type system ensures calls have correct arity
- **External functions**: External (JavaScript) functions may have runtime arity checking

#### Argument Evaluation Order
- **Left-to-right**: Function arguments are evaluated left-to-right before the function is called
- **Side effects**: Side effects in arguments occur in left-to-right order
- **No lazy evaluation**: All arguments are fully evaluated before function execution (except in partial application)

**Example:**
```vibefun
// Arguments evaluated left-to-right
let result = f(g(), h(), i());
// Evaluation order: g(), then h(), then i(), then f()
```

### Closure Capture

#### Variable Capture
- **Lexical scope**: Functions capture variables from their lexical scope
- **Capture timing**: Variables are captured when the function is created
- **Mutable references**: Captured `Ref<T>` values share identity with outer scope

**Example:**
```vibefun
let makeCounter = () => {
  mut count = 0;
  () => {
    count := !count + 1;
    !count;
  }
}

let counter1 = makeCounter();  // counter1 captures its own count reference
let counter2 = makeCounter();  // counter2 captures a different count reference
```

#### Capture Semantics
- **Immutable values**: Captured immutable values remain immutable
- **References**: Captured `Ref<T>` values maintain their mutable identity
- **Scope preservation**: Captured variables outlive their lexical scope if closure exists

### Recursive Functions

#### `let rec` Semantics
- **Self-reference**: Function can reference itself by name in its own body
- **Mutual recursion**: `let rec f = ... and g = ...` creates mutually recursive functions
- **Initialization**: Recursive bindings are initialized before function bodies execute

**Example:**
```vibefun
let rec factorial = (n) =>
  if n <= 1 then 1;
  else n * factorial(n - 1);
```

#### Mutual Recursion
- **Simultaneous binding**: All functions in a `let rec ... and ...` group are bound simultaneously
- **Cross-reference**: Each function can reference others in the group
- **Type checking**: Type inference works across the entire recursive group

---

## Pattern Matching Compilation

This section specifies the behavioral guarantees for compiled pattern matching.

### Match Expression Semantics

#### Evaluation Order
- **Top-to-bottom**: Patterns are tested in source code order (top to bottom)
- **First match**: The first pattern that matches is selected
- **Short-circuit**: Once a pattern matches, subsequent patterns are not tested
- **Scrutinee once**: The match scrutinee is evaluated exactly once before pattern testing

#### Exhaustiveness Guarantee
- **Compile-time checking**: Non-exhaustive matches are compile-time errors
- **Runtime behavior**: For exhaustive matches, one branch is guaranteed to execute
- **Type safety**: Match branches must have the same type

### Pattern Binding

#### Variable Binding
- **Scope**: Pattern-bound variables are scoped to their match branch
- **Immutability**: Pattern-bound variables are immutable (unless `mut` is used)
- **Shadowing**: Pattern variables may shadow outer scope variables

#### Destructuring
- **Nested patterns**: Nested destructuring binds variables at all levels
- **Order**: Nested pattern matching proceeds depth-first, left-to-right
- **Type preservation**: Each bound variable has correct type from pattern

### Guard Evaluation

#### Guard Semantics
- **Evaluation timing**: Guards are evaluated after pattern match succeeds, before branch executes
- **Boolean result**: Guards must evaluate to boolean values
- **Fallthrough**: If guard fails, matching continues with next pattern
- **Side effects**: Guards may have side effects (but this is discouraged)

**Example:**
```vibefun
match x {
  | Some(n) when n > 0 => "positive"  // Guard tested after Some matches
  | Some(n) => "non-positive"         // Tried if guard fails
  | None => "none"
}
```

#### Guard Order
- **Pattern then guard**: Pattern is tested before guard
- **Guard failure**: Failed guard moves to next pattern (not an error)

### Unreachable Patterns

#### Detection
- **Compile-time warning**: Unreachable patterns generate compile-time warnings
- **Execution**: Unreachable patterns are never executed (but may be compiled)

---

## Name Resolution

This section specifies how Vibefun identifiers map to JavaScript identifiers.

### Identifier Mapping

#### Valid Identifiers
- **JavaScript compatibility**: Vibefun identifiers that are valid JavaScript identifiers map directly
- **Reserved words**: JavaScript reserved words must be escaped or mangled
- **Unicode**: Unicode identifiers are preserved if valid in JavaScript

#### Collision Avoidance
- **Local variables**: Local variable names must not collide with generated names
- **Mangling**: Compiler-generated names should use patterns unlikely to collide (e.g., `$` prefix)
- **Modules**: Module-level names must be unique within their module

### Module Names

#### Module Mapping
- **File to module**: Each `.vf` file becomes a JavaScript module (typically ES6 module)
- **Export mapping**: Vibefun exports map to JavaScript exports
- **Import mapping**: Vibefun imports map to JavaScript imports

#### Path Resolution
- **Relative imports**: Relative paths in Vibefun map to relative paths in JavaScript
- **Module resolution**: Follows Node.js module resolution or ES6 module resolution

### Constructor Names

#### Variant Constructors
- **Namespace**: Constructors are namespaced to avoid collisions
- **Access**: Pattern matching code must be able to access constructor identity
- **Disambiguation**: Constructors from different types with same name must be distinguishable

**Example:**
```vibefun
type Option<T> = Some(T) | None;
type Result<T, E> = Ok(T) | Error(E);

// "None" and "Error" must be distinguishable from other constructors
```

### Reserved Names

#### Compiler Reserved
- **Implementation details**: Compiler may reserve certain name patterns for internal use
- **User code**: User code should avoid patterns like `$$`, `__vibefun__`, etc.
- **Standard library**: Standard library names are reserved

---

## Implementation Notes

### Optimization

Compilers may apply optimizations that preserve semantics:
- **Constant folding**: Compile-time evaluation of constant expressions
- **Dead code elimination**: Removal of unreachable code
- **Inlining**: Function inlining (preserving evaluation order)
- **Tail call optimization**: Where supported by JavaScript runtime

### Debugging

Generated code should support debugging:
- **Readable output**: Use meaningful variable names where possible
- **Source maps**: Map generated code to original source locations
- **Stack traces**: Preserve function names in stack traces

### Performance

Generated code should be reasonably efficient:
- **Avoid unnecessary allocations**: Reuse immutable structures where safe
- **Minimize indirection**: Reduce unnecessary function call overhead
- **Native operations**: Use JavaScript native operations where applicable (e.g., arithmetic)

These are goals, not guarantees. Specific performance characteristics are implementation-defined.

