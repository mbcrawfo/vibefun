/**
 * Tests for AST analysis utilities
 */

import type { CoreExpr } from "../types/core-ast.js";

import { describe, expect, it } from "vitest";

import { OptimizationLevel } from "../types/optimizer.js";
import {
    astSize,
    complexity,
    containsRef,
    containsUnsafe,
    countVarUses,
    freeVars,
    isMutuallyRecursive,
    isRecursive,
    isRefOperation,
    patternBoundVars,
    shouldInline,
} from "./ast-analysis.js";

const testLoc = { file: "test", line: 1, column: 1, offset: 0 };

describe("AST Analysis Utilities", () => {
    describe("freeVars", () => {
        it("should return empty set for literals", () => {
            const expr: CoreExpr = {
                kind: "CoreIntLit",
                value: 42,
                loc: testLoc,
            };

            expect(freeVars(expr)).toEqual(new Set());
        });

        it("should return variable name for simple variable", () => {
            const expr: CoreExpr = {
                kind: "CoreVar",
                name: "x",
                loc: testLoc,
            };

            expect(freeVars(expr)).toEqual(new Set(["x"]));
        });

        it("should collect free variables from binary operations", () => {
            const expr: CoreExpr = {
                kind: "CoreBinOp",
                op: "Add",
                left: { kind: "CoreVar", name: "x", loc: testLoc },
                right: { kind: "CoreVar", name: "y", loc: testLoc },
                loc: testLoc,
            };

            expect(freeVars(expr)).toEqual(new Set(["x", "y"]));
        });

        it("should handle let bindings correctly", () => {
            // let x = 1 in x + y
            const expr: CoreExpr = {
                kind: "CoreLet",
                pattern: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                value: { kind: "CoreIntLit", value: 1, loc: testLoc },
                body: {
                    kind: "CoreBinOp",
                    op: "Add",
                    left: { kind: "CoreVar", name: "x", loc: testLoc },
                    right: { kind: "CoreVar", name: "y", loc: testLoc },
                    loc: testLoc,
                },
                mutable: false,
                recursive: false,
                loc: testLoc,
            };

            // x is bound, y is free
            expect(freeVars(expr)).toEqual(new Set(["y"]));
        });

        it("should handle lambda bindings correctly", () => {
            // (x) => x + y
            const expr: CoreExpr = {
                kind: "CoreLambda",
                param: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                body: {
                    kind: "CoreBinOp",
                    op: "Add",
                    left: { kind: "CoreVar", name: "x", loc: testLoc },
                    right: { kind: "CoreVar", name: "y", loc: testLoc },
                    loc: testLoc,
                },
                loc: testLoc,
            };

            // x is bound by lambda param, y is free
            expect(freeVars(expr)).toEqual(new Set(["y"]));
        });

        it("should handle nested lambdas and shadowing", () => {
            // (x) => (x) => x
            const expr: CoreExpr = {
                kind: "CoreLambda",
                param: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                body: {
                    kind: "CoreLambda",
                    param: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                    body: { kind: "CoreVar", name: "x", loc: testLoc },
                    loc: testLoc,
                },
                loc: testLoc,
            };

            // All x's are bound (inner shadows outer)
            expect(freeVars(expr)).toEqual(new Set());
        });

        it("should handle mutually recursive let bindings", () => {
            // let rec f = g and g = f in f
            const expr: CoreExpr = {
                kind: "CoreLetRecExpr",
                bindings: [
                    {
                        pattern: { kind: "CoreVarPattern", name: "f", loc: testLoc },
                        value: { kind: "CoreVar", name: "g", loc: testLoc },
                        mutable: false,
                        loc: testLoc,
                    },
                    {
                        pattern: { kind: "CoreVarPattern", name: "g", loc: testLoc },
                        value: { kind: "CoreVar", name: "f", loc: testLoc },
                        mutable: false,
                        loc: testLoc,
                    },
                ],
                body: { kind: "CoreVar", name: "f", loc: testLoc },
                loc: testLoc,
            };

            // f and g are bound, no free variables
            expect(freeVars(expr)).toEqual(new Set());
        });
    });

    describe("patternBoundVars", () => {
        it("should return empty set for wildcard pattern", () => {
            const pattern = { kind: "CoreWildcardPattern" as const, loc: testLoc };
            expect(patternBoundVars(pattern)).toEqual(new Set());
        });

        it("should return variable name for var pattern", () => {
            const pattern = { kind: "CoreVarPattern" as const, name: "x", loc: testLoc };
            expect(patternBoundVars(pattern)).toEqual(new Set(["x"]));
        });

        it("should collect variables from variant pattern", () => {
            const pattern = {
                kind: "CoreVariantPattern" as const,
                constructor: "Some",
                args: [{ kind: "CoreVarPattern" as const, name: "x", loc: testLoc }],
                loc: testLoc,
            };

            expect(patternBoundVars(pattern)).toEqual(new Set(["x"]));
        });

        it("should collect variables from record pattern", () => {
            const pattern = {
                kind: "CoreRecordPattern" as const,
                fields: [
                    {
                        name: "x",
                        pattern: { kind: "CoreVarPattern" as const, name: "a", loc: testLoc },
                        loc: testLoc,
                    },
                    {
                        name: "y",
                        pattern: { kind: "CoreVarPattern" as const, name: "b", loc: testLoc },
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            };

            expect(patternBoundVars(pattern)).toEqual(new Set(["a", "b"]));
        });
    });

    describe("astSize", () => {
        it("should count single node for literal", () => {
            const expr: CoreExpr = { kind: "CoreIntLit", value: 42, loc: testLoc };
            expect(astSize(expr)).toBe(1);
        });

        it("should count all nodes in binary operation", () => {
            const expr: CoreExpr = {
                kind: "CoreBinOp",
                op: "Add",
                left: { kind: "CoreIntLit", value: 1, loc: testLoc },
                right: { kind: "CoreIntLit", value: 2, loc: testLoc },
                loc: testLoc,
            };

            expect(astSize(expr)).toBe(3); // BinOp + 2 IntLits
        });

        it("should count nested expressions", () => {
            // (1 + 2) * 3
            const expr: CoreExpr = {
                kind: "CoreBinOp",
                op: "Multiply",
                left: {
                    kind: "CoreBinOp",
                    op: "Add",
                    left: { kind: "CoreIntLit", value: 1, loc: testLoc },
                    right: { kind: "CoreIntLit", value: 2, loc: testLoc },
                    loc: testLoc,
                },
                right: { kind: "CoreIntLit", value: 3, loc: testLoc },
                loc: testLoc,
            };

            expect(astSize(expr)).toBe(5); // outer BinOp + inner BinOp + 3 IntLits
        });
    });

    describe("complexity", () => {
        it("should assign low complexity to literals", () => {
            const expr: CoreExpr = { kind: "CoreIntLit", value: 42, loc: testLoc };
            expect(complexity(expr)).toBe(1);
        });

        it("should assign higher complexity to operations", () => {
            const expr: CoreExpr = {
                kind: "CoreBinOp",
                op: "Add",
                left: { kind: "CoreIntLit", value: 1, loc: testLoc },
                right: { kind: "CoreIntLit", value: 2, loc: testLoc },
                loc: testLoc,
            };

            expect(complexity(expr)).toBeGreaterThan(3);
        });
    });

    describe("containsUnsafe", () => {
        it("should return false for safe expressions", () => {
            const expr: CoreExpr = {
                kind: "CoreBinOp",
                op: "Add",
                left: { kind: "CoreIntLit", value: 1, loc: testLoc },
                right: { kind: "CoreIntLit", value: 2, loc: testLoc },
                loc: testLoc,
            };

            expect(containsUnsafe(expr)).toBe(false);
        });

        it("should return true for unsafe block", () => {
            const expr: CoreExpr = {
                kind: "CoreUnsafe",
                expr: { kind: "CoreIntLit", value: 42, loc: testLoc },
                loc: testLoc,
            };

            expect(containsUnsafe(expr)).toBe(true);
        });

        it("should return true for nested unsafe blocks", () => {
            const expr: CoreExpr = {
                kind: "CoreLet",
                pattern: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                value: {
                    kind: "CoreUnsafe",
                    expr: { kind: "CoreIntLit", value: 42, loc: testLoc },
                    loc: testLoc,
                },
                body: { kind: "CoreVar", name: "x", loc: testLoc },
                mutable: false,
                recursive: false,
                loc: testLoc,
            };

            expect(containsUnsafe(expr)).toBe(true);
        });
    });

    describe("containsRef", () => {
        it("should return false for non-ref expressions", () => {
            const expr: CoreExpr = { kind: "CoreIntLit", value: 42, loc: testLoc };
            expect(containsRef(expr)).toBe(false);
        });

        it("should detect deref operations", () => {
            const expr: CoreExpr = {
                kind: "CoreUnaryOp",
                op: "Deref",
                expr: { kind: "CoreVar", name: "r", loc: testLoc },
                loc: testLoc,
            };

            expect(containsRef(expr)).toBe(true);
        });

        it("should detect ref assign operations", () => {
            const expr: CoreExpr = {
                kind: "CoreBinOp",
                op: "RefAssign",
                left: { kind: "CoreVar", name: "r", loc: testLoc },
                right: { kind: "CoreIntLit", value: 42, loc: testLoc },
                loc: testLoc,
            };

            expect(containsRef(expr)).toBe(true);
        });

        it("should detect ref variant constructor", () => {
            const expr: CoreExpr = {
                kind: "CoreVariant",
                constructor: "ref",
                args: [{ kind: "CoreIntLit", value: 42, loc: testLoc }],
                loc: testLoc,
            };

            expect(containsRef(expr)).toBe(true);
        });

        it("should detect ref function application", () => {
            const expr: CoreExpr = {
                kind: "CoreApp",
                func: { kind: "CoreVar", name: "ref", loc: testLoc },
                args: [{ kind: "CoreIntLit", value: 42, loc: testLoc }],
                loc: testLoc,
            };

            expect(containsRef(expr)).toBe(true);
        });
    });

    describe("isRefOperation", () => {
        it("should identify deref as ref operation", () => {
            const expr: CoreExpr = {
                kind: "CoreUnaryOp",
                op: "Deref",
                expr: { kind: "CoreVar", name: "r", loc: testLoc },
                loc: testLoc,
            };

            expect(isRefOperation(expr)).toBe(true);
        });

        it("should identify ref assign as ref operation", () => {
            const expr: CoreExpr = {
                kind: "CoreBinOp",
                op: "RefAssign",
                left: { kind: "CoreVar", name: "r", loc: testLoc },
                right: { kind: "CoreIntLit", value: 42, loc: testLoc },
                loc: testLoc,
            };

            expect(isRefOperation(expr)).toBe(true);
        });

        it("should not identify regular operations as ref operations", () => {
            const expr: CoreExpr = {
                kind: "CoreBinOp",
                op: "Add",
                left: { kind: "CoreIntLit", value: 1, loc: testLoc },
                right: { kind: "CoreIntLit", value: 2, loc: testLoc },
                loc: testLoc,
            };

            expect(isRefOperation(expr)).toBe(false);
        });
    });

    describe("isMutuallyRecursive", () => {
        it("should return false for non-let-rec expressions", () => {
            const expr: CoreExpr = { kind: "CoreIntLit", value: 42, loc: testLoc };
            expect(isMutuallyRecursive(expr)).toBe(false);
        });

        it("should return false for single let-rec binding", () => {
            const expr: CoreExpr = {
                kind: "CoreLetRecExpr",
                bindings: [
                    {
                        pattern: { kind: "CoreVarPattern", name: "f", loc: testLoc },
                        value: { kind: "CoreVar", name: "x", loc: testLoc },
                        mutable: false,
                        loc: testLoc,
                    },
                ],
                body: { kind: "CoreVar", name: "f", loc: testLoc },
                loc: testLoc,
            };

            expect(isMutuallyRecursive(expr)).toBe(false);
        });

        it("should return true for multiple let-rec bindings", () => {
            const expr: CoreExpr = {
                kind: "CoreLetRecExpr",
                bindings: [
                    {
                        pattern: { kind: "CoreVarPattern", name: "f", loc: testLoc },
                        value: { kind: "CoreVar", name: "g", loc: testLoc },
                        mutable: false,
                        loc: testLoc,
                    },
                    {
                        pattern: { kind: "CoreVarPattern", name: "g", loc: testLoc },
                        value: { kind: "CoreVar", name: "f", loc: testLoc },
                        mutable: false,
                        loc: testLoc,
                    },
                ],
                body: { kind: "CoreVar", name: "f", loc: testLoc },
                loc: testLoc,
            };

            expect(isMutuallyRecursive(expr)).toBe(true);
        });
    });

    describe("isRecursive", () => {
        it("should return false for non-recursive function", () => {
            const body: CoreExpr = { kind: "CoreIntLit", value: 42, loc: testLoc };
            expect(isRecursive("f", body)).toBe(false);
        });

        it("should return true for directly recursive function", () => {
            const body: CoreExpr = { kind: "CoreVar", name: "f", loc: testLoc };
            expect(isRecursive("f", body)).toBe(true);
        });

        it("should return true for recursive function in nested context", () => {
            const body: CoreExpr = {
                kind: "CoreApp",
                func: { kind: "CoreVar", name: "f", loc: testLoc },
                args: [{ kind: "CoreIntLit", value: 1, loc: testLoc }],
                loc: testLoc,
            };

            expect(isRecursive("f", body)).toBe(true);
        });
    });

    describe("shouldInline", () => {
        it("should never inline at O0", () => {
            const expr: CoreExpr = { kind: "CoreIntLit", value: 42, loc: testLoc };
            expect(shouldInline(expr, 1, OptimizationLevel.O0)).toBe(false);
        });

        it("should inline very small expressions at O1", () => {
            // 1 node
            const expr: CoreExpr = { kind: "CoreIntLit", value: 42, loc: testLoc };
            expect(shouldInline(expr, 10, OptimizationLevel.O1)).toBe(true);
        });

        it("should inline single-use expressions at O1", () => {
            // Even if larger, inline if used once
            const expr: CoreExpr = {
                kind: "CoreBinOp",
                op: "Add",
                left: { kind: "CoreIntLit", value: 1, loc: testLoc },
                right: { kind: "CoreIntLit", value: 2, loc: testLoc },
                loc: testLoc,
            };

            expect(shouldInline(expr, 1, OptimizationLevel.O1)).toBe(true);
        });

        it("should not inline expressions with unsafe blocks", () => {
            const expr: CoreExpr = {
                kind: "CoreUnsafe",
                expr: { kind: "CoreIntLit", value: 42, loc: testLoc },
                loc: testLoc,
            };

            expect(shouldInline(expr, 1, OptimizationLevel.O2)).toBe(false);
        });

        it("should not inline expressions with ref operations", () => {
            const expr: CoreExpr = {
                kind: "CoreUnaryOp",
                op: "Deref",
                expr: { kind: "CoreVar", name: "r", loc: testLoc },
                loc: testLoc,
            };

            expect(shouldInline(expr, 1, OptimizationLevel.O2)).toBe(false);
        });
    });

    describe("countVarUses", () => {
        it("should return 0 for expressions without the variable", () => {
            const expr: CoreExpr = { kind: "CoreIntLit", value: 42, loc: testLoc };
            expect(countVarUses("x", expr)).toBe(0);
        });

        it("should count single variable use", () => {
            const expr: CoreExpr = { kind: "CoreVar", name: "x", loc: testLoc };
            expect(countVarUses("x", expr)).toBe(1);
        });

        it("should count multiple uses", () => {
            const expr: CoreExpr = {
                kind: "CoreBinOp",
                op: "Add",
                left: { kind: "CoreVar", name: "x", loc: testLoc },
                right: { kind: "CoreVar", name: "x", loc: testLoc },
                loc: testLoc,
            };

            expect(countVarUses("x", expr)).toBe(2);
        });

        it("should not count different variables", () => {
            const expr: CoreExpr = {
                kind: "CoreBinOp",
                op: "Add",
                left: { kind: "CoreVar", name: "x", loc: testLoc },
                right: { kind: "CoreVar", name: "y", loc: testLoc },
                loc: testLoc,
            };

            expect(countVarUses("x", expr)).toBe(1);
        });
    });
});
