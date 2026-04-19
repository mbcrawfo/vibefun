/**
 * Type Mismatch Errors (VF4001-VF4017)
 */

import type { DiagnosticDefinition } from "../../diagnostic.js";

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

export const mismatchCodes: readonly DiagnosticDefinition[] = [
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
];
