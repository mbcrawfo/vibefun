/**
 * Desugar list literals
 */

import type { Expr, ListElement, Location } from "../types/ast.js";
import type { CoreExpr } from "../types/core-ast.js";
import type { FreshVarGen } from "./FreshVarGen.js";

export function desugarListLiteral(
    elements: ListElement[],
    loc: Location,
    gen: FreshVarGen,
    desugar: (expr: Expr, gen: FreshVarGen) => CoreExpr,
    buildConsChain: (elements: { kind: "Element"; expr: Expr }[], loc: Location, gen: FreshVarGen) => CoreExpr,
    desugarListWithConcats: (elements: ListElement[], loc: Location, gen: FreshVarGen) => CoreExpr,
): CoreExpr {
    // Empty list -> Nil
    if (elements.length === 0) {
        return {
            kind: "CoreVariant",
            constructor: "Nil",
            args: [],
            loc,
        };
    }

    // Check if there are any spreads
    const hasSpread = elements.some((elem) => elem.kind === "Spread");

    if (!hasSpread) {
        // No spreads - simple case: build Cons chain
        return buildConsChain(elements as { kind: "Element"; expr: Expr }[], loc, gen);
    }

    // Has spreads - check if it's the optimizable case: only spread at end
    const lastElem = elements[elements.length - 1];
    const hasOnlyEndSpread =
        lastElem?.kind === "Spread" && elements.slice(0, -1).every((elem) => elem.kind === "Element");

    if (hasOnlyEndSpread && lastElem) {
        // Optimizable case: [1, 2, ...rest] -> Cons(1, Cons(2, rest))
        const regularElements = elements.slice(0, -1) as { kind: "Element"; expr: Expr }[];
        const spreadExpr = desugar((lastElem as { kind: "Spread"; expr: Expr }).expr, gen);

        if (regularElements.length === 0) {
            // Just [...rest] -> rest
            return spreadExpr;
        }

        // Build Cons chain with spread as tail
        let result = spreadExpr;
        for (let i = regularElements.length - 1; i >= 0; i--) {
            const elem = regularElements[i];
            if (!elem) {
                throw new Error(`List has undefined element at index ${i}`);
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

    // Complex case with spreads not at end - use concat
    return desugarListWithConcats(elements, loc, gen);
}
