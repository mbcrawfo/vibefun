/**
 * Type checker diagnostic codes (VF4xxx)
 *
 * Error codes for the type checking and type inference phase.
 *
 * Subcategory allocation:
 * - VF4000-VF4019: Type mismatch errors
 * - VF4020-VF4029: Unification errors
 * - VF4100-VF4199: Undefined reference errors
 * - VF4200-VF4299: Arity errors
 * - VF4300-VF4399: Infinite type / recursive errors
 * - VF4400-VF4499: Pattern matching errors
 * - VF4500-VF4599: Record errors
 * - VF4600-VF4699: Variant errors
 * - VF4700-VF4799: Polymorphism errors
 * - VF4800-VF4899: External/FFI errors
 * - VF4900-VF4999: Type warnings
 */

import type { DiagnosticDefinition } from "../diagnostic.js";

import { registry } from "../registry.js";

// =============================================================================
// VF4000-VF4019: Type Mismatch Errors
// =============================================================================

export const VF4001: DiagnosticDefinition = {
    code: "VF4001",
    title: "TypeMismatch",
    messageTemplate: "Type mismatch: expected {expected}, got {actual}",
    severity: "error",
    phase: "typechecker",
    category: "mismatch",
    hintTemplate: "Check that the expression has the expected type",
    explanation:
        "The type of an expression does not match what was expected. " +
        "This is a general type mismatch error that occurs when the inferred type differs from the expected type.",
    example: {
        bad: 'let x: Int = "hello"',
        good: 'let x: String = "hello"',
        description: "Changed type annotation to match the value",
    },
    relatedCodes: ["VF4002", "VF4003", "VF4004"],
};

export const VF4002: DiagnosticDefinition = {
    code: "VF4002",
    title: "ArgumentTypeMismatch",
    messageTemplate: "Argument type mismatch: expected {expected}, got {actual}",
    severity: "error",
    phase: "typechecker",
    category: "mismatch",
    hintTemplate: "Check the argument type matches the function parameter",
    explanation:
        "The type of an argument passed to a function does not match the expected parameter type. " +
        "Make sure you're passing the correct type of value.",
    example: {
        bad: 'let double = (x: Int) -> x * 2\nlet result = double("5")',
        good: "let double = (x: Int) -> x * 2\nlet result = double(5)",
        description: "Changed string argument to integer",
    },
    relatedCodes: ["VF4001", "VF4202"],
};

export const VF4003: DiagnosticDefinition = {
    code: "VF4003",
    title: "ReturnTypeMismatch",
    messageTemplate: "Return type mismatch: expected {expected}, got {actual}",
    severity: "error",
    phase: "typechecker",
    category: "mismatch",
    hintTemplate: "Check the function body returns the declared type",
    explanation:
        "The type of the value returned by a function does not match its declared return type. " +
        "Either change the return type annotation or the returned value.",
    example: {
        bad: 'let greet = (name: String): Int -> "Hello, " + name',
        good: 'let greet = (name: String): String -> "Hello, " + name',
        description: "Changed return type from Int to String",
    },
    relatedCodes: ["VF4001", "VF4004"],
};

export const VF4004: DiagnosticDefinition = {
    code: "VF4004",
    title: "BranchTypeMismatch",
    messageTemplate: "Branch type mismatch: expected {expected}, got {actual}",
    severity: "error",
    phase: "typechecker",
    category: "mismatch",
    hintTemplate: "All branches of a match expression must have the same type",
    explanation:
        "All branches of a match expression must return values of the same type. " +
        "The type of the first branch determines the expected type for all other branches.",
    example: {
        bad: 'match opt with\n| Some(x) -> x\n| None -> "nothing"',
        good: "match opt with\n| Some(x) -> x\n| None -> 0",
        description: "Changed None branch to return Int instead of String",
    },
    relatedCodes: ["VF4001", "VF4005"],
};

export const VF4005: DiagnosticDefinition = {
    code: "VF4005",
    title: "IfBranchTypeMismatch",
    messageTemplate: "If branches have different types: then-branch has {thenType}, else-branch has {elseType}",
    severity: "error",
    phase: "typechecker",
    category: "mismatch",
    hintTemplate: "Both branches of an if expression must have the same type",
    explanation:
        "The then-branch and else-branch of an if expression must have the same type. " +
        "If you want different types, consider using Option or a variant type.",
    example: {
        bad: 'if condition then 42 else "hello"',
        good: 'if condition then "42" else "hello"',
        description: "Changed then-branch to return String",
    },
    relatedCodes: ["VF4004"],
};

export const VF4006: DiagnosticDefinition = {
    code: "VF4006",
    title: "ListElementMismatch",
    messageTemplate: "List element type mismatch: expected {expected}, got {actual}",
    severity: "error",
    phase: "typechecker",
    category: "mismatch",
    hintTemplate: "All list elements must have the same type",
    explanation:
        "All elements in a list must have the same type. The type of the first element " +
        "determines the expected type for all subsequent elements.",
    example: {
        bad: '[1, 2, "three"]',
        good: "[1, 2, 3]",
        description: 'Changed "three" to 3',
    },
    relatedCodes: ["VF4001", "VF4007"],
};

