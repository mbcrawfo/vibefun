/**
 * Tests for Inline Expansion optimization pass
 */

import type { CoreExpr } from "../../types/core-ast.js";

import { describe, expect, it } from "vitest";

import { OptimizationLevel } from "../../types/optimizer.js";
import { InlineExpansionPass } from "./inline.js";

const testLoc = { file: "test", line: 1, column: 1, offset: 0 };

describe("InlineExpansionPass", () => {
    const pass = new InlineExpansionPass(OptimizationLevel.O2);

    describe("Simple inlining", () => {
        it("should inline trivial literal bindings", () => {
            // let x = 5 in x + x
            const expr: CoreExpr = {
                kind: "CoreLet",
                pattern: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                value: { kind: "CoreIntLit", value: 5, loc: testLoc },
                body: {
                    kind: "CoreBinOp",
                    op: "Add",
                    left: { kind: "CoreVar", name: "x", loc: testLoc },
                    right: { kind: "CoreVar", name: "x", loc: testLoc },
                    loc: testLoc,
                },
                mutable: false,
                recursive: false,
                loc: testLoc,
            };

            const result = pass.transform(expr);

            // Should inline to: 5 + 5
            expect(result.kind).toBe("CoreBinOp");
            if (result.kind === "CoreBinOp") {
                expect(result.left).toEqual({ kind: "CoreIntLit", value: 5, loc: testLoc });
                expect(result.right).toEqual({ kind: "CoreIntLit", value: 5, loc: testLoc });
            }
        });

        it("should inline variable-to-variable bindings", () => {
            // let y = x in y
            const expr: CoreExpr = {
                kind: "CoreLet",
                pattern: { kind: "CoreVarPattern", name: "y", loc: testLoc },
                value: { kind: "CoreVar", name: "x", loc: testLoc },
                body: { kind: "CoreVar", name: "y", loc: testLoc },
                mutable: false,
                recursive: false,
                loc: testLoc,
            };

            const result = pass.transform(expr);

            // Should inline to: x
            expect(result).toEqual({ kind: "CoreVar", name: "x", loc: testLoc });
        });

        it("should inline single-use bindings", () => {
            // let x = 2 + 3 in x * 4
            const expr: CoreExpr = {
                kind: "CoreLet",
                pattern: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                value: {
                    kind: "CoreBinOp",
                    op: "Add",
                    left: { kind: "CoreIntLit", value: 2, loc: testLoc },
                    right: { kind: "CoreIntLit", value: 3, loc: testLoc },
                    loc: testLoc,
                },
                body: {
                    kind: "CoreBinOp",
                    op: "Multiply",
                    left: { kind: "CoreVar", name: "x", loc: testLoc },
                    right: { kind: "CoreIntLit", value: 4, loc: testLoc },
                    loc: testLoc,
                },
                mutable: false,
                recursive: false,
                loc: testLoc,
            };

            const result = pass.transform(expr);

            // Should inline to: (2 + 3) * 4
            expect(result.kind).toBe("CoreBinOp");
            if (result.kind === "CoreBinOp") {
                expect(result.op).toBe("Multiply");
                expect(result.left.kind).toBe("CoreBinOp");
            }
        });
    });

    describe("Non-inlining cases", () => {
        it("should not inline recursive bindings", () => {
            // let rec factorial = (n) => ... in factorial
            const expr: CoreExpr = {
                kind: "CoreLet",
                pattern: { kind: "CoreVarPattern", name: "factorial", loc: testLoc },
                value: {
                    kind: "CoreLambda",
                    param: { kind: "CoreVarPattern", name: "n", loc: testLoc },
                    body: { kind: "CoreVar", name: "factorial", loc: testLoc }, // Simplified recursive reference
                    loc: testLoc,
                },
                body: { kind: "CoreVar", name: "factorial", loc: testLoc },
                mutable: false,
                recursive: true, // Marked as recursive
                loc: testLoc,
            };

            const result = pass.transform(expr);

            // Should NOT inline (recursive)
            expect(result).toEqual(expr);
        });

        it("should not inline mutable bindings", () => {
            // let mut x = 5 in x
            const expr: CoreExpr = {
                kind: "CoreLet",
                pattern: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                value: { kind: "CoreIntLit", value: 5, loc: testLoc },
                body: { kind: "CoreVar", name: "x", loc: testLoc },
                mutable: true, // Mutable
                recursive: false,
                loc: testLoc,
            };

            const result = pass.transform(expr);

            // Should NOT inline (mutable)
            expect(result).toEqual(expr);
        });

        it("should not inline bindings with complex patterns", () => {
            // let (x, y) = tuple in x
            const expr: CoreExpr = {
                kind: "CoreLet",
                pattern: {
                    kind: "CoreRecordPattern",
                    fields: [
                        { name: "x", pattern: { kind: "CoreVarPattern", name: "x", loc: testLoc }, loc: testLoc },
                        { name: "y", pattern: { kind: "CoreVarPattern", name: "y", loc: testLoc }, loc: testLoc },
                    ],
                    loc: testLoc,
                },
                value: { kind: "CoreVar", name: "tuple", loc: testLoc },
                body: { kind: "CoreVar", name: "x", loc: testLoc },
                mutable: false,
                recursive: false,
                loc: testLoc,
            };

            const result = pass.transform(expr);

            // Should NOT inline (complex pattern)
            expect(result).toEqual(expr);
        });

        it("should not inline values containing unsafe blocks", () => {
            // let x = unsafe { 5 } in x
            const expr: CoreExpr = {
                kind: "CoreLet",
                pattern: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                value: {
                    kind: "CoreUnsafe",
                    expr: { kind: "CoreIntLit", value: 5, loc: testLoc },
                    loc: testLoc,
                },
                body: { kind: "CoreVar", name: "x", loc: testLoc },
                mutable: false,
                recursive: false,
                loc: testLoc,
            };

            const result = pass.transform(expr);

            // Should NOT inline (contains unsafe)
            expect(result).toEqual(expr);
        });
    });

    describe("Unused bindings", () => {
        it("should inline unused bindings (removal will be done by dead code elimination)", () => {
            // let x = 5 in y
            const expr: CoreExpr = {
                kind: "CoreLet",
                pattern: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                value: { kind: "CoreIntLit", value: 5, loc: testLoc },
                body: { kind: "CoreVar", name: "y", loc: testLoc },
                mutable: false,
                recursive: false,
                loc: testLoc,
            };

            const result = pass.transform(expr);

            // Should inline to: y (x is unused, but inlining still happens)
            // Dead code elimination will remove it later
            expect(result).toEqual({ kind: "CoreVar", name: "y", loc: testLoc });
        });
    });

    describe("Shadowing", () => {
        it("should handle shadowing correctly in nested let", () => {
            // let x = 1 in (let x = 2 in x)
            const expr: CoreExpr = {
                kind: "CoreLet",
                pattern: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                value: { kind: "CoreIntLit", value: 1, loc: testLoc },
                body: {
                    kind: "CoreLet",
                    pattern: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                    value: { kind: "CoreIntLit", value: 2, loc: testLoc },
                    body: { kind: "CoreVar", name: "x", loc: testLoc },
                    mutable: false,
                    recursive: false,
                    loc: testLoc,
                },
                mutable: false,
                recursive: false,
                loc: testLoc,
            };

            const result = pass.transform(expr);

            // Outer x should be inlined (not used), inner let x = 2 in x should also be inlined
            // Result: 2 (fully inlined due to recursive transformation)
            expect(result).toEqual({ kind: "CoreIntLit", value: 2, loc: testLoc });
        });

        it("should handle shadowing in lambda", () => {
            // let x = 1 in ((x) => x)(5)
            const expr: CoreExpr = {
                kind: "CoreLet",
                pattern: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                value: { kind: "CoreIntLit", value: 1, loc: testLoc },
                body: {
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
                mutable: false,
                recursive: false,
                loc: testLoc,
            };

            const result = pass.transform(expr);

            // x should be inlined (not used in body - shadowed by lambda param)
            // Result: ((x) => x)(5)
            expect(result.kind).toBe("CoreApp");
        });
    });

    describe("Multiple uses", () => {
        it("should not inline large expressions with multiple uses", () => {
            // let x = (1 + 2) * (3 + 4) in x + x + x
            const largeValue: CoreExpr = {
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

            const expr: CoreExpr = {
                kind: "CoreLet",
                pattern: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                value: largeValue,
                body: {
                    kind: "CoreBinOp",
                    op: "Add",
                    left: {
                        kind: "CoreBinOp",
                        op: "Add",
                        left: { kind: "CoreVar", name: "x", loc: testLoc },
                        right: { kind: "CoreVar", name: "x", loc: testLoc },
                        loc: testLoc,
                    },
                    right: { kind: "CoreVar", name: "x", loc: testLoc },
                    loc: testLoc,
                },
                mutable: false,
                recursive: false,
                loc: testLoc,
            };

            const result = pass.transform(expr);

            // Should NOT inline (large expression, multiple uses would cause code bloat)
            expect(result).toEqual(expr);
        });
    });

    describe("Unsafe block preservation", () => {
        it("should not inline inside unsafe blocks", () => {
            const expr: CoreExpr = {
                kind: "CoreUnsafe",
                expr: {
                    kind: "CoreLet",
                    pattern: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                    value: { kind: "CoreIntLit", value: 5, loc: testLoc },
                    body: { kind: "CoreVar", name: "x", loc: testLoc },
                    mutable: false,
                    recursive: false,
                    loc: testLoc,
                },
                loc: testLoc,
            };

            const result = pass.transform(expr);

            // Should NOT inline (inside unsafe block)
            expect(result).toEqual(expr);
        });
    });

    describe("Optimization level sensitivity", () => {
        it("should inline more aggressively at O2 than O1", () => {
            // Medium-sized expression
            const mediumValue: CoreExpr = {
                kind: "CoreBinOp",
                op: "Add",
                left: {
                    kind: "CoreBinOp",
                    op: "Multiply",
                    left: { kind: "CoreIntLit", value: 2, loc: testLoc },
                    right: { kind: "CoreIntLit", value: 3, loc: testLoc },
                    loc: testLoc,
                },
                right: { kind: "CoreIntLit", value: 1, loc: testLoc },
                loc: testLoc,
            };

            const expr: CoreExpr = {
                kind: "CoreLet",
                pattern: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                value: mediumValue,
                body: { kind: "CoreVar", name: "x", loc: testLoc },
                mutable: false,
                recursive: false,
                loc: testLoc,
            };

            const passO1 = new InlineExpansionPass(OptimizationLevel.O1);
            const passO2 = new InlineExpansionPass(OptimizationLevel.O2);

            const resultO1 = passO1.transform(expr);
            const resultO2 = passO2.transform(expr);

            // Both should inline a single-use medium expression
            expect(resultO1.kind).toBe("CoreBinOp");
            expect(resultO2.kind).toBe("CoreBinOp");
        });
    });

    describe("Complex scenarios", () => {
        it("should inline in nested let expressions", () => {
            // let x = 1 in (let y = x in y + 1)
            const expr: CoreExpr = {
                kind: "CoreLet",
                pattern: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                value: { kind: "CoreIntLit", value: 1, loc: testLoc },
                body: {
                    kind: "CoreLet",
                    pattern: { kind: "CoreVarPattern", name: "y", loc: testLoc },
                    value: { kind: "CoreVar", name: "x", loc: testLoc },
                    body: {
                        kind: "CoreBinOp",
                        op: "Add",
                        left: { kind: "CoreVar", name: "y", loc: testLoc },
                        right: { kind: "CoreIntLit", value: 1, loc: testLoc },
                        loc: testLoc,
                    },
                    mutable: false,
                    recursive: false,
                    loc: testLoc,
                },
                mutable: false,
                recursive: false,
                loc: testLoc,
            };

            const result = pass.transform(expr);

            // After inlining: x->1 in (let y = 1 in y + 1), then y->1 gives 1 + 1
            // Result: 1 + 1 (fully inlined due to recursive transformation)
            expect(result.kind).toBe("CoreBinOp");
            if (result.kind === "CoreBinOp") {
                expect(result.op).toBe("Add");
                expect(result.left).toEqual({ kind: "CoreIntLit", value: 1, loc: testLoc });
                expect(result.right).toEqual({ kind: "CoreIntLit", value: 1, loc: testLoc });
            }
        });
    });

    describe("countUses - various expression types", () => {
        it("should count uses in CoreLetRecExpr (not shadowed)", () => {
            // let x = 1 in let rec f = x in f
            const expr: CoreExpr = {
                kind: "CoreLet",
                pattern: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                value: { kind: "CoreIntLit", value: 1, loc: testLoc },
                body: {
                    kind: "CoreLetRecExpr",
                    bindings: [
                        {
                            pattern: { kind: "CoreVarPattern", name: "f", loc: testLoc },
                            value: { kind: "CoreVar", name: "x", loc: testLoc },
                            mutable: false,
                            loc: testLoc,
                        },
                    ],
                    body: { kind: "CoreVar", name: "f", loc: testLoc },
                    loc: testLoc,
                },
                mutable: false,
                recursive: false,
                loc: testLoc,
            };

            const result = pass.transform(expr);
            // x is used once in let rec binding, should inline
            expect(result.kind).toBe("CoreLetRecExpr");
        });

        it("should handle shadowing in CoreLetRecExpr", () => {
            // let x = 1 in let rec x = 5 in x
            const expr: CoreExpr = {
                kind: "CoreLet",
                pattern: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                value: { kind: "CoreIntLit", value: 1, loc: testLoc },
                body: {
                    kind: "CoreLetRecExpr",
                    bindings: [
                        {
                            pattern: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                            value: { kind: "CoreIntLit", value: 5, loc: testLoc },
                            mutable: false,
                            loc: testLoc,
                        },
                    ],
                    body: { kind: "CoreVar", name: "x", loc: testLoc },
                    loc: testLoc,
                },
                mutable: false,
                recursive: false,
                loc: testLoc,
            };

            const result = pass.transform(expr);
            // x is shadowed by let rec, so outer x is unused - should inline to body
            expect(result.kind).toBe("CoreLetRecExpr");
        });

        it("should count uses in CoreApp", () => {
            // let x = f in x(1, 2)
            const expr: CoreExpr = {
                kind: "CoreLet",
                pattern: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                value: { kind: "CoreVar", name: "f", loc: testLoc },
                body: {
                    kind: "CoreApp",
                    func: { kind: "CoreVar", name: "x", loc: testLoc },
                    args: [
                        { kind: "CoreIntLit", value: 1, loc: testLoc },
                        { kind: "CoreIntLit", value: 2, loc: testLoc },
                    ],
                    loc: testLoc,
                },
                mutable: false,
                recursive: false,
                loc: testLoc,
            };

            const result = pass.transform(expr);
            // x is a variable (trivial), should inline
            expect(result.kind).toBe("CoreApp");
            if (result.kind === "CoreApp") {
                expect(result.func).toEqual({ kind: "CoreVar", name: "f", loc: testLoc });
            }
        });

        it("should count uses in CoreMatch cases", () => {
            // let x = 1 in match y { _ => x }
            const expr: CoreExpr = {
                kind: "CoreLet",
                pattern: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                value: { kind: "CoreIntLit", value: 1, loc: testLoc },
                body: {
                    kind: "CoreMatch",
                    expr: { kind: "CoreVar", name: "y", loc: testLoc },
                    cases: [
                        {
                            pattern: { kind: "CoreWildcardPattern", loc: testLoc },
                            body: { kind: "CoreVar", name: "x", loc: testLoc },
                            loc: testLoc,
                        },
                    ],
                    loc: testLoc,
                },
                mutable: false,
                recursive: false,
                loc: testLoc,
            };

            const result = pass.transform(expr);
            // x is used once, should inline
            expect(result.kind).toBe("CoreMatch");
            if (result.kind === "CoreMatch" && result.cases[0]) {
                expect(result.cases[0].body).toEqual({ kind: "CoreIntLit", value: 1, loc: testLoc });
            }
        });

        it("should count uses in CoreMatch with guards", () => {
            // let x = 1 in match y { z when x > 0 => z }
            const expr: CoreExpr = {
                kind: "CoreLet",
                pattern: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                value: { kind: "CoreIntLit", value: 1, loc: testLoc },
                body: {
                    kind: "CoreMatch",
                    expr: { kind: "CoreVar", name: "y", loc: testLoc },
                    cases: [
                        {
                            pattern: { kind: "CoreVarPattern", name: "z", loc: testLoc },
                            guard: {
                                kind: "CoreBinOp",
                                op: "GreaterThan",
                                left: { kind: "CoreVar", name: "x", loc: testLoc },
                                right: { kind: "CoreIntLit", value: 0, loc: testLoc },
                                loc: testLoc,
                            },
                            body: { kind: "CoreVar", name: "z", loc: testLoc },
                            loc: testLoc,
                        },
                    ],
                    loc: testLoc,
                },
                mutable: false,
                recursive: false,
                loc: testLoc,
            };

            const result = pass.transform(expr);
            // x is used in guard, should inline
            expect(result.kind).toBe("CoreMatch");
        });

        it("should handle shadowing in CoreMatch pattern", () => {
            // let x = 1 in match y { x => x }
            const expr: CoreExpr = {
                kind: "CoreLet",
                pattern: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                value: { kind: "CoreIntLit", value: 1, loc: testLoc },
                body: {
                    kind: "CoreMatch",
                    expr: { kind: "CoreVar", name: "y", loc: testLoc },
                    cases: [
                        {
                            pattern: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                            body: { kind: "CoreVar", name: "x", loc: testLoc },
                            loc: testLoc,
                        },
                    ],
                    loc: testLoc,
                },
                mutable: false,
                recursive: false,
                loc: testLoc,
            };

            const result = pass.transform(expr);
            // x in match body is shadowed by pattern, so outer x is unused
            expect(result.kind).toBe("CoreMatch");
        });

        it("should count uses in CoreRecord", () => {
            // let x = 1 in { a: x, b: 2 }
            const expr: CoreExpr = {
                kind: "CoreLet",
                pattern: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                value: { kind: "CoreIntLit", value: 1, loc: testLoc },
                body: {
                    kind: "CoreRecord",
                    fields: [
                        { kind: "Field", name: "a", value: { kind: "CoreVar", name: "x", loc: testLoc }, loc: testLoc },
                        {
                            kind: "Field",
                            name: "b",
                            value: { kind: "CoreIntLit", value: 2, loc: testLoc },
                            loc: testLoc,
                        },
                    ],
                    loc: testLoc,
                },
                mutable: false,
                recursive: false,
                loc: testLoc,
            };

            const result = pass.transform(expr);
            // x is used once, should inline
            expect(result.kind).toBe("CoreRecord");
            if (result.kind === "CoreRecord" && result.fields[0]?.kind === "Field") {
                expect(result.fields[0].value).toEqual({ kind: "CoreIntLit", value: 1, loc: testLoc });
            }
        });

        it("should count uses in CoreRecord spread", () => {
            // let x = r in { ...x }
            const expr: CoreExpr = {
                kind: "CoreLet",
                pattern: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                value: { kind: "CoreVar", name: "r", loc: testLoc },
                body: {
                    kind: "CoreRecord",
                    fields: [{ kind: "Spread", expr: { kind: "CoreVar", name: "x", loc: testLoc }, loc: testLoc }],
                    loc: testLoc,
                },
                mutable: false,
                recursive: false,
                loc: testLoc,
            };

            const result = pass.transform(expr);
            // x is trivial (variable), should inline
            expect(result.kind).toBe("CoreRecord");
            if (result.kind === "CoreRecord" && result.fields[0]?.kind === "Spread") {
                expect(result.fields[0].expr).toEqual({ kind: "CoreVar", name: "r", loc: testLoc });
            }
        });

        it("should count uses in CoreRecordAccess", () => {
            // let x = r in x.field
            const expr: CoreExpr = {
                kind: "CoreLet",
                pattern: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                value: { kind: "CoreVar", name: "r", loc: testLoc },
                body: {
                    kind: "CoreRecordAccess",
                    record: { kind: "CoreVar", name: "x", loc: testLoc },
                    field: "field",
                    loc: testLoc,
                },
                mutable: false,
                recursive: false,
                loc: testLoc,
            };

            const result = pass.transform(expr);
            // x is trivial, should inline
            expect(result.kind).toBe("CoreRecordAccess");
            if (result.kind === "CoreRecordAccess") {
                expect(result.record).toEqual({ kind: "CoreVar", name: "r", loc: testLoc });
            }
        });

        it("should count uses in CoreRecordUpdate with field", () => {
            // let x = 1 in { r | a: x }
            const expr: CoreExpr = {
                kind: "CoreLet",
                pattern: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                value: { kind: "CoreIntLit", value: 1, loc: testLoc },
                body: {
                    kind: "CoreRecordUpdate",
                    record: { kind: "CoreVar", name: "r", loc: testLoc },
                    updates: [
                        { kind: "Field", name: "a", value: { kind: "CoreVar", name: "x", loc: testLoc }, loc: testLoc },
                    ],
                    loc: testLoc,
                },
                mutable: false,
                recursive: false,
                loc: testLoc,
            };

            const result = pass.transform(expr);
            expect(result.kind).toBe("CoreRecordUpdate");
        });

        it("should count uses in CoreRecordUpdate with spread", () => {
            // let x = other in { r | ...x }
            const expr: CoreExpr = {
                kind: "CoreLet",
                pattern: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                value: { kind: "CoreVar", name: "other", loc: testLoc },
                body: {
                    kind: "CoreRecordUpdate",
                    record: { kind: "CoreVar", name: "r", loc: testLoc },
                    updates: [{ kind: "Spread", expr: { kind: "CoreVar", name: "x", loc: testLoc }, loc: testLoc }],
                    loc: testLoc,
                },
                mutable: false,
                recursive: false,
                loc: testLoc,
            };

            const result = pass.transform(expr);
            expect(result.kind).toBe("CoreRecordUpdate");
        });

        it("should count uses in CoreVariant", () => {
            // let x = 1 in Some(x)
            const expr: CoreExpr = {
                kind: "CoreLet",
                pattern: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                value: { kind: "CoreIntLit", value: 1, loc: testLoc },
                body: {
                    kind: "CoreVariant",
                    constructor: "Some",
                    args: [{ kind: "CoreVar", name: "x", loc: testLoc }],
                    loc: testLoc,
                },
                mutable: false,
                recursive: false,
                loc: testLoc,
            };

            const result = pass.transform(expr);
            expect(result.kind).toBe("CoreVariant");
            if (result.kind === "CoreVariant") {
                expect(result.args[0]).toEqual({ kind: "CoreIntLit", value: 1, loc: testLoc });
            }
        });

        it("should count uses in CoreBinOp", () => {
            // let x = 1 in x + 2
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

            const result = pass.transform(expr);
            expect(result.kind).toBe("CoreBinOp");
            if (result.kind === "CoreBinOp") {
                expect(result.left).toEqual({ kind: "CoreIntLit", value: 1, loc: testLoc });
            }
        });

        it("should count uses in CoreUnaryOp", () => {
            // let x = true in !x
            const expr: CoreExpr = {
                kind: "CoreLet",
                pattern: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                value: { kind: "CoreBoolLit", value: true, loc: testLoc },
                body: {
                    kind: "CoreUnaryOp",
                    op: "LogicalNot",
                    expr: { kind: "CoreVar", name: "x", loc: testLoc },
                    loc: testLoc,
                },
                mutable: false,
                recursive: false,
                loc: testLoc,
            };

            const result = pass.transform(expr);
            expect(result.kind).toBe("CoreUnaryOp");
            if (result.kind === "CoreUnaryOp") {
                expect(result.expr).toEqual({ kind: "CoreBoolLit", value: true, loc: testLoc });
            }
        });

        it("should count uses in CoreTypeAnnotation", () => {
            // let x = 1 in (x : Int)
            const expr: CoreExpr = {
                kind: "CoreLet",
                pattern: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                value: { kind: "CoreIntLit", value: 1, loc: testLoc },
                body: {
                    kind: "CoreTypeAnnotation",
                    expr: { kind: "CoreVar", name: "x", loc: testLoc },
                    typeExpr: { kind: "CoreTypeConst", name: "Int", loc: testLoc },
                    loc: testLoc,
                },
                mutable: false,
                recursive: false,
                loc: testLoc,
            };

            const result = pass.transform(expr);
            expect(result.kind).toBe("CoreTypeAnnotation");
            if (result.kind === "CoreTypeAnnotation") {
                expect(result.expr).toEqual({ kind: "CoreIntLit", value: 1, loc: testLoc });
            }
        });

        it("should count uses in CoreUnsafe", () => {
            // let x = 1 in unsafe { x }
            // The outer let is still inlined (x is trivial), but the inner x is replaced
            const expr: CoreExpr = {
                kind: "CoreLet",
                pattern: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                value: { kind: "CoreIntLit", value: 1, loc: testLoc },
                body: {
                    kind: "CoreUnsafe",
                    expr: { kind: "CoreVar", name: "x", loc: testLoc },
                    loc: testLoc,
                },
                mutable: false,
                recursive: false,
                loc: testLoc,
            };

            const result = pass.transform(expr);
            // x is trivial (int literal), so it's inlined into the unsafe block body
            expect(result.kind).toBe("CoreUnsafe");
            if (result.kind === "CoreUnsafe") {
                expect(result.expr).toEqual({ kind: "CoreIntLit", value: 1, loc: testLoc });
            }
        });
    });

    describe("getPatternVars - various patterns", () => {
        it("should handle variant pattern in match", () => {
            // let x = 1 in match opt { Some(x) => x }
            const expr: CoreExpr = {
                kind: "CoreLet",
                pattern: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                value: { kind: "CoreIntLit", value: 1, loc: testLoc },
                body: {
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
                },
                mutable: false,
                recursive: false,
                loc: testLoc,
            };

            const result = pass.transform(expr);
            // x is shadowed by variant pattern, so outer x is unused
            expect(result.kind).toBe("CoreMatch");
        });

        it("should handle record pattern in match", () => {
            // let x = 1 in match r { { x } => x }
            const expr: CoreExpr = {
                kind: "CoreLet",
                pattern: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                value: { kind: "CoreIntLit", value: 1, loc: testLoc },
                body: {
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
                },
                mutable: false,
                recursive: false,
                loc: testLoc,
            };

            const result = pass.transform(expr);
            // x is shadowed by record pattern, so outer x is unused
            expect(result.kind).toBe("CoreMatch");
        });

        it("should handle literal pattern (no bindings)", () => {
            // let x = 1 in match n { 0 => x }
            const expr: CoreExpr = {
                kind: "CoreLet",
                pattern: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                value: { kind: "CoreIntLit", value: 1, loc: testLoc },
                body: {
                    kind: "CoreMatch",
                    expr: { kind: "CoreVar", name: "n", loc: testLoc },
                    cases: [
                        {
                            pattern: {
                                kind: "CoreLiteralPattern",
                                literal: 0,
                                loc: testLoc,
                            },
                            body: { kind: "CoreVar", name: "x", loc: testLoc },
                            loc: testLoc,
                        },
                    ],
                    loc: testLoc,
                },
                mutable: false,
                recursive: false,
                loc: testLoc,
            };

            const result = pass.transform(expr);
            // Literal pattern doesn't bind x, so x should be inlined
            expect(result.kind).toBe("CoreMatch");
            if (result.kind === "CoreMatch" && result.cases[0]) {
                expect(result.cases[0].body).toEqual({ kind: "CoreIntLit", value: 1, loc: testLoc });
            }
        });
    });

    describe("canApply", () => {
        it("should return true for expressions without unsafe", () => {
            const expr: CoreExpr = { kind: "CoreIntLit", value: 42, loc: testLoc };
            expect(pass.canApply(expr)).toBe(true);
        });

        it("should return false for expressions containing unsafe", () => {
            const expr: CoreExpr = {
                kind: "CoreUnsafe",
                expr: { kind: "CoreIntLit", value: 42, loc: testLoc },
                loc: testLoc,
            };
            expect(pass.canApply(expr)).toBe(false);
        });
    });
});
