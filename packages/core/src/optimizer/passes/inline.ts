/**
 * Inline Expansion Optimization Pass
 *
 * Inlines small function definitions at call sites to enable further optimizations.
 *
 * Inlining Strategy:
 * - O1: Inline if < 20 nodes OR used once
 * - O2: Inline if < 50 nodes OR used < 3 times
 *
 * Safety:
 * - Never inline recursive functions (would cause infinite expansion)
 * - Never inline mutually recursive functions (breaks cross-references)
 * - Never inline functions containing unsafe blocks (preserve safety boundaries)
 * - Never inline functions containing mutable references (preserve identity/side effects)
 * - Never optimize inside unsafe blocks
 */

import type { CoreExpr, CorePattern } from "../../types/core-ast.js";

import { OptimizationLevel } from "../../types/optimizer.js";
import {
    astSize,
    containsRef,
    containsUnsafe,
    freeVars,
    shouldInline as shouldInlineByPolicy,
} from "../../utils/ast-analysis.js";
import { transformExpr } from "../../utils/ast-transform.js";
import { substitute } from "../../utils/substitution.js";
import { OptimizationPass } from "../optimization-pass.js";

export class InlineExpansionPass extends OptimizationPass {
    readonly name = "InlineExpansion";

    constructor(private readonly level: OptimizationLevel = OptimizationLevel.O1) {
        super();
    }

    override canApply(expr: CoreExpr): boolean {
        // Never optimize inside unsafe blocks
        return !containsUnsafe(expr);
    }

    override transform(expr: CoreExpr): CoreExpr {
        // Never transform inside unsafe blocks
        if (expr.kind === "CoreUnsafe") {
            return expr;
        }
        return transformExpr(expr, (e) => this.inlineBindings(e));
    }

    private inlineBindings(expr: CoreExpr): CoreExpr {
        // Double-check: never inline inside unsafe blocks
        if (expr.kind === "CoreUnsafe") {
            return expr;
        }

        // Only inline let bindings
        if (expr.kind !== "CoreLet") {
            return expr;
        }

        // Skip recursive bindings (would cause infinite expansion)
        if (expr.recursive) {
            return expr;
        }

        // Skip mutable bindings (side effects and identity matter)
        if (expr.mutable) {
            return expr;
        }

        // Only inline simple variable patterns (not destructuring patterns)
        if (expr.pattern.kind !== "CoreVarPattern") {
            return expr;
        }

        const varName = expr.pattern.name;
        const value = expr.value;
        const body = expr.body;

        // Never inline if value contains unsafe blocks or refs
        if (containsUnsafe(value) || containsRef(value)) {
            return expr;
        }

        // Count uses of the variable in the body
        const useCount = this.countUses(varName, body);

        // Compute size of the value expression
        const valueSize = astSize(value);

        // Check simple heuristics for very small expressions first
        // Always inline trivial values (literals, variables) regardless of use count
        const isTrivial =
            value.kind === "CoreIntLit" ||
            value.kind === "CoreFloatLit" ||
            value.kind === "CoreStringLit" ||
            value.kind === "CoreBoolLit" ||
            value.kind === "CoreUnitLit" ||
            value.kind === "CoreVar";

        // For trivial values, always inline
        if (isTrivial) {
            const inlinedBody = substitute(body, varName, value);
            return inlinedBody;
        }

        // For single-use expressions, inline if reasonably small
        if (useCount === 1 && valueSize < 20) {
            const inlinedBody = substitute(body, varName, value);
            return inlinedBody;
        }

        // For multi-use expressions, be conservative
        // Only inline very small expressions to avoid code bloat
        if (useCount > 1 && valueSize > 5) {
            return expr; // Don't inline
        }

        // Use the policy-based decision for other cases
        const shouldInline = shouldInlineByPolicy(value, useCount, this.level);

        if (!shouldInline) {
            return expr;
        }

        // Inline: substitute all occurrences of varName in body with value
        const inlinedBody = substitute(body, varName, value);

        return inlinedBody;
    }