export const VF4007: DiagnosticDefinition = {
    code: "VF4007",
    title: "TupleElementMismatch",
    messageTemplate: "Tuple element {index}: expected {expected}, got {actual}",
    severity: "error",
    phase: "typechecker",
    category: "mismatch",
    hintTemplate: "Check the type of the tuple element at the specified index",
    explanation:
        "The type of a tuple element does not match the expected type at that position. " +
        "Tuple types are ordered, so each position has a specific expected type.",
    example: {
        bad: "let pair: (Int, String) = (1, 2)",
        good: 'let pair: (Int, String) = (1, "two")',
        description: "Changed second element to a String",
    },
    relatedCodes: ["VF4001", "VF4203"],
};

export const VF4008: DiagnosticDefinition = {
    code: "VF4008",
    title: "RecordFieldMismatch",
    messageTemplate: "Field '{field}': expected {expected}, got {actual}",
    severity: "error",
    phase: "typechecker",
    category: "mismatch",
    hintTemplate: "Check the type of the record field",
    explanation:
        "The type of a record field does not match the expected type for that field. " +
        "Record field types must match exactly.",
    example: {
        bad: 'let point: { x: Int, y: Int } = { x: 1, y: "2" }',
        good: "let point: { x: Int, y: Int } = { x: 1, y: 2 }",
        description: 'Changed y field from "2" to 2',
    },
    relatedCodes: ["VF4001", "VF4501"],
};

export const VF4009: DiagnosticDefinition = {
    code: "VF4009",
    title: "NumericTypeMismatch",
    messageTemplate: "Numeric type mismatch: {message}",
    severity: "error",
    phase: "typechecker",
    category: "mismatch",
    hintTemplate: "Int and Float are different types and cannot be mixed implicitly",
    explanation:
        "Int and Float are distinct types in Vibefun. You cannot use them interchangeably without " +
        "explicit conversion. Use Int.toFloat or Float.toInt to convert between them.",
    example: {
        bad: "let x: Float = 42",
        good: "let x: Float = 42.0",
        description: "Used a Float literal instead of Int",
    },
    relatedCodes: ["VF4001", "VF4010"],
};

export const VF4010: DiagnosticDefinition = {
    code: "VF4010",
    title: "OperatorTypeMismatch",
    messageTemplate: "Cannot apply operator '{op}' to types {left} and {right}",
    severity: "error",
    phase: "typechecker",
    category: "mismatch",
    hintTemplate: "Check that the operator is valid for these types",
    explanation:
        "The operator cannot be applied to the given types. Each operator has specific type " +
        "requirements - for example, + works on Int, Float, and String, but not on Bool.",
    example: {
        bad: 'let result = 5 + "hello"',
        good: 'let result = "5" + "hello"',
        description: "Converted 5 to a string to use string concatenation",
    },
    relatedCodes: ["VF4001", "VF4009"],
};

export const VF4011: DiagnosticDefinition = {
    code: "VF4011",
    title: "GuardTypeMismatch",
    messageTemplate: "Guard must be Bool, got {actual}",
    severity: "error",
    phase: "typechecker",
    category: "mismatch",
    hintTemplate: "Pattern guards must evaluate to Bool",
    explanation:
        "Pattern guards (the `when` clause in match expressions) must evaluate to a Bool value. " +
        "The guard expression determines whether the pattern branch is taken.",
    example: {
        bad: "match x with\n| n when n -> n",
        good: "match x with\n| n when n > 0 -> n",
        description: "Changed guard to a boolean comparison",
    },
    relatedCodes: ["VF4401"],
};

export const VF4012: DiagnosticDefinition = {
    code: "VF4012",
    title: "AnnotationMismatch",
    messageTemplate: "Type annotation {expected} does not match inferred type {actual}",
    severity: "error",
    phase: "typechecker",
    category: "mismatch",
    hintTemplate: "Either fix the type annotation or the expression",
    explanation:
        "The declared type annotation does not match what the type checker inferred from the " +
        "expression. Either the annotation is wrong, or the expression needs to be changed.",
    example: {
        bad: "let x: List<Int> = []",
        good: "let x: List<Int> = []\n// or\nlet x = ([] : List<Int>)",
        description: "Used explicit type annotation for empty list",
    },
    relatedCodes: ["VF4001"],
};

export const VF4013: DiagnosticDefinition = {
    code: "VF4013",
    title: "NotAFunction",
    messageTemplate: "Cannot call non-function type {actual}",
    severity: "error",
    phase: "typechecker",
    category: "mismatch",
    hintTemplate: "Only functions can be called with arguments",
    explanation:
        "You tried to call something that is not a function. Only values with function types " +
        "can be called using the function call syntax `f(args)`.",
    example: {
        bad: "let x = 42\nlet result = x(5)",
        good: "let x = (n: Int) -> n * 2\nlet result = x(5)",
        description: "Changed x to be a function",
    },
    relatedCodes: ["VF4100", "VF4202"],
};

export const VF4014: DiagnosticDefinition = {
    code: "VF4014",
    title: "NotARecord",
    messageTemplate: "Cannot access field on non-record type {actual}",
    severity: "error",
    phase: "typechecker",
    category: "mismatch",
    hintTemplate: "Only records have fields that can be accessed with .field syntax",
    explanation:
        "You tried to access a field on a value that is not a record. Field access syntax " +
        "(.fieldName) only works on record types.",
    example: {
        bad: "let x = 42\nlet y = x.value",
        good: "let x = { value: 42 }\nlet y = x.value",
        description: "Changed x to be a record with a value field",
    },
    relatedCodes: ["VF4500", "VF4501"],
};

