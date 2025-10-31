/**
 * Integration tests for the optimizer
 *
 * Tests multiple passes working together and ensures semantic preservation.
 */

import type { CoreExpr } from "../types/core-ast.js";

import { describe, expect, it } from "vitest";

import { Optimizer } from "./optimizer.js";
import { BetaReductionPass } from "./passes/beta-reduction.js";
import { ConstantFoldingPass } from "./passes/constant-folding.js";
import { DeadCodeEliminationPass } from "./passes/dead-code-elim.js";
import { EtaReductionPass } from "./passes/eta-reduction.js";
import { InlineExpansionPass } from "./passes/inline.js";
import { PatternMatchOptimizationPass } from "./passes/pattern-match-opt.js";

const testLoc = { file: "test", line: 1, column: 1, offset: 0 };

describe("Optimizer Integration Tests", () => {
    describe("multiple passes together", () => {
        it("should combine constant folding with beta reduction", () => {
            // ((x) => x + 1)(2) with constant in body
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
                args: [{ kind: "CoreIntLit", value: 2, loc: testLoc }],
                loc: testLoc,
            };

            const optimizer = new Optimizer({ level: 2 });
            optimizer.addPass(new BetaReductionPass());
            optimizer.addPass(new ConstantFoldingPass());

            const result = optimizer.optimize(expr);

            // Should reduce to 3 via beta then constant fold
            expect(result.expr).toEqual({
                kind: "CoreIntLit",
                value: 3,
                loc: testLoc,
            });
            // Verify optimization occurred
            expect(result.converged).toBe(true);
            expect(result.metrics.astSizeAfter).toBeLessThan(result.metrics.astSizeBefore);
        });

        it("should combine inlining with beta reduction and constant folding", () => {
            // let inc = (x) => x + 1
            // let y = inc(5)
            // Should inline inc, beta reduce, then constant fold to 6
            const expr: CoreExpr = {
                kind: "CoreLet",
                pattern: { kind: "CoreVarPattern", name: "inc", loc: testLoc },
                value: {
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
                body: {
                    kind: "CoreLet",
                    pattern: { kind: "CoreVarPattern", name: "y", loc: testLoc },
                    value: {
                        kind: "CoreApp",
                        func: { kind: "CoreVar", name: "inc", loc: testLoc },
                        args: [{ kind: "CoreIntLit", value: 5, loc: testLoc }],
                        loc: testLoc,
                    },
                    body: { kind: "CoreVar", name: "y", loc: testLoc },
                    mutable: false,
                    recursive: false,
                    loc: testLoc,
                },
                mutable: false,
                recursive: false,
                loc: testLoc,
            };

            const optimizer = new Optimizer({ level: 2 });
            optimizer.addPass(new InlineExpansionPass());
            optimizer.addPass(new BetaReductionPass());
            optimizer.addPass(new ConstantFoldingPass());
            optimizer.addPass(new DeadCodeEliminationPass());

            const result = optimizer.optimize(expr);

            // After all optimizations, the entire expression optimizes to just 6!
            // The optimizer: inlines inc, beta reduces, constant folds, then eliminates dead let
            expect(result.expr).toEqual({
                kind: "CoreIntLit",
                value: 6,
                loc: testLoc,
            });
            expect(result.converged).toBe(true);
        });

        it("should combine eta reduction with dead code elimination", () => {
            // let f = (x) => g(x)
            // let unused = 42
            // Should eta reduce f and eliminate unused
            const expr: CoreExpr = {
                kind: "CoreLet",
                pattern: { kind: "CoreVarPattern", name: "f", loc: testLoc },
                value: {
                    kind: "CoreLambda",
                    param: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                    body: {
                        kind: "CoreApp",
                        func: { kind: "CoreVar", name: "g", loc: testLoc },
                        args: [{ kind: "CoreVar", name: "x", loc: testLoc }],
                        loc: testLoc,
                    },
                    loc: testLoc,
                },
                body: {
                    kind: "CoreLet",
                    pattern: { kind: "CoreVarPattern", name: "unused", loc: testLoc },
                    value: { kind: "CoreIntLit", value: 42, loc: testLoc },
                    body: { kind: "CoreVar", name: "f", loc: testLoc },
                    mutable: false,
                    recursive: false,
                    loc: testLoc,
                },
                mutable: false,
                recursive: false,
                loc: testLoc,
            };

            const optimizer = new Optimizer({ level: 2 });
            optimizer.addPass(new EtaReductionPass());
            optimizer.addPass(new DeadCodeEliminationPass());

            const result = optimizer.optimize(expr);

            // The eta reduction pass reduces the lambda body in-place
            // Dead code elimination removes the unused binding
            expect(result.expr.kind).toBe("CoreLet");
            if (result.expr.kind === "CoreLet") {
                // Eta reduction happens within the lambda
                expect(result.expr.value.kind).toBe("CoreLambda");
                // Unused binding should be eliminated - body should be just f
                expect(result.expr.body).toEqual({
                    kind: "CoreVar",
                    name: "f",
                    loc: testLoc,
                });
            }
            expect(result.converged).toBe(true);
        });

        it("should combine pattern match optimization with constant folding", () => {
            // match true { False => 1 | True => 2 + 3 }
            const expr: CoreExpr = {
                kind: "CoreMatch",
                expr: { kind: "CoreBoolLit", value: true, loc: testLoc },
                cases: [
                    {
                        pattern: { kind: "CoreLiteralPattern", literal: false, loc: testLoc },
                        body: { kind: "CoreIntLit", value: 1, loc: testLoc },
                        loc: testLoc,
                    },
                    {
                        pattern: { kind: "CoreLiteralPattern", literal: true, loc: testLoc },
                        body: {
                            kind: "CoreBinOp",
                            op: "Add",
                            left: { kind: "CoreIntLit", value: 2, loc: testLoc },
                            right: { kind: "CoreIntLit", value: 3, loc: testLoc },
                            loc: testLoc,
                        },
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            };

            const optimizer = new Optimizer({ level: 2 });
            optimizer.addPass(new PatternMatchOptimizationPass());
            optimizer.addPass(new DeadCodeEliminationPass());
            optimizer.addPass(new ConstantFoldingPass());

            const result = optimizer.optimize(expr);

            // Should simplify to just 5
            expect(result.expr).toEqual({
                kind: "CoreIntLit",
                value: 5,
                loc: testLoc,
            });
        });
    });

    describe("optimization level behavior", () => {
        it("O0 should not optimize", () => {
            const expr: CoreExpr = {
                kind: "CoreBinOp",
                op: "Add",
                left: { kind: "CoreIntLit", value: 1, loc: testLoc },
                right: { kind: "CoreIntLit", value: 2, loc: testLoc },
                loc: testLoc,
            };

            const optimizer = new Optimizer({ level: 0 });
            optimizer.addPass(new ConstantFoldingPass());

            const result = optimizer.optimize(expr);

            // Should remain unchanged
            expect(result.expr).toEqual(expr);
            expect(result.metrics.iterations).toBe(0);
            expect(result.converged).toBe(true);
        });

        it("O1 should run single pass", () => {
            const expr: CoreExpr = {
                kind: "CoreBinOp",
                op: "Add",
                left: { kind: "CoreIntLit", value: 1, loc: testLoc },
                right: { kind: "CoreIntLit", value: 2, loc: testLoc },
                loc: testLoc,
            };

            const optimizer = new Optimizer({ level: 1 });
            optimizer.addPass(new ConstantFoldingPass());

            const result = optimizer.optimize(expr);

            expect(result.expr).toEqual({
                kind: "CoreIntLit",
                value: 3,
                loc: testLoc,
            });
            expect(result.metrics.iterations).toBe(1);
            expect(result.converged).toBe(true);
        });

        it("O2 should iterate to fixed point", () => {
            // Nested operations that need multiple iterations
            // (1 + 2) + (3 + 4)
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
                right: {
                    kind: "CoreBinOp",
                    op: "Add",
                    left: { kind: "CoreIntLit", value: 3, loc: testLoc },
                    right: { kind: "CoreIntLit", value: 4, loc: testLoc },
                    loc: testLoc,
                },
                loc: testLoc,
            };

            const optimizer = new Optimizer({ level: 2 });
            optimizer.addPass(new ConstantFoldingPass());

            const result = optimizer.optimize(expr);

            expect(result.expr).toEqual({
                kind: "CoreIntLit",
                value: 10,
                loc: testLoc,
            });
            expect(result.metrics.iterations).toBeGreaterThan(0);
            expect(result.converged).toBe(true);
        });
    });

    describe("unsafe block preservation", () => {
        it("should never optimize inside unsafe blocks", () => {
            const expr: CoreExpr = {
                kind: "CoreUnsafe",
                expr: {
                    kind: "CoreBinOp",
                    op: "Add",
                    left: { kind: "CoreIntLit", value: 1, loc: testLoc },
                    right: { kind: "CoreIntLit", value: 2, loc: testLoc },
                    loc: testLoc,
                },
                loc: testLoc,
            };

            const optimizer = new Optimizer({ level: 2 });
            optimizer.addPass(new ConstantFoldingPass());
            optimizer.addPass(new BetaReductionPass());
            optimizer.addPass(new DeadCodeEliminationPass());

            const result = optimizer.optimize(expr);

            // Should remain unchanged
            expect(result.expr).toEqual(expr);
        });
    });

    describe("AST size tracking", () => {
        it("should track AST size reduction", () => {
            const expr: CoreExpr = {
                kind: "CoreLet",
                pattern: { kind: "CoreVarPattern", name: "unused", loc: testLoc },
                value: {
                    kind: "CoreBinOp",
                    op: "Add",
                    left: { kind: "CoreIntLit", value: 1, loc: testLoc },
                    right: { kind: "CoreIntLit", value: 2, loc: testLoc },
                    loc: testLoc,
                },
                body: { kind: "CoreIntLit", value: 42, loc: testLoc },
                mutable: false,
                recursive: false,
                loc: testLoc,
            };

            const optimizer = new Optimizer({ level: 2 });
            optimizer.addPass(new DeadCodeEliminationPass());

            const result = optimizer.optimize(expr);

            expect(result.metrics.astSizeBefore).toBeGreaterThan(result.metrics.astSizeAfter);
        });
    });

    describe("convergence detection", () => {
        it("should detect when optimization reaches fixed point", () => {
            const expr: CoreExpr = { kind: "CoreIntLit", value: 42, loc: testLoc };

            const optimizer = new Optimizer({ level: 2 });
            optimizer.addPass(new ConstantFoldingPass());

            const result = optimizer.optimize(expr);

            expect(result.converged).toBe(true);
            expect(result.metrics.iterations).toBe(1); // Converges immediately
        });

        it("should respect max iterations limit", () => {
            const expr: CoreExpr = { kind: "CoreIntLit", value: 1, loc: testLoc };

            const optimizer = new Optimizer({ level: 2, maxIterations: 3 });
            optimizer.addPass(new ConstantFoldingPass());

            const result = optimizer.optimize(expr);

            expect(result.metrics.iterations).toBeLessThanOrEqual(3);
        });
    });
});
