/**
 * Tests for list literal and cons operator desugaring
 *
 * List literals: [1, 2, 3] => Cons(1, Cons(2, Cons(3, Nil)))
 * Cons operator: x :: xs => Cons(x, xs)
 */

import type { Expr, Location } from "../types/ast.js";
import type { CoreExpr, CoreVariant } from "../types/core-ast.js";

import { describe, expect, it } from "vitest";

import { desugar } from "./desugarer.js";

const testLoc: Location = {
    file: "test.vf",
    line: 1,
    column: 1,
    offset: 0,
};

// Helper to wrap expressions in Element for new ListElement format
const elem = (expr: Expr) => ({ kind: "Element" as const, expr });

describe("List Literals - Empty List", () => {
    it("should desugar empty list to Nil", () => {
        const list: Expr = {
            kind: "List",
            elements: [],
            loc: testLoc,
        };

        const result = desugar(list);

        expect(result.kind).toBe("CoreVariant");
        expect((result as CoreVariant).constructor).toBe("Nil");
        expect((result as CoreVariant).args).toHaveLength(0);
    });
});

describe("List Literals - Single Element", () => {
    it("should desugar single element list", () => {
        const list: Expr = {
            kind: "List",
            elements: [{ kind: "Element", expr: { kind: "IntLit", value: 42, loc: testLoc } }],
            loc: testLoc,
        };

        const result = desugar(list);

        // Should be: Cons(42, Nil)
        expect(result.kind).toBe("CoreVariant");
        expect((result as CoreVariant).constructor).toBe("Cons");
        expect((result as CoreVariant).args).toHaveLength(2);

        // First arg should be 42
        expect((result as CoreVariant).args[0].kind).toBe("CoreIntLit");
        expect((result as CoreVariant).args[0].value).toBe(42);

        // Second arg should be Nil
        expect((result as CoreVariant).args[1].kind).toBe("CoreVariant");
        expect((result as CoreVariant).args[1].constructor).toBe("Nil");
    });

    it("should desugar single string element", () => {
        const list: Expr = {
            kind: "List",
            elements: [elem({ kind: "StringLit", value: "hello", loc: testLoc })],
            loc: testLoc,
        };

        const result = desugar(list);

        expect(result.kind).toBe("CoreVariant");
        expect((result as CoreVariant).constructor).toBe("Cons");
        expect((result as CoreVariant).args[0].kind).toBe("CoreStringLit");
    });
});

describe("List Literals - Two Elements", () => {
    it("should desugar two-element list", () => {
        const list: Expr = {
            kind: "List",
            elements: [
                elem({ kind: "IntLit", value: 1, loc: testLoc }),
                elem({ kind: "IntLit", value: 2, loc: testLoc }),
            ],
            loc: testLoc,
        };

        const result = desugar(list);

        // Should be: Cons(1, Cons(2, Nil))
        expect(result.kind).toBe("CoreVariant");
        expect((result as CoreVariant).constructor).toBe("Cons");

        // First element
        expect((result as CoreVariant).args[0].value).toBe(1);

        // Tail: Cons(2, Nil)
        const tail = (result as CoreVariant).args[1];
        expect(tail.kind).toBe("CoreVariant");
        expect(tail.constructor).toBe("Cons");
        expect(tail.args[0].value).toBe(2);

        // Tail of tail: Nil
        const tailTail = tail.args[1];
        expect(tailTail.kind).toBe("CoreVariant");
        expect(tailTail.constructor).toBe("Nil");
    });
});