export const VF4015: DiagnosticDefinition = {
    code: "VF4015",
    title: "NotARef",
    messageTemplate: "Cannot dereference non-Ref type {actual}",
    severity: "error",
    phase: "typechecker",
    category: "mismatch",
    hintTemplate: "Only Ref values can be dereferenced with ! or assigned with :=",
    explanation:
        "You tried to dereference or assign to a value that is not a Ref. Only mutable references " +
        "(created with ref) can use the dereference (!) and assignment (:=) operators.",
    example: {
        bad: "let x = 42\nlet y = !x",
        good: "let x = ref(42)\nlet y = !x",
        description: "Changed x to be a Ref",
    },
    relatedCodes: ["VF4016"],
};

export const VF4016: DiagnosticDefinition = {
    code: "VF4016",
    title: "RefAssignmentMismatch",
    messageTemplate: "Cannot assign {actual} to Ref<{expected}>",
    severity: "error",
    phase: "typechecker",
    category: "mismatch",
    hintTemplate: "The assigned value must match the Ref's inner type",
    explanation:
        "You tried to assign a value to a Ref, but the value's type does not match the Ref's " +
        "inner type. The assigned value must have exactly the same type.",
    example: {
        bad: 'let x = ref(42)\nx := "hello"',
        good: "let x = ref(42)\nx := 100",
        description: "Assigned an Int instead of a String",
    },
    relatedCodes: ["VF4015"],
};

export const VF4017: DiagnosticDefinition = {
    code: "VF4017",
    title: "NotImplemented",
    messageTemplate: "{feature} not yet implemented",
    severity: "error",
    phase: "typechecker",
    category: "mismatch",
    hintTemplate: "{hint}",
    explanation:
        "This feature has not yet been implemented in the type checker. " +
        "It may be added in a future release of Vibefun.",
    example: {
        bad: "let (a, b) = expr  // pattern matching in let bindings",
        good: "match expr with\n| (a, b) -> ...",
        description: "Used match expression instead",
    },
    relatedCodes: [],
};

// =============================================================================
// VF4020-VF4029: Unification Errors
// =============================================================================

export const VF4020: DiagnosticDefinition = {
    code: "VF4020",
    title: "CannotUnify",
    messageTemplate: "Cannot unify {t1} with {t2}",
    severity: "error",
    phase: "typechecker",
    category: "unification",
    hintTemplate: "These types are fundamentally incompatible",
    explanation:
        "Type unification failed because the two types have incompatible structures. " +
        "This typically means you're trying to use a value of one type where another is expected.",
    example: {
        bad: "let f = (x: Int) -> x\nlet y = f(true)",
        good: "let f = (x: Bool) -> x\nlet y = f(true)",
        description: "Changed function parameter type to Bool",
    },
    relatedCodes: ["VF4001", "VF4021"],
};

export const VF4021: DiagnosticDefinition = {
    code: "VF4021",
    title: "FunctionArityMismatch",
    messageTemplate: "Cannot unify functions with different arity: {arity1} vs {arity2}",
    severity: "error",
    phase: "typechecker",
    category: "unification",
    hintTemplate: "Functions must have the same number of parameters to unify",
    explanation:
        "Two function types cannot be unified because they have different numbers of parameters. " +
        "For example, a function taking 2 arguments cannot unify with one taking 3.",
    example: {
        bad: "let f: (Int, Int) -> Int = (x: Int) -> x",
        good: "let f: (Int, Int) -> Int = (x: Int, y: Int) -> x + y",
        description: "Changed function to take 2 parameters",
    },
    relatedCodes: ["VF4020", "VF4202"],
};

export const VF4022: DiagnosticDefinition = {
    code: "VF4022",
    title: "TypeApplicationArityMismatch",
    messageTemplate: "Cannot unify type applications with different arity",
    severity: "error",
    phase: "typechecker",
    category: "unification",
    hintTemplate: "Type constructors must have the same number of type arguments",
    explanation:
        "Two type applications cannot be unified because they have different numbers of type arguments. " +
        "For example, `List<Int>` and `Result<Int, String>` have different arities.",
    example: {
        bad: "let x: List<Int> = Result.Ok(42)",
        good: "let x: Result<Int, String> = Result.Ok(42)",
        description: "Changed type to Result with correct arity",
    },
    relatedCodes: ["VF4020", "VF4204"],
};

export const VF4023: DiagnosticDefinition = {
    code: "VF4023",
    title: "UnionArityMismatch",
    messageTemplate: "Cannot unify unions with different number of types",
    severity: "error",
    phase: "typechecker",
    category: "unification",
    hintTemplate: "Union types must have the same number of member types",
    explanation:
        "Two union types cannot be unified because they have different numbers of member types. " +
        "Union types must have exactly the same structure to be compatible.",
    example: {
        bad: "let x: Int | String = y  // where y: Int | String | Bool",
        good: "let x: Int | String | Bool = y",
        description: "Changed union type to include all members",
    },
    relatedCodes: ["VF4020"],
};

