/**
 * Main type checker entry point
 *
 * This module provides the main typeCheck() function that performs
 * Hindley-Milner type inference on a desugared CoreModule.
 */

import type { Module } from "../types/ast.js";
import type { CoreDeclaration, CoreModule } from "../types/core-ast.js";
import type { Type, TypeEnv } from "../types/environment.js";

import { buildEnvironment } from "./environment.js";
import { convertTypeExpr, createContext, inferExpr } from "./infer/index.js";
import { checkPattern } from "./patterns.js";
import { freshTypeVar } from "./types.js";
import { applySubst, composeSubst, unify } from "./unify.js";

// Re-export UnifyContext for consumers
export type { UnifyContext } from "./unify.js";

/**
 * Options for type checking
 */
export interface TypeCheckOptions {
    /** Source code (optional, for error formatting) */
    readonly source?: string;
}

/**
 * A typed module with inferred types attached to expressions
 */
export type TypedModule = {
    /** The original module */
    module: CoreModule;
    /** The final type environment */
    env: TypeEnv;
    /** Type annotations for top-level declarations */
    declarationTypes: Map<string, Type>;
};

/**
 * Type check a CoreModule
 *
 * This is the main entry point for type checking. It takes a desugared
 * CoreModule and performs Hindley-Milner type inference on all declarations.
 *
 * @param module - The desugared CoreModule to type check
 * @param options - Optional type checking options (source for error formatting)
 * @returns A TypedModule with inferred types
 * @throws VibefunDiagnostic if type checking fails
 *
 * @example
 * ```typescript
 * const module = parseAndDesugar(source);
 * const typedModule = typeCheck(module, { source });
 * ```
 */
export function typeCheck(module: CoreModule, _options?: TypeCheckOptions): TypedModule {
    // Note: options.source will be used in future phases for error formatting
    // Build initial type environment from module declarations
    // This includes built-ins, user type definitions, and external declarations
    // Note: CoreModule is structurally compatible with Module for buildEnvironment's purposes
    let env = buildEnvironment(module as unknown as Module);

    // Map to store inferred types for top-level declarations
    const declarationTypes = new Map<string, Type>();

    // Type check each top-level declaration, threading environment
    for (const decl of module.declarations) {
        env = typeCheckDeclaration(decl, env, declarationTypes);
    }

    return {
        module,
        env,
        declarationTypes,
    };
}

/**
 * Type check a single top-level declaration
 *
 * @param decl - The declaration to type check
 * @param env - The type environment
 * @param declarationTypes - Map to store inferred types
 * @returns Updated type environment with new bindings
 */
