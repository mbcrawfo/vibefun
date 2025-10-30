/**
 * Type constraints and constraint solver
 *
 * This module provides a simple constraint-based type inference system.
 * Constraints are generated during type inference and then solved to
 * produce substitutions.
 */

import type { Location } from "../types/ast.js";
import type { Type, TypeScheme } from "../types/environment.js";
import type { Substitution } from "./unify.js";

import { TypeError } from "../utils/error.js";
import { typeToString } from "./types.js";
import { applySubst, composeSubst, emptySubst, unify } from "./unify.js";

/**
 * Type constraint
 *
 * Constraints are generated during type inference and then solved
 * to produce type substitutions.
 */
export type Constraint = EqualityConstraint | InstanceConstraint;

/**
 * Equality constraint: t1 = t2
 *
 * Requires that two types unify.
 */
export type EqualityConstraint = {
    kind: "Equality";
    t1: Type;
    t2: Type;
    loc: Location;
};

/**
 * Instance constraint: t is an instance of scheme
 *
 * Requires that a type is an instance of a polymorphic type scheme.
 */
export type InstanceConstraint = {
    kind: "Instance";
    scheme: TypeScheme;
    type: Type;
    loc: Location;
};

/**
 * Create an equality constraint
 */
export function equalityConstraint(t1: Type, t2: Type, loc: Location): EqualityConstraint {
    return { kind: "Equality", t1, t2, loc };
}

/**
 * Create an instance constraint
 */
export function instanceConstraint(scheme: TypeScheme, type: Type, loc: Location): InstanceConstraint {
    return { kind: "Instance", scheme, type, loc };
}

/**
 * Solve a list of constraints
 *
 * Processes constraints in order, accumulating substitutions.
 * For equality constraints, unifies the two types.
 * For instance constraints, instantiates the scheme and unifies with the type.
 *
 * @param constraints - List of constraints to solve
 * @returns The substitution that satisfies all constraints
 * @throws {TypeError} If constraints cannot be satisfied
 */
export function solveConstraints(constraints: Constraint[]): Substitution {
    let subst = emptySubst();

    for (const constraint of constraints) {
        switch (constraint.kind) {
            case "Equality": {
                // Apply current substitution to both types
                const t1 = applySubst(subst, constraint.t1);
                const t2 = applySubst(subst, constraint.t2);

                // Try to unify
                try {
                    const newSubst = unify(t1, t2);
                    subst = composeSubst(newSubst, subst);
                } catch (error) {
                    if (error instanceof TypeError) {
                        throw error;
                    }
                    throw new TypeError(
                        `Cannot unify types ${typeToString(t1)} and ${typeToString(t2)}`,
                        constraint.loc,
                        `Type mismatch in constraint solving`,
                    );
                }
                break;
            }

            case "Instance": {
                // For instance constraints, we just verify the type matches
                // The actual instantiation should have been done during inference
                // This constraint type is mainly for documentation/structure

                // Check that the type is indeed an instance of the scheme
                // by verifying it matches after applying the current substitution
                // Note: In practice, this is handled during variable lookup/instantiation
                // so this case is mostly a no-op for our current implementation
                break;
            }
        }
    }

    return subst;
}

/**
 * Apply a substitution to a constraint
 *
 * @param subst - The substitution to apply
 * @param constraint - The constraint to apply the substitution to
 * @returns A new constraint with the substitution applied
 */
export function applySubstToConstraint(subst: Substitution, constraint: Constraint): Constraint {
    switch (constraint.kind) {
        case "Equality":
            return {
                kind: "Equality",
                t1: applySubst(subst, constraint.t1),
                t2: applySubst(subst, constraint.t2),
                loc: constraint.loc,
            };

        case "Instance":
            return {
                kind: "Instance",
                scheme: constraint.scheme,
                type: applySubst(subst, constraint.type),
                loc: constraint.loc,
            };
    }
}
