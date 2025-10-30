/**
 * Desugar list patterns
 */

import type { Location, Pattern } from "../types/ast.js";
import type { CorePattern } from "../types/core-ast.js";
import type { FreshVarGen } from "./FreshVarGen.js";

import { DesugarError } from "./DesugarError.js";

export function desugarListPattern(
    elements: Pattern[],
    rest: Pattern | undefined,
    loc: Location,
    gen: FreshVarGen,
    desugarPattern: (pattern: Pattern, gen: FreshVarGen) => CorePattern,
): CorePattern {
    // Empty list pattern: []
    if (elements.length === 0 && !rest) {
        return {
            kind: "CoreVariantPattern",
            constructor: "Nil",
            args: [],
            loc,
        };
    }

    // Just rest pattern: [...rest]
    if (elements.length === 0 && rest) {
        return desugarPattern(rest, gen);
    }

    // Build Cons patterns from right to left
    // Start with either rest pattern or Nil
    let tailPattern: CorePattern;

    if (rest) {
        tailPattern = desugarPattern(rest, gen);
    } else {
        tailPattern = {
            kind: "CoreVariantPattern",
            constructor: "Nil",
            args: [],
            loc,
        };
    }

    // Work backwards through elements to build nested Cons patterns
    for (let i = elements.length - 1; i >= 0; i--) {
        const element = elements[i];
        if (!element) {
            throw new DesugarError(`List pattern has undefined element at index ${i}`, loc);
        }

        tailPattern = {
            kind: "CoreVariantPattern",
            constructor: "Cons",
            args: [desugarPattern(element, gen), tailPattern],
            loc,
        };
    }

    return tailPattern;
}
