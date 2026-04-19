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

import { throwDiagnostic } from "../diagnostics/index.js";
import { validateOrPatternNoBindings } from "./validateOrPattern.js";

/**
 * Safety cap: the Cartesian product can explode with deep nesting. A match
 * arm yielding more than this many expanded cases almost certainly reflects
 * a bug in the input rather than intentional pattern fan-out.
 */
const MAX_EXPANDED_CASES = 256;

export function expandOrPatterns(pattern: Pattern): Pattern[] {
    // Compute the expansion size without allocating the result so we fail
    // fast at the offending pattern's location, before any work happens on
    // a pathologically deep fan-out.
    const size = expandedSize(pattern);
    if (size > MAX_EXPANDED_CASES) {
        throwDiagnostic("VF3102", pattern.loc, {
            count: String(size),
            max: String(MAX_EXPANDED_CASES),
        });
    }
    return expand(pattern);
}

/**
 * How many or-free patterns `expand(pattern)` would produce. Saturates at
 * `MAX_EXPANDED_CASES + 1` so we never overflow on adversarial inputs —
 * callers only need to know whether the total exceeds the cap.
 */
function expandedSize(pattern: Pattern): number {
    const cap = MAX_EXPANDED_CASES + 1;
    const saturatingMul = (a: number, b: number): number => (a >= cap || b >= cap ? cap : Math.min(a * b, cap));
    const saturatingAdd = (a: number, b: number): number => Math.min(a + b, cap);

    switch (pattern.kind) {
        case "VarPattern":
        case "WildcardPattern":
        case "LiteralPattern":
            return 1;

        case "OrPattern": {
            let total = 0;
            for (const alt of pattern.patterns) {
                total = saturatingAdd(total, expandedSize(alt));
                if (total >= cap) return cap;
            }
            return total;
        }

        case "ConstructorPattern": {
            let total = 1;
            for (const arg of pattern.args) {
                total = saturatingMul(total, expandedSize(arg));
                if (total >= cap) return cap;
            }
            return total;
        }

        case "TuplePattern": {
            let total = 1;
            for (const elem of pattern.elements) {
                total = saturatingMul(total, expandedSize(elem));
                if (total >= cap) return cap;
            }
            return total;
        }

        case "ListPattern": {
            let total = 1;
            for (const elem of pattern.elements) {
                total = saturatingMul(total, expandedSize(elem));
                if (total >= cap) return cap;
            }
            if (pattern.rest) {
                total = saturatingMul(total, expandedSize(pattern.rest));
            }
            return total;
        }

        case "RecordPattern": {
            let total = 1;
            for (const field of pattern.fields) {
                total = saturatingMul(total, expandedSize(field.pattern));
                if (total >= cap) return cap;
            }
            return total;
        }

        case "TypeAnnotatedPattern":
            return expandedSize(pattern.pattern);
    }
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
