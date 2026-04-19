/**
 * Recursive or-pattern expansion.
 *
 * Surface patterns can contain `OrPattern` at any nesting depth (inside
 * constructors, lists, records, tuples, or type-annotated patterns). The
 * typechecker and codegen only accept or-free patterns — `Ok("a" | "b")`
 * must become two separate match cases `Ok("a") => body` and `Ok("b") => body`.
 *
 * `expandOrPatterns` returns the Cartesian product of alternatives over a
 * pattern: a flat list of or-free surface patterns equivalent to the input.
 *
 * Each `OrPattern` encountered during the walk is also validated so that its
 * alternatives bind no variables (spec rule enforced by VF4403).
 */

import type { Pattern, RecordPatternField } from "../types/ast.js";

import { validateOrPatternNoBindings } from "./validateOrPattern.js";

/**
 * Safety cap: the Cartesian product can explode with deep nesting. A match
 * arm yielding more than this many expanded cases almost certainly reflects a
 * bug in the input rather than intentional pattern fan-out.
 */
const MAX_EXPANDED_CASES = 256;

export function expandOrPatterns(pattern: Pattern): Pattern[] {
    const result = expand(pattern);
    if (result.length > MAX_EXPANDED_CASES) {
        throw new Error(
            `Or-pattern expansion produced ${result.length} cases (max ${MAX_EXPANDED_CASES}); ` +
                "simplify the pattern or split it into separate match arms.",
        );
    }
    return result;
}

function expand(pattern: Pattern): Pattern[] {
    switch (pattern.kind) {
        case "VarPattern":
        case "WildcardPattern":
        case "LiteralPattern":
            return [pattern];

        case "OrPattern":
            validateOrPatternNoBindings(pattern.patterns);
            return pattern.patterns.flatMap(expand);

        case "ConstructorPattern":
            return cartesian(pattern.args.map(expand)).map((args) => ({
                kind: "ConstructorPattern",
                constructor: pattern.constructor,
                args,
                loc: pattern.loc,
            }));

        case "TuplePattern":
            return cartesian(pattern.elements.map(expand)).map((elements) => ({
                kind: "TuplePattern",
                elements,
                loc: pattern.loc,
            }));

        case "ListPattern": {
            const elementCombos = cartesian(pattern.elements.map(expand));
            const restCombos = pattern.rest ? expand(pattern.rest) : [undefined];
            const results: Pattern[] = [];
            for (const elements of elementCombos) {
                for (const rest of restCombos) {
                    const p: Pattern = { kind: "ListPattern", elements, loc: pattern.loc };
                    if (rest) {
                        p.rest = rest;
                    }
                    results.push(p);
                }
            }
            return results;
        }

        case "RecordPattern": {
            const fieldCombos = cartesian(
                pattern.fields.map((field) =>
                    expand(field.pattern).map(
                        (p): RecordPatternField => ({ name: field.name, pattern: p, loc: field.loc }),
                    ),
                ),
            );
            return fieldCombos.map((fields) => ({
                kind: "RecordPattern",
                fields,
                loc: pattern.loc,
            }));
        }

        case "TypeAnnotatedPattern":
            return expand(pattern.pattern).map((inner) => ({
                kind: "TypeAnnotatedPattern",
                pattern: inner,
                typeExpr: pattern.typeExpr,
                loc: pattern.loc,
            }));
    }
}

/**
 * Cartesian product of a list of lists. Preserves order.
 * `cartesian([[a, b], [1, 2]])` → `[[a, 1], [a, 2], [b, 1], [b, 2]]`.
 */
function cartesian<T>(lists: T[][]): T[][] {
    return lists.reduce<T[][]>((acc, list) => acc.flatMap((prefix) => list.map((item) => [...prefix, item])), [[]]);
}
