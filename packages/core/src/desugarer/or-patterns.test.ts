/**
 * Tests for or-pattern expansion in match expressions
 *
 * Or-patterns are desugared by expanding into multiple match cases:
 * match x { | "a" | "b" | "c" => expr }
 * =>
 * match x { | "a" => expr | "b" => expr | "c" => expr }
 */

import type { Expr, Location } from "../types/ast.js";
import type {
    CoreLiteralPattern,
    CoreMatch,
    CoreStringLit,
    CoreVariantPattern,
    CoreVarPattern,
} from "../types/core-ast.js";

import { describe, expect, it } from "vitest";

import { desugar } from "./desugarer.js";

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

        const result = desugar(match) as CoreMatch;

        expect(result.kind).toBe("CoreMatch");
        expect(result.cases).toHaveLength(3); // Expanded to 3 cases

        // First case: 1 => "small"
        const case0Pattern = result.cases[0]!.pattern as CoreLiteralPattern;
        expect(case0Pattern.kind).toBe("CoreLiteralPattern");
        expect(case0Pattern.literal).toBe(1);
        const case0Body = result.cases[0]!.body as CoreStringLit;
        expect(case0Body.value).toBe("small");

        // Second case: 2 => "small"
        const case1Pattern = result.cases[1]!.pattern as CoreLiteralPattern;
        expect(case1Pattern.kind).toBe("CoreLiteralPattern");
        expect(case1Pattern.literal).toBe(2);
        const case1Body = result.cases[1]!.body as CoreStringLit;
        expect(case1Body.value).toBe("small");

        // Third case: other => "large"
        const case2Pattern = result.cases[2]!.pattern as CoreVarPattern;
        expect(case2Pattern.kind).toBe("CoreVarPattern");
        expect(case2Pattern.name).toBe("other");
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

        const result = desugar(match) as CoreMatch;

        expect(result.kind).toBe("CoreMatch");
        expect(result.cases).toHaveLength(3);
        const pattern0 = result.cases[0]!.pattern as CoreLiteralPattern;
        expect(pattern0.literal).toBe("a");
        const pattern1 = result.cases[1]!.pattern as CoreLiteralPattern;
        expect(pattern1.literal).toBe("b");
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

        const result = desugar(match) as CoreMatch;

        expect(result.kind).toBe("CoreMatch");
        expect(result.cases).toHaveLength(3);
        const pattern0 = result.cases[0]!.pattern as CoreLiteralPattern;
        expect(pattern0.literal).toBe("a");
        const pattern1 = result.cases[1]!.pattern as CoreLiteralPattern;
        expect(pattern1.literal).toBe("b");
        const pattern2 = result.cases[2]!.pattern as CoreLiteralPattern;
        expect(pattern2.literal).toBe("c");
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

        const result = desugar(match) as CoreMatch;

        expect(result.kind).toBe("CoreMatch");
        expect(result.cases).toHaveLength(5);

        // Check all five cases have correct literals
        for (let i = 0; i < 5; i++) {
            const pattern = result.cases[i]!.pattern as CoreLiteralPattern;
            expect(pattern.literal).toBe(i + 1);
            const body = result.cases[i]!.body as CoreStringLit;
            expect(body.value).toBe("digit");
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

        const result = desugar(match) as CoreMatch;

        expect(result.kind).toBe("CoreMatch");
        expect(result.cases).toHaveLength(2);

        // Both cases should have the guard
        const guard0 = result.cases[0]!.guard;
        expect(guard0).toBeDefined();
        expect(guard0!.kind).toBe("CoreBinOp");
        const guard1 = result.cases[1]!.guard;
        expect(guard1).toBeDefined();
        expect(guard1!.kind).toBe("CoreBinOp");
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

        const result = desugar(match) as CoreMatch;

        expect(result.kind).toBe("CoreMatch");
        expect(result.cases).toHaveLength(3);

        // First two cases: Some(1) and Some(2)
        const pattern0 = result.cases[0]!.pattern as CoreVariantPattern;
        expect(pattern0.kind).toBe("CoreVariantPattern");
        expect(pattern0.constructor).toBe("Some");
        const pattern1 = result.cases[1]!.pattern as CoreVariantPattern;
        expect(pattern1.kind).toBe("CoreVariantPattern");
        expect(pattern1.constructor).toBe("Some");

        // Third case: None
        const pattern2 = result.cases[2]!.pattern as CoreVariantPattern;
        expect(pattern2.constructor).toBe("None");
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

        const result = desugar(match) as CoreMatch;

        expect(result.kind).toBe("CoreMatch");
        expect(result.cases).toHaveLength(5); // 2 + 2 + 1

        // Cases: 1, 2, 8, 9, other
        const pattern0 = result.cases[0]!.pattern as CoreLiteralPattern;
        expect(pattern0.literal).toBe(1);
        const body0 = result.cases[0]!.body as CoreStringLit;
        expect(body0.value).toBe("small");
        const pattern1 = result.cases[1]!.pattern as CoreLiteralPattern;
        expect(pattern1.literal).toBe(2);
        const body1 = result.cases[1]!.body as CoreStringLit;
        expect(body1.value).toBe("small");
        const pattern2 = result.cases[2]!.pattern as CoreLiteralPattern;
        expect(pattern2.literal).toBe(8);
        const body2 = result.cases[2]!.body as CoreStringLit;
        expect(body2.value).toBe("large");
        const pattern3 = result.cases[3]!.pattern as CoreLiteralPattern;
        expect(pattern3.literal).toBe(9);
        const body3 = result.cases[3]!.body as CoreStringLit;
        expect(body3.value).toBe("large");
        const pattern4 = result.cases[4]!.pattern as CoreVarPattern;
        expect(pattern4.name).toBe("other");
        const body4 = result.cases[4]!.body as CoreStringLit;
        expect(body4.value).toBe("medium");
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

        const result = desugar(match) as CoreMatch;

        expect(result.kind).toBe("CoreMatch");
        expect(result.cases).toHaveLength(2);

        // Both cases should have the desugared let binding
        expect(result.cases[0]!.body.kind).toBe("CoreLet");
        expect(result.cases[1]!.body.kind).toBe("CoreLet");
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
