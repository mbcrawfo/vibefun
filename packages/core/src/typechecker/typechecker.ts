/**
 * Main type checker entry point
 *
 * This module provides the main typeCheck() function that performs
 * Hindley-Milner type inference on a desugared CoreModule.
 */

import type { Module } from "../types/ast.js";
import type { CoreDeclaration, CoreExpr, CoreModule } from "../types/core-ast.js";
import type { Type, TypeEnv } from "../types/environment.js";

import { buildEnvironment } from "./environment.js";
import { convertTypeExpr, createContext, inferExpr, instantiate } from "./infer.js";
import { checkPattern } from "./patterns.js";
import { freshTypeVar } from "./types.js";
import { applySubst, composeSubst, unify } from "./unify.js";

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
 * @returns A TypedModule with inferred types
 * @throws TypeCheckerError if type checking fails
 *
 * @example
 * ```typescript
 * const module = parseAndDesugar(source);
 * const typedModule = typeCheck(module);
 * ```
 */
export function typeCheck(module: CoreModule): TypedModule {
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
                const unifySubst = unify(applySubst(result.subst, placeholderType), result.type);
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
            // Wrap in a synthetic let rec expression and infer
            const ctx = createContext(env);

            // Create a synthetic expression for the let rec group
            const letRecExpr: CoreExpr = {
                kind: "CoreLetRecExpr",
                bindings: decl.bindings,
                body: {
                    kind: "CoreUnitLit",
                    loc: decl.loc,
                },
                loc: decl.loc,
            };

            // Infer the let rec expression (this updates the environment)
            inferExpr(ctx, letRecExpr);

            // Create updated environment with new bindings
            const newEnv: TypeEnv = {
                values: new Map(env.values),
                types: env.types,
            };

            // Extract the inferred types from the updated environment
            for (const binding of decl.bindings) {
                // Get pattern variables
                if (binding.pattern.kind === "CoreVarPattern") {
                    const name = binding.pattern.name;
                    const bindingScheme = ctx.env.values.get(name);
                    if (bindingScheme && bindingScheme.kind === "Value") {
                        // Instantiate the scheme to get a concrete type
                        const type = instantiate(bindingScheme.scheme, 0);
                        declarationTypes.set(name, type);
                        // Add binding to environment for subsequent declarations
                        newEnv.values.set(name, bindingScheme);
                    }
                }
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
