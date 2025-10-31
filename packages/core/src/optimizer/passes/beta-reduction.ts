/**
 * Beta Reduction Optimization Pass
 *
 * Performs lambda application (beta reduction) to inline function calls.
 *
 * Transformation:
 * ((x) => body)(arg) => body[x := arg]
 *
 * Example:
 * ((x) => x + 1)(5) => 5 + 1
 *
 * Safety:
 * - Uses capture-avoiding substitution to prevent variable capture
 * - Never optimizes inside unsafe blocks
 * - Avoids inlining large expressions to prevent code bloat
 * - Preserves semantics exactly
 */

import type { CoreExpr } from "../../types/core-ast.js";

import { astSize, containsUnsafe } from "../../utils/ast-analysis.js";
import { transformExpr } from "../../utils/ast-transform.js";
import { substitute } from "../../utils/substitution.js";
import { OptimizationPass } from "../optimization-pass.js";

export class BetaReductionPass extends OptimizationPass {
    readonly name = "BetaReduction";

    override canApply(expr: CoreExpr): boolean {
        // Never optimize inside unsafe blocks
        return !containsUnsafe(expr);
    }

    override transform(expr: CoreExpr): CoreExpr {
        // Never transform inside unsafe blocks
        if (expr.kind === "CoreUnsafe") {
            return expr;
        }
        return transformExpr(expr, (e) => this.reduceBeta(e));
    }

    private reduceBeta(expr: CoreExpr): CoreExpr {
        // Double-check: never reduce inside unsafe blocks
        if (expr.kind === "CoreUnsafe") {
            return expr;
        }

        if (expr.kind !== "CoreApp") {
            return expr;
        }

        // Check if function is a lambda
        if (expr.func.kind !== "CoreLambda") {
            return expr;
        }

        const lambda = expr.func;
        const args = expr.args;

        // For now, only handle single-argument lambdas
        // Multi-argument application can be handled by currying
        if (args.length !== 1) {
            return expr;
        }

        const arg = args[0];
        if (!arg) {
            return expr;
        }

        // Don't inline if the argument is too large (prevent code bloat)
        // Use a simple heuristic: only inline if argument has fewer than 20 nodes
        const MAX_INLINE_SIZE = 20;
        if (astSize(arg) > MAX_INLINE_SIZE) {
            return expr;
        }

        // Check if the lambda parameter is a simple variable pattern
        // For more complex patterns (records, variants), we'd need pattern matching
        if (lambda.param.kind !== "CoreVarPattern") {
            return expr;
        }

        const paramName = lambda.param.name;

        // Perform capture-avoiding substitution: body[param := arg]
        const result = substitute(lambda.body, paramName, arg);

        return result;
    }
}
