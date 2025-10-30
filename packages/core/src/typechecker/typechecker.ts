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
import { createContext, inferExpr, instantiate } from "./infer.js";
import { checkPattern } from "./patterns.js";

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
    // Build type environment from module declarations
    // This includes built-ins, user type definitions, and external declarations
    // Note: CoreModule is structurally compatible with Module for buildEnvironment's purposes
    const env = buildEnvironment(module as unknown as Module);

    // Map to store inferred types for top-level declarations
    const declarationTypes = new Map<string, Type>();

    // Type check each top-level declaration
    for (const decl of module.declarations) {
        typeCheckDeclaration(decl, env, declarationTypes);
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
 */
function typeCheckDeclaration(decl: CoreDeclaration, env: TypeEnv, declarationTypes: Map<string, Type>): void {
    switch (decl.kind) {
        case "CoreLetDecl": {
            // Type check let declaration by inferring the value expression
            const ctx = createContext(env);

            // Infer the type of the value expression
            const result = inferExpr(ctx, decl.value);

            // Check the pattern and get variable bindings
            const patternResult = checkPattern(ctx.env, decl.pattern, result.type, result.subst, ctx.level);

            // Store the inferred types for all pattern variables
            for (const [name, type] of patternResult.bindings) {
                declarationTypes.set(name, type);
            }
            break;
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
                    }
                }
            }
            break;
        }

        case "CoreTypeDecl":
            // Type declarations are already processed in buildEnvironment
            // Nothing to do here
            break;

        case "CoreExternalDecl":
            // External declarations are processed in buildEnvironment
            // but we need to store them in declarationTypes
            {
                const binding = env.values.get(decl.name);
                if (binding) {
                    if (binding.kind === "Value" || binding.kind === "External") {
                        const type = instantiate(binding.scheme, 0);
                        declarationTypes.set(decl.name, type);
                    }
                }
            }
            break;

        case "CoreExternalTypeDecl":
            // External type declarations are already processed in buildEnvironment
            // Nothing to do here
            break;

        case "CoreImportDecl":
            // Import declarations are trusted (not verified in this phase)
            // Nothing to do here
            break;

        default: {
            const _exhaustive: never = decl;
            throw new Error(`Unknown declaration kind: ${(_exhaustive as CoreDeclaration).kind}`);
        }
    }
}
