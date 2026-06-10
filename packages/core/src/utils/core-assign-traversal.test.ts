/**
 * Traversal coverage for the CoreAssign node (mutable-binding reassignment,
 * VF-FC-0005) across the shared AST utilities and the optimizer passes:
 * equality, substitution, transformation, visiting, and per-pass recursion.
 */

import type { CoreAssign, CoreExpr } from "../types/core-ast.js";

import { describe, expect, it } from "vitest";

import { EtaReductionPass } from "../optimizer/passes/eta-reduction.js";
import { PatternMatchOptimizationPass } from "../optimizer/passes/pattern-match-opt.js";
import { transformChildren, transformExpr, visitExpr } from "./ast-transform.js";
import { exprEquals } from "./expr-equality.js";
import { substitute, substituteMultiple } from "./substitution.js";

const testLoc = { file: "test.vf", line: 1, column: 1, offset: 0 };

function assign(name: string, value: CoreExpr): CoreAssign {
    return { kind: "CoreAssign", name, value, loc: testLoc };
}

function intLit(value: number): CoreExpr {
    return { kind: "CoreIntLit", value, loc: testLoc };
}

function varRef(name: string): CoreExpr {
    return { kind: "CoreVar", name, loc: testLoc };
}

describe("CoreAssign traversal", () => {
    describe("exprEquals", () => {
        it("equal when name and value match", () => {
            expect(exprEquals(assign("x", intLit(1)), assign("x", intLit(1)))).toBe(true);
        });

        it("unequal on different target or value", () => {
            expect(exprEquals(assign("x", intLit(1)), assign("y", intLit(1)))).toBe(false);
            expect(exprEquals(assign("x", intLit(1)), assign("x", intLit(2)))).toBe(false);
            expect(exprEquals(assign("x", intLit(1)), intLit(1))).toBe(false);
        });
    });

    describe("substitution", () => {
        it("substitutes inside the value", () => {
            const result = substitute(assign("x", varRef("a")), "a", intLit(9));
            expect(result).toEqual(assign("x", intLit(9)));
        });

        it("renames the target when the replacement is a variable", () => {
            const result = substitute(assign("x", intLit(1)), "x", varRef("x$1"));
            expect(result).toEqual(assign("x$1", intLit(1)));
        });

        it("keeps the target when the replacement is not a variable", () => {
            const result = substituteMultiple(assign("x", intLit(1)), new Map([["x", intLit(5)]]));
            expect(result).toEqual(assign("x", intLit(1)));
        });
    });

    describe("ast-transform", () => {
        it("transformChildren rewrites the value", () => {
            const result = transformChildren(assign("x", intLit(1)), (e) => (e.kind === "CoreIntLit" ? intLit(2) : e));
            expect(result).toEqual(assign("x", intLit(2)));
        });

        it("transformExpr reaches nested values", () => {
            const result = transformExpr(assign("x", varRef("a")), (e) => (e.kind === "CoreVar" ? intLit(7) : e));
            expect(result).toEqual(assign("x", intLit(7)));
        });

        it("visitExpr visits the value", () => {
            const seen: string[] = [];
            visitExpr(assign("x", varRef("a")), (e) => {
                seen.push(e.kind);
            });
            expect(seen).toContain("CoreAssign");
            expect(seen).toContain("CoreVar");
        });
    });

    describe("optimizer passes", () => {
        it("eta reduction recurses into the value and keeps the assignment", () => {
            // (y) => f(y) inside an assignment value reduces to f
            const etaExpandable: CoreExpr = {
                kind: "CoreLambda",
                param: { kind: "CoreVarPattern", name: "y", loc: testLoc },
                body: { kind: "CoreApp", func: varRef("f"), args: [varRef("y")], loc: testLoc },
                loc: testLoc,
            };
            const result = new EtaReductionPass().transform(assign("x", etaExpandable));
            expect(result).toEqual(assign("x", varRef("f")));
        });

        it("pattern-match optimization recurses into the value", () => {
            const result = new PatternMatchOptimizationPass().transform(assign("x", intLit(1)));
            expect(result).toEqual(assign("x", intLit(1)));
        });
    });
});
