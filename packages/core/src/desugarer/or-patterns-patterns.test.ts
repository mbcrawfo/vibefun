/**
 * Tests for or-pattern expansion in match expressions
 *
 * Or-patterns are desugared by expanding into multiple match cases:
 * match x { | "a" | "b" | "c" => expr }
 * =>
 * match x { | "a" => expr | "b" => expr | "c" => expr }
 */

import type { Expr, Location } from "../types/ast.js";
import type { CoreMatch } from "../types/core-ast.js";

import { describe, expect, it } from "vitest";

import { desugar } from "./desugarer.js";

const testLoc: Location = {
    file: "test.vf",
    line: 1,
    column: 1,
    offset: 0,
};

describe("Or-Pattern - With List Patterns", () => {
    it("should expand or-pattern with list patterns", () => {
        // match xs { | [_] | [_, _] | [_, _, _] => 1 }
        // (or-pattern alternatives cannot bind variables per VF4403)
        const match: Expr = {
            kind: "Match",
            expr: { kind: "Var", name: "xs", loc: testLoc },
            cases: [
                {
                    pattern: {
                        kind: "OrPattern",
                        patterns: [
                            {
                                kind: "ListPattern",
                                elements: [{ kind: "WildcardPattern", loc: testLoc }],
                                loc: testLoc,
                            },
                            {
                                kind: "ListPattern",
                                elements: [
                                    { kind: "WildcardPattern", loc: testLoc },
                                    { kind: "WildcardPattern", loc: testLoc },
                                ],
                                loc: testLoc,
                            },
                            {
                                kind: "ListPattern",
                                elements: [
                                    { kind: "WildcardPattern", loc: testLoc },
                                    { kind: "WildcardPattern", loc: testLoc },
                                    { kind: "WildcardPattern", loc: testLoc },
                                ],
                                loc: testLoc,
                            },
                        ],
                        loc: testLoc,
                    },
                    body: { kind: "IntLit", value: 1, loc: testLoc },
                    loc: testLoc,
                },
            ],
            loc: testLoc,
        };

        const result = desugar(match) as CoreMatch;

        expect(result.kind).toBe("CoreMatch");
        expect(result.cases).toHaveLength(3);

        // All cases should be desugared from list patterns to variant patterns (Cons/Nil)
        expect(result.cases[0]!.pattern.kind).toBe("CoreVariantPattern");
        expect(result.cases[1]!.pattern.kind).toBe("CoreVariantPattern");
        expect(result.cases[2]!.pattern.kind).toBe("CoreVariantPattern");
    });
});

describe("Or-Pattern - With Record Patterns", () => {
    it("should expand or-pattern with record patterns", () => {
        // match r { | {x: _, y: 0} | {x: _, y: 1} => 1 }
        // (or-pattern alternatives cannot bind variables per VF4403)
        const match: Expr = {
            kind: "Match",
            expr: { kind: "Var", name: "r", loc: testLoc },
            cases: [
                {
                    pattern: {
                        kind: "OrPattern",
                        patterns: [
                            {
                                kind: "RecordPattern",
                                fields: [
                                    {
                                        name: "x",
                                        pattern: { kind: "WildcardPattern", loc: testLoc },
                                        loc: testLoc,
                                    },
                                    {
                                        name: "y",
                                        pattern: { kind: "LiteralPattern", literal: 0, loc: testLoc },
                                        loc: testLoc,
                                    },
                                ],
                                loc: testLoc,
                            },
                            {
                                kind: "RecordPattern",
                                fields: [
                                    {
                                        name: "x",
                                        pattern: { kind: "WildcardPattern", loc: testLoc },
                                        loc: testLoc,
                                    },
                                    {
                                        name: "y",
                                        pattern: { kind: "LiteralPattern", literal: 1, loc: testLoc },
                                        loc: testLoc,
                                    },
                                ],
                                loc: testLoc,
                            },
                        ],
                        loc: testLoc,
                    },
                    body: { kind: "IntLit", value: 1, loc: testLoc },
                    loc: testLoc,
                },
            ],
            loc: testLoc,
        };

        const result = desugar(match) as CoreMatch;

        expect(result.kind).toBe("CoreMatch");
        expect(result.cases).toHaveLength(2);

        // Both cases should have record patterns
        expect(result.cases[0]!.pattern.kind).toBe("CoreRecordPattern");
        expect(result.cases[1]!.pattern.kind).toBe("CoreRecordPattern");
    });
});

describe("Or-Pattern - With Tuple Patterns", () => {
    it("should expand or-pattern with tuple patterns", () => {
        // match t { | (_, 0) | (_, 1) => 1 }
        // (or-pattern alternatives cannot bind variables per VF4403)
        const match: Expr = {
            kind: "Match",
            expr: { kind: "Var", name: "t", loc: testLoc },
            cases: [
                {
                    pattern: {
                        kind: "OrPattern",
                        patterns: [
                            {
                                kind: "TuplePattern",
                                elements: [
                                    { kind: "WildcardPattern", loc: testLoc },
                                    { kind: "LiteralPattern", literal: 0, loc: testLoc },
                                ],
                                loc: testLoc,
                            },
                            {
                                kind: "TuplePattern",
                                elements: [
                                    { kind: "WildcardPattern", loc: testLoc },
                                    { kind: "LiteralPattern", literal: 1, loc: testLoc },
                                ],
                                loc: testLoc,
                            },
                        ],
                        loc: testLoc,
                    },
                    body: { kind: "IntLit", value: 1, loc: testLoc },
                    loc: testLoc,
                },
            ],
            loc: testLoc,
        };

        const result = desugar(match) as CoreMatch;

        expect(result.kind).toBe("CoreMatch");
        expect(result.cases).toHaveLength(2);

        // Both cases should have tuple patterns
        expect(result.cases[0]!.pattern.kind).toBe("CoreTuplePattern");
        expect(result.cases[1]!.pattern.kind).toBe("CoreTuplePattern");
    });
});

describe("Or-Pattern - Source Locations", () => {
    it("should preserve source locations", () => {
        const matchLoc: Location = {
            file: "test.vf",
            line: 10,
            column: 5,
            offset: 100,
        };

        const match: Expr = {
            kind: "Match",
            expr: { kind: "Var", name: "x", loc: testLoc },
            cases: [
                {
                    pattern: {
                        kind: "OrPattern",
                        patterns: [
                            { kind: "LiteralPattern", literal: 1, loc: testLoc },
                            { kind: "LiteralPattern", literal: 2, loc: testLoc },
                        ],
                        loc: testLoc,
                    },
                    body: { kind: "IntLit", value: 0, loc: testLoc },
                    loc: testLoc,
                },
            ],
            loc: matchLoc,
        };

        const result = desugar(match);

        expect(result.loc).toBe(matchLoc);
    });
});
