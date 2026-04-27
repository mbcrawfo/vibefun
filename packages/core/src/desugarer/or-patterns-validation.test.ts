/**
 * Tests for or-pattern expansion in match expressions
 *
 * Or-patterns are desugared by expanding into multiple match cases:
 * match x { | "a" | "b" | "c" => expr }
 * =>
 * match x { | "a" => expr | "b" => expr | "c" => expr }
 */

import type { Expr, Location, Pattern } from "../types/ast.js";
import type { CoreExpr, CoreLiteralPattern, CoreMatch, CoreVariantPattern } from "../types/core-ast.js";

import * as fc from "fast-check";
import { describe, expect, it } from "vitest";

import { VibefunDiagnostic } from "../diagnostics/index.js";
import { patternArb } from "../types/test-arbitraries/index.js";
import { exprEquals } from "../utils/expr-equality.js";
import { desugar } from "./desugarer.js";

const testLoc: Location = {
    file: "test.vf",
    line: 1,
    column: 1,
    offset: 0,
};

describe("Or-Pattern - Nested Expansion", () => {
    it("expands an or-pattern inside a constructor argument", () => {
        // match r { | Ok("a" | "b") => 1 | _ => 0 }
        const match: Expr = {
            kind: "Match",
            expr: { kind: "Var", name: "r", loc: testLoc },
            cases: [
                {
                    pattern: {
                        kind: "ConstructorPattern",
                        constructor: "Ok",
                        args: [
                            {
                                kind: "OrPattern",
                                patterns: [
                                    { kind: "LiteralPattern", literal: "a", loc: testLoc },
                                    { kind: "LiteralPattern", literal: "b", loc: testLoc },
                                ],
                                loc: testLoc,
                            },
                        ],
                        loc: testLoc,
                    },
                    body: { kind: "IntLit", value: 1, loc: testLoc },
                    loc: testLoc,
                },
                {
                    pattern: { kind: "WildcardPattern", loc: testLoc },
                    body: { kind: "IntLit", value: 0, loc: testLoc },
                    loc: testLoc,
                },
            ],
            loc: testLoc,
        };

        const result = desugar(match) as CoreMatch;

        expect(result.cases).toHaveLength(3); // Ok("a"), Ok("b"), _
        const first = result.cases[0]!.pattern as CoreVariantPattern;
        const second = result.cases[1]!.pattern as CoreVariantPattern;
        expect(first.kind).toBe("CoreVariantPattern");
        expect(first.constructor).toBe("Ok");
        expect((first.args[0]! as CoreLiteralPattern).literal).toBe("a");
        expect(second.kind).toBe("CoreVariantPattern");
        expect((second.args[0]! as CoreLiteralPattern).literal).toBe("b");
    });

    it("expands an or-pattern inside a tuple element", () => {
        // match t { | (0 | 1, _) => 1 | _ => 0 }
        const match: Expr = {
            kind: "Match",
            expr: { kind: "Var", name: "t", loc: testLoc },
            cases: [
                {
                    pattern: {
                        kind: "TuplePattern",
                        elements: [
                            {
                                kind: "OrPattern",
                                patterns: [
                                    { kind: "LiteralPattern", literal: 0, loc: testLoc },
                                    { kind: "LiteralPattern", literal: 1, loc: testLoc },
                                ],
                                loc: testLoc,
                            },
                            { kind: "WildcardPattern", loc: testLoc },
                        ],
                        loc: testLoc,
                    },
                    body: { kind: "IntLit", value: 1, loc: testLoc },
                    loc: testLoc,
                },
                {
                    pattern: { kind: "WildcardPattern", loc: testLoc },
                    body: { kind: "IntLit", value: 0, loc: testLoc },
                    loc: testLoc,
                },
            ],
            loc: testLoc,
        };

        const result = desugar(match) as CoreMatch;

        expect(result.cases).toHaveLength(3);
        expect(result.cases[0]!.pattern.kind).toBe("CoreTuplePattern");
        expect(result.cases[1]!.pattern.kind).toBe("CoreTuplePattern");
    });

    it("cartesian-products multiple nested or-patterns", () => {
        // match p { | (1 | 2, 3 | 4) => 1 | _ => 0 }
        const match: Expr = {
            kind: "Match",
            expr: { kind: "Var", name: "p", loc: testLoc },
            cases: [
                {
                    pattern: {
                        kind: "TuplePattern",
                        elements: [
                            {
                                kind: "OrPattern",
                                patterns: [
                                    { kind: "LiteralPattern", literal: 1, loc: testLoc },
                                    { kind: "LiteralPattern", literal: 2, loc: testLoc },
                                ],
                                loc: testLoc,
                            },
                            {
                                kind: "OrPattern",
                                patterns: [
                                    { kind: "LiteralPattern", literal: 3, loc: testLoc },
                                    { kind: "LiteralPattern", literal: 4, loc: testLoc },
                                ],
                                loc: testLoc,
                            },
                        ],
                        loc: testLoc,
                    },
                    body: { kind: "IntLit", value: 1, loc: testLoc },
                    loc: testLoc,
                },
                {
                    pattern: { kind: "WildcardPattern", loc: testLoc },
                    body: { kind: "IntLit", value: 0, loc: testLoc },
                    loc: testLoc,
                },
            ],
            loc: testLoc,
        };

        const result = desugar(match) as CoreMatch;

        expect(result.cases).toHaveLength(5); // 2*2 for the product + 1 wildcard
    });

    it("flattens or-inside-or", () => {
        // match x { | (1 | 2) | 3 => "small" | _ => "big" }
        const match: Expr = {
            kind: "Match",
            expr: { kind: "Var", name: "x", loc: testLoc },
            cases: [
                {
                    pattern: {
                        kind: "OrPattern",
                        patterns: [
                            {
                                kind: "OrPattern",
                                patterns: [
                                    { kind: "LiteralPattern", literal: 1, loc: testLoc },
                                    { kind: "LiteralPattern", literal: 2, loc: testLoc },
                                ],
                                loc: testLoc,
                            },
                            { kind: "LiteralPattern", literal: 3, loc: testLoc },
                        ],
                        loc: testLoc,
                    },
                    body: { kind: "StringLit", value: "small", loc: testLoc },
                    loc: testLoc,
                },
                {
                    pattern: { kind: "WildcardPattern", loc: testLoc },
                    body: { kind: "StringLit", value: "big", loc: testLoc },
                    loc: testLoc,
                },
            ],
            loc: testLoc,
        };

        const result = desugar(match) as CoreMatch;

        // 3 literal alternatives + wildcard
        expect(result.cases).toHaveLength(4);
    });

    it("rejects a binding found in a nested or-pattern alternative", () => {
        // match r { | Ok(Some(x) | None) => 0 | _ => 0 }
        const match: Expr = {
            kind: "Match",
            expr: { kind: "Var", name: "r", loc: testLoc },
            cases: [
                {
                    pattern: {
                        kind: "ConstructorPattern",
                        constructor: "Ok",
                        args: [
                            {
                                kind: "OrPattern",
                                patterns: [
                                    {
                                        kind: "ConstructorPattern",
                                        constructor: "Some",
                                        args: [{ kind: "VarPattern", name: "x", loc: testLoc }],
                                        loc: testLoc,
                                    },
                                    {
                                        kind: "ConstructorPattern",
                                        constructor: "None",
                                        args: [],
                                        loc: testLoc,
                                    },
                                ],
                                loc: testLoc,
                            },
                        ],
                        loc: testLoc,
                    },
                    body: { kind: "IntLit", value: 0, loc: testLoc },
                    loc: testLoc,
                },
                {
                    pattern: { kind: "WildcardPattern", loc: testLoc },
                    body: { kind: "IntLit", value: 0, loc: testLoc },
                    loc: testLoc,
                },
            ],
            loc: testLoc,
        };

        expect(() => desugar(match)).toThrow("VF4403");
    });
});

