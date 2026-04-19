/**
 * Pattern Matching Errors (VF4400-VF4405)
 */

import type { DiagnosticDefinition } from "../../diagnostic.js";

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
    title: "OrPatternBindsVariable",
    messageTemplate: "Or-pattern alternatives cannot bind variables",
    severity: "error",
    phase: "typechecker",
    category: "pattern",
    hintTemplate:
        "Use only literals, wildcards, or constructors without bindings inside or-patterns, " +
        "or split the or-pattern into separate match arms",
    explanation:
        "Alternatives of an or-pattern (|) must be irrefutable: literals, wildcards, or constructors " +
        "whose arguments bind no variables. A variable binding inside one alternative would be unbound " +
        "in the others, so the body could not safely reference it.",
    example: {
        bad: "match opt {\n  | Some(x) | None => x\n}",
        good: "match opt {\n  | Some(x) => x\n  | None => 0\n}",
        description: "Split alternatives into separate arms so each binding is total",
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

export const VF4405: DiagnosticDefinition = {
    code: "VF4405",
    title: "UnreachablePattern",
    messageTemplate: "Unreachable pattern: an earlier catch-all already matches every value",
    severity: "error",
    phase: "typechecker",
    category: "pattern",
    hintTemplate: "Remove this arm, or move it before the catch-all so it can match before the fallback",
    explanation:
        "A pattern is unreachable when an earlier arm in the same match already matches every " +
        "possible value of the scrutinee. An unguarded wildcard or variable pattern is a total " +
        "fallback, so any arm that follows it can never run.",
    example: {
        bad: 'match n {\n  | _ => "any"\n  | 0 => "zero"\n}',
        good: 'match n {\n  | 0 => "zero"\n  | _ => "any"\n}',
        description: "Specific patterns must precede the catch-all",
    },
    relatedCodes: ["VF4400"],
};

export const patternCodes: readonly DiagnosticDefinition[] = [VF4400, VF4401, VF4402, VF4403, VF4404, VF4405];
