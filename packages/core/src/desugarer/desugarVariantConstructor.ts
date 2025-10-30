/**
 * Desugar a variant constructor
 */

import type { VariantConstructor } from "../types/ast.js";
import type { CoreTypeExpr, CoreVariantConstructor } from "../types/core-ast.js";

/**
 * Desugar a variant constructor
 *
 * @param ctor - Surface variant constructor
 * @param desugarTypeExpr - The desugarTypeExpr function (passed to avoid circular dependency)
 * @returns Core variant constructor
 */
export function desugarVariantConstructor(
    ctor: VariantConstructor,
    desugarTypeExpr: (typeExpr: import("../types/ast.js").TypeExpr) => CoreTypeExpr,
): CoreVariantConstructor {
    return {
        name: ctor.name,
        args: ctor.args.map(desugarTypeExpr),
        loc: ctor.loc,
    };
}