export const VF4024: DiagnosticDefinition = {
    code: "VF4024",
    title: "IncompatibleTypes",
    messageTemplate: "Cannot unify types: {type1} with {type2}",
    severity: "error",
    phase: "typechecker",
    category: "unification",
    hintTemplate: "These type kinds cannot be unified",
    explanation:
        "The types have fundamentally incompatible structures (e.g., trying to unify a function " +
        "with a record). Check that you're using values of the correct type.",
    example: {
        bad: "let x: { a: Int } = (y: Int) -> y",
        good: "let x: { a: Int } = { a: 42 }",
        description: "Changed value from function to record",
    },
    relatedCodes: ["VF4020"],
};

export const VF4025: DiagnosticDefinition = {
    code: "VF4025",
    title: "VariantUnificationError",
    messageTemplate: "Cannot unify variant types: {message}",
    severity: "error",
    phase: "typechecker",
    category: "unification",
    hintTemplate: "Variant types must have exactly the same constructors",
    explanation:
        "Two variant types cannot be unified because they have different constructors. " +
        "Variant types use nominal typing - they must have exactly the same structure.",
    example: {
        bad: "type A = Foo | Bar\ntype B = Foo | Baz\nlet x: A = (y: B)",
        good: "type A = Foo | Bar\nlet x: A = Foo",
        description: "Use the same variant type",
    },
    relatedCodes: ["VF4020", "VF4600"],
};

export const VF4026: DiagnosticDefinition = {
    code: "VF4026",
    title: "TupleArityMismatch",
    messageTemplate: "Cannot unify tuples: expected {expected}-tuple, got {actual}-tuple",
    severity: "error",
    phase: "typechecker",
    category: "unification",
    hintTemplate: "Tuples must have the same number of elements",
    explanation:
        "Two tuple types cannot be unified because they have different numbers of elements. " +
        "A 2-tuple is fundamentally different from a 3-tuple.",
    example: {
        bad: "let x: (Int, Int) = (1, 2, 3)",
        good: "let x: (Int, Int, Int) = (1, 2, 3)",
        description: "Changed type annotation to match 3-tuple",
    },
    relatedCodes: ["VF4020", "VF4203"],
};

// =============================================================================
// VF4100-VF4199: Undefined Reference Errors
// =============================================================================

export const VF4100: DiagnosticDefinition = {
    code: "VF4100",
    title: "UndefinedVariable",
    messageTemplate: "Undefined variable '{name}'",
    severity: "error",
    phase: "typechecker",
    category: "undefined",
    hintTemplate: "Did you mean: {suggestions}?",
    explanation:
        "The variable has not been defined in the current scope. This could be a typo, " +
        "or the variable was defined in a different scope that is not accessible here.",
    example: {
        bad: "let y = x + 1",
        good: "let x = 5\nlet y = x + 1",
        description: "Defined x before using it",
    },
    relatedCodes: ["VF4101", "VF4102"],
};

export const VF4101: DiagnosticDefinition = {
    code: "VF4101",
    title: "UndefinedType",
    messageTemplate: "Undefined type '{name}'",
    severity: "error",
    phase: "typechecker",
    category: "undefined",
    hintTemplate: "Check the type name spelling or import the type",
    explanation:
        "The type has not been defined. This could be a typo, or you need to define the type " +
        "or import it from another module.",
    example: {
        bad: "let x: MyTyp = ...",
        good: "type MyType = ...\nlet x: MyType = ...",
        description: "Defined the type before using it",
    },
    relatedCodes: ["VF4100", "VF4102"],
};

export const VF4102: DiagnosticDefinition = {
    code: "VF4102",
    title: "UndefinedConstructor",
    messageTemplate: "Undefined constructor '{name}'",
    severity: "error",
    phase: "typechecker",
    category: "undefined",
    hintTemplate: "Check the constructor name or define the variant type",
    explanation:
        "The constructor has not been defined. Constructors come from variant types and " +
        "must be defined before use.",
    example: {
        bad: "let x = Sme(42)",
        good: "let x = Some(42)",
        description: "Fixed typo in constructor name",
    },
    relatedCodes: ["VF4100", "VF4600"],
};

export const VF4103: DiagnosticDefinition = {
    code: "VF4103",
    title: "UndefinedField",
    messageTemplate: "Field '{field}' does not exist on type {recordType}",
    severity: "error",
    phase: "typechecker",
    category: "undefined",
    hintTemplate: "Available fields: {availableFields}",
    explanation: "The record does not have a field with this name. Check the spelling or the record type definition.",
    example: {
        bad: "let point = { x: 1, y: 2 }\nlet z = point.z",
        good: "let point = { x: 1, y: 2, z: 3 }\nlet z = point.z",
        description: "Added z field to the record",
    },
    relatedCodes: ["VF4500", "VF4501"],
};

// =============================================================================
// VF4200-VF4299: Arity Errors
// =============================================================================

export const VF4200: DiagnosticDefinition = {
    code: "VF4200",
    title: "ConstructorArity",
    messageTemplate: "Constructor '{name}' expects {expected} argument(s), got {actual}",
    severity: "error",
    phase: "typechecker",
    category: "arity",
    hintTemplate: "Check the constructor definition for the correct number of arguments",
    explanation:
        "The constructor was called with the wrong number of arguments. Check the variant type " +
        "definition to see how many arguments the constructor expects.",
    example: {
        bad: "let x = Some(1, 2)  // Some takes 1 argument",
        good: "let x = Some(1)",
        description: "Removed extra argument",
    },
    relatedCodes: ["VF4202", "VF4600"],
};

