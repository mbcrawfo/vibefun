/**
 * Tests for list spread desugaring
 *
 * List spreads are desugared using different strategies:
 * - No spread: [1, 2, 3] => Cons(1, Cons(2, Cons(3, Nil)))
 * - Spread at end: [1, 2, ...rest] => Cons(1, Cons(2, rest))
 * - Just spread: [...rest] => rest
 * - Complex spreads: [...xs, 1, ...ys] => concat(xs, Cons(1, ys))
 */

import type { Expr, Location } from "../types/ast.js";
import type { CoreApp, CoreIntLit, CoreVar, CoreVariant } from "../types/core-ast.js";

import { describe, expect, it } from "vitest";

import { desugar } from "./desugarer.js";

const testLoc: Location = {
    file: "test.vf",
    line: 1,
    column: 1,
    offset: 0,
};

// Helper to create regular list elements
const elem = (expr: Expr) => ({ kind: "Element" as const, expr });

// Helper to create spread elements
const spread = (expr: Expr) => ({ kind: "Spread" as const, expr });

describe("List Spread - Just Spread", () => {
    it("should desugar [...rest] to just rest", () => {
        const list: Expr = {
            kind: "List",
            elements: [spread({ kind: "Var", name: "rest", loc: testLoc })],
            loc: testLoc,
        };

        const result = desugar(list);

        // Should just be the variable
        expect(result.kind).toBe("CoreVar");
        expect((result as CoreVar).name).toBe("rest");
    });
});

describe("List Spread - Spread at End", () => {
    it("should desugar [1, ...rest] optimally", () => {
        const list: Expr = {
            kind: "List",
            elements: [
                elem({ kind: "IntLit", value: 1, loc: testLoc }),
                spread({ kind: "Var", name: "rest", loc: testLoc }),
            ],
            loc: testLoc,
        };

        const result = desugar(list);

        // Should be: Cons(1, rest)
        expect(result.kind).toBe("CoreVariant");
        const variant = result as CoreVariant;
        expect(variant.constructor).toBe("Cons");
        expect(variant.args).toHaveLength(2);
        expect(variant.args[0]!.kind).toBe("CoreIntLit");
        expect((variant.args[0] as CoreIntLit).value).toBe(1);
        expect(variant.args[1]!.kind).toBe("CoreVar");
        expect((variant.args[1] as CoreVar).name).toBe("rest");
    });

    it("should desugar [1, 2, ...rest] optimally", () => {
        const list: Expr = {
            kind: "List",
            elements: [
                elem({ kind: "IntLit", value: 1, loc: testLoc }),
                elem({ kind: "IntLit", value: 2, loc: testLoc }),
                spread({ kind: "Var", name: "rest", loc: testLoc }),
            ],
            loc: testLoc,
        };

        const result = desugar(list);

        // Should be: Cons(1, Cons(2, rest))
        expect(result.kind).toBe("CoreVariant");
        const variant = result as CoreVariant;
        expect(variant.constructor).toBe("Cons");
        expect((variant.args[0] as CoreIntLit).value).toBe(1);

        const tail = variant.args[1]! as CoreVariant;
        expect(tail.kind).toBe("CoreVariant");
        expect(tail.constructor).toBe("Cons");
        expect((tail.args[0] as CoreIntLit).value).toBe(2);
        expect(tail.args[1]!.kind).toBe("CoreVar");
        expect((tail.args[1] as CoreVar).name).toBe("rest");
    });

    it("should desugar [1, 2, 3, ...rest] optimally", () => {
        const list: Expr = {
            kind: "List",
            elements: [
                elem({ kind: "IntLit", value: 1, loc: testLoc }),
                elem({ kind: "IntLit", value: 2, loc: testLoc }),
                elem({ kind: "IntLit", value: 3, loc: testLoc }),
                spread({ kind: "Var", name: "rest", loc: testLoc }),
            ],
            loc: testLoc,
        };

        const result = desugar(list);

        // Should be: Cons(1, Cons(2, Cons(3, rest)))
        expect(result.kind).toBe("CoreVariant");
        let current = result as CoreVariant;
        expect((current.args[0] as CoreIntLit).value).toBe(1);
        current = current.args[1]! as CoreVariant;
        expect((current.args[0] as CoreIntLit).value).toBe(2);
        current = current.args[1]! as CoreVariant;
        expect((current.args[0] as CoreIntLit).value).toBe(3);
        expect(current.args[1]!.kind).toBe("CoreVar");
        expect((current.args[1] as CoreVar).name).toBe("rest");
    });
});

