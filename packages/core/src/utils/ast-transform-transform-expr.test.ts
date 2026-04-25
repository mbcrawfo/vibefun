/**
 * Tests for transformExpr — extracted from ast-transform.test.ts for size.
 */

import type { CoreExpr } from "../types/core-ast.js";

import { describe, expect, it } from "vitest";

import { transformExpr } from "./ast-transform.js";

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
                loc: { file: "test", line: 1, column: 1, offset: 0 },
            };

            const result = transformExpr(expr, (e) => e);
            expect(result).toEqual(expr);
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

        it("should transform CoreTryCatch recursing into both bodies", () => {
            const expr: CoreExpr = {
                kind: "CoreTryCatch",
                tryBody: { kind: "CoreVar", name: "x", loc: testLoc },
                catchBinder: "e",
                catchBody: { kind: "CoreVar", name: "x", loc: testLoc },
                loc: testLoc,
            };

            const result = transformExpr(expr, (e) => {
                if (e.kind === "CoreVar" && e.name === "x") {
                    return { ...e, name: "y" };
                }
                return e;
            });

            expect(result.kind).toBe("CoreTryCatch");
            if (result.kind === "CoreTryCatch") {
                expect(result.catchBinder).toBe("e");
                expect((result.tryBody as { name: string }).name).toBe("y");
                expect((result.catchBody as { name: string }).name).toBe("y");
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
});
