/**
 * Type formatting utilities
 *
 * This module provides functions for converting types and type schemes
 * to human-readable strings for error messages and debugging.
 */

import type { Type, TypeScheme } from "../types/environment.js";

/**
 * Format a type as a readable string
 */
export function typeToString(type: Type): string {
    switch (type.type) {
        case "Const":
            return type.name;

        case "Var":
            return `'${String.fromCharCode(97 + (type.id % 26))}`; // 'a, 'b, 'c, ...

        case "Fun": {
            const firstParam = type.params[0];
            if (!firstParam) {
                throw new Error("Function type must have at least one parameter");
            }
            const paramStr =
                type.params.length === 1 ? typeToString(firstParam) : `(${type.params.map(typeToString).join(", ")})`;
            return `${paramStr} -> ${typeToString(type.return)}`;
        }

        case "App": {
            const ctorStr = typeToString(type.constructor);
            if (type.args.length === 0) {
                return ctorStr;
            }
            return `${ctorStr}<${type.args.map(typeToString).join(", ")}>`;
        }

        case "Record": {
            if (type.fields.size === 0) {
                return "{}";
            }
            const fields = Array.from(type.fields.entries())
                .map(([name, fieldType]) => `${name}: ${typeToString(fieldType)}`)
                .join(", ");
            return `{ ${fields} }`;
        }

        case "Variant": {
            const ctors = Array.from(type.constructors.entries())
                .map(([name, paramTypes]) => {
                    if (paramTypes.length === 0) {
                        return name;
                    }
                    return `${name}(${paramTypes.map(typeToString).join(", ")})`;
                })
                .join(" | ");
            return ctors;
        }

        case "Union":
            return type.types.map(typeToString).join(" | ");

        case "Tuple":
            return `(${type.elements.map(typeToString).join(", ")})`;

        case "Ref":
            return `Ref<${typeToString(type.inner)}>`;

        case "Never":
            return "Never";
    }
}

/**
 * Format a type scheme as a readable string
 */
export function typeSchemeToString(scheme: TypeScheme): string {
    if (scheme.vars.length === 0) {
        return typeToString(scheme.type);
    }

    const vars = scheme.vars.map((id) => `'${String.fromCharCode(97 + (id % 26))}`).join(" ");
    return `forall ${vars}. ${typeToString(scheme.type)}`;
}

/**
 * Find strings similar to the target (using simple Levenshtein distance)
 *
 * @param target - The string to find similar strings for
 * @param candidates - The list of candidate strings to search
 * @param maxDistance - Maximum edit distance to consider (default: 2)
 * @returns Array of similar strings sorted by edit distance
 */
export function findSimilarStrings(target: string, candidates: string[], maxDistance = 2): string[] {
    return candidates
        .map((candidate) => ({
            candidate,
            distance: levenshteinDistance(target, candidate),
        }))
        .filter((item) => item.distance <= maxDistance)
        .sort((a, b) => a.distance - b.distance)
        .map((item) => item.candidate);
}

/**
 * Calculate Levenshtein distance between two strings
 *
 * The Levenshtein distance is the minimum number of single-character edits
 * (insertions, deletions, or substitutions) required to change one string
 * into the other.
 *
 * @param a - First string
 * @param b - Second string
 * @returns The edit distance between the strings
 */
export function levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];

    // Initialize matrix
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
        const row = matrix[0];
        if (row) {
            row[j] = j;
        }
    }

    // Fill matrix
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            const currentRow = matrix[i];
            const prevRow = matrix[i - 1];
            const currentCell = currentRow?.[j - 1];
            const prevDiag = prevRow?.[j - 1];
            const prevUp = prevRow?.[j];

            if (!currentRow || prevDiag === undefined || currentCell === undefined || prevUp === undefined) {
                continue;
            }

            if (b[i - 1] === a[j - 1]) {
                currentRow[j] = prevDiag;
            } else {
                currentRow[j] = Math.min(
                    prevDiag + 1, // substitution
                    currentCell + 1, // insertion
                    prevUp + 1, // deletion
                );
            }
        }
    }

    const lastRow = matrix[b.length];
    const result = lastRow?.[a.length];
    return result ?? 0;
}
