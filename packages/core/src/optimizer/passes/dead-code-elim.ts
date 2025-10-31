/**
 * Dead Code Elimination Optimization Pass
 *
 * Removes unreachable code and unused bindings.
 *
 * Optimizations:
 * - Remove unused let bindings
 * - Eliminate unreachable match branches
 * - Simplify match expressions on known values
 * - Remove code after proven control flow changes
 *
 * Safety:
 * - Preserve side effects (don't eliminate unsafe blocks)
 * - Preserve mutable references (identity matters)
 * - Never optimize inside unsafe blocks
 */

import type { CoreExpr, CoreMatchCase } from "../../types/core-ast.js";

import { containsUnsafe, freeVars } from "../../utils/ast-analysis.js";
import { transformExpr } from "../../utils/ast-transform.js";
import { OptimizationPass } from "../optimization-pass.js";

export class DeadCodeEliminationPass extends OptimizationPass {
    readonly name = "DeadCodeElimination";

    override canApply(expr: CoreExpr): boolean {
        // Never optimize inside unsafe blocks
        return !containsUnsafe(expr);
    }

    override transform(expr: CoreExpr): CoreExpr {
        // Never transform inside unsafe blocks
        if (expr.kind === "CoreUnsafe") {
            return expr;
        }
        return transformExpr(expr, (e) => this.eliminateDeadCode(e));
    }

    private eliminateDeadCode(expr: CoreExpr): CoreExpr {
        // Double-check: never eliminate inside unsafe blocks
        if (expr.kind === "CoreUnsafe") {
            return expr;
        }

        switch (expr.kind) {
            case "CoreLet":
                return this.eliminateDeadLet(expr);
            case "CoreMatch":
                return this.eliminateDeadMatch(expr);
            default:
                return expr;
        }
    }

    /**
     * Eliminate unused let bindings
     */
    private eliminateDeadLet(expr: CoreExpr & { kind: "CoreLet" }): CoreExpr {
        const { pattern, value, body, mutable, recursive } = expr;

        // Never eliminate mutable bindings (identity and side effects matter)
        if (mutable) {
            return expr;
        }

        // Never eliminate recursive bindings (may be used in their own definition)
        if (recursive) {
            return expr;
        }

        // Never eliminate bindings with side effects (unsafe blocks, etc.)
        if (containsUnsafe(value)) {
            return expr;
        }

        // Only eliminate simple variable bindings (not destructuring)
        if (pattern.kind !== "CoreVarPattern") {
            return expr;
        }

        const varName = pattern.name;

        // Check if variable is used in the body
        const freeInBody = freeVars(body);

        if (!freeInBody.has(varName)) {
            // Variable is not used - eliminate the binding
            return body;
        }

        // Variable is used - keep the binding
        return expr;
    }

    /**
     * Eliminate unreachable match branches and simplify known matches
     */
    private eliminateDeadMatch(expr: CoreExpr & { kind: "CoreMatch" }): CoreExpr {
        const { expr: matchExpr, cases } = expr;

        // Simplify match on known literal values
        if (matchExpr.kind === "CoreBoolLit") {
            return this.simplifyBoolMatch(matchExpr.value, cases, expr);
        }

        if (matchExpr.kind === "CoreIntLit") {
            return this.simplifyIntMatch(matchExpr.value, cases, expr);
        }

        if (matchExpr.kind === "CoreStringLit") {
            return this.simplifyStringMatch(matchExpr.value, cases, expr);
        }

        // Simplify match on known variant
        if (matchExpr.kind === "CoreVariant") {
            return this.simplifyVariantMatch(matchExpr.constructor, matchExpr.args, cases, expr);
        }

        // Remove unreachable branches after wildcard (without guard)
        const optimizedCases = this.removeUnreachableCases(cases);

        if (optimizedCases.length !== cases.length) {
            return {
                ...expr,
                cases: optimizedCases,
            };
        }

        return expr;
    }

