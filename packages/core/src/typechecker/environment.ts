/**
 * Type environment builder
 *
 * Scans module declarations and builds a type environment,
 * detecting and grouping external function overloads.
 */

import type { Declaration, Module, TypeExpr } from "../types/ast.js";
import type { ExternalOverload, TypeEnv, ValueBinding } from "../types/environment.js";

import { emptyEnv } from "../types/environment.js";
import { TypeError } from "../utils/error.js";
import { getBuiltinEnv } from "./builtins.js";

/**
 * Build type environment from a module
 *
 * This function scans all declarations in a module and builds a type environment.
 * It detects external functions with multiple declarations (overloads) and groups
 * them into ExternalOverload bindings.
 *
 * The environment starts with built-in types and functions, then adds module declarations.
 *
 * @param module - The parsed module
 * @returns The type environment with built-ins and module declarations
 * @throws {TypeError} If overload declarations are invalid
 */
export function buildEnvironment(module: Module): TypeEnv {
    const env = emptyEnv();

    // Inject built-in types and standard library functions
    const builtins = getBuiltinEnv();
    for (const [name, scheme] of builtins.entries()) {
        env.values.set(name, {
            kind: "Value",
            scheme,
            loc: { file: "<builtin>", line: 0, column: 0, offset: 0 },
        });
    }

    // First pass: collect all declarations by name
    const declarationsByName = groupDeclarationsByName(module);

    // Second pass: process each group
    for (const [name, declarations] of declarationsByName.entries()) {
        if (declarations.length === 1) {
            // Single declaration - add directly
            const decl = declarations[0];
            if (decl) {
                addSingleDeclaration(env, decl);
            }
        } else {
            // Multiple declarations - check if they're all external with same jsName
            processOverloadGroup(env, name, declarations);
        }
    }

    return env;
}

/**
 * Group declarations by name for overload detection
 *
 * This includes:
 * - External declarations (ExternalDecl)
 * - External block items (from ExternalBlock)
 *
 * Note: We only group externals. Let declarations with duplicate names
 * would be an error (handled later by type checker).
 */
function groupDeclarationsByName(module: Module): Map<string, Declaration[]> {
    const groups = new Map<string, Declaration[]>();

    for (const decl of module.declarations) {
        if (decl.kind === "ExternalDecl") {
            // Single external declaration
            const existing = groups.get(decl.name) ?? [];
            existing.push(decl);
            groups.set(decl.name, existing);
        } else if (decl.kind === "ExternalBlock") {
            // External block - expand items
            for (const item of decl.items) {
                if (item.kind === "ExternalValue") {
                    // Create a synthetic ExternalDecl for the item
                    const syntheticDecl: Declaration = {
                        kind: "ExternalDecl",
                        name: item.name,
                        typeExpr: item.typeExpr,
                        jsName: item.jsName,
                        ...(decl.from !== undefined && { from: decl.from }),
                        exported: decl.exported,
                        loc: item.loc,
                    };
                    const existing = groups.get(item.name) ?? [];
                    existing.push(syntheticDecl);
                    groups.set(item.name, existing);
                }
                // Note: ExternalType items are handled separately (type bindings)
            }
        } else {
            // Other declarations (LetDecl, TypeDecl, etc.) are not grouped
            // They will be processed individually in the future
        }
    }

    return groups;
}

/**
 * Add a single (non-overloaded) declaration to the environment
 */
function addSingleDeclaration(env: TypeEnv, decl: Declaration): void {
    if (decl.kind === "ExternalDecl") {
        // For now, we just track that it exists as a single external
        // Full type scheme construction will happen when type checker is implemented
        const binding: ValueBinding = {
            kind: "External",
            scheme: {
                vars: [], // No quantified variables for now
                type: { type: "Const", name: "Unknown" }, // Placeholder
            },
            jsName: decl.jsName,
            ...(decl.from !== undefined && { from: decl.from }),
            loc: decl.loc,
        };
        env.values.set(decl.name, binding);
    }
    // TODO: Handle other declaration types (LetDecl, TypeDecl, etc.) when type checker is implemented
}

/**
 * Process a group of declarations with the same name
 *
 * Validates that they're all externals with compatible signatures,
 * then creates an ExternalOverload binding.
 */
function processOverloadGroup(env: TypeEnv, name: string, declarations: Declaration[]): void {
    // Verify all are external declarations
    const externalDecls = declarations.filter(
        (d): d is Declaration & { kind: "ExternalDecl" } => d.kind === "ExternalDecl",
    );

    if (externalDecls.length !== declarations.length) {
        // Some declarations are not external - this is an error
        const firstNonExternal = declarations.find((d) => d.kind !== "ExternalDecl");
        const firstDecl = declarations[0];
        const errorLoc =
            firstNonExternal?.loc ?? (firstDecl ? firstDecl.loc : { file: "unknown", line: 0, column: 0, offset: 0 });
        throw new TypeError(
            `Duplicate declaration for '${name}'`,
            errorLoc,
            `Only external functions can be overloaded. Remove duplicate declaration or use different names.`,
        );
    }

    // Verify all have the same jsName
    const firstDecl = externalDecls[0];
    if (!firstDecl) {
        throw new TypeError(
            `No external declarations found for '${name}'`,
            { file: "unknown", line: 0, column: 0, offset: 0 },
            `Internal error: expected at least one external declaration.`,
        );
    }

    const firstJsName = firstDecl.jsName;
    for (const decl of externalDecls) {
        if (decl.jsName !== firstJsName) {
            throw new TypeError(
                `Overloaded function '${name}' has inconsistent JavaScript names`,
                decl.loc,
                `All overloads must map to the same JavaScript function. ` +
                    `Expected "${firstJsName}", got "${decl.jsName}".`,
            );
        }
    }

    // Verify all have the same 'from' clause (or all undefined)
    const firstFrom = firstDecl.from;
    for (const decl of externalDecls) {
        if (decl.from !== firstFrom) {
            throw new TypeError(
                `Overloaded function '${name}' has inconsistent module imports`,
                decl.loc,
                `All overloads must have the same 'from' clause. ` +
                    `Expected ${firstFrom ? `"${firstFrom}"` : "none"}, got ${decl.from ? `"${decl.from}"` : "none"}.`,
            );
        }
    }

    // Verify all have function types
    for (const decl of externalDecls) {
        if (decl.typeExpr.kind !== "FunctionType") {
            throw new TypeError(
                `Overloaded external '${name}' must have function type`,
                decl.loc,
                `Only functions can be overloaded. This declaration has type '${decl.typeExpr.kind}'.`,
            );
        }
    }

    // Build overload cases
    const overloads: ExternalOverload[] = externalDecls.map((decl) => {
        const funcType = decl.typeExpr as TypeExpr & { kind: "FunctionType" };
        return {
            paramTypes: funcType.params,
            returnType: funcType.return_,
            loc: decl.loc,
        };
    });

    // Create overload binding
    const binding: ValueBinding = {
        kind: "ExternalOverload",
        overloads,
        jsName: firstJsName,
        ...(firstFrom !== undefined && { from: firstFrom }),
        loc: firstDecl.loc,
    };

    env.values.set(name, binding);
}
