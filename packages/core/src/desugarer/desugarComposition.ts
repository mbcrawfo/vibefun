/**
 * Desugar function composition operators
 */

import type { Expr, Location } from "../types/ast.js";
import type { CoreExpr, CorePattern } from "../types/core-ast.js";
import type { FreshVarGen } from "./FreshVarGen.js";

/**
 * Desugar function composition operators
 *
 * @param op - ForwardCompose (>>) or BackwardCompose (<<)
 * @param left - Left function
 * @param right - Right function
 * @param loc - Location of the composition expression
 * @param gen - Fresh variable generator
 * @param desugar - The main desugar function
 * @returns Desugared core expression
 *
 * @example
 * // Forward: f >> g => (x) => g(f(x))
 * // Backward: f << g => (x) => f(g(x))
 */
export function desugarComposition(
    op: "ForwardCompose" | "BackwardCompose",
    left: Expr,
    right: Expr,
    loc: Location,
    gen: FreshVarGen,
    desugar: (expr: Expr, gen: FreshVarGen) => CoreExpr,
): CoreExpr {
    // Generate fresh parameter name for the composed function
    const paramName = gen.fresh("composed");
    const paramPattern: CorePattern = {
        kind: "CoreVarPattern",
        name: paramName,
        loc,
    };

    // Create parameter reference
    const paramVar: CoreExpr = {
        kind: "CoreVar",
        name: paramName,
        loc,
    };

    // Desugar both functions
    const desugaredLeft = desugar(left, gen);
    const desugaredRight = desugar(right, gen);

    // Build application chain based on composition direction
    let body: CoreExpr;

    if (op === "ForwardCompose") {
        // f >> g => (x) => g(f(x))
        // Apply left function first, then right
        const leftApp: CoreExpr = {
            kind: "CoreApp",
            func: desugaredLeft,
            args: [paramVar],
            loc,
        };

        body = {
            kind: "CoreApp",
            func: desugaredRight,
            args: [leftApp],
            loc,
        };
    } else {
        // f << g => (x) => f(g(x))
        // Apply right function first, then left
        const rightApp: CoreExpr = {
            kind: "CoreApp",
            func: desugaredRight,
            args: [paramVar],
            loc,
        };

        body = {
            kind: "CoreApp",
            func: desugaredLeft,
            args: [rightApp],
            loc,
        };
    }

    // Wrap in lambda
    return {
        kind: "CoreLambda",
        param: paramPattern,
        body,
        loc,
    };
}
