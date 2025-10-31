/**
 * Main Optimizer Class
 *
 * Orchestrates optimization passes and implements fixed-point iteration.
 */

import type { CoreExpr } from "../types/core-ast.js";
import type {
    OptimizationLevel,
    OptimizationMetrics,
    OptimizationResult,
    OptimizerOptions,
} from "../types/optimizer.js";
import type { OptimizationPass } from "./optimization-pass.js";

import { createEmptyMetrics } from "../types/optimizer.js";
import { astSize } from "../utils/ast-analysis.js";
import { exprEquals } from "../utils/expr-equality.js";

/**
 * Main optimizer class
 *
 * Manages optimization passes and applies them to Core AST expressions.
 */
export class Optimizer {
    private passes: OptimizationPass[] = [];
    private options: Required<OptimizerOptions>;

    /**
     * Create a new optimizer
     *
     * @param options - Optimizer configuration
     */
    constructor(options: OptimizerOptions) {
        this.options = {
            level: options.level,
            maxIterations: options.maxIterations ?? 10,
            verbose: options.verbose ?? false,
        };
    }

    /**
     * Add an optimization pass to the pipeline
     *
     * Passes are applied in the order they are added.
     *
     * @param pass - The optimization pass to add
     */
    addPass(pass: OptimizationPass): void {
        this.passes.push(pass);
    }

    /**
     * Optimize an expression
     *
     * Applies all registered optimization passes according to the optimization level.
     *
     * @param expr - The expression to optimize
     * @returns Optimization result with optimized expression and metrics
     */
    optimize(expr: CoreExpr): OptimizationResult {
        /* eslint-disable no-undef */
        const startTime = performance.now();
        const metrics = createEmptyMetrics();
        metrics.astSizeBefore = astSize(expr);

        // O0: No optimization - return immediately
        if (this.options.level === 0) {
            metrics.astSizeAfter = metrics.astSizeBefore;
            metrics.timeMs = performance.now() - startTime;
            return {
                expr,
                metrics,
                converged: true,
            };
        }
        /* eslint-enable no-undef */

        let current = expr;
        let converged = false;

        // O1: Single pass
        if (this.options.level === 1) {
            current = this.applySinglePass(current);
            metrics.iterations = 1;
            converged = true;
        }
        // O2: Fixed-point iteration
        else if (this.options.level === 2) {
            const result = this.applyFixedPoint(current);
            current = result.expr;
            metrics.iterations = result.iterations;
            converged = result.converged;
        }

        metrics.astSizeAfter = astSize(current);
        /* eslint-disable-next-line no-undef */
        metrics.timeMs = performance.now() - startTime;

        if (this.options.verbose) {
            this.logMetrics(metrics);
        }

        return {
            expr: current,
            metrics,
            converged,
        };
    }

    /**
     * Apply all passes once (for O1 optimization)
     *
     * @param expr - The expression to optimize
     * @returns The optimized expression
     */
    private applySinglePass(expr: CoreExpr): CoreExpr {
        let current = expr;

        for (const pass of this.passes) {
            if (pass.canApply(current)) {
                current = pass.transform(current);
            }
        }

        return current;
    }

    /**
     * Apply passes until fixed point is reached (for O2 optimization)
     *
     * @param expr - The expression to optimize
     * @returns Result with optimized expression, iteration count, and convergence status
     */
    private applyFixedPoint(expr: CoreExpr): { expr: CoreExpr; iterations: number; converged: boolean } {
        let current = expr;
        let previous: CoreExpr;
        let iterations = 0;

        do {
            previous = current;
            current = this.applySinglePass(current);
            iterations++;

            if (this.options.verbose) {
                /* eslint-disable-next-line no-console, no-undef */
                console.log(`Optimization iteration ${iterations}, AST size: ${astSize(current)}`);
            }
        } while (!exprEquals(current, previous) && iterations < this.options.maxIterations);

        const converged = exprEquals(current, previous);

        if (this.options.verbose) {
            if (converged) {
                /* eslint-disable-next-line no-console, no-undef */
                console.log(`Optimization converged after ${iterations} iterations`);
            } else {
                /* eslint-disable-next-line no-console, no-undef */
                console.log(`Optimization stopped at max iterations (${this.options.maxIterations})`);
            }
        }

        return {
            expr: current,
            iterations,
            converged,
        };
    }

    /**
     * Log optimization metrics to console
     *
     * @param metrics - The metrics to log
     */
    private logMetrics(metrics: OptimizationMetrics): void {
        /* eslint-disable no-console, no-undef */
        console.log("Optimization Metrics:");
        console.log(`  Iterations: ${metrics.iterations}`);
        console.log(`  AST Size: ${metrics.astSizeBefore} → ${metrics.astSizeAfter}`);
        const reduction = metrics.astSizeBefore - metrics.astSizeAfter;
        const percentage = metrics.astSizeBefore > 0 ? ((reduction / metrics.astSizeBefore) * 100).toFixed(1) : "0";
        console.log(`  Reduction: ${reduction} nodes (${percentage}%)`);
        console.log(`  Time: ${metrics.timeMs.toFixed(2)}ms`);
        /* eslint-enable no-console, no-undef */
    }

    /**
     * Get the current optimization level
     *
     * @returns The optimization level
     */
    getLevel(): OptimizationLevel {
        return this.options.level;
    }

    /**
     * Get all registered passes
     *
     * @returns Array of optimization passes
     */
    getPasses(): readonly OptimizationPass[] {
        return this.passes;
    }

    /**
     * Clear all registered passes
     */
    clearPasses(): void {
        this.passes = [];
    }
}
