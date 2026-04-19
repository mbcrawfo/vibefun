/**
 * Arity Errors (VF4200-VF4205)
 */

import type { DiagnosticDefinition } from "../../diagnostic.js";

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

export const arityCodes: readonly DiagnosticDefinition[] = [VF4200, VF4201, VF4202, VF4203, VF4204, VF4205];
