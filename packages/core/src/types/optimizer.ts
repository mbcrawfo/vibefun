/**
 * Optimizer type definitions for Vibefun
 *
 * This module defines types for the optimizer configuration, levels, and metrics.
 */

import type { CoreExpr } from "./core-ast.js";

/**
 * Optimization levels
 *
 * - O0: No optimization (pass-through) - fastest compilation, easiest debugging
 * - O1: Basic optimizations (single pass) - good balance of speed and optimization
 * - O2: Aggressive optimizations (fixed-point iteration) - best performance, slower compilation
 */
export enum OptimizationLevel {
    O0 = 0,
    O1 = 1,
    O2 = 2,
}

/**
 * Options for the optimizer
 */
export interface OptimizerOptions {
    /**
     * Optimization level to apply
     */
    level: OptimizationLevel;

    /**
     * Maximum number of iterations for fixed-point optimization
     * @default 10
     */
    maxIterations?: number;

    /**
     * Enable verbose logging for debugging
     * @default false
     */
    verbose?: boolean;
}

/**
 * Metrics collected during optimization
 *
 * Tracks the number of optimizations applied and compilation statistics
 */
export interface OptimizationMetrics {
    /**
     * Number of constant folding optimizations applied
     */
    constantFolds: number;

    /**
     * Number of beta reductions applied
     */
    betaReductions: number;

    /**
     * Number of eta reductions applied
     */
    etaReductions: number;

    /**
     * Number of function/expression inlines performed
     */
    inlines: number;

    /**
     * Number of dead code eliminations
     */
    deadCodeEliminations: number;

    /**
     * Number of common subexpressions eliminated
     */
    cseEliminations: number;

    /**
     * Number of pattern match optimizations applied
     */
    patternOptimizations: number;

    /**
     * Number of iterations performed to reach fixed point
     */
    iterations: number;

    /**
     * AST size (node count) before optimization
     */
    astSizeBefore: number;

    /**
     * AST size (node count) after optimization
     */
    astSizeAfter: number;

    /**
     * Time taken for optimization in milliseconds
     */
    timeMs: number;
}

/**
 * Result of an optimization transformation
 */
export interface OptimizationResult {
    /**
     * The optimized expression
     */
    expr: CoreExpr;

    /**
     * Metrics collected during optimization
     */
    metrics: OptimizationMetrics;

    /**
     * Whether the optimization reached a fixed point
     */
    converged: boolean;
}

/**
 * Create empty optimization metrics
 */
export function createEmptyMetrics(): OptimizationMetrics {
    return {
        constantFolds: 0,
        betaReductions: 0,
        etaReductions: 0,
        inlines: 0,
        deadCodeEliminations: 0,
        cseEliminations: 0,
        patternOptimizations: 0,
        iterations: 0,
        astSizeBefore: 0,
        astSizeAfter: 0,
        timeMs: 0,
    };
}

/**
 * Merge two optimization metrics
 */
export function mergeMetrics(m1: OptimizationMetrics, m2: OptimizationMetrics): OptimizationMetrics {
    return {
        constantFolds: m1.constantFolds + m2.constantFolds,
        betaReductions: m1.betaReductions + m2.betaReductions,
        etaReductions: m1.etaReductions + m2.etaReductions,
        inlines: m1.inlines + m2.inlines,
        deadCodeEliminations: m1.deadCodeEliminations + m2.deadCodeEliminations,
        cseEliminations: m1.cseEliminations + m2.cseEliminations,
        patternOptimizations: m1.patternOptimizations + m2.patternOptimizations,
        iterations: Math.max(m1.iterations, m2.iterations),
        astSizeBefore: m1.astSizeBefore || m2.astSizeBefore,
        astSizeAfter: m2.astSizeAfter || m1.astSizeAfter,
        timeMs: m1.timeMs + m2.timeMs,
    };
}
