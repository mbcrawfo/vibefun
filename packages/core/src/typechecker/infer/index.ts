// Import all inference functions
import { generalize, inferLet, inferLetRecExpr, setInferExpr as setInferExprInBindings } from "./infer-bindings.js";
import {
    inferApp,
    inferLambda,
    setInferExpr as setInferExprInApp,
    setInferExpr as setInferExprInLambda,
} from "./infer-functions.js";
import { inferBinOp, inferUnaryOp, setInferExpr as setInferExprInOperators } from "./infer-operators.js";
import { inferExpr, setInferenceFunctions } from "./infer-primitives.js";
import {
    inferMatch,
    inferRecord,
    inferRecordAccess,
    inferRecordUpdate,
    inferVariant,
    setInferExpr as setInferExprInStructures,
} from "./infer-structures.js";

/**
 * Type inference engine (Algorithm W)
 *
 * This module implements Hindley-Milner type inference for the vibefun language.
 * It uses Algorithm W with level-based generalization for let-polymorphism.
 */

// Export context types and functions
export { createContext, instantiate } from "./infer-context.js";
export type { InferenceContext, InferResult } from "./infer-context.js";

// Export convertTypeExpr for use by other modules
export { convertTypeExpr } from "./infer-primitives.js";

// Wire up dependencies using dependency injection
// All modules need access to inferExpr for recursive inference
setInferExprInLambda(inferExpr);
setInferExprInApp(inferExpr);
setInferExprInOperators(inferExpr);
setInferExprInBindings(inferExpr);
setInferExprInStructures(inferExpr);

// Wire up the main dispatcher with specialized functions
setInferenceFunctions({
    inferLambda,
    inferApp,
    inferBinOp,
    inferUnaryOp,
    inferLet,
    inferLetRecExpr,
    inferRecord,
    inferRecordAccess,
    inferRecordUpdate,
    inferVariant,
    inferMatch,
});

// Re-export the main inference function
export { inferExpr };

// Re-export generalize for use by other modules
export { generalize };
