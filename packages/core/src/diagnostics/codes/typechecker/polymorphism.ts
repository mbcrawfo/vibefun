/**
 * Polymorphism Errors (VF4700-VF4701)
 */

import type { DiagnosticDefinition } from "../../diagnostic.js";

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

export const polymorphismCodes: readonly DiagnosticDefinition[] = [VF4700, VF4701];
