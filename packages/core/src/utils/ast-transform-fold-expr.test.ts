/**
 * Tests for foldExpr — extracted from ast-transform.test.ts for size.
 */

import type { CoreExpr } from "../types/core-ast.js";

import * as fc from "fast-check";
import { describe, expect, it } from "vitest";

import { coreExprArb } from "../types/test-arbitraries/index.js";
import { foldExpr } from "./ast-transform.js";

describe("AST Transform Utilities", () => {
    describe("foldExpr", () => {
        it("should count nodes in an expression tree", () => {
            const expr: CoreExpr = {
                kind: "CoreBinOp",
                op: "Add",
                left: {
                    kind: "CoreIntLit",
                    value: 1,
                    loc: { file: "test", line: 1, column: 1, offset: 0 },
                },
                right: {
                    kind: "CoreIntLit",
                    value: 2,
                    loc: { file: "test", line: 1, column: 1, offset: 0 },
                },
                loc: { file: "test", line: 1, column: 1, offset: 0 },
            };

            const nodeCount = foldExpr(expr, (_, count) => count + 1, 0);
            expect(nodeCount).toBe(3); // BinOp + 2 IntLits
        });

        it("should collect all variable names", () => {
            const expr: CoreExpr = {
                kind: "CoreBinOp",
                op: "Add",
                left: {
                    kind: "CoreVar",
                    name: "x",
                    loc: { file: "test", line: 1, column: 1, offset: 0 },
                },
                right: {
                    kind: "CoreVar",
                    name: "y",
                    loc: { file: "test", line: 1, column: 1, offset: 0 },
                },
                loc: { file: "test", line: 1, column: 1, offset: 0 },
            };

            const varNames = foldExpr(
                expr,
                (node, names) => {
                    if (node.kind === "CoreVar") {
                        names.add(node.name);
                    }
                    return names;
                },
                new Set<string>(),
            );

            expect(varNames).toEqual(new Set(["x", "y"]));
        });
    });

    describe("foldExpr - additional cases", () => {
        const testLoc = { file: "test", line: 1, column: 1, offset: 0 };

        it("should sum all integer values in nested expressions", () => {
            // Use BinOp instead of Tuple since visitExpr doesn't handle Tuple
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

            const sum = foldExpr(
                expr,
                (node, acc) => {
                    if (node.kind === "CoreIntLit") {
                        return acc + node.value;
                    }
                    return acc;
                },
                0,
            );

            expect(sum).toBe(6);
        });

        it("should collect all expression kinds", () => {
            const expr: CoreExpr = {
                kind: "CoreLet",
                pattern: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                value: { kind: "CoreIntLit", value: 1, loc: testLoc },
                body: {
                    kind: "CoreBinOp",
                    op: "Add",
                    left: { kind: "CoreVar", name: "x", loc: testLoc },
                    right: { kind: "CoreIntLit", value: 2, loc: testLoc },
                    loc: testLoc,
                },
                mutable: false,
                loc: testLoc,
            };

            const kinds = foldExpr(
                expr,
                (node, acc) => {
                    acc.add(node.kind);
                    return acc;
                },
                new Set<string>(),
            );

            expect(kinds.has("CoreLet")).toBe(true);
            expect(kinds.has("CoreIntLit")).toBe(true);
            expect(kinds.has("CoreBinOp")).toBe(true);
            expect(kinds.has("CoreVar")).toBe(true);
        });

        it("should find maximum integer value", () => {
            // Use nested BinOp instead of Tuple since visitExpr doesn't handle Tuple
            const expr: CoreExpr = {
                kind: "CoreVariant",
                constructor: "Some",
                args: [
                    {
                        kind: "CoreBinOp",
                        op: "Add",
                        left: {
                            kind: "CoreBinOp",
                            op: "Add",
                            left: { kind: "CoreIntLit", value: 10, loc: testLoc },
                            right: { kind: "CoreIntLit", value: 50, loc: testLoc },
                            loc: testLoc,
                        },
                        right: { kind: "CoreIntLit", value: 30, loc: testLoc },
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            };

            const max = foldExpr(
                expr,
                (node, acc) => {
                    if (node.kind === "CoreIntLit") {
                        return Math.max(acc, node.value);
                    }
                    return acc;
                },
                -Infinity,
            );

            expect(max).toBe(50);
        });
    });

    describe("foldExpr algebraic properties", () => {
        // foldExpr is implemented on top of visitExpr, so any totality
        // property here is also a property of visitExpr.

        it("property: foldExpr is total — does not throw on any tier-A CoreExpr", () => {
            fc.assert(
                fc.property(coreExprArb({ depth: 3 }), (e) => {
                    foldExpr(e, (_, count) => count + 1, 0);
                    return true;
                }),
            );
        });

        it("property: counting yields ≥ 1 (root is always visited)", () => {
            fc.assert(
                fc.property(coreExprArb({ depth: 3 }), (e) => {
                    return foldExpr(e, (_, count) => count + 1, 0) >= 1;
                }),
            );
        });

        it("property: foldExpr with identity folder returns the initial value", () => {
            fc.assert(
                fc.property(coreExprArb({ depth: 3 }), fc.integer(), (e, init) => {
                    return foldExpr(e, (_, acc) => acc, init) === init;
                }),
            );
        });

        it("property: foldExpr is deterministic across calls", () => {
            fc.assert(
                fc.property(coreExprArb({ depth: 3 }), (e) => {
                    const a = foldExpr(e, (_, count) => count + 1, 0);
                    const b = foldExpr(e, (_, count) => count + 1, 0);
                    return a === b;
                }),
            );
        });
    });
});
