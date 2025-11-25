/**
 * Curry a multi-parameter lambda into nested single-parameter lambdas
 */

import type { Expr, Location, Pattern } from "../types/ast.js";
import type { CoreExpr, CorePattern } from "../types/core-ast.js";
import type { FreshVarGen } from "./FreshVarGen.js";

/**
 * Curry a multi-parameter lambda into nested single-parameter lambdas
 *
 * @param params - List of parameters
 * @param body - Lambda body
 * @param loc - Location of the lambda
 * @param gen - Fresh variable generator
 * @param desugar - The main desugar function
 * @param desugarPattern - The desugarPattern function
 * @returns Desugared core lambda
 *
 * @example
 * // Input: (x, y, z) => x + y + z
 * // Output: (x) => (y) => (z) => x + y + z
 */
export function curryLambda(
    params: Pattern[],
    body: Expr,
    loc: Location,
    gen: FreshVarGen,
    desugar: (expr: Expr, gen: FreshVarGen) => CoreExpr,
    desugarPattern: (pattern: Pattern, gen: FreshVarGen) => CorePattern,
): CoreExpr {
    // Internal error: Zero parameters shouldn't happen (parser should catch this)
    if (params.length === 0) {
        throw new Error("Lambda with zero parameters");
    }

    // Single parameter - just desugar
    if (params.length === 1) {
        const param = params[0];
        if (!param) {
            // Internal error: array bounds check
            throw new Error("Lambda has undefined parameter");
        }
        return {
            kind: "CoreLambda",
            param: desugarPattern(param, gen),
            body: desugar(body, gen),
            loc,
        };
    }

    // Multiple parameters - curry
    // Build nested lambdas from left to right
    const firstParam = params[0];
    if (!firstParam) {
        // Internal error: array bounds check
        throw new Error("Lambda has undefined first parameter");
    }

    // The body of the first lambda is another lambda with remaining parameters
    const innerLambda = curryLambda(params.slice(1), body, loc, gen, desugar, desugarPattern);

    return {
        kind: "CoreLambda",
        param: desugarPattern(firstParam, gen),
        body: innerLambda,
        loc,
    };
}
