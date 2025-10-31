/**
 * AST Analysis Utilities
 *
 * Provides analysis functions for Core AST including:
 * - Free variable analysis
 * - Bound variable analysis
 * - AST size computation
 * - Complexity estimation
 * - Purity analysis
 */

import type { CoreExpr, CorePattern } from "../types/core-ast.js";
import type { OptimizationLevel } from "../types/optimizer.js";

import { visitExpr } from "./ast-transform.js";

/**
 * Compute the set of free variables in an expression
 *
 * A variable is free if it's referenced but not bound in the expression
 *
 * @param expr - The expression to analyze
 * @returns Set of free variable names
 */
export function freeVars(expr: CoreExpr): Set<string> {
    const free = new Set<string>();
    const bound = new Set<string>();

    function analyzeExpr(e: CoreExpr, currentBound: Set<string>): void {
        switch (e.kind) {
            case "CoreIntLit":
            case "CoreFloatLit":
            case "CoreStringLit":
            case "CoreBoolLit":
            case "CoreUnitLit":
                return;

            case "CoreVar":
                if (!currentBound.has(e.name)) {
                    free.add(e.name);
                }
                return;

            case "CoreLet": {
                // Analyze value first (before pattern binds)
                analyzeExpr(e.value, currentBound);

                // Pattern introduces new bindings
                const newBound = new Set(currentBound);
                patternBoundVars(e.pattern).forEach((v) => newBound.add(v));

                // Analyze body with extended scope
                analyzeExpr(e.body, newBound);
                return;
            }

            case "CoreLetRecExpr": {
                // All bindings are mutually recursive - extend scope first
                const newBound = new Set(currentBound);
                e.bindings.forEach((binding) => {
                    patternBoundVars(binding.pattern).forEach((v) => newBound.add(v));
                });

                // Analyze all values and body with extended scope
                e.bindings.forEach((binding) => analyzeExpr(binding.value, newBound));
                analyzeExpr(e.body, newBound);
                return;
            }

            case "CoreLambda": {
                const newBound = new Set(currentBound);
                patternBoundVars(e.param).forEach((v) => newBound.add(v));
                analyzeExpr(e.body, newBound);
                return;
            }

            case "CoreApp":
                analyzeExpr(e.func, currentBound);
                e.args.forEach((arg) => analyzeExpr(arg, currentBound));
                return;

            case "CoreMatch":
                analyzeExpr(e.expr, currentBound);
                e.cases.forEach((c) => {
                    const newBound = new Set(currentBound);
                    patternBoundVars(c.pattern).forEach((v) => newBound.add(v));

                    if (c.guard) analyzeExpr(c.guard, newBound);
                    analyzeExpr(c.body, newBound);
                });
                return;

            case "CoreRecord":
                e.fields.forEach((field) => analyzeExpr(field.value, currentBound));
                return;

            case "CoreRecordAccess":
                analyzeExpr(e.record, currentBound);
                return;

            case "CoreRecordUpdate":
                analyzeExpr(e.record, currentBound);
                e.updates.forEach((update) => analyzeExpr(update.value, currentBound));
                return;

            case "CoreVariant":
                e.args.forEach((arg) => analyzeExpr(arg, currentBound));
                return;

            case "CoreBinOp":
                analyzeExpr(e.left, currentBound);
                analyzeExpr(e.right, currentBound);
                return;

            case "CoreUnaryOp":
                analyzeExpr(e.expr, currentBound);
                return;

            case "CoreTypeAnnotation":
                analyzeExpr(e.expr, currentBound);
                return;

            case "CoreUnsafe":
                analyzeExpr(e.expr, currentBound);
                return;
        }
    }

    analyzeExpr(expr, bound);
    return free;
}

/**
 * Get variables bound by a pattern
 *
 * @param pattern - The pattern to analyze
 * @returns Set of variable names bound by the pattern
 */
export function patternBoundVars(pattern: CorePattern): Set<string> {
    const vars = new Set<string>();

    function analyzePattern(p: CorePattern): void {
        switch (p.kind) {
            case "CoreWildcardPattern":
            case "CoreLiteralPattern":
                return;

            case "CoreVarPattern":
                vars.add(p.name);
                return;

            case "CoreVariantPattern":
                p.args.forEach(analyzePattern);
                return;

            case "CoreRecordPattern":
                p.fields.forEach((field) => analyzePattern(field.pattern));
                return;
        }
    }

    analyzePattern(pattern);
    return vars;
}

/**
 * Compute the size of an AST (total node count)
 *
 * @param expr - The expression to measure
 * @returns Number of nodes in the AST
 */
export function astSize(expr: CoreExpr): number {
    let size = 0;
    visitExpr(expr, () => {
        size++;
    });
    return size;
}

/**
 * Estimate the complexity of an expression
 *
 * Assigns weights to different node types:
 * - Literals, variables: 1
 * - Operations: 2
 * - Function calls: 3
 * - Lambdas, matches: 5
 *
 * @param expr - The expression to analyze
 * @returns Complexity score
 */