describe("Or-Pattern - Variable Binding Validation (VF4403)", () => {
    it("rejects an or-pattern alternative that binds a variable", () => {
        // match opt { | Some(x) | None => 0 }
        const match: Expr = {
            kind: "Match",
            expr: { kind: "Var", name: "opt", loc: testLoc },
            cases: [
                {
                    pattern: {
                        kind: "OrPattern",
                        patterns: [
                            {
                                kind: "ConstructorPattern",
                                constructor: "Some",
                                args: [{ kind: "VarPattern", name: "x", loc: testLoc }],
                                loc: testLoc,
                            },
                            { kind: "ConstructorPattern", constructor: "None", args: [], loc: testLoc },
                        ],
                        loc: testLoc,
                    },
                    body: { kind: "IntLit", value: 0, loc: testLoc },
                    loc: testLoc,
                },
            ],
            loc: testLoc,
        };

        expect(() => desugar(match)).toThrow("VF4403");
    });

    it("rejects a variable nested inside a record alternative", () => {
        // match p { | { name } | { age: _ } => 0 }
        const match: Expr = {
            kind: "Match",
            expr: { kind: "Var", name: "p", loc: testLoc },
            cases: [
                {
                    pattern: {
                        kind: "OrPattern",
                        patterns: [
                            {
                                kind: "RecordPattern",
                                fields: [
                                    {
                                        name: "name",
                                        pattern: { kind: "VarPattern", name: "name", loc: testLoc },
                                        loc: testLoc,
                                    },
                                ],
                                loc: testLoc,
                            },
                            {
                                kind: "RecordPattern",
                                fields: [
                                    {
                                        name: "age",
                                        pattern: { kind: "WildcardPattern", loc: testLoc },
                                        loc: testLoc,
                                    },
                                ],
                                loc: testLoc,
                            },
                        ],
                        loc: testLoc,
                    },
                    body: { kind: "IntLit", value: 0, loc: testLoc },
                    loc: testLoc,
                },
            ],
            loc: testLoc,
        };

        expect(() => desugar(match)).toThrow("VF4403");
    });

    it("accepts literal-only or-pattern alternatives", () => {
        // match s { | "a" | "b" => "ok" | _ => "other" }
        const match: Expr = {
            kind: "Match",
            expr: { kind: "Var", name: "s", loc: testLoc },
            cases: [
                {
                    pattern: {
                        kind: "OrPattern",
                        patterns: [
                            { kind: "LiteralPattern", literal: "a", loc: testLoc },
                            { kind: "LiteralPattern", literal: "b", loc: testLoc },
                        ],
                        loc: testLoc,
                    },
                    body: { kind: "StringLit", value: "ok", loc: testLoc },
                    loc: testLoc,
                },
                {
                    pattern: { kind: "WildcardPattern", loc: testLoc },
                    body: { kind: "StringLit", value: "other", loc: testLoc },
                    loc: testLoc,
                },
            ],
            loc: testLoc,
        };

        expect(() => desugar(match)).not.toThrow();
    });

    it("accepts constructor alternatives with wildcard arguments", () => {
        // match shape { | Circle(_) | Square(_) => "shape" | _ => "other" }
        const match: Expr = {
            kind: "Match",
            expr: { kind: "Var", name: "shape", loc: testLoc },
            cases: [
                {
                    pattern: {
                        kind: "OrPattern",
                        patterns: [
                            {
                                kind: "ConstructorPattern",
                                constructor: "Circle",
                                args: [{ kind: "WildcardPattern", loc: testLoc }],
                                loc: testLoc,
                            },
                            {
                                kind: "ConstructorPattern",
                                constructor: "Square",
                                args: [{ kind: "WildcardPattern", loc: testLoc }],
                                loc: testLoc,
                            },
                        ],
                        loc: testLoc,
                    },
                    body: { kind: "StringLit", value: "shape", loc: testLoc },
                    loc: testLoc,
                },
                {
                    pattern: { kind: "WildcardPattern", loc: testLoc },
                    body: { kind: "StringLit", value: "other", loc: testLoc },
                    loc: testLoc,
                },
            ],
            loc: testLoc,
        };

        expect(() => desugar(match)).not.toThrow();
    });
});