describe("List Spread - Spread at Beginning", () => {
    it("should desugar [...xs, 1] using concat", () => {
        const list: Expr = {
            kind: "List",
            elements: [
                spread({ kind: "Var", name: "xs", loc: testLoc }),
                elem({ kind: "IntLit", value: 1, loc: testLoc }),
            ],
            loc: testLoc,
        };

        const result = desugar(list);

        // Should be: concat(xs, Cons(1, Nil))
        expect(result.kind).toBe("CoreApp");
        const app = result as CoreApp;
        expect(app.func.kind).toBe("CoreVar");
        expect((app.func as CoreVar).name).toBe("concat");
        expect(app.args).toHaveLength(2);

        // First arg: xs
        expect(app.args[0]!.kind).toBe("CoreVar");
        expect((app.args[0] as CoreVar).name).toBe("xs");

        // Second arg: Cons(1, Nil)
        const secondArg = app.args[1]! as CoreVariant;
        expect(secondArg.kind).toBe("CoreVariant");
        expect(secondArg.constructor).toBe("Cons");
        expect((secondArg.args[0] as CoreIntLit).value).toBe(1);
        expect((secondArg.args[1] as CoreVariant).constructor).toBe("Nil");
    });

    it("should desugar [...xs, 1, 2] using concat", () => {
        const list: Expr = {
            kind: "List",
            elements: [
                spread({ kind: "Var", name: "xs", loc: testLoc }),
                elem({ kind: "IntLit", value: 1, loc: testLoc }),
                elem({ kind: "IntLit", value: 2, loc: testLoc }),
            ],
            loc: testLoc,
        };

        const result = desugar(list);

        // Should be: concat(xs, Cons(1, Cons(2, Nil)))
        expect(result.kind).toBe("CoreApp");
        const app = result as CoreApp;
        expect((app.func as CoreVar).name).toBe("concat");

        const secondArg = app.args[1]! as CoreVariant;
        expect(secondArg.constructor).toBe("Cons");
        expect((secondArg.args[0] as CoreIntLit).value).toBe(1);
        const innerVariant = secondArg.args[1]! as CoreVariant;
        expect(innerVariant.constructor).toBe("Cons");
        expect((innerVariant.args[0] as CoreIntLit).value).toBe(2);
    });
});

describe("List Spread - Multiple Spreads", () => {
    it("should desugar [...xs, ...ys] using concat", () => {
        const list: Expr = {
            kind: "List",
            elements: [
                spread({ kind: "Var", name: "xs", loc: testLoc }),
                spread({ kind: "Var", name: "ys", loc: testLoc }),
            ],
            loc: testLoc,
        };

        const result = desugar(list);

        // Should be: concat(xs, ys)
        expect(result.kind).toBe("CoreApp");
        const app = result as CoreApp;
        expect((app.func as CoreVar).name).toBe("concat");
        expect((app.args[0] as CoreVar).name).toBe("xs");
        expect((app.args[1] as CoreVar).name).toBe("ys");
    });

    it("should desugar [...xs, 1, ...ys] using concat", () => {
        const list: Expr = {
            kind: "List",
            elements: [
                spread({ kind: "Var", name: "xs", loc: testLoc }),
                elem({ kind: "IntLit", value: 1, loc: testLoc }),
                spread({ kind: "Var", name: "ys", loc: testLoc }),
            ],
            loc: testLoc,
        };

        const result = desugar(list);

        // Should be: concat(xs, concat(Cons(1, Nil), ys))
        expect(result.kind).toBe("CoreApp");
        const app = result as CoreApp;
        expect((app.func as CoreVar).name).toBe("concat");
        expect((app.args[0] as CoreVar).name).toBe("xs");

        const innerConcat = app.args[1]! as CoreApp;
        expect(innerConcat.kind).toBe("CoreApp");
        expect((innerConcat.func as CoreVar).name).toBe("concat");

        // Middle segment: Cons(1, Nil)
        const middleSegment = innerConcat.args[0]! as CoreVariant;
        expect(middleSegment.constructor).toBe("Cons");
        expect((middleSegment.args[0] as CoreIntLit).value).toBe(1);

        // Last segment: ys
        expect((innerConcat.args[1] as CoreVar).name).toBe("ys");
    });

    it("should desugar [...xs, 1, ...ys, 2] using concat", () => {
        const list: Expr = {
            kind: "List",
            elements: [
                spread({ kind: "Var", name: "xs", loc: testLoc }),
                elem({ kind: "IntLit", value: 1, loc: testLoc }),
                spread({ kind: "Var", name: "ys", loc: testLoc }),
                elem({ kind: "IntLit", value: 2, loc: testLoc }),
            ],
            loc: testLoc,
        };

        const result = desugar(list);

        // Should be concat(xs, concat(Cons(1, Nil), concat(ys, Cons(2, Nil))))
        expect(result.kind).toBe("CoreApp");
        const app = result as CoreApp;
        expect((app.func as CoreVar).name).toBe("concat");
    });

    it("should desugar [1, ...xs, 2, ...ys, 3] using concat", () => {
        const list: Expr = {
            kind: "List",
            elements: [
                elem({ kind: "IntLit", value: 1, loc: testLoc }),
                spread({ kind: "Var", name: "xs", loc: testLoc }),
                elem({ kind: "IntLit", value: 2, loc: testLoc }),
                spread({ kind: "Var", name: "ys", loc: testLoc }),
                elem({ kind: "IntLit", value: 3, loc: testLoc }),
            ],
            loc: testLoc,
        };

        const result = desugar(list);

        // Multiple concats
        expect(result.kind).toBe("CoreApp");
        const app = result as CoreApp;
        expect((app.func as CoreVar).name).toBe("concat");
    });
});

describe("List Spread - Source Locations", () => {
    it("should preserve source locations", () => {
        const listLoc: Location = {
            file: "test.vf",
            line: 20,
            column: 5,
            offset: 200,
        };

        const list: Expr = {
            kind: "List",
            elements: [
                elem({ kind: "IntLit", value: 1, loc: testLoc }),
                spread({ kind: "Var", name: "rest", loc: testLoc }),
            ],
            loc: listLoc,
        };

        const result = desugar(list);

        expect(result.loc).toBe(listLoc);
    });
});
