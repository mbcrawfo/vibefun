/**
 * Tests for or-pattern expansion in match expressions
 *
 * Or-patterns are desugared by expanding into multiple match cases:
 * match x { | "a" | "b" | "c" => expr }
 * =>
 * match x { | "a" => expr | "b" => expr | "c" => expr }
 */

import type { Expr, Location } from "../types/ast.js";

import { describe, expect, it } from "vitest";

import { desugar, FreshVarGen } from "./desugarer.js";

const testLoc: Location = {
    file: "test.vf",
    line: 1,
    column: 1,
    offset: 0,
};

describe("Or-Pattern - Two Alternatives", () => {
    it("should expand or-pattern with two literal patterns", () => {
        // match x { | 1 | 2 => "small" | other => "large" }
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
                    body: { kind: "StringLit", value: "small", loc: testLoc },
                    loc: testLoc,
                },
                {
                    pattern: { kind: "VarPattern", name: "other", loc: testLoc },
                    body: { kind: "StringLit", value: "large", loc: testLoc },
                    loc: testLoc,
                },
            ],
            loc: testLoc,
        };

        const result = desugar(match);

        expect(result.kind).toBe("CoreMatch");
        expect((result as any).cases).toHaveLength(3); // Expanded to 3 cases

        // First case: 1 => "small"
        expect((result as any).cases[0].pattern.kind).toBe("CoreLiteralPattern");
        expect((result as any).cases[0].pattern.literal).toBe(1);
        expect((result as any).cases[0].body.value).toBe("small");

        // Second case: 2 => "small"
        expect((result as any).cases[1].pattern.kind).toBe("CoreLiteralPattern");
        expect((result as any).cases[1].pattern.literal).toBe(2);
        expect((result as any).cases[1].body.value).toBe("small");

        // Third case: other => "large"
        expect((result as any).cases[2].pattern.kind).toBe("CoreVarPattern");
        expect((result as any).cases[2].pattern.name).toBe("other");
    });

    it("should expand or-pattern with string patterns", () => {
        // match x { | "a" | "b" => "vowel" | other => "consonant" }
        const match: Expr = {
            kind: "Match",
            expr: { kind: "Var", name: "x", loc: testLoc },
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
                    body: { kind: "StringLit", value: "vowel", loc: testLoc },
                    loc: testLoc,
                },
                {
                    pattern: { kind: "VarPattern", name: "other", loc: testLoc },
                    body: { kind: "StringLit", value: "consonant", loc: testLoc },
                    loc: testLoc,
                },
            ],
            loc: testLoc,
        };

        const result = desugar(match);

        expect(result.kind).toBe("CoreMatch");
        expect((result as any).cases).toHaveLength(3);
        expect((result as any).cases[0].pattern.literal).toBe("a");
        expect((result as any).cases[1].pattern.literal).toBe("b");
    });
});

describe("Or-Pattern - Three+ Alternatives", () => {
    it("should expand or-pattern with three alternatives", () => {
        // match x { | "a" | "b" | "c" => "vowel" }
        const match: Expr = {
            kind: "Match",
            expr: { kind: "Var", name: "x", loc: testLoc },
            cases: [
                {
                    pattern: {
                        kind: "OrPattern",
                        patterns: [
                            { kind: "LiteralPattern", literal: "a", loc: testLoc },
                            { kind: "LiteralPattern", literal: "b", loc: testLoc },
                            { kind: "LiteralPattern", literal: "c", loc: testLoc },
                        ],
                        loc: testLoc,
                    },
                    body: { kind: "StringLit", value: "vowel", loc: testLoc },
                    loc: testLoc,
                },
            ],
            loc: testLoc,
        };

        const result = desugar(match);

        expect(result.kind).toBe("CoreMatch");
        expect((result as any).cases).toHaveLength(3);
        expect((result as any).cases[0].pattern.literal).toBe("a");
        expect((result as any).cases[1].pattern.literal).toBe("b");
        expect((result as any).cases[2].pattern.literal).toBe("c");
    });

    it("should expand or-pattern with five alternatives", () => {
        // match x { | 1 | 2 | 3 | 4 | 5 => "digit" }
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
                            { kind: "LiteralPattern", literal: 3, loc: testLoc },
                            { kind: "LiteralPattern", literal: 4, loc: testLoc },
                            { kind: "LiteralPattern", literal: 5, loc: testLoc },
                        ],
                        loc: testLoc,
                    },
                    body: { kind: "StringLit", value: "digit", loc: testLoc },
                    loc: testLoc,
                },
            ],
            loc: testLoc,
        };

        const result = desugar(match);

        expect(result.kind).toBe("CoreMatch");
        expect((result as any).cases).toHaveLength(5);

        // Check all five cases have correct literals
        for (let i = 0; i < 5; i++) {
            expect((result as any).cases[i].pattern.literal).toBe(i + 1);
            expect((result as any).cases[i].body.value).toBe("digit");
        }
    });
});

describe("Or-Pattern - With Guards", () => {
    it("should duplicate guard to each expanded case", () => {
        // match x { | 1 | 2 when x > 0 => "positive" }
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
                    guard: {
                        kind: "BinOp",
                        op: "GreaterThan",
                        left: { kind: "Var", name: "x", loc: testLoc },
                        right: { kind: "IntLit", value: 0, loc: testLoc },
                        loc: testLoc,
                    },
                    body: { kind: "StringLit", value: "positive", loc: testLoc },
                    loc: testLoc,
                },
            ],
            loc: testLoc,
        };

        const result = desugar(match);

        expect(result.kind).toBe("CoreMatch");
        expect((result as any).cases).toHaveLength(2);

        // Both cases should have the guard
        expect((result as any).cases[0].guard).toBeDefined();
        expect((result as any).cases[0].guard.kind).toBe("CoreBinOp");
        expect((result as any).cases[1].guard).toBeDefined();
        expect((result as any).cases[1].guard.kind).toBe("CoreBinOp");
    });
});

