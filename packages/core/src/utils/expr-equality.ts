/**
 * Expression Equality Utilities
 *
 * Provides deep equality checking for Core AST expressions.
 * Used for fixed-point detection and common subexpression elimination.
 */

import type { CoreExpr, CoreMatchCase, CorePattern } from "../types/core-ast.js";

/**
 * Check if two expressions are structurally equal (deep equality)
 *
 * @param e1 - First expression
 * @param e2 - Second expression
 * @returns true if expressions are structurally identical
 */
export function exprEquals(e1: CoreExpr, e2: CoreExpr): boolean {
    if (e1.kind !== e2.kind) {
        return false;
    }

    switch (e1.kind) {
        case "CoreIntLit":
            return e2.kind === "CoreIntLit" && e1.value === e2.value;

        case "CoreFloatLit":
            return e2.kind === "CoreFloatLit" && e1.value === e2.value;

        case "CoreStringLit":
            return e2.kind === "CoreStringLit" && e1.value === e2.value;

        case "CoreBoolLit":
            return e2.kind === "CoreBoolLit" && e1.value === e2.value;

        case "CoreUnitLit":
            return e2.kind === "CoreUnitLit";

        case "CoreVar":
            return e2.kind === "CoreVar" && e1.name === e2.name;

        case "CoreLet":
            return (
                e2.kind === "CoreLet" &&
                patternEquals(e1.pattern, e2.pattern) &&
                exprEquals(e1.value, e2.value) &&
                exprEquals(e1.body, e2.body) &&
                e1.mutable === e2.mutable &&
                e1.recursive === e2.recursive
            );

        case "CoreLetRecExpr":
            if (e2.kind !== "CoreLetRecExpr") return false;
            if (e1.bindings.length !== e2.bindings.length) return false;

            for (let i = 0; i < e1.bindings.length; i++) {
                const b1 = e1.bindings[i];
                const b2 = e2.bindings[i];
                if (!b1 || !b2) return false;
                if (!patternEquals(b1.pattern, b2.pattern)) return false;
                if (!exprEquals(b1.value, b2.value)) return false;
                if (b1.mutable !== b2.mutable) return false;
            }

            return exprEquals(e1.body, e2.body);

        case "CoreLambda":
            return e2.kind === "CoreLambda" && patternEquals(e1.param, e2.param) && exprEquals(e1.body, e2.body);

        case "CoreApp":
            if (e2.kind !== "CoreApp") return false;
            if (!exprEquals(e1.func, e2.func)) return false;
            if (e1.args.length !== e2.args.length) return false;

            for (let i = 0; i < e1.args.length; i++) {
                const arg1 = e1.args[i];
                const arg2 = e2.args[i];
                if (!arg1 || !arg2) return false;
                if (!exprEquals(arg1, arg2)) return false;
            }

            return true;

        case "CoreMatch":
            if (e2.kind !== "CoreMatch") return false;
            if (!exprEquals(e1.expr, e2.expr)) return false;
            if (e1.cases.length !== e2.cases.length) return false;

            for (let i = 0; i < e1.cases.length; i++) {
                const case1 = e1.cases[i];
                const case2 = e2.cases[i];
                if (!case1 || !case2) return false;
                if (!matchCaseEquals(case1, case2)) return false;
            }

            return true;

        case "CoreRecord":
            if (e2.kind !== "CoreRecord") return false;
            if (e1.fields.length !== e2.fields.length) return false;

            for (let i = 0; i < e1.fields.length; i++) {
                const f1 = e1.fields[i];
                const f2 = e2.fields[i];
                if (!f1 || !f2) return false;
                if (f1.kind !== f2.kind) return false;
                if (f1.kind === "Field" && f2.kind === "Field") {
                    if (f1.name !== f2.name) return false;
                    if (!exprEquals(f1.value, f2.value)) return false;
                } else if (f1.kind === "Spread" && f2.kind === "Spread") {
                    if (!exprEquals(f1.expr, f2.expr)) return false;
                }
            }

            return true;

        case "CoreRecordAccess":
            return e2.kind === "CoreRecordAccess" && exprEquals(e1.record, e2.record) && e1.field === e2.field;

        case "CoreRecordUpdate":
            if (e2.kind !== "CoreRecordUpdate") return false;
            if (!exprEquals(e1.record, e2.record)) return false;
            if (e1.updates.length !== e2.updates.length) return false;

            for (let i = 0; i < e1.updates.length; i++) {
                const u1 = e1.updates[i];
                const u2 = e2.updates[i];
                if (!u1 || !u2) return false;
                if (u1.kind !== u2.kind) return false;
                if (u1.kind === "Field" && u2.kind === "Field") {
                    if (u1.name !== u2.name) return false;
                    if (!exprEquals(u1.value, u2.value)) return false;
                } else if (u1.kind === "Spread" && u2.kind === "Spread") {
                    if (!exprEquals(u1.expr, u2.expr)) return false;
                }
            }

            return true;

        case "CoreVariant":
            if (e2.kind !== "CoreVariant") return false;
            if (e1.constructor !== e2.constructor) return false;
            if (e1.args.length !== e2.args.length) return false;

            for (let i = 0; i < e1.args.length; i++) {
                const arg1 = e1.args[i];
                const arg2 = e2.args[i];
                if (!arg1 || !arg2) return false;
                if (!exprEquals(arg1, arg2)) return false;
            }

            return true;

        case "CoreBinOp":
            return (
                e2.kind === "CoreBinOp" &&
                e1.op === e2.op &&
                exprEquals(e1.left, e2.left) &&
                exprEquals(e1.right, e2.right)
            );

        case "CoreUnaryOp":
            return e2.kind === "CoreUnaryOp" && e1.op === e2.op && exprEquals(e1.expr, e2.expr);

        case "CoreTypeAnnotation":
            return e2.kind === "CoreTypeAnnotation" && exprEquals(e1.expr, e2.expr);

        case "CoreUnsafe":
            return e2.kind === "CoreUnsafe" && exprEquals(e1.expr, e2.expr);
    }
}

