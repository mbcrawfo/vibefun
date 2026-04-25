/**
 * Tests for visitExpr — extracted from ast-transform.test.ts for size.
 */

import type { CoreExpr } from "../types/core-ast.js";

import { describe, expect, it } from "vitest";

import { visitExpr } from "./ast-transform.js";

describe("AST Transform Utilities", () => {
    describe("visitExpr", () => {
        it("should visit all nodes in an expression tree", () => {
            const expr: CoreExpr = {
                kind: "CoreBinOp",
                op: "Add",
                left: {
                    kind: "CoreIntLit",
                    value: 1,
                    loc: { file: "test", line: 1, column: 1, offset: 0 },
                },
                right: {
                    kind: "CoreBinOp",
                    op: "Multiply",
                    left: {
                        kind: "CoreIntLit",
                        value: 2,
                        loc: { file: "test", line: 1, column: 1, offset: 0 },
                    },
                    right: {
                        kind: "CoreIntLit",
                        value: 3,
                        loc: { file: "test", line: 1, column: 1, offset: 0 },
                    },
                    loc: { file: "test", line: 1, column: 1, offset: 0 },
                },
                loc: { file: "test", line: 1, column: 1, offset: 0 },
            };

            const visited: string[] = [];
            visitExpr(expr, (e) => {
                visited.push(e.kind);
            });

            // Should visit: outer BinOp, left IntLit, inner BinOp, left IntLit, right IntLit
            expect(visited).toContain("CoreBinOp");
            expect(visited).toContain("CoreIntLit");
            expect(visited.filter((k) => k === "CoreBinOp").length).toBe(2);
            expect(visited.filter((k) => k === "CoreIntLit").length).toBe(3);
        });

        it("should visit match expressions and cases", () => {
            const expr: CoreExpr = {
                kind: "CoreMatch",
                expr: {
                    kind: "CoreVar",
                    name: "x",
                    loc: { file: "test", line: 1, column: 1, offset: 0 },
                },
                cases: [
                    {
                        pattern: {
                            kind: "CoreLiteralPattern",
                            literal: 1,
                            loc: { file: "test", line: 1, column: 1, offset: 0 },
                        },
                        body: {
                            kind: "CoreIntLit",
                            value: 10,
                            loc: { file: "test", line: 1, column: 1, offset: 0 },
                        },
                        loc: { file: "test", line: 1, column: 1, offset: 0 },
                    },
                ],
                loc: { file: "test", line: 1, column: 1, offset: 0 },
            };

            const visited: string[] = [];
            visitExpr(expr, (e) => {
                visited.push(e.kind);
            });

            expect(visited).toContain("CoreMatch");
            expect(visited).toContain("CoreVar");
            expect(visited).toContain("CoreIntLit");
        });
    });

    describe("visitExpr - additional expression types", () => {
        const testLoc = { file: "test", line: 1, column: 1, offset: 0 };

        it("should visit CoreLetRecExpr", () => {
            const expr: CoreExpr = {
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

            const visited: string[] = [];
            visitExpr(expr, (e) => visited.push(e.kind));

            expect(visited).toContain("CoreLetRecExpr");
            expect(visited).toContain("CoreIntLit");
            expect(visited).toContain("CoreVar");
        });

        it("should visit CoreLambda", () => {
            const expr: CoreExpr = {
                kind: "CoreLambda",
                param: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                body: { kind: "CoreIntLit", value: 42, loc: testLoc },
                loc: testLoc,
            };

            const visited: string[] = [];
            visitExpr(expr, (e) => visited.push(e.kind));

            expect(visited).toContain("CoreLambda");
            expect(visited).toContain("CoreIntLit");
        });

        it("should visit CoreRecordAccess", () => {
            const expr: CoreExpr = {
                kind: "CoreRecordAccess",
                record: { kind: "CoreVar", name: "r", loc: testLoc },
                field: "x",
                loc: testLoc,
            };

            const visited: string[] = [];
            visitExpr(expr, (e) => visited.push(e.kind));

            expect(visited).toContain("CoreRecordAccess");
            expect(visited).toContain("CoreVar");
        });

        it("should visit CoreRecordUpdate with fields and spreads", () => {
            const expr: CoreExpr = {
                kind: "CoreRecordUpdate",
                record: { kind: "CoreVar", name: "r", loc: testLoc },
                updates: [
                    {
                        kind: "Field",
                        name: "x",
                        value: { kind: "CoreIntLit", value: 1, loc: testLoc },
                        loc: testLoc,
                    },
                    {
                        kind: "Spread",
                        expr: { kind: "CoreVar", name: "other", loc: testLoc },
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            };

            const visited: string[] = [];
            visitExpr(expr, (e) => visited.push(e.kind));

            expect(visited).toContain("CoreRecordUpdate");
            expect(visited).toContain("CoreIntLit");
            expect(visited.filter((k) => k === "CoreVar").length).toBe(2);
        });

        it("should visit CoreRecord with fields and spreads", () => {
            const expr: CoreExpr = {
                kind: "CoreRecord",
                fields: [
                    {
                        kind: "Spread",
                        expr: { kind: "CoreVar", name: "base", loc: testLoc },
                        loc: testLoc,
                    },
                    {
                        kind: "Field",
                        name: "x",
                        value: { kind: "CoreIntLit", value: 1, loc: testLoc },
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            };

            const visited: string[] = [];
            visitExpr(expr, (e) => visited.push(e.kind));

            expect(visited).toContain("CoreRecord");
            expect(visited).toContain("CoreVar");
            expect(visited).toContain("CoreIntLit");
        });

        it("should visit CoreVariant", () => {
            const expr: CoreExpr = {
                kind: "CoreVariant",
                constructor: "Some",
                args: [{ kind: "CoreIntLit", value: 42, loc: testLoc }],
                loc: testLoc,
            };

            const visited: string[] = [];
            visitExpr(expr, (e) => visited.push(e.kind));

            expect(visited).toContain("CoreVariant");
            expect(visited).toContain("CoreIntLit");
        });

        it("should visit CoreUnaryOp", () => {
            const expr: CoreExpr = {
                kind: "CoreUnaryOp",
                op: "Negate",
                expr: { kind: "CoreIntLit", value: 5, loc: testLoc },
                loc: testLoc,
            };

            const visited: string[] = [];
            visitExpr(expr, (e) => visited.push(e.kind));

            expect(visited).toContain("CoreUnaryOp");
            expect(visited).toContain("CoreIntLit");
        });

        it("should visit CoreTypeAnnotation", () => {
            const expr: CoreExpr = {
                kind: "CoreTypeAnnotation",
                expr: { kind: "CoreIntLit", value: 42, loc: testLoc },
                typeExpr: { kind: "CoreTypeConst", name: "Int", loc: testLoc },
                loc: testLoc,
            };

            const visited: string[] = [];
            visitExpr(expr, (e) => visited.push(e.kind));

            expect(visited).toContain("CoreTypeAnnotation");
            expect(visited).toContain("CoreIntLit");
        });

        it("should visit CoreUnsafe", () => {
            const expr: CoreExpr = {
                kind: "CoreUnsafe",
                expr: { kind: "CoreVar", name: "x", loc: testLoc },
                loc: testLoc,
            };

            const visited: string[] = [];
            visitExpr(expr, (e) => visited.push(e.kind));

            expect(visited).toContain("CoreUnsafe");
            expect(visited).toContain("CoreVar");
        });

        it("should visit CoreTryCatch and both bodies", () => {
            const expr: CoreExpr = {
                kind: "CoreTryCatch",
                tryBody: { kind: "CoreVar", name: "x", loc: testLoc },
                catchBinder: "e",
                catchBody: { kind: "CoreIntLit", value: 0, loc: testLoc },
                loc: testLoc,
            };

            const visited: string[] = [];
            visitExpr(expr, (e) => visited.push(e.kind));

            expect(visited).toContain("CoreTryCatch");
            expect(visited).toContain("CoreVar");
            expect(visited).toContain("CoreIntLit");
        });

        it("should visit literals without children", () => {
            const literals: CoreExpr[] = [
                { kind: "CoreIntLit", value: 1, loc: testLoc },
                { kind: "CoreFloatLit", value: 1.5, loc: testLoc },
                { kind: "CoreStringLit", value: "hello", loc: testLoc },
                { kind: "CoreBoolLit", value: true, loc: testLoc },
                { kind: "CoreUnitLit", loc: testLoc },
            ];

            for (const lit of literals) {
                const visited: string[] = [];
                visitExpr(lit, (e) => visited.push(e.kind));
                expect(visited).toHaveLength(1);
            }
        });

        it("should visit CoreApp", () => {
            const expr: CoreExpr = {
                kind: "CoreApp",
                func: { kind: "CoreVar", name: "f", loc: testLoc },
                args: [
                    { kind: "CoreIntLit", value: 1, loc: testLoc },
                    { kind: "CoreIntLit", value: 2, loc: testLoc },
                ],
                loc: testLoc,
            };

            const visited: string[] = [];
            visitExpr(expr, (e) => visited.push(e.kind));

            expect(visited).toContain("CoreApp");
            expect(visited).toContain("CoreVar");
            expect(visited.filter((k) => k === "CoreIntLit").length).toBe(2);
        });

        it("should visit match with guards", () => {
            const expr: CoreExpr = {
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

            const visited: string[] = [];
            visitExpr(expr, (e) => visited.push(e.kind));

            expect(visited).toContain("CoreMatch");
            expect(visited).toContain("CoreBoolLit");
            expect(visited).toContain("CoreIntLit");
        });

        it("should visit CoreLet", () => {
            const expr: CoreExpr = {
                kind: "CoreLet",
                pattern: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                value: { kind: "CoreIntLit", value: 1, loc: testLoc },
                body: { kind: "CoreVar", name: "x", loc: testLoc },
                mutable: false,
                loc: testLoc,
            };

            const visited: string[] = [];
            visitExpr(expr, (e) => visited.push(e.kind));

            expect(visited).toContain("CoreLet");
            expect(visited).toContain("CoreIntLit");
            expect(visited).toContain("CoreVar");
        });
    });
});
