/**
 * Tests for transformChildren — extracted from ast-transform.test.ts for size.
 */

import type { CoreExpr } from "../types/core-ast.js";

import * as fc from "fast-check";
import { describe, expect, it } from "vitest";

import { coreExprArb } from "../types/test-arbitraries/index.js";
import { transformChildren } from "./ast-transform.js";
import { exprEquals } from "./expr-equality.js";

describe("AST Transform Utilities", () => {
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

    describe("transformChildren algebraic properties", () => {
        // transformChildren applies a transformer to children but leaves the
        // parent untouched. With the identity transformer this should equal
        // the input structurally (modulo object identity, which we don't
        // assert).

        it("property: identity child-transform is identity", () => {
            fc.assert(
                fc.property(coreExprArb({ depth: 3 }), (e) => {
                    const result = transformChildren(e, (x) => x);
                    return exprEquals(e, result);
                }),
            );
        });

        it("property: kind is preserved (parent is untouched)", () => {
            fc.assert(
                fc.property(coreExprArb({ depth: 3 }), (e) => {
                    return transformChildren(e, (x) => x).kind === e.kind;
                }),
            );
        });

        it("property: total — does not throw on any tier-A CoreExpr", () => {
            fc.assert(
                fc.property(coreExprArb({ depth: 3 }), (e) => {
                    transformChildren(e, (x) => x);
                    return true;
                }),
            );
        });
    });
});