    /**
     * Count the number of times a variable is used in an expression
     */
    private countUses(varName: string, expr: CoreExpr): number {
        const freeVarsSet = freeVars(expr);

        // Simple heuristic: if variable is not free, it's not used
        if (!freeVarsSet.has(varName)) {
            return 0;
        }

        // More precise counting: traverse the AST
        let count = 0;

        const countInExpr = (e: CoreExpr): void => {
            if (e.kind === "CoreVar" && e.name === varName) {
                count++;
                return;
            }

            // Traverse children based on expression kind
            switch (e.kind) {
                case "CoreIntLit":
                case "CoreFloatLit":
                case "CoreStringLit":
                case "CoreBoolLit":
                case "CoreUnitLit":
                    return;

                case "CoreVar":
                    return;

                case "CoreLet":
                    countInExpr(e.value);
                    // Don't count in body if pattern shadows the variable
                    if (e.pattern.kind === "CoreVarPattern" && e.pattern.name === varName) {
                        return; // Shadowed
                    }
                    countInExpr(e.body);
                    return;

                case "CoreLetRecExpr":
                    // Check if any binding shadows the variable
                    for (const binding of e.bindings) {
                        if (binding.pattern.kind === "CoreVarPattern" && binding.pattern.name === varName) {
                            return; // Shadowed
                        }
                    }
                    e.bindings.forEach((b) => countInExpr(b.value));
                    countInExpr(e.body);
                    return;

                case "CoreLambda":
                    // Don't count in body if param shadows the variable
                    if (e.param.kind === "CoreVarPattern" && e.param.name === varName) {
                        return; // Shadowed
                    }
                    countInExpr(e.body);
                    return;

                case "CoreApp":
                    countInExpr(e.func);
                    e.args.forEach(countInExpr);
                    return;

                case "CoreMatch":
                    countInExpr(e.expr);
                    e.cases.forEach((c) => {
                        // Check if pattern shadows the variable
                        const boundVars = this.getPatternVars(c.pattern);
                        if (boundVars.has(varName)) {
                            return; // Shadowed in this case
                        }
                        if (c.guard) countInExpr(c.guard);
                        countInExpr(c.body);
                    });
                    return;

                case "CoreRecord":
                    e.fields.forEach((f) => {
                        if (f.kind === "Field") {
                            countInExpr(f.value);
                        } else {
                            countInExpr(f.expr);
                        }
                    });
                    return;

                case "CoreRecordAccess":
                    countInExpr(e.record);
                    return;

                case "CoreRecordUpdate":
                    countInExpr(e.record);
                    e.updates.forEach((u) => {
                        if (u.kind === "Field") {
                            countInExpr(u.value);
                        } else {
                            countInExpr(u.expr);
                        }
                    });
                    return;

                case "CoreVariant":
                    e.args.forEach(countInExpr);
                    return;

                case "CoreBinOp":
                    countInExpr(e.left);
                    countInExpr(e.right);
                    return;

                case "CoreUnaryOp":
                    countInExpr(e.expr);
                    return;

                case "CoreTypeAnnotation":
                    countInExpr(e.expr);
                    return;

                case "CoreUnsafe":
                    countInExpr(e.expr);
                    return;
            }
        };

        countInExpr(expr);
        return count;
    }

    /**
     * Get all variables bound by a pattern
     */
    private getPatternVars(pattern: CorePattern): Set<string> {
        const vars = new Set<string>();

        const collectVars = (p: CorePattern): void => {
            switch (p.kind) {
                case "CoreWildcardPattern":
                case "CoreLiteralPattern":
                    return;

                case "CoreVarPattern":
                    vars.add(p.name);
                    return;

                case "CoreVariantPattern":
                    p.args.forEach(collectVars);
                    return;

                case "CoreRecordPattern":
                    p.fields.forEach((f) => collectVars(f.pattern));
                    return;
            }
        };

        collectVars(pattern);
        return vars;
    }
}
