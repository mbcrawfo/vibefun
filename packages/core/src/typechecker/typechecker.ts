/**
 * Main type checker entry point
 *
 * This module provides the main typeCheck() function that performs
 * Hindley-Milner type inference on a desugared CoreModule.
 */

import type { Module } from "../types/ast.js";
import type { CoreDeclaration, CoreModule } from "../types/core-ast.js";
import type { Type, TypeEnv, TypeScheme, ValueBinding } from "../types/environment.js";
import type { Substitution } from "./unify.js";

import { throwDiagnostic, VibefunDiagnostic } from "../diagnostics/index.js";
import { buildEnvironment } from "./environment.js";
import { convertTypeExpr, createContext, generalize, inferExpr } from "./infer/index.js";
import { getStdlibModuleSignature, STDLIB_PACKAGE } from "./module-signatures/index.js";
import { checkPattern } from "./patterns.js";
import { registerTypeDeclarations } from "./type-declarations.js";
import { appType, constType, freshTypeVar } from "./types.js";
import { applySubst, composeSubst, unify } from "./unify.js";

/**
 * Apply a substitution to a type scheme, leaving the scheme's bound
 * variables alone. Bound variables are universally quantified; free
 * type vars in the scheme's body are subject to the substitution.
 */
function applySubstToScheme(subst: Substitution, scheme: TypeScheme): TypeScheme {
    if (scheme.vars.length === 0) {
        return { vars: [], type: applySubst(subst, scheme.type) };
    }
    const filtered = new Map(subst);
    for (const v of scheme.vars) {
        filtered.delete(v);
    }
    return { vars: scheme.vars, type: applySubst(filtered, scheme.type) };
}

/**
 * Apply a substitution to every binding in a value environment so type
 * constraints learned during one top-level declaration's inference
 * propagate to subsequent declarations. Without this, e.g. a series
 * of `x := …` assignments to a non-generalized `Ref<Option<t>>`
 * binding wouldn't accumulate the `t := …` constraint, and the
 * value restriction couldn't reject incompatible later assignments.
 */
function applySubstToValues(subst: Substitution, values: Map<string, ValueBinding>): Map<string, ValueBinding> {
    if (subst.size === 0) {
        // Always return a fresh map: the caller `.set(...)`s on the result
        // and a shared map would mutate the previous environment in place,
        // violating the no-mutate-TypeEnv invariant in
        // packages/core/src/typechecker/CLAUDE.md.
        return new Map(values);
    }
    const out = new Map<string, ValueBinding>();
    for (const [name, binding] of values) {
        if (binding.kind === "Value") {
            out.set(name, { ...binding, scheme: applySubstToScheme(subst, binding.scheme) });
        } else if (binding.kind === "External") {
            out.set(name, { ...binding, scheme: applySubstToScheme(subst, binding.scheme) });
        } else {
            // ExternalOverload schemes are stored as TypeExpr (raw AST), not Type;
            // they can't carry inference-time substitutions.
            out.set(name, binding);
        }
    }
    return out;
}

/**
 * Names that remain ambient for ergonomics (variant constructors) but are
 * still re-exported by @vibefun/std. An explicit import of any of these
 * rebinds the local name to the same scheme already present in the env.
 */
