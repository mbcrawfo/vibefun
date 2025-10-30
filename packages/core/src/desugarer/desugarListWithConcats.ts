/**
 * Desugar list with spreads using concat
 */

import type { Expr, ListElement, Location } from "../types/ast.js";
import type { CoreExpr } from "../types/core-ast.js";
import type { FreshVarGen } from "./FreshVarGen.js";

export function desugarListWithConcats(
    elements: ListElement[],
    loc: Location,
    gen: FreshVarGen,
    desugar: (expr: Expr, gen: FreshVarGen) => CoreExpr,
    buildConsChain: (elements: { kind: "Element"; expr: Expr }[], loc: Location, gen: FreshVarGen) => CoreExpr,
): CoreExpr {
    // Group elements into segments
    const segments: CoreExpr[] = [];
    let currentSegment: { kind: "Element"; expr: Expr }[] = [];

    for (const elem of elements) {
        if (elem.kind === "Element") {
            currentSegment.push(elem);
        } else {
            // Spread element
            // If we have accumulated regular elements, build Cons chain
            if (currentSegment.length > 0) {
                segments.push(buildConsChain(currentSegment, loc, gen));
                currentSegment = [];
            }
            // Add spread as a segment
            segments.push(desugar(elem.expr, gen));
        }
    }

    // Add any remaining regular elements
    if (currentSegment.length > 0) {
        segments.push(buildConsChain(currentSegment, loc, gen));
    }

    // Combine segments with concat
    if (segments.length === 0) {
        return {
            kind: "CoreVariant",
            constructor: "Nil",
            args: [],
            loc,
        };
    }

    const lastSegment = segments[segments.length - 1];
    if (!lastSegment) {
        throw new Error("Empty segment list");
    }
    let result = lastSegment;

    for (let i = segments.length - 2; i >= 0; i--) {
        const segment = segments[i];
        if (!segment) {
            throw new Error(`Empty segment at index ${i}`);
        }
        // concat(segment, result) - concat is curried, so: concat(segment)(result)
        result = {
            kind: "CoreApp",
            func: { kind: "CoreVar", name: "concat", loc },
            args: [segment, result],
            loc,
        };
    }

    return result;
}
