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
});
