/**
 * Tests for Constant Folding optimization pass
 */

import type { CoreExpr } from "../../types/core-ast.js";

import { describe, expect, it } from "vitest";

import { ConstantFoldingPass } from "./constant-folding.js";

const testLoc = { file: "test", line: 1, column: 1, offset: 0 };

describe("ConstantFoldingPass", () => {
    const pass = new ConstantFoldingPass();

    describe("Integer arithmetic", () => {
        it("should fold integer addition", () => {
            const expr: CoreExpr = {
                kind: "CoreBinOp",
                op: "Add",
                left: { kind: "CoreIntLit", value: 2, loc: testLoc },
                right: { kind: "CoreIntLit", value: 3, loc: testLoc },
                loc: testLoc,
            };

            const result = pass.transform(expr);

            expect(result).toEqual({ kind: "CoreIntLit", value: 5, loc: testLoc });
        });

        it("should fold integer subtraction", () => {
            const expr: CoreExpr = {
                kind: "CoreBinOp",
                op: "Subtract",
                left: { kind: "CoreIntLit", value: 10, loc: testLoc },
                right: { kind: "CoreIntLit", value: 3, loc: testLoc },
                loc: testLoc,
            };

            const result = pass.transform(expr);

            expect(result).toEqual({ kind: "CoreIntLit", value: 7, loc: testLoc });
        });

        it("should fold integer multiplication", () => {
            const expr: CoreExpr = {
                kind: "CoreBinOp",
                op: "Multiply",
                left: { kind: "CoreIntLit", value: 4, loc: testLoc },
                right: { kind: "CoreIntLit", value: 5, loc: testLoc },
                loc: testLoc,
            };

            const result = pass.transform(expr);

            expect(result).toEqual({ kind: "CoreIntLit", value: 20, loc: testLoc });
        });

        it("should fold integer division", () => {
            const expr: CoreExpr = {
                kind: "CoreBinOp",
                op: "Divide",
                left: { kind: "CoreIntLit", value: 10, loc: testLoc },
                right: { kind: "CoreIntLit", value: 3, loc: testLoc },
                loc: testLoc,
            };

            const result = pass.transform(expr);

            expect(result).toEqual({ kind: "CoreIntLit", value: 3, loc: testLoc }); // Truncation toward zero
        });

        it("should fold integer modulo", () => {
            const expr: CoreExpr = {
                kind: "CoreBinOp",
                op: "Modulo",
                left: { kind: "CoreIntLit", value: 10, loc: testLoc },
                right: { kind: "CoreIntLit", value: 3, loc: testLoc },
                loc: testLoc,
            };

            const result = pass.transform(expr);

            expect(result).toEqual({ kind: "CoreIntLit", value: 1, loc: testLoc });
        });

        it("should not fold division by zero", () => {
            const expr: CoreExpr = {
                kind: "CoreBinOp",
                op: "Divide",
                left: { kind: "CoreIntLit", value: 10, loc: testLoc },
                right: { kind: "CoreIntLit", value: 0, loc: testLoc },
                loc: testLoc,
            };

            const result = pass.transform(expr);

            expect(result).toEqual(expr); // Unchanged
        });

        it("should not fold modulo by zero", () => {
            const expr: CoreExpr = {
                kind: "CoreBinOp",
                op: "Modulo",
                left: { kind: "CoreIntLit", value: 10, loc: testLoc },
                right: { kind: "CoreIntLit", value: 0, loc: testLoc },
                loc: testLoc,
            };

            const result = pass.transform(expr);

            expect(result).toEqual(expr); // Unchanged
        });

        it("should truncate toward zero for negative dividend", () => {
            // -7 / 2 should equal -3 (truncation toward zero, not -4 like floor)
            const expr: CoreExpr = {
                kind: "CoreBinOp",
                op: "Divide",
                left: { kind: "CoreIntLit", value: -7, loc: testLoc },
                right: { kind: "CoreIntLit", value: 2, loc: testLoc },
                loc: testLoc,
            };

            const result = pass.transform(expr);

            expect(result).toEqual({ kind: "CoreIntLit", value: -3, loc: testLoc });
        });

        it("should truncate toward zero for negative divisor", () => {
            // 7 / -2 should equal -3 (truncation toward zero)
            const expr: CoreExpr = {
                kind: "CoreBinOp",
                op: "Divide",
                left: { kind: "CoreIntLit", value: 7, loc: testLoc },
                right: { kind: "CoreIntLit", value: -2, loc: testLoc },
                loc: testLoc,
            };

            const result = pass.transform(expr);

            expect(result).toEqual({ kind: "CoreIntLit", value: -3, loc: testLoc });
        });

        it("should truncate toward zero when both operands are negative", () => {
            // -7 / -2 should equal 3 (truncation toward zero)
            const expr: CoreExpr = {
                kind: "CoreBinOp",
                op: "Divide",
                left: { kind: "CoreIntLit", value: -7, loc: testLoc },
                right: { kind: "CoreIntLit", value: -2, loc: testLoc },
                loc: testLoc,
            };

            const result = pass.transform(expr);

            expect(result).toEqual({ kind: "CoreIntLit", value: 3, loc: testLoc });
        });

        it("should fold IntDivide", () => {
            const expr: CoreExpr = {
                kind: "CoreBinOp",
                op: "IntDivide",
                left: { kind: "CoreIntLit", value: 10, loc: testLoc },
                right: { kind: "CoreIntLit", value: 3, loc: testLoc },
                loc: testLoc,
            };

            const result = pass.transform(expr);

            expect(result).toEqual({ kind: "CoreIntLit", value: 3, loc: testLoc });
        });

        it("should not fold IntDivide by zero", () => {
            const expr: CoreExpr = {
                kind: "CoreBinOp",
                op: "IntDivide",
                left: { kind: "CoreIntLit", value: 10, loc: testLoc },
                right: { kind: "CoreIntLit", value: 0, loc: testLoc },
                loc: testLoc,
            };

            const result = pass.transform(expr);

            expect(result).toEqual(expr); // Unchanged
        });

        it("should truncate IntDivide toward zero for negative dividend", () => {
            const expr: CoreExpr = {
                kind: "CoreBinOp",
                op: "IntDivide",
                left: { kind: "CoreIntLit", value: -7, loc: testLoc },
                right: { kind: "CoreIntLit", value: 2, loc: testLoc },
                loc: testLoc,
            };

            const result = pass.transform(expr);

            expect(result).toEqual({ kind: "CoreIntLit", value: -3, loc: testLoc });
        });

        it("should truncate IntDivide toward zero for negative divisor", () => {
            const expr: CoreExpr = {
                kind: "CoreBinOp",
                op: "IntDivide",
                left: { kind: "CoreIntLit", value: 7, loc: testLoc },
                right: { kind: "CoreIntLit", value: -2, loc: testLoc },
                loc: testLoc,
            };

            const result = pass.transform(expr);

            expect(result).toEqual({ kind: "CoreIntLit", value: -3, loc: testLoc });
        });

        it("should truncate IntDivide toward zero when both negative", () => {
            const expr: CoreExpr = {
                kind: "CoreBinOp",
                op: "IntDivide",
                left: { kind: "CoreIntLit", value: -7, loc: testLoc },
                right: { kind: "CoreIntLit", value: -2, loc: testLoc },
                loc: testLoc,
            };

            const result = pass.transform(expr);

            expect(result).toEqual({ kind: "CoreIntLit", value: 3, loc: testLoc });
        });
    });

    describe("Float arithmetic", () => {
        it("should fold float addition", () => {
            const expr: CoreExpr = {
                kind: "CoreBinOp",
                op: "Add",
                left: { kind: "CoreFloatLit", value: 2.5, loc: testLoc },
                right: { kind: "CoreFloatLit", value: 3.7, loc: testLoc },
                loc: testLoc,
            };

            const result = pass.transform(expr);

            expect(result.kind).toBe("CoreFloatLit");
            if (result.kind === "CoreFloatLit") {
                expect(result.value).toBeCloseTo(6.2);
            }
        });

        it("should fold float multiplication", () => {
            const expr: CoreExpr = {
                kind: "CoreBinOp",
                op: "Multiply",
                left: { kind: "CoreFloatLit", value: 2.0, loc: testLoc },
                right: { kind: "CoreFloatLit", value: 3.5, loc: testLoc },
                loc: testLoc,
            };

            const result = pass.transform(expr);

            expect(result.kind).toBe("CoreFloatLit");
            if (result.kind === "CoreFloatLit") {
                expect(result.value).toBeCloseTo(7.0);
            }
        });

        it("should not fold float division by zero", () => {
            const expr: CoreExpr = {
                kind: "CoreBinOp",
                op: "Divide",
                left: { kind: "CoreFloatLit", value: 10.0, loc: testLoc },
                right: { kind: "CoreFloatLit", value: 0.0, loc: testLoc },
                loc: testLoc,
            };

            const result = pass.transform(expr);

            expect(result).toEqual(expr); // Unchanged (would be Infinity)
        });

        it("should not fold operations that produce NaN", () => {
            const expr: CoreExpr = {
                kind: "CoreBinOp",
                op: "Subtract",
                left: { kind: "CoreFloatLit", value: Infinity, loc: testLoc },
                right: { kind: "CoreFloatLit", value: Infinity, loc: testLoc },
                loc: testLoc,
            };

            const result = pass.transform(expr);

            expect(result).toEqual(expr); // Unchanged (would be NaN)
        });

        it("should fold FloatDivide", () => {
            const expr: CoreExpr = {
                kind: "CoreBinOp",
                op: "FloatDivide",
                left: { kind: "CoreFloatLit", value: 10.0, loc: testLoc },
                right: { kind: "CoreFloatLit", value: 4.0, loc: testLoc },
                loc: testLoc,
            };

            const result = pass.transform(expr);

            expect(result.kind).toBe("CoreFloatLit");
            if (result.kind === "CoreFloatLit") {
                expect(result.value).toBeCloseTo(2.5);
            }
        });

        it("should not fold FloatDivide by zero", () => {
            const expr: CoreExpr = {
                kind: "CoreBinOp",
                op: "FloatDivide",
                left: { kind: "CoreFloatLit", value: 10.0, loc: testLoc },
                right: { kind: "CoreFloatLit", value: 0.0, loc: testLoc },
                loc: testLoc,
            };

            const result = pass.transform(expr);

            expect(result).toEqual(expr); // Unchanged (would be Infinity)
        });

        it("should fold FloatDivide with negative dividend (no truncation)", () => {
            // Float division: -7.0 / 2.0 = -3.5 (no truncation like IntDivide)
            const expr: CoreExpr = {
                kind: "CoreBinOp",
                op: "FloatDivide",
                left: { kind: "CoreFloatLit", value: -7.0, loc: testLoc },
                right: { kind: "CoreFloatLit", value: 2.0, loc: testLoc },
                loc: testLoc,
            };

            const result = pass.transform(expr);

            expect(result.kind).toBe("CoreFloatLit");
            if (result.kind === "CoreFloatLit") {
                expect(result.value).toBeCloseTo(-3.5);
            }
        });
    });

    describe("Comparisons", () => {
        it("should fold integer equality", () => {
            const expr: CoreExpr = {
                kind: "CoreBinOp",
                op: "Equal",
                left: { kind: "CoreIntLit", value: 5, loc: testLoc },
                right: { kind: "CoreIntLit", value: 5, loc: testLoc },
                loc: testLoc,
            };

            const result = pass.transform(expr);

            expect(result).toEqual({ kind: "CoreBoolLit", value: true, loc: testLoc });
        });

        it("should fold integer inequality", () => {
            const expr: CoreExpr = {
                kind: "CoreBinOp",
                op: "NotEqual",
                left: { kind: "CoreIntLit", value: 5, loc: testLoc },
                right: { kind: "CoreIntLit", value: 3, loc: testLoc },
                loc: testLoc,
            };

            const result = pass.transform(expr);

            expect(result).toEqual({ kind: "CoreBoolLit", value: true, loc: testLoc });
        });

        it("should fold less than comparison", () => {
            const expr: CoreExpr = {
                kind: "CoreBinOp",
                op: "LessThan",
                left: { kind: "CoreIntLit", value: 3, loc: testLoc },
                right: { kind: "CoreIntLit", value: 5, loc: testLoc },
                loc: testLoc,
            };

            const result = pass.transform(expr);

            expect(result).toEqual({ kind: "CoreBoolLit", value: true, loc: testLoc });
        });

        it("should fold greater than or equal comparison", () => {
            const expr: CoreExpr = {
                kind: "CoreBinOp",
                op: "GreaterEqual",
                left: { kind: "CoreIntLit", value: 5, loc: testLoc },
                right: { kind: "CoreIntLit", value: 5, loc: testLoc },
                loc: testLoc,
            };

            const result = pass.transform(expr);

            expect(result).toEqual({ kind: "CoreBoolLit", value: true, loc: testLoc });
        });

        it("should fold string equality", () => {
            const expr: CoreExpr = {
                kind: "CoreBinOp",
                op: "Equal",
                left: { kind: "CoreStringLit", value: "hello", loc: testLoc },
                right: { kind: "CoreStringLit", value: "hello", loc: testLoc },
                loc: testLoc,
            };

            const result = pass.transform(expr);

            expect(result).toEqual({ kind: "CoreBoolLit", value: true, loc: testLoc });
        });
    });

    describe("Boolean operations", () => {
        it("should fold boolean AND", () => {
            const expr: CoreExpr = {
                kind: "CoreBinOp",
                op: "LogicalAnd",
                left: { kind: "CoreBoolLit", value: true, loc: testLoc },
                right: { kind: "CoreBoolLit", value: false, loc: testLoc },
                loc: testLoc,
            };

            const result = pass.transform(expr);

            expect(result).toEqual({ kind: "CoreBoolLit", value: false, loc: testLoc });
        });

        it("should fold boolean OR", () => {
            const expr: CoreExpr = {
                kind: "CoreBinOp",
                op: "LogicalOr",
                left: { kind: "CoreBoolLit", value: true, loc: testLoc },
                right: { kind: "CoreBoolLit", value: false, loc: testLoc },
                loc: testLoc,
            };

            const result = pass.transform(expr);

            expect(result).toEqual({ kind: "CoreBoolLit", value: true, loc: testLoc });
        });

        it("should optimize false AND x to false", () => {
            const expr: CoreExpr = {
                kind: "CoreBinOp",
                op: "LogicalAnd",
                left: { kind: "CoreBoolLit", value: false, loc: testLoc },
                right: { kind: "CoreVar", name: "x", loc: testLoc },
                loc: testLoc,
            };

            const result = pass.transform(expr);

            expect(result).toEqual({ kind: "CoreBoolLit", value: false, loc: testLoc });
        });

        it("should optimize true AND x to x", () => {
            const expr: CoreExpr = {
                kind: "CoreBinOp",
                op: "LogicalAnd",
                left: { kind: "CoreBoolLit", value: true, loc: testLoc },
                right: { kind: "CoreVar", name: "x", loc: testLoc },
                loc: testLoc,
            };

            const result = pass.transform(expr);

            expect(result).toEqual({ kind: "CoreVar", name: "x", loc: testLoc });
        });

        it("should optimize true OR x to true", () => {
            const expr: CoreExpr = {
                kind: "CoreBinOp",
                op: "LogicalOr",
                left: { kind: "CoreBoolLit", value: true, loc: testLoc },
                right: { kind: "CoreVar", name: "x", loc: testLoc },
                loc: testLoc,
            };

            const result = pass.transform(expr);

            expect(result).toEqual({ kind: "CoreBoolLit", value: true, loc: testLoc });
        });

        it("should optimize false OR x to x", () => {
            const expr: CoreExpr = {
                kind: "CoreBinOp",
                op: "LogicalOr",
                left: { kind: "CoreBoolLit", value: false, loc: testLoc },
                right: { kind: "CoreVar", name: "x", loc: testLoc },
                loc: testLoc,
            };

            const result = pass.transform(expr);

            expect(result).toEqual({ kind: "CoreVar", name: "x", loc: testLoc });
        });

        it("should fold NOT true", () => {
            const expr: CoreExpr = {
                kind: "CoreUnaryOp",
                op: "LogicalNot",
                expr: { kind: "CoreBoolLit", value: true, loc: testLoc },
                loc: testLoc,
            };

            const result = pass.transform(expr);

            expect(result).toEqual({ kind: "CoreBoolLit", value: false, loc: testLoc });
        });

        it("should fold NOT false", () => {
            const expr: CoreExpr = {
                kind: "CoreUnaryOp",
                op: "LogicalNot",
                expr: { kind: "CoreBoolLit", value: false, loc: testLoc },
                loc: testLoc,
            };

            const result = pass.transform(expr);

            expect(result).toEqual({ kind: "CoreBoolLit", value: true, loc: testLoc });
        });
    });

    describe("String operations", () => {
        it("should fold string concatenation", () => {
            const expr: CoreExpr = {
                kind: "CoreBinOp",
                op: "Add",
                left: { kind: "CoreStringLit", value: "hello", loc: testLoc },
                right: { kind: "CoreStringLit", value: " world", loc: testLoc },
                loc: testLoc,
            };

            const result = pass.transform(expr);

            expect(result).toEqual({ kind: "CoreStringLit", value: "hello world", loc: testLoc });
        });
    });

    describe("Unary operations", () => {
        it("should fold integer negation", () => {
            const expr: CoreExpr = {
                kind: "CoreUnaryOp",
                op: "Negate",
                expr: { kind: "CoreIntLit", value: 5, loc: testLoc },
                loc: testLoc,
            };

            const result = pass.transform(expr);

            expect(result).toEqual({ kind: "CoreIntLit", value: -5, loc: testLoc });
        });

        it("should fold float negation", () => {
            const expr: CoreExpr = {
                kind: "CoreUnaryOp",
                op: "Negate",
                expr: { kind: "CoreFloatLit", value: 3.5, loc: testLoc },
                loc: testLoc,
            };

            const result = pass.transform(expr);

            expect(result).toEqual({ kind: "CoreFloatLit", value: -3.5, loc: testLoc });
        });
    });

    describe("Arithmetic identities", () => {
        it("should optimize x + 0 to x", () => {
            const expr: CoreExpr = {
                kind: "CoreBinOp",
                op: "Add",
                left: { kind: "CoreVar", name: "x", loc: testLoc },
                right: { kind: "CoreIntLit", value: 0, loc: testLoc },
                loc: testLoc,
            };

            const result = pass.transform(expr);

            expect(result).toEqual({ kind: "CoreVar", name: "x", loc: testLoc });
        });

        it("should optimize 0 + x to x", () => {
            const expr: CoreExpr = {
                kind: "CoreBinOp",
                op: "Add",
                left: { kind: "CoreIntLit", value: 0, loc: testLoc },
                right: { kind: "CoreVar", name: "x", loc: testLoc },
                loc: testLoc,
            };

            const result = pass.transform(expr);

            expect(result).toEqual({ kind: "CoreVar", name: "x", loc: testLoc });
        });

        it("should optimize x * 1 to x", () => {
            const expr: CoreExpr = {
                kind: "CoreBinOp",
                op: "Multiply",
                left: { kind: "CoreVar", name: "x", loc: testLoc },
                right: { kind: "CoreIntLit", value: 1, loc: testLoc },
                loc: testLoc,
            };

            const result = pass.transform(expr);

            expect(result).toEqual({ kind: "CoreVar", name: "x", loc: testLoc });
        });

        it("should optimize 1 * x to x", () => {
            const expr: CoreExpr = {
                kind: "CoreBinOp",
                op: "Multiply",
                left: { kind: "CoreIntLit", value: 1, loc: testLoc },
                right: { kind: "CoreVar", name: "x", loc: testLoc },
                loc: testLoc,
            };

            const result = pass.transform(expr);

            expect(result).toEqual({ kind: "CoreVar", name: "x", loc: testLoc });
        });

        it("should optimize x * 0 to 0", () => {
            const expr: CoreExpr = {
                kind: "CoreBinOp",
                op: "Multiply",
                left: { kind: "CoreVar", name: "x", loc: testLoc },
                right: { kind: "CoreIntLit", value: 0, loc: testLoc },
                loc: testLoc,
            };

            const result = pass.transform(expr);

            expect(result).toEqual({ kind: "CoreIntLit", value: 0, loc: testLoc });
        });

        it("should optimize 0 * x to 0", () => {
            const expr: CoreExpr = {
                kind: "CoreBinOp",
                op: "Multiply",
                left: { kind: "CoreIntLit", value: 0, loc: testLoc },
                right: { kind: "CoreVar", name: "x", loc: testLoc },
                loc: testLoc,
            };

            const result = pass.transform(expr);

            expect(result).toEqual({ kind: "CoreIntLit", value: 0, loc: testLoc });
        });
    });

    describe("Nested expressions", () => {
        it("should fold nested constant expressions", () => {
            // (2 + 3) * (4 - 1) => 5 * 3 => 15
            const expr: CoreExpr = {
                kind: "CoreBinOp",
                op: "Multiply",
                left: {
                    kind: "CoreBinOp",
                    op: "Add",
                    left: { kind: "CoreIntLit", value: 2, loc: testLoc },
                    right: { kind: "CoreIntLit", value: 3, loc: testLoc },
                    loc: testLoc,
                },
                right: {
                    kind: "CoreBinOp",
                    op: "Subtract",
                    left: { kind: "CoreIntLit", value: 4, loc: testLoc },
                    right: { kind: "CoreIntLit", value: 1, loc: testLoc },
                    loc: testLoc,
                },
                loc: testLoc,
            };

            const result = pass.transform(expr);

            expect(result).toEqual({ kind: "CoreIntLit", value: 15, loc: testLoc });
        });
    });

    describe("Unsafe blocks", () => {
        it("should not fold constants inside unsafe blocks", () => {
            const expr: CoreExpr = {
                kind: "CoreUnsafe",
                expr: {
                    kind: "CoreBinOp",
                    op: "Add",
                    left: { kind: "CoreIntLit", value: 2, loc: testLoc },
                    right: { kind: "CoreIntLit", value: 3, loc: testLoc },
                    loc: testLoc,
                },
                loc: testLoc,
            };

            const result = pass.transform(expr);

            expect(result).toEqual(expr); // Unchanged
        });
    });
});
