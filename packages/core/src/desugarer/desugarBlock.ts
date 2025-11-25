/**
 * Desugar a block expression into nested let bindings
 */

import type { Expr, Location, Pattern } from "../types/ast.js";
import type { CoreExpr, CorePattern } from "../types/core-ast.js";
import type { FreshVarGen } from "./FreshVarGen.js";

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
    _loc: Location,
    gen: FreshVarGen,
    desugar: (expr: Expr, gen: FreshVarGen) => CoreExpr,
    desugarPattern: (pattern: Pattern, gen: FreshVarGen) => CorePattern,
): CoreExpr {
    // Internal error: Empty block shouldn't happen (parser should catch this)
    if (exprs.length === 0) {
        throw new Error("Empty block expression");
    }

    // Single expression - just desugar it
    if (exprs.length === 1) {
        const singleExpr = exprs[0];
        if (!singleExpr) {
            // Internal error: array bounds check
            throw new Error("Block has undefined expression");
        }
        return desugar(singleExpr, gen);
    }

    // Multiple expressions - build nested let bindings
    // All expressions except the last should be Let bindings
    const lastExpr = exprs[exprs.length - 1];
    if (!lastExpr) {
        // Internal error: array bounds check
        throw new Error("Block has undefined last expression");
    }

    // Process expressions right-to-left to build nested structure
    let result = desugar(lastExpr, gen);

    // Work backwards through all but the last expression
    for (let i = exprs.length - 2; i >= 0; i--) {
        const expr = exprs[i];
        if (!expr) {
            // Internal error: array bounds check
            throw new Error(`Block has undefined expression at index ${i}`);
        }

        // Internal error: Each expression should be a Let binding (parser should enforce this)
        if (expr.kind !== "Let") {
            throw new Error("Non-let expression in block (except final expression)");
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
