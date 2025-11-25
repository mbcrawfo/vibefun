# Type Error Catalog

This document provides a complete reference for all Vibefun type error codes. Each error includes its code, message template, common causes, and how to fix it.

Use `vibefun --explain VF0001` to view detailed documentation for any error code.

## Error Code Ranges

| Range | Category | Description |
|-------|----------|-------------|
| VF0001-VF0049 | Type Mismatch | Unification failures, type conflicts |
| VF0050-VF0069 | Undefined References | Variables, types, constructors not found |
| VF0070-VF0089 | Arity Errors | Wrong number of arguments |
| VF0090-VF0099 | Infinite Types | Occurs check failures |
| VF0100-VF0149 | Pattern Errors | Exhaustiveness, unreachable patterns |
| VF0150-VF0169 | Record Errors | Missing fields, invalid access |
| VF0170-VF0189 | Variant Errors | Constructor issues |
| VF0190-VF0209 | Polymorphism Errors | Value restriction, type escape |
| VF0210-VF0229 | Module Errors | Import/export issues |
| VF0230-VF0249 | External/FFI Errors | JavaScript interop issues |

---

## Type Mismatch Errors (VF0001-VF0049)

### VF0001: TypeMismatch

**Message:** `Type mismatch: expected {expected}, got {actual}`

**Cause:** The inferred type doesn't match the expected type.

**Example:**
```vibefun
let x: Int = "hello"  // VF0001: expected Int, got String
```

**Fix:** Ensure the value matches the expected type, or adjust the type annotation.

---

### VF0002: TypeMismatchInApplication

**Message:** `Argument type mismatch: expected {expected}, got {actual}`

**Hint:** Check the function signature

**Cause:** A function argument has the wrong type.

**Example:**
```vibefun
let add = (x: Int, y: Int) -> Int = x + y
add("hello", 5)  // VF0002: expected Int, got String
```

**Fix:** Pass an argument of the correct type.

---

### VF0003: TypeMismatchInReturn

**Message:** `Return type {actual} does not match declared type {expected}`

**Cause:** Function returns a different type than declared.

**Example:**
```vibefun
let greet = (name: String) -> Int = "Hello, " ++ name
// VF0003: Return type String does not match declared type Int
```

**Fix:** Either fix the return expression or update the return type annotation.

---

### VF0004: TypeMismatchInBranches

**Message:** `Match branches have different types: {type1} vs {type2}`

**Hint:** All branches must return the same type

**Cause:** Different match arms return different types.

**Example:**
```vibefun
match x {
  | Some(n) -> n        // Int
  | None -> "default"   // String - VF0004
}
```

**Fix:** Ensure all branches return the same type.

---

### VF0005: TypeMismatchInIfBranches

**Message:** `If branches have different types: {thenType} vs {elseType}`

**Hint:** Both branches must have the same type

**Cause:** The `then` and `else` branches of an if expression have different types.

**Example:**
```vibefun
let result = if x > 0 then 42 else "negative"
// VF0005: If branches have different types: Int vs String
```

**Fix:** Make both branches return the same type.

---

### VF0006: TypeMismatchInListElements

**Message:** `List element type mismatch: {type1} vs {type2}`

**Hint:** All list elements must have the same type

**Cause:** List contains elements of different types.

**Example:**
```vibefun
let mixed = [1, "two", 3]  // VF0006: Int vs String
```

**Fix:** Ensure all list elements have the same type.

---

### VF0007: TypeMismatchInTupleElement

**Message:** `Tuple element {index}: expected {expected}, got {actual}`

**Cause:** Tuple element has wrong type at specific position.

**Example:**
```vibefun
let point: (Int, Int) = (1, "two")
// VF0007: Tuple element 2: expected Int, got String
```

**Fix:** Provide correct type for each tuple position.

---

### VF0008: TypeMismatchInRecordField

**Message:** `Field '{field}': expected {expected}, got {actual}`

**Cause:** Record field has wrong type.

**Example:**
```vibefun
type Person = { name: String, age: Int }
let p: Person = { name: "Alice", age: "thirty" }
// VF0008: Field 'age': expected Int, got String
```

**Fix:** Provide correct type for the field.

---

### VF0009: NumericTypeMismatch

**Message:** `Cannot mix Int and Float: expected {expected}, got {actual}`

**Hint:** Use Float.fromInt() or Int.fromFloat() for conversion

**Cause:** Mixing Int and Float without explicit conversion.

**Example:**
```vibefun
let result = 42 + 3.14  // VF0009: Cannot mix Int and Float
```