const STDLIB_AMBIENT_REEXPORTS = new Set(["Cons", "Nil", "Some", "None", "Ok", "Err"]);

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

    // First-pass: register user-defined type declarations (aliases, records,
    // variants) so that constructor references and type annotations resolve
    // regardless of declaration order.
    env = registerTypeDeclarations(module, env);

    // Map to store inferred types for top-level declarations
    const declarationTypes = new Map<string, Type>();

    // Process imports before declarations so imported names resolve in scope.
    for (const importDecl of module.imports) {
        env = typeCheckDeclaration(importDecl, env, declarationTypes);
    }

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
                const unifyCtx = { loc: decl.loc, types: env.types };
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
                // Handle non-recursive binding. Mirror inferLet's flow:
                // bump the level for inference so generalize can identify
                // the type vars introduced inside this RHS, then drop
                // the level back when adding the binding to the env.
                const newLevel = ctx.level + 1;
                const valueCtx = { ...ctx, level: newLevel };
                const result = inferExpr(valueCtx, decl.value);

                // Check the pattern and get variable bindings
                const patternResult = checkPattern(ctx.env, decl.pattern, result.type, result.subst, newLevel);

                // Compose the pattern's substitution onto the inference
                // substitution; both must be applied to existing bindings
                // so constraints learned in this declaration (e.g.
                // `x := Some(42)` records `t := Int`) carry forward to
                // later declarations, blocking polymorphic ref abuse.
                let finalSubst = composeSubst(patternResult.subst, result.subst);

                // Top-level `let mut x = …` must hold a `Ref<T>`, mirroring
                // inferLet's VF4018 check at expression level. Without this,
                // `let mut x = 0;` typechecks at module scope even though
                // the equivalent expression-form is rejected.
                if (decl.mutable) {
                    const elemTypeVar = freshTypeVar(newLevel);
                    const expectedRefType = appType(constType("Ref"), [elemTypeVar]);
                    const valueType = applySubst(finalSubst, result.type);
                    try {
                        const refUnifySubst = unify(valueType, expectedRefType, {
                            loc: decl.value.loc,
                            types: env.types,
                        });
                        finalSubst = composeSubst(refUnifySubst, finalSubst);
                    } catch (err) {
                        if (err instanceof VibefunDiagnostic) {
                            throwDiagnostic("VF4018", decl.value.loc, {});
                        }
                        throw err;
                    }
                }

                // Substitution learned in this declaration must also be
                // baked into earlier `declarationTypes` entries —
                // otherwise `--emit typed-ast` can show a stale type for
                // an earlier binding even though `env.values` already
                // tracks the narrowed shape.
                for (const [name, type] of declarationTypes) {
                    declarationTypes.set(name, applySubst(finalSubst, type));
                }

                // Create updated environment with substitution baked into
                // every existing binding's scheme.
                const newEnv: TypeEnv = {
                    values: applySubstToValues(finalSubst, env.values),
                    types: env.types,
                };

                // Generalize each pattern-bound name's type. Use the
                // bumped-level context so generalize captures the vars
                // introduced inside this RHS.
                //
                // Two extra rules keep the value restriction sound:
                //   - Mutable bindings (`let mut x = …`) must stay
                //     monomorphic — generalizing a `Ref<t>` would let
                //     subsequent `:=` assignments instantiate `t`
                //     independently and re-open the polymorphic-ref
                //     hole, *including* the alias case `let mut b = a`
                //     where the RHS is itself a syntactic value.
                //   - Non-`CoreVarPattern` bindings (tuple destructuring,
                //     wildcard) inherit the restriction by analogy with
                //     `inferLet`'s body-env construction; the spec
                //     reserves let-polymorphism for plain variable
                //     bindings.
                const generalizeCtx = { ...valueCtx, subst: finalSubst };
                const skipGeneralize = decl.mutable || decl.pattern.kind !== "CoreVarPattern";
                for (const [name, type] of patternResult.bindings) {
                    const appliedType = applySubst(finalSubst, type);
                    declarationTypes.set(name, appliedType);
                    const scheme = skipGeneralize
                        ? { vars: [], type: appliedType }
                        : generalize(generalizeCtx, appliedType, decl.value);
                    newEnv.values.set(name, {
                        kind: "Value",
                        scheme,
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
                        ...ctx,
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
                        const unifyCtx = { loc: binding.loc, types: env.types };
                        const unifySubst = unify(placeholderApplied, result.type, unifyCtx);
                        currentSubst = composeSubst(unifySubst, result.subst);

                        // Mutable bindings inside a top-level let-rec
                        // group must hold a `Ref<T>` (mirrors VF4018 in
                        // inferLet). Without this check, a mutable
                        // recursive binding could slip past with a
                        // non-Ref RHS even though the non-recursive
                        // form errors.
                        if (binding.mutable) {
                            const elemTypeVar = freshTypeVar(ctx.level + 1);
                            const expectedRefType = appType(constType("Ref"), [elemTypeVar]);
                            const valueType = applySubst(currentSubst, result.type);
                            try {
                                const refUnifySubst = unify(valueType, expectedRefType, unifyCtx);
                                currentSubst = composeSubst(refUnifySubst, currentSubst);
                            } catch (err) {
                                if (err instanceof VibefunDiagnostic) {
                                    throwDiagnostic("VF4018", binding.loc, {});
                                }
                                throw err;
                            }
                        }

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

        case "CoreImportDecl": {
            const newEnv: TypeEnv = {
                values: new Map(env.values),
                types: env.types,
            };

            // For non-stdlib imports (relative paths, other packages),
            // we bind each imported name to a fresh polymorphic type
            // variable. This is deliberately unsound as a transitional
            // position: the multi-file CLI pipeline is wired (phase 2.9)
            // but cross-module export tracking lives in a later phase.
            // The bind still lets user programs compile and run; runtime
            // errors surface if the imported name doesn't actually exist
            // in the target module.
            if (decl.from !== STDLIB_PACKAGE) {
                for (const item of decl.items) {
                    if (item.isType) continue;
                    const boundName = item.alias ?? item.name;
                    // Monomorphic placeholder. If this were polymorphic
                    // every lookup site would get a fresh instantiation,
                    // so `foo 1` and `foo "x"` would both typecheck in
                    // the same module — turning the fallback from
                    // "unknown but consistent" into "accept anything".
                    // Keep it rank-0 until cross-module export tracking
                    // lands in a later phase.
                    const tvar = freshTypeVar(0);
                    newEnv.values.set(boundName, {
                        kind: "Value",
                        scheme: { vars: [], type: tvar },
                        loc: decl.loc,
                    });
                }
                return newEnv;
            }

            for (const item of decl.items) {
                // Type-only imports don't introduce value bindings.
                if (item.isType) continue;

                const boundName = item.alias ?? item.name;

                // First: is it a known stdlib module (String, List, ...)?
                const moduleSig = getStdlibModuleSignature(item.name);
                if (moduleSig !== null) {
                    newEnv.values.set(boundName, {
                        kind: "Value",
                        scheme: { vars: [], type: moduleSig },
                        loc: decl.loc,
                    });
                    continue;
                }

                // Second: is it an ambient re-export (variant constructor)?
                if (STDLIB_AMBIENT_REEXPORTS.has(item.name)) {
                    const existing = env.values.get(item.name);
                    if (existing !== undefined) {
                        newEnv.values.set(boundName, {
                            ...existing,
                            loc: decl.loc,
                        });
                        continue;
                    }
                }

                // Not exported by @vibefun/std.
                throwDiagnostic("VF5001", decl.loc, {
                    name: item.name,
                    path: decl.from,
                });
            }

            return newEnv;
        }

        case "CoreReExportDecl":
            // Re-exports introduce no local bindings. Dependency ordering
            // is handled by the module resolver, and codegen emits the
            // `export … from` statement; cross-module type checking is
            // deferred with regular imports.
            return env;

        default: {
            const _exhaustive: never = decl;
            throw new Error(`Unknown declaration kind: ${(_exhaustive as CoreDeclaration).kind}`);
        }
    }
}
