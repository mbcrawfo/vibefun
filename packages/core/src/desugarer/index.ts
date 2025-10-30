/**
 * Desugarer module - transforms Surface AST to Core AST
 */

export { DesugarError } from "./DesugarError.js";
export { FreshVarGen } from "./FreshVarGen.js";
export { desugar, desugarPattern, desugarDecl, desugarModule } from "./desugarer.js";