**Fix:** Use explicit conversion:
```vibefun
let result = Float.fromInt(42) + 3.14  // OK
```

---

### VF0010: OperatorTypeMismatch

**Message:** `Operator '{op}' requires {expected}, got {actual}`

**Cause:** Operand has wrong type for operator.

**Example:**
```vibefun
let x = "hello" - "world"  // VF0010: Operator '-' requires Int, got String
```

**Fix:** Use appropriate types for the operator, or use a different operator.

---

### VF0011: GuardTypeMismatch

**Message:** `Guard must be Bool, got {actual}`

**Cause:** Pattern guard expression is not a boolean.

**Example:**
```vibefun
match x {
  | n if n -> "positive"  // VF0011: Guard must be Bool, got Int
  | _ -> "other"
}
```

**Fix:** Ensure guard expression returns Bool:
```vibefun
match x {
  | n if n > 0 -> "positive"  // OK
  | _ -> "other"
}
```

---

### VF0012: AnnotationMismatch

**Message:** `Type annotation {expected} does not match inferred type {actual}`

**Cause:** Explicit type annotation conflicts with inferred type.

**Example:**
```vibefun
let double: (String) -> String = (x: Int) -> Int = x * 2
// VF0012: Type annotation (String) -> String does not match inferred type (Int) -> Int
```

**Fix:** Either fix the annotation or fix the implementation.

---

### VF0013: NotAFunction

**Message:** `Cannot call non-function type {actual}`

**Cause:** Attempting to call a value that is not a function.

**Example:**
```vibefun
let x = 42
let y = x(10)  // VF0013: Cannot call non-function type Int
```

**Fix:** Ensure you're calling a function.

---

### VF0014: NotARecord

**Message:** `Cannot access field on non-record type {actual}`

**Cause:** Using dot notation on a non-record type.

**Example:**
```vibefun
let x = 42
let y = x.value  // VF0014: Cannot access field on non-record type Int
```

**Fix:** Ensure you're accessing a field on a record.

---

### VF0015: NotARef

**Message:** `Cannot dereference non-Ref type {actual}`

**Cause:** Using dereference operator on non-reference type.

**Example:**
```vibefun
let x = 42
let y = !x  // VF0015: Cannot dereference non-Ref type Int
```

**Fix:** Ensure you're dereferencing a Ref<T>.

---

### VF0016: RefAssignmentMismatch

**Message:** `Cannot assign {actual} to Ref<{expected}>`

**Cause:** Assigning wrong type to a mutable reference.

**Example:**
```vibefun
let mut r = ref(42)
r := "hello"  // VF0016: Cannot assign String to Ref<Int>
```

**Fix:** Assign a value of the correct type.

---

## Undefined Reference Errors (VF0050-VF0069)

### VF0050: UndefinedVariable

**Message:** `Undefined variable '{name}'`

**Hint:** Did you mean: {suggestions}?

**Cause:** Variable is not defined in the current scope.

**Example:**
```vibefun
let y = foo + 1  // VF0050: Undefined variable 'foo'
```

**Fix:** Define the variable before use, or fix the spelling.

---

### VF0051: UndefinedType

**Message:** `Undefined type '{name}'`

**Hint:** Did you mean: {suggestions}?

**Cause:** Type is not defined or imported.

**Example:**
```vibefun
let x: Stringg = "hello"  // VF0051: Undefined type 'Stringg'
```

**Fix:** Use correct type name or define/import the type.

---

### VF0052: UndefinedConstructor

**Message:** `Undefined constructor '{name}'`

**Hint:** Did you mean: {suggestions}?

**Cause:** Variant constructor is not defined.

**Example:**
```vibefun
let x = Somee(42)  // VF0052: Undefined constructor 'Somee'
```

**Fix:** Use correct constructor name.

---

### VF0053: UndefinedField

**Message:** `Field '{field}' not found on type {recordType}`

**Hint:** Did you mean: {suggestions}?

**Cause:** Accessing non-existent field on record.

**Example:**
```vibefun
type Point = { x: Int, y: Int }
let p = { x: 1, y: 2 }
let z = p.z  // VF0053: Field 'z' not found on type { x: Int, y: Int }
```

**Fix:** Use correct field name or add the field to the type.

---

### VF0054: UndefinedModule

**Message:** `Cannot find module '{path}'`

**Cause:** Imported module does not exist.

**Example:**
```vibefun
import { foo } from "./nonexistent.vf"  // VF0054
```

**Fix:** Check the module path and ensure the file exists.

---

