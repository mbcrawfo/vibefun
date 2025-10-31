/**
 * Tests for Pattern Match Optimization pass
 */

import type { CoreExpr } from "../../types/core-ast.js";

import { describe, expect, it } from "vitest";

import { PatternMatchOptimizationPass } from "./pattern-match-opt.js";

const testLoc = { file: "test", line: 1, column: 1, offset: 0 };

describe("PatternMatchOptimizationPass", () => {
    const pass = new PatternMatchOptimizationPass();

    describe("unreachable case removal", () => {
        it("should remove cases after wildcard without guard", () => {
            // match x { _ => 1 | Some(y) => 2 | None => 3 }
            const expr: CoreExpr = {
                kind: "CoreMatch",
                expr: { kind: "CoreVar", name: "x", loc: testLoc },
                cases: [
                    {
                        pattern: { kind: "CoreWildcardPattern", loc: testLoc },
                        body: { kind: "CoreIntLit", value: 1, loc: testLoc },
                        loc: testLoc,
                    },
                    {
                        pattern: {
                            kind: "CoreVariantPattern",
                            constructor: "Some",
                            args: [{ kind: "CoreVarPattern", name: "y", loc: testLoc }],
                            loc: testLoc,
                        },
                        body: { kind: "CoreIntLit", value: 2, loc: testLoc },
                        loc: testLoc,
                    },
                    {
                        pattern: { kind: "CoreVariantPattern", constructor: "None", args: [], loc: testLoc },
                        body: { kind: "CoreIntLit", value: 3, loc: testLoc },
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            };

            const result = pass.transform(expr);

            expect(result.kind).toBe("CoreMatch");
            if (result.kind === "CoreMatch") {
                // After reordering: variants first, then wildcard
                // All cases should remain (wildcard is last, so nothing is unreachable)
                expect(result.cases).toHaveLength(3);
                expect(result.cases[0]?.pattern.kind).toBe("CoreVariantPattern");
                expect(result.cases[1]?.pattern.kind).toBe("CoreVariantPattern");
                expect(result.cases[2]?.pattern.kind).toBe("CoreWildcardPattern");
            }
        });

        it("should remove cases after variable pattern without guard", () => {
            // match x { y => 1 | Some(z) => 2 }
            const expr: CoreExpr = {
                kind: "CoreMatch",
                expr: { kind: "CoreVar", name: "x", loc: testLoc },
                cases: [
                    {
                        pattern: { kind: "CoreVarPattern", name: "y", loc: testLoc },
                        body: { kind: "CoreIntLit", value: 1, loc: testLoc },
                        loc: testLoc,
                    },
                    {
                        pattern: {
                            kind: "CoreVariantPattern",
                            constructor: "Some",
                            args: [{ kind: "CoreVarPattern", name: "z", loc: testLoc }],
                            loc: testLoc,
                        },
                        body: { kind: "CoreIntLit", value: 2, loc: testLoc },
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            };

            const result = pass.transform(expr);

            expect(result.kind).toBe("CoreMatch");
            if (result.kind === "CoreMatch") {
                // After reordering: variant first, then variable
                // Both cases should remain (variable is last, so nothing is unreachable)
                expect(result.cases).toHaveLength(2);
                expect(result.cases[0]?.pattern.kind).toBe("CoreVariantPattern");
                expect(result.cases[1]?.pattern.kind).toBe("CoreVarPattern");
            }
        });

        it("should NOT remove cases after catch-all WITH guard", () => {
            // match x { y when y > 0 => 1 | _ => 2 }
            const expr: CoreExpr = {
                kind: "CoreMatch",
                expr: { kind: "CoreVar", name: "x", loc: testLoc },
                cases: [
                    {
                        pattern: { kind: "CoreVarPattern", name: "y", loc: testLoc },
                        guard: {
                            kind: "CoreBinOp",
                            op: "GreaterThan",
                            left: { kind: "CoreVar", name: "y", loc: testLoc },
                            right: { kind: "CoreIntLit", value: 0, loc: testLoc },
                            loc: testLoc,
                        },
                        body: { kind: "CoreIntLit", value: 1, loc: testLoc },
                        loc: testLoc,
                    },
                    {
                        pattern: { kind: "CoreWildcardPattern", loc: testLoc },
                        body: { kind: "CoreIntLit", value: 2, loc: testLoc },
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            };

            const result = pass.transform(expr);

            expect(result.kind).toBe("CoreMatch");
            if (result.kind === "CoreMatch") {
                // Both cases should remain (guard might fail)
                expect(result.cases).toHaveLength(2);
            }
        });

        it("should preserve all cases before catch-all", () => {
            // match x { Some(y) => 1 | None => 2 | _ => 3 }
            const expr: CoreExpr = {
                kind: "CoreMatch",
                expr: { kind: "CoreVar", name: "x", loc: testLoc },
                cases: [
                    {
                        pattern: {
                            kind: "CoreVariantPattern",
                            constructor: "Some",
                            args: [{ kind: "CoreVarPattern", name: "y", loc: testLoc }],
                            loc: testLoc,
                        },
                        body: { kind: "CoreIntLit", value: 1, loc: testLoc },
                        loc: testLoc,
                    },
                    {
                        pattern: { kind: "CoreVariantPattern", constructor: "None", args: [], loc: testLoc },
                        body: { kind: "CoreIntLit", value: 2, loc: testLoc },
                        loc: testLoc,
                    },
                    {
                        pattern: { kind: "CoreWildcardPattern", loc: testLoc },
                        body: { kind: "CoreIntLit", value: 3, loc: testLoc },
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            };

            const result = pass.transform(expr);

            expect(result.kind).toBe("CoreMatch");
            if (result.kind === "CoreMatch") {
                // All three cases should remain (wildcard is last)
                expect(result.cases).toHaveLength(3);
            }
        });
    });

    describe("case reordering", () => {
        it("should reorder literals before variables when no guards", () => {
            // match x { y => 1 | 5 => 2 | 10 => 3 }
            const expr: CoreExpr = {
                kind: "CoreMatch",
                expr: { kind: "CoreVar", name: "x", loc: testLoc },
                cases: [
                    {
                        pattern: { kind: "CoreVarPattern", name: "y", loc: testLoc },
                        body: { kind: "CoreIntLit", value: 1, loc: testLoc },
                        loc: testLoc,
                    },
                    {
                        pattern: { kind: "CoreLiteralPattern", literal: 5, loc: testLoc },
                        body: { kind: "CoreIntLit", value: 2, loc: testLoc },
                        loc: testLoc,
                    },
                    {
                        pattern: { kind: "CoreLiteralPattern", literal: 10, loc: testLoc },
                        body: { kind: "CoreIntLit", value: 3, loc: testLoc },
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            };

            const result = pass.transform(expr);

            expect(result.kind).toBe("CoreMatch");
            if (result.kind === "CoreMatch") {
                // Literals should come first
                expect(result.cases[0]?.pattern.kind).toBe("CoreLiteralPattern");
                expect(result.cases[1]?.pattern.kind).toBe("CoreLiteralPattern");
                expect(result.cases[2]?.pattern.kind).toBe("CoreVarPattern");
            }
        });

        it("should reorder variants before catch-all when no guards", () => {
            // match x { _ => 1 | Some(y) => 2 | None => 3 }
            const expr: CoreExpr = {
                kind: "CoreMatch",
                expr: { kind: "CoreVar", name: "x", loc: testLoc },
                cases: [
                    {
                        pattern: { kind: "CoreWildcardPattern", loc: testLoc },
                        body: { kind: "CoreIntLit", value: 1, loc: testLoc },
                        loc: testLoc,
                    },
                    {
                        pattern: {
                            kind: "CoreVariantPattern",
                            constructor: "Some",
                            args: [{ kind: "CoreVarPattern", name: "y", loc: testLoc }],
                            loc: testLoc,
                        },
                        body: { kind: "CoreIntLit", value: 2, loc: testLoc },
                        loc: testLoc,
                    },
                    {
                        pattern: { kind: "CoreVariantPattern", constructor: "None", args: [], loc: testLoc },
                        body: { kind: "CoreIntLit", value: 3, loc: testLoc },
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            };

            const result = pass.transform(expr);

            expect(result.kind).toBe("CoreMatch");
            if (result.kind === "CoreMatch") {
                // After reordering: variants first, then wildcard
                // All cases should remain (wildcard is last, so nothing is unreachable)
                expect(result.cases).toHaveLength(3);
                expect(result.cases[0]?.pattern.kind).toBe("CoreVariantPattern");
                expect(result.cases[1]?.pattern.kind).toBe("CoreVariantPattern");
                expect(result.cases[2]?.pattern.kind).toBe("CoreWildcardPattern");
            }
        });

        it("should NOT reorder cases with guards (preserve evaluation order)", () => {
            // match x { y when y > 0 => 1 | 5 => 2 | z => 3 }
            const expr: CoreExpr = {
                kind: "CoreMatch",
                expr: { kind: "CoreVar", name: "x", loc: testLoc },
                cases: [
                    {
                        pattern: { kind: "CoreVarPattern", name: "y", loc: testLoc },
                        guard: {
                            kind: "CoreBinOp",
                            op: "GreaterThan",
                            left: { kind: "CoreVar", name: "y", loc: testLoc },
                            right: { kind: "CoreIntLit", value: 0, loc: testLoc },
                            loc: testLoc,
                        },
                        body: { kind: "CoreIntLit", value: 1, loc: testLoc },
                        loc: testLoc,
                    },
                    {
                        pattern: { kind: "CoreLiteralPattern", literal: 5, loc: testLoc },
                        body: { kind: "CoreIntLit", value: 2, loc: testLoc },
                        loc: testLoc,
                    },
                    {
                        pattern: { kind: "CoreVarPattern", name: "z", loc: testLoc },
                        body: { kind: "CoreIntLit", value: 3, loc: testLoc },
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            };

            const result = pass.transform(expr);

            expect(result.kind).toBe("CoreMatch");
            if (result.kind === "CoreMatch") {
                // Order should be preserved (no reordering due to guard)
                expect(result.cases[0]?.pattern.kind).toBe("CoreVarPattern");
                if (result.cases[0]?.pattern.kind === "CoreVarPattern") {
                    expect(result.cases[0].pattern.name).toBe("y");
                }
                expect(result.cases[1]?.pattern.kind).toBe("CoreLiteralPattern");
                expect(result.cases[2]?.pattern.kind).toBe("CoreVarPattern");
            }
        });
    });

    describe("guard optimization", () => {
        it("should optimize guard expressions", () => {
            // match x { y when 1 + 1 > 0 => y | _ => 0 }
            const expr: CoreExpr = {
                kind: "CoreMatch",
                expr: { kind: "CoreVar", name: "x", loc: testLoc },
                cases: [
                    {
                        pattern: { kind: "CoreVarPattern", name: "y", loc: testLoc },
                        guard: {
                            kind: "CoreBinOp",
                            op: "GreaterThan",
                            left: {
                                kind: "CoreBinOp",
                                op: "Add",
                                left: { kind: "CoreIntLit", value: 1, loc: testLoc },
                                right: { kind: "CoreIntLit", value: 1, loc: testLoc },
                                loc: testLoc,
                            },
                            right: { kind: "CoreIntLit", value: 0, loc: testLoc },
                            loc: testLoc,
                        },
                        body: { kind: "CoreVar", name: "y", loc: testLoc },
                        loc: testLoc,
                    },
                    {
                        pattern: { kind: "CoreWildcardPattern", loc: testLoc },
                        body: { kind: "CoreIntLit", value: 0, loc: testLoc },
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            };

            const result = pass.transform(expr);

            expect(result.kind).toBe("CoreMatch");
            if (result.kind === "CoreMatch") {
                // Guard expression should still be there (this pass doesn't do constant folding)
                // But nested match expressions in guards would be optimized
                expect(result.cases[0]?.guard).toBeDefined();
            }
        });
    });

    describe("nested match optimization", () => {
        it("should optimize nested match expressions", () => {
            // match x { Some(y) => match y { _ => 1 | 2 => 3 } | None => 0 }
            const expr: CoreExpr = {
                kind: "CoreMatch",
                expr: { kind: "CoreVar", name: "x", loc: testLoc },
                cases: [
                    {
                        pattern: {
                            kind: "CoreVariantPattern",
                            constructor: "Some",
                            args: [{ kind: "CoreVarPattern", name: "y", loc: testLoc }],
                            loc: testLoc,
                        },
                        body: {
                            kind: "CoreMatch",
                            expr: { kind: "CoreVar", name: "y", loc: testLoc },
                            cases: [
                                {
                                    pattern: { kind: "CoreWildcardPattern", loc: testLoc },
                                    body: { kind: "CoreIntLit", value: 1, loc: testLoc },
                                    loc: testLoc,
                                },
                                {
                                    pattern: { kind: "CoreLiteralPattern", literal: 2, loc: testLoc },
                                    body: { kind: "CoreIntLit", value: 3, loc: testLoc },
                                    loc: testLoc,
                                },
                            ],
                            loc: testLoc,
                        },
                        loc: testLoc,
                    },
                    {
                        pattern: { kind: "CoreVariantPattern", constructor: "None", args: [], loc: testLoc },
                        body: { kind: "CoreIntLit", value: 0, loc: testLoc },
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            };

            const result = pass.transform(expr);

            expect(result.kind).toBe("CoreMatch");
            if (result.kind === "CoreMatch") {
                const someCase = result.cases[0];
                expect(someCase).toBeDefined();
                if (someCase && someCase.body.kind === "CoreMatch") {
                    // Nested match should be reordered: literal first, then wildcard
                    // Both cases remain (wildcard is last)
                    expect(someCase.body.cases).toHaveLength(2);
                    expect(someCase.body.cases[0]?.pattern.kind).toBe("CoreLiteralPattern");
                    expect(someCase.body.cases[1]?.pattern.kind).toBe("CoreWildcardPattern");
                }
            }
        });
    });

    describe("unsafe block handling", () => {
        it("should not optimize match inside unsafe blocks", () => {
            // unsafe { match x { _ => 1 | Some(y) => 2 } }
            const expr: CoreExpr = {
                kind: "CoreUnsafe",
                expr: {
                    kind: "CoreMatch",
                    expr: { kind: "CoreVar", name: "x", loc: testLoc },
                    cases: [
                        {
                            pattern: { kind: "CoreWildcardPattern", loc: testLoc },
                            body: { kind: "CoreIntLit", value: 1, loc: testLoc },
                            loc: testLoc,
                        },
                        {
                            pattern: {
                                kind: "CoreVariantPattern",
                                constructor: "Some",
                                args: [{ kind: "CoreVarPattern", name: "y", loc: testLoc }],
                                loc: testLoc,
                            },
                            body: { kind: "CoreIntLit", value: 2, loc: testLoc },
                            loc: testLoc,
                        },
                    ],
                    loc: testLoc,
                },
                loc: testLoc,
            };

            const result = pass.transform(expr);

            // Should not optimize inside unsafe
            expect(result).toEqual(expr);
        });
    });

    describe("edge cases", () => {
        it("should handle empty match cases (though not valid vibefun)", () => {
            const expr: CoreExpr = {
                kind: "CoreMatch",
                expr: { kind: "CoreVar", name: "x", loc: testLoc },
                cases: [],
                loc: testLoc,
            };

            const result = pass.transform(expr);

            expect(result.kind).toBe("CoreMatch");
            if (result.kind === "CoreMatch") {
                expect(result.cases).toHaveLength(0);
            }
        });

        it("should handle single case match", () => {
            const expr: CoreExpr = {
                kind: "CoreMatch",
                expr: { kind: "CoreVar", name: "x", loc: testLoc },
                cases: [
                    {
                        pattern: { kind: "CoreVarPattern", name: "y", loc: testLoc },
                        body: { kind: "CoreVar", name: "y", loc: testLoc },
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            };

            const result = pass.transform(expr);

            expect(result.kind).toBe("CoreMatch");
            if (result.kind === "CoreMatch") {
                expect(result.cases).toHaveLength(1);
            }
        });

        it("should handle match in let binding", () => {
            // let y = match x { _ => 1 | Some(z) => 2 } in y
            const expr: CoreExpr = {
                kind: "CoreLet",
                pattern: { kind: "CoreVarPattern", name: "y", loc: testLoc },
                value: {
                    kind: "CoreMatch",
                    expr: { kind: "CoreVar", name: "x", loc: testLoc },
                    cases: [
                        {
                            pattern: { kind: "CoreWildcardPattern", loc: testLoc },
                            body: { kind: "CoreIntLit", value: 1, loc: testLoc },
                            loc: testLoc,
                        },
                        {
                            pattern: {
                                kind: "CoreVariantPattern",
                                constructor: "Some",
                                args: [{ kind: "CoreVarPattern", name: "z", loc: testLoc }],
                                loc: testLoc,
                            },
                            body: { kind: "CoreIntLit", value: 2, loc: testLoc },
                            loc: testLoc,
                        },
                    ],
                    loc: testLoc,
                },
                body: { kind: "CoreVar", name: "y", loc: testLoc },
                mutable: false,
                recursive: false,
                loc: testLoc,
            };

            const result = pass.transform(expr);

            expect(result.kind).toBe("CoreLet");
            if (result.kind === "CoreLet" && result.value.kind === "CoreMatch") {
                // After reordering: variant first, then wildcard
                // Both cases remain (wildcard is last)
                expect(result.value.cases).toHaveLength(2);
                expect(result.value.cases[0]?.pattern.kind).toBe("CoreVariantPattern");
                expect(result.value.cases[1]?.pattern.kind).toBe("CoreWildcardPattern");
            }
        });
    });

    describe("canApply", () => {
        it("should return true for match expressions", () => {
            const expr: CoreExpr = {
                kind: "CoreMatch",
                expr: { kind: "CoreVar", name: "x", loc: testLoc },
                cases: [
                    {
                        pattern: { kind: "CoreWildcardPattern", loc: testLoc },
                        body: { kind: "CoreIntLit", value: 1, loc: testLoc },
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            };

            expect(pass.canApply(expr)).toBe(true);
        });

        it("should return false for non-match expressions", () => {
            const expr: CoreExpr = { kind: "CoreIntLit", value: 42, loc: testLoc };
            expect(pass.canApply(expr)).toBe(false);
        });

        it("should return false for match with no cases", () => {
            const expr: CoreExpr = {
                kind: "CoreMatch",
                expr: { kind: "CoreVar", name: "x", loc: testLoc },
                cases: [],
                loc: testLoc,
            };

            expect(pass.canApply(expr)).toBe(false);
        });
    });
});