describe("Or-Pattern - Expansion Cap (VF3102)", () => {
    // Helper: build an or-pattern whose alternatives are `count` distinct
    // integer literals. `expandedSize` of this pattern equals `count`.
    function orOfNLiterals(count: number): Expr {
        const alternatives: Pattern[] = [];
        for (let i = 0; i < count; i++) {
            alternatives.push({ kind: "LiteralPattern", literal: i, loc: testLoc });
        }
        return {
            kind: "Match",
            expr: { kind: "Var", name: "x", loc: testLoc },
            cases: [
                {
                    pattern: { kind: "OrPattern", patterns: alternatives, loc: testLoc },
                    body: { kind: "IntLit", value: 0, loc: testLoc },
                    loc: testLoc,
                },
                {
                    pattern: { kind: "WildcardPattern", loc: testLoc },
                    body: { kind: "IntLit", value: 1, loc: testLoc },
                    loc: testLoc,
                },
            ],
            loc: testLoc,
        };
    }

    it("accepts exactly 256 expanded alternatives", () => {
        const match = orOfNLiterals(256);
        const result = desugar(match) as CoreMatch;
        // 256 alternatives + trailing wildcard
        expect(result.cases).toHaveLength(257);
    });

    it("throws VF3102 when expansion would exceed 256 cases", () => {
        const match = orOfNLiterals(257);
        expect(() => desugar(match)).toThrow("VF3102");
    });

    it("throws VF3102 for nested multiplicative fan-out", () => {
        // (0|1|..|15, 0|1|..|15) = 256 combos — on the cap
        // (0|1|..|15, 0|1|..|16) = 272 combos — over the cap
        const makeRange = (count: number): Pattern => ({
            kind: "OrPattern",
            patterns: Array.from(
                { length: count },
                (_, i): Pattern => ({ kind: "LiteralPattern", literal: i, loc: testLoc }),
            ),
            loc: testLoc,
        });

        const match: Expr = {
            kind: "Match",
            expr: { kind: "Var", name: "t", loc: testLoc },
            cases: [
                {
                    pattern: {
                        kind: "TuplePattern",
                        elements: [makeRange(16), makeRange(17)],
                        loc: testLoc,
                    },
                    body: { kind: "IntLit", value: 0, loc: testLoc },
                    loc: testLoc,
                },
                {
                    pattern: { kind: "WildcardPattern", loc: testLoc },
                    body: { kind: "IntLit", value: 1, loc: testLoc },
                    loc: testLoc,
                },
            ],
            loc: testLoc,
        };

        expect(() => desugar(match)).toThrow("VF3102");
    });
});

