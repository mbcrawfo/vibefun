/**
 * Tests for Eta Reduction optimization pass
 */

import type { CoreExpr } from "../../types/core-ast.js";

import { describe, expect, it } from "vitest";

import { EtaReductionPass } from "./eta-reduction.js";

const testLoc = { file: "test", line: 1, column: 1, offset: 0 };

describe("EtaReductionPass", () => {
    const pass = new EtaReductionPass();

    describe("basic eta reduction", () => {
        it("should reduce simple eta expansion: (x) => f(x) → f", () => {
            // (x) => f(x)
            const expr: CoreExpr = {
                kind: "CoreLambda",
                param: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                body: {
                    kind: "CoreApp",
                    func: { kind: "CoreVar", name: "f", loc: testLoc },
                    args: [{ kind: "CoreVar", name: "x", loc: testLoc }],
                    loc: testLoc,
                },
                loc: testLoc,
            };

            const result = pass.transform(expr);

            expect(result).toEqual({ kind: "CoreVar", name: "f", loc: testLoc });
        });

        it("should reduce nested eta expansions", () => {
            // (x) => ((y) => g(y))(x)
            // Inner: (y) => g(y) reduces to g
            // Outer: (x) => g(x) reduces to g
            const expr: CoreExpr = {
                kind: "CoreLambda",
                param: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                body: {
                    kind: "CoreApp",
                    func: {
                        kind: "CoreLambda",
                        param: { kind: "CoreVarPattern", name: "y", loc: testLoc },
                        body: {
                            kind: "CoreApp",
                            func: { kind: "CoreVar", name: "g", loc: testLoc },
                            args: [{ kind: "CoreVar", name: "y", loc: testLoc }],
                            loc: testLoc,
                        },
                        loc: testLoc,
                    },
                    args: [{ kind: "CoreVar", name: "x", loc: testLoc }],
                    loc: testLoc,
                },
                loc: testLoc,
            };

            const result = pass.transform(expr);

            expect(result).toEqual({ kind: "CoreVar", name: "g", loc: testLoc });
        });

        it("should reduce eta expansion in let binding", () => {
            // let h = (x) => f(x) in h(5)
            const expr: CoreExpr = {
                kind: "CoreLet",
                pattern: { kind: "CoreVarPattern", name: "h", loc: testLoc },
                value: {
                    kind: "CoreLambda",
                    param: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                    body: {
                        kind: "CoreApp",
                        func: { kind: "CoreVar", name: "f", loc: testLoc },
                        args: [{ kind: "CoreVar", name: "x", loc: testLoc }],
                        loc: testLoc,
                    },
                    loc: testLoc,
                },
                body: {
                    kind: "CoreApp",
                    func: { kind: "CoreVar", name: "h", loc: testLoc },
                    args: [{ kind: "CoreIntLit", value: 5, loc: testLoc }],
                    loc: testLoc,
                },
                mutable: false,
                recursive: false,
                loc: testLoc,
            };

            const result = pass.transform(expr);

            // h should be reduced to f
            expect(result.kind).toBe("CoreLet");
            if (result.kind === "CoreLet") {
                expect(result.value).toEqual({ kind: "CoreVar", name: "f", loc: testLoc });
            }
        });
    });

    describe("non-reducible cases", () => {
        it("should not reduce if parameter appears in function", () => {
            // (x) => x(x) - x is free in function part
            const expr: CoreExpr = {
                kind: "CoreLambda",
                param: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                body: {
                    kind: "CoreApp",
                    func: { kind: "CoreVar", name: "x", loc: testLoc },
                    args: [{ kind: "CoreVar", name: "x", loc: testLoc }],
                    loc: testLoc,
                },
                loc: testLoc,
            };

            const result = pass.transform(expr);

            // Should not reduce
            expect(result).toEqual(expr);
        });

        it("should not reduce if multiple arguments", () => {
            // (x) => f(x, y)
            const expr: CoreExpr = {
                kind: "CoreLambda",
                param: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                body: {
                    kind: "CoreApp",
                    func: { kind: "CoreVar", name: "f", loc: testLoc },
                    args: [
                        { kind: "CoreVar", name: "x", loc: testLoc },
                        { kind: "CoreVar", name: "y", loc: testLoc },
                    ],
                    loc: testLoc,
                },
                loc: testLoc,
            };

            const result = pass.transform(expr);

            // Should not reduce
            expect(result).toEqual(expr);
        });

        it("should not reduce if argument is not the parameter", () => {
            // (x) => f(y)
            const expr: CoreExpr = {
                kind: "CoreLambda",
                param: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                body: {
                    kind: "CoreApp",
                    func: { kind: "CoreVar", name: "f", loc: testLoc },
                    args: [{ kind: "CoreVar", name: "y", loc: testLoc }],
                    loc: testLoc,
                },
                loc: testLoc,
            };

            const result = pass.transform(expr);

            // Should not reduce
            expect(result).toEqual(expr);
        });

        it("should not reduce if body is not an application", () => {
            // (x) => x + 1
            const expr: CoreExpr = {
                kind: "CoreLambda",
                param: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                body: {
                    kind: "CoreBinOp",
                    op: "Add",
                    left: { kind: "CoreVar", name: "x", loc: testLoc },
                    right: { kind: "CoreIntLit", value: 1, loc: testLoc },
                    loc: testLoc,
                },
                loc: testLoc,
            };

            const result = pass.transform(expr);

            // Should not reduce
            expect(result).toEqual(expr);
        });

        it("should not reduce if parameter is complex pattern", () => {
            // ({ x }) => f({ x })
            const expr: CoreExpr = {
                kind: "CoreLambda",
                param: {
                    kind: "CoreRecordPattern",
                    fields: [{ name: "x", pattern: { kind: "CoreVarPattern", name: "x", loc: testLoc }, loc: testLoc }],
                    loc: testLoc,
                },
                body: {
                    kind: "CoreApp",
                    func: { kind: "CoreVar", name: "f", loc: testLoc },
                    args: [
                        {
                            kind: "CoreRecord",
                            fields: [
                                {
                                    kind: "Field",
                                    name: "x",
                                    value: { kind: "CoreVar", name: "x", loc: testLoc },
                                    loc: testLoc,
                                },
                            ],
                            loc: testLoc,
                        },
                    ],
                    loc: testLoc,
                },
                loc: testLoc,
            };

            const result = pass.transform(expr);

            // Should not reduce (complex pattern)
            expect(result).toEqual(expr);
        });
    });

    describe("edge cases", () => {
        it("should handle literals unchanged", () => {
            const expr: CoreExpr = { kind: "CoreIntLit", value: 42, loc: testLoc };
            const result = pass.transform(expr);
            expect(result).toEqual(expr);
        });

        it("should handle variables unchanged", () => {
            const expr: CoreExpr = { kind: "CoreVar", name: "x", loc: testLoc };
            const result = pass.transform(expr);
            expect(result).toEqual(expr);
        });

        it("should reduce eta expansion in function application arguments", () => {
            // f((x) => g(x))
            const expr: CoreExpr = {
                kind: "CoreApp",
                func: { kind: "CoreVar", name: "f", loc: testLoc },
                args: [
                    {
                        kind: "CoreLambda",
                        param: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                        body: {
                            kind: "CoreApp",
                            func: { kind: "CoreVar", name: "g", loc: testLoc },
                            args: [{ kind: "CoreVar", name: "x", loc: testLoc }],
                            loc: testLoc,
                        },
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            };

            const result = pass.transform(expr);

            // Argument should be reduced to g
            expect(result.kind).toBe("CoreApp");
            if (result.kind === "CoreApp") {
                expect(result.args[0]).toEqual({ kind: "CoreVar", name: "g", loc: testLoc });
            }
        });

        it("should reduce eta expansion in match case bodies", () => {
            // match x { Some(y) => (z) => f(z) | None => (z) => g(z) }
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
                            kind: "CoreLambda",
                            param: { kind: "CoreVarPattern", name: "z", loc: testLoc },
                            body: {
                                kind: "CoreApp",
                                func: { kind: "CoreVar", name: "f", loc: testLoc },
                                args: [{ kind: "CoreVar", name: "z", loc: testLoc }],
                                loc: testLoc,
                            },
                            loc: testLoc,
                        },
                        loc: testLoc,
                    },
                    {
                        pattern: { kind: "CoreVariantPattern", constructor: "None", args: [], loc: testLoc },
                        body: {
                            kind: "CoreLambda",
                            param: { kind: "CoreVarPattern", name: "z", loc: testLoc },
                            body: {
                                kind: "CoreApp",
                                func: { kind: "CoreVar", name: "g", loc: testLoc },
                                args: [{ kind: "CoreVar", name: "z", loc: testLoc }],
                                loc: testLoc,
                            },
                            loc: testLoc,
                        },
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            };

            const result = pass.transform(expr);

            expect(result.kind).toBe("CoreMatch");
            if (result.kind === "CoreMatch") {
                // First case body should be reduced to f
                expect(result.cases[0]?.body).toEqual({ kind: "CoreVar", name: "f", loc: testLoc });
                // Second case body should be reduced to g
                expect(result.cases[1]?.body).toEqual({ kind: "CoreVar", name: "g", loc: testLoc });
            }
        });

        it("should not reduce inside unsafe blocks", () => {
            // unsafe { (x) => f(x) }
            const expr: CoreExpr = {
                kind: "CoreUnsafe",
                expr: {
                    kind: "CoreLambda",
                    param: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                    body: {
                        kind: "CoreApp",
                        func: { kind: "CoreVar", name: "f", loc: testLoc },
                        args: [{ kind: "CoreVar", name: "x", loc: testLoc }],
                        loc: testLoc,
                    },
                    loc: testLoc,
                },
                loc: testLoc,
            };

            const result = pass.transform(expr);

            // Should not reduce inside unsafe
            expect(result).toEqual(expr);
        });
    });

    describe("canApply", () => {
        it("should return true for eta-expandable expressions", () => {
            const expr: CoreExpr = {
                kind: "CoreLambda",
                param: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                body: {
                    kind: "CoreApp",
                    func: { kind: "CoreVar", name: "f", loc: testLoc },
                    args: [{ kind: "CoreVar", name: "x", loc: testLoc }],
                    loc: testLoc,
                },
                loc: testLoc,
            };

            expect(pass.canApply(expr)).toBe(true);
        });

        it("should return false for non-eta-expandable expressions", () => {
            const expr: CoreExpr = { kind: "CoreIntLit", value: 42, loc: testLoc };
            expect(pass.canApply(expr)).toBe(false);
        });
    });
});
