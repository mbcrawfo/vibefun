/**
 * Desugar a block expression into nested let bindings
 */

import type { Expr, Location, Pattern } from "../types/ast.js";
import type { CoreExpr, CorePattern } from "../types/core-ast.js";
import type { FreshVarGen } from "./FreshVarGen.js";

import { DesugarError } from "./DesugarError.js";

/**
 * Desugar a block expression into nested let bindings
 *
 * @param exprs - List of expressions in the block
 * @param loc - Location of the block expression
 * @param gen - Fresh variable generator
 * @param desugar - The main desugar function
 * @param desugarPattern - The desugarPattern function
 * @returns Desugared core expression
 *
 * @example
 * // Input: { let x = 10; let y = 20; x + y }
 * // Output: let x = 10 in (let y = 20 in (x + y))
 */
export function desugarBlock(
    exprs: Expr[],
    loc: Location,
    gen: FreshVarGen,
    desugar: (expr: Expr, gen: FreshVarGen) => CoreExpr,
    desugarPattern: (pattern: Pattern, gen: FreshVarGen) => CorePattern,
): CoreExpr {
    // Empty block is an error
    if (exprs.length === 0) {
        throw new DesugarError("Empty block expression", loc, "Block must contain at least one expression");
    }

    // Single expression - just desugar it
    if (exprs.length === 1) {
        const singleExpr = exprs[0];
        if (!singleExpr) {
            throw new DesugarError("Block has undefined expression", loc);
        }
        return desugar(singleExpr, gen);
    }

    // Multiple expressions - build nested let bindings
    // All expressions except the last should be Let bindings
    const lastExpr = exprs[exprs.length - 1];
    if (!lastExpr) {
        throw new DesugarError("Block has undefined last expression", loc);
    }

    // Process expressions right-to-left to build nested structure
    let result = desugar(lastExpr, gen);

    // Work backwards through all but the last expression
    for (let i = exprs.length - 2; i >= 0; i--) {
        const expr = exprs[i];
        if (!expr) {
            throw new DesugarError(`Block has undefined expression at index ${i}`, loc);
        }

        // Each expression should be a Let binding
        if (expr.kind !== "Let") {
            throw new DesugarError(
                "Non-let expression in block (except final expression)",
                expr.loc,
                "All expressions in a block except the last must be let bindings",
            );
        }

        // Wrap the result in a let binding
        result = {
            kind: "CoreLet",
            pattern: desugarPattern(expr.pattern, gen),
            value: desugar(expr.value, gen),
            body: result,
            mutable: expr.mutable,
            recursive: expr.recursive,
            loc: expr.loc,
        };
    }

    return result;
}