describe("Or-Pattern properties", () => {
    /**
     * Discard generated inputs that surface known or-pattern validator
     * diagnostics (`VF3102` — too-large expansion, `VF4403` — variable
     * binding inside an alternative). Re-throw anything else so a real
     * regression in `desugar` surfaces as a property failure instead of
     * being silently absorbed by `fc.pre(false)`.
     */
    function discardOnlyExpectedInvalidInput(error: unknown): never {
        if (error instanceof VibefunDiagnostic && (error.code === "VF3102" || error.code === "VF4403")) {
            fc.pre(false);
        }
        throw error;
    }

    /** Deep clone via JSON round-trip; isolates each desugar call from input mutation. */
    function clone<T>(value: T): T {
        return JSON.parse(JSON.stringify(value)) as T;
    }

    function makeMatch(patterns: Pattern[], body: Expr = { kind: "IntLit", value: 0, loc: testLoc }): Expr {
        return {
            kind: "Match",
            expr: { kind: "Var", name: "scrutinee", loc: testLoc },
            cases: [
                {
                    pattern:
                        patterns.length === 1
                            ? (patterns[0] as Pattern)
                            : { kind: "OrPattern", patterns, loc: testLoc },
                    body,
                    loc: testLoc,
                },
            ],
            loc: testLoc,
        };
    }

    it("property: nested or-patterns flatten — `(p1 | p2) | p3` expands the same as `p1 | p2 | p3`", () => {
        // The defining property of or-pattern desugaring: associativity of
        // alternation. A flat 3-arm or-pattern and a left-nested 3-arm
        // or-pattern must produce structurally identical Core ASTs.
        fc.assert(
            fc.property(fc.array(patternArb({ depth: 1 }), { minLength: 2, maxLength: 4 }), (patterns) => {
                const body: Expr = { kind: "IntLit", value: 1, loc: testLoc };
                // Each desugar call gets an independently cloned pattern
                // graph AND its own body node so a mutating implementation
                // cannot mask divergence by sharing nodes between the two
                // ASTs.
                const flat = makeMatch(clone(patterns), clone(body));
                const nestedPatterns = clone(patterns);
                let nested: Pattern = nestedPatterns[0] as Pattern;
                for (let i = 1; i < nestedPatterns.length; i++) {
                    nested = {
                        kind: "OrPattern",
                        patterns: [nested, nestedPatterns[i] as Pattern],
                        loc: testLoc,
                    };
                }
                const nestedMatch: Expr = {
                    kind: "Match",
                    expr: { kind: "Var", name: "scrutinee", loc: testLoc },
                    cases: [{ pattern: nested, body: clone(body), loc: testLoc }],
                    loc: testLoc,
                };

                let flatResult: CoreExpr, nestedResult: CoreExpr;
                try {
                    flatResult = desugar(flat);
                    nestedResult = desugar(nestedMatch);
                } catch (error) {
                    discardOnlyExpectedInvalidInput(error);
                }

                // Full structural equality, not just case-body equality:
                // patterns, guards, and case ordering must all match.
                return exprEquals(flatResult, nestedResult);
            }),
        );
    });

    it("property: an or-pattern with N alternatives expands to ≥ N match cases", () => {
        // Each alternative becomes its own arm with the same body. Some
        // alternatives may further multiply if they themselves contain
        // nested or-patterns; the total must therefore be ≥ N.
        fc.assert(
            // minLength: 2 ensures `makeMatch` actually wraps the patterns
            // in an `OrPattern` (single-element arrays bypass the wrapping),
            // so the property exercises or-pattern expansion every iteration.
            fc.property(fc.array(patternArb({ depth: 1 }), { minLength: 2, maxLength: 4 }), (patterns) => {
                // Snapshot the alternative count *before* desugaring and
                // hand `makeMatch` a clone — otherwise an in-place mutation
                // of `patterns` could weaken the post-call comparison.
                const expectedAlternatives = patterns.length;
                let result: CoreMatch;
                try {
                    result = desugar(makeMatch(clone(patterns))) as CoreMatch;
                } catch (error) {
                    discardOnlyExpectedInvalidInput(error);
                }
                return result.cases.length >= expectedAlternatives;
            }),
        );
    });

    it("property: or-pattern desugaring is deterministic", () => {
        fc.assert(
            // minLength: 2 ensures `makeMatch` actually wraps the patterns
            // in an `OrPattern` (single-element arrays bypass the wrapping),
            // so the property exercises or-pattern expansion every iteration.
            fc.property(fc.array(patternArb({ depth: 1 }), { minLength: 2, maxLength: 4 }), (patterns) => {
                // Independent clones for each run so the comparison is
                // sensitive to in-place input mutation. We also send a
                // `probe` clone *directly* through `desugar` (bypassing the
                // surrounding clone wrappers) and verify it remains
                // unchanged — that's the assertion that actually catches a
                // mutating desugar implementation.
                const original = clone(patterns);
                const probe = clone(patterns);
                const probeBefore = clone(probe);
                let a: CoreExpr, b: CoreExpr;
                try {
                    a = desugar(makeMatch(clone(patterns)));
                    b = desugar(makeMatch(clone(patterns)));
                    desugar(makeMatch(probe));
                } catch (error) {
                    discardOnlyExpectedInvalidInput(error);
                }
                expect(patterns).toEqual(original);
                expect(probe).toEqual(probeBefore);
                return exprEquals(a, b);
            }),
        );
    });
});