function typeCheckDeclaration(decl: CoreDeclaration, env: TypeEnv, declarationTypes: Map<string, Type>): TypeEnv {
    switch (decl.kind) {
        case "CoreLetDecl": {
            // Type check let declaration by inferring the value expression
            const ctx = createContext(env);

            // Check if this is a recursive binding
            if (decl.recursive && decl.pattern.kind === "CoreVarPattern") {
                // Handle recursive binding
                const name = decl.pattern.name;

                // Create placeholder type for recursive reference
                const placeholderType = freshTypeVar(ctx.level);

                // Create temporary environment with binding in scope
                const tempEnv: TypeEnv = {
                    values: new Map(ctx.env.values),
                    types: ctx.env.types,
                };
                tempEnv.values.set(name, {
                    kind: "Value",
                    scheme: { vars: [], type: placeholderType },
                    loc: decl.loc,
                });

                // Infer with name in scope
                const result = inferExpr({ ...ctx, env: tempEnv }, decl.value);

                // Unify placeholder with inferred type
                const unifyCtx = { loc: decl.loc };
                const unifySubst = unify(applySubst(result.subst, placeholderType), result.type, unifyCtx);
                const finalSubst = composeSubst(unifySubst, result.subst);
                const finalType = applySubst(finalSubst, result.type);

                // Create updated environment with new binding
                const newEnv: TypeEnv = {
                    values: new Map(env.values),
                    types: env.types,
                };

                // Store the inferred type and add to environment
                declarationTypes.set(name, finalType);
                newEnv.values.set(name, {
                    kind: "Value",
                    scheme: { vars: [], type: finalType },
                    loc: decl.loc,
                });

                return newEnv;
            } else {
                // Handle non-recursive binding
                const result = inferExpr(ctx, decl.value);

                // Check the pattern and get variable bindings
                const patternResult = checkPattern(ctx.env, decl.pattern, result.type, result.subst, ctx.level);

                // Create updated environment with new bindings
                const newEnv: TypeEnv = {
                    values: new Map(env.values),
                    types: env.types,
                };

                // Store the inferred types and add to environment
                for (const [name, type] of patternResult.bindings) {
                    declarationTypes.set(name, type);
                    // Add binding to environment for subsequent declarations
                    newEnv.values.set(name, {
                        kind: "Value",
                        scheme: { vars: [], type },
                        loc: decl.loc,
                    });
                }

                return newEnv;
            }
        }

        case "CoreLetRecGroup": {
            // Type check mutually recursive function group
            // Inline the mutual recursion logic instead of using synthetic expression
            const ctx = createContext(env);

            // Create placeholder types for all bindings
            const placeholders = new Map<string, Type>();
            const tempEnv: TypeEnv = {
                values: new Map(ctx.env.values),
                types: ctx.env.types,
            };

            // Add all bindings with placeholder types to temporary environment
            for (const binding of decl.bindings) {
                if (binding.pattern.kind === "CoreVarPattern") {
                    const name = binding.pattern.name;
                    const placeholder = freshTypeVar(ctx.level);
                    placeholders.set(name, placeholder);
                    tempEnv.values.set(name, {
                        kind: "Value",
                        scheme: { vars: [], type: placeholder },
                        loc: binding.loc,
                    });
                }
            }

            // Infer each binding with all names in scope
            let currentSubst = ctx.subst;
            const inferredTypes = new Map<string, Type>();

            for (const binding of decl.bindings) {
                if (binding.pattern.kind === "CoreVarPattern") {
                    const name = binding.pattern.name;
                    const inferCtx = {
                        env: tempEnv,
                        subst: currentSubst,
                        level: ctx.level + 1,
                    };

                    // Infer the binding value
                    const result = inferExpr(inferCtx, binding.value);

                    // Unify placeholder with inferred type
                    const placeholder = placeholders.get(name);
                    if (placeholder) {
                        const placeholderApplied = applySubst(result.subst, placeholder);
                        const unifyCtx = { loc: binding.loc };
                        const unifySubst = unify(placeholderApplied, result.type, unifyCtx);
                        currentSubst = composeSubst(unifySubst, result.subst);

                        // Store the inferred type
                        const finalType = applySubst(currentSubst, result.type);
                        inferredTypes.set(name, finalType);
                    }
                }
            }

            // Create updated environment with new bindings
            const newEnv: TypeEnv = {
                values: new Map(env.values),
                types: env.types,
            };

            // Store all bindings in declarationTypes and environment
            for (const [name, type] of inferredTypes) {
                declarationTypes.set(name, type);
                newEnv.values.set(name, {
                    kind: "Value",
                    scheme: { vars: [], type },
                    loc: decl.loc,
                });
            }

            return newEnv;
        }

        case "CoreTypeDecl":
            // Type declarations are already processed in buildEnvironment
            // Nothing to do here, return unchanged environment
            return env;

        case "CoreExternalDecl": {
            // External declarations need to be converted and stored in declarationTypes
            // Convert the CoreTypeExpr to a Type
            const type = convertTypeExpr(decl.typeExpr);
            declarationTypes.set(decl.name, type);

            // Create updated environment with external binding
            const newEnv: TypeEnv = {
                values: new Map(env.values),
                types: env.types,
            };

            newEnv.values.set(decl.name, {
                kind: "External",
                scheme: { vars: [], type },
                jsName: decl.jsName,
                ...(decl.from !== undefined && { from: decl.from }),
                loc: decl.loc,
            });

            return newEnv;
        }

        case "CoreExternalTypeDecl":
            // External type declarations are already processed in buildEnvironment
            // Nothing to do here, return unchanged environment
            return env;

        case "CoreImportDecl":
            // Import declarations are trusted (not verified in this phase)
            // Nothing to do here, return unchanged environment
            return env;

        default: {
            const _exhaustive: never = decl;
            throw new Error(`Unknown declaration kind: ${(_exhaustive as CoreDeclaration).kind}`);
        }
    }
}
