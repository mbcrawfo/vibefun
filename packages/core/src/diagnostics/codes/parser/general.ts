/**
 * General Syntax Errors (VF2500-VF2599)
 */

import type { DiagnosticDefinition } from "../../diagnostic.js";

export const VF2500: DiagnosticDefinition = {
    code: "VF2500",
    title: "TooManyErrors",
    messageTemplate: "Too many parse errors ({count}). Stopping.",
    severity: "error",
    phase: "parser",
    category: "general",
    explanation:
        "The parser encountered too many errors and stopped. " +
        "Fix the earlier errors first - they often cause cascading errors later in the file.",
    example: {
        bad: "let x =\nlet y =\nlet z =",
        good: "let x = 1\nlet y = 2\nlet z = 3",
        description: "Fixed multiple incomplete declarations",
    },
};

export const VF2501: DiagnosticDefinition = {
    code: "VF2501",
    title: "ExpectedToken",
    messageTemplate: "Expected {expected}, but found {actual}",
    severity: "error",
    phase: "parser",
    category: "general",
    explanation:
        "The parser expected a specific token at this position but found something else. " +
        "This is a general syntax error that can occur in various contexts.",
    example: {
        bad: "let x 42",
        good: "let x = 42",
        description: "Added the expected '=' token",
    },
};

export const generalCodes: readonly DiagnosticDefinition[] = [VF2500, VF2501];
