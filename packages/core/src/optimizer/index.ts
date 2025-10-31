/**
 * Optimizer module exports
 *
 * This module provides the optimizer infrastructure and optimization passes for
 * transforming typed Core AST into optimized Core AST while preserving semantics.
 */

// Main optimizer class
export { Optimizer } from "./optimizer.js";

// Base class for optimization passes
export { OptimizationPass } from "./optimization-pass.js";

// Types (re-export from types module for convenience)
export type {
    OptimizationLevel,
    OptimizerOptions,
    OptimizationMetrics,
    OptimizationResult,
} from "../types/optimizer.js";

export { OptimizationLevel as Level, createEmptyMetrics, mergeMetrics } from "../types/optimizer.js";

// Optimization passes
export { ConstantFoldingPass } from "./passes/constant-folding.js";
export { BetaReductionPass } from "./passes/beta-reduction.js";
export { InlineExpansionPass } from "./passes/inline.js";
export { DeadCodeEliminationPass } from "./passes/dead-code-elim.js";
// export { EtaReductionPass } from "./passes/eta-reduction.js";
// export { PatternMatchOptimizationPass } from "./passes/pattern-opt.js";
// export { CSEPass } from "./passes/cse.js";
