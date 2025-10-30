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

import { describe, expect, it } from "vitest";

import { desugar, FreshVarGen } from "./desugarer.js";

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
        expect((result as any).name).toBe("rest");
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
        expect((result as any).constructor).toBe("Cons");
        expect((result as any).args).toHaveLength(2);
        expect((result as any).args[0].kind).toBe("CoreIntLit");
        expect((result as any).args[0].value).toBe(1);
        expect((result as any).args[1].kind).toBe("CoreVar");
        expect((result as any).args[1].name).toBe("rest");
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
        expect((result as any).constructor).toBe("Cons");
        expect((result as any).args[0].value).toBe(1);

        const tail = (result as any).args[1];
        expect(tail.kind).toBe("CoreVariant");
        expect(tail.constructor).toBe("Cons");
        expect(tail.args[0].value).toBe(2);
        expect(tail.args[1].kind).toBe("CoreVar");
        expect(tail.args[1].name).toBe("rest");
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
        let current: any = result;
        expect(current.args[0].value).toBe(1);
        current = current.args[1];
        expect(current.args[0].value).toBe(2);
        current = current.args[1];
        expect(current.args[0].value).toBe(3);
        expect(current.args[1].kind).toBe("CoreVar");
        expect(current.args[1].name).toBe("rest");
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
        expect((result as any).func.kind).toBe("CoreVar");
        expect((result as any).func.name).toBe("concat");
        expect((result as any).args).toHaveLength(2);

        // First arg: xs
        expect((result as any).args[0].kind).toBe("CoreVar");
        expect((result as any).args[0].name).toBe("xs");

        // Second arg: Cons(1, Nil)
        const secondArg = (result as any).args[1];
        expect(secondArg.kind).toBe("CoreVariant");
        expect(secondArg.constructor).toBe("Cons");
        expect(secondArg.args[0].value).toBe(1);
        expect(secondArg.args[1].constructor).toBe("Nil");
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
        expect((result as any).func.name).toBe("concat");

        const secondArg = (result as any).args[1];
        expect(secondArg.constructor).toBe("Cons");
        expect(secondArg.args[0].value).toBe(1);
        expect(secondArg.args[1].constructor).toBe("Cons");
        expect(secondArg.args[1].args[0].value).toBe(2);
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
        expect((result as any).func.name).toBe("concat");
        expect((result as any).args[0].name).toBe("xs");
        expect((result as any).args[1].name).toBe("ys");
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
        expect((result as any).func.name).toBe("concat");
        expect((result as any).args[0].name).toBe("xs");

        const innerConcat = (result as any).args[1];
        expect(innerConcat.kind).toBe("CoreApp");
        expect(innerConcat.func.name).toBe("concat");

        // Middle segment: Cons(1, Nil)
        const middleSegment = innerConcat.args[0];
        expect(middleSegment.constructor).toBe("Cons");
        expect(middleSegment.args[0].value).toBe(1);

        // Last segment: ys
        expect(innerConcat.args[1].name).toBe("ys");
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
        expect((result as any).func.name).toBe("concat");
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
        expect((result as any).func.name).toBe("concat");
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
