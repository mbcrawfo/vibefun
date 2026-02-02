/**
 * Operator precedence and parenthesization
 *
 * JavaScript operator precedence levels (lower = binds tighter):
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Operator_precedence
 *
 * We use a simplified subset relevant to our generated code.
 */

import type { CoreBinaryOp, CoreUnary } from "../../types/core-ast.js";

/**
 * Precedence levels for binary operators
 * Higher numbers = lower precedence (binds looser)
 *
 * Based on JavaScript operator precedence:
 * - Assignment: 2 (not used directly, but RefAssign is similar)
 * - Logical OR: 3
 * - Logical AND: 4
 * - Equality: 8
 * - Relational: 9
 * - Additive: 11
 * - Multiplicative: 12
 */
export const PRECEDENCE: Record<CoreBinaryOp, number> = {
    // Logical (lowest precedence)
    LogicalOr: 3,
    LogicalAnd: 4,

    // Equality
    Equal: 8,
    NotEqual: 8,

    // Relational
    LessThan: 9,
    LessEqual: 9,
    GreaterThan: 9,
    GreaterEqual: 9,

    // Additive
    Add: 11,
    Subtract: 11,
    Concat: 11, // String concatenation uses +

    // Multiplicative (highest precedence of binary ops)
    Multiply: 12,
    Divide: 12, // Should never appear (lowered to Int/FloatDivide)
    IntDivide: 12,
    FloatDivide: 12,
    Modulo: 12,

    // Reference assignment (treated as low precedence)
    RefAssign: 2,
};

/**
 * Precedence for unary operators
 * All unary operators have the same high precedence
 */
export const UNARY_PRECEDENCE: Record<CoreUnary, number> = {
    Negate: 14,
    LogicalNot: 14,
    Deref: 14, // x.$value has member access precedence
};

/**
 * Precedence for function application
 * Call expressions have very high precedence
 */
export const CALL_PRECEDENCE = 17;

/**
 * Precedence for member access (dot notation)
 */
export const MEMBER_PRECEDENCE = 18;

/**
 * Precedence used for atoms (literals, variables, parenthesized expressions)
 * The highest possible - never needs parenthesization
 */
export const ATOM_PRECEDENCE = 20;

/**
 * Get the precedence of a binary operator
 *
 * @param op - Binary operator
 * @returns Precedence level
 */
export function getBinaryPrecedence(op: CoreBinaryOp): number {
    return PRECEDENCE[op];
}

/**
 * Get the precedence of a unary operator
 *
 * @param op - Unary operator
 * @returns Precedence level
 */
export function getUnaryPrecedence(op: CoreUnary): number {
    return UNARY_PRECEDENCE[op];
}

/**
 * Determine if parentheses are needed for a subexpression
 *
 * Parentheses are needed when the inner expression has lower precedence
 * (higher number) than the outer context.
 *
 * @param innerPrecedence - Precedence of the inner expression
 * @param outerPrecedence - Precedence of the outer context
 * @returns True if parentheses are needed
 */
export function needsParens(innerPrecedence: number, outerPrecedence: number): boolean {
    return innerPrecedence < outerPrecedence;
}

/**
 * Map binary operators to JavaScript operators
 *
 * Note: Some operators like IntDivide need special handling (Math.trunc)
 * and Equal/NotEqual may need $eq for structural equality.
 */
export const JS_BINARY_OP: Record<CoreBinaryOp, string | null> = {
    Add: "+",
    Subtract: "-",
    Multiply: "*",
    Divide: null, // Should never appear - internal error
    IntDivide: null, // Special: Math.trunc(a / b)
    FloatDivide: "/",
    Modulo: "%",
    Equal: "===", // Or $eq for structural
    NotEqual: "!==", // Or !$eq for structural
    LessThan: "<",
    LessEqual: "<=",
    GreaterThan: ">",
    GreaterEqual: ">=",
    LogicalAnd: "&&",
    LogicalOr: "||",
    Concat: "+",
    RefAssign: null, // Special: (a.$value = b, undefined)
};

/**
 * Map unary operators to JavaScript operators
 */
export const JS_UNARY_OP: Record<CoreUnary, string | null> = {
    Negate: "-",
    LogicalNot: "!",
    Deref: null, // Special: x.$value
};
