/**
 * Type inference for operators
 *
 * Handles binary and unary operators.
 */

import type { CoreBinaryOp, CoreExpr, CoreUnary } from "../../types/core-ast.js";
import type { Type } from "../../types/environment.js";
import type { InferenceContext, InferResult } from "./infer-context.js";

import { TypeError } from "../../utils/error.js";
import { appType, constType, freshTypeVar, primitiveTypes, typeToString } from "../types.js";
import { applySubst, composeSubst, unify } from "../unify.js";

// Import inferExpr - will be set via dependency injection
let inferExprFn: (ctx: InferenceContext, expr: CoreExpr) => InferResult;

/**
 * Set up dependency injection for inferExpr
 */
export function setInferExpr(fn: typeof inferExprFn): void {
    inferExprFn = fn;
}

/**
 * Infer the type of a binary operation
 *
 * @param ctx - The inference context
 * @param expr - The binary operation expression
 * @returns The inferred type and updated substitution
 */
export function inferBinOp(ctx: InferenceContext, expr: Extract<CoreExpr, { kind: "CoreBinOp" }>): InferResult {
    // Infer left operand
    const leftResult = inferExprFn(ctx, expr.left);

    // Infer right operand
    const rightCtx: InferenceContext = { ...ctx, subst: leftResult.subst };
    const rightResult = inferExprFn(rightCtx, expr.right);

    const currentSubst = rightResult.subst;

    // Apply substitution to left type
    const leftType = applySubst(currentSubst, leftResult.type);
    const rightType = rightResult.type;

    // Special handling for RefAssign: (Ref<T>, T) -> Unit
    if (expr.op === "RefAssign") {
        try {
            // Left operand must be Ref<T>
            const elemType = freshTypeVar(ctx.level);
            const refType = appType(constType("Ref"), [elemType]);

            // Unify left with Ref<T>
            const leftUnify = unify(leftType, refType);
            const subst1 = composeSubst(leftUnify, currentSubst);

            // Apply substitution to get the actual element type
            const actualElemType = applySubst(subst1, elemType);
            const rightTypeSubst = applySubst(subst1, rightType);

            // Unify right with T
            const rightUnify = unify(rightTypeSubst, actualElemType);
            const finalSubst = composeSubst(rightUnify, subst1);

            // Result is Unit
            return { type: primitiveTypes.Unit, subst: finalSubst };
        } catch (error) {
            if (error instanceof TypeError) {
                throw error;
            }
            throw new TypeError(
                `Type error in reference assignment`,
                expr.loc,
                `Expected (Ref<T>, T) -> Unit, but got ${typeToString(leftType)} := ${typeToString(rightType)}`,
            );
        }
    }

    // Determine expected types and result type based on operator
    const { paramType, resultType } = getBinOpTypes(expr.op);

    // Unify operand types with expected parameter type
    try {
        const leftUnify = unify(leftType, paramType);
        const subst1 = composeSubst(leftUnify, currentSubst);

        const rightTypeSubst = applySubst(subst1, rightType);
        const paramTypeSubst = applySubst(subst1, paramType);

        const rightUnify = unify(rightTypeSubst, paramTypeSubst);
        const finalSubst = composeSubst(rightUnify, subst1);

        // Apply substitution to result type
        const finalResultType = applySubst(finalSubst, resultType);

        return { type: finalResultType, subst: finalSubst };
    } catch (error) {
        if (error instanceof TypeError) {
            throw error;
        }
        throw new TypeError(
            `Type error in binary operation ${expr.op}`,
            expr.loc,
            `Cannot apply ${expr.op} to types ${typeToString(leftType)} and ${typeToString(rightType)}`,
        );
    }
}

/**
 * Get the parameter and result types for a binary operator
 *
 * @param op - The binary operator
 * @returns The parameter type and result type
 */
