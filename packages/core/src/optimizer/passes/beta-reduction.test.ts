/**
 * Tests for Beta Reduction optimization pass
 */

import type { CoreExpr } from "../../types/core-ast.js";

import { describe, expect, it } from "vitest";

import { BetaReductionPass } from "./beta-reduction.js";

const testLoc = { file: "test", line: 1, column: 1, offset: 0 };

describe("BetaReductionPass", () => {
    const pass = new BetaReductionPass();

    describe("Basic beta reduction", () => {
        it("should reduce simple lambda application", () => {
            // ((x) => x)(5) => 5
            const expr: CoreExpr = {
                kind: "CoreApp",
                func: {
                    kind: "CoreLambda",
                    param: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                    body: { kind: "CoreVar", name: "x", loc: testLoc },
                    loc: testLoc,
                },
                args: [{ kind: "CoreIntLit", value: 5, loc: testLoc }],
                loc: testLoc,
            };

            const result = pass.transform(expr);

            expect(result).toEqual({ kind: "CoreIntLit", value: 5, loc: testLoc });
        });

        it("should reduce lambda with expression body", () => {
            // ((x) => x + 1)(5) => 5 + 1
            const expr: CoreExpr = {
                kind: "CoreApp",
                func: {
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
                },
                args: [{ kind: "CoreIntLit", value: 5, loc: testLoc }],
                loc: testLoc,
            };

            const result = pass.transform(expr);

            expect(result.kind).toBe("CoreBinOp");
            if (result.kind === "CoreBinOp") {
                expect(result.op).toBe("Add");
                expect(result.left).toEqual({ kind: "CoreIntLit", value: 5, loc: testLoc });
                expect(result.right).toEqual({ kind: "CoreIntLit", value: 1, loc: testLoc });
            }
        });

        it("should substitute parameter in multiple positions", () => {
            // ((x) => x + x)(3) => 3 + 3
            const expr: CoreExpr = {
                kind: "CoreApp",
                func: {
                    kind: "CoreLambda",
                    param: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                    body: {
                        kind: "CoreBinOp",
                        op: "Add",
                        left: { kind: "CoreVar", name: "x", loc: testLoc },
                        right: { kind: "CoreVar", name: "x", loc: testLoc },
                        loc: testLoc,
                    },
                    loc: testLoc,
                },
                args: [{ kind: "CoreIntLit", value: 3, loc: testLoc }],
                loc: testLoc,
            };

            const result = pass.transform(expr);

            expect(result.kind).toBe("CoreBinOp");
            if (result.kind === "CoreBinOp") {
                expect(result.left).toEqual({ kind: "CoreIntLit", value: 3, loc: testLoc });
                expect(result.right).toEqual({ kind: "CoreIntLit", value: 3, loc: testLoc });
            }
        });
    });

    describe("Capture avoidance", () => {
        it("should avoid variable capture in let bindings", () => {
            // ((y) => let x = 1 in y)(x) should rename bound x to avoid capturing free x
            const expr: CoreExpr = {
                kind: "CoreApp",
                func: {
                    kind: "CoreLambda",
                    param: { kind: "CoreVarPattern", name: "y", loc: testLoc },
                    body: {
                        kind: "CoreLet",
                        pattern: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                        value: { kind: "CoreIntLit", value: 1, loc: testLoc },
                        body: { kind: "CoreVar", name: "y", loc: testLoc },
                        mutable: false,
                        recursive: false,
                        loc: testLoc,
                    },
                    loc: testLoc,
                },
                args: [{ kind: "CoreVar", name: "x", loc: testLoc }],
                loc: testLoc,
            };

            const result = pass.transform(expr);

            expect(result.kind).toBe("CoreLet");
            if (result.kind === "CoreLet") {
                // The bound variable should be renamed to avoid capture
                expect(result.pattern.kind).toBe("CoreVarPattern");
                if (result.pattern.kind === "CoreVarPattern") {
                    expect(result.pattern.name).not.toBe("x"); // Should be renamed
                }
                // The body should have the argument substituted
                expect(result.body).toEqual({ kind: "CoreVar", name: "x", loc: testLoc });
            }
        });

        it("should avoid variable capture in nested lambdas", () => {
            // ((y) => (x) => y)(x) should rename bound x to avoid capturing free x
            const expr: CoreExpr = {
                kind: "CoreApp",
                func: {
                    kind: "CoreLambda",
                    param: { kind: "CoreVarPattern", name: "y", loc: testLoc },
                    body: {
                        kind: "CoreLambda",
                        param: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                        body: { kind: "CoreVar", name: "y", loc: testLoc },
                        loc: testLoc,
                    },
                    loc: testLoc,
                },
                args: [{ kind: "CoreVar", name: "x", loc: testLoc }],
                loc: testLoc,
            };

            const result = pass.transform(expr);

            expect(result.kind).toBe("CoreLambda");
            if (result.kind === "CoreLambda") {
                // The parameter should be renamed to avoid capture
                expect(result.param.kind).toBe("CoreVarPattern");
                if (result.param.kind === "CoreVarPattern") {
                    expect(result.param.name).not.toBe("x"); // Should be renamed
                }
                // The body should have the argument substituted
                expect(result.body).toEqual({ kind: "CoreVar", name: "x", loc: testLoc });
            }
        });
    });

    describe("Free variables", () => {
        it("should preserve free variables in lambda body", () => {
            // ((x) => x + y)(5) => 5 + y (y remains free)
            const expr: CoreExpr = {
                kind: "CoreApp",
                func: {
                    kind: "CoreLambda",
                    param: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                    body: {
                        kind: "CoreBinOp",
                        op: "Add",
                        left: { kind: "CoreVar", name: "x", loc: testLoc },
                        right: { kind: "CoreVar", name: "y", loc: testLoc },
                        loc: testLoc,
                    },
                    loc: testLoc,
                },
                args: [{ kind: "CoreIntLit", value: 5, loc: testLoc }],
                loc: testLoc,
            };

            const result = pass.transform(expr);

            expect(result.kind).toBe("CoreBinOp");
            if (result.kind === "CoreBinOp") {
                expect(result.left).toEqual({ kind: "CoreIntLit", value: 5, loc: testLoc });
                expect(result.right).toEqual({ kind: "CoreVar", name: "y", loc: testLoc });
            }
        });

        it("should not substitute free variables", () => {
            // ((x) => y)(5) => y (y is not substituted)
            const expr: CoreExpr = {
                kind: "CoreApp",
                func: {
                    kind: "CoreLambda",
                    param: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                    body: { kind: "CoreVar", name: "y", loc: testLoc },
                    loc: testLoc,
                },
                args: [{ kind: "CoreIntLit", value: 5, loc: testLoc }],
                loc: testLoc,
            };

            const result = pass.transform(expr);

            expect(result).toEqual({ kind: "CoreVar", name: "y", loc: testLoc });
        });
    });

    describe("Non-applicable cases", () => {
        it("should not reduce application of non-lambda", () => {
            // f(5) where f is a variable (not a lambda)
            const expr: CoreExpr = {
                kind: "CoreApp",
                func: { kind: "CoreVar", name: "f", loc: testLoc },
                args: [{ kind: "CoreIntLit", value: 5, loc: testLoc }],
                loc: testLoc,
            };

            const result = pass.transform(expr);

            expect(result).toEqual(expr); // Unchanged
        });

        it("should not reduce lambda with zero arguments", () => {
            // ((x) => x)() - zero arguments
            const expr: CoreExpr = {
                kind: "CoreApp",
                func: {
                    kind: "CoreLambda",
                    param: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                    body: { kind: "CoreVar", name: "x", loc: testLoc },
                    loc: testLoc,
                },
                args: [],
                loc: testLoc,
            };

            const result = pass.transform(expr);

            expect(result).toEqual(expr); // Unchanged
        });

        it("should not reduce lambda with multiple arguments", () => {
            // ((x) => x)(1, 2) - multiple arguments (should be curried)
            const expr: CoreExpr = {
                kind: "CoreApp",
                func: {
                    kind: "CoreLambda",
                    param: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                    body: { kind: "CoreVar", name: "x", loc: testLoc },
                    loc: testLoc,
                },
                args: [
                    { kind: "CoreIntLit", value: 1, loc: testLoc },
                    { kind: "CoreIntLit", value: 2, loc: testLoc },
                ],
                loc: testLoc,
            };

            const result = pass.transform(expr);

            expect(result).toEqual(expr); // Unchanged
        });

        it("should not reduce lambda with complex pattern", () => {
            // ((Some(x)) => x)(Some(5)) - pattern matching parameter
            const expr: CoreExpr = {
                kind: "CoreApp",
                func: {
                    kind: "CoreLambda",
                    param: {
                        kind: "CoreVariantPattern",
                        constructor: "Some",
                        args: [{ kind: "CoreVarPattern", name: "x", loc: testLoc }],
                        loc: testLoc,
                    },
                    body: { kind: "CoreVar", name: "x", loc: testLoc },
                    loc: testLoc,
                },
                args: [
                    {
                        kind: "CoreVariant",
                        constructor: "Some",
                        args: [{ kind: "CoreIntLit", value: 5, loc: testLoc }],
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            };

            const result = pass.transform(expr);

            expect(result).toEqual(expr); // Unchanged (complex pattern not supported yet)
        });
    });

    describe("Unsafe blocks", () => {
        it("should not reduce inside unsafe blocks", () => {
            const expr: CoreExpr = {
                kind: "CoreUnsafe",
                expr: {
                    kind: "CoreApp",
                    func: {
                        kind: "CoreLambda",
                        param: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                        body: { kind: "CoreVar", name: "x", loc: testLoc },
                        loc: testLoc,
                    },
                    args: [{ kind: "CoreIntLit", value: 5, loc: testLoc }],
                    loc: testLoc,
                },
                loc: testLoc,
            };

            const result = pass.transform(expr);

            expect(result).toEqual(expr); // Unchanged
        });
    });

    describe("Nested reductions", () => {
        it("should reduce nested lambda applications", () => {
            // ((x) => ((y) => x + y)(2))(1) => ((y) => 1 + y)(2) => 1 + 2
            const expr: CoreExpr = {
                kind: "CoreApp",
                func: {
                    kind: "CoreLambda",
                    param: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                    body: {
                        kind: "CoreApp",
                        func: {
                            kind: "CoreLambda",
                            param: { kind: "CoreVarPattern", name: "y", loc: testLoc },
                            body: {
                                kind: "CoreBinOp",
                                op: "Add",
                                left: { kind: "CoreVar", name: "x", loc: testLoc },
                                right: { kind: "CoreVar", name: "y", loc: testLoc },
                                loc: testLoc,
                            },
                            loc: testLoc,
                        },
                        args: [{ kind: "CoreIntLit", value: 2, loc: testLoc }],
                        loc: testLoc,
                    },
                    loc: testLoc,
                },
                args: [{ kind: "CoreIntLit", value: 1, loc: testLoc }],
                loc: testLoc,
            };

            const result = pass.transform(expr);

            // After transformation, we should get: 1 + 2
            expect(result.kind).toBe("CoreBinOp");
            if (result.kind === "CoreBinOp") {
                expect(result.op).toBe("Add");
                expect(result.left).toEqual({ kind: "CoreIntLit", value: 1, loc: testLoc });
                expect(result.right).toEqual({ kind: "CoreIntLit", value: 2, loc: testLoc });
            }
        });
    });

    describe("Complex expressions", () => {
        it("should reduce lambda with let binding in body", () => {
            // ((x) => let y = x + 1 in y * 2)(5) => let y = 5 + 1 in y * 2
            const expr: CoreExpr = {
                kind: "CoreApp",
                func: {
                    kind: "CoreLambda",
                    param: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                    body: {
                        kind: "CoreLet",
                        pattern: { kind: "CoreVarPattern", name: "y", loc: testLoc },
                        value: {
                            kind: "CoreBinOp",
                            op: "Add",
                            left: { kind: "CoreVar", name: "x", loc: testLoc },
                            right: { kind: "CoreIntLit", value: 1, loc: testLoc },
                            loc: testLoc,
                        },
                        body: {
                            kind: "CoreBinOp",
                            op: "Multiply",
                            left: { kind: "CoreVar", name: "y", loc: testLoc },
                            right: { kind: "CoreIntLit", value: 2, loc: testLoc },
                            loc: testLoc,
                        },
                        mutable: false,
                        recursive: false,
                        loc: testLoc,
                    },
                    loc: testLoc,
                },
                args: [{ kind: "CoreIntLit", value: 5, loc: testLoc }],
                loc: testLoc,
            };

            const result = pass.transform(expr);

            expect(result.kind).toBe("CoreLet");
            if (result.kind === "CoreLet") {
                expect(result.value.kind).toBe("CoreBinOp");
                if (result.value.kind === "CoreBinOp") {
                    expect(result.value.left).toEqual({ kind: "CoreIntLit", value: 5, loc: testLoc });
                }
            }
        });

        it("should reduce lambda with match expression", () => {
            // ((x) => match x { | 0 => 1 | _ => 2 })(0)
            // => match 0 { | 0 => 1 | _ => 2 }
            const expr: CoreExpr = {
                kind: "CoreApp",
                func: {
                    kind: "CoreLambda",
                    param: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                    body: {
                        kind: "CoreMatch",
                        expr: { kind: "CoreVar", name: "x", loc: testLoc },
                        cases: [
                            {
                                pattern: { kind: "CoreLiteralPattern", literal: 0, loc: testLoc },
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
                    },
                    loc: testLoc,
                },
                args: [{ kind: "CoreIntLit", value: 0, loc: testLoc }],
                loc: testLoc,
            };

            const result = pass.transform(expr);

            expect(result.kind).toBe("CoreMatch");
            if (result.kind === "CoreMatch") {
                expect(result.expr).toEqual({ kind: "CoreIntLit", value: 0, loc: testLoc });
            }
        });
    });
});
