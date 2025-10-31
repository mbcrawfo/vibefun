/**
 * AST Transformation Utilities
 *
 * Provides visitor patterns and transformation utilities for Core AST traversal.
 */

import type { CoreExpr, CoreMatchCase, CorePattern } from "../types/core-ast.js";

/**
 * Transformer function type - takes an expression and returns a transformed expression
 */
export type Transformer = (expr: CoreExpr) => CoreExpr;

/**
 * Visitor function type - visits an expression without transformation
 */
export type Visitor = (expr: CoreExpr) => void;

/**
 * Folder function type - reduces an expression to a value
 */
export type Folder<T> = (expr: CoreExpr, accumulator: T) => T;

/**
 * Transform an expression bottom-up (children first, then parent)
 *
 * @param expr - The expression to transform
 * @param fn - The transformation function applied to each node
 * @returns The transformed expression
 */
export function transformExpr(expr: CoreExpr, fn: Transformer): CoreExpr {
    // First, recursively transform children
    const transformedChildren = transformChildren(expr, fn);

    // Then apply transformation to the (transformed) node itself
    return fn(transformedChildren);
}

/**
 * Transform only the children of an expression
 *
 * @param expr - The expression whose children to transform
 * @param fn - The transformation function
 * @returns A new expression with transformed children
 */
export function transformChildren(expr: CoreExpr, fn: Transformer): CoreExpr {
    switch (expr.kind) {
        // Literals - no children
        case "CoreIntLit":
        case "CoreFloatLit":
        case "CoreStringLit":
        case "CoreBoolLit":
        case "CoreUnitLit":
        case "CoreVar":
            return expr;

        // Let binding
        case "CoreLet":
            return {
                ...expr,
                pattern: transformPattern(expr.pattern, fn),
                value: transformExpr(expr.value, fn),
                body: transformExpr(expr.body, fn),
            };

        // Mutually recursive let bindings
        case "CoreLetRecExpr":
            return {
                ...expr,
                bindings: expr.bindings.map((binding) => ({
                    ...binding,
                    pattern: transformPattern(binding.pattern, fn),
                    value: transformExpr(binding.value, fn),
                })),
                body: transformExpr(expr.body, fn),
            };

        // Lambda
        case "CoreLambda":
            return {
                ...expr,
                param: transformPattern(expr.param, fn),
                body: transformExpr(expr.body, fn),
            };

        // Application
        case "CoreApp":
            return {
                ...expr,
                func: transformExpr(expr.func, fn),
                args: expr.args.map((arg) => transformExpr(arg, fn)),
            };

        // Match
        case "CoreMatch":
            return {
                ...expr,
                expr: transformExpr(expr.expr, fn),
                cases: expr.cases.map((c) => transformMatchCase(c, fn)),
            };

        // Record
        case "CoreRecord":
            return {
                ...expr,
                fields: expr.fields.map((field) => ({
                    ...field,
                    value: transformExpr(field.value, fn),
                })),
            };

        // Record access
        case "CoreRecordAccess":
            return {
                ...expr,
                record: transformExpr(expr.record, fn),
            };

        // Record update
        case "CoreRecordUpdate":
            return {
                ...expr,
                record: transformExpr(expr.record, fn),
                updates: expr.updates.map((update) => ({
                    ...update,
                    value: transformExpr(update.value, fn),
                })),
            };

        // Variant
        case "CoreVariant":
            return {
                ...expr,
                args: expr.args.map((arg) => transformExpr(arg, fn)),
            };

        // Binary operation
        case "CoreBinOp":
            return {
                ...expr,
                left: transformExpr(expr.left, fn),
                right: transformExpr(expr.right, fn),
            };

        // Unary operation
        case "CoreUnaryOp":
            return {
                ...expr,
                expr: transformExpr(expr.expr, fn),
            };

        // Type annotation
        case "CoreTypeAnnotation":
            return {
                ...expr,
                expr: transformExpr(expr.expr, fn),
            };

        // Unsafe block
        case "CoreUnsafe":
            return {
                ...expr,
                expr: transformExpr(expr.expr, fn),
            };
    }
}

