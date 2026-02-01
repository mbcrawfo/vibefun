/**
 * Constant Folding Optimization Pass
 *
 * Evaluates constant expressions at compile time to reduce runtime overhead.
 *
 * Optimizations:
 * - Arithmetic operations on literals (Add, Subtract, Multiply, Divide, Modulo)
 * - Comparison operations (Equal, NotEqual, LessThan, LessThanOrEqual, GreaterThan, GreaterThanOrEqual)
 * - Logical operations (And, Or, Not)
 * - String concatenation
 *
 * Safety:
 * - Never optimizes inside unsafe blocks
 * - Handles edge cases: division by zero, NaN, Infinity
 * - Preserves semantics exactly
 */

import type { CoreExpr } from "../../types/core-ast.js";

import { containsUnsafe } from "../../utils/ast-analysis.js";
import { transformExpr } from "../../utils/ast-transform.js";
import { OptimizationPass } from "../optimization-pass.js";

export class ConstantFoldingPass extends OptimizationPass {
    readonly name = "ConstantFolding";

    override canApply(expr: CoreExpr): boolean {
        // Never optimize inside unsafe blocks
        return !containsUnsafe(expr);
    }

    override transform(expr: CoreExpr): CoreExpr {
        // Never transform inside unsafe blocks
        if (expr.kind === "CoreUnsafe") {
            return expr;
        }
        return transformExpr(expr, (e) => this.foldConstants(e));
    }

    private foldConstants(expr: CoreExpr): CoreExpr {
        // Double-check: never fold inside unsafe blocks
        if (expr.kind === "CoreUnsafe") {
            return expr;
        }

        switch (expr.kind) {
            case "CoreBinOp":
                return this.foldBinaryOp(expr);
            case "CoreUnaryOp":
                return this.foldUnaryOp(expr);
            default:
                return expr;
        }
    }

