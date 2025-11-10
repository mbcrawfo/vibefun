/**
 * Substitution Utilities
 *
 * Provides capture-avoiding substitution for Core AST expressions.
 * This is critical for beta reduction and other transformations.
 */

import type { CoreExpr, CoreMatchCase, CorePattern } from "../types/core-ast.js";

import { freeVars, patternBoundVars } from "./ast-analysis.js";

/**
 * Perform capture-avoiding substitution: expr[varName := replacement]
 *
 * Replaces all free occurrences of varName in expr with replacement,
 * being careful to avoid variable capture.
 *
 * @param expr - The expression to substitute into
 * @param varName - The variable name to replace
 * @param replacement - The expression to substitute
 * @returns The expression with substitution applied
 */
export function substitute(expr: CoreExpr, varName: string, replacement: CoreExpr): CoreExpr {
    return substituteMultiple(expr, new Map([[varName, replacement]]));
}

/**
 * Perform multiple simultaneous substitutions
 *
 * @param expr - The expression to substitute into
 * @param bindings - Map of variable names to replacement expressions
 * @returns The expression with all substitutions applied
 */
export function substituteMultiple(expr: CoreExpr, bindings: Map<string, CoreExpr>): CoreExpr {
    if (bindings.size === 0) {
        return expr;
    }

    // Compute free variables in all replacement expressions
    const freeInReplacements = new Set<string>();
    bindings.forEach((repl) => {
        freeVars(repl).forEach((v) => freeInReplacements.add(v));
    });

    function substExpr(e: CoreExpr): CoreExpr {
        switch (e.kind) {
            case "CoreIntLit":
            case "CoreFloatLit":
            case "CoreStringLit":
            case "CoreBoolLit":
            case "CoreUnitLit":
                return e;

            case "CoreVar": {
                const replacement = bindings.get(e.name);
                return replacement ? replacement : e;
            }

            case "CoreLet": {
                // Substitute in value first
                const newValue = substExpr(e.value);

                // Check if pattern shadows any of our substitution variables
                const boundByPattern = patternBoundVars(e.pattern);
                const shadowedVars = new Set<string>();
                boundByPattern.forEach((v) => {
                    if (bindings.has(v)) {
                        shadowedVars.add(v);
                    }
                });

                // Check for capture: do bound variables conflict with free vars in replacements?
                const captureRisk = new Set<string>();
                boundByPattern.forEach((v) => {
                    if (freeInReplacements.has(v)) {
                        captureRisk.add(v);
                    }
                });

                // If there's capture risk, we need to rename the bound variables
                if (captureRisk.size > 0) {
                    const avoidSet = new Set([...freeInReplacements, ...freeVars(e.body), ...bindings.keys()]);
                    const { pattern: newPattern, renaming } = renamePatternVars(e.pattern, avoidSet);

                    // Apply renaming to body, then substitute
                    const renamedBody = substituteMultiple(e.body, renaming);
                    const newBody = substExpr(renamedBody);

                    return {
                        ...e,
                        pattern: newPattern,
                        value: newValue,
                        body: newBody,
                    };
                }

                // No capture risk, but might have shadowing
                if (shadowedVars.size > 0) {
                    // Remove shadowed variables from bindings for body
                    const bodyBindings = new Map(bindings);
                    shadowedVars.forEach((v) => bodyBindings.delete(v));
                    const newBody = substituteMultiple(e.body, bodyBindings);

                    return {
                        ...e,
                        value: newValue,
                        body: newBody,
                    };
                }

                // No shadowing or capture - proceed normally
                const newBody = substExpr(e.body);
                return {
                    ...e,
                    value: newValue,
                    body: newBody,
                };
            }

            case "CoreLetRecExpr": {
                // All bindings are mutually recursive
                const allBoundVars = new Set<string>();
                e.bindings.forEach((binding) => {
                    patternBoundVars(binding.pattern).forEach((v) => allBoundVars.add(v));
                });

                // Check shadowing and capture
                const shadowedVars = new Set<string>();
                allBoundVars.forEach((v) => {
                    if (bindings.has(v)) {
                        shadowedVars.add(v);
                    }
                });

                const captureRisk = new Set<string>();
                allBoundVars.forEach((v) => {
                    if (freeInReplacements.has(v)) {
                        captureRisk.add(v);
                    }
                });

                // If capture risk, rename all bound variables
                if (captureRisk.size > 0) {
                    const avoidSet = new Set([...freeInReplacements, ...freeVars(e.body), ...bindings.keys()]);

                    const renamings = new Map<string, CoreExpr>();
                    const newBindings = e.bindings.map((binding) => {
                        const { pattern: newPattern, renaming } = renamePatternVars(binding.pattern, avoidSet);
                        renaming.forEach((v, k) => renamings.set(k, v));
                        return {
                            ...binding,
                            pattern: newPattern,
                        };
                    });

                    // Apply renaming to all values and body, then substitute
                    const renamedBindings = newBindings.map((binding) => ({
                        ...binding,
                        value: substituteMultiple(substituteMultiple(binding.value, renamings), bindings),
                    }));

                    const renamedBody = substituteMultiple(e.body, renamings);
                    const newBody = substExpr(renamedBody);

                    return {
                        ...e,
                        bindings: renamedBindings,
                        body: newBody,
                    };
                }

                // Handle shadowing
                const bodyBindings = new Map(bindings);
                shadowedVars.forEach((v) => bodyBindings.delete(v));

                const newBindings = e.bindings.map((binding) => ({
                    ...binding,
                    value: substituteMultiple(binding.value, bodyBindings),
                }));

                const newBody = substituteMultiple(e.body, bodyBindings);

                return {
                    ...e,
                    bindings: newBindings,
                    body: newBody,
                };
            }

            case "CoreLambda": {
                const boundByParam = patternBoundVars(e.param);
                const shadowedVars = new Set<string>();
                boundByParam.forEach((v) => {
                    if (bindings.has(v)) {
                        shadowedVars.add(v);
                    }
                });

                const captureRisk = new Set<string>();
                boundByParam.forEach((v) => {
                    if (freeInReplacements.has(v)) {
                        captureRisk.add(v);
                    }
                });

                if (captureRisk.size > 0) {
                    const avoidSet = new Set([...freeInReplacements, ...freeVars(e.body), ...bindings.keys()]);
                    const { pattern: newParam, renaming } = renamePatternVars(e.param, avoidSet);

                    const renamedBody = substituteMultiple(e.body, renaming);
                    const newBody = substExpr(renamedBody);

                    return {
                        ...e,
                        param: newParam,
                        body: newBody,
                    };
                }

                if (shadowedVars.size > 0) {
                    const bodyBindings = new Map(bindings);
                    shadowedVars.forEach((v) => bodyBindings.delete(v));
                    const newBody = substituteMultiple(e.body, bodyBindings);

                    return {
                        ...e,
                        body: newBody,
                    };
                }

                const newBody = substExpr(e.body);
                return {
                    ...e,
                    body: newBody,
                };
            }

            case "CoreApp":
                return {
                    ...e,
                    func: substExpr(e.func),
                    args: e.args.map(substExpr),
                };

            case "CoreMatch": {
                const newExpr = substExpr(e.expr);
                const newCases = e.cases.map((c) => {
                    const boundByPattern = patternBoundVars(c.pattern);
                    const shadowedVars = new Set<string>();
                    boundByPattern.forEach((v) => {
                        if (bindings.has(v)) {
                            shadowedVars.add(v);
                        }
                    });

                    const captureRisk = new Set<string>();
                    boundByPattern.forEach((v) => {
                        if (freeInReplacements.has(v)) {
                            captureRisk.add(v);
                        }
                    });

                    if (captureRisk.size > 0) {
                        const avoidSet = new Set([
                            ...freeInReplacements,
                            ...freeVars(c.body),
                            ...(c.guard ? freeVars(c.guard) : []),
                            ...bindings.keys(),
                        ]);
                        const { pattern: newPattern, renaming } = renamePatternVars(c.pattern, avoidSet);

                        const renamedGuard = c.guard ? substituteMultiple(c.guard, renaming) : undefined;
                        const renamedBody = substituteMultiple(c.body, renaming);

                        const transformedCase: CoreMatchCase = {
                            pattern: newPattern,
                            body: substExpr(renamedBody),
                            loc: c.loc,
                        };

                        if (renamedGuard !== undefined) {
                            transformedCase.guard = substExpr(renamedGuard);
                        }

                        return transformedCase;
                    }

                    const caseBindings = new Map(bindings);
                    shadowedVars.forEach((v) => caseBindings.delete(v));

                    const transformedCase: CoreMatchCase = {
                        pattern: c.pattern,
                        body: substituteMultiple(c.body, caseBindings),
                        loc: c.loc,
                    };

                    if (c.guard !== undefined) {
                        transformedCase.guard = substituteMultiple(c.guard, caseBindings);
                    }

                    return transformedCase;
                });

                return {
                    ...e,
                    expr: newExpr,
                    cases: newCases,
                };
            }

            case "CoreRecord":
                return {
                    ...e,
                    fields: e.fields.map((field) => {
                        if (field.kind === "Field") {
                            return {
                                ...field,
                                value: substExpr(field.value),
                            };
                        } else {
                            return {
                                ...field,
                                expr: substExpr(field.expr),
                            };
                        }
                    }),
                };

            case "CoreRecordAccess":
                return {
                    ...e,
                    record: substExpr(e.record),
                };

            case "CoreRecordUpdate":
                return {
                    ...e,
                    record: substExpr(e.record),
                    updates: e.updates.map((update) => {
                        if (update.kind === "Field") {
                            return {
                                ...update,
                                value: substExpr(update.value),
                            };
                        } else {
                            return {
                                ...update,
                                expr: substExpr(update.expr),
                            };
                        }
                    }),
                };

            case "CoreVariant":
                return {
                    ...e,
                    args: e.args.map(substExpr),
                };

            case "CoreBinOp":
                return {
                    ...e,
                    left: substExpr(e.left),
                    right: substExpr(e.right),
                };

            case "CoreUnaryOp":
                return {
                    ...e,
                    expr: substExpr(e.expr),
                };

            case "CoreTypeAnnotation":
                return {
                    ...e,
                    expr: substExpr(e.expr),
                };

            case "CoreUnsafe":
                return {
                    ...e,
                    expr: substExpr(e.expr),
                };

            case "CoreTuple":
                return {
                    ...e,
                    elements: e.elements.map(substExpr),
                };

            case "CoreWhile":
                return {
                    ...e,
                    condition: substExpr(e.condition),
                    body: substExpr(e.body),
                };
        }
    }

    return substExpr(expr);
}

