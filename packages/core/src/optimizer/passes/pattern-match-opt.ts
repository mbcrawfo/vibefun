/**
 * Pattern Match Optimization Pass
 *
 * Optimizes pattern matching expressions by:
 * - Removing unreachable cases (after catch-all patterns without guards)
 * - Reordering cases for efficiency (when safe - no guards with side effects)
 * - Optimizing guard expressions
 *
 * IMPORTANT: Preserves evaluation order and side effects in guards.
 * Does NOT reorder patterns that have guards to avoid changing observable behavior.
 */

import type { CoreExpr, CoreMatchCase, CorePattern } from "../../types/core-ast.js";

import { OptimizationPass } from "../optimization-pass.js";

export class PatternMatchOptimizationPass extends OptimizationPass {
    readonly name = "PatternMatchOptimization";

    override canApply(expr: CoreExpr): boolean {
        return expr.kind === "CoreMatch" && expr.cases.length > 0;
    }

    override transform(expr: CoreExpr): CoreExpr {
        return this.optimizeMatch(expr);
    }

    /**
     * Optimize match expressions recursively
     */
    private optimizeMatch(expr: CoreExpr): CoreExpr {
        switch (expr.kind) {
            // Literals and variables - no optimization
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
                    value: this.optimizeMatch(expr.value),
                    body: this.optimizeMatch(expr.body),
                };

            // Let rec
            case "CoreLetRecExpr":
                return {
                    ...expr,
                    bindings: expr.bindings.map((binding) => ({
                        ...binding,
                        value: this.optimizeMatch(binding.value),
                    })),
                    body: this.optimizeMatch(expr.body),
                };

            // Lambda
            case "CoreLambda":
                return {
                    ...expr,
                    body: this.optimizeMatch(expr.body),
                };

            // Application
            case "CoreApp":
                return {
                    ...expr,
                    func: this.optimizeMatch(expr.func),
                    args: expr.args.map((arg) => this.optimizeMatch(arg)),
                };

            // Match - this is where the optimization happens
            case "CoreMatch": {
                const optimizedExpr = this.optimizeMatch(expr.expr);
                const optimizedCases = this.optimizeCases(expr.cases);

                return {
                    ...expr,
                    expr: optimizedExpr,
                    cases: optimizedCases,
                };
            }

            // Record
            case "CoreRecord":
                return {
                    ...expr,
                    fields: expr.fields.map((field) => {
                        if (field.kind === "Field") {
                            return {
                                ...field,
                                value: this.optimizeMatch(field.value),
                            };
                        } else {
                            return {
                                ...field,
                                expr: this.optimizeMatch(field.expr),
                            };
                        }
                    }),
                };

            // Record access
            case "CoreRecordAccess":
                return {
                    ...expr,
                    record: this.optimizeMatch(expr.record),
                };

            // Record update
            case "CoreRecordUpdate":
                return {
                    ...expr,
                    record: this.optimizeMatch(expr.record),
                    updates: expr.updates.map((update) => {
                        if (update.kind === "Field") {
                            return {
                                ...update,
                                value: this.optimizeMatch(update.value),
                            };
                        } else {
                            return {
                                ...update,
                                expr: this.optimizeMatch(update.expr),
                            };
                        }
                    }),
                };

            // Variant
            case "CoreVariant":
                return {
                    ...expr,
                    args: expr.args.map((arg) => this.optimizeMatch(arg)),
                };

            // Binary operation
            case "CoreBinOp":
                return {
                    ...expr,
                    left: this.optimizeMatch(expr.left),
                    right: this.optimizeMatch(expr.right),
                };

            // Unary operation
            case "CoreUnaryOp":
                return {
                    ...expr,
                    expr: this.optimizeMatch(expr.expr),
                };

            // Type annotation
            case "CoreTypeAnnotation":
                return {
                    ...expr,
                    expr: this.optimizeMatch(expr.expr),
                };

            // Unsafe block - don't optimize inside
            case "CoreUnsafe":
                return expr;
        }
    }

    /**
     * Optimize a list of match cases
     */
    private optimizeCases(cases: CoreMatchCase[]): CoreMatchCase[] {
        // First, optimize each case's guard and body
        const optimizedCases = cases.map((c) => {
            const optimizedCase: CoreMatchCase = {
                pattern: c.pattern,
                body: this.optimizeMatch(c.body),
                loc: c.loc,
            };
            if (c.guard !== undefined) {
                optimizedCase.guard = this.optimizeMatch(c.guard);
            }
            return optimizedCase;
        });

        // Reorder cases for efficiency FIRST (only when safe - no guards)
        // This ensures catch-all patterns end up at the end
        const reorderedCases = this.reorderCases(optimizedCases);

        // Then remove unreachable cases (after catch-all without guard)
        const reachableCases = this.removeUnreachableCases(reorderedCases);

        return reachableCases;
    }

    /**
     * Remove cases that are unreachable after a catch-all pattern without a guard
     */
    private removeUnreachableCases(cases: CoreMatchCase[]): CoreMatchCase[] {
        const result: CoreMatchCase[] = [];

        for (const c of cases) {
            result.push(c);

            // If this is a catch-all pattern without a guard, all following cases are unreachable
            if (this.isCatchAll(c.pattern) && !c.guard) {
                break;
            }
        }

        return result;
    }

    /**
     * Check if a pattern is a catch-all (matches everything)
     */
    private isCatchAll(pattern: CorePattern): boolean {
        // Wildcard and variable patterns are catch-all
        return pattern.kind === "CoreWildcardPattern" || pattern.kind === "CoreVarPattern";
    }

    /**
     * Reorder cases for efficiency when safe
     *
     * Safe reordering rules:
     * - Only reorder cases without guards (guards may have side effects)
     * - Literals before variables/wildcards
     * - Constructors before variables/wildcards
     *
     * This creates a more efficient decision tree.
     */
    private reorderCases(cases: CoreMatchCase[]): CoreMatchCase[] {
        // Find the first case with a guard
        const firstGuardIndex = cases.findIndex((c) => c.guard !== undefined);

        // If there are any guards, don't reorder to preserve evaluation order
        if (firstGuardIndex !== -1) {
            return cases;
        }

        // No guards - safe to reorder
        // Sort by pattern specificity: literals, then variants, then catch-all
        const sorted = [...cases].sort((a, b) => {
            const priorityA = this.getPatternPriority(a.pattern);
            const priorityB = this.getPatternPriority(b.pattern);
            return priorityA - priorityB;
        });

        return sorted;
    }

    /**
     * Get pattern priority for sorting (lower = higher priority)
     */
    private getPatternPriority(pattern: CorePattern): number {
        switch (pattern.kind) {
            case "CoreLiteralPattern":
                return 1; // Literals first (most specific)
            case "CoreVariantPattern":
                return 2; // Variants second
            case "CoreRecordPattern":
                return 3; // Records third
            case "CoreVarPattern":
                return 4; // Variables second-to-last
            case "CoreWildcardPattern":
                return 5; // Wildcards last (catch-all)
        }
    }
}
