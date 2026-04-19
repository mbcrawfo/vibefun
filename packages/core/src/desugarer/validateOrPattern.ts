/**
 * Validation of or-pattern alternatives.
 *
 * Per the language spec (docs/spec/05-pattern-matching/advanced-patterns.md
 * §"Variable Binding in Or-Patterns"), alternatives of an or-pattern must be
 * irrefutable: literals, wildcards, or constructors whose arguments bind no
 * variables. Any `VarPattern` inside an alternative is rejected with VF4403.
 */

import type { Pattern } from "../types/ast.js";

import { throwDiagnostic } from "../diagnostics/index.js";

/**
 * Throws VF4403 at the first variable binding found inside any alternative of
 * the supplied or-pattern. A no-op if every alternative is already irrefutable.
 */
export function validateOrPatternNoBindings(patterns: Pattern[]): void {
    for (const alt of patterns) {
        checkPatternHasNoBindings(alt);
    }
}

function checkPatternHasNoBindings(pattern: Pattern): void {
    if (pattern.kind === "VarPattern") {
        throwDiagnostic("VF4403", pattern.loc, {});
    }
    switch (pattern.kind) {
        case "WildcardPattern":
        case "LiteralPattern":
            return;
        case "ConstructorPattern":
            for (const arg of pattern.args) {
                checkPatternHasNoBindings(arg);
            }
            return;
        case "RecordPattern":
            for (const field of pattern.fields) {
                checkPatternHasNoBindings(field.pattern);
            }
            return;
        case "ListPattern":
            for (const elem of pattern.elements) {
                checkPatternHasNoBindings(elem);
            }
            if (pattern.rest) {
                checkPatternHasNoBindings(pattern.rest);
            }
            return;
        case "TuplePattern":
            for (const elem of pattern.elements) {
                checkPatternHasNoBindings(elem);
            }
            return;
        case "OrPattern":
            for (const alt of pattern.patterns) {
                checkPatternHasNoBindings(alt);
            }
            return;
        case "TypeAnnotatedPattern":
            checkPatternHasNoBindings(pattern.pattern);
            return;
    }
}