describe("List Literals - Multiple Elements", () => {
    it("should desugar three-element list", () => {
        const list: Expr = {
            kind: "List",
            elements: [
                elem({ kind: "IntLit", value: 1, loc: testLoc }),
                elem({ kind: "IntLit", value: 2, loc: testLoc }),
                elem({ kind: "IntLit", value: 3, loc: testLoc }),
            ],
            loc: testLoc,
        };

        const result = desugar(list);

        // Cons(1, Cons(2, Cons(3, Nil)))
        expect(result.kind).toBe("CoreVariant");
        expect((result as CoreVariant).constructor).toBe("Cons");
        expect((result as CoreVariant).args[0].value).toBe(1);

        let current = (result as CoreVariant).args[1];
        expect(current.constructor).toBe("Cons");
        expect(current.args[0].value).toBe(2);

        current = current.args[1];
        expect(current.constructor).toBe("Cons");
        expect(current.args[0].value).toBe(3);

        current = current.args[1];
        expect(current.constructor).toBe("Nil");
    });

    it("should desugar five-element list", () => {
        const list: Expr = {
            kind: "List",
            elements: [
                elem({ kind: "IntLit", value: 1, loc: testLoc }),
                elem({ kind: "IntLit", value: 2, loc: testLoc }),
                elem({ kind: "IntLit", value: 3, loc: testLoc }),
                elem({ kind: "IntLit", value: 4, loc: testLoc }),
                elem({ kind: "IntLit", value: 5, loc: testLoc }),
            ],
            loc: testLoc,
        };

        const result = desugar(list);

        // Walk through the chain
        let current: CoreExpr = result;
        const values = [];

        while (current.constructor === "Cons") {
            values.push(current.args[0].value);
            current = current.args[1];
        }

        expect(values).toEqual([1, 2, 3, 4, 5]);
        expect(current.constructor).toBe("Nil");
    });
});

describe("List Literals - Nested Lists", () => {
    it("should desugar nested lists", () => {
        // [[1, 2], [3, 4]]
        const list: Expr = {
            kind: "List",
            elements: [
                elem({
                    kind: "List",
                    elements: [
                        elem({ kind: "IntLit", value: 1, loc: testLoc }),
                        elem({ kind: "IntLit", value: 2, loc: testLoc }),
                    ],
                    loc: testLoc,
                }),
                elem({
                    kind: "List",
                    elements: [
                        elem({ kind: "IntLit", value: 3, loc: testLoc }),
                        elem({ kind: "IntLit", value: 4, loc: testLoc }),
                    ],
                    loc: testLoc,
                }),
            ],
            loc: testLoc,
        };

        const result = desugar(list);

        // Outer structure should be Cons
        expect(result.kind).toBe("CoreVariant");
        expect((result as CoreVariant).constructor).toBe("Cons");

        // First element should be a desugared list
        const firstElem = (result as CoreVariant).args[0];
        expect(firstElem.kind).toBe("CoreVariant");
        expect(firstElem.constructor).toBe("Cons");
    });
});

describe("List Literals - Complex Elements", () => {
    it("should desugar list with expressions", () => {
        // [x + 1, y * 2, z]
        const list: Expr = {
            kind: "List",
            elements: [
                elem({
                    kind: "BinOp",
                    op: "Add",
                    left: { kind: "Var", name: "x", loc: testLoc },
                    right: { kind: "IntLit", value: 1, loc: testLoc },
                    loc: testLoc,
                }),
                elem({
                    kind: "BinOp",
                    op: "Multiply",
                    left: { kind: "Var", name: "y", loc: testLoc },
                    right: { kind: "IntLit", value: 2, loc: testLoc },
                    loc: testLoc,
                }),
                elem({ kind: "Var", name: "z", loc: testLoc }),
            ],
            loc: testLoc,
        };

        const result = desugar(list);

        expect(result.kind).toBe("CoreVariant");
        expect((result as CoreVariant).constructor).toBe("Cons");

        // First element should be desugared BinOp
        expect((result as CoreVariant).args[0].kind).toBe("CoreBinOp");
    });

    it("should desugar list with lambda elements", () => {
        // [(x) => x + 1, (y) => y * 2]
        const list: Expr = {
            kind: "List",
            elements: [
                elem({
                    kind: "Lambda",
                    params: [{ kind: "VarPattern", name: "x", loc: testLoc }],
                    body: {
                        kind: "BinOp",
                        op: "Add",
                        left: { kind: "Var", name: "x", loc: testLoc },
                        right: { kind: "IntLit", value: 1, loc: testLoc },
                        loc: testLoc,
                    },
                    loc: testLoc,
                }),
                elem({
                    kind: "Lambda",
                    params: [{ kind: "VarPattern", name: "y", loc: testLoc }],
                    body: {
                        kind: "BinOp",
                        op: "Multiply",
                        left: { kind: "Var", name: "y", loc: testLoc },
                        right: { kind: "IntLit", value: 2, loc: testLoc },
                        loc: testLoc,
                    },
                    loc: testLoc,
                }),
            ],
            loc: testLoc,
        };

        const result = desugar(list);

        expect(result.kind).toBe("CoreVariant");
        expect((result as CoreVariant).args[0].kind).toBe("CoreLambda");
    });
});

