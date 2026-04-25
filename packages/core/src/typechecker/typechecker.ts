/**
 * Main type checker entry point
 *
 * This module provides the main typeCheck() function that performs
 * Hindley-Milner type inference on a desugared CoreModule.
 */

import type { Module } from "../types/ast.js";
import type { CoreDeclaration, CoreModule } from "../types/core-ast.js";
import type { Type, TypeEnv } from "../types/environment.js";

import { throwDiagnostic } from "../diagnostics/index.js";
import { buildEnvironment } from "./environment.js";
import {
    computeBindingScheme,
    convertTypeExpr,
    createContext,
    enforceMutableRefBinding,
    inferExpr,
    propagateSubstAcrossDeclarations,
} from "./infer/index.js";
import { getStdlibModuleSignature, STDLIB_PACKAGE } from "./module-signatures/index.js";
import { checkPattern } from "./patterns.js";
import { registerTypeDeclarations } from "./type-declarations.js";
import { freshTypeVar } from "./types.js";
import { applySubst, composeSubst, unify } from "./unify.js";

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
            // Type check a non-recursive let declaration. Recursive forms
            // (`let rec x = …;` and `let rec x = … and y = …;`) are
            // lowered by the desugarer into `CoreLetRecGroup`, so the
            // typechecker sees only one shape per axis: non-rec
            // (`CoreLetDecl`) vs rec (`CoreLetRecGroup`). See
            // `docs/compiler-architecture/07-let-binding-paths.md`.
            const ctx = createContext(env);

            // Mirror inferLet's flow: bump the level for inference so
            // generalize can identify the type vars introduced inside
            // this RHS, then drop the level back when adding the binding
            // to the env.
            const newLevel = ctx.level + 1;
            const valueCtx = { ...ctx, level: newLevel };
            const result = inferExpr(valueCtx, decl.value);

            // Check the pattern and get variable bindings
            const patternResult = checkPattern(ctx.env, decl.pattern, result.type, result.subst, newLevel);

            // Compose the pattern's substitution onto the inference
            // substitution; both must be applied to existing bindings so
            // constraints learned in this declaration (e.g. `x :=
            // Some(42)` records `t := Int`) carry forward to later
            // declarations, blocking polymorphic ref abuse.
            let finalSubst = composeSubst(patternResult.subst, result.subst);

            // Top-level `let mut x = …` must hold a `Ref<T>`. Without
            // this, `let mut x = 0;` typechecks at module scope even
            // though the equivalent expression-form is rejected.
            finalSubst = enforceMutableRefBinding({
                binding: { mutable: decl.mutable, value: { loc: decl.value.loc } },
                inferredType: result.type,
                subst: finalSubst,
                level: newLevel,
                types: env.types,
            });

            // Substitution learned in this declaration must be baked into
            // earlier `declarationTypes` entries and every existing
            // binding's scheme.
            const newEnv = propagateSubstAcrossDeclarations({
                subst: finalSubst,
                declarationTypes,
                env,
            });

            // Generalise each pattern-bound name's type. The helper skips
            // generalisation for mutable / non-`CoreVarPattern` bindings
            // — the value restriction is already enforced inside
            // `generalize`, but explicit skipping closes the alias-form
            // polymorphic-ref hole that `isSyntacticValue` alone misses
            // (`let mut b = a` with `a: Ref<t>`).
            for (const [name, type] of patternResult.bindings) {
                declarationTypes.set(name, applySubst(finalSubst, type));
                const scheme = computeBindingScheme({
                    binding: { mutable: decl.mutable, value: decl.value, pattern: decl.pattern },
                    inferredType: type,
                    subst: finalSubst,
                    level: newLevel,
                    env: valueCtx.env,
                });
                newEnv.values.set(name, {
                    kind: "Value",
                    scheme,
                    loc: decl.loc,
                });
            }

            return newEnv;
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
                        // group must hold a `Ref<T>`. Without this check,
                        // a mutable recursive binding could slip past
                        // with a non-Ref RHS even though the non-rec
                        // form errors.
                        currentSubst = enforceMutableRefBinding({
                            binding: { mutable: binding.mutable, value: { loc: binding.value.loc } },
                            inferredType: result.type,
                            subst: currentSubst,
                            level: ctx.level + 1,
                            types: env.types,
                        });

                        // Store the inferred type
                        const finalType = applySubst(currentSubst, result.type);
                        inferredTypes.set(name, finalType);
                    }
                }
            }

            // Substitution learned across the let-rec group must be baked
            // into earlier `declarationTypes` entries and every existing
            // binding's scheme. Without this, narrowings discovered while
            // inferring later group members (e.g. `let rec f = g and g =
            // (x: Int) => x` pinning `f`'s placeholder to `Int -> Int`)
            // would be dropped from the outer environment.
            const newEnv = propagateSubstAcrossDeclarations({
                subst: currentSubst,
                declarationTypes,
                env,
            });

            // Store all bindings in declarationTypes and environment.
            // Non-mutable simple-variable bindings generalise so a
            // top-level mutually recursive `let rec id x = x and …` can
            // produce a polymorphic scheme; mutable bindings stay
            // monomorphic (the helper enforces this).
            //
            // `inferredTypes` was built incrementally; each entry has
            // been folded through `currentSubst` only up to the point at
            // which it was inserted. Re-apply the *final* substitution
            // to every entry so bindings settled earlier in the group
            // pick up any narrowings produced later in the same group.
            const bindingByName = new Map<string, (typeof decl.bindings)[number]>();
            for (const binding of decl.bindings) {
                if (binding.pattern.kind === "CoreVarPattern") {
                    bindingByName.set(binding.pattern.name, binding);
                }
            }
            for (const [name, inferredType] of inferredTypes) {
                const type = applySubst(currentSubst, inferredType);
                declarationTypes.set(name, type);
                const binding = bindingByName.get(name);
                if (binding === undefined) {
                    // Defensive: only `CoreVarPattern` bindings are in
                    // both maps, so this branch is unreachable in practice.
                    newEnv.values.set(name, {
                        kind: "Value",
                        scheme: { vars: [], type },
                        loc: decl.loc,
                    });
                    continue;
                }
                const scheme = computeBindingScheme({
                    binding: { mutable: binding.mutable, value: binding.value, pattern: binding.pattern },
                    inferredType,
                    subst: currentSubst,
                    level: ctx.level + 1,
                    env: ctx.env,
                });
                newEnv.values.set(name, {
                    kind: "Value",
                    scheme,
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