export function complexity(expr: CoreExpr): number {
    let score = 0;

    visitExpr(expr, (node) => {
        switch (node.kind) {
            case "CoreIntLit":
            case "CoreFloatLit":
            case "CoreStringLit":
            case "CoreBoolLit":
            case "CoreUnitLit":
            case "CoreVar":
                score += 1;
                break;

            case "CoreBinOp":
            case "CoreUnaryOp":
            case "CoreRecordAccess":
                score += 2;
                break;

            case "CoreApp":
            case "CoreVariant":
                score += 3;
                break;

            case "CoreLambda":
            case "CoreMatch":
            case "CoreLet":
            case "CoreLetRecExpr":
                score += 5;
                break;

            default:
                score += 2;
        }
    });

    return score;
}

/**
 * Check if an expression contains unsafe blocks
 *
 * @param expr - The expression to check
 * @returns true if the expression contains unsafe blocks
 */
export function containsUnsafe(expr: CoreExpr): boolean {
    let hasUnsafe = false;

    visitExpr(expr, (node) => {
        if (node.kind === "CoreUnsafe") {
            hasUnsafe = true;
        }
    });

    return hasUnsafe;
}

/**
 * Check if an expression contains mutable reference operations
 *
 * Checks for:
 * - Deref operations (CoreUnaryOp with Deref)
 * - RefAssign operations (CoreBinOp with RefAssign)
 * - Ref creation (CoreVariant with "ref" constructor or CoreApp calling ref)
 *
 * @param expr - The expression to check
 * @returns true if the expression contains ref operations
 */
export function containsRef(expr: CoreExpr): boolean {
    let hasRef = false;

    visitExpr(expr, (node) => {
        switch (node.kind) {
            case "CoreUnaryOp":
                if (node.op === "Deref") {
                    hasRef = true;
                }
                break;

            case "CoreBinOp":
                if (node.op === "RefAssign") {
                    hasRef = true;
                }
                break;

            case "CoreVariant":
                // ref constructor (if used as variant)
                if (node.constructor.toLowerCase() === "ref") {
                    hasRef = true;
                }
                break;

            case "CoreApp":
                // ref function call
                if (node.func.kind === "CoreVar" && node.func.name.toLowerCase() === "ref") {
                    hasRef = true;
                }
                break;
        }
    });

    return hasRef;
}

/**
 * Check if an expression is a reference operation itself
 *
 * @param expr - The expression to check
 * @returns true if this is a ref, deref, or assign operation
 */
export function isRefOperation(expr: CoreExpr): boolean {
    switch (expr.kind) {
        case "CoreUnaryOp":
            return expr.op === "Deref";

        case "CoreBinOp":
            return expr.op === "RefAssign";

        case "CoreVariant":
            return expr.constructor.toLowerCase() === "ref";

        case "CoreApp":
            return expr.func.kind === "CoreVar" && expr.func.name.toLowerCase() === "ref";

        default:
            return false;
    }
}

/**
 * Check if a CoreLetRecExpr represents mutually recursive bindings
 *
 * @param expr - The let rec expression to check
 * @returns true if there are multiple bindings (mutual recursion)
 */
export function isMutuallyRecursive(expr: CoreExpr): boolean {
    return expr.kind === "CoreLetRecExpr" && expr.bindings.length > 1;
}

/**
 * Check if a variable is directly recursive (references itself in its body)
 *
 * @param varName - The variable name to check
 * @param body - The body expression
 * @returns true if the variable is recursive
 */
export function isRecursive(varName: string, body: CoreExpr): boolean {
    const freeVarsInBody = freeVars(body);
    return freeVarsInBody.has(varName);
}

/**
 * Determine if a function should be inlined based on cost heuristics
 *
 * @param expr - The function body to consider for inlining
 * @param useCount - Number of times the function is used
 * @param level - Optimization level
 * @returns true if the function should be inlined
 */
export function shouldInline(expr: CoreExpr, useCount: number, level: OptimizationLevel): boolean {
    // Never inline if contains unsafe blocks or ref operations
    if (containsUnsafe(expr) || containsRef(expr)) {
        return false;
    }

    const size = astSize(expr);

    // Optimization level thresholds
    switch (level) {
        case 0: // O0 - no inlining
            return false;

        case 1: // O1 - conservative inlining
            // Inline if very small (<= 5 nodes) OR used only once and small (<= 20 nodes)
            return size <= 5 || (useCount === 1 && size <= 20);

        case 2: // O2 - aggressive inlining
            // Inline if small (<= 50 nodes) OR used 1-2 times and reasonable size (<= 100 nodes)
            return size <= 50 || (useCount <= 2 && size <= 100);

        default:
            return false;
    }
}

/**
 * Count the number of times a variable is used in an expression
 *
 * @param varName - The variable name to count
 * @param expr - The expression to search
 * @returns Number of uses
 */
export function countVarUses(varName: string, expr: CoreExpr): number {
    let count = 0;

    visitExpr(expr, (node) => {
        if (node.kind === "CoreVar" && node.name === varName) {
            count++;
        }
    });

    return count;
}