describe("Cons Operator", () => {
    it("should desugar simple cons", () => {
        // x :: xs
        const cons: Expr = {
            kind: "ListCons",
            head: { kind: "Var", name: "x", loc: testLoc },
            tail: { kind: "Var", name: "xs", loc: testLoc },
            loc: testLoc,
        };

        const result = desugar(cons);

        expect(result.kind).toBe("CoreVariant");
        expect((result as CoreVariant).constructor).toBe("Cons");
        expect((result as CoreVariant).args).toHaveLength(2);
        expect((result as CoreVariant).args[0].kind).toBe("CoreVar");
        expect((result as CoreVariant).args[0].name).toBe("x");
        expect((result as CoreVariant).args[1].kind).toBe("CoreVar");
        expect((result as CoreVariant).args[1].name).toBe("xs");
    });

    it("should desugar cons with literal head", () => {
        // 42 :: rest
        const cons: Expr = {
            kind: "ListCons",
            head: { kind: "IntLit", value: 42, loc: testLoc },
            tail: { kind: "Var", name: "rest", loc: testLoc },
            loc: testLoc,
        };

        const result = desugar(cons);

        expect(result.kind).toBe("CoreVariant");
        expect((result as CoreVariant).constructor).toBe("Cons");
        expect((result as CoreVariant).args[0].kind).toBe("CoreIntLit");
        expect((result as CoreVariant).args[0].value).toBe(42);
    });

    it("should desugar cons with empty list tail", () => {
        // x :: []
        const cons: Expr = {
            kind: "ListCons",
            head: { kind: "Var", name: "x", loc: testLoc },
            tail: { kind: "List", elements: [], loc: testLoc },
            loc: testLoc,
        };

        const result = desugar(cons);

        expect(result.kind).toBe("CoreVariant");
        expect((result as CoreVariant).constructor).toBe("Cons");

        // Tail should be desugared to Nil
        const tail = (result as CoreVariant).args[1];
        expect(tail.kind).toBe("CoreVariant");
        expect(tail.constructor).toBe("Nil");
    });

    it("should desugar chained cons", () => {
        // 1 :: 2 :: 3 :: []
        // Parser creates: ListCons(1, ListCons(2, ListCons(3, [])))
        const cons3: Expr = {
            kind: "ListCons",
            head: { kind: "IntLit", value: 3, loc: testLoc },
            tail: { kind: "List", elements: [], loc: testLoc },
            loc: testLoc,
        };

        const cons2: Expr = {
            kind: "ListCons",
            head: { kind: "IntLit", value: 2, loc: testLoc },
            tail: cons3,
            loc: testLoc,
        };

        const cons1: Expr = {
            kind: "ListCons",
            head: { kind: "IntLit", value: 1, loc: testLoc },
            tail: cons2,
            loc: testLoc,
        };

        const result = desugar(cons1);

        // Should be: Cons(1, Cons(2, Cons(3, Nil)))
        expect(result.kind).toBe("CoreVariant");
        expect((result as CoreVariant).constructor).toBe("Cons");
        expect((result as CoreVariant).args[0].value).toBe(1);

        let current = (result as CoreVariant).args[1];
        expect(current.constructor).toBe("Cons");
        expect(current.args[0].value).toBe(2);

        current = current.args[1];
        expect(current.constructor).toBe("Cons");
        expect(current.args[0].value).toBe(3);

        current = current.args[1];
        expect(current.constructor).toBe("Nil");
    });
});

describe("List Desugaring - Source Locations", () => {
    it("should preserve source locations", () => {
        const listLoc: Location = {
            file: "test.vf",
            line: 25,
            column: 10,
            offset: 300,
        };

        const list: Expr = {
            kind: "List",
            elements: [{ kind: "Element", expr: { kind: "IntLit", value: 1, loc: testLoc } }],
            loc: listLoc,
        };

        const result = desugar(list);

        expect(result.loc).toBe(listLoc);
    });
});