function getBinOpTypes(op: CoreBinaryOp): { paramType: Type; resultType: Type } {
    switch (op) {
        // Arithmetic: (Int, Int) -> Int or (Float, Float) -> Float
        // For now, we'll use a fresh type variable that can unify with Int or Float
        case "Add":
        case "Subtract":
        case "Multiply":
        case "Divide":
        case "Modulo": {
            // Currently require Int for arithmetic operators
            // TODO: Add polymorphic arithmetic to support Float operators
            return {
                paramType: primitiveTypes.Int,
                resultType: primitiveTypes.Int,
            };
        }

        // Comparison: (Int, Int) -> Bool or (Float, Float) -> Bool
        case "LessThan":
        case "LessEqual":
        case "GreaterThan":
        case "GreaterEqual": {
            // For simplicity, require Int
            return {
                paramType: primitiveTypes.Int,
                resultType: primitiveTypes.Bool,
            };
        }

        // Equality: (T, T) -> Bool (polymorphic)
        case "Equal":
        case "NotEqual": {
            const t = freshTypeVar(0);
            return {
                paramType: t,
                resultType: primitiveTypes.Bool,
            };
        }

        // Logical: (Bool, Bool) -> Bool
        case "LogicalAnd":
        case "LogicalOr":
            return {
                paramType: primitiveTypes.Bool,
                resultType: primitiveTypes.Bool,
            };

        // String concat: (String, String) -> String
        case "Concat":
            return {
                paramType: primitiveTypes.String,
                resultType: primitiveTypes.String,
            };

        // Reference assignment: (Ref<T>, T) -> Unit
        // Note: RefAssign is handled with special logic in inferBinaryOp before this function is called
        case "RefAssign": {
            throw new Error("RefAssign should be handled by special case logic");
        }
    }
}

/**
 * Infer the type of a unary operation
 *
 * @param ctx - The inference context
 * @param expr - The unary operation expression
 * @returns The inferred type and updated substitution
 */
export function inferUnaryOp(ctx: InferenceContext, expr: Extract<CoreExpr, { kind: "CoreUnaryOp" }>): InferResult {
    // Infer operand type
    const operandResult = inferExprFn(ctx, expr.expr);

    // Special handling for Deref: Ref<T> -> T
    if (expr.op === "Deref") {
        try {
            // Operand must be Ref<T>
            const elemType = freshTypeVar(ctx.level);
            const refType = appType(constType("Ref"), [elemType]);

            // Unify operand with Ref<T>
            const unifySubst = unify(operandResult.type, refType);
            const finalSubst = composeSubst(unifySubst, operandResult.subst);

            // Apply substitution to get the actual element type
            const resultType = applySubst(finalSubst, elemType);

            return { type: resultType, subst: finalSubst };
        } catch (error) {
            if (error instanceof TypeError) {
                throw error;
            }
            throw new TypeError(
                `Type error in dereference`,
                expr.expr.loc,
                `Expected Ref<T>, but got ${typeToString(operandResult.type)}`,
            );
        }
    }

    const { paramType, resultType } = getUnaryOpTypes(expr.op);

    // Unify operand type with expected parameter type
    try {
        const unifySubst = unify(operandResult.type, paramType);
        const finalSubst = composeSubst(unifySubst, operandResult.subst);

        // Apply substitution to result type
        const finalResultType = applySubst(finalSubst, resultType);

        return { type: finalResultType, subst: finalSubst };
    } catch (error) {
        if (error instanceof TypeError) {
            throw error;
        }
        throw new TypeError(
            `Type error in unary operation ${expr.op}`,
            expr.expr.loc,
            `Cannot apply ${expr.op} to type ${typeToString(operandResult.type)}`,
        );
    }
}

/**
 * Get the parameter and result types for a unary operator
 *
 * @param op - The unary operator
 * @returns The parameter type and result type
 */
function getUnaryOpTypes(op: CoreUnary): { paramType: Type; resultType: Type } {
    switch (op) {
        // Negation: Int -> Int or Float -> Float
        case "Negate":
            // For simplicity, require Int
            return {
                paramType: primitiveTypes.Int,
                resultType: primitiveTypes.Int,
            };

        // Logical not: Bool -> Bool
        case "LogicalNot":
            return {
                paramType: primitiveTypes.Bool,
                resultType: primitiveTypes.Bool,
            };

        // Dereference: Ref<T> -> T
        // Note: Deref is handled with special logic in inferUnaryOp before this function is called
        case "Deref": {
            throw new Error("Deref should be handled by special case logic");
        }
    }
}
