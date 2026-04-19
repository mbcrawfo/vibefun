/**
 * Tests for foldExpr — extracted from ast-transform.test.ts for size.
 */

import type { CoreExpr } from "../types/core-ast.js";

import { describe, expect, it } from "vitest";

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
                recursive: false,
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
});