export const VF4201: DiagnosticDefinition = {
    code: "VF4201",
    title: "NoMatchingOverload",
    messageTemplate: "No matching overload for '{name}' with {argCount} argument(s)",
    severity: "error",
    phase: "typechecker",
    category: "arity",
    hintTemplate: "Available signatures:\n{signatures}",
    explanation:
        "No overload of this function matches the provided arguments. Check that you're passing " +
        "the correct number and types of arguments.",
    example: {
        bad: "Math.max(1)  // expects 2 arguments",
        good: "Math.max(1, 2)",
        description: "Provided correct number of arguments",
    },
    relatedCodes: ["VF4202", "VF4205"],
};

export const VF4202: DiagnosticDefinition = {
    code: "VF4202",
    title: "WrongArgumentCount",
    messageTemplate: "Function expects {expected} argument(s), got {actual}",
    severity: "error",
    phase: "typechecker",
    category: "arity",
    hintTemplate: "Check the function signature for the expected arguments",
    explanation:
        "The function was called with the wrong number of arguments. Vibefun functions have a " +
        "fixed number of parameters and must be called with exactly that many arguments.",
    example: {
        bad: "let add = (a: Int, b: Int) -> a + b\nlet x = add(1)",
        good: "let add = (a: Int, b: Int) -> a + b\nlet x = add(1, 2)",
        description: "Provided both required arguments",
    },
    relatedCodes: ["VF4200", "VF4021"],
};

export const VF4203: DiagnosticDefinition = {
    code: "VF4203",
    title: "TupleArity",
    messageTemplate: "Expected {expected}-tuple, got {actual}-tuple",
    severity: "error",
    phase: "typechecker",
    category: "arity",
    hintTemplate: "Tuple sizes must match exactly",
    explanation:
        "The tuple has the wrong number of elements. Tuple types include their size as part of " +
        "the type, so a 2-tuple and 3-tuple are incompatible types.",
    example: {
        bad: "let (a, b) = (1, 2, 3)",
        good: "let (a, b, c) = (1, 2, 3)",
        description: "Added third binding for third element",
    },
    relatedCodes: ["VF4007", "VF4026"],
};

export const VF4204: DiagnosticDefinition = {
    code: "VF4204",
    title: "TypeArgumentCount",
    messageTemplate: "Type '{name}' expects {expected} type argument(s), got {actual}",
    severity: "error",
    phase: "typechecker",
    category: "arity",
    hintTemplate: "Check the type definition for required type parameters",
    explanation:
        "The type constructor was applied to the wrong number of type arguments. For example, " +
        "List takes 1 type argument, Result takes 2.",
    example: {
        bad: "let x: List = [1, 2, 3]",
        good: "let x: List<Int> = [1, 2, 3]",
        description: "Added type argument to List",
    },
    relatedCodes: ["VF4022"],
};

export const VF4205: DiagnosticDefinition = {
    code: "VF4205",
    title: "AmbiguousOverload",
    messageTemplate: "Ambiguous call to '{name}': multiple overloads match",
    severity: "error",
    phase: "typechecker",
    category: "arity",
    hintTemplate: "Add type annotations to disambiguate",
    explanation:
        "Multiple overloads of the function could apply to the given arguments. Add explicit " +
        "type annotations to the arguments to specify which overload you want.",
    example: {
        bad: "// If process is overloaded for Int and Float\nprocess(0)",
        good: "process((0: Int))",
        description: "Added type annotation to disambiguate",
    },
    relatedCodes: ["VF4201"],
};

// =============================================================================
// VF4300-VF4399: Infinite Type / Recursive Errors
// =============================================================================

export const VF4300: DiagnosticDefinition = {
    code: "VF4300",
    title: "InfiniteType",
    messageTemplate: "Cannot construct infinite type: {typeVar} = {type}",
    severity: "error",
    phase: "typechecker",
    category: "infinite",
    hintTemplate: "Add a type annotation to clarify your intent",
    explanation:
        "The type checker detected an attempt to create an infinite type. This usually happens " +
        "when a recursive function's type depends on itself in a way that cannot be resolved.",
    example: {
        bad: "let f = (x) -> f",
        good: "let f = (x: Int): Int -> x",
        description: "Added type annotations",
    },
    relatedCodes: ["VF4301"],
};

export const VF4301: DiagnosticDefinition = {
    code: "VF4301",
    title: "RecursiveAlias",
    messageTemplate: "Type alias '{name}' is recursive",
    severity: "error",
    phase: "typechecker",
    category: "infinite",
    hintTemplate: "Use a variant type for recursive data structures",
    explanation:
        "Type aliases cannot be recursive. For recursive data structures, you must use a " +
        "variant type definition instead.",
    example: {
        bad: "type Node = { value: Int, next: Node }",
        good: "type Node = End | Cons(Int, Node)",
        description: "Changed to variant type for recursion",
    },
    relatedCodes: ["VF4300"],
};

// =============================================================================
// VF4400-VF4499: Pattern Matching Errors
// =============================================================================

