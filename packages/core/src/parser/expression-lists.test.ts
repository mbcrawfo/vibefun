/**
 * Expression parsing tests - Lists
 */

import { describe, expect, it } from "vitest";

import { parseExpression } from "./expression-test-helpers.js";

describe("Parser - Lists", () => {
    describe("lists", () => {
        it("should parse empty list", () => {
            const expr = parseExpression("[]");

            expect(expr).toMatchObject({
                kind: "List",
                elements: [],
            });
        });

        it("should parse list with one element", () => {
            const expr = parseExpression("[1]");

            expect(expr).toMatchObject({
                kind: "List",
                elements: [{ kind: "Element", expr: { kind: "IntLit", value: 1 } }],
            });
        });

        it("should parse list with multiple elements", () => {
            const expr = parseExpression("[1, 2, 3]");

            expect(expr).toMatchObject({
                kind: "List",
                elements: [
                    { kind: "Element", expr: { kind: "IntLit", value: 1 } },
                    { kind: "Element", expr: { kind: "IntLit", value: 2 } },
                    { kind: "Element", expr: { kind: "IntLit", value: 3 } },
                ],
            });
        });

        it("should parse list with expressions", () => {
            const expr = parseExpression("[a + b, c * d]");

            expect(expr).toMatchObject({
                kind: "List",
                elements: [
                    {
                        kind: "Element",
                        expr: {
                            kind: "BinOp",
                            op: "Add",
                            left: { kind: "Var", name: "a" },
                            right: { kind: "Var", name: "b" },
                        },
                    },
                    {
                        kind: "Element",
                        expr: {
                            kind: "BinOp",
                            op: "Multiply",
                            left: { kind: "Var", name: "c" },
                            right: { kind: "Var", name: "d" },
                        },
                    },
                ],
            });
        });

        it("should parse nested lists", () => {
            const expr = parseExpression("[[1, 2], [3, 4]]");

            expect(expr).toMatchObject({
                kind: "List",
                elements: [
                    {
                        kind: "Element",
                        expr: {
                            kind: "List",
                            elements: [
                                { kind: "Element", expr: { kind: "IntLit", value: 1 } },
                                { kind: "Element", expr: { kind: "IntLit", value: 2 } },
                            ],
                        },
                    },
                    {
                        kind: "Element",
                        expr: {
                            kind: "List",
                            elements: [
                                { kind: "Element", expr: { kind: "IntLit", value: 3 } },
                                { kind: "Element", expr: { kind: "IntLit", value: 4 } },
                            ],
                        },
                    },
                ],
            });
        });
    });

    describe("list spreads", () => {
        it("should parse list with spread at end", () => {
            const expr = parseExpression("[1, 2, ...rest]");

            expect(expr).toMatchObject({
                kind: "List",
                elements: [
                    { kind: "Element", expr: { kind: "IntLit", value: 1 } },
                    { kind: "Element", expr: { kind: "IntLit", value: 2 } },
                    { kind: "Spread", expr: { kind: "Var", name: "rest" } },
                ],
            });
        });

        it("should parse list with spread only", () => {
            const expr = parseExpression("[...items]");

            expect(expr).toMatchObject({
                kind: "List",
                elements: [{ kind: "Spread", expr: { kind: "Var", name: "items" } }],
            });
        });

        it("should parse list with spread at start", () => {
            const expr = parseExpression("[...start, 1, 2]");

            expect(expr).toMatchObject({
                kind: "List",
                elements: [
                    { kind: "Spread", expr: { kind: "Var", name: "start" } },
                    { kind: "Element", expr: { kind: "IntLit", value: 1 } },
                    { kind: "Element", expr: { kind: "IntLit", value: 2 } },
                ],
            });
        });

        it("should parse list with spread in middle", () => {
            const expr = parseExpression("[1, ...middle, 5]");

            expect(expr).toMatchObject({
                kind: "List",
                elements: [
                    { kind: "Element", expr: { kind: "IntLit", value: 1 } },
                    { kind: "Spread", expr: { kind: "Var", name: "middle" } },
                    { kind: "Element", expr: { kind: "IntLit", value: 5 } },
                ],
            });
        });

        it("should parse list with multiple spreads", () => {
            const expr = parseExpression("[...xs, ...ys]");

            expect(expr).toMatchObject({
                kind: "List",
                elements: [
                    { kind: "Spread", expr: { kind: "Var", name: "xs" } },
                    { kind: "Spread", expr: { kind: "Var", name: "ys" } },
                ],
            });
        });

        it("should parse list with three spreads", () => {
            const expr = parseExpression("[...a, ...b, ...c]");

            expect(expr).toMatchObject({
                kind: "List",
                elements: [
                    { kind: "Spread", expr: { kind: "Var", name: "a" } },
                    { kind: "Spread", expr: { kind: "Var", name: "b" } },
                    { kind: "Spread", expr: { kind: "Var", name: "c" } },
                ],
            });
        });

        it("should parse list with mixed elements and spreads", () => {
            const expr = parseExpression("[...start, 1, 2, ...end]");

            expect(expr).toMatchObject({
                kind: "List",
                elements: [
                    { kind: "Spread", expr: { kind: "Var", name: "start" } },
                    { kind: "Element", expr: { kind: "IntLit", value: 1 } },
                    { kind: "Element", expr: { kind: "IntLit", value: 2 } },
                    { kind: "Spread", expr: { kind: "Var", name: "end" } },
                ],
            });
        });

        it("should parse nested list with spread", () => {
            const expr = parseExpression("[[...inner]]");

            expect(expr).toMatchObject({
                kind: "List",
                elements: [
                    {
                        kind: "Element",
                        expr: {
                            kind: "List",
                            elements: [{ kind: "Spread", expr: { kind: "Var", name: "inner" } }],
                        },
                    },
                ],
            });
        });

        it("should parse spread of list literal", () => {
            const expr = parseExpression("[...[1, 2, 3]]");

            expect(expr).toMatchObject({
                kind: "List",
                elements: [
                    {
                        kind: "Spread",
                        expr: {
                            kind: "List",
                            elements: [
                                { kind: "Element", expr: { kind: "IntLit", value: 1 } },
                                { kind: "Element", expr: { kind: "IntLit", value: 2 } },
                                { kind: "Element", expr: { kind: "IntLit", value: 3 } },
                            ],
                        },
                    },
                ],
            });
        });

        it("should parse spread with complex expression", () => {
            const expr = parseExpression("[...getList(), 1]");

            expect(expr).toMatchObject({
                kind: "List",
                elements: [
                    {
                        kind: "Spread",
                        expr: {
                            kind: "App",
                            func: { kind: "Var", name: "getList" },
                            args: [],
                        },
                    },
                    { kind: "Element", expr: { kind: "IntLit", value: 1 } },
                ],
            });
        });

        it("should parse list spread in pipe expression", () => {
            const expr = parseExpression("[...xs] |> map(f)");

            expect(expr).toMatchObject({
                kind: "Pipe",
                expr: {
                    kind: "List",
                    elements: [{ kind: "Spread", expr: { kind: "Var", name: "xs" } }],
                },
                func: {
                    kind: "App",
                    func: { kind: "Var", name: "map" },
                    args: [{ kind: "Var", name: "f" }],
                },
            });
        });

        it("should parse list spread with binary operation", () => {
            const expr = parseExpression("[...xs, a + b]");

            expect(expr).toMatchObject({
                kind: "List",
                elements: [
                    { kind: "Spread", expr: { kind: "Var", name: "xs" } },
                    {
                        kind: "Element",
                        expr: {
                            kind: "BinOp",
                            op: "Add",
                            left: { kind: "Var", name: "a" },
                            right: { kind: "Var", name: "b" },
                        },
                    },
                ],
            });
        });
    });
});
