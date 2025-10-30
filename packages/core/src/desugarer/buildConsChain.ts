/**
 * Build a simple Cons chain from regular elements
 */

import type { Expr, Location } from "../types/ast.js";
import type { CoreExpr } from "../types/core-ast.js";
import type { FreshVarGen } from "./FreshVarGen.js";

import { DesugarError } from "./DesugarError.js";

/**
 * Build a simple Cons chain from regular elements
 *
 * @param elements - List of regular (non-spread) elements
 * @param loc - Location of the list literal
 * @param gen - Fresh variable generator
 * @param desugar - The main desugar function (passed to avoid circular dependency)
 * @returns Desugared core expression representing a Cons/Nil chain
 */
export function buildConsChain(
    elements: { kind: "Element"; expr: Expr }[],
    loc: Location,
    gen: FreshVarGen,
    desugar: (expr: Expr, gen: FreshVarGen) => CoreExpr,
): CoreExpr {
    let result: CoreExpr = {
        kind: "CoreVariant",
        constructor: "Nil",
        args: [],
        loc,
    };

    for (let i = elements.length - 1; i >= 0; i--) {
        const elem = elements[i];
        if (!elem) {
            throw new DesugarError(`List has undefined element at index ${i}`, loc);
        }

        result = {
            kind: "CoreVariant",
            constructor: "Cons",
            args: [desugar(elem.expr, gen), result],
            loc,
        };
    }

    return result;
}