export const VF4400: DiagnosticDefinition = {
    code: "VF4400",
    title: "NonExhaustiveMatch",
    messageTemplate: "Non-exhaustive pattern match. Missing cases: {missing}",
    severity: "error",
    phase: "typechecker",
    category: "pattern",
    hintTemplate: "Add the missing pattern cases or use a wildcard (_) to match all remaining",
    explanation:
        "The match expression does not cover all possible cases. Every match must be exhaustive " +
        "to ensure all possible values are handled.",
    example: {
        bad: "match opt with\n| Some(x) -> x",
        good: "match opt with\n| Some(x) -> x\n| None -> 0",
        description: "Added missing None case",
    },
    relatedCodes: ["VF4900"],
};

export const VF4401: DiagnosticDefinition = {
    code: "VF4401",
    title: "InvalidGuard",
    messageTemplate: "Invalid pattern guard: {message}",
    severity: "error",
    phase: "typechecker",
    category: "pattern",
    hintTemplate: "Pattern guards must be valid boolean expressions",
    explanation:
        "The pattern guard expression is not valid. Guards must evaluate to Bool and can only " +
        "reference variables bound by the pattern.",
    example: {
        bad: "match x with\n| n when undefined_fn() -> n",
        good: "match x with\n| n when n > 0 -> n",
        description: "Used valid guard expression",
    },
    relatedCodes: ["VF4011"],
};

export const VF4402: DiagnosticDefinition = {
    code: "VF4402",
    title: "DuplicateBinding",
    messageTemplate: "Duplicate pattern variable: '{name}'",
    severity: "error",
    phase: "typechecker",
    category: "pattern",
    hintTemplate: "Each variable can only be bound once in a pattern",
    explanation:
        "The same variable name appears multiple times in the same pattern. Each pattern binding " +
        "must introduce a unique variable name.",
    example: {
        bad: "match pair with\n| (x, x) -> x",
        good: "match pair with\n| (x, y) -> x + y",
        description: "Used different variable names",
    },
    relatedCodes: ["VF4403"],
};

export const VF4403: DiagnosticDefinition = {
    code: "VF4403",
    title: "OrPatternBindingMismatch",
    messageTemplate: "Or-pattern branches bind different variables",
    severity: "error",
    phase: "typechecker",
    category: "pattern",
    hintTemplate: "All branches of an or-pattern must bind the same variables",
    explanation:
        "When using or-patterns (|), all alternatives must bind exactly the same variable names " +
        "with the same types, since the body can use any of them.",
    example: {
        bad: "match opt with\n| Some(x) | None -> x",
        good: "match opt with\n| Some(x) -> x\n| None -> 0",
        description: "Split into separate patterns",
    },
    relatedCodes: ["VF4402"],
};

export const VF4404: DiagnosticDefinition = {
    code: "VF4404",
    title: "EmptyMatch",
    messageTemplate: "Match expression has no cases",
    severity: "error",
    phase: "typechecker",
    category: "pattern",
    hintTemplate: "Add at least one match case",
    explanation:
        "A match expression must have at least one case to handle. Empty match expressions " +
        "are not allowed because they cannot produce a value.",
    example: {
        bad: "match x with",
        good: "match x with\n| _ -> defaultValue",
        description: "Added a pattern case",
    },
    relatedCodes: ["VF4400"],
};

// =============================================================================
// VF4500-VF4599: Record Errors
// =============================================================================

export const VF4500: DiagnosticDefinition = {
    code: "VF4500",
    title: "NonRecordAccess",
    messageTemplate: "Cannot access field on non-record type {actual}",
    severity: "error",
    phase: "typechecker",
    category: "record",
    hintTemplate: "Field access is only valid on record types",
    explanation:
        "You tried to access a field using dot notation, but the value is not a record. " +
        "Only record types have fields that can be accessed with .fieldName.",
    example: {
        bad: "let x = [1, 2, 3]\nlet y = x.length",
        good: "let x = [1, 2, 3]\nlet y = List.length(x)",
        description: "Used function call instead of field access",
    },
    relatedCodes: ["VF4014", "VF4501"],
};

export const VF4501: DiagnosticDefinition = {
    code: "VF4501",
    title: "MissingRecordField",
    messageTemplate: "Field '{field}' not found in record type",
    severity: "error",
    phase: "typechecker",
    category: "record",
    hintTemplate: "Available fields: {availableFields}",
    explanation:
        "The record does not have a field with this name. This might be a typo or you may be " +
        "using the wrong record type.",
    example: {
        bad: 'let person = { name: "Alice" }\nlet age = person.age',
        good: 'let person = { name: "Alice", age: 30 }\nlet age = person.age',
        description: "Added age field to record",
    },
    relatedCodes: ["VF4103", "VF4500"],
};

export const VF4502: DiagnosticDefinition = {
    code: "VF4502",
    title: "DuplicateRecordField",
    messageTemplate: "Duplicate field '{field}' in record",
    severity: "error",
    phase: "typechecker",
    category: "record",
    hintTemplate: "Each field name can only appear once in a record",
    explanation:
        "The same field name appears multiple times in the record. Each field must have a " +
        "unique name within a record.",
    example: {
        bad: "let point = { x: 1, y: 2, x: 3 }",
        good: "let point = { x: 3, y: 2 }",
        description: "Removed duplicate x field",
    },
    relatedCodes: ["VF4501"],
};

// =============================================================================
// VF4600-VF4699: Variant Errors
// =============================================================================