### VF0055: UndefinedExport

**Message:** `'{name}' is not exported from module '{module}'`

**Cause:** Importing a name that the module doesn't export.

**Example:**
```vibefun
import { privateHelper } from "./utils.vf"  // VF0055
```

**Fix:** Only import exported names, or add export to the source module.

---

## Arity Errors (VF0070-VF0089)

### VF0070: WrongArgumentCount

**Message:** `Expected {expected} argument(s), got {actual}`

**Cause:** Function called with wrong number of arguments.

**Example:**
```vibefun
let add = (x: Int, y: Int) -> Int = x + y
add(1, 2, 3)  // VF0070: Expected 2 argument(s), got 3
```

**Fix:** Provide correct number of arguments.

---

### VF0071: ConstructorArity

**Message:** `Constructor '{name}' expects {expected} argument(s), got {actual}`

**Cause:** Variant constructor called with wrong number of arguments.

**Example:**
```vibefun
type Result<T, E> = Ok(T) | Err(E)
let x = Ok(1, 2)  // VF0071: Constructor 'Ok' expects 1 argument(s), got 2
```

**Fix:** Provide correct number of arguments to constructor.

---

### VF0072: TupleArity

**Message:** `Expected {expected}-tuple, got {actual}-tuple`

**Cause:** Tuple has wrong number of elements.

**Example:**
```vibefun
let (a, b) = (1, 2, 3)  // VF0072: Expected 2-tuple, got 3-tuple
```

**Fix:** Match tuple arity in patterns and expressions.

---

### VF0073: TypeArgumentCount

**Message:** `Type '{name}' expects {expected} type argument(s), got {actual}`

**Cause:** Generic type instantiated with wrong number of type arguments.

**Example:**
```vibefun
type Pair<A, B> = { first: A, second: B }
let x: Pair<Int> = { first: 1, second: 2 }
// VF0073: Type 'Pair' expects 2 type argument(s), got 1
```

**Fix:** Provide correct number of type arguments.

---

### VF0074: TooManyArguments

**Message:** `Too many arguments: function expects {expected}`

**Cause:** Applying more arguments than a curried function accepts.

**Example:**
```vibefun
let f = (x: Int) -> Int = x + 1
f(1)(2)  // VF0074: Too many arguments: function expects 1
```

**Fix:** Don't over-apply curried functions.

---

### VF0075: NoMatchingOverload

**Message:** `No overload of '{name}' matches {actual} argument(s)`

**Hint:** Available: {overloads}

**Cause:** Built-in function called with unsupported argument types.

**Example:**
```vibefun
let x = abs("hello")  // VF0075: No overload of 'abs' matches String
```

**Fix:** Use correct argument types for the function.

---

## Infinite Type Errors (VF0090-VF0099)

### VF0090: InfiniteType

**Message:** `Cannot construct infinite type: '{typeVar}' occurs in '{type}'`

**Hint:** Consider adding a type annotation

**Cause:** Type inference found a self-referential type (occurs check failure).

**Example:**
```vibefun
let f = (x) => x(x)  // VF0090: Cannot construct infinite type
```

**Fix:** Add type annotations or restructure code to avoid infinite types.

---

### VF0091: RecursiveAlias

**Message:** `Type alias '{name}' is recursive`

**Hint:** Use a variant type for recursive definitions

**Cause:** Type alias refers to itself directly.

**Example:**
```vibefun
type Node = { value: Int, next: Node }  // VF0091: Type alias 'Node' is recursive
```

**Fix:** Use a variant type:
```vibefun
type Node =
  | Nil
  | Cons(Int, Node)  // OK - guarded by constructor
```

---

## Pattern Matching Errors (VF0100-VF0149)

### VF0100: NonExhaustiveMatch

**Message:** `Non-exhaustive pattern match`

**Hint:** Missing: {missingCases}

**Cause:** Pattern match doesn't cover all possible values.

**Example:**
```vibefun
type Color = Red | Green | Blue
match color {
  | Red -> "red"
  | Green -> "green"
  // VF0100: Non-exhaustive pattern match. Missing: Blue
}
```

**Fix:** Add missing patterns:
```vibefun
match color {
  | Red -> "red"
  | Green -> "green"
  | Blue -> "blue"  // Added
}
```

---

### VF0101: NonExhaustiveInfinite

**Message:** `Pattern match on '{type}' is non-exhaustive`

**Hint:** Add wildcard '_' for remaining cases

**Cause:** Pattern match on infinite type (Int, String) without wildcard.

