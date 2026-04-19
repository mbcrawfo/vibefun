/**
 * Type Warnings and Module System (VF4900, VF5102)
 *
 * Both codes live here: VF4900 is the type-warning range and VF5102 is the
 * module-system duplicate-declaration error, colocated for convenience
 * (matches the grouping in the original monolithic file).
 */

import type { DiagnosticDefinition } from "../../diagnostic.js";

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

export const warningsCodes: readonly DiagnosticDefinition[] = [VF4900, VF5102];