export const VF4600: DiagnosticDefinition = {
    code: "VF4600",
    title: "UnknownConstructor",
    messageTemplate: "Unknown constructor '{name}' for variant type",
    severity: "error",
    phase: "typechecker",
    category: "variant",
    hintTemplate: "Available constructors: {constructors}",
    explanation:
        "The constructor name is not part of the expected variant type. Check the spelling " +
        "or the variant type definition.",
    example: {
        bad: "type Color = Red | Green | Blue\nlet c: Color = Purple",
        good: "type Color = Red | Green | Blue\nlet c: Color = Red",
        description: "Used a valid constructor",
    },
    relatedCodes: ["VF4102", "VF4200"],
};

export const VF4601: DiagnosticDefinition = {
    code: "VF4601",
    title: "ConstructorArgMismatch",
    messageTemplate: "Constructor '{name}' argument type mismatch: expected {expected}, got {actual}",
    severity: "error",
    phase: "typechecker",
    category: "variant",
    hintTemplate: "Check the constructor's expected argument types",
    explanation:
        "The type of the argument passed to a constructor does not match the expected type. " +
        "Check the variant type definition for the correct argument types.",
    example: {
        bad: 'let x = Some("hello")  // if Option<Int>',
        good: "let x = Some(42)",
        description: "Used correct argument type",
    },
    relatedCodes: ["VF4200", "VF4002"],
};

export const VF4602: DiagnosticDefinition = {
    code: "VF4602",
    title: "VariantMismatch",
    messageTemplate: "Expected variant type {expected}, got {actual}",
    severity: "error",
    phase: "typechecker",
    category: "variant",
    hintTemplate: "Check that the variant type matches",
    explanation:
        "The variant type does not match what was expected. This typically happens when using " +
        "a constructor from a different variant type than expected.",
    example: {
        bad: "type A = X | Y\ntype B = M | N\nlet a: A = M",
        good: "type A = X | Y\nlet a: A = X",
        description: "Used constructor from correct type",
    },
    relatedCodes: ["VF4025"],
};

// =============================================================================
// VF4700-VF4799: Polymorphism Errors
// =============================================================================

export const VF4700: DiagnosticDefinition = {
    code: "VF4700",
    title: "ValueRestriction",
    messageTemplate: "Cannot generalize non-syntactic value in binding '{name}'",
    severity: "error",
    phase: "typechecker",
    category: "polymorphism",
    hintTemplate: "Add a type annotation or restructure the expression",
    explanation:
        "The value restriction prevents generalizing type variables in certain expressions. " +
        "Only variables, lambdas, literals, and constructors can be polymorphic.",
    example: {
        bad: "let ids = List.map(identity)",
        good: "let ids = (xs: List<Int>) -> List.map(identity, xs)",
        description: "Converted to a lambda to allow generalization",
    },
    relatedCodes: ["VF4701"],
};

export const VF4701: DiagnosticDefinition = {
    code: "VF4701",
    title: "TypeEscape",
    messageTemplate: "Type variable would escape its scope",
    severity: "error",
    phase: "typechecker",
    category: "polymorphism",
    hintTemplate: "Add a type annotation to constrain the type",
    explanation:
        "A type variable that should be local to an expression would escape to an outer scope. " +
        "This is prevented to maintain type safety.",
    example: {
        bad: "let x = ref(None)",
        good: "let x = ref((None: Option<Int>))",
        description: "Added type annotation",
    },
    relatedCodes: ["VF4700"],
};

// =============================================================================
// VF4800-VF4899: External/FFI Errors
// =============================================================================

export const VF4800: DiagnosticDefinition = {
    code: "VF4800",
    title: "FFIError",
    messageTemplate: "{message}",
    severity: "error",
    phase: "typechecker",
    category: "ffi",
    hintTemplate: "Check the external declaration",
    explanation:
        "An error occurred with an external (FFI) declaration. This could be a configuration issue " +
        "or type mismatch between Vibefun and JavaScript.",
    example: {
        bad: 'external invalid: -> Int = "js_function"',
        good: 'external valid: () -> Int = "js_function"',
        description: "Fixed function type syntax",
    },
    relatedCodes: ["VF4801", "VF4802"],
};

export const VF4801: DiagnosticDefinition = {
    code: "VF4801",
    title: "FFIInconsistentName",
    messageTemplate: "Inconsistent JavaScript names for '{name}'",
    severity: "error",
    phase: "typechecker",
    category: "ffi",
    hintTemplate: "All overloads must map to the same JavaScript function",
    explanation:
        "When declaring overloads for an external function, all overloads must use the same " +
        'JavaScript name in the = "name" part.',
    example: {
        bad: 'external parse: (String) -> Int = "parseInt"\nexternal parse: (String, Int) -> Int = "parseInt2"',
        good: 'external parse: (String) -> Int = "parseInt"\nexternal parse: (String, Int) -> Int = "parseInt"',
        description: "Used same JS name for both overloads",
    },
    relatedCodes: ["VF4800", "VF4802"],
};