**Example:**
```vibefun
match n {
  | 0 -> "zero"
  | 1 -> "one"
  // VF0101: Pattern match on 'Int' is non-exhaustive
}
```

**Fix:** Add a wildcard pattern:
```vibefun
match n {
  | 0 -> "zero"
  | 1 -> "one"
  | _ -> "other"  // Added
}
```

---

### VF0102: UnreachablePattern

**Message:** `Unreachable pattern`

**Hint:** Shadowed by previous patterns

**Severity:** Warning

**Cause:** A pattern can never match because previous patterns cover all cases.

**Example:**
```vibefun
match x {
  | _ -> "anything"
  | Some(n) -> "some"  // VF0102: Unreachable pattern
}
```

**Fix:** Remove unreachable pattern or reorder patterns.

---

### VF0103: PatternTypeMismatch

**Message:** `Pattern type {patternType} incompatible with {scrutineeType}`

**Cause:** Pattern has wrong type for the value being matched.

**Example:**
```vibefun
let x: Option<Int> = Some(42)
match x {
  | Ok(n) -> n  // VF0103: Pattern type Result incompatible with Option
  | _ -> 0
}
```

**Fix:** Use patterns matching the scrutinee type.

---

### VF0104: DuplicateBinding

**Message:** `Variable '{name}' bound multiple times in pattern`

**Cause:** Same variable name used twice in one pattern.

**Example:**
```vibefun
match point {
  | (x, x) -> x  // VF0104: Variable 'x' bound multiple times
}
```

**Fix:** Use unique variable names:
```vibefun
match point {
  | (x, y) -> x + y
}
```

---

### VF0105: OrPatternMismatch

**Message:** `Or-pattern alternatives must bind the same variables`

**Cause:** Different branches of or-pattern bind different variables.

**Example:**
```vibefun
match x {
  | Some(a) | None -> a  // VF0105: 'a' not bound in all alternatives
}
```

**Fix:** Ensure all alternatives bind the same variables:
```vibefun
match x {
  | Some(a) | Some(b) -> a  // Or restructure
}
```

---

### VF0106: InvalidGuard

**Message:** `Guard must return Bool, got {actual}`

**Cause:** Pattern guard doesn't return a boolean.

**Example:**
```vibefun
match x {
  | n if n -> "yes"  // VF0106: Guard must return Bool, got Int
}
```

**Fix:** Make guard return Bool:
```vibefun
match x {
  | n if n > 0 -> "yes"
}
```

---

## Record Errors (VF0150-VF0169)

### VF0150: MissingField

**Message:** `Missing required field '{field}'`

**Cause:** Record literal missing a required field.

**Example:**
```vibefun
type Person = { name: String, age: Int }
let p: Person = { name: "Alice" }  // VF0150: Missing required field 'age'
```

**Fix:** Provide all required fields:
```vibefun
let p: Person = { name: "Alice", age: 30 }
```

---

### VF0151: DuplicateField

**Message:** `Duplicate field '{field}'`

**Cause:** Field specified more than once in record.

**Example:**
```vibefun
let p = { name: "Alice", name: "Bob" }  // VF0151: Duplicate field 'name'
```

**Fix:** Remove duplicate field.

---

### VF0152: FieldTypeMismatch

**Message:** `Field '{field}': expected {expected}, got {actual}`

**Cause:** Record field has wrong type.

**Example:**
```vibefun
type Config = { port: Int }
let c: Config = { port: "8080" }  // VF0152: Field 'port': expected Int, got String
```

**Fix:** Provide correct type for field.

---

### VF0153: NonRecordAccess

**Message:** `Cannot access field on non-record type {type}`

**Cause:** Using dot notation on non-record type.

**Example:**
```vibefun
let x = 42
let y = x.field  // VF0153: Cannot access field on non-record type Int
```

**Fix:** Only access fields on records.

---

### VF0154: NonRecordUpdate

**Message:** `Cannot update non-record type {type}`

**Cause:** Using record update syntax on non-record.

**Example:**
```vibefun
let x = 42
let y = { ...x, field: 1 }  // VF0154: Cannot update non-record type Int
```

**Fix:** Only use record update on records.

---

## Variant Errors (VF0170-VF0189)

### VF0170: UnknownConstructor

**Message:** `Unknown constructor '{name}'`

**Hint:** Did you mean: {suggestions}?

**Cause:** Constructor not defined in any variant type.

**Example:**
```vibefun
let x = Somee(42)  // VF0170: Unknown constructor 'Somee'
```

**Fix:** Use correct constructor name: `Some(42)`

---

