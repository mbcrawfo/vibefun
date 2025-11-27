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

    describe("literal types", () => {
        it("should compare float literals", () => {
            const e1: CoreExpr = { kind: "CoreFloatLit", value: 3.14, loc: testLoc };
            const e2: CoreExpr = { kind: "CoreFloatLit", value: 3.14, loc: testLoc };
            const e3: CoreExpr = { kind: "CoreFloatLit", value: 2.71, loc: testLoc };

            expect(exprEquals(e1, e2)).toBe(true);
            expect(exprEquals(e1, e3)).toBe(false);
        });

        it("should compare string literals", () => {
            const e1: CoreExpr = { kind: "CoreStringLit", value: "hello", loc: testLoc };
            const e2: CoreExpr = { kind: "CoreStringLit", value: "hello", loc: testLoc };
            const e3: CoreExpr = { kind: "CoreStringLit", value: "world", loc: testLoc };

            expect(exprEquals(e1, e2)).toBe(true);
            expect(exprEquals(e1, e3)).toBe(false);
        });

        it("should compare bool literals", () => {
            const e1: CoreExpr = { kind: "CoreBoolLit", value: true, loc: testLoc };
            const e2: CoreExpr = { kind: "CoreBoolLit", value: true, loc: testLoc };
            const e3: CoreExpr = { kind: "CoreBoolLit", value: false, loc: testLoc };

            expect(exprEquals(e1, e2)).toBe(true);
            expect(exprEquals(e1, e3)).toBe(false);
        });

        it("should compare unit literals", () => {
            const e1: CoreExpr = { kind: "CoreUnitLit", loc: testLoc };
            const e2: CoreExpr = { kind: "CoreUnitLit", loc: testLoc };

            expect(exprEquals(e1, e2)).toBe(true);
        });
    });

    describe("unary operations", () => {
        it("should compare unary operations with same operator", () => {
            const e1: CoreExpr = {
                kind: "CoreUnaryOp",
                op: "Negate",
                expr: { kind: "CoreIntLit", value: 42, loc: testLoc },
                loc: testLoc,
            };
            const e2: CoreExpr = {
                kind: "CoreUnaryOp",
                op: "Negate",
                expr: { kind: "CoreIntLit", value: 42, loc: testLoc },
                loc: testLoc,
            };

            expect(exprEquals(e1, e2)).toBe(true);
        });

        it("should detect different unary operators", () => {
            const e1: CoreExpr = {
                kind: "CoreUnaryOp",
                op: "Negate",
                expr: { kind: "CoreIntLit", value: 42, loc: testLoc },
                loc: testLoc,
            };
            const e2: CoreExpr = {
                kind: "CoreUnaryOp",
                op: "LogicalNot",
                expr: { kind: "CoreBoolLit", value: true, loc: testLoc },
                loc: testLoc,
            };

            expect(exprEquals(e1, e2)).toBe(false);
        });
    });

    describe("tuples", () => {
        it("should compare tuples with same elements", () => {
            const e1: CoreExpr = {
                kind: "CoreTuple",
                elements: [
                    { kind: "CoreIntLit", value: 1, loc: testLoc },
                    { kind: "CoreStringLit", value: "a", loc: testLoc },
                ],
                loc: testLoc,
            };
            const e2: CoreExpr = {
                kind: "CoreTuple",
                elements: [
                    { kind: "CoreIntLit", value: 1, loc: testLoc },
                    { kind: "CoreStringLit", value: "a", loc: testLoc },
                ],
                loc: testLoc,
            };

            expect(exprEquals(e1, e2)).toBe(true);
        });

        it("should detect different tuple elements", () => {
            const e1: CoreExpr = {
                kind: "CoreTuple",
                elements: [
                    { kind: "CoreIntLit", value: 1, loc: testLoc },
                    { kind: "CoreIntLit", value: 2, loc: testLoc },
                ],
                loc: testLoc,
            };
            const e2: CoreExpr = {
                kind: "CoreTuple",
                elements: [
                    { kind: "CoreIntLit", value: 1, loc: testLoc },
                    { kind: "CoreIntLit", value: 3, loc: testLoc },
                ],
                loc: testLoc,
            };

            expect(exprEquals(e1, e2)).toBe(false);
        });

        it("should detect different tuple lengths", () => {
            const e1: CoreExpr = {
                kind: "CoreTuple",
                elements: [{ kind: "CoreIntLit", value: 1, loc: testLoc }],
                loc: testLoc,
            };
            const e2: CoreExpr = {
                kind: "CoreTuple",
                elements: [
                    { kind: "CoreIntLit", value: 1, loc: testLoc },
                    { kind: "CoreIntLit", value: 2, loc: testLoc },
                ],
                loc: testLoc,
            };

            expect(exprEquals(e1, e2)).toBe(false);
        });

        it("should compare empty tuples", () => {
            const e1: CoreExpr = { kind: "CoreTuple", elements: [], loc: testLoc };
            const e2: CoreExpr = { kind: "CoreTuple", elements: [], loc: testLoc };

            expect(exprEquals(e1, e2)).toBe(true);
        });
    });

    describe("type annotation", () => {
        it("should compare type annotations based on inner expression", () => {
            const e1: CoreExpr = {
                kind: "CoreTypeAnnotation",
                expr: { kind: "CoreIntLit", value: 42, loc: testLoc },
                typeExpr: { kind: "CoreTypeConst", name: "Int", loc: testLoc },
                loc: testLoc,
            };
            const e2: CoreExpr = {
                kind: "CoreTypeAnnotation",
                expr: { kind: "CoreIntLit", value: 42, loc: testLoc },
                typeExpr: { kind: "CoreTypeConst", name: "Int", loc: testLoc },
                loc: testLoc,
            };

            expect(exprEquals(e1, e2)).toBe(true);
        });

        it("should detect different inner expressions in type annotations", () => {
            const e1: CoreExpr = {
                kind: "CoreTypeAnnotation",
                expr: { kind: "CoreIntLit", value: 42, loc: testLoc },
                typeExpr: { kind: "CoreTypeConst", name: "Int", loc: testLoc },
                loc: testLoc,
            };
            const e2: CoreExpr = {
                kind: "CoreTypeAnnotation",
                expr: { kind: "CoreIntLit", value: 43, loc: testLoc },
                typeExpr: { kind: "CoreTypeConst", name: "Int", loc: testLoc },
                loc: testLoc,
            };

            expect(exprEquals(e1, e2)).toBe(false);
        });
    });

    describe("unsafe blocks", () => {
        it("should compare unsafe blocks", () => {
            const e1: CoreExpr = {
                kind: "CoreUnsafe",
                expr: { kind: "CoreIntLit", value: 42, loc: testLoc },
                loc: testLoc,
            };
            const e2: CoreExpr = {
                kind: "CoreUnsafe",
                expr: { kind: "CoreIntLit", value: 42, loc: testLoc },
                loc: testLoc,
            };

            expect(exprEquals(e1, e2)).toBe(true);
        });

        it("should detect different expressions in unsafe blocks", () => {
            const e1: CoreExpr = {
                kind: "CoreUnsafe",
                expr: { kind: "CoreIntLit", value: 42, loc: testLoc },
                loc: testLoc,
            };
            const e2: CoreExpr = {
                kind: "CoreUnsafe",
                expr: { kind: "CoreIntLit", value: 43, loc: testLoc },
                loc: testLoc,
            };

            expect(exprEquals(e1, e2)).toBe(false);
        });
    });

    describe("variant constructors", () => {
        it("should compare variant constructors with same name and args", () => {
            const e1: CoreExpr = {
                kind: "CoreVariant",
                constructor: "Some",
                args: [{ kind: "CoreIntLit", value: 42, loc: testLoc }],
                loc: testLoc,
            };
            const e2: CoreExpr = {
                kind: "CoreVariant",
                constructor: "Some",
                args: [{ kind: "CoreIntLit", value: 42, loc: testLoc }],
                loc: testLoc,
            };

            expect(exprEquals(e1, e2)).toBe(true);
        });

        it("should detect different constructor names", () => {
            const e1: CoreExpr = {
                kind: "CoreVariant",
                constructor: "Some",
                args: [{ kind: "CoreIntLit", value: 42, loc: testLoc }],
                loc: testLoc,
            };
            const e2: CoreExpr = {
                kind: "CoreVariant",
                constructor: "None",
                args: [],
                loc: testLoc,
            };

            expect(exprEquals(e1, e2)).toBe(false);
        });

        it("should detect different args in variants", () => {
            const e1: CoreExpr = {
                kind: "CoreVariant",
                constructor: "Some",
                args: [{ kind: "CoreIntLit", value: 42, loc: testLoc }],
                loc: testLoc,
            };
            const e2: CoreExpr = {
                kind: "CoreVariant",
                constructor: "Some",
                args: [{ kind: "CoreIntLit", value: 43, loc: testLoc }],
                loc: testLoc,
            };

            expect(exprEquals(e1, e2)).toBe(false);
        });

        it("should compare variants with multiple args", () => {
            const e1: CoreExpr = {
                kind: "CoreVariant",
                constructor: "Pair",
                args: [
                    { kind: "CoreIntLit", value: 1, loc: testLoc },
                    { kind: "CoreIntLit", value: 2, loc: testLoc },
                ],
                loc: testLoc,
            };
            const e2: CoreExpr = {
                kind: "CoreVariant",
                constructor: "Pair",
                args: [
                    { kind: "CoreIntLit", value: 1, loc: testLoc },
                    { kind: "CoreIntLit", value: 2, loc: testLoc },
                ],
                loc: testLoc,
            };

            expect(exprEquals(e1, e2)).toBe(true);
        });
    });

    describe("record access", () => {
        it("should compare record access expressions", () => {
            const e1: CoreExpr = {
                kind: "CoreRecordAccess",
                record: { kind: "CoreVar", name: "r", loc: testLoc },
                field: "x",
                loc: testLoc,
            };
            const e2: CoreExpr = {
                kind: "CoreRecordAccess",
                record: { kind: "CoreVar", name: "r", loc: testLoc },
                field: "x",
                loc: testLoc,
            };

            expect(exprEquals(e1, e2)).toBe(true);
        });

        it("should detect different field names in record access", () => {
            const e1: CoreExpr = {
                kind: "CoreRecordAccess",
                record: { kind: "CoreVar", name: "r", loc: testLoc },
                field: "x",
                loc: testLoc,
            };
            const e2: CoreExpr = {
                kind: "CoreRecordAccess",
                record: { kind: "CoreVar", name: "r", loc: testLoc },
                field: "y",
                loc: testLoc,
            };

            expect(exprEquals(e1, e2)).toBe(false);
        });
    });

    describe("record update", () => {
        it("should compare record updates with same updates", () => {
            const e1: CoreExpr = {
                kind: "CoreRecordUpdate",
                record: { kind: "CoreVar", name: "r", loc: testLoc },
                updates: [
                    {
                        kind: "Field",
                        name: "x",
                        value: { kind: "CoreIntLit", value: 42, loc: testLoc },
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            };
            const e2: CoreExpr = {
                kind: "CoreRecordUpdate",
                record: { kind: "CoreVar", name: "r", loc: testLoc },
                updates: [
                    {
                        kind: "Field",
                        name: "x",
                        value: { kind: "CoreIntLit", value: 42, loc: testLoc },
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            };

            expect(exprEquals(e1, e2)).toBe(true);
        });

        it("should detect different update values", () => {
            const e1: CoreExpr = {
                kind: "CoreRecordUpdate",
                record: { kind: "CoreVar", name: "r", loc: testLoc },
                updates: [
                    {
                        kind: "Field",
                        name: "x",
                        value: { kind: "CoreIntLit", value: 42, loc: testLoc },
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            };
            const e2: CoreExpr = {
                kind: "CoreRecordUpdate",
                record: { kind: "CoreVar", name: "r", loc: testLoc },
                updates: [
                    {
                        kind: "Field",
                        name: "x",
                        value: { kind: "CoreIntLit", value: 43, loc: testLoc },
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            };

            expect(exprEquals(e1, e2)).toBe(false);
        });

        it("should compare record updates with spread", () => {
            const e1: CoreExpr = {
                kind: "CoreRecordUpdate",
                record: { kind: "CoreVar", name: "r", loc: testLoc },
                updates: [
                    {
                        kind: "Spread",
                        expr: { kind: "CoreVar", name: "other", loc: testLoc },
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            };
            const e2: CoreExpr = {
                kind: "CoreRecordUpdate",
                record: { kind: "CoreVar", name: "r", loc: testLoc },
                updates: [
                    {
                        kind: "Spread",
                        expr: { kind: "CoreVar", name: "other", loc: testLoc },
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            };

            expect(exprEquals(e1, e2)).toBe(true);
        });
    });

    describe("let rec expressions", () => {
        it("should compare let rec expressions", () => {
            const e1: CoreExpr = {
                kind: "CoreLetRecExpr",
                bindings: [
                    {
                        pattern: { kind: "CoreVarPattern", name: "f", loc: testLoc },
                        value: {
                            kind: "CoreLambda",
                            param: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                            body: { kind: "CoreVar", name: "x", loc: testLoc },
                            loc: testLoc,
                        },
                        mutable: false,
                        loc: testLoc,
                    },
                ],
                body: { kind: "CoreVar", name: "f", loc: testLoc },
                loc: testLoc,
            };
            const e2: CoreExpr = {
                kind: "CoreLetRecExpr",
                bindings: [
                    {
                        pattern: { kind: "CoreVarPattern", name: "f", loc: testLoc },
                        value: {
                            kind: "CoreLambda",
                            param: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                            body: { kind: "CoreVar", name: "x", loc: testLoc },
                            loc: testLoc,
                        },
                        mutable: false,
                        loc: testLoc,
                    },
                ],
                body: { kind: "CoreVar", name: "f", loc: testLoc },
                loc: testLoc,
            };

            expect(exprEquals(e1, e2)).toBe(true);
        });

        it("should detect different bindings in let rec", () => {
            const e1: CoreExpr = {
                kind: "CoreLetRecExpr",
                bindings: [
                    {
                        pattern: { kind: "CoreVarPattern", name: "f", loc: testLoc },
                        value: { kind: "CoreIntLit", value: 1, loc: testLoc },
                        mutable: false,
                        loc: testLoc,
                    },
                ],
                body: { kind: "CoreVar", name: "f", loc: testLoc },
                loc: testLoc,
            };
            const e2: CoreExpr = {
                kind: "CoreLetRecExpr",
                bindings: [
                    {
                        pattern: { kind: "CoreVarPattern", name: "f", loc: testLoc },
                        value: { kind: "CoreIntLit", value: 2, loc: testLoc },
                        mutable: false,
                        loc: testLoc,
                    },
                ],
                body: { kind: "CoreVar", name: "f", loc: testLoc },
                loc: testLoc,
            };

            expect(exprEquals(e1, e2)).toBe(false);
        });

        it("should detect different number of bindings", () => {
            const e1: CoreExpr = {
                kind: "CoreLetRecExpr",
                bindings: [
                    {
                        pattern: { kind: "CoreVarPattern", name: "f", loc: testLoc },
                        value: { kind: "CoreIntLit", value: 1, loc: testLoc },
                        mutable: false,
                        loc: testLoc,
                    },
                ],
                body: { kind: "CoreVar", name: "f", loc: testLoc },
                loc: testLoc,
            };
            const e2: CoreExpr = {
                kind: "CoreLetRecExpr",
                bindings: [
                    {
                        pattern: { kind: "CoreVarPattern", name: "f", loc: testLoc },
                        value: { kind: "CoreIntLit", value: 1, loc: testLoc },
                        mutable: false,
                        loc: testLoc,
                    },
                    {
                        pattern: { kind: "CoreVarPattern", name: "g", loc: testLoc },
                        value: { kind: "CoreIntLit", value: 2, loc: testLoc },
                        mutable: false,
                        loc: testLoc,
                    },
                ],
                body: { kind: "CoreVar", name: "f", loc: testLoc },
                loc: testLoc,
            };

            expect(exprEquals(e1, e2)).toBe(false);
        });
    });

    describe("pattern equality", () => {
        it("should compare literal patterns", () => {
            const e1: CoreExpr = {
                kind: "CoreMatch",
                expr: { kind: "CoreVar", name: "x", loc: testLoc },
                cases: [
                    {
                        pattern: { kind: "CoreLiteralPattern", literal: 42, loc: testLoc },
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
                        pattern: { kind: "CoreLiteralPattern", literal: 42, loc: testLoc },
                        body: { kind: "CoreIntLit", value: 1, loc: testLoc },
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            };

            expect(exprEquals(e1, e2)).toBe(true);
        });

        it("should detect different literal patterns", () => {
            const e1: CoreExpr = {
                kind: "CoreMatch",
                expr: { kind: "CoreVar", name: "x", loc: testLoc },
                cases: [
                    {
                        pattern: { kind: "CoreLiteralPattern", literal: 42, loc: testLoc },
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
                        pattern: { kind: "CoreLiteralPattern", literal: 43, loc: testLoc },
                        body: { kind: "CoreIntLit", value: 1, loc: testLoc },
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            };

            expect(exprEquals(e1, e2)).toBe(false);
        });

        it("should compare tuple patterns", () => {
            const e1: CoreExpr = {
                kind: "CoreMatch",
                expr: { kind: "CoreVar", name: "x", loc: testLoc },
                cases: [
                    {
                        pattern: {
                            kind: "CoreTuplePattern",
                            elements: [
                                { kind: "CoreVarPattern", name: "a", loc: testLoc },
                                { kind: "CoreVarPattern", name: "b", loc: testLoc },
                            ],
                            loc: testLoc,
                        },
                        body: { kind: "CoreVar", name: "a", loc: testLoc },
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
                        pattern: {
                            kind: "CoreTuplePattern",
                            elements: [
                                { kind: "CoreVarPattern", name: "a", loc: testLoc },
                                { kind: "CoreVarPattern", name: "b", loc: testLoc },
                            ],
                            loc: testLoc,
                        },
                        body: { kind: "CoreVar", name: "a", loc: testLoc },
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            };

            expect(exprEquals(e1, e2)).toBe(true);
        });

        it("should compare variant patterns", () => {
            const e1: CoreExpr = {
                kind: "CoreMatch",
                expr: { kind: "CoreVar", name: "x", loc: testLoc },
                cases: [
                    {
                        pattern: {
                            kind: "CoreVariantPattern",
                            constructor: "Some",
                            args: [{ kind: "CoreVarPattern", name: "v", loc: testLoc }],
                            loc: testLoc,
                        },
                        body: { kind: "CoreVar", name: "v", loc: testLoc },
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
                        pattern: {
                            kind: "CoreVariantPattern",
                            constructor: "Some",
                            args: [{ kind: "CoreVarPattern", name: "v", loc: testLoc }],
                            loc: testLoc,
                        },
                        body: { kind: "CoreVar", name: "v", loc: testLoc },
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            };

            expect(exprEquals(e1, e2)).toBe(true);
        });

        it("should compare record patterns", () => {
            const e1: CoreExpr = {
                kind: "CoreMatch",
                expr: { kind: "CoreVar", name: "x", loc: testLoc },
                cases: [
                    {
                        pattern: {
                            kind: "CoreRecordPattern",
                            fields: [
                                {
                                    name: "x",
                                    pattern: { kind: "CoreVarPattern", name: "a", loc: testLoc },
                                    loc: testLoc,
                                },
                            ],
                            loc: testLoc,
                        },
                        body: { kind: "CoreVar", name: "a", loc: testLoc },
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
                        pattern: {
                            kind: "CoreRecordPattern",
                            fields: [
                                {
                                    name: "x",
                                    pattern: { kind: "CoreVarPattern", name: "a", loc: testLoc },
                                    loc: testLoc,
                                },
                            ],
                            loc: testLoc,
                        },
                        body: { kind: "CoreVar", name: "a", loc: testLoc },
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            };

            expect(exprEquals(e1, e2)).toBe(true);
        });
    });

    describe("records with spread", () => {
        it("should compare records with spread fields", () => {
            const e1: CoreExpr = {
                kind: "CoreRecord",
                fields: [
                    {
                        kind: "Spread",
                        expr: { kind: "CoreVar", name: "other", loc: testLoc },
                        loc: testLoc,
                    },
                    {
                        kind: "Field",
                        name: "x",
                        value: { kind: "CoreIntLit", value: 42, loc: testLoc },
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            };
            const e2: CoreExpr = {
                kind: "CoreRecord",
                fields: [
                    {
                        kind: "Spread",
                        expr: { kind: "CoreVar", name: "other", loc: testLoc },
                        loc: testLoc,
                    },
                    {
                        kind: "Field",
                        name: "x",
                        value: { kind: "CoreIntLit", value: 42, loc: testLoc },
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            };

            expect(exprEquals(e1, e2)).toBe(true);
        });

        it("should detect different spread expressions", () => {
            const e1: CoreExpr = {
                kind: "CoreRecord",
                fields: [
                    {
                        kind: "Spread",
                        expr: { kind: "CoreVar", name: "a", loc: testLoc },
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            };
            const e2: CoreExpr = {
                kind: "CoreRecord",
                fields: [
                    {
                        kind: "Spread",
                        expr: { kind: "CoreVar", name: "b", loc: testLoc },
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            };

            expect(exprEquals(e1, e2)).toBe(false);
        });
    });
});
