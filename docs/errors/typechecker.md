<!-- THIS FILE IS AUTO-GENERATED. DO NOT EDIT MANUALLY. -->
<!-- Run 'npm run docs:errors' to regenerate. -->


# Type Checker Errors

Errors during type checking and inference

## Overview

| Code | Name | Severity |
|------|------|----------|
| [VF4001](#vf4001) | TypeMismatch | **Error** |
| [VF4002](#vf4002) | ArgumentTypeMismatch | **Error** |
| [VF4003](#vf4003) | ReturnTypeMismatch | **Error** |
| [VF4004](#vf4004) | BranchTypeMismatch | **Error** |
| [VF4005](#vf4005) | IfBranchTypeMismatch | **Error** |
| [VF4006](#vf4006) | ListElementMismatch | **Error** |
| [VF4007](#vf4007) | TupleElementMismatch | **Error** |
| [VF4008](#vf4008) | RecordFieldMismatch | **Error** |
| [VF4009](#vf4009) | NumericTypeMismatch | **Error** |
| [VF4010](#vf4010) | OperatorTypeMismatch | **Error** |
| [VF4011](#vf4011) | GuardTypeMismatch | **Error** |
| [VF4012](#vf4012) | AnnotationMismatch | **Error** |
| [VF4013](#vf4013) | NotAFunction | **Error** |
| [VF4014](#vf4014) | NotARecord | **Error** |
| [VF4015](#vf4015) | NotARef | **Error** |
| [VF4016](#vf4016) | RefAssignmentMismatch | **Error** |
| [VF4017](#vf4017) | NotImplemented | **Error** |
| [VF4020](#vf4020) | CannotUnify | **Error** |
| [VF4021](#vf4021) | FunctionArityMismatch | **Error** |
| [VF4022](#vf4022) | TypeApplicationArityMismatch | **Error** |
| [VF4023](#vf4023) | UnionArityMismatch | **Error** |
| [VF4024](#vf4024) | IncompatibleTypes | **Error** |
| [VF4025](#vf4025) | VariantUnificationError | **Error** |
| [VF4026](#vf4026) | TupleArityMismatch | **Error** |
| [VF4100](#vf4100) | UndefinedVariable | **Error** |
| [VF4101](#vf4101) | UndefinedType | **Error** |
| [VF4102](#vf4102) | UndefinedConstructor | **Error** |
| [VF4103](#vf4103) | UndefinedField | **Error** |
| [VF4200](#vf4200) | ConstructorArity | **Error** |
| [VF4201](#vf4201) | NoMatchingOverload | **Error** |
| [VF4202](#vf4202) | WrongArgumentCount | **Error** |
| [VF4203](#vf4203) | TupleArity | **Error** |
| [VF4204](#vf4204) | TypeArgumentCount | **Error** |
| [VF4205](#vf4205) | AmbiguousOverload | **Error** |
| [VF4300](#vf4300) | InfiniteType | **Error** |
| [VF4301](#vf4301) | RecursiveAlias | **Error** |
| [VF4400](#vf4400) | NonExhaustiveMatch | **Error** |
| [VF4401](#vf4401) | InvalidGuard | **Error** |
| [VF4402](#vf4402) | DuplicateBinding | **Error** |
| [VF4403](#vf4403) | OrPatternBindingMismatch | **Error** |
| [VF4404](#vf4404) | EmptyMatch | **Error** |
| [VF4500](#vf4500) | NonRecordAccess | **Error** |
| [VF4501](#vf4501) | MissingRecordField | **Error** |
| [VF4502](#vf4502) | DuplicateRecordField | **Error** |
| [VF4600](#vf4600) | UnknownConstructor | **Error** |
| [VF4601](#vf4601) | ConstructorArgMismatch | **Error** |
| [VF4602](#vf4602) | VariantMismatch | **Error** |
| [VF4700](#vf4700) | ValueRestriction | **Error** |
| [VF4701](#vf4701) | TypeEscape | **Error** |
| [VF4800](#vf4800) | FFIError | **Error** |
| [VF4801](#vf4801) | FFIInconsistentName | **Error** |
| [VF4802](#vf4802) | FFIInconsistentImport | **Error** |
| [VF4803](#vf4803) | FFINotFunction | **Error** |
| [VF4804](#vf4804) | FFIOverloadNotSupported | **Error** |
| [VF4900](#vf4900) | UnreachablePattern | **Warning** |
| [VF5102](#vf5102) | DuplicateDeclaration | **Error** |

---

## VF4001

**TypeMismatch** **Error**

### Message

> Type mismatch: expected {expected}, got {actual}

### Explanation

The type of an expression does not match what was expected. This is a general type mismatch error that occurs when the inferred type differs from the expected type.

### Example

**Problem:**

```vibefun
let x: Int = "hello"
```

**Solution:**

```vibefun
let x: String = "hello"
```

*Changed type annotation to match the value*

### Hint

> Check that the expression has the expected type

### Related

[VF4002](typechecker.md#vf4002), [VF4003](typechecker.md#vf4003), [VF4004](typechecker.md#vf4004)


---

## VF4002

**ArgumentTypeMismatch** **Error**

### Message

> Argument type mismatch: expected {expected}, got {actual}

### Explanation

The type of an argument passed to a function does not match the expected parameter type. Make sure you're passing the correct type of value.

### Example

**Problem:**

```vibefun
let double = (x: Int) -> x * 2
let result = double("5")
```

**Solution:**

```vibefun
let double = (x: Int) -> x * 2
let result = double(5)
```

*Changed string argument to integer*

### Hint

> Check the argument type matches the function parameter

### Related

[VF4001](typechecker.md#vf4001), [VF4202](typechecker.md#vf4202)


---

## VF4003

**ReturnTypeMismatch** **Error**

### Message

> Return type mismatch: expected {expected}, got {actual}

### Explanation

The type of the value returned by a function does not match its declared return type. Either change the return type annotation or the returned value.

### Example

**Problem:**

```vibefun
let greet = (name: String): Int -> "Hello, " + name
```

**Solution:**

```vibefun
let greet = (name: String): String -> "Hello, " + name
```

*Changed return type from Int to String*

### Hint

> Check the function body returns the declared type

### Related

[VF4001](typechecker.md#vf4001), [VF4004](typechecker.md#vf4004)


---

## VF4004

**BranchTypeMismatch** **Error**

### Message

> Branch type mismatch: expected {expected}, got {actual}

### Explanation

All branches of a match expression must return values of the same type. The type of the first branch determines the expected type for all other branches.

### Example

**Problem:**

```vibefun
match opt with
| Some(x) -> x
| None -> "nothing"
```

**Solution:**

```vibefun
match opt with
| Some(x) -> x
| None -> 0
```

*Changed None branch to return Int instead of String*

### Hint

> All branches of a match expression must have the same type

### Related

[VF4001](typechecker.md#vf4001), [VF4005](typechecker.md#vf4005)


---

## VF4005

**IfBranchTypeMismatch** **Error**

### Message

> If branches have different types: then-branch has {thenType}, else-branch has {elseType}

### Explanation

The then-branch and else-branch of an if expression must have the same type. If you want different types, consider using Option or a variant type.

### Example

**Problem:**

```vibefun
if condition then 42 else "hello"
```

**Solution:**

```vibefun
if condition then "42" else "hello"
```

*Changed then-branch to return String*

### Hint

> Both branches of an if expression must have the same type

### Related

[VF4004](typechecker.md#vf4004)


---

## VF4006

**ListElementMismatch** **Error**

### Message

> List element type mismatch: expected {expected}, got {actual}

### Explanation

All elements in a list must have the same type. The type of the first element determines the expected type for all subsequent elements.

### Example

**Problem:**

```vibefun
[1, 2, "three"]
```

**Solution:**

```vibefun
[1, 2, 3]
```

*Changed "three" to 3*

### Hint

> All list elements must have the same type

### Related

[VF4001](typechecker.md#vf4001), [VF4007](typechecker.md#vf4007)


---

## VF4007

**TupleElementMismatch** **Error**

### Message

> Tuple element {index}: expected {expected}, got {actual}

### Explanation

The type of a tuple element does not match the expected type at that position. Tuple types are ordered, so each position has a specific expected type.

### Example

**Problem:**

```vibefun
let pair: (Int, String) = (1, 2)
```

**Solution:**

```vibefun
let pair: (Int, String) = (1, "two")
```

*Changed second element to a String*

### Hint

> Check the type of the tuple element at the specified index

### Related

[VF4001](typechecker.md#vf4001), [VF4203](typechecker.md#vf4203)


---

## VF4008

**RecordFieldMismatch** **Error**

### Message

> Field '{field}': expected {expected}, got {actual}

### Explanation

The type of a record field does not match the expected type for that field. Record field types must match exactly.

### Example

**Problem:**

```vibefun
let point: { x: Int, y: Int } = { x: 1, y: "2" }
```

**Solution:**

```vibefun
let point: { x: Int, y: Int } = { x: 1, y: 2 }
```

*Changed y field from "2" to 2*

### Hint

> Check the type of the record field

### Related

[VF4001](typechecker.md#vf4001), [VF4501](typechecker.md#vf4501)


---

## VF4009

**NumericTypeMismatch** **Error**

### Message

> Numeric type mismatch: {message}

### Explanation

Int and Float are distinct types in Vibefun. You cannot use them interchangeably without explicit conversion. Use Int.toFloat or Float.toInt to convert between them.

### Example

**Problem:**

```vibefun
let x: Float = 42
```

**Solution:**

```vibefun
let x: Float = 42.0
```

*Used a Float literal instead of Int*

### Hint

> Int and Float are different types and cannot be mixed implicitly

### Related

[VF4001](typechecker.md#vf4001), [VF4010](typechecker.md#vf4010)


---

## VF4010

**OperatorTypeMismatch** **Error**

### Message

> Cannot apply operator '{op}' to types {left} and {right}

### Explanation

The operator cannot be applied to the given types. Each operator has specific type requirements - for example, + works on Int, Float, and String, but not on Bool.

### Example

**Problem:**

```vibefun
let result = 5 + "hello"
```

**Solution:**

```vibefun
let result = "5" + "hello"
```

*Converted 5 to a string to use string concatenation*

### Hint

> Check that the operator is valid for these types

### Related

[VF4001](typechecker.md#vf4001), [VF4009](typechecker.md#vf4009)


---

## VF4011

**GuardTypeMismatch** **Error**

### Message

> Guard must be Bool, got {actual}

### Explanation

Pattern guards (the `when` clause in match expressions) must evaluate to a Bool value. The guard expression determines whether the pattern branch is taken.

### Example

**Problem:**

```vibefun
match x with
| n when n -> n
```

**Solution:**

```vibefun
match x with
| n when n > 0 -> n
```

*Changed guard to a boolean comparison*

### Hint

> Pattern guards must evaluate to Bool

### Related

[VF4401](typechecker.md#vf4401)


---

## VF4012

**AnnotationMismatch** **Error**

### Message

> Type annotation {expected} does not match inferred type {actual}

### Explanation

The declared type annotation does not match what the type checker inferred from the expression. Either the annotation is wrong, or the expression needs to be changed.

### Example

**Problem:**

```vibefun
let x: List<Int> = []
```

**Solution:**

```vibefun
let x: List<Int> = []
// or
let x = ([] : List<Int>)
```

*Used explicit type annotation for empty list*

### Hint

> Either fix the type annotation or the expression

### Related

[VF4001](typechecker.md#vf4001)


---

## VF4013

**NotAFunction** **Error**

### Message

> Cannot call non-function type {actual}

### Explanation

You tried to call something that is not a function. Only values with function types can be called using the function call syntax `f(args)`.

### Example

**Problem:**

```vibefun
let x = 42
let result = x(5)
```

**Solution:**

```vibefun
let x = (n: Int) -> n * 2
let result = x(5)
```

*Changed x to be a function*

### Hint

> Only functions can be called with arguments

### Related

[VF4100](typechecker.md#vf4100), [VF4202](typechecker.md#vf4202)


---

## VF4014

**NotARecord** **Error**

### Message

> Cannot access field on non-record type {actual}

### Explanation

You tried to access a field on a value that is not a record. Field access syntax (.fieldName) only works on record types.

### Example

**Problem:**

```vibefun
let x = 42
let y = x.value
```

**Solution:**

```vibefun
let x = { value: 42 }
let y = x.value
```

*Changed x to be a record with a value field*

### Hint

> Only records have fields that can be accessed with .field syntax

### Related

[VF4500](typechecker.md#vf4500), [VF4501](typechecker.md#vf4501)


---

## VF4015

**NotARef** **Error**

### Message

> Cannot dereference non-Ref type {actual}

### Explanation

You tried to dereference or assign to a value that is not a Ref. Only mutable references (created with ref) can use the dereference (!) and assignment (:=) operators.

### Example

**Problem:**

```vibefun
let x = 42
let y = !x
```

**Solution:**

```vibefun
let x = ref(42)
let y = !x
```

*Changed x to be a Ref*

### Hint

> Only Ref values can be dereferenced with ! or assigned with :=

### Related

[VF4016](typechecker.md#vf4016)


---

## VF4016

**RefAssignmentMismatch** **Error**

### Message

> Cannot assign {actual} to Ref<{expected}>

### Explanation

You tried to assign a value to a Ref, but the value's type does not match the Ref's inner type. The assigned value must have exactly the same type.

### Example

**Problem:**

```vibefun
let x = ref(42)
x := "hello"
```

**Solution:**

```vibefun
let x = ref(42)
x := 100
```

*Assigned an Int instead of a String*

### Hint

> The assigned value must match the Ref's inner type

### Related

[VF4015](typechecker.md#vf4015)


---

## VF4017

**NotImplemented** **Error**

### Message

> {feature} not yet implemented

### Explanation

This feature has not yet been implemented in the type checker. It may be added in a future release of Vibefun.

### Example

**Problem:**

```vibefun
let (a, b) = expr  // pattern matching in let bindings
```

**Solution:**

```vibefun
match expr with
| (a, b) -> ...
```

*Used match expression instead*

### Hint

> {hint}


---

## VF4020

**CannotUnify** **Error**

### Message

> Cannot unify {t1} with {t2}

### Explanation

Type unification failed because the two types have incompatible structures. This typically means you're trying to use a value of one type where another is expected.

### Example

**Problem:**

```vibefun
let f = (x: Int) -> x
let y = f(true)
```

**Solution:**

```vibefun
let f = (x: Bool) -> x
let y = f(true)
```

*Changed function parameter type to Bool*

### Hint

> These types are fundamentally incompatible

### Related

[VF4001](typechecker.md#vf4001), [VF4021](typechecker.md#vf4021)


---

## VF4021

**FunctionArityMismatch** **Error**

### Message

> Cannot unify functions with different arity: {arity1} vs {arity2}

### Explanation

Two function types cannot be unified because they have different numbers of parameters. For example, a function taking 2 arguments cannot unify with one taking 3.

### Example

**Problem:**

```vibefun
let f: (Int, Int) -> Int = (x: Int) -> x
```

**Solution:**

```vibefun
let f: (Int, Int) -> Int = (x: Int, y: Int) -> x + y
```

*Changed function to take 2 parameters*

### Hint

> Functions must have the same number of parameters to unify

### Related

[VF4020](typechecker.md#vf4020), [VF4202](typechecker.md#vf4202)


---

## VF4022

**TypeApplicationArityMismatch** **Error**

### Message

> Cannot unify type applications with different arity

### Explanation

Two type applications cannot be unified because they have different numbers of type arguments. For example, `List<Int>` and `Result<Int, String>` have different arities.

### Example

**Problem:**

```vibefun
let x: List<Int> = Result.Ok(42)
```

**Solution:**

```vibefun
let x: Result<Int, String> = Result.Ok(42)
```

*Changed type to Result with correct arity*

### Hint

> Type constructors must have the same number of type arguments

### Related

[VF4020](typechecker.md#vf4020), [VF4204](typechecker.md#vf4204)


---

## VF4023

**UnionArityMismatch** **Error**

### Message

> Cannot unify unions with different number of types

### Explanation

Two union types cannot be unified because they have different numbers of member types. Union types must have exactly the same structure to be compatible.

### Example

**Problem:**

```vibefun
let x: Int | String = y  // where y: Int | String | Bool
```

**Solution:**

```vibefun
let x: Int | String | Bool = y
```

*Changed union type to include all members*

### Hint

> Union types must have the same number of member types

### Related

[VF4020](typechecker.md#vf4020)


---

## VF4024

**IncompatibleTypes** **Error**

### Message

> Cannot unify types: {type1} with {type2}

### Explanation

The types have fundamentally incompatible structures (e.g., trying to unify a function with a record). Check that you're using values of the correct type.

### Example

**Problem:**

```vibefun
let x: { a: Int } = (y: Int) -> y
```

**Solution:**

```vibefun
let x: { a: Int } = { a: 42 }
```

*Changed value from function to record*

### Hint

> These type kinds cannot be unified

### Related

[VF4020](typechecker.md#vf4020)


---

## VF4025

**VariantUnificationError** **Error**

### Message

> Cannot unify variant types: {message}

### Explanation

Two variant types cannot be unified because they have different constructors. Variant types use nominal typing - they must have exactly the same structure.

### Example

**Problem:**

```vibefun
type A = Foo | Bar
type B = Foo | Baz
let x: A = (y: B)
```

**Solution:**

```vibefun
type A = Foo | Bar
let x: A = Foo
```

*Use the same variant type*

### Hint

> Variant types must have exactly the same constructors

### Related

[VF4020](typechecker.md#vf4020), [VF4600](typechecker.md#vf4600)


---

## VF4026

**TupleArityMismatch** **Error**

### Message

> Cannot unify tuples: expected {expected}-tuple, got {actual}-tuple

### Explanation

Two tuple types cannot be unified because they have different numbers of elements. A 2-tuple is fundamentally different from a 3-tuple.

### Example

**Problem:**

```vibefun
let x: (Int, Int) = (1, 2, 3)
```

**Solution:**

```vibefun
let x: (Int, Int, Int) = (1, 2, 3)
```

*Changed type annotation to match 3-tuple*

### Hint

> Tuples must have the same number of elements

### Related

[VF4020](typechecker.md#vf4020), [VF4203](typechecker.md#vf4203)


---

## VF4100

**UndefinedVariable** **Error**

### Message

> Undefined variable '{name}'

### Explanation

The variable has not been defined in the current scope. This could be a typo, or the variable was defined in a different scope that is not accessible here.

### Example

**Problem:**

```vibefun
let y = x + 1
```

**Solution:**

```vibefun
let x = 5
let y = x + 1
```

*Defined x before using it*

### Hint

> Did you mean: {suggestions}?

### Related

[VF4101](typechecker.md#vf4101), [VF4102](typechecker.md#vf4102)


---

## VF4101

**UndefinedType** **Error**

### Message

> Undefined type '{name}'

### Explanation

The type has not been defined. This could be a typo, or you need to define the type or import it from another module.

### Example

**Problem:**

```vibefun
let x: MyTyp = ...
```

**Solution:**

```vibefun
type MyType = ...
let x: MyType = ...
```

*Defined the type before using it*

### Hint

> Check the type name spelling or import the type

### Related

[VF4100](typechecker.md#vf4100), [VF4102](typechecker.md#vf4102)


---

## VF4102

**UndefinedConstructor** **Error**

### Message

> Undefined constructor '{name}'

### Explanation

The constructor has not been defined. Constructors come from variant types and must be defined before use.

### Example

**Problem:**

```vibefun
let x = Sme(42)
```

**Solution:**

```vibefun
let x = Some(42)
```

*Fixed typo in constructor name*

### Hint

> Check the constructor name or define the variant type

### Related

[VF4100](typechecker.md#vf4100), [VF4600](typechecker.md#vf4600)


---

## VF4103

**UndefinedField** **Error**

### Message

> Field '{field}' does not exist on type {recordType}

### Explanation

The record does not have a field with this name. Check the spelling or the record type definition.

### Example

**Problem:**

```vibefun
let point = { x: 1, y: 2 }
let z = point.z
```

**Solution:**

```vibefun
let point = { x: 1, y: 2, z: 3 }
let z = point.z
```

*Added z field to the record*

### Hint

> Available fields: {availableFields}

### Related

[VF4500](typechecker.md#vf4500), [VF4501](typechecker.md#vf4501)


---

## VF4200

**ConstructorArity** **Error**

### Message

> Constructor '{name}' expects {expected} argument(s), got {actual}

### Explanation

The constructor was called with the wrong number of arguments. Check the variant type definition to see how many arguments the constructor expects.

### Example

**Problem:**

```vibefun
let x = Some(1, 2)  // Some takes 1 argument
```

**Solution:**

```vibefun
let x = Some(1)
```

*Removed extra argument*

### Hint

> Check the constructor definition for the correct number of arguments

### Related

[VF4202](typechecker.md#vf4202), [VF4600](typechecker.md#vf4600)


---

## VF4201

**NoMatchingOverload** **Error**

### Message

> No matching overload for '{name}' with {argCount} argument(s)

### Explanation

No overload of this function matches the provided arguments. Check that you're passing the correct number and types of arguments.

### Example

**Problem:**

```vibefun
Math.max(1)  // expects 2 arguments
```

**Solution:**

```vibefun
Math.max(1, 2)
```

*Provided correct number of arguments*

### Hint

> Available signatures:
{signatures}

### Related

[VF4202](typechecker.md#vf4202), [VF4205](typechecker.md#vf4205)


---

## VF4202

**WrongArgumentCount** **Error**

### Message

> Function expects {expected} argument(s), got {actual}

### Explanation

The function was called with the wrong number of arguments. Vibefun functions have a fixed number of parameters and must be called with exactly that many arguments.

### Example

**Problem:**

```vibefun
let add = (a: Int, b: Int) -> a + b
let x = add(1)
```

**Solution:**

```vibefun
let add = (a: Int, b: Int) -> a + b
let x = add(1, 2)
```

*Provided both required arguments*

### Hint

> Check the function signature for the expected arguments

### Related

[VF4200](typechecker.md#vf4200), [VF4021](typechecker.md#vf4021)


---

## VF4203

**TupleArity** **Error**

### Message

> Expected {expected}-tuple, got {actual}-tuple

### Explanation

The tuple has the wrong number of elements. Tuple types include their size as part of the type, so a 2-tuple and 3-tuple are incompatible types.

### Example

**Problem:**

```vibefun
let (a, b) = (1, 2, 3)
```

**Solution:**

```vibefun
let (a, b, c) = (1, 2, 3)
```

*Added third binding for third element*

### Hint

> Tuple sizes must match exactly

### Related

[VF4007](typechecker.md#vf4007), [VF4026](typechecker.md#vf4026)


---

## VF4204

**TypeArgumentCount** **Error**

### Message

> Type '{name}' expects {expected} type argument(s), got {actual}

### Explanation

The type constructor was applied to the wrong number of type arguments. For example, List takes 1 type argument, Result takes 2.

### Example

**Problem:**

```vibefun
let x: List = [1, 2, 3]
```

**Solution:**

```vibefun
let x: List<Int> = [1, 2, 3]
```

*Added type argument to List*

### Hint

> Check the type definition for required type parameters

### Related

[VF4022](typechecker.md#vf4022)


---

## VF4205

**AmbiguousOverload** **Error**

### Message

> Ambiguous call to '{name}': multiple overloads match

### Explanation

Multiple overloads of the function could apply to the given arguments. Add explicit type annotations to the arguments to specify which overload you want.

### Example

**Problem:**

```vibefun
// If process is overloaded for Int and Float
process(0)
```

**Solution:**

```vibefun
process((0: Int))
```

*Added type annotation to disambiguate*

### Hint

> Add type annotations to disambiguate

### Related

[VF4201](typechecker.md#vf4201)


---

## VF4300

**InfiniteType** **Error**

### Message

> Cannot construct infinite type: {typeVar} = {type}

### Explanation

The type checker detected an attempt to create an infinite type. This usually happens when a recursive function's type depends on itself in a way that cannot be resolved.

### Example

**Problem:**

```vibefun
let f = (x) -> f
```

**Solution:**

```vibefun
let f = (x: Int): Int -> x
```

*Added type annotations*

### Hint

> Add a type annotation to clarify your intent

### Related

[VF4301](typechecker.md#vf4301)


---

## VF4301

**RecursiveAlias** **Error**

### Message

> Type alias '{name}' is recursive

### Explanation

Type aliases cannot be recursive. For recursive data structures, you must use a variant type definition instead.

### Example

**Problem:**

```vibefun
type Node = { value: Int, next: Node }
```

**Solution:**

```vibefun
type Node = End | Cons(Int, Node)
```

*Changed to variant type for recursion*

### Hint

> Use a variant type for recursive data structures

### Related

[VF4300](typechecker.md#vf4300)


---

## VF4400

**NonExhaustiveMatch** **Error**

### Message

> Non-exhaustive pattern match. Missing cases: {missing}

### Explanation

The match expression does not cover all possible cases. Every match must be exhaustive to ensure all possible values are handled.

### Example

**Problem:**

```vibefun
match opt with
| Some(x) -> x
```

**Solution:**

```vibefun
match opt with
| Some(x) -> x
| None -> 0
```

*Added missing None case*

### Hint

> Add the missing pattern cases or use a wildcard (_) to match all remaining

### Related

[VF4900](typechecker.md#vf4900)


---

## VF4401

**InvalidGuard** **Error**

### Message

> Invalid pattern guard: {message}

### Explanation

The pattern guard expression is not valid. Guards must evaluate to Bool and can only reference variables bound by the pattern.

### Example

**Problem:**

```vibefun
match x with
| n when undefined_fn() -> n
```

**Solution:**

```vibefun
match x with
| n when n > 0 -> n
```

*Used valid guard expression*

### Hint

> Pattern guards must be valid boolean expressions

### Related

[VF4011](typechecker.md#vf4011)


---

## VF4402

**DuplicateBinding** **Error**

### Message

> Duplicate pattern variable: '{name}'

### Explanation

The same variable name appears multiple times in the same pattern. Each pattern binding must introduce a unique variable name.

### Example

**Problem:**

```vibefun
match pair with
| (x, x) -> x
```

**Solution:**

```vibefun
match pair with
| (x, y) -> x + y
```

*Used different variable names*

### Hint

> Each variable can only be bound once in a pattern

### Related

[VF4403](typechecker.md#vf4403)


---

## VF4403

**OrPatternBindingMismatch** **Error**

### Message

> Or-pattern branches bind different variables

### Explanation

When using or-patterns (|), all alternatives must bind exactly the same variable names with the same types, since the body can use any of them.

### Example

**Problem:**

```vibefun
match opt with
| Some(x) | None -> x
```

**Solution:**

```vibefun
match opt with
| Some(x) -> x
| None -> 0
```

*Split into separate patterns*

### Hint

> All branches of an or-pattern must bind the same variables

### Related

[VF4402](typechecker.md#vf4402)


---

## VF4404

**EmptyMatch** **Error**

### Message

> Match expression has no cases

### Explanation

A match expression must have at least one case to handle. Empty match expressions are not allowed because they cannot produce a value.

### Example

**Problem:**

```vibefun
match x with
```

**Solution:**

```vibefun
match x with
| _ -> defaultValue
```

*Added a pattern case*

### Hint

> Add at least one match case

### Related

[VF4400](typechecker.md#vf4400)


---

## VF4500

**NonRecordAccess** **Error**

### Message

> Cannot access field on non-record type {actual}

### Explanation

You tried to access a field using dot notation, but the value is not a record. Only record types have fields that can be accessed with .fieldName.

### Example

**Problem:**

```vibefun
let x = [1, 2, 3]
let y = x.length
```

**Solution:**

```vibefun
let x = [1, 2, 3]
let y = List.length(x)
```

*Used function call instead of field access*

### Hint

> Field access is only valid on record types

### Related

[VF4014](typechecker.md#vf4014), [VF4501](typechecker.md#vf4501)


---

## VF4501

**MissingRecordField** **Error**

### Message

> Field '{field}' not found in record type

### Explanation

The record does not have a field with this name. This might be a typo or you may be using the wrong record type.

### Example

**Problem:**

```vibefun
let person = { name: "Alice" }
let age = person.age
```

**Solution:**

```vibefun
let person = { name: "Alice", age: 30 }
let age = person.age
```

*Added age field to record*

### Hint

> Available fields: {availableFields}

### Related

[VF4103](typechecker.md#vf4103), [VF4500](typechecker.md#vf4500)


---

## VF4502

**DuplicateRecordField** **Error**

### Message

> Duplicate field '{field}' in record

### Explanation

The same field name appears multiple times in the record. Each field must have a unique name within a record.

### Example

**Problem:**

```vibefun
let point = { x: 1, y: 2, x: 3 }
```

**Solution:**

```vibefun
let point = { x: 3, y: 2 }
```

*Removed duplicate x field*

### Hint

> Each field name can only appear once in a record

### Related

[VF4501](typechecker.md#vf4501)


---

## VF4600

**UnknownConstructor** **Error**

### Message

> Unknown constructor '{name}' for variant type

### Explanation

The constructor name is not part of the expected variant type. Check the spelling or the variant type definition.

### Example

**Problem:**

```vibefun
type Color = Red | Green | Blue
let c: Color = Purple
```

**Solution:**

```vibefun
type Color = Red | Green | Blue
let c: Color = Red
```

*Used a valid constructor*

### Hint

> Available constructors: {constructors}

### Related

[VF4102](typechecker.md#vf4102), [VF4200](typechecker.md#vf4200)


---

## VF4601

**ConstructorArgMismatch** **Error**

### Message

> Constructor '{name}' argument type mismatch: expected {expected}, got {actual}

### Explanation

The type of the argument passed to a constructor does not match the expected type. Check the variant type definition for the correct argument types.

### Example

**Problem:**

```vibefun
let x = Some("hello")  // if Option<Int>
```

**Solution:**

```vibefun
let x = Some(42)
```

*Used correct argument type*

### Hint

> Check the constructor's expected argument types

### Related

[VF4200](typechecker.md#vf4200), [VF4002](typechecker.md#vf4002)


---

## VF4602

**VariantMismatch** **Error**

### Message

> Expected variant type {expected}, got {actual}

### Explanation

The variant type does not match what was expected. This typically happens when using a constructor from a different variant type than expected.

### Example

**Problem:**

```vibefun
type A = X | Y
type B = M | N
let a: A = M
```

**Solution:**

```vibefun
type A = X | Y
let a: A = X
```

*Used constructor from correct type*

### Hint

> Check that the variant type matches

### Related

[VF4025](typechecker.md#vf4025)


---

## VF4700

**ValueRestriction** **Error**

### Message

> Cannot generalize non-syntactic value in binding '{name}'

### Explanation

The value restriction prevents generalizing type variables in certain expressions. Only variables, lambdas, literals, and constructors can be polymorphic.

### Example

**Problem:**

```vibefun
let ids = List.map(identity)
```

**Solution:**

```vibefun
let ids = (xs: List<Int>) -> List.map(identity, xs)
```

*Converted to a lambda to allow generalization*

### Hint

> Add a type annotation or restructure the expression

### Related

[VF4701](typechecker.md#vf4701)


---

## VF4701

**TypeEscape** **Error**

### Message

> Type variable would escape its scope

### Explanation

A type variable that should be local to an expression would escape to an outer scope. This is prevented to maintain type safety.

### Example

**Problem:**

```vibefun
let x = ref(None)
```

**Solution:**

```vibefun
let x = ref((None: Option<Int>))
```

*Added type annotation*

### Hint

> Add a type annotation to constrain the type

### Related

[VF4700](typechecker.md#vf4700)


---

## VF4800

**FFIError** **Error**

### Message

> {message}

### Explanation

An error occurred with an external (FFI) declaration. This could be a configuration issue or type mismatch between Vibefun and JavaScript.

### Example

**Problem:**

```vibefun
external invalid: -> Int = "js_function"
```

**Solution:**

```vibefun
external valid: () -> Int = "js_function"
```

*Fixed function type syntax*

### Hint

> Check the external declaration

### Related

[VF4801](typechecker.md#vf4801), [VF4802](typechecker.md#vf4802)


---

## VF4801

**FFIInconsistentName** **Error**

### Message

> Inconsistent JavaScript names for '{name}'

### Explanation

When declaring overloads for an external function, all overloads must use the same JavaScript name in the = "name" part.

### Example

**Problem:**

```vibefun
external parse: (String) -> Int = "parseInt"
external parse: (String, Int) -> Int = "parseInt2"
```

**Solution:**

```vibefun
external parse: (String) -> Int = "parseInt"
external parse: (String, Int) -> Int = "parseInt"
```

*Used same JS name for both overloads*

### Hint

> All overloads must map to the same JavaScript function

### Related

[VF4800](typechecker.md#vf4800), [VF4802](typechecker.md#vf4802)


---

## VF4802

**FFIInconsistentImport** **Error**

### Message

> Inconsistent module imports for '{name}'

### Explanation

When declaring overloads for an external function, all overloads must import from the same module (or all have no import).

### Example

**Problem:**

```vibefun
external parse: (String) -> Int = "parse" from "lib1"
external parse: (String, Int) -> Int = "parse" from "lib2"
```

**Solution:**

```vibefun
external parse: (String) -> Int = "parse" from "lib"
external parse: (String, Int) -> Int = "parse" from "lib"
```

*Used same import source for both overloads*

### Hint

> All overloads must have the same 'from' clause

### Related

[VF4800](typechecker.md#vf4800), [VF4801](typechecker.md#vf4801)


---

## VF4803

**FFINotFunction** **Error**

### Message

> Overloaded external '{name}' must have function type

### Explanation

External declarations can only be overloaded if they have function types. Non-function external values cannot have multiple declarations.

### Example

**Problem:**

```vibefun
external PI: Float = "Math.PI"
external PI: Float = "Math.PI"
```

**Solution:**

```vibefun
external PI: Float = "Math.PI"
```

*Removed duplicate non-function external*

### Hint

> Only functions can be overloaded

### Related

[VF4800](typechecker.md#vf4800)


---

## VF4804

**FFIOverloadNotSupported** **Error**

### Message

> Overloaded external '{name}' not yet supported in this context

### Explanation

Overloaded external functions cannot be used as first-class values or in certain contexts. You must call them directly with the appropriate arguments for overload resolution.

### Example

**Problem:**

```vibefun
let f = overloadedExternal  // cannot use as value
```

**Solution:**

```vibefun
let result = overloadedExternal(arg)
```

*Called directly instead of using as value*

### Hint

> Overloaded externals require explicit overload resolution

### Related

[VF4800](typechecker.md#vf4800), [VF4205](typechecker.md#vf4205)


---

## VF4900

**UnreachablePattern** **Warning**

### Message

> Unreachable pattern: this case will never match

### Explanation

This pattern case will never be reached because previous patterns already cover all possible values. Consider removing it to avoid dead code.

### Example

**Problem:**

```vibefun
match opt with
| _ -> 0
| Some(x) -> x
```

**Solution:**

```vibefun
match opt with
| Some(x) -> x
| _ -> 0
```

*Moved wildcard pattern to the end*

### Hint

> Consider removing this unreachable case

### Related

[VF4400](typechecker.md#vf4400)


---

## VF5102

**DuplicateDeclaration** **Error**

### Message

> Duplicate declaration for '{name}'

### Explanation

The same name is declared multiple times. In Vibefun, only external functions can be overloaded. For other declarations, use different names.

### Example

**Problem:**

```vibefun
let x = 1
let x = 2
```

**Solution:**

```vibefun
let x = 1
let y = 2
```

*Used different names for declarations*

### Hint

> Only external functions can be overloaded

### Related

[VF4800](typechecker.md#vf4800)

