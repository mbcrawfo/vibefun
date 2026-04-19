/**
 * Tests for or-pattern expansion in match expressions
 *
 * Or-patterns are desugared by expanding into multiple match cases:
 * match x { | "a" | "b" | "c" => expr }
 * =>
 * match x { | "a" => expr | "b" => expr | "c" => expr }
 */

import type { Expr, Location, Pattern } from "../types/ast.js";
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

describe("Or-Pattern - Deeply Nested", () => {
    it("should expand or-pattern with deeply nested constructor patterns", () => {
        // match x { | Some(Left(1)) | Some(Right(1)) => "nested" }
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
                                args: [
                                    {
                                        kind: "ConstructorPattern",
                                        constructor: "Left",
                                        args: [{ kind: "LiteralPattern", literal: 1, loc: testLoc }],
                                        loc: testLoc,
                                    },
                                ],
                                loc: testLoc,
                            },
                            {
                                kind: "ConstructorPattern",
                                constructor: "Some",
                                args: [
                                    {
                                        kind: "ConstructorPattern",
                                        constructor: "Right",
                                        args: [{ kind: "LiteralPattern", literal: 1, loc: testLoc }],
                                        loc: testLoc,
                                    },
                                ],
                                loc: testLoc,
                            },
                        ],
                        loc: testLoc,
                    },
                    body: { kind: "StringLit", value: "nested", loc: testLoc },
                    loc: testLoc,
                },
            ],
            loc: testLoc,
        };

        const result = desugar(match) as CoreMatch;

        expect(result.kind).toBe("CoreMatch");
        expect(result.cases).toHaveLength(2);

        // First case: Some(Left(1))
        const pattern0 = result.cases[0]!.pattern as CoreVariantPattern;
        expect(pattern0.kind).toBe("CoreVariantPattern");
        expect(pattern0.constructor).toBe("Some");
        const inner0 = pattern0.args[0] as CoreVariantPattern;
        expect(inner0.kind).toBe("CoreVariantPattern");
        expect(inner0.constructor).toBe("Left");

        // Second case: Some(Right(1))
        const pattern1 = result.cases[1]!.pattern as CoreVariantPattern;
        expect(pattern1.kind).toBe("CoreVariantPattern");
        expect(pattern1.constructor).toBe("Some");
        const inner1 = pattern1.args[0] as CoreVariantPattern;
        expect(inner1.kind).toBe("CoreVariantPattern");
        expect(inner1.constructor).toBe("Right");
    });

    it("should expand or-pattern with four levels of nesting", () => {
        // match x { | A(B(C(1))) | A(B(D(1))) => "deep" }
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
                                constructor: "A",
                                args: [
                                    {
                                        kind: "ConstructorPattern",
                                        constructor: "B",
                                        args: [
                                            {
                                                kind: "ConstructorPattern",
                                                constructor: "C",
                                                args: [{ kind: "LiteralPattern", literal: 1, loc: testLoc }],
                                                loc: testLoc,
                                            },
                                        ],
                                        loc: testLoc,
                                    },
                                ],
                                loc: testLoc,
                            },
                            {
                                kind: "ConstructorPattern",
                                constructor: "A",
                                args: [
                                    {
                                        kind: "ConstructorPattern",
                                        constructor: "B",
                                        args: [
                                            {
                                                kind: "ConstructorPattern",
                                                constructor: "D",
                                                args: [{ kind: "LiteralPattern", literal: 1, loc: testLoc }],
                                                loc: testLoc,
                                            },
                                        ],
                                        loc: testLoc,
                                    },
                                ],
                                loc: testLoc,
                            },
                        ],
                        loc: testLoc,
                    },
                    body: { kind: "StringLit", value: "deep", loc: testLoc },
                    loc: testLoc,
                },
            ],
            loc: testLoc,
        };

        const result = desugar(match) as CoreMatch;

        expect(result.kind).toBe("CoreMatch");
        expect(result.cases).toHaveLength(2);

        // Verify both cases have correct nesting
        const pattern0 = result.cases[0]!.pattern as CoreVariantPattern;
        expect(pattern0.constructor).toBe("A");
        const inner0_1 = pattern0.args[0] as CoreVariantPattern;
        expect(inner0_1.constructor).toBe("B");
        const inner0_2 = inner0_1.args[0] as CoreVariantPattern;
        expect(inner0_2.constructor).toBe("C");

        const pattern1 = result.cases[1]!.pattern as CoreVariantPattern;
        expect(pattern1.constructor).toBe("A");
        const inner1_1 = pattern1.args[0] as CoreVariantPattern;
        expect(inner1_1.constructor).toBe("B");
        const inner1_2 = inner1_1.args[0] as CoreVariantPattern;
        expect(inner1_2.constructor).toBe("D");
    });
});

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