/**
 * Generate a fresh variable name that doesn't conflict with the avoid set
 *
 * @param baseName - The base name to use
 * @param avoidSet - Set of names to avoid
 * @returns A fresh variable name
 */
export function freshen(baseName: string, avoidSet: Set<string>): string {
    if (!avoidSet.has(baseName)) {
        return baseName;
    }

    let counter = 1;
    let candidate = `${baseName}_${counter}`;
    while (avoidSet.has(candidate)) {
        counter++;
        candidate = `${baseName}_${counter}`;
    }

    return candidate;
}

/**
 * Rename all variables bound by a pattern to fresh names
 *
 * @param pattern - The pattern to rename
 * @param avoidSet - Set of names to avoid
 * @returns New pattern with renamed variables and a map of renamings
 */
function renamePatternVars(
    pattern: CorePattern,
    avoidSet: Set<string>,
): { pattern: CorePattern; renaming: Map<string, CoreExpr> } {
    const renaming = new Map<string, CoreExpr>();

    function renamePattern(p: CorePattern): CorePattern {
        switch (p.kind) {
            case "CoreWildcardPattern":
            case "CoreLiteralPattern":
                return p;

            case "CoreVarPattern": {
                const freshName = freshen(p.name, avoidSet);
                avoidSet.add(freshName); // Add to avoid set for subsequent variables

                if (freshName !== p.name) {
                    renaming.set(p.name, {
                        kind: "CoreVar",
                        name: freshName,
                        loc: p.loc,
                    });
                }

                return {
                    ...p,
                    name: freshName,
                };
            }

            case "CoreVariantPattern":
                return {
                    ...p,
                    args: p.args.map(renamePattern),
                };

            case "CoreRecordPattern":
                return {
                    ...p,
                    fields: p.fields.map((field) => ({
                        ...field,
                        pattern: renamePattern(field.pattern),
                    })),
                };

            case "CoreTuplePattern":
                return {
                    ...p,
                    elements: p.elements.map(renamePattern),
                };
        }
    }

    return {
        pattern: renamePattern(pattern),
        renaming,
    };
}
