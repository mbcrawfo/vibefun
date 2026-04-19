/**
 * Operator emission for ES2020 code generation (binary + unary).
 */

import type { CoreExpr } from "../../../types/core-ast.js";
import type { EmitContext } from "../context.js";

import {
    markNeedsEqHelper,
    markNeedsIntDivHelper,
    markNeedsIntModHelper,
    markNeedsRefHelper,
    withPrecedence,
} from "../context.js";
import {
    CALL_PRECEDENCE,
    getBinaryPrecedence,
    getUnaryPrecedence,
    JS_BINARY_OP,
    MEMBER_PRECEDENCE,
    needsParens,
} from "../emit-operators.js";
import { emitExpr } from "./index.js";

/**
 * Check if a type is a primitive type (uses === for equality)
 */
function isPrimitiveType(typeName: string): boolean {
    return (
        typeName === "Int" ||
        typeName === "Float" ||
        typeName === "String" ||
        typeName === "Bool" ||
        typeName === "Unit"
    );
}

/**
 * Determine if an expression has a primitive type
 * Used for deciding between === and $eq for equality
 */
function isExprPrimitive(expr: CoreExpr, ctx: EmitContext): boolean {
    // For variables, look up their type
    if (expr.kind === "CoreVar") {
        // Check declaration types first
        const declType = ctx.declarationTypes.get(expr.name);
        if (declType && declType.type === "Const") {
            return isPrimitiveType(declType.name);
        }
        // Check environment
        const binding = ctx.env.values.get(expr.name);
        if (binding && binding.kind === "Value") {
            const t = binding.scheme.type;
            if (t.type === "Const") {
                return isPrimitiveType(t.name);
            }
        }
        // Unknown type - conservatively use $eq
        return false;
    }

    // Literals are always primitive
    if (
        expr.kind === "CoreIntLit" ||
        expr.kind === "CoreFloatLit" ||
        expr.kind === "CoreStringLit" ||
        expr.kind === "CoreBoolLit" ||
        expr.kind === "CoreUnitLit"
    ) {
        return true;
    }

    // Records, tuples, variants are composite
    if (expr.kind === "CoreRecord" || expr.kind === "CoreTuple" || expr.kind === "CoreVariant") {
        return false;
    }

    // For other expressions, conservatively use $eq
    return false;
}

/**
 * Wrap code in parentheses if needed based on precedence
 */
function maybeParens(code: string, innerPrec: number, outerPrec: number): string {
    if (needsParens(innerPrec, outerPrec)) {
        return `(${code})`;
    }
    return code;
}

/**
 * Emit a binary operation
 */
export function emitBinOp(
    expr: { kind: "CoreBinOp"; op: string; left: CoreExpr; right: CoreExpr },
    ctx: EmitContext,
): string {
    const op = expr.op;
    const prec = getBinaryPrecedence(op as Parameters<typeof getBinaryPrecedence>[0]);

    // Handle special operators
    if (op === "Divide") {
        throw new Error("Internal error: Unlowered Divide operator reached codegen (typechecker bug)");
    }

    if (op === "IntDivide") {
        // $intDiv(a, b) — integer division with runtime zero-divisor check
        markNeedsIntDivHelper(ctx);
        const leftCode = emitExpr(expr.left, withPrecedence(ctx, 0));
        const rightCode = emitExpr(expr.right, withPrecedence(ctx, 0));
        const code = `$intDiv(${leftCode}, ${rightCode})`;
        return maybeParens(code, CALL_PRECEDENCE, ctx.precedence);
    }

    if (op === "Modulo") {
        // $intMod(a, b) — integer modulo with runtime zero-divisor check.
        // Modulo is always Int in current type system (no float %). When
        // float modulo is added, this branch should narrow to the int case.
        markNeedsIntModHelper(ctx);
        const leftCode = emitExpr(expr.left, withPrecedence(ctx, 0));
        const rightCode = emitExpr(expr.right, withPrecedence(ctx, 0));
        const code = `$intMod(${leftCode}, ${rightCode})`;
        return maybeParens(code, CALL_PRECEDENCE, ctx.precedence);
    }

    if (op === "RefAssign") {
        // (a.$value = b, undefined)
        markNeedsRefHelper(ctx);
        const leftCode = emitExpr(expr.left, withPrecedence(ctx, MEMBER_PRECEDENCE));
        const rightCode = emitExpr(expr.right, withPrecedence(ctx, 0));
        return `(${leftCode}.$value = ${rightCode}, undefined)`;
    }

    if (op === "Equal" || op === "NotEqual") {
        // Check if we need structural equality
        const usePrimitive = isExprPrimitive(expr.left, ctx) && isExprPrimitive(expr.right, ctx);

        if (usePrimitive) {
            const jsOp = op === "Equal" ? "===" : "!==";
            const leftCode = emitExpr(expr.left, withPrecedence(ctx, prec));
            const rightCode = emitExpr(expr.right, withPrecedence(ctx, prec));
            const code = `${leftCode} ${jsOp} ${rightCode}`;
            return maybeParens(code, prec, ctx.precedence);
        } else {
            // Use $eq helper
            markNeedsEqHelper(ctx);
            const leftCode = emitExpr(expr.left, withPrecedence(ctx, 0));
            const rightCode = emitExpr(expr.right, withPrecedence(ctx, 0));
            if (op === "Equal") {
                return maybeParens(`$eq(${leftCode}, ${rightCode})`, CALL_PRECEDENCE, ctx.precedence);
            } else {
                return maybeParens(`!$eq(${leftCode}, ${rightCode})`, getUnaryPrecedence("LogicalNot"), ctx.precedence);
            }
        }
    }

    // Standard binary operators
    const jsOp = JS_BINARY_OP[op as keyof typeof JS_BINARY_OP];
    if (jsOp === null) {
        throw new Error(`Internal error: No JS operator for ${op}`);
    }

    const leftCode = emitExpr(expr.left, withPrecedence(ctx, prec));
    const rightCode = emitExpr(expr.right, withPrecedence(ctx, prec + 1)); // +1 ensures left-associativity (same-precedence right operands get parenthesized)
    const code = `${leftCode} ${jsOp} ${rightCode}`;

    return maybeParens(code, prec, ctx.precedence);
}

/**
 * Emit a unary operation
 */
export function emitUnaryOp(expr: { kind: "CoreUnaryOp"; op: string; expr: CoreExpr }, ctx: EmitContext): string {
    const op = expr.op;
    const prec = getUnaryPrecedence(op as Parameters<typeof getUnaryPrecedence>[0]);

    if (op === "Deref") {
        // x.$value
        markNeedsRefHelper(ctx);
        const innerCode = emitExpr(expr.expr, withPrecedence(ctx, MEMBER_PRECEDENCE));
        return maybeParens(`${innerCode}.$value`, MEMBER_PRECEDENCE, ctx.precedence);
    }

    // Negate or LogicalNot
    const jsOp = op === "Negate" ? "-" : "!";
    const innerCode = emitExpr(expr.expr, withPrecedence(ctx, prec));
    const code = `${jsOp}${innerCode}`;

    return maybeParens(code, prec, ctx.precedence);
}