export const VF4802: DiagnosticDefinition = {
    code: "VF4802",
    title: "FFIInconsistentImport",
    messageTemplate: "Inconsistent module imports for '{name}'",
    severity: "error",
    phase: "typechecker",
    category: "ffi",
    hintTemplate: "All overloads must have the same 'from' clause",
    explanation:
        "When declaring overloads for an external function, all overloads must import from " +
        "the same module (or all have no import).",
    example: {
        bad: 'external parse: (String) -> Int = "parse" from "lib1"\nexternal parse: (String, Int) -> Int = "parse" from "lib2"',
        good: 'external parse: (String) -> Int = "parse" from "lib"\nexternal parse: (String, Int) -> Int = "parse" from "lib"',
        description: "Used same import source for both overloads",
    },
    relatedCodes: ["VF4800", "VF4801"],
};

export const VF4803: DiagnosticDefinition = {
    code: "VF4803",
    title: "FFINotFunction",
    messageTemplate: "Overloaded external '{name}' must have function type",
    severity: "error",
    phase: "typechecker",
    category: "ffi",
    hintTemplate: "Only functions can be overloaded",
    explanation:
        "External declarations can only be overloaded if they have function types. " +
        "Non-function external values cannot have multiple declarations.",
    example: {
        bad: 'external PI: Float = "Math.PI"\nexternal PI: Float = "Math.PI"',
        good: 'external PI: Float = "Math.PI"',
        description: "Removed duplicate non-function external",
    },
    relatedCodes: ["VF4800"],
};

export const VF4804: DiagnosticDefinition = {
    code: "VF4804",
    title: "FFIOverloadNotSupported",
    messageTemplate: "Overloaded external '{name}' not yet supported in this context",
    severity: "error",
    phase: "typechecker",
    category: "ffi",
    hintTemplate: "Overloaded externals require explicit overload resolution",
    explanation:
        "Overloaded external functions cannot be used as first-class values or in certain contexts. " +
        "You must call them directly with the appropriate arguments for overload resolution.",
    example: {
        bad: "let f = overloadedExternal  // cannot use as value",
        good: "let result = overloadedExternal(arg)",
        description: "Called directly instead of using as value",
    },
    relatedCodes: ["VF4800", "VF4205"],
};

// =============================================================================
// VF4900-VF4999: Type Warnings
// =============================================================================

export const VF4900: DiagnosticDefinition = {
    code: "VF4900",
    title: "UnreachablePattern",
    messageTemplate: "Unreachable pattern: this case will never match",
    severity: "warning",
    phase: "typechecker",
    category: "pattern",
    hintTemplate: "Consider removing this unreachable case",
    explanation:
        "This pattern case will never be reached because previous patterns already cover all " +
        "possible values. Consider removing it to avoid dead code.",
    example: {
        bad: "match opt with\n| _ -> 0\n| Some(x) -> x",
        good: "match opt with\n| Some(x) -> x\n| _ -> 0",
        description: "Moved wildcard pattern to the end",
    },
    relatedCodes: ["VF4400"],
};

// =============================================================================
// VF5102: Module System Error (for environment.ts)
// =============================================================================

export const VF5102: DiagnosticDefinition = {
    code: "VF5102",
    title: "DuplicateDeclaration",
    messageTemplate: "Duplicate declaration for '{name}'",
    severity: "error",
    phase: "typechecker",
    category: "declaration",
    hintTemplate: "Only external functions can be overloaded",
    explanation:
        "The same name is declared multiple times. In Vibefun, only external functions can be " +
        "overloaded. For other declarations, use different names.",
    example: {
        bad: "let x = 1\nlet x = 2",
        good: "let x = 1\nlet y = 2",
        description: "Used different names for declarations",
    },
    relatedCodes: ["VF4800"],
};

// =============================================================================
// Registration
// =============================================================================

const typecheckerCodes: readonly DiagnosticDefinition[] = [
    // Type mismatch (VF4000-VF4019)
    VF4001,
    VF4002,
    VF4003,
    VF4004,
    VF4005,
    VF4006,
    VF4007,
    VF4008,
    VF4009,
    VF4010,
    VF4011,
    VF4012,
    VF4013,
    VF4014,
    VF4015,
    VF4016,
    VF4017,
    // Unification (VF4020-VF4029)
    VF4020,
    VF4021,
    VF4022,
    VF4023,
    VF4024,
    VF4025,
    VF4026,
    // Undefined references (VF4100-VF4199)
    VF4100,
    VF4101,
    VF4102,
    VF4103,
    // Arity (VF4200-VF4299)
    VF4200,
    VF4201,
    VF4202,
    VF4203,
    VF4204,
    VF4205,
    // Infinite types (VF4300-VF4399)
    VF4300,
    VF4301,
    // Pattern matching (VF4400-VF4499)
    VF4400,
    VF4401,
    VF4402,
    VF4403,
    VF4404,
    // Records (VF4500-VF4599)
    VF4500,
    VF4501,
    VF4502,
    // Variants (VF4600-VF4699)
    VF4600,
    VF4601,
    VF4602,
    // Polymorphism (VF4700-VF4799)
    VF4700,
    VF4701,
    // FFI (VF4800-VF4899)
    VF4800,
    VF4801,
    VF4802,
    VF4803,
    VF4804,
    // Warnings (VF4900-VF4999)
    VF4900,
    // Module system (VF5102 - lives here for convenience)
    VF5102,
];

/**
 * Register all typechecker diagnostic codes with the global registry.
 */
export function registerTypecheckerCodes(): void {
    registry.registerAll(typecheckerCodes);
}