/**
 * Check if two patterns are structurally equal
 *
 * @param p1 - First pattern
 * @param p2 - Second pattern
 * @returns true if patterns are structurally identical
 */
function patternEquals(p1: CorePattern, p2: CorePattern): boolean {
    if (p1.kind !== p2.kind) {
        return false;
    }

    switch (p1.kind) {
        case "CoreWildcardPattern":
            return p2.kind === "CoreWildcardPattern";

        case "CoreVarPattern":
            return p2.kind === "CoreVarPattern" && p1.name === p2.name;

        case "CoreLiteralPattern":
            return p2.kind === "CoreLiteralPattern" && p1.literal === p2.literal;

        case "CoreVariantPattern":
            if (p2.kind !== "CoreVariantPattern") return false;
            if (p1.constructor !== p2.constructor) return false;
            if (p1.args.length !== p2.args.length) return false;

            for (let i = 0; i < p1.args.length; i++) {
                const arg1 = p1.args[i];
                const arg2 = p2.args[i];
                if (!arg1 || !arg2) return false;
                if (!patternEquals(arg1, arg2)) return false;
            }

            return true;

        case "CoreRecordPattern":
            if (p2.kind !== "CoreRecordPattern") return false;
            if (p1.fields.length !== p2.fields.length) return false;

            for (let i = 0; i < p1.fields.length; i++) {
                const f1 = p1.fields[i];
                const f2 = p2.fields[i];
                if (!f1 || !f2) return false;
                if (f1.name !== f2.name) return false;
                if (!patternEquals(f1.pattern, f2.pattern)) return false;
            }

            return true;
    }
}

/**
 * Check if two match cases are structurally equal
 *
 * @param c1 - First match case
 * @param c2 - Second match case
 * @returns true if match cases are structurally identical
 */
function matchCaseEquals(c1: CoreMatchCase, c2: CoreMatchCase): boolean {
    const guardEqual =
        (c1.guard === undefined && c2.guard === undefined) ||
        (c1.guard !== undefined && c2.guard !== undefined && exprEquals(c1.guard, c2.guard));

    return patternEquals(c1.pattern, c2.pattern) && guardEqual && exprEquals(c1.body, c2.body);
}

/**
 * Semantic equivalence check (more permissive than structural equality)
 *
 * Currently delegates to exprEquals, but could be extended to handle:
 * - Commutativity (a + b == b + a)
 * - Associativity
 * - Alpha equivalence (different variable names but same structure)
 *
 * @param e1 - First expression
 * @param e2 - Second expression
 * @returns true if expressions are semantically equivalent
 */
export function exprEquivalent(e1: CoreExpr, e2: CoreExpr): boolean {
    // For now, semantic equivalence is the same as structural equality
    // Future enhancement: could add more sophisticated equivalence checking
    return exprEquals(e1, e2);
}
