/**
 * Tests for AST transformation utilities
 */

import type { CoreExpr } from "../types/core-ast.js";

import { describe, expect, it } from "vitest";

import { foldExpr, transformChildren, transformExpr, visitExpr } from "./ast-transform.js";

describe("AST Transform Utilities", () => {
    describe("transformExpr", () => {
        it("should transform literals (pass-through)", () => {
            const expr: CoreExpr = {
                kind: "CoreIntLit",
                value: 42,
                loc: { file: "test", line: 1, column: 1, offset: 0 },
            };

            const result = transformExpr(expr, (e) => e);
            expect(result).toEqual(expr);
        });

        it("should transform variable references", () => {
            const expr: CoreExpr = {
                kind: "CoreVar",
                name: "x",
                loc: { file: "test", line: 1, column: 1, offset: 0 },
            };

            // Replace variable x with literal 42
            const result = transformExpr(expr, (e) => {
                if (e.kind === "CoreVar" && e.name === "x") {
                    return {
                        kind: "CoreIntLit",
                        value: 42,
                        loc: e.loc,
                    };
                }
                return e;
            });

            expect(result).toEqual({
                kind: "CoreIntLit",
                value: 42,
                loc: expr.loc,
            });
        });

        it("should transform binary operations bottom-up", () => {
            const expr: CoreExpr = {
                kind: "CoreBinOp",
                op: "Add",
                left: {
                    kind: "CoreIntLit",
                    value: 1,
                    loc: { file: "test", line: 1, column: 1, offset: 0 },
                },
                right: {
                    kind: "CoreIntLit",
                    value: 2,
                    loc: { file: "test", line: 1, column: 1, offset: 0 },
                },
                loc: { file: "test", line: 1, column: 1, offset: 0 },
            };

            // Double all integer literals
            const result = transformExpr(expr, (e) => {
                if (e.kind === "CoreIntLit") {
                    return {
                        ...e,
                        value: e.value * 2,
                    };
                }
                return e;
            });

            expect(result.kind).toBe("CoreBinOp");
            if (result.kind === "CoreBinOp") {
                expect(result.left).toEqual({
                    kind: "CoreIntLit",
                    value: 2,
                    loc: expr.loc,
                });
                expect(result.right).toEqual({
                    kind: "CoreIntLit",
                    value: 4,
                    loc: expr.loc,
                });
            }
        });

        it("should transform nested lambda expressions", () => {
            const expr: CoreExpr = {
                kind: "CoreLambda",
                param: {
                    kind: "CoreVarPattern",
                    name: "x",
                    loc: { file: "test", line: 1, column: 1, offset: 0 },
                },
                body: {
                    kind: "CoreLambda",
                    param: {
                        kind: "CoreVarPattern",
                        name: "y",
                        loc: { file: "test", line: 1, column: 1, offset: 0 },
                    },
                    body: {
                        kind: "CoreVar",
                        name: "x",
                        loc: { file: "test", line: 1, column: 1, offset: 0 },
                    },
                    loc: { file: "test", line: 1, column: 1, offset: 0 },
                },
                loc: { file: "test", line: 1, column: 1, offset: 0 },
            };

            let transformCount = 0;
            const result = transformExpr(expr, (e) => {
                transformCount++;
                return e;
            });

            // Should visit inner lambda body, inner lambda, outer lambda body, outer lambda
            expect(transformCount).toBeGreaterThan(0);
            expect(result).toEqual(expr);
        });

        it("should transform let bindings", () => {
            const expr: CoreExpr = {
                kind: "CoreLet",
                pattern: {
                    kind: "CoreVarPattern",
                    name: "x",
                    loc: { file: "test", line: 1, column: 1, offset: 0 },
                },
                value: {
                    kind: "CoreIntLit",
                    value: 42,
                    loc: { file: "test", line: 1, column: 1, offset: 0 },
                },
                body: {
                    kind: "CoreVar",
                    name: "x",
                    loc: { file: "test", line: 1, column: 1, offset: 0 },
                },
                mutable: false,
                recursive: false,
                loc: { file: "test", line: 1, column: 1, offset: 0 },
            };

            const result = transformExpr(expr, (e) => e);
            expect(result).toEqual(expr);
        });
    });

    describe("transformChildren", () => {
        it("should transform application arguments", () => {
            const expr: CoreExpr = {
                kind: "CoreApp",
                func: {
                    kind: "CoreVar",
                    name: "f",
                    loc: { file: "test", line: 1, column: 1, offset: 0 },
                },
                args: [
                    {
                        kind: "CoreIntLit",
                        value: 1,
                        loc: { file: "test", line: 1, column: 1, offset: 0 },
                    },
                    {
                        kind: "CoreIntLit",
                        value: 2,
                        loc: { file: "test", line: 1, column: 1, offset: 0 },
                    },
                ],
                loc: { file: "test", line: 1, column: 1, offset: 0 },
            };

            const result = transformChildren(expr, (e) => {
                if (e.kind === "CoreIntLit") {
                    return {
                        ...e,
                        value: e.value * 10,
                    };
                }
                return e;
            });

            expect(result.kind).toBe("CoreApp");
            if (result.kind === "CoreApp") {
                const arg0 = result.args[0];
                const arg1 = result.args[1];
                expect(arg0).toBeDefined();
                expect(arg1).toBeDefined();
                if (arg0 && arg1 && arg0.kind === "CoreIntLit" && arg1.kind === "CoreIntLit") {
                    expect(arg0.value).toBe(10);
                    expect(arg1.value).toBe(20);
                }
            }
        });

        it("should transform record fields", () => {
            const expr: CoreExpr = {
                kind: "CoreRecord",
                fields: [
                    {
                        name: "x",
                        value: {
                            kind: "CoreIntLit",
                            value: 1,
                            loc: { file: "test", line: 1, column: 1, offset: 0 },
                        },
                        loc: { file: "test", line: 1, column: 1, offset: 0 },
                    },
                    {
                        name: "y",
                        value: {
                            kind: "CoreIntLit",
                            value: 2,
                            loc: { file: "test", line: 1, column: 1, offset: 0 },
                        },
                        loc: { file: "test", line: 1, column: 1, offset: 0 },
                    },
                ],
                loc: { file: "test", line: 1, column: 1, offset: 0 },
            };

            const result = transformChildren(expr, (e) => {
                if (e.kind === "CoreIntLit") {
                    return {
                        ...e,
                        value: e.value + 10,
                    };
                }
                return e;
            });

            expect(result.kind).toBe("CoreRecord");
            if (result.kind === "CoreRecord") {
                const field0 = result.fields[0];
                const field1 = result.fields[1];
                expect(field0).toBeDefined();
                expect(field1).toBeDefined();
                if (field0 && field1 && field0.value.kind === "CoreIntLit" && field1.value.kind === "CoreIntLit") {
                    expect(field0.value.value).toBe(11);
                    expect(field1.value.value).toBe(12);
                }
            }
        });
    });

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

    describe("foldExpr", () => {
        it("should count nodes in an expression tree", () => {
            const expr: CoreExpr = {
                kind: "CoreBinOp",
                op: "Add",
                left: {
                    kind: "CoreIntLit",
                    value: 1,
                    loc: { file: "test", line: 1, column: 1, offset: 0 },
                },
                right: {
                    kind: "CoreIntLit",
                    value: 2,
                    loc: { file: "test", line: 1, column: 1, offset: 0 },
                },
                loc: { file: "test", line: 1, column: 1, offset: 0 },
            };

            const nodeCount = foldExpr(expr, (_, count) => count + 1, 0);
            expect(nodeCount).toBe(3); // BinOp + 2 IntLits
        });

        it("should collect all variable names", () => {
            const expr: CoreExpr = {
                kind: "CoreBinOp",
                op: "Add",
                left: {
                    kind: "CoreVar",
                    name: "x",
                    loc: { file: "test", line: 1, column: 1, offset: 0 },
                },
                right: {
                    kind: "CoreVar",
                    name: "y",
                    loc: { file: "test", line: 1, column: 1, offset: 0 },
                },
                loc: { file: "test", line: 1, column: 1, offset: 0 },
            };

            const varNames = foldExpr(
                expr,
                (node, names) => {
                    if (node.kind === "CoreVar") {
                        names.add(node.name);
                    }
                    return names;
                },
                new Set<string>(),
            );

            expect(varNames).toEqual(new Set(["x", "y"]));
        });
    });
});