    /**
     * Simplify match on known boolean
     */
    private simplifyBoolMatch(value: boolean, cases: CoreMatchCase[], fallback: CoreExpr): CoreExpr {
        for (const c of cases) {
            // Check literal pattern
            if (c.pattern.kind === "CoreLiteralPattern") {
                if (typeof c.pattern.literal === "boolean" && c.pattern.literal === value) {
                    // Guard must be true or absent
                    if (!c.guard || (c.guard.kind === "CoreBoolLit" && c.guard.value === true)) {
                        return c.body;
                    }
                }
            }

            // Check variable pattern (matches anything)
            if (c.pattern.kind === "CoreVarPattern") {
                if (!c.guard || (c.guard.kind === "CoreBoolLit" && c.guard.value === true)) {
                    return c.body;
                }
            }

            // Check wildcard pattern (matches anything)
            if (c.pattern.kind === "CoreWildcardPattern") {
                if (!c.guard || (c.guard.kind === "CoreBoolLit" && c.guard.value === true)) {
                    return c.body;
                }
            }
        }

        return fallback;
    }

    /**
     * Simplify match on known integer
     */
    private simplifyIntMatch(value: number, cases: CoreMatchCase[], fallback: CoreExpr): CoreExpr {
        for (const c of cases) {
            // Check literal pattern
            if (c.pattern.kind === "CoreLiteralPattern") {
                if (typeof c.pattern.literal === "number" && c.pattern.literal === value) {
                    if (!c.guard || (c.guard.kind === "CoreBoolLit" && c.guard.value === true)) {
                        return c.body;
                    }
                }
            }

            // Check variable/wildcard pattern (matches anything)
            if (c.pattern.kind === "CoreVarPattern" || c.pattern.kind === "CoreWildcardPattern") {
                if (!c.guard || (c.guard.kind === "CoreBoolLit" && c.guard.value === true)) {
                    return c.body;
                }
            }
        }

        return fallback;
    }

    /**
     * Simplify match on known string
     */
    private simplifyStringMatch(value: string, cases: CoreMatchCase[], fallback: CoreExpr): CoreExpr {
        for (const c of cases) {
            // Check literal pattern
            if (c.pattern.kind === "CoreLiteralPattern") {
                if (typeof c.pattern.literal === "string" && c.pattern.literal === value) {
                    if (!c.guard || (c.guard.kind === "CoreBoolLit" && c.guard.value === true)) {
                        return c.body;
                    }
                }
            }

            // Check variable/wildcard pattern (matches anything)
            if (c.pattern.kind === "CoreVarPattern" || c.pattern.kind === "CoreWildcardPattern") {
                if (!c.guard || (c.guard.kind === "CoreBoolLit" && c.guard.value === true)) {
                    return c.body;
                }
            }
        }

        return fallback;
    }

    /**
     * Simplify match on known variant
     */
    private simplifyVariantMatch(
        constructor: string,
        args: CoreExpr[],
        cases: CoreMatchCase[],
        fallback: CoreExpr,
    ): CoreExpr {
        for (const c of cases) {
            // Check variant pattern
            if (c.pattern.kind === "CoreVariantPattern" && c.pattern.constructor === constructor) {
                // For now, only match if pattern has same number of args
                // Full matching would require binding the args to pattern variables
                if (c.pattern.args.length === args.length) {
                    if (!c.guard || (c.guard.kind === "CoreBoolLit" && c.guard.value === true)) {
                        // TODO: Bind pattern variables to args
                        // For now, only optimize if no bindings needed (all wildcards)
                        const allWildcards = c.pattern.args.every((p) => p.kind === "CoreWildcardPattern");
                        if (allWildcards) {
                            return c.body;
                        }
                    }
                }
            }

            // Check variable/wildcard pattern (matches anything)
            if (c.pattern.kind === "CoreVarPattern" || c.pattern.kind === "CoreWildcardPattern") {
                if (!c.guard || (c.guard.kind === "CoreBoolLit" && c.guard.value === true)) {
                    return c.body;
                }
            }
        }

        return fallback;
    }

    /**
     * Remove cases that are unreachable after a catch-all pattern without guard
     */
    private removeUnreachableCases(cases: CoreMatchCase[]): CoreMatchCase[] {
        const reachable: CoreMatchCase[] = [];

        for (const c of cases) {
            reachable.push(c);

            // If this is a wildcard or variable pattern without a guard,
            // all subsequent patterns are unreachable
            if ((c.pattern.kind === "CoreWildcardPattern" || c.pattern.kind === "CoreVarPattern") && !c.guard) {
                break; // Stop processing - rest are unreachable
            }
        }

        return reachable;
    }
}
