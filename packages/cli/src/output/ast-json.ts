/**
 * AST JSON serialization for --emit modes
 *
 * Provides JSON output for surface AST and typed AST.
 */

import type { Module, TypedModule } from "@vibefun/core";

import { typeToString } from "@vibefun/core";

/**
 * Output structure for AST JSON
 */
export interface AstOutput {
    /** Source filename */
    readonly filename: string;
    /** Number of declarations */
    readonly declarationCount: number;
    /** The AST module */
    readonly ast: unknown;
}

/**
 * Output structure for typed AST JSON
 */
export interface TypedAstOutput {
    /** Source filename */
    readonly filename: string;
    /** Number of declarations */
    readonly declarationCount: number;
    /** The typed AST module */
    readonly ast: unknown;
    /** Top-level declaration types */
    readonly types: Record<string, string>;
}

/**
 * Serialize a surface AST to JSON
 */
export function serializeSurfaceAst(module: Module, filename: string): string {
    const output: AstOutput = {
        filename,
        declarationCount: module.declarations.length,
        ast: sanitizeForJson(module),
    };

    return JSON.stringify(output, null, 2);
}

/**
 * Serialize a typed AST to JSON
 */
export function serializeTypedAst(typedModule: TypedModule, filename: string): string {
    // Convert declaration types map to object with formatted type strings
    const types: Record<string, string> = {};
    for (const [name, type] of typedModule.declarationTypes) {
        types[name] = typeToString(type);
    }

    const output: TypedAstOutput = {
        filename,
        declarationCount: typedModule.module.declarations.length,
        ast: sanitizeForJson(typedModule.module),
        types,
    };

    return JSON.stringify(output, null, 2);
}

/**
 * Count nodes in a surface AST module
 *
 * For simplicity, this counts the module plus all declarations.
 * A full recursive count is complex due to AST node variety.
 */
export function countNodes(module: Module): number {
    // Simple count: module + declarations
    return 1 + module.declarations.length;
}

/**
 * Sanitize an object for JSON serialization
 *
 * Removes properties that can't be serialized (functions, symbols)
 * and converts Maps/Sets to arrays/objects.
 */
function sanitizeForJson(obj: unknown): unknown {
    if (obj === null || obj === undefined) {
        return obj;
    }

    if (typeof obj === "function" || typeof obj === "symbol") {
        return undefined;
    }

    if (typeof obj !== "object") {
        return obj;
    }

    if (obj instanceof Map) {
        const result: Record<string, unknown> = {};
        for (const [key, value] of obj) {
            if (typeof key === "string") {
                result[key] = sanitizeForJson(value);
            }
        }
        return result;
    }

    if (obj instanceof Set) {
        return Array.from(obj).map(sanitizeForJson);
    }

    if (Array.isArray(obj)) {
        return obj.map(sanitizeForJson);
    }

    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
        const sanitized = sanitizeForJson(value);
        if (sanitized !== undefined) {
            result[key] = sanitized;
        }
    }
    return result;
}
