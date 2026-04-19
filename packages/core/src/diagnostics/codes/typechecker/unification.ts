/**
 * Unification Errors (VF4020-VF4027)
 */

import type { DiagnosticDefinition } from "../../diagnostic.js";

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

export const VF4027: DiagnosticDefinition = {
    code: "VF4027",
    title: "RecursiveTypeAlias",
    messageTemplate: "Type alias '{name}' is unguardedly recursive",
    severity: "error",
    phase: "typechecker",
    category: "unification",
    hintTemplate: "Wrap the recursion in a variant or record type — e.g. 'type List = Cons(Int, List) | Nil;'",
    explanation:
        "A type alias cannot reference itself directly because there is no constructor to break " +
        "the recursion. Introduce a variant (or record) whose constructors introduce the cycle, " +
        "so the type has a finite surface at every step of evaluation.",
    example: {
        bad: "type Loop = Loop;",
        good: "type List = Cons(Int, List) | Nil;",
        description: "Replaced the bare self-reference with a variant type whose constructors guard the recursion",
    },
    relatedCodes: ["VF4020"],
};

export const unificationCodes: readonly DiagnosticDefinition[] = [
    VF4020,
    VF4021,
    VF4022,
    VF4023,
    VF4024,
    VF4025,
    VF4026,
    VF4027,
];
