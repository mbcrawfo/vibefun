/**
 * Type checker error classes and formatting utilities
 *
 * NOTE: This file is being deprecated. New code should use the unified
 * diagnostics system in packages/core/src/diagnostics/. The factory
 * functions here will be removed in a future phase.
 */

import type { Location } from "../types/ast.js";
import type { Type, TypeScheme } from "../types/environment.js";

// Import typeToString and typeSchemeToString from the new format module for use in factory functions
import { findSimilarStrings, typeSchemeToString, typeToString } from "./format.js";

// Re-export formatting functions from the new location
export { findSimilarStrings, levenshteinDistance, typeSchemeToString, typeToString } from "./format.js";

/**
 * Base error class for type checker errors
 */
export class TypeCheckerError extends Error {
    constructor(
        message: string,
        public readonly loc: Location,
        public readonly hint?: string,
    ) {
        super(message);
        this.name = "TypeCheckerError";
    }

    /**
     * Format the error for display
     */
    format(): string {
        const parts: string[] = [];

        // Error header with location
        parts.push(`Type error at ${this.loc.file}:${this.loc.line}:${this.loc.column}`);

        // Main error message
        parts.push(`  ${this.message}`);

        // Optional hint
        if (this.hint) {
            parts.push(`  Hint: ${this.hint}`);
        }

        return parts.join("\n");
    }
}

/**
 * Create a type mismatch error
 */
export function createTypeMismatchError(
    expected: Type,
    actual: Type,
    loc: Location,
    context?: string,
): TypeCheckerError {
    const message = context
        ? `Type mismatch in ${context}: expected ${typeToString(expected)}, got ${typeToString(actual)}`
        : `Type mismatch: expected ${typeToString(expected)}, got ${typeToString(actual)}`;

    return new TypeCheckerError(message, loc);
}

/**
 * Create an undefined variable error
 */
export function createUndefinedVariableError(
    name: string,
    loc: Location,
    suggestions: string[] = [],
): TypeCheckerError {
    const message = `Undefined variable '${name}'`;
    const hint = suggestions.length > 0 ? `Did you mean: ${suggestions.join(", ")}?` : undefined;

    return new TypeCheckerError(message, loc, hint);
}

/**
 * Create a non-exhaustive pattern match error
 */
export function createNonExhaustiveError(missingCases: string[], loc: Location): TypeCheckerError {
    const message = `Non-exhaustive pattern match. Missing cases: ${missingCases.join(", ")}`;
    const hint = "Consider adding a wildcard pattern (_) to handle all remaining cases";

    return new TypeCheckerError(message, loc, hint);
}

/**
 * Create an occurs check error (infinite type)
 */
export function createOccursCheckError(typeVar: Type, type: Type, loc: Location): TypeCheckerError {
    const message = `Cannot construct infinite type: ${typeToString(typeVar)} = ${typeToString(type)}`;
    const hint = "This would create an infinite type. Consider adding a type annotation to clarify your intent.";

    return new TypeCheckerError(message, loc, hint);
}

/**
 * Create an overload resolution error
 */
export function createOverloadError(
    funcName: string,
    arity: number,
    overloads: TypeScheme[],
    loc: Location,
): TypeCheckerError {
    const message = `No matching overload for '${funcName}' with ${arity} argument${arity === 1 ? "" : "s"}`;

    const overloadStrings = overloads.map((scheme) => typeSchemeToString(scheme));
    const hint = `Available overloads:\n  - ${overloadStrings.join("\n  - ")}`;

    return new TypeCheckerError(message, loc, hint);
}

/**
 * Create an error for undefined type
 */
export function createUndefinedTypeError(name: string, loc: Location): TypeCheckerError {
    const message = `Undefined type '${name}'`;
    return new TypeCheckerError(message, loc);
}

/**
 * Create an error for missing record field
 */
export function createMissingFieldError(fieldName: string, recordType: Type, loc: Location): TypeCheckerError {
    const message = `Field '${fieldName}' does not exist on type ${typeToString(recordType)}`;

    let hint: string | undefined;
    if (recordType.type === "Record") {
        const fields = Array.from(recordType.fields.keys());
        const suggestions = findSimilarStrings(fieldName, fields);
        if (suggestions.length > 0) {
            hint = `Did you mean: ${suggestions.join(", ")}?`;
        }
    }

    return new TypeCheckerError(message, loc, hint);
}

/**
 * Create an error for accessing field on non-record
 */
export function createNonRecordAccessError(actualType: Type, loc: Location): TypeCheckerError {
    const message = `Cannot access field on non-record type ${typeToString(actualType)}`;
    return new TypeCheckerError(message, loc);
}

/**
 * Create an error for undefined constructor
 */
export function createUndefinedConstructorError(name: string, loc: Location): TypeCheckerError {
    const message = `Undefined constructor '${name}'`;
    return new TypeCheckerError(message, loc);
}

/**
 * Create an error for wrong number of arguments to constructor
 */
export function createConstructorArityError(
    name: string,
    expected: number,
    actual: number,
    loc: Location,
): TypeCheckerError {
    const message = `Constructor '${name}' expects ${expected} argument${expected === 1 ? "" : "s"}, got ${actual}`;
    return new TypeCheckerError(message, loc);
}

/**
 * Create an error for value restriction violation
 */
export function createValueRestrictionError(bindingName: string, loc: Location): TypeCheckerError {
    const message = `Cannot generalize non-syntactic value in binding '${bindingName}'`;
    const hint =
        "Only variables, lambdas, literals, and constructors can be generalized. Consider adding a type annotation.";

    return new TypeCheckerError(message, loc, hint);
}

/**
 * Create an error for type variable escape
 */
export function createEscapeError(loc: Location): TypeCheckerError {
    const message = "Type variable would escape its scope";
    const hint = "This type contains variables that are not in scope. Consider adding a type annotation.";

    return new TypeCheckerError(message, loc, hint);
}

/**
 * Create an error for invalid guard type
 */
export function createInvalidGuardError(actualType: Type, loc: Location): TypeCheckerError {
    const message = `Pattern guard must have type Bool, got ${typeToString(actualType)}`;
    return new TypeCheckerError(message, loc);
}
