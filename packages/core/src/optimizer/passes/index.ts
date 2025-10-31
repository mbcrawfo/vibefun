/**
 * Optimization passes
 */

export { ConstantFoldingPass } from "./constant-folding.js";
export { BetaReductionPass } from "./beta-reduction.js";
export { InlineExpansionPass } from "./inline.js";
export { DeadCodeEliminationPass } from "./dead-code-elim.js";
export { EtaReductionPass } from "./eta-reduction.js";
export { PatternMatchOptimizationPass } from "./pattern-match-opt.js";
