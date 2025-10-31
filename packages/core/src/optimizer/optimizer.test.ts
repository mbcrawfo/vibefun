/**
 * Tests for Optimizer integration
 */

import type { CoreExpr } from "../types/core-ast.js";

import { describe, expect, it } from "vitest";

import { OptimizationLevel } from "../types/optimizer.js";
import { Optimizer } from "./optimizer.js";
import { BetaReductionPass } from "./passes/beta-reduction.js";
import { ConstantFoldingPass } from "./passes/constant-folding.js";

const testLoc = { file: "test", line: 1, column: 1, offset: 0 };

describe("Optimizer", () => {
    describe("Pass registration", () => {
        it("should register optimization passes", () => {
            const optimizer = new Optimizer({ level: OptimizationLevel.O1, maxIterations: 10 });

            optimizer.addPass(new ConstantFoldingPass());
            optimizer.addPass(new BetaReductionPass());

            expect(optimizer["passes"]).toHaveLength(2);
        });
    });

    describe("Optimization levels", () => {
        it("should not optimize at O0", () => {
            const optimizer = new Optimizer({ level: OptimizationLevel.O0, maxIterations: 10 });
            optimizer.addPass(new ConstantFoldingPass());

            const expr: CoreExpr = {
                kind: "CoreBinOp",
                op: "Add",
                left: { kind: "CoreIntLit", value: 2, loc: testLoc },
                right: { kind: "CoreIntLit", value: 3, loc: testLoc },
                loc: testLoc,
            };

            const result = optimizer.optimize(expr);

            expect(result.expr).toEqual(expr); // Unchanged at O0
            expect(result.metrics.iterations).toBe(0);
        });

        it("should optimize once at O1", () => {
            const optimizer = new Optimizer({ level: OptimizationLevel.O1, maxIterations: 10 });
            optimizer.addPass(new ConstantFoldingPass());

            const expr: CoreExpr = {
                kind: "CoreBinOp",
                op: "Add",
                left: { kind: "CoreIntLit", value: 2, loc: testLoc },
                right: { kind: "CoreIntLit", value: 3, loc: testLoc },
                loc: testLoc,
            };

            const result = optimizer.optimize(expr);

            expect(result.expr).toEqual({ kind: "CoreIntLit", value: 5, loc: testLoc });
            expect(result.metrics.iterations).toBe(1); // Single pass
        });

        it("should iterate until fixed point at O2", () => {
            const optimizer = new Optimizer({ level: OptimizationLevel.O2, maxIterations: 10 });
            optimizer.addPass(new ConstantFoldingPass());
            optimizer.addPass(new BetaReductionPass());

            // ((x) => x + 1)(2 + 3)
            // After beta reduction: (2 + 3) + 1
            // After constant folding: 5 + 1
            // After constant folding: 6
            const expr: CoreExpr = {
                kind: "CoreApp",
                func: {
                    kind: "CoreLambda",
                    param: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                    body: {
                        kind: "CoreBinOp",
                        op: "Add",
                        left: { kind: "CoreVar", name: "x", loc: testLoc },
                        right: { kind: "CoreIntLit", value: 1, loc: testLoc },
                        loc: testLoc,
                    },
                    loc: testLoc,
                },
                args: [
                    {
                        kind: "CoreBinOp",
                        op: "Add",
                        left: { kind: "CoreIntLit", value: 2, loc: testLoc },
                        right: { kind: "CoreIntLit", value: 3, loc: testLoc },
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            };

            const result = optimizer.optimize(expr);

            expect(result.expr).toEqual({ kind: "CoreIntLit", value: 6, loc: testLoc });
            expect(result.metrics.iterations).toBeGreaterThan(1); // Multiple iterations
        });

        it("should respect max iterations limit", () => {
            const optimizer = new Optimizer({ level: OptimizationLevel.O2, maxIterations: 1 });
            optimizer.addPass(new ConstantFoldingPass());

            // This would normally require 2 iterations to fully optimize
            const expr: CoreExpr = {
                kind: "CoreBinOp",
                op: "Add",
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

            const result = optimizer.optimize(expr);

            expect(result.metrics.iterations).toBe(1); // Limited to 1 iteration
        });
    });

    describe("Integration tests", () => {
        it("should combine constant folding and beta reduction", () => {
            const optimizer = new Optimizer({ level: OptimizationLevel.O2, maxIterations: 10 });
            optimizer.addPass(new ConstantFoldingPass());
            optimizer.addPass(new BetaReductionPass());

            // ((x) => x * 2)(3 + 4)
            // Step 1 (constant folding): ((x) => x * 2)(7)
            // Step 2 (beta reduction): 7 * 2
            // Step 3 (constant folding): 14
            const expr: CoreExpr = {
                kind: "CoreApp",
                func: {
                    kind: "CoreLambda",
                    param: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                    body: {
                        kind: "CoreBinOp",
                        op: "Multiply",
                        left: { kind: "CoreVar", name: "x", loc: testLoc },
                        right: { kind: "CoreIntLit", value: 2, loc: testLoc },
                        loc: testLoc,
                    },
                    loc: testLoc,
                },
                args: [
                    {
                        kind: "CoreBinOp",
                        op: "Add",
                        left: { kind: "CoreIntLit", value: 3, loc: testLoc },
                        right: { kind: "CoreIntLit", value: 4, loc: testLoc },
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            };

            const result = optimizer.optimize(expr);

            expect(result.expr).toEqual({ kind: "CoreIntLit", value: 14, loc: testLoc });
        });

        it("should optimize nested lambda applications", () => {
            const optimizer = new Optimizer({ level: OptimizationLevel.O2, maxIterations: 10 });
            optimizer.addPass(new BetaReductionPass());
            optimizer.addPass(new ConstantFoldingPass());

            // ((x) => ((y) => x + y)(2))(1)
            // Step 1: ((y) => 1 + y)(2)
            // Step 2: 1 + 2
            // Step 3: 3
            const expr: CoreExpr = {
                kind: "CoreApp",
                func: {
                    kind: "CoreLambda",
                    param: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                    body: {
                        kind: "CoreApp",
                        func: {
                            kind: "CoreLambda",
                            param: { kind: "CoreVarPattern", name: "y", loc: testLoc },
                            body: {
                                kind: "CoreBinOp",
                                op: "Add",
                                left: { kind: "CoreVar", name: "x", loc: testLoc },
                                right: { kind: "CoreVar", name: "y", loc: testLoc },
                                loc: testLoc,
                            },
                            loc: testLoc,
                        },
                        args: [{ kind: "CoreIntLit", value: 2, loc: testLoc }],
                        loc: testLoc,
                    },
                    loc: testLoc,
                },
                args: [{ kind: "CoreIntLit", value: 1, loc: testLoc }],
                loc: testLoc,
            };

            const result = optimizer.optimize(expr);

            expect(result.expr).toEqual({ kind: "CoreIntLit", value: 3, loc: testLoc });
        });

        it("should optimize complex expressions with let bindings", () => {
            const optimizer = new Optimizer({ level: OptimizationLevel.O2, maxIterations: 10 });
            optimizer.addPass(new ConstantFoldingPass());

            // let x = 2 + 3 in x * 4
            // After constant folding: let x = 5 in x * 4
            const expr: CoreExpr = {
                kind: "CoreLet",
                pattern: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                value: {
                    kind: "CoreBinOp",
                    op: "Add",
                    left: { kind: "CoreIntLit", value: 2, loc: testLoc },
                    right: { kind: "CoreIntLit", value: 3, loc: testLoc },
                    loc: testLoc,
                },
                body: {
                    kind: "CoreBinOp",
                    op: "Multiply",
                    left: { kind: "CoreVar", name: "x", loc: testLoc },
                    right: { kind: "CoreIntLit", value: 4, loc: testLoc },
                    loc: testLoc,
                },
                mutable: false,
                recursive: false,
                loc: testLoc,
            };

            const result = optimizer.optimize(expr);

            expect(result.expr.kind).toBe("CoreLet");
            if (result.expr.kind === "CoreLet") {
                expect(result.expr.value).toEqual({ kind: "CoreIntLit", value: 5, loc: testLoc });
            }
        });
    });

    describe("Metrics tracking", () => {
        it("should track optimization metrics", () => {
            const optimizer = new Optimizer({ level: OptimizationLevel.O2, maxIterations: 10 });
            optimizer.addPass(new ConstantFoldingPass());

            const expr: CoreExpr = {
                kind: "CoreBinOp",
                op: "Add",
                left: { kind: "CoreIntLit", value: 2, loc: testLoc },
                right: { kind: "CoreIntLit", value: 3, loc: testLoc },
                loc: testLoc,
            };

            const result = optimizer.optimize(expr);

            expect(result.metrics.iterations).toBeGreaterThan(0);
            expect(result.metrics.timeMs).toBeGreaterThanOrEqual(0);
            expect(result.metrics.astSizeBefore).toBeGreaterThan(0);
            expect(result.metrics.astSizeAfter).toBeGreaterThan(0);
        });

        it("should show reduced AST size after optimization", () => {
            const optimizer = new Optimizer({ level: OptimizationLevel.O2, maxIterations: 10 });
            optimizer.addPass(new ConstantFoldingPass());
            optimizer.addPass(new BetaReductionPass());

            // Large expression that simplifies to a constant
            const expr: CoreExpr = {
                kind: "CoreApp",
                func: {
                    kind: "CoreLambda",
                    param: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                    body: { kind: "CoreVar", name: "x", loc: testLoc },
                    loc: testLoc,
                },
                args: [
                    {
                        kind: "CoreBinOp",
                        op: "Add",
                        left: { kind: "CoreIntLit", value: 2, loc: testLoc },
                        right: { kind: "CoreIntLit", value: 3, loc: testLoc },
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            };

            const result = optimizer.optimize(expr);

            expect(result.metrics.astSizeAfter).toBeLessThan(result.metrics.astSizeBefore);
        });
    });

    describe("Edge cases", () => {
        it("should handle expressions that cannot be optimized", () => {
            const optimizer = new Optimizer({ level: OptimizationLevel.O2, maxIterations: 10 });
            optimizer.addPass(new ConstantFoldingPass());

            const expr: CoreExpr = { kind: "CoreVar", name: "x", loc: testLoc };

            const result = optimizer.optimize(expr);

            expect(result.expr).toEqual(expr); // Unchanged
            expect(result.metrics.iterations).toBe(1); // Still runs once
        });

        it("should handle empty pass list", () => {
            const optimizer = new Optimizer({ level: OptimizationLevel.O2, maxIterations: 10 });

            const expr: CoreExpr = {
                kind: "CoreBinOp",
                op: "Add",
                left: { kind: "CoreIntLit", value: 2, loc: testLoc },
                right: { kind: "CoreIntLit", value: 3, loc: testLoc },
                loc: testLoc,
            };

            const result = optimizer.optimize(expr);

            expect(result.expr).toEqual(expr); // No passes to apply
        });
    });
});
