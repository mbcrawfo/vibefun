/**
 * Tests for Common Subexpression Elimination pass
 */

import type { CoreExpr } from "../../types/core-ast.js";

import * as fc from "fast-check";
import { describe, expect, it } from "vitest";

import { coreExprWithUnsafeArb, optimizableExprArb } from "../../types/test-arbitraries/index.js";
import { exprEquals } from "../../utils/expr-equality.js";
import { CommonSubexpressionEliminationPass } from "./cse.js";

const testLoc = { file: "test", line: 1, column: 1, offset: 0 };

describe("CommonSubexpressionEliminationPass", () => {
    const pass = new CommonSubexpressionEliminationPass();

    describe("canApply", () => {
        it("should return true for most expressions", () => {
            const expr: CoreExpr = {
                kind: "CoreBinOp",
                op: "Add",
                left: { kind: "CoreIntLit", value: 1, loc: testLoc },
                right: { kind: "CoreIntLit", value: 2, loc: testLoc },
                loc: testLoc,
            };

            expect(pass.canApply(expr)).toBe(true);
        });

        it("should return false for unsafe blocks", () => {
            const expr: CoreExpr = {
                kind: "CoreUnsafe",
                expr: { kind: "CoreIntLit", value: 42, loc: testLoc },
                loc: testLoc,
            };

            expect(pass.canApply(expr)).toBe(false);
        });
    });

    describe("transform", () => {
        it("should return expression unchanged (placeholder implementation)", () => {
            // Note: Full CSE implementation is complex and requires significant
            // infrastructure changes. This is a placeholder for future enhancement.
            const expr: CoreExpr = {
                kind: "CoreLet",
                pattern: { kind: "CoreVarPattern", name: "a", loc: testLoc },
                value: {
                    kind: "CoreBinOp",
                    op: "Add",
                    left: { kind: "CoreVar", name: "x", loc: testLoc },
                    right: { kind: "CoreVar", name: "y", loc: testLoc },
                    loc: testLoc,
                },
                body: {
                    kind: "CoreLet",
                    pattern: { kind: "CoreVarPattern", name: "b", loc: testLoc },
                    value: {
                        kind: "CoreBinOp",
                        op: "Add",
                        left: { kind: "CoreVar", name: "x", loc: testLoc },
                        right: { kind: "CoreVar", name: "y", loc: testLoc },
                        loc: testLoc,
                    },
                    body: {
                        kind: "CoreBinOp",
                        op: "Add",
                        left: { kind: "CoreVar", name: "a", loc: testLoc },
                        right: { kind: "CoreVar", name: "b", loc: testLoc },
                        loc: testLoc,
                    },
                    mutable: false,
                    loc: testLoc,
                },
                mutable: false,
                loc: testLoc,
            };

            const result = pass.transform(expr);

            // Currently returns expression unchanged
            expect(result).toEqual(expr);
        });

        it("should handle literals", () => {
            const expr: CoreExpr = { kind: "CoreIntLit", value: 42, loc: testLoc };
            const result = pass.transform(expr);
            expect(result).toEqual(expr);
        });

        it("should handle variables", () => {
            const expr: CoreExpr = { kind: "CoreVar", name: "x", loc: testLoc };
            const result = pass.transform(expr);
            expect(result).toEqual(expr);
        });
    });

    describe("Properties", () => {
        // CSE is currently a no-op placeholder. The interesting properties are
        // identity (transform(e) is structurally equal to e) and the no-throw
        // crash oracle. When CSE is implemented for real, these properties
        // become trivially weaker than what should hold of the implementation.

        it("property: cse.transform is the identity (current placeholder behavior)", () => {
            fc.assert(
                fc.property(optimizableExprArb({ depth: 3 }), (expr) => {
                    return exprEquals(pass.transform(expr), expr);
                }),
            );
        });

        it("property: cse.transform never throws on closed Core expressions", () => {
            fc.assert(
                fc.property(optimizableExprArb({ depth: 3 }), (expr) => {
                    expect(() => pass.transform(expr)).not.toThrow();
                }),
            );
        });

        // The next two are trivially true today (CSE is a no-op) — they
        // exist as forward-compatibility guards so when CSE is implemented
        // for real, regressions in idempotence or CoreUnsafe handling
        // surface immediately rather than during a later property review.
        it("property: cse.transform is idempotent", () => {
            fc.assert(
                fc.property(optimizableExprArb({ depth: 3 }), (expr) => {
                    const once = pass.transform(expr);
                    const twice = pass.transform(once);
                    return exprEquals(once, twice);
                }),
            );
        });

        it("property: cse preserves CoreUnsafe nodes", () => {
            fc.assert(
                fc.property(coreExprWithUnsafeArb({ depth: 2 }), (expr) => {
                    if (expr.kind !== "CoreUnsafe") return true;
                    return exprEquals(pass.transform(expr), expr);
                }),
            );
        });
    });
});