describe("Or-Pattern - Constructor Patterns", () => {
    it("should expand or-pattern with constructor patterns", () => {
        // match x { | Some(1) | Some(2) => "small" | None => "none" }
        const match: Expr = {
            kind: "Match",
            expr: { kind: "Var", name: "x", loc: testLoc },
            cases: [
                {
                    pattern: {
                        kind: "OrPattern",
                        patterns: [
                            {
                                kind: "ConstructorPattern",
                                constructor: "Some",
                                args: [{ kind: "LiteralPattern", literal: 1, loc: testLoc }],
                                loc: testLoc,
                            },
                            {
                                kind: "ConstructorPattern",
                                constructor: "Some",
                                args: [{ kind: "LiteralPattern", literal: 2, loc: testLoc }],
                                loc: testLoc,
                            },
                        ],
                        loc: testLoc,
                    },
                    body: { kind: "StringLit", value: "small", loc: testLoc },
                    loc: testLoc,
                },
                {
                    pattern: {
                        kind: "ConstructorPattern",
                        constructor: "None",
                        args: [],
                        loc: testLoc,
                    },
                    body: { kind: "StringLit", value: "none", loc: testLoc },
                    loc: testLoc,
                },
            ],
            loc: testLoc,
        };

        const result = desugar(match);

        expect(result.kind).toBe("CoreMatch");
        expect((result as any).cases).toHaveLength(3);

        // First two cases: Some(1) and Some(2)
        expect((result as any).cases[0].pattern.kind).toBe("CoreVariantPattern");
        expect((result as any).cases[0].pattern.constructor).toBe("Some");
        expect((result as any).cases[1].pattern.kind).toBe("CoreVariantPattern");
        expect((result as any).cases[1].pattern.constructor).toBe("Some");

        // Third case: None
        expect((result as any).cases[2].pattern.constructor).toBe("None");
    });
});

describe("Or-Pattern - Multiple Or-Patterns in Same Match", () => {
    it("should expand multiple or-patterns independently", () => {
        // match x {
        //   | 1 | 2 => "small"
        //   | 8 | 9 => "large"
        //   | other => "medium"
        // }
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
                    body: { kind: "StringLit", value: "small", loc: testLoc },
                    loc: testLoc,
                },
                {
                    pattern: {
                        kind: "OrPattern",
                        patterns: [
                            { kind: "LiteralPattern", literal: 8, loc: testLoc },
                            { kind: "LiteralPattern", literal: 9, loc: testLoc },
                        ],
                        loc: testLoc,
                    },
                    body: { kind: "StringLit", value: "large", loc: testLoc },
                    loc: testLoc,
                },
                {
                    pattern: { kind: "VarPattern", name: "other", loc: testLoc },
                    body: { kind: "StringLit", value: "medium", loc: testLoc },
                    loc: testLoc,
                },
            ],
            loc: testLoc,
        };

        const result = desugar(match);

        expect(result.kind).toBe("CoreMatch");
        expect((result as any).cases).toHaveLength(5); // 2 + 2 + 1

        // Cases: 1, 2, 8, 9, other
        expect((result as any).cases[0].pattern.literal).toBe(1);
        expect((result as any).cases[0].body.value).toBe("small");
        expect((result as any).cases[1].pattern.literal).toBe(2);
        expect((result as any).cases[1].body.value).toBe("small");
        expect((result as any).cases[2].pattern.literal).toBe(8);
        expect((result as any).cases[2].body.value).toBe("large");
        expect((result as any).cases[3].pattern.literal).toBe(9);
        expect((result as any).cases[3].body.value).toBe("large");
        expect((result as any).cases[4].pattern.name).toBe("other");
        expect((result as any).cases[4].body.value).toBe("medium");
    });
});

describe("Or-Pattern - Complex Bodies", () => {
    it("should duplicate complex body expressions", () => {
        // match x { | 1 | 2 => let y = x * 2 in y + 1 }
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
                    body: {
                        kind: "Let",
                        pattern: { kind: "VarPattern", name: "y", loc: testLoc },
                        value: {
                            kind: "BinOp",
                            op: "Multiply",
                            left: { kind: "Var", name: "x", loc: testLoc },
                            right: { kind: "IntLit", value: 2, loc: testLoc },
                            loc: testLoc,
                        },
                        body: {
                            kind: "BinOp",
                            op: "Add",
                            left: { kind: "Var", name: "y", loc: testLoc },
                            right: { kind: "IntLit", value: 1, loc: testLoc },
                            loc: testLoc,
                        },
                        mutable: false,
                        recursive: false,
                        loc: testLoc,
                    },
                    loc: testLoc,
                },
            ],
            loc: testLoc,
        };

        const result = desugar(match);

        expect(result.kind).toBe("CoreMatch");
        expect((result as any).cases).toHaveLength(2);

        // Both cases should have the desugared let binding
        expect((result as any).cases[0].body.kind).toBe("CoreLet");
        expect((result as any).cases[1].body.kind).toBe("CoreLet");
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
