/**
 * Tests for expression equality utilities
 */

import type { CoreExpr } from "../types/core-ast.js";

import { describe, expect, it } from "vitest";

import { exprEquals, exprEquivalent } from "./expr-equality.js";

const testLoc = { file: "test", line: 1, column: 1, offset: 0 };

describe("Expression Equality Utilities", () => {
    describe("exprEquals", () => {
        it("should return true for identical integer literals", () => {
            const e1: CoreExpr = { kind: "CoreIntLit", value: 42, loc: testLoc };
            const e2: CoreExpr = { kind: "CoreIntLit", value: 42, loc: testLoc };

            expect(exprEquals(e1, e2)).toBe(true);
        });

        it("should return false for different integer literals", () => {
            const e1: CoreExpr = { kind: "CoreIntLit", value: 42, loc: testLoc };
            const e2: CoreExpr = { kind: "CoreIntLit", value: 43, loc: testLoc };

            expect(exprEquals(e1, e2)).toBe(false);
        });

        it("should return true for identical variables", () => {
            const e1: CoreExpr = { kind: "CoreVar", name: "x", loc: testLoc };
            const e2: CoreExpr = { kind: "CoreVar", name: "x", loc: testLoc };

            expect(exprEquals(e1, e2)).toBe(true);
        });

        it("should return false for different variables", () => {
            const e1: CoreExpr = { kind: "CoreVar", name: "x", loc: testLoc };
            const e2: CoreExpr = { kind: "CoreVar", name: "y", loc: testLoc };

            expect(exprEquals(e1, e2)).toBe(false);
        });

        it("should return false for different expression kinds", () => {
            const e1: CoreExpr = { kind: "CoreIntLit", value: 42, loc: testLoc };
            const e2: CoreExpr = { kind: "CoreVar", name: "x", loc: testLoc };

            expect(exprEquals(e1, e2)).toBe(false);
        });

        it("should compare binary operations structurally", () => {
            const e1: CoreExpr = {
                kind: "CoreBinOp",
                op: "Add",
                left: { kind: "CoreIntLit", value: 1, loc: testLoc },
                right: { kind: "CoreIntLit", value: 2, loc: testLoc },
                loc: testLoc,
            };

            const e2: CoreExpr = {
                kind: "CoreBinOp",
                op: "Add",
                left: { kind: "CoreIntLit", value: 1, loc: testLoc },
                right: { kind: "CoreIntLit", value: 2, loc: testLoc },
                loc: testLoc,
            };

            expect(exprEquals(e1, e2)).toBe(true);
        });

        it("should detect different binary operators", () => {
            const e1: CoreExpr = {
                kind: "CoreBinOp",
                op: "Add",
                left: { kind: "CoreIntLit", value: 1, loc: testLoc },
                right: { kind: "CoreIntLit", value: 2, loc: testLoc },
                loc: testLoc,
            };

            const e2: CoreExpr = {
                kind: "CoreBinOp",
                op: "Multiply",
                left: { kind: "CoreIntLit", value: 1, loc: testLoc },
                right: { kind: "CoreIntLit", value: 2, loc: testLoc },
                loc: testLoc,
            };

            expect(exprEquals(e1, e2)).toBe(false);
        });

        it("should compare lambdas structurally", () => {
            const e1: CoreExpr = {
                kind: "CoreLambda",
                param: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                body: { kind: "CoreVar", name: "x", loc: testLoc },
                loc: testLoc,
            };

            const e2: CoreExpr = {
                kind: "CoreLambda",
                param: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                body: { kind: "CoreVar", name: "x", loc: testLoc },
                loc: testLoc,
            };

            expect(exprEquals(e1, e2)).toBe(true);
        });

        it("should detect different lambda parameters", () => {
            const e1: CoreExpr = {
                kind: "CoreLambda",
                param: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                body: { kind: "CoreVar", name: "x", loc: testLoc },
                loc: testLoc,
            };

            const e2: CoreExpr = {
                kind: "CoreLambda",
                param: { kind: "CoreVarPattern", name: "y", loc: testLoc },
                body: { kind: "CoreVar", name: "y", loc: testLoc },
                loc: testLoc,
            };

            expect(exprEquals(e1, e2)).toBe(false);
        });

        it("should compare let bindings", () => {
            const e1: CoreExpr = {
                kind: "CoreLet",
                pattern: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                value: { kind: "CoreIntLit", value: 1, loc: testLoc },
                body: { kind: "CoreVar", name: "x", loc: testLoc },
                mutable: false,
                recursive: false,
                loc: testLoc,
            };

            const e2: CoreExpr = {
                kind: "CoreLet",
                pattern: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                value: { kind: "CoreIntLit", value: 1, loc: testLoc },
                body: { kind: "CoreVar", name: "x", loc: testLoc },
                mutable: false,
                recursive: false,
                loc: testLoc,
            };

            expect(exprEquals(e1, e2)).toBe(true);
        });

        it("should detect different mutability flags", () => {
            const e1: CoreExpr = {
                kind: "CoreLet",
                pattern: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                value: { kind: "CoreIntLit", value: 1, loc: testLoc },
                body: { kind: "CoreVar", name: "x", loc: testLoc },
                mutable: false,
                recursive: false,
                loc: testLoc,
            };

            const e2: CoreExpr = {
                kind: "CoreLet",
                pattern: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                value: { kind: "CoreIntLit", value: 1, loc: testLoc },
                body: { kind: "CoreVar", name: "x", loc: testLoc },
                mutable: true, // Different!
                recursive: false,
                loc: testLoc,
            };

            expect(exprEquals(e1, e2)).toBe(false);
        });

        it("should compare function applications", () => {
            const e1: CoreExpr = {
                kind: "CoreApp",
                func: { kind: "CoreVar", name: "f", loc: testLoc },
                args: [
                    { kind: "CoreIntLit", value: 1, loc: testLoc },
                    { kind: "CoreIntLit", value: 2, loc: testLoc },
                ],
                loc: testLoc,
            };

            const e2: CoreExpr = {
                kind: "CoreApp",
                func: { kind: "CoreVar", name: "f", loc: testLoc },
                args: [
                    { kind: "CoreIntLit", value: 1, loc: testLoc },
                    { kind: "CoreIntLit", value: 2, loc: testLoc },
                ],
                loc: testLoc,
            };

            expect(exprEquals(e1, e2)).toBe(true);
        });

        it("should detect different number of arguments", () => {
            const e1: CoreExpr = {
                kind: "CoreApp",
                func: { kind: "CoreVar", name: "f", loc: testLoc },
                args: [{ kind: "CoreIntLit", value: 1, loc: testLoc }],
                loc: testLoc,
            };

            const e2: CoreExpr = {
                kind: "CoreApp",
                func: { kind: "CoreVar", name: "f", loc: testLoc },
                args: [
                    { kind: "CoreIntLit", value: 1, loc: testLoc },
                    { kind: "CoreIntLit", value: 2, loc: testLoc },
                ],
                loc: testLoc,
            };

            expect(exprEquals(e1, e2)).toBe(false);
        });

        it("should compare records", () => {
            const e1: CoreExpr = {
                kind: "CoreRecord",
                fields: [
                    {
                        kind: "Field",
                        name: "x",
                        value: { kind: "CoreIntLit", value: 1, loc: testLoc },
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            };

            const e2: CoreExpr = {
                kind: "CoreRecord",
                fields: [
                    {
                        kind: "Field",
                        name: "x",
                        value: { kind: "CoreIntLit", value: 1, loc: testLoc },
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            };

            expect(exprEquals(e1, e2)).toBe(true);
        });

        it("should detect different record field names", () => {
            const e1: CoreExpr = {
                kind: "CoreRecord",
                fields: [
                    {
                        kind: "Field",
                        name: "x",
                        value: { kind: "CoreIntLit", value: 1, loc: testLoc },
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            };

            const e2: CoreExpr = {
                kind: "CoreRecord",
                fields: [
                    {
                        kind: "Field",
                        name: "y", // Different!
                        value: { kind: "CoreIntLit", value: 1, loc: testLoc },
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            };

            expect(exprEquals(e1, e2)).toBe(false);
        });

        it("should compare match expressions", () => {
            const e1: CoreExpr = {
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

            const e2: CoreExpr = {
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

            expect(exprEquals(e1, e2)).toBe(true);
        });

        it("should handle guards in match cases", () => {
            const e1: CoreExpr = {
                kind: "CoreMatch",
                expr: { kind: "CoreVar", name: "x", loc: testLoc },
                cases: [
                    {
                        pattern: { kind: "CoreVarPattern", name: "n", loc: testLoc },
                        guard: {
                            kind: "CoreBinOp",
                            op: "GreaterThan",
                            left: { kind: "CoreVar", name: "n", loc: testLoc },
                            right: { kind: "CoreIntLit", value: 0, loc: testLoc },
                            loc: testLoc,
                        },
                        body: { kind: "CoreIntLit", value: 1, loc: testLoc },
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            };

            const e2: CoreExpr = {
                kind: "CoreMatch",
                expr: { kind: "CoreVar", name: "x", loc: testLoc },
                cases: [
                    {
                        pattern: { kind: "CoreVarPattern", name: "n", loc: testLoc },
                        guard: {
                            kind: "CoreBinOp",
                            op: "GreaterThan",
                            left: { kind: "CoreVar", name: "n", loc: testLoc },
                            right: { kind: "CoreIntLit", value: 0, loc: testLoc },
                            loc: testLoc,
                        },
                        body: { kind: "CoreIntLit", value: 1, loc: testLoc },
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            };

            expect(exprEquals(e1, e2)).toBe(true);
        });

        it("should detect different guards", () => {
            const e1: CoreExpr = {
                kind: "CoreMatch",
                expr: { kind: "CoreVar", name: "x", loc: testLoc },
                cases: [
                    {
                        pattern: { kind: "CoreVarPattern", name: "n", loc: testLoc },
                        guard: { kind: "CoreBoolLit", value: true, loc: testLoc },
                        body: { kind: "CoreIntLit", value: 1, loc: testLoc },
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            };

            const e2: CoreExpr = {
                kind: "CoreMatch",
                expr: { kind: "CoreVar", name: "x", loc: testLoc },
                cases: [
                    {
                        pattern: { kind: "CoreVarPattern", name: "n", loc: testLoc },
                        body: { kind: "CoreIntLit", value: 1, loc: testLoc },
                        loc: testLoc,
                        // No guard
                    },
                ],
                loc: testLoc,
            };

            expect(exprEquals(e1, e2)).toBe(false);
        });

        it("should compare nested expressions deeply", () => {
            // (1 + 2) * (3 + 4)
            const e1: CoreExpr = {
                kind: "CoreBinOp",
                op: "Multiply",
                left: {
                    kind: "CoreBinOp",
                    op: "Add",
                    left: { kind: "CoreIntLit", value: 1, loc: testLoc },
                    right: { kind: "CoreIntLit", value: 2, loc: testLoc },
                    loc: testLoc,
                },
                right: {
                    kind: "CoreBinOp",
                    op: "Add",
                    left: { kind: "CoreIntLit", value: 3, loc: testLoc },
                    right: { kind: "CoreIntLit", value: 4, loc: testLoc },
                    loc: testLoc,
                },
                loc: testLoc,
            };

            const e2: CoreExpr = {
                kind: "CoreBinOp",
                op: "Multiply",
                left: {
                    kind: "CoreBinOp",
                    op: "Add",
                    left: { kind: "CoreIntLit", value: 1, loc: testLoc },
                    right: { kind: "CoreIntLit", value: 2, loc: testLoc },
                    loc: testLoc,
                },
                right: {
                    kind: "CoreBinOp",
                    op: "Add",
                    left: { kind: "CoreIntLit", value: 3, loc: testLoc },
                    right: { kind: "CoreIntLit", value: 4, loc: testLoc },
                    loc: testLoc,
                },
                loc: testLoc,
            };

            expect(exprEquals(e1, e2)).toBe(true);
        });
    });

    describe("exprEquivalent", () => {
        it("should delegate to exprEquals for now", () => {
            const e1: CoreExpr = { kind: "CoreIntLit", value: 42, loc: testLoc };
            const e2: CoreExpr = { kind: "CoreIntLit", value: 42, loc: testLoc };

            expect(exprEquivalent(e1, e2)).toBe(true);
            expect(exprEquivalent(e1, e2)).toBe(exprEquals(e1, e2));
        });
    });
});
