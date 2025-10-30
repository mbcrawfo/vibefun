/**
 * Desugar a pipe operator into function application
 */

import type { Expr, Location } from "../types/ast.js";
import type { CoreExpr } from "../types/core-ast.js";
import type { FreshVarGen } from "./FreshVarGen.js";

/**
 * Desugar a pipe operator into function application
 *
 * @param data - The data being piped
 * @param func - The function to apply
 * @param loc - Location of the pipe expression
 * @param gen - Fresh variable generator
 * @param desugar - The main desugar function (passed to avoid circular dependency)
 * @returns Desugared core expression
 *
 * @example
 * // Input: data |> filter(pred) |> map(f)
 * // Parser creates: Pipe(Pipe(data, filter(pred)), map(f))
 * // Output: map(f)(filter(pred)(data))
 */
export function desugarPipe(
    data: Expr,
    func: Expr,
    loc: Location,
    gen: FreshVarGen,
    desugar: (expr: Expr, gen: FreshVarGen) => CoreExpr,
): CoreExpr {
    // Desugar both operands
    const desugaredData = desugar(data, gen);
    const desugaredFunc = desugar(func, gen);

    // Create function application: func(data)
    // Since vibefun functions are curried, this works naturally
    return {
        kind: "CoreApp",
        func: desugaredFunc,
        args: [desugaredData],
        loc,
    };
}
