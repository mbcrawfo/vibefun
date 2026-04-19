/**
 * Type inference context and type scheme operations
 *
 * Manages the inference context including type environment,
 * substitutions, and level-based generalization.
 */

import type { Location } from "../../types/ast.js";
import type { Type, TypeEnv, TypeScheme } from "../../types/environment.js";
import type { Substitution, UnifyContext } from "../unify.js";

import { freshTypeVar } from "../types.js";
import { emptySubst } from "../unify.js";

/**
 * Inference context
 *
 * Manages state during type inference including the type environment,
 * current substitution, and level for type variable scoping.
 */
export type InferenceContext = {
    /** Type environment mapping names to type schemes */
    env: TypeEnv;
    /** Current substitution */
    subst: Substitution;
    /** Current level for type variable scoping */
    level: number;
};

/**
 * Inference result
 *
 * The result of type inference includes the inferred type and
 * the updated substitution.
 */
export type InferResult = {
    type: Type;
    subst: Substitution;
};

/**
 * Create a new inference context
 *
 * @param env - The type environment
 * @returns A new inference context
 */
export function createContext(env: TypeEnv): InferenceContext {
    return {
        env,
        subst: emptySubst(),
        level: 0,
    };
}

/**
 * Build a UnifyContext that carries the current environment's type bindings
 * so unify() can transparently expand user-defined aliases and generic
 * record types. Every inference path that constructs a `UnifyContext`
 * should use this helper instead of a bare object literal.
 */
export function unifyCtx(ctx: InferenceContext, loc: Location): UnifyContext {
    return { loc, types: ctx.env.types };
}

/**
 * Instantiate a type scheme by replacing quantified variables with fresh type variables
 *
 * @param scheme - The type scheme to instantiate
 * @param level - The current level for fresh type variables
 * @returns The instantiated type
 */
export function instantiate(scheme: TypeScheme, level: number): Type {
    // Create a mapping from quantified variable IDs to fresh type variables
    const mapping = new Map<number, Type>();
    for (const varId of scheme.vars) {
        mapping.set(varId, freshTypeVar(level));
    }

    // Replace quantified variables in the type
    return substituteTypeVars(scheme.type, mapping);
}

/**
 * Substitute type variables according to a mapping
 *
 * @param type - The type to substitute in
 * @param mapping - Map from variable IDs to replacement types
 * @returns The type with substitutions applied
 */
export function substituteTypeVars(type: Type, mapping: Map<number, Type>): Type {
    switch (type.type) {
        case "Var": {
            const replacement = mapping.get(type.id);
            return replacement ?? type;
        }

        case "Const":
            return type;

        case "Fun":
            return {
                type: "Fun",
                params: type.params.map((p) => substituteTypeVars(p, mapping)),
                return: substituteTypeVars(type.return, mapping),
            };

        case "App":
            return {
                type: "App",
                constructor: substituteTypeVars(type.constructor, mapping),
                args: type.args.map((arg) => substituteTypeVars(arg, mapping)),
            };

        case "Record":
            return {
                type: "Record",
                fields: new Map(
                    Array.from(type.fields.entries()).map(([name, fieldType]) => [
                        name,
                        substituteTypeVars(fieldType, mapping),
                    ]),
                ),
            };

        case "Variant":
            return {
                type: "Variant",
                constructors: new Map(
                    Array.from(type.constructors.entries()).map(([name, types]) => [
                        name,
                        types.map((t) => substituteTypeVars(t, mapping)),
                    ]),
                ),
            };

        case "Union":
            return {
                type: "Union",
                types: type.types.map((t) => substituteTypeVars(t, mapping)),
            };

        case "Tuple":
            return {
                type: "Tuple",
                elements: type.elements.map((t) => substituteTypeVars(t, mapping)),
            };

        case "Ref":
            return {
                type: "Ref",
                inner: substituteTypeVars(type.inner, mapping),
            };

        case "Module":
            return type;

        case "Never":
            return type;
    }
}
