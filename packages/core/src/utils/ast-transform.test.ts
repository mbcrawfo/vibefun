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
                        kind: "Field",
                        name: "x",
                        value: {
                            kind: "CoreIntLit",
                            value: 1,
                            loc: { file: "test", line: 1, column: 1, offset: 0 },
                        },
                        loc: { file: "test", line: 1, column: 1, offset: 0 },
                    },
                    {
                        kind: "Field",
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
                if (
                    field0 &&
                    field1 &&
                    field0.kind === "Field" &&
                    field1.kind === "Field" &&
                    field0.value.kind === "CoreIntLit" &&
                    field1.value.kind === "CoreIntLit"
                ) {
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

    describe("transformExpr - additional expression types", () => {
        const testLoc = { file: "test", line: 1, column: 1, offset: 0 };

        it("should transform float literals", () => {
            const expr: CoreExpr = {
                kind: "CoreFloatLit",
                value: 3.14,
                loc: testLoc,
            };

            const result = transformExpr(expr, (e) => e);
            expect(result).toEqual(expr);
        });

        it("should transform string literals", () => {
            const expr: CoreExpr = {
                kind: "CoreStringLit",
                value: "hello",
                loc: testLoc,
            };

            const result = transformExpr(expr, (e) => e);
            expect(result).toEqual(expr);
        });

        it("should transform bool literals", () => {
            const expr: CoreExpr = {
                kind: "CoreBoolLit",
                value: true,
                loc: testLoc,
            };

            const result = transformExpr(expr, (e) => e);
            expect(result).toEqual(expr);
        });

        it("should transform unit literals", () => {
            const expr: CoreExpr = {
                kind: "CoreUnitLit",
                loc: testLoc,
            };

            const result = transformExpr(expr, (e) => e);
            expect(result).toEqual(expr);
        });

        it("should transform CoreLetRecExpr", () => {
            const expr: CoreExpr = {
                kind: "CoreLetRecExpr",
                bindings: [
                    {
                        pattern: { kind: "CoreVarPattern", name: "f", loc: testLoc },
                        value: {
                            kind: "CoreLambda",
                            param: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                            body: { kind: "CoreIntLit", value: 1, loc: testLoc },
                            loc: testLoc,
                        },
                        mutable: false,
                        loc: testLoc,
                    },
                ],
                body: { kind: "CoreVar", name: "f", loc: testLoc },
                loc: testLoc,
            };

            // Double int literals
            const result = transformExpr(expr, (e) => {
                if (e.kind === "CoreIntLit") {
                    return { ...e, value: e.value * 2 };
                }
                return e;
            });

            expect(result.kind).toBe("CoreLetRecExpr");
            if (result.kind === "CoreLetRecExpr") {
                const binding = result.bindings[0];
                if (binding?.value.kind === "CoreLambda" && binding.value.body.kind === "CoreIntLit") {
                    expect(binding.value.body.value).toBe(2);
                }
            }
        });

        it("should transform CoreRecordAccess", () => {
            const expr: CoreExpr = {
                kind: "CoreRecordAccess",
                record: { kind: "CoreVar", name: "r", loc: testLoc },
                field: "x",
                loc: testLoc,
            };

            const result = transformExpr(expr, (e) => {
                if (e.kind === "CoreVar" && e.name === "r") {
                    return { ...e, name: "rec" };
                }
                return e;
            });

            expect(result.kind).toBe("CoreRecordAccess");
            if (result.kind === "CoreRecordAccess" && result.record.kind === "CoreVar") {
                expect(result.record.name).toBe("rec");
            }
        });

        it("should transform CoreRecordUpdate with fields", () => {
            const expr: CoreExpr = {
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

            const result = transformExpr(expr, (e) => {
                if (e.kind === "CoreIntLit") {
                    return { ...e, value: e.value * 2 };
                }
                return e;
            });

            expect(result.kind).toBe("CoreRecordUpdate");
            if (result.kind === "CoreRecordUpdate") {
                const update = result.updates[0];
                if (update?.kind === "Field" && update.value.kind === "CoreIntLit") {
                    expect(update.value.value).toBe(84);
                }
            }
        });

        it("should transform CoreRecordUpdate with spread", () => {
            const expr: CoreExpr = {
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

            const result = transformExpr(expr, (e) => {
                if (e.kind === "CoreVar" && e.name === "other") {
                    return { ...e, name: "base" };
                }
                return e;
            });

            expect(result.kind).toBe("CoreRecordUpdate");
            if (result.kind === "CoreRecordUpdate") {
                const update = result.updates[0];
                if (update?.kind === "Spread" && update.expr.kind === "CoreVar") {
                    expect(update.expr.name).toBe("base");
                }
            }
        });

        it("should transform CoreRecord with spread", () => {
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

            const result = transformExpr(expr, (e) => {
                if (e.kind === "CoreVar" && e.name === "base") {
                    return { ...e, name: "other" };
                }
                return e;
            });

            expect(result.kind).toBe("CoreRecord");
            if (result.kind === "CoreRecord") {
                const spread = result.fields[0];
                if (spread?.kind === "Spread" && spread.expr.kind === "CoreVar") {
                    expect(spread.expr.name).toBe("other");
                }
            }
        });

        it("should transform CoreVariant", () => {
            const expr: CoreExpr = {
                kind: "CoreVariant",
                constructor: "Some",
                args: [{ kind: "CoreIntLit", value: 42, loc: testLoc }],
                loc: testLoc,
            };

            const result = transformExpr(expr, (e) => {
                if (e.kind === "CoreIntLit") {
                    return { ...e, value: e.value * 2 };
                }
                return e;
            });

            expect(result.kind).toBe("CoreVariant");
            if (result.kind === "CoreVariant" && result.args[0]?.kind === "CoreIntLit") {
                expect(result.args[0].value).toBe(84);
            }
        });

        it("should transform CoreUnaryOp", () => {
            const expr: CoreExpr = {
                kind: "CoreUnaryOp",
                op: "Negate",
                expr: { kind: "CoreIntLit", value: 5, loc: testLoc },
                loc: testLoc,
            };

            const result = transformExpr(expr, (e) => {
                if (e.kind === "CoreIntLit") {
                    return { ...e, value: e.value * 10 };
                }
                return e;
            });

            expect(result.kind).toBe("CoreUnaryOp");
            if (result.kind === "CoreUnaryOp" && result.expr.kind === "CoreIntLit") {
                expect(result.expr.value).toBe(50);
            }
        });

        it("should transform CoreTypeAnnotation", () => {
            const expr: CoreExpr = {
                kind: "CoreTypeAnnotation",
                expr: { kind: "CoreIntLit", value: 42, loc: testLoc },
                typeExpr: { kind: "CoreTypeConst", name: "Int", loc: testLoc },
                loc: testLoc,
            };

            const result = transformExpr(expr, (e) => {
                if (e.kind === "CoreIntLit") {
                    return { ...e, value: 100 };
                }
                return e;
            });

            expect(result.kind).toBe("CoreTypeAnnotation");
            if (result.kind === "CoreTypeAnnotation" && result.expr.kind === "CoreIntLit") {
                expect(result.expr.value).toBe(100);
            }
        });

        it("should transform CoreUnsafe", () => {
            const expr: CoreExpr = {
                kind: "CoreUnsafe",
                expr: { kind: "CoreVar", name: "x", loc: testLoc },
                loc: testLoc,
            };

            const result = transformExpr(expr, (e) => {
                if (e.kind === "CoreVar" && e.name === "x") {
                    return { ...e, name: "y" };
                }
                return e;
            });

            expect(result.kind).toBe("CoreUnsafe");
            if (result.kind === "CoreUnsafe" && result.expr.kind === "CoreVar") {
                expect(result.expr.name).toBe("y");
            }
        });

        it("should transform CoreTuple", () => {
            const expr: CoreExpr = {
                kind: "CoreTuple",
                elements: [
                    { kind: "CoreIntLit", value: 1, loc: testLoc },
                    { kind: "CoreIntLit", value: 2, loc: testLoc },
                    { kind: "CoreIntLit", value: 3, loc: testLoc },
                ],
                loc: testLoc,
            };

            const result = transformExpr(expr, (e) => {
                if (e.kind === "CoreIntLit") {
                    return { ...e, value: e.value * 10 };
                }
                return e;
            });

            expect(result.kind).toBe("CoreTuple");
            if (result.kind === "CoreTuple") {
                expect(result.elements.map((e) => (e.kind === "CoreIntLit" ? e.value : 0))).toEqual([10, 20, 30]);
            }
        });

        it("should transform match expression with guards", () => {
            const expr: CoreExpr = {
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

            const result = transformExpr(expr, (e) => {
                if (e.kind === "CoreIntLit") {
                    return { ...e, value: e.value + 100 };
                }
                return e;
            });

            expect(result.kind).toBe("CoreMatch");
            if (result.kind === "CoreMatch") {
                const case0 = result.cases[0];
                if (case0?.guard?.kind === "CoreBinOp" && case0.guard.right.kind === "CoreIntLit") {
                    expect(case0.guard.right.value).toBe(100);
                }
                if (case0?.body.kind === "CoreIntLit") {
                    expect(case0.body.value).toBe(101);
                }
            }
        });

        it("should transform patterns with variant patterns", () => {
            const expr: CoreExpr = {
                kind: "CoreMatch",
                expr: { kind: "CoreVar", name: "opt", loc: testLoc },
                cases: [
                    {
                        pattern: {
                            kind: "CoreVariantPattern",
                            constructor: "Some",
                            args: [{ kind: "CoreVarPattern", name: "x", loc: testLoc }],
                            loc: testLoc,
                        },
                        body: { kind: "CoreVar", name: "x", loc: testLoc },
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            };

            const result = transformExpr(expr, (e) => e);
            expect(result).toEqual(expr);
        });

        it("should transform patterns with record patterns", () => {
            const expr: CoreExpr = {
                kind: "CoreMatch",
                expr: { kind: "CoreVar", name: "r", loc: testLoc },
                cases: [
                    {
                        pattern: {
                            kind: "CoreRecordPattern",
                            fields: [
                                {
                                    name: "x",
                                    pattern: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                                    loc: testLoc,
                                },
                            ],
                            loc: testLoc,
                        },
                        body: { kind: "CoreVar", name: "x", loc: testLoc },
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            };

            const result = transformExpr(expr, (e) => e);
            expect(result).toEqual(expr);
        });

        it("should transform patterns with tuple patterns", () => {
            const expr: CoreExpr = {
                kind: "CoreLambda",
                param: {
                    kind: "CoreTuplePattern",
                    elements: [
                        { kind: "CoreVarPattern", name: "x", loc: testLoc },
                        { kind: "CoreVarPattern", name: "y", loc: testLoc },
                    ],
                    loc: testLoc,
                },
                body: { kind: "CoreVar", name: "x", loc: testLoc },
                loc: testLoc,
            };

            const result = transformExpr(expr, (e) => e);
            expect(result).toEqual(expr);
        });

        it("should transform patterns with wildcard patterns", () => {
            const expr: CoreExpr = {
                kind: "CoreMatch",
                expr: { kind: "CoreVar", name: "x", loc: testLoc },
                cases: [
                    {
                        pattern: { kind: "CoreWildcardPattern", loc: testLoc },
                        body: { kind: "CoreIntLit", value: 0, loc: testLoc },
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            };

            const result = transformExpr(expr, (e) => e);
            expect(result).toEqual(expr);
        });

        it("should transform patterns with literal patterns", () => {
            const expr: CoreExpr = {
                kind: "CoreMatch",
                expr: { kind: "CoreVar", name: "x", loc: testLoc },
                cases: [
                    {
                        pattern: {
                            kind: "CoreLiteralPattern",
                            literal: 0,
                            loc: testLoc,
                        },
                        body: { kind: "CoreIntLit", value: 1, loc: testLoc },
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            };

            const result = transformExpr(expr, (e) => e);
            expect(result).toEqual(expr);
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
                recursive: false,
                loc: testLoc,
            };

            const visited: string[] = [];
            visitExpr(expr, (e) => visited.push(e.kind));

            expect(visited).toContain("CoreLet");
            expect(visited).toContain("CoreIntLit");
            expect(visited).toContain("CoreVar");
        });
    });

    describe("transformChildren - additional cases", () => {
        const testLoc = { file: "test", line: 1, column: 1, offset: 0 };

        it("should transform CoreLetRecExpr children", () => {
            const expr: CoreExpr = {
                kind: "CoreLetRecExpr",
                bindings: [
                    {
                        pattern: { kind: "CoreVarPattern", name: "f", loc: testLoc },
                        value: { kind: "CoreIntLit", value: 5, loc: testLoc },
                        mutable: false,
                        loc: testLoc,
                    },
                ],
                body: { kind: "CoreIntLit", value: 10, loc: testLoc },
                loc: testLoc,
            };

            const result = transformChildren(expr, (e) => {
                if (e.kind === "CoreIntLit") {
                    return { ...e, value: e.value * 2 };
                }
                return e;
            });

            expect(result.kind).toBe("CoreLetRecExpr");
            if (result.kind === "CoreLetRecExpr") {
                if (result.bindings[0]?.value.kind === "CoreIntLit") {
                    expect(result.bindings[0].value.value).toBe(10);
                }
                if (result.body.kind === "CoreIntLit") {
                    expect(result.body.value).toBe(20);
                }
            }
        });

        it("should transform CoreVariant children", () => {
            const expr: CoreExpr = {
                kind: "CoreVariant",
                constructor: "Pair",
                args: [
                    { kind: "CoreIntLit", value: 1, loc: testLoc },
                    { kind: "CoreIntLit", value: 2, loc: testLoc },
                ],
                loc: testLoc,
            };

            const result = transformChildren(expr, (e) => {
                if (e.kind === "CoreIntLit") {
                    return { ...e, value: e.value * 10 };
                }
                return e;
            });

            expect(result.kind).toBe("CoreVariant");
            if (result.kind === "CoreVariant") {
                expect(result.args.map((a) => (a.kind === "CoreIntLit" ? a.value : 0))).toEqual([10, 20]);
            }
        });

        it("should transform CoreTuple children", () => {
            const expr: CoreExpr = {
                kind: "CoreTuple",
                elements: [
                    { kind: "CoreIntLit", value: 1, loc: testLoc },
                    { kind: "CoreStringLit", value: "two", loc: testLoc },
                ],
                loc: testLoc,
            };

            const result = transformChildren(expr, (e) => {
                if (e.kind === "CoreIntLit") {
                    return { ...e, value: e.value * 100 };
                }
                return e;
            });

            expect(result.kind).toBe("CoreTuple");
            if (result.kind === "CoreTuple" && result.elements[0]?.kind === "CoreIntLit") {
                expect(result.elements[0].value).toBe(100);
            }
        });

        it("should transform CoreBinOp children", () => {
            const expr: CoreExpr = {
                kind: "CoreBinOp",
                op: "Add",
                left: { kind: "CoreIntLit", value: 1, loc: testLoc },
                right: { kind: "CoreIntLit", value: 2, loc: testLoc },
                loc: testLoc,
            };

            const result = transformChildren(expr, (e) => {
                if (e.kind === "CoreIntLit") {
                    return { ...e, value: e.value + 10 };
                }
                return e;
            });

            expect(result.kind).toBe("CoreBinOp");
            if (result.kind === "CoreBinOp") {
                if (result.left.kind === "CoreIntLit") expect(result.left.value).toBe(11);
                if (result.right.kind === "CoreIntLit") expect(result.right.value).toBe(12);
            }
        });

        it("should transform CoreLambda children", () => {
            const expr: CoreExpr = {
                kind: "CoreLambda",
                param: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                body: { kind: "CoreIntLit", value: 42, loc: testLoc },
                loc: testLoc,
            };

            const result = transformChildren(expr, (e) => {
                if (e.kind === "CoreIntLit") {
                    return { ...e, value: 0 };
                }
                return e;
            });

            expect(result.kind).toBe("CoreLambda");
            if (result.kind === "CoreLambda" && result.body.kind === "CoreIntLit") {
                expect(result.body.value).toBe(0);
            }
        });

        it("should transform CoreUnaryOp children", () => {
            const expr: CoreExpr = {
                kind: "CoreUnaryOp",
                op: "LogicalNot",
                expr: { kind: "CoreBoolLit", value: true, loc: testLoc },
                loc: testLoc,
            };

            const result = transformChildren(expr, (e) => {
                if (e.kind === "CoreBoolLit") {
                    return { ...e, value: false };
                }
                return e;
            });

            expect(result.kind).toBe("CoreUnaryOp");
            if (result.kind === "CoreUnaryOp" && result.expr.kind === "CoreBoolLit") {
                expect(result.expr.value).toBe(false);
            }
        });

        it("should transform CoreTypeAnnotation children", () => {
            const expr: CoreExpr = {
                kind: "CoreTypeAnnotation",
                expr: { kind: "CoreIntLit", value: 5, loc: testLoc },
                typeExpr: { kind: "CoreTypeConst", name: "Int", loc: testLoc },
                loc: testLoc,
            };

            const result = transformChildren(expr, (e) => {
                if (e.kind === "CoreIntLit") {
                    return { ...e, value: 999 };
                }
                return e;
            });

            expect(result.kind).toBe("CoreTypeAnnotation");
            if (result.kind === "CoreTypeAnnotation" && result.expr.kind === "CoreIntLit") {
                expect(result.expr.value).toBe(999);
            }
        });

        it("should transform CoreUnsafe children", () => {
            const expr: CoreExpr = {
                kind: "CoreUnsafe",
                expr: { kind: "CoreIntLit", value: 1, loc: testLoc },
                loc: testLoc,
            };

            const result = transformChildren(expr, (e) => {
                if (e.kind === "CoreIntLit") {
                    return { ...e, value: 2 };
                }
                return e;
            });

            expect(result.kind).toBe("CoreUnsafe");
            if (result.kind === "CoreUnsafe" && result.expr.kind === "CoreIntLit") {
                expect(result.expr.value).toBe(2);
            }
        });

        it("should transform CoreRecordAccess children", () => {
            const expr: CoreExpr = {
                kind: "CoreRecordAccess",
                record: { kind: "CoreVar", name: "r", loc: testLoc },
                field: "x",
                loc: testLoc,
            };

            const result = transformChildren(expr, (e) => {
                if (e.kind === "CoreVar") {
                    return { ...e, name: "newRec" };
                }
                return e;
            });

            expect(result.kind).toBe("CoreRecordAccess");
            if (result.kind === "CoreRecordAccess" && result.record.kind === "CoreVar") {
                expect(result.record.name).toBe("newRec");
            }
        });
    });

    describe("foldExpr - additional cases", () => {
        const testLoc = { file: "test", line: 1, column: 1, offset: 0 };

        it("should sum all integer values in nested expressions", () => {
            // Use BinOp instead of Tuple since visitExpr doesn't handle Tuple
            const expr: CoreExpr = {
                kind: "CoreBinOp",
                op: "Add",
                left: {
                    kind: "CoreBinOp",
                    op: "Add",
                    left: { kind: "CoreIntLit", value: 1, loc: testLoc },
                    right: { kind: "CoreIntLit", value: 2, loc: testLoc },
                    loc: testLoc,
                },
                right: { kind: "CoreIntLit", value: 3, loc: testLoc },
                loc: testLoc,
            };

            const sum = foldExpr(
                expr,
                (node, acc) => {
                    if (node.kind === "CoreIntLit") {
                        return acc + node.value;
                    }
                    return acc;
                },
                0,
            );

            expect(sum).toBe(6);
        });

        it("should collect all expression kinds", () => {
            const expr: CoreExpr = {
                kind: "CoreLet",
                pattern: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                value: { kind: "CoreIntLit", value: 1, loc: testLoc },
                body: {
                    kind: "CoreBinOp",
                    op: "Add",
                    left: { kind: "CoreVar", name: "x", loc: testLoc },
                    right: { kind: "CoreIntLit", value: 2, loc: testLoc },
                    loc: testLoc,
                },
                mutable: false,
                recursive: false,
                loc: testLoc,
            };

            const kinds = foldExpr(
                expr,
                (node, acc) => {
                    acc.add(node.kind);
                    return acc;
                },
                new Set<string>(),
            );

            expect(kinds.has("CoreLet")).toBe(true);
            expect(kinds.has("CoreIntLit")).toBe(true);
            expect(kinds.has("CoreBinOp")).toBe(true);
            expect(kinds.has("CoreVar")).toBe(true);
        });

        it("should find maximum integer value", () => {
            // Use nested BinOp instead of Tuple since visitExpr doesn't handle Tuple
            const expr: CoreExpr = {
                kind: "CoreVariant",
                constructor: "Some",
                args: [
                    {
                        kind: "CoreBinOp",
                        op: "Add",
                        left: {
                            kind: "CoreBinOp",
                            op: "Add",
                            left: { kind: "CoreIntLit", value: 10, loc: testLoc },
                            right: { kind: "CoreIntLit", value: 50, loc: testLoc },
                            loc: testLoc,
                        },
                        right: { kind: "CoreIntLit", value: 30, loc: testLoc },
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            };

            const max = foldExpr(
                expr,
                (node, acc) => {
                    if (node.kind === "CoreIntLit") {
                        return Math.max(acc, node.value);
                    }
                    return acc;
                },
                -Infinity,
            );

            expect(max).toBe(50);
        });
    });
});
