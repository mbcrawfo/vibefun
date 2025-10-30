/**
 * Desugar binary operators
 */

import type { BinaryOp, Expr, Location } from "../types/ast.js";
import type { CoreBinaryOp, CoreExpr } from "../types/core-ast.js";
import type { FreshVarGen } from "./FreshVarGen.js";

export function desugarBinOp(
    op: BinaryOp,
    left: Expr,
    right: Expr,
    loc: Location,
    gen: FreshVarGen,
    desugar: (expr: Expr, gen: FreshVarGen) => CoreExpr,
    desugarComposition: (
        op: "ForwardCompose" | "BackwardCompose",
        left: Expr,
        right: Expr,
        loc: Location,
        gen: FreshVarGen,
    ) => CoreExpr,
): CoreExpr {
    // Function composition operators
    if (op === "ForwardCompose" || op === "BackwardCompose") {
        return desugarComposition(op, left, right, loc, gen);
    }

    // Cons operator desugars to Cons variant constructor
    if (op === "Cons") {
        return {
            kind: "CoreVariant",
            constructor: "Cons",
            args: [desugar(left, gen), desugar(right, gen)],
            loc,
        };
    }

    // All other binary operators pass through
    return {
        kind: "CoreBinOp",
        op: op as CoreBinaryOp,
        left: desugar(left, gen),
        right: desugar(right, gen),
        loc,
    };
}
