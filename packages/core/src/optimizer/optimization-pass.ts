/**
 * Base class for optimization passes
 *
 * All optimization passes extend this abstract class and implement the transform method.
 */

import type { CoreExpr } from "../types/core-ast.js";

/**
 * Abstract base class for optimization passes
 *
 * Each pass implements a single optimization transformation.
 * Passes are composed together in the Optimizer pipeline.
 */
export abstract class OptimizationPass {
    /**
     * Name of the optimization pass (for debugging and metrics)
     */
    abstract readonly name: string;

    /**
     * Transform an expression using this optimization pass
     *
     * @param expr - The expression to optimize
     * @returns The optimized expression
     */
    abstract transform(expr: CoreExpr): CoreExpr;

    /**
     * Optional: Check if this pass can be applied to an expression
     *
     * Default implementation returns true (pass always applies).
     * Subclasses can override to skip expressions that won't benefit.
     *
     * @param _expr - The expression to check
     * @returns true if the pass should be applied
     */
    canApply(_expr: CoreExpr): boolean {
        return true;
    }
}
