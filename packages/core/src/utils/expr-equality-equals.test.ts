/**
 * Tests for expression equality utilities
 */

import type { CoreExpr } from "../types/core-ast.js";

import * as fc from "fast-check";
import { describe, expect, it } from "vitest";

import { coreExprArb } from "../types/test-arbitraries/index.js";
import { exprEquals } from "./expr-equality.js";

const testLoc = { file: "test", line: 1, column: 1, offset: 0 };

describe("Expression Equality Utilities", () => {
    describe("exprEquals", () => {
        it("should return true for identical integer literals", () => {
            const e1: CoreExpr = { kind: "CoreIntLit", value: 42, loc: testLoc };
            const e2: CoreExpr = { kind: "CoreIntLit", value: 42, loc: testLoc };

            expect(exprEquals(e1, e2)).toBe(true);
        });

        it("should return false for different integer literals", () => {
            const e1: CoreExpr = { kind: "CoreIntLit", value: 42, loc: testLoc };
            const e2: CoreExpr = { kind: "CoreIntLit", value: 43, loc: testLoc };

            expect(exprEquals(e1, e2)).toBe(false);
        });

        it("should return true for identical variables", () => {
            const e1: CoreExpr = { kind: "CoreVar", name: "x", loc: testLoc };
            const e2: CoreExpr = { kind: "CoreVar", name: "x", loc: testLoc };

            expect(exprEquals(e1, e2)).toBe(true);
        });

        it("should return false for different variables", () => {
            const e1: CoreExpr = { kind: "CoreVar", name: "x", loc: testLoc };
            const e2: CoreExpr = { kind: "CoreVar", name: "y", loc: testLoc };

            expect(exprEquals(e1, e2)).toBe(false);
        });

        it("should return false for different expression kinds", () => {
            const e1: CoreExpr = { kind: "CoreIntLit", value: 42, loc: testLoc };
            const e2: CoreExpr = { kind: "CoreVar", name: "x", loc: testLoc };

            expect(exprEquals(e1, e2)).toBe(false);
        });

        it("should compare binary operations structurally", () => {
            const e1: CoreExpr = {
                kind: "CoreBinOp",
                op: "Add",
                left: { kind: "CoreIntLit", value: 1, loc: testLoc },
                right: { kind: "CoreIntLit", value: 2, loc: testLoc },
                loc: testLoc,
            };

            const e2: CoreExpr = {
                kind: "CoreBinOp",
                op: "Add",
                left: { kind: "CoreIntLit", value: 1, loc: testLoc },
                right: { kind: "CoreIntLit", value: 2, loc: testLoc },
                loc: testLoc,
            };

            expect(exprEquals(e1, e2)).toBe(true);
        });

        it("should detect different binary operators", () => {
            const e1: CoreExpr = {
                kind: "CoreBinOp",
                op: "Add",
                left: { kind: "CoreIntLit", value: 1, loc: testLoc },
                right: { kind: "CoreIntLit", value: 2, loc: testLoc },
                loc: testLoc,
            };

            const e2: CoreExpr = {
                kind: "CoreBinOp",
                op: "Multiply",
                left: { kind: "CoreIntLit", value: 1, loc: testLoc },
                right: { kind: "CoreIntLit", value: 2, loc: testLoc },
                loc: testLoc,
            };

            expect(exprEquals(e1, e2)).toBe(false);
        });

        it("should compare lambdas structurally", () => {
            const e1: CoreExpr = {
                kind: "CoreLambda",
                param: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                body: { kind: "CoreVar", name: "x", loc: testLoc },
                loc: testLoc,
            };

            const e2: CoreExpr = {
                kind: "CoreLambda",
                param: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                body: { kind: "CoreVar", name: "x", loc: testLoc },
                loc: testLoc,
            };

            expect(exprEquals(e1, e2)).toBe(true);
        });

        it("should detect different lambda parameters", () => {
            const e1: CoreExpr = {
                kind: "CoreLambda",
                param: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                body: { kind: "CoreVar", name: "x", loc: testLoc },
                loc: testLoc,
            };

            const e2: CoreExpr = {
                kind: "CoreLambda",
                param: { kind: "CoreVarPattern", name: "y", loc: testLoc },
                body: { kind: "CoreVar", name: "y", loc: testLoc },
                loc: testLoc,
            };

            expect(exprEquals(e1, e2)).toBe(false);
        });

        it("should compare let bindings", () => {
            const e1: CoreExpr = {
                kind: "CoreLet",
                pattern: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                value: { kind: "CoreIntLit", value: 1, loc: testLoc },
                body: { kind: "CoreVar", name: "x", loc: testLoc },
                mutable: false,
                loc: testLoc,
            };

            const e2: CoreExpr = {
                kind: "CoreLet",
                pattern: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                value: { kind: "CoreIntLit", value: 1, loc: testLoc },
                body: { kind: "CoreVar", name: "x", loc: testLoc },
                mutable: false,
                loc: testLoc,
            };

            expect(exprEquals(e1, e2)).toBe(true);
        });

        it("should detect different mutability flags", () => {
            const e1: CoreExpr = {
                kind: "CoreLet",
                pattern: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                value: { kind: "CoreIntLit", value: 1, loc: testLoc },
                body: { kind: "CoreVar", name: "x", loc: testLoc },
                mutable: false,
                loc: testLoc,
            };

            const e2: CoreExpr = {
                kind: "CoreLet",
                pattern: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                value: { kind: "CoreIntLit", value: 1, loc: testLoc },
                body: { kind: "CoreVar", name: "x", loc: testLoc },
                mutable: true, // Different!
                loc: testLoc,
            };

            expect(exprEquals(e1, e2)).toBe(false);
        });

        it("should compare function applications", () => {
            const e1: CoreExpr = {
                kind: "CoreApp",
                func: { kind: "CoreVar", name: "f", loc: testLoc },
                args: [
                    { kind: "CoreIntLit", value: 1, loc: testLoc },
                    { kind: "CoreIntLit", value: 2, loc: testLoc },
                ],
                loc: testLoc,
            };

            const e2: CoreExpr = {
                kind: "CoreApp",
                func: { kind: "CoreVar", name: "f", loc: testLoc },
                args: [
                    { kind: "CoreIntLit", value: 1, loc: testLoc },
                    { kind: "CoreIntLit", value: 2, loc: testLoc },
                ],
                loc: testLoc,
            };

            expect(exprEquals(e1, e2)).toBe(true);
        });

        it("should detect different number of arguments", () => {
            const e1: CoreExpr = {
                kind: "CoreApp",
                func: { kind: "CoreVar", name: "f", loc: testLoc },
                args: [{ kind: "CoreIntLit", value: 1, loc: testLoc }],
                loc: testLoc,
            };

            const e2: CoreExpr = {
                kind: "CoreApp",
                func: { kind: "CoreVar", name: "f", loc: testLoc },
                args: [
                    { kind: "CoreIntLit", value: 1, loc: testLoc },
                    { kind: "CoreIntLit", value: 2, loc: testLoc },
                ],
                loc: testLoc,
            };

            expect(exprEquals(e1, e2)).toBe(false);
        });

        it("should compare records", () => {
            const e1: CoreExpr = {
                kind: "CoreRecord",
                fields: [
                    {
                        kind: "Field",
                        name: "x",
                        value: { kind: "CoreIntLit", value: 1, loc: testLoc },
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            };

            const e2: CoreExpr = {
                kind: "CoreRecord",
                fields: [
                    {
                        kind: "Field",
                        name: "x",
                        value: { kind: "CoreIntLit", value: 1, loc: testLoc },
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            };

            expect(exprEquals(e1, e2)).toBe(true);
        });

        it("should detect different record field names", () => {
            const e1: CoreExpr = {
                kind: "CoreRecord",
                fields: [
                    {
                        kind: "Field",
                        name: "x",
                        value: { kind: "CoreIntLit", value: 1, loc: testLoc },
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            };

            const e2: CoreExpr = {
                kind: "CoreRecord",
                fields: [
                    {
                        kind: "Field",
                        name: "y", // Different!
                        value: { kind: "CoreIntLit", value: 1, loc: testLoc },
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            };

            expect(exprEquals(e1, e2)).toBe(false);
        });

        it("should compare match expressions", () => {
            const e1: CoreExpr = {
                kind: "CoreMatch",
                expr: { kind: "CoreVar", name: "x", loc: testLoc },
                cases: [
                    {
                        pattern: { kind: "CoreWildcardPattern", loc: testLoc },
                        body: { kind: "CoreIntLit", value: 1, loc: testLoc },
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            };

            const e2: CoreExpr = {
                kind: "CoreMatch",
                expr: { kind: "CoreVar", name: "x", loc: testLoc },
                cases: [
                    {
                        pattern: { kind: "CoreWildcardPattern", loc: testLoc },
                        body: { kind: "CoreIntLit", value: 1, loc: testLoc },
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            };

            expect(exprEquals(e1, e2)).toBe(true);
        });

        it("should handle guards in match cases", () => {
            const e1: CoreExpr = {
                kind: "CoreMatch",
                expr: { kind: "CoreVar", name: "x", loc: testLoc },
                cases: [
                    {
                        pattern: { kind: "CoreVarPattern", name: "n", loc: testLoc },
                        guard: {
                            kind: "CoreBinOp",
                            op: "GreaterThan",
                            left: { kind: "CoreVar", name: "n", loc: testLoc },
                            right: { kind: "CoreIntLit", value: 0, loc: testLoc },
                            loc: testLoc,
                        },
                        body: { kind: "CoreIntLit", value: 1, loc: testLoc },
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            };

            const e2: CoreExpr = {
                kind: "CoreMatch",
                expr: { kind: "CoreVar", name: "x", loc: testLoc },
                cases: [
                    {
                        pattern: { kind: "CoreVarPattern", name: "n", loc: testLoc },
                        guard: {
                            kind: "CoreBinOp",
                            op: "GreaterThan",
                            left: { kind: "CoreVar", name: "n", loc: testLoc },
                            right: { kind: "CoreIntLit", value: 0, loc: testLoc },
                            loc: testLoc,
                        },
                        body: { kind: "CoreIntLit", value: 1, loc: testLoc },
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            };

            expect(exprEquals(e1, e2)).toBe(true);
        });

        it("should detect different guards", () => {
            const e1: CoreExpr = {
                kind: "CoreMatch",
                expr: { kind: "CoreVar", name: "x", loc: testLoc },
                cases: [
                    {
                        pattern: { kind: "CoreVarPattern", name: "n", loc: testLoc },
                        guard: { kind: "CoreBoolLit", value: true, loc: testLoc },
                        body: { kind: "CoreIntLit", value: 1, loc: testLoc },
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            };

            const e2: CoreExpr = {
                kind: "CoreMatch",
                expr: { kind: "CoreVar", name: "x", loc: testLoc },
                cases: [
                    {
                        pattern: { kind: "CoreVarPattern", name: "n", loc: testLoc },
                        body: { kind: "CoreIntLit", value: 1, loc: testLoc },
                        loc: testLoc,
                        // No guard
                    },
                ],
                loc: testLoc,
            };

            expect(exprEquals(e1, e2)).toBe(false);
        });

        it("should compare nested expressions deeply", () => {
            // (1 + 2) * (3 + 4)
            const e1: CoreExpr = {
                kind: "CoreBinOp",
                op: "Multiply",
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

            const e2: CoreExpr = {
                kind: "CoreBinOp",
                op: "Multiply",
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

            expect(exprEquals(e1, e2)).toBe(true);
        });
    });

    describe("exprEquals algebraic properties", () => {
        // Reflexivity, symmetry, and transitivity are the three axioms an
        // equivalence relation must satisfy. exprEquals advertises itself as
        // structural equality, so all three must hold over arbitrary CoreExpr.

        it("property: reflexivity — exprEquals(e, e) is true", () => {
            fc.assert(
                fc.property(coreExprArb({ depth: 3 }), (e) => {
                    return exprEquals(e, e);
                }),
            );
        });

        it("property: symmetry — exprEquals(a, b) === exprEquals(b, a)", () => {
            fc.assert(
                fc.property(coreExprArb({ depth: 3 }), coreExprArb({ depth: 3 }), (a, b) => {
                    return exprEquals(a, b) === exprEquals(b, a);
                }),
            );
        });

        it("property: transitivity — three identical clones are pairwise equal", () => {
            // True transitivity (a==b ∧ b==c ⇒ a==c) is hard to produce
            // counterexamples for from independent generators because the odds
            // of two independently sampled exprs being equal are vanishingly
            // small. We instead test the structural-equality refinement:
            // generating one expression and structurally cloning it twice
            // gives three values that must all compare equal pairwise.
            fc.assert(
                fc.property(coreExprArb({ depth: 3 }), (e) => {
                    const a = e;
                    const b = JSON.parse(JSON.stringify(e)) as CoreExpr;
                    const c = JSON.parse(JSON.stringify(e)) as CoreExpr;
                    return exprEquals(a, b) && exprEquals(b, c) && exprEquals(a, c);
                }),
            );
        });

        it("property: structural equality survives JSON round-trip", () => {
            // Equality compares values, not references. A round-tripped clone
            // must compare equal to the original.
            fc.assert(
                fc.property(coreExprArb({ depth: 3 }), (e) => {
                    const clone = JSON.parse(JSON.stringify(e)) as CoreExpr;
                    return exprEquals(e, clone);
                }),
            );
        });
    });
});