### VF0171: ConstructorArgMismatch

**Message:** `Constructor '{name}' expects {expected} argument(s), got {actual}`

**Cause:** Wrong number of arguments to variant constructor.

**Example:**
```vibefun
let x = Some(1, 2)  // VF0171: Constructor 'Some' expects 1 argument(s), got 2
```

**Fix:** Provide correct number of arguments.

---

### VF0172: VariantMismatch

**Message:** `Expected variant type {expected}, got {actual}`

**Cause:** Wrong variant type used.

**Example:**
```vibefun
let opt: Option<Int> = Ok(42)  // VF0172: Expected Option<Int>, got Result<Int, 'a>
```

**Fix:** Use correct variant type.

---

## Polymorphism Errors (VF0190-VF0209)

### VF0190: ValueRestriction

**Message:** `Cannot generalize '{name}': not a syntactic value`

**Hint:** Wrap in lambda: `(x) => {expr}(x)`, or add type annotation

**Cause:** Trying to generalize a non-syntactic value.

**Example:**
```vibefun
let id = identity(identity)  // VF0190: Cannot generalize, function application
```

**Fix:** Eta-expand to make it a syntactic value:
```vibefun
let id = <T>(x: T) -> T = identity(identity)(x)  // OK
```

---

### VF0191: TypeEscape

**Message:** `Type variable escapes its scope`

**Hint:** Add type annotation to prevent escape

**Cause:** Type variable from inner scope used in outer scope.

**Example:**
```vibefun
let escape = {
  let id = <T>(x: T) -> T = x
  id  // VF0191: Type variable escapes
}
```

**Fix:** Add type annotation to establish scope:
```vibefun
let escape: <T>(T) -> T = {
  let id = <T>(x: T) -> T = x
  id  // OK with annotation
}
```

---

### VF0192: PolymorphicRecursion

**Message:** `Recursive call uses different type instantiation`

**Hint:** All recursive calls must use the same types

**Cause:** Polymorphic recursion attempted (not supported).

**Example:**
```vibefun
let rec problematic = <T>(x: T) -> Int =
  1 + problematic("different type")  // VF0192
```

**Fix:** Ensure recursive calls use consistent types.

---

## Module Errors (VF0210-VF0229)

### VF0210: CircularImport

**Message:** `Circular dependency detected: {cycle}`

**Cause:** Modules import each other in a cycle.

**Example:**
```
a.vf imports b.vf
b.vf imports a.vf  // VF0210: Circular dependency: a.vf -> b.vf -> a.vf
```

**Fix:** Restructure to break the cycle, possibly using a shared module.

---

### VF0211: ModuleNotFound

**Message:** `Module '{path}' not found`

**Cause:** Imported file doesn't exist.

**Example:**
```vibefun
import { foo } from "./missing.vf"  // VF0211
```

**Fix:** Check the file path and ensure module exists.

---

### VF0212: ImportNotFound

**Message:** `'{name}' not exported from module '{module}'`

**Cause:** Importing name that isn't exported.

**Example:**
```vibefun
// In utils.vf: let helper = ...  (not exported)
import { helper } from "./utils.vf"  // VF0212
```

**Fix:** Export the name or use a different import.

---

### VF0213: DuplicateExport

**Message:** `'{name}' exported multiple times`

**Cause:** Same name exported more than once.

**Example:**
```vibefun
export let foo = 1
export let foo = 2  // VF0213: 'foo' exported multiple times
```

**Fix:** Use unique export names.

---

## External/FFI Errors (VF0230-VF0249)

### VF0230: ExternalTypeMismatch

**Message:** `External '{name}' type mismatch at runtime`

**Cause:** JavaScript value doesn't match declared type.

**Example:**
```vibefun
external console_log: (Int) -> Unit = "console.log"
console_log("hello")  // Runtime: works, but loses type safety
```

**Fix:** Ensure external declarations match actual JavaScript types.

---

### VF0231: UnsafeOutsideBlock

**Message:** `Unsafe operation requires unsafe block`

**Cause:** Using unsafe operation without unsafe block.

**Example:**
```vibefun
let x = jsValue.unsafeCoerce()  // VF0231
```

**Fix:** Wrap in unsafe block:
```vibefun
let x = unsafe { jsValue.unsafeCoerce() }
```

---

## Related Documentation

- [Error Reporting](./error-reporting.md) - Error format and recovery strategy
- [Type Inference](./type-inference.md) - How types are inferred
- [Pattern Matching](../05-pattern-matching/README.md) - Pattern syntax and exhaustiveness
