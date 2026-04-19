/**
 * Pattern Parsing Errors (VF2200-VF2299)
 */

import type { DiagnosticDefinition } from "../../diagnostic.js";

export const VF2200: DiagnosticDefinition = {
    code: "VF2200",
    title: "ExpectedPattern",
    messageTemplate: "Expected pattern",
    severity: "error",
    phase: "parser",
    category: "pattern",
    hintTemplate: "Expected a pattern (variable, wildcard, literal, constructor, record, or list)",
    explanation:
        "The parser expected to find a pattern at this position. " +
        "Patterns are used in let bindings, match expressions, and function parameters " +
        "to destructure values and bind variables.",
    example: {
        bad: "let = 42",
        good: "let x = 42",
        description: "Added variable pattern to bind the value",
    },
    relatedCodes: ["VF2201", "VF2202"],
};

export const VF2201: DiagnosticDefinition = {
    code: "VF2201",
    title: "KeywordShorthandNotAllowed",
    messageTemplate: "Cannot use keyword '{keyword}' in field shorthand",
    severity: "error",
    phase: "parser",
    category: "pattern",
    hintTemplate: "Use explicit syntax: { {keyword}: pattern }",
    explanation:
        "Keywords cannot be used with field shorthand syntax in patterns because they would " +
        "conflict with their reserved meaning. Use the explicit colon syntax instead.",
    example: {
        bad: "let { type } = obj",
        good: "let { type: t } = obj",
        description: "Used explicit syntax to rename the field",
    },
};

export const VF2202: DiagnosticDefinition = {
    code: "VF2202",
    title: "TypeAnnotatedRecordShorthand",
    messageTemplate: "Type-annotated record shorthand must use variable pattern",
    severity: "error",
    phase: "parser",
    category: "pattern",
    hintTemplate: "Expected (fieldName: Type)",
    explanation:
        "When using type annotations in record pattern shorthand, the inner pattern " +
        "must be a simple variable pattern. Complex patterns cannot be used with this shorthand.",
    example: {
        bad: "let { ((x, y): Point) } = obj",
        good: "let { (point: Point) } = obj",
        description: "Used simple variable pattern with type annotation",
    },
};

export const patternCodes: readonly DiagnosticDefinition[] = [VF2200, VF2201, VF2202];