/**
 * Transform a pattern (currently patterns don't contain expressions, but may in future)
 *
 * @param pattern - The pattern to transform
 * @param fn - The transformation function
 * @returns The transformed pattern
 */
function transformPattern(pattern: CorePattern, fn: Transformer): CorePattern {
    switch (pattern.kind) {
        case "CoreWildcardPattern":
        case "CoreVarPattern":
        case "CoreLiteralPattern":
            return pattern;

        case "CoreVariantPattern":
            return {
                ...pattern,
                args: pattern.args.map((arg) => transformPattern(arg, fn)),
            };

        case "CoreRecordPattern":
            return {
                ...pattern,
                fields: pattern.fields.map((field) => ({
                    ...field,
                    pattern: transformPattern(field.pattern, fn),
                })),
            };
    }
}

/**
 * Transform a match case
 *
 * @param matchCase - The match case to transform
 * @param fn - The transformation function
 * @returns The transformed match case
 */
function transformMatchCase(matchCase: CoreMatchCase, fn: Transformer): CoreMatchCase {
    const transformedCase: CoreMatchCase = {
        pattern: transformPattern(matchCase.pattern, fn),
        body: transformExpr(matchCase.body, fn),
        loc: matchCase.loc,
    };

    if (matchCase.guard !== undefined) {
        transformedCase.guard = transformExpr(matchCase.guard, fn);
    }

    return transformedCase;
}

/**
 * Visit an expression tree without transformation (side effects only)
 *
 * @param expr - The expression to visit
 * @param fn - The visitor function
 */
export function visitExpr(expr: CoreExpr, fn: Visitor): void {
    // Visit current node
    fn(expr);

    // Visit children
    switch (expr.kind) {
        // Literals and variables - no children
        case "CoreIntLit":
        case "CoreFloatLit":
        case "CoreStringLit":
        case "CoreBoolLit":
        case "CoreUnitLit":
        case "CoreVar":
            return;

        case "CoreLet":
            visitExpr(expr.value, fn);
            visitExpr(expr.body, fn);
            return;

        case "CoreLetRecExpr":
            expr.bindings.forEach((binding) => visitExpr(binding.value, fn));
            visitExpr(expr.body, fn);
            return;

        case "CoreLambda":
            visitExpr(expr.body, fn);
            return;

        case "CoreApp":
            visitExpr(expr.func, fn);
            expr.args.forEach((arg) => visitExpr(arg, fn));
            return;

        case "CoreMatch":
            visitExpr(expr.expr, fn);
            expr.cases.forEach((c) => {
                if (c.guard) visitExpr(c.guard, fn);
                visitExpr(c.body, fn);
            });
            return;

        case "CoreRecord":
            expr.fields.forEach((field) => visitExpr(field.value, fn));
            return;

        case "CoreRecordAccess":
            visitExpr(expr.record, fn);
            return;

        case "CoreRecordUpdate":
            visitExpr(expr.record, fn);
            expr.updates.forEach((update) => visitExpr(update.value, fn));
            return;

        case "CoreVariant":
            expr.args.forEach((arg) => visitExpr(arg, fn));
            return;

        case "CoreBinOp":
            visitExpr(expr.left, fn);
            visitExpr(expr.right, fn);
            return;

        case "CoreUnaryOp":
            visitExpr(expr.expr, fn);
            return;

        case "CoreTypeAnnotation":
            visitExpr(expr.expr, fn);
            return;

        case "CoreUnsafe":
            visitExpr(expr.expr, fn);
            return;
    }
}

/**
 * Fold (reduce) an expression tree to a value
 *
 * @param expr - The expression to fold
 * @param fn - The folder function
 * @param initial - The initial accumulator value
 * @returns The accumulated value
 */
export function foldExpr<T>(expr: CoreExpr, fn: Folder<T>, initial: T): T {
    let accumulator = initial;

    visitExpr(expr, (node) => {
        accumulator = fn(node, accumulator);
    });

    return accumulator;
}