    private foldBinaryOp(expr: CoreExpr & { kind: "CoreBinOp" }): CoreExpr {
        const { left, right, op, loc } = expr;

        // Integer arithmetic
        if (left.kind === "CoreIntLit" && right.kind === "CoreIntLit") {
            const l = left.value;
            const r = right.value;

            switch (op) {
                case "Add":
                    return { kind: "CoreIntLit", value: l + r, loc };
                case "Subtract":
                    return { kind: "CoreIntLit", value: l - r, loc };
                case "Multiply":
                    return { kind: "CoreIntLit", value: l * r, loc };
                case "Divide":
                    // Don't fold division by zero (runtime error)
                    if (r === 0) return expr;
                    // Use Math.trunc for truncation toward zero (not Math.floor)
                    // -7 / 2 = -3 (truncation), not -4 (floor)
                    // Note: Divide is kept for backwards compatibility with tests
                    // that construct Core AST directly; normally lowered to IntDivide
                    return { kind: "CoreIntLit", value: Math.trunc(l / r), loc };
                case "IntDivide":
                    // Integer division: truncates toward zero
                    if (r === 0) return expr;
                    return { kind: "CoreIntLit", value: Math.trunc(l / r), loc };
                case "Modulo":
                    if (r === 0) return expr;
                    return { kind: "CoreIntLit", value: l % r, loc };
                case "Equal":
                    return { kind: "CoreBoolLit", value: l === r, loc };
                case "NotEqual":
                    return { kind: "CoreBoolLit", value: l !== r, loc };
                case "LessThan":
                    return { kind: "CoreBoolLit", value: l < r, loc };
                case "LessEqual":
                    return { kind: "CoreBoolLit", value: l <= r, loc };
                case "GreaterThan":
                    return { kind: "CoreBoolLit", value: l > r, loc };
                case "GreaterEqual":
                    return { kind: "CoreBoolLit", value: l >= r, loc };
            }
        }

        // Float arithmetic
        if (left.kind === "CoreFloatLit" && right.kind === "CoreFloatLit") {
            const l = left.value;
            const r = right.value;

            switch (op) {
                case "Add": {
                    const result = l + r;
                    // Don't fold if result is NaN or Infinity (preserve runtime behavior)
                    if (!Number.isFinite(result)) return expr;
                    return { kind: "CoreFloatLit", value: result, loc };
                }
                case "Subtract": {
                    const result = l - r;
                    if (!Number.isFinite(result)) return expr;
                    return { kind: "CoreFloatLit", value: result, loc };
                }
                case "Multiply": {
                    const result = l * r;
                    if (!Number.isFinite(result)) return expr;
                    return { kind: "CoreFloatLit", value: result, loc };
                }
                case "Divide": {
                    // Note: Divide is kept for backwards compatibility with tests
                    // that construct Core AST directly; normally lowered to FloatDivide
                    if (r === 0) return expr;
                    const result = l / r;
                    if (!Number.isFinite(result)) return expr;
                    return { kind: "CoreFloatLit", value: result, loc };
                }
                case "FloatDivide": {
                    // Float division: standard IEEE 754 division
                    if (r === 0) return expr;
                    const result = l / r;
                    if (!Number.isFinite(result)) return expr;
                    return { kind: "CoreFloatLit", value: result, loc };
                }
                case "Modulo": {
                    if (r === 0) return expr;
                    const result = l % r;
                    if (!Number.isFinite(result)) return expr;
                    return { kind: "CoreFloatLit", value: result, loc };
                }
                case "Equal":
                    return { kind: "CoreBoolLit", value: l === r, loc };
                case "NotEqual":
                    return { kind: "CoreBoolLit", value: l !== r, loc };
                case "LessThan":
                    return { kind: "CoreBoolLit", value: l < r, loc };
                case "LessEqual":
                    return { kind: "CoreBoolLit", value: l <= r, loc };
                case "GreaterThan":
                    return { kind: "CoreBoolLit", value: l > r, loc };
                case "GreaterEqual":
                    return { kind: "CoreBoolLit", value: l >= r, loc };
            }
        }

        // String concatenation
        if (op === "Add" && left.kind === "CoreStringLit" && right.kind === "CoreStringLit") {
            return { kind: "CoreStringLit", value: left.value + right.value, loc };
        }

        // Boolean operations
        if (left.kind === "CoreBoolLit" && right.kind === "CoreBoolLit") {
            const l = left.value;
            const r = right.value;

            switch (op) {
                case "LogicalAnd":
                    return { kind: "CoreBoolLit", value: l && r, loc };
                case "LogicalOr":
                    return { kind: "CoreBoolLit", value: l || r, loc };
                case "Equal":
                    return { kind: "CoreBoolLit", value: l === r, loc };
                case "NotEqual":
                    return { kind: "CoreBoolLit", value: l !== r, loc };
            }
        }

        // Short-circuit boolean operations
        if (op === "LogicalAnd" && left.kind === "CoreBoolLit") {
            // false && x => false
            if (!left.value) return { kind: "CoreBoolLit", value: false, loc };
            // true && x => x
            return right;
        }

        if (op === "LogicalOr" && left.kind === "CoreBoolLit") {
            // true || x => true
            if (left.value) return { kind: "CoreBoolLit", value: true, loc };
            // false || x => x
            return right;
        }

        // String equality
        if (left.kind === "CoreStringLit" && right.kind === "CoreStringLit") {
            switch (op) {
                case "Equal":
                    return { kind: "CoreBoolLit", value: left.value === right.value, loc };
                case "NotEqual":
                    return { kind: "CoreBoolLit", value: left.value !== right.value, loc };
            }
        }

        // Arithmetic identities
        if (op === "Add" && right.kind === "CoreIntLit" && right.value === 0) {
            // x + 0 => x
            return left;
        }

        if (op === "Add" && left.kind === "CoreIntLit" && left.value === 0) {
            // 0 + x => x
            return right;
        }

        if (op === "Multiply" && right.kind === "CoreIntLit" && right.value === 1) {
            // x * 1 => x
            return left;
        }

        if (op === "Multiply" && left.kind === "CoreIntLit" && left.value === 1) {
            // 1 * x => x
            return right;
        }

        if (op === "Multiply" && right.kind === "CoreIntLit" && right.value === 0) {
            // x * 0 => 0
            return { kind: "CoreIntLit", value: 0, loc };
        }

        if (op === "Multiply" && left.kind === "CoreIntLit" && left.value === 0) {
            // 0 * x => 0
            return { kind: "CoreIntLit", value: 0, loc };
        }

        return expr;
    }

    private foldUnaryOp(expr: CoreExpr & { kind: "CoreUnaryOp" }): CoreExpr {
        const { expr: operand, op, loc } = expr;

        switch (op) {
            case "Negate":
                if (operand.kind === "CoreIntLit") {
                    return { kind: "CoreIntLit", value: -operand.value, loc };
                }
                if (operand.kind === "CoreFloatLit") {
                    return { kind: "CoreFloatLit", value: -operand.value, loc };
                }
                break;

            case "LogicalNot":
                if (operand.kind === "CoreBoolLit") {
                    return { kind: "CoreBoolLit", value: !operand.value, loc };
                }
                break;
        }

        return expr;
    }
}
