/**
 * Infinite Type / Recursive Errors (VF4300-VF4301)
 */

import type { DiagnosticDefinition } from "../../diagnostic.js";

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

export const infiniteCodes: readonly DiagnosticDefinition[] = [VF4300, VF4301];
