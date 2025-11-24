/**
 * Expression parsing tests - Records
 */

import { describe, expect, it } from "vitest";

import { ParserError } from "../utils/index.js";
import { parseExpression } from "./expression-test-helpers.js";

describe("Parser - Records", () => {
    describe("records", () => {
        it("should parse empty block (spec: {} is empty block, not empty record)", () => {
            const expr = parseExpression("{}");

            expect(expr).toMatchObject({
                kind: "Block",
                exprs: [],
            });
        });

        it("should parse record with one field", () => {
            const expr = parseExpression("{ x: 1 }");

            expect(expr).toMatchObject({
                kind: "Record",
                fields: [{ name: "x", value: { kind: "IntLit", value: 1 } }],
            });
        });

        it("should parse record with multiple fields", () => {
            const expr = parseExpression("{ x: 1, y: 2, z: 3 }");

            expect(expr).toMatchObject({
                kind: "Record",
                fields: [
                    { name: "x", value: { kind: "IntLit", value: 1 } },
                    { name: "y", value: { kind: "IntLit", value: 2 } },
                    { name: "z", value: { kind: "IntLit", value: 3 } },
                ],
            });
        });

        it("should parse record with expression values", () => {
            const expr = parseExpression("{ sum: a + b, product: c * d }");

            expect(expr).toMatchObject({
                kind: "Record",
                fields: [
                    {
                        name: "sum",
                        value: {
                            kind: "BinOp",
                            op: "Add",
                            left: { kind: "Var", name: "a" },
                            right: { kind: "Var", name: "b" },
                        },
                    },
                    {
                        name: "product",
                        value: {
                            kind: "BinOp",
                            op: "Multiply",
                            left: { kind: "Var", name: "c" },
                            right: { kind: "Var", name: "d" },
                        },
                    },
                ],
            });
        });

        it("should parse nested records", () => {
            const expr = parseExpression("{ inner: { x: 1 } }");

            expect(expr).toMatchObject({
                kind: "Record",
                fields: [
                    {
                        name: "inner",
                        value: {
                            kind: "Record",
                            fields: [{ name: "x", value: { kind: "IntLit", value: 1 } }],
                        },
                    },
                ],
            });
        });
    });

    describe("Record field comma requirements", () => {
        // Negative tests - should error when commas are missing

        it("should require comma between regular fields on same line", () => {
            expect(() => parseExpression("{ x: 1 y: 2 }")).toThrow(ParserError);
            expect(() => parseExpression("{ x: 1 y: 2 }")).toThrow(/Expected ',' between record fields/);
        });

        it("should require comma between shorthand fields", () => {
            // Note: Error is "Expected ':' after field name" because parser
            // tries to parse 'y' as a regular field after shorthand 'x'
            expect(() => parseExpression("{ x y z }")).toThrow(ParserError);
        });

        it("should require comma in multi-line records", () => {
            expect(() =>
                parseExpression(`{
                    x: 1
                    y: 2
                }`),
            ).toThrow(ParserError);
            expect(() =>
                parseExpression(`{
                    x: 1
                    y: 2
                }`),
            ).toThrow(/Expected ',' between record fields/);
        });

        it("should require comma after spread operator", () => {
            expect(() => parseExpression("{ ...base x: 1 }")).toThrow(ParserError);
            expect(() => parseExpression("{ ...base x: 1 }")).toThrow(/Expected ',' between record fields/);
        });

        it("should require comma in mixed shorthand and regular fields", () => {
            // Note: Error is "Expected ':' after field name" because parser
            // tries to parse 'age' as a regular field after shorthand 'x'
            expect(() => parseExpression("{ x age: 30 }")).toThrow(ParserError);
        });

        it("should require comma after field even with comment-induced newline", () => {
            // Comments are not yet implemented, but when they are, this should error
            // For now, this tests that newlines alone don't substitute for commas
            expect(() =>
                parseExpression(`{
                    x: 1
                    y: 2
                }`),
            ).toThrow(/Expected ',' between record fields/);
        });

        it("should error on first missing comma when multiple are missing", () => {
            expect(() => parseExpression("{ x: 1 y: 2 z: 3 }")).toThrow(ParserError);
            expect(() => parseExpression("{ x: 1 y: 2 z: 3 }")).toThrow(/Expected ',' between record fields/);
        });

        it("should error on missing comma in nested record", () => {
            expect(() => parseExpression("{ a: 1, b: { x: 1 y: 2 }, c: 3 }")).toThrow(ParserError);
            expect(() => parseExpression("{ a: 1, b: { x: 1 y: 2 }, c: 3 }")).toThrow(
                /Expected ',' between record fields/,
            );
        });

        it("should require comma when shorthand follows regular field", () => {
            expect(() => parseExpression("{ x: 1 name }")).toThrow(ParserError);
            expect(() => parseExpression("{ x: 1 name }")).toThrow(/Expected ',' between record fields/);
        });

        // Positive tests - should parse successfully with commas

        it("should accept trailing comma", () => {
            const expr = parseExpression("{ x: 1, y: 2, }");
            expect(expr.kind).toBe("Record");
            if (expr.kind !== "Record") return;
            expect(expr.fields).toHaveLength(2);
        });

        it("should parse single field without comma", () => {
            const expr = parseExpression("{ x: 1 }");
            expect(expr.kind).toBe("Record");
            if (expr.kind !== "Record") return;
            expect(expr.fields).toHaveLength(1);
        });

        it("should parse single shorthand field without comma", () => {
            const expr = parseExpression("{ name }");
            expect(expr.kind).toBe("Record");
            if (expr.kind !== "Record") return;
            expect(expr.fields).toHaveLength(1);
        });

        it("should parse multiple fields with commas", () => {
            const expr = parseExpression("{ x: 1, y: 2, z: 3 }");
            expect(expr.kind).toBe("Record");
            if (expr.kind !== "Record") return;
            expect(expr.fields).toHaveLength(3);
        });

        it("should parse nested records with commas", () => {
            const expr = parseExpression("{ outer: { inner: 1, x: 2 }, y: 3 }");
            expect(expr.kind).toBe("Record");
            if (expr.kind !== "Record") return;
            expect(expr.fields).toHaveLength(2);
        });

        it("should parse multi-line with commas", () => {
            const expr = parseExpression(`{
                x: 1,
                y: 2
            }`);
            expect(expr.kind).toBe("Record");
            if (expr.kind !== "Record") return;
            expect(expr.fields).toHaveLength(2);
        });

        it("should parse empty block (spec: {} is empty block)", () => {
            const expr = parseExpression("{}");
            expect(expr.kind).toBe("Block");
            if (expr.kind !== "Block") return;
            expect(expr.exprs).toHaveLength(0);
        });

        it("should parse empty block with whitespace", () => {
            const expr = parseExpression("{ }");
            expect(expr.kind).toBe("Block");
            if (expr.kind !== "Block") return;
            expect(expr.exprs).toHaveLength(0);
        });

        it("should parse empty block with newlines", () => {
            const expr = parseExpression("{\n}");
            expect(expr.kind).toBe("Block");
            if (expr.kind !== "Block") return;
            expect(expr.exprs).toHaveLength(0);
        });

        it("should parse empty block with multiple newlines", () => {
            const expr = parseExpression("{\n\n}");
            expect(expr.kind).toBe("Block");
            if (expr.kind !== "Block") return;
            expect(expr.exprs).toHaveLength(0);
        });

        it("should parse trailing comma with newlines", () => {
            const expr = parseExpression(`{
                x: 1,
                y: 2,

            }`);
            expect(expr.kind).toBe("Record");
            if (expr.kind !== "Record") return;
            expect(expr.fields).toHaveLength(2);
        });
    });

    describe("record access", () => {
        it("should parse record field access", () => {
            const expr = parseExpression("record.field");

            expect(expr).toMatchObject({
                kind: "RecordAccess",
                record: { kind: "Var", name: "record" },
                field: "field",
            });
        });

        it("should parse chained field access", () => {
            const expr = parseExpression("record.field1.field2");

            expect(expr).toMatchObject({
                kind: "RecordAccess",
                record: {
                    kind: "RecordAccess",
                    record: { kind: "Var", name: "record" },
                    field: "field1",
                },
                field: "field2",
            });
        });

        it("should parse field access on record literal", () => {
            const expr = parseExpression("{ x: 1, y: 2 }.x");

            expect(expr).toMatchObject({
                kind: "RecordAccess",
                record: {
                    kind: "Record",
                    fields: [
                        { name: "x", value: { kind: "IntLit", value: 1 } },
                        { name: "y", value: { kind: "IntLit", value: 2 } },
                    ],
                },
                field: "x",
            });
        });

        it("should parse field access in expressions", () => {
            const expr = parseExpression("a.x + b.y");

            expect(expr).toMatchObject({
                kind: "BinOp",
                op: "Add",
                left: {
                    kind: "RecordAccess",
                    record: { kind: "Var", name: "a" },
                    field: "x",
                },
                right: {
                    kind: "RecordAccess",
                    record: { kind: "Var", name: "b" },
                    field: "y",
                },
            });
        });
    });

    describe("record update", () => {
        it("should parse record update with one field", () => {
            const expr = parseExpression("{ ...record, x: 10 }");

            expect(expr).toMatchObject({
                kind: "RecordUpdate",
                record: { kind: "Var", name: "record" },
                updates: [{ kind: "Field", name: "x", value: { kind: "IntLit", value: 10 } }],
            });
        });

        it("should parse record update with multiple fields", () => {
            const expr = parseExpression("{ ...record, x: 10, y: 20 }");

            expect(expr).toMatchObject({
                kind: "RecordUpdate",
                record: { kind: "Var", name: "record" },
                updates: [
                    { kind: "Field", name: "x", value: { kind: "IntLit", value: 10 } },
                    { kind: "Field", name: "y", value: { kind: "IntLit", value: 20 } },
                ],
            });
        });

        it("should parse record update with expressions", () => {
            const expr = parseExpression("{ ...point, x: point.x + 1 }");

            expect(expr).toMatchObject({
                kind: "RecordUpdate",
                record: { kind: "Var", name: "point" },
                updates: [
                    {
                        kind: "Field",
                        name: "x",
                        value: {
                            kind: "BinOp",
                            op: "Add",
                            left: {
                                kind: "RecordAccess",
                                record: { kind: "Var", name: "point" },
                                field: "x",
                            },
                            right: { kind: "IntLit", value: 1 },
                        },
                    },
                ],
            });
        });

        it("should parse record spread only (shallow copy)", () => {
            const expr = parseExpression("{ ...obj }");

            expect(expr).toMatchObject({
                kind: "RecordUpdate",
                record: { kind: "Var", name: "obj" },
                updates: [],
            });
        });

        it("should parse record with multiple spreads", () => {
            const expr = parseExpression("{ ...a, ...b }");

            expect(expr).toMatchObject({
                kind: "RecordUpdate",
                record: { kind: "Var", name: "a" },
                updates: [{ kind: "Spread", expr: { kind: "Var", name: "b" } }],
            });
        });

        it("should parse record with spread and multiple fields", () => {
            const expr = parseExpression("{ ...base, x: 1, y: 2 }");

            expect(expr).toMatchObject({
                kind: "RecordUpdate",
                record: { kind: "Var", name: "base" },
                updates: [
                    { kind: "Field", name: "x", value: { kind: "IntLit", value: 1 } },
                    { kind: "Field", name: "y", value: { kind: "IntLit", value: 2 } },
                ],
            });
        });

        it("should parse record with multiple spreads and fields", () => {
            const expr = parseExpression("{ ...a, ...b, x: 1 }");

            expect(expr).toMatchObject({
                kind: "RecordUpdate",
                record: { kind: "Var", name: "a" },
                updates: [
                    { kind: "Spread", expr: { kind: "Var", name: "b" } },
                    { kind: "Field", name: "x", value: { kind: "IntLit", value: 1 } },
                ],
            });
        });

        it("should parse record with nested spread", () => {
            const expr = parseExpression("{ ...obj, nested: { ...obj.nested, x: 1 } }");

            expect(expr).toMatchObject({
                kind: "RecordUpdate",
                record: { kind: "Var", name: "obj" },
                updates: [
                    {
                        kind: "Field",
                        name: "nested",
                        value: {
                            kind: "RecordUpdate",
                            record: {
                                kind: "RecordAccess",
                                record: { kind: "Var", name: "obj" },
                                field: "nested",
                            },
                            updates: [{ kind: "Field", name: "x", value: { kind: "IntLit", value: 1 } }],
                        },
                    },
                ],
            });
        });

        it("should parse spread with function call", () => {
            const expr = parseExpression("{ ...getDefaults(), x: 1 }");

            expect(expr).toMatchObject({
                kind: "RecordUpdate",
                record: {
                    kind: "App",
                    func: { kind: "Var", name: "getDefaults" },
                    args: [],
                },
                updates: [{ kind: "Field", name: "x", value: { kind: "IntLit", value: 1 } }],
            });
        });

        it("should parse spread with complex expression", () => {
            const expr = parseExpression("{ ...if condition then a else b, x: 1 }");

            expect(expr).toMatchObject({
                kind: "RecordUpdate",
                record: {
                    kind: "If",
                    condition: { kind: "Var", name: "condition" },
                    then: { kind: "Var", name: "a" },
                    else_: { kind: "Var", name: "b" },
                },
                updates: [{ kind: "Field", name: "x", value: { kind: "IntLit", value: 1 } }],
            });
        });

        it("should parse triple spread", () => {
            const expr = parseExpression("{ ...a, ...b, ...c }");

            expect(expr).toMatchObject({
                kind: "RecordUpdate",
                record: { kind: "Var", name: "a" },
                updates: [
                    { kind: "Spread", expr: { kind: "Var", name: "b" } },
                    { kind: "Spread", expr: { kind: "Var", name: "c" } },
                ],
            });
        });

        it("should parse spread with string field names", () => {
            const expr = parseExpression('{ ...obj, name: "Alice", age: 30 }');

            expect(expr).toMatchObject({
                kind: "RecordUpdate",
                record: { kind: "Var", name: "obj" },
                updates: [
                    { kind: "Field", name: "name", value: { kind: "StringLit", value: "Alice" } },
                    { kind: "Field", name: "age", value: { kind: "IntLit", value: 30 } },
                ],
            });
        });

        it("should parse spread in pipeline", () => {
            const expr = parseExpression("{ ...obj, x: 1 } |> process");

            expect(expr).toMatchObject({
                kind: "Pipe",
                expr: {
                    kind: "RecordUpdate",
                    record: { kind: "Var", name: "obj" },
                    updates: [{ kind: "Field", name: "x", value: { kind: "IntLit", value: 1 } }],
                },
                func: { kind: "Var", name: "process" },
            });
        });

        it("should parse spread with boolean fields", () => {
            const expr = parseExpression("{ ...config, enabled: true, debug: false }");

            expect(expr).toMatchObject({
                kind: "RecordUpdate",
                record: { kind: "Var", name: "config" },
                updates: [
                    { kind: "Field", name: "enabled", value: { kind: "BoolLit", value: true } },
                    { kind: "Field", name: "debug", value: { kind: "BoolLit", value: false } },
                ],
            });
        });

        it("should parse spread with record literal as base", () => {
            const expr = parseExpression("{ ...{ x: 1, y: 2 }, x: 3 }");

            expect(expr).toMatchObject({
                kind: "RecordUpdate",
                record: {
                    kind: "Record",
                    fields: [
                        { kind: "Field", name: "x", value: { kind: "IntLit", value: 1 } },
                        { kind: "Field", name: "y", value: { kind: "IntLit", value: 2 } },
                    ],
                },
                updates: [{ kind: "Field", name: "x", value: { kind: "IntLit", value: 3 } }],
            });
        });

        it("should parse spread with field access", () => {
            const expr = parseExpression("{ ...obj.nested, x: 1 }");

            expect(expr).toMatchObject({
                kind: "RecordUpdate",
                record: {
                    kind: "RecordAccess",
                    record: { kind: "Var", name: "obj" },
                    field: "nested",
                },
                updates: [{ kind: "Field", name: "x", value: { kind: "IntLit", value: 1 } }],
            });
        });

        it("should parse spread with computed field value", () => {
            const expr = parseExpression("{ ...obj, x: y + z, a: b * c }");

            expect(expr).toMatchObject({
                kind: "RecordUpdate",
                record: { kind: "Var", name: "obj" },
                updates: [
                    {
                        kind: "Field",
                        name: "x",
                        value: {
                            kind: "BinOp",
                            op: "Add",
                            left: { kind: "Var", name: "y" },
                            right: { kind: "Var", name: "z" },
                        },
                    },
                    {
                        kind: "Field",
                        name: "a",
                        value: {
                            kind: "BinOp",
                            op: "Multiply",
                            left: { kind: "Var", name: "b" },
                            right: { kind: "Var", name: "c" },
                        },
                    },
                ],
            });
        });

        it("should parse spread with lambda field value", () => {
            const expr = parseExpression("{ ...obj, callback: (x) => x + 1 }");

            expect(expr).toMatchObject({
                kind: "RecordUpdate",
                record: { kind: "Var", name: "obj" },
                updates: [
                    {
                        kind: "Field",
                        name: "callback",
                        value: {
                            kind: "Lambda",
                            params: [{ pattern: { kind: "VarPattern", name: "x" } }],
                            body: {
                                kind: "BinOp",
                                op: "Add",
                                left: { kind: "Var", name: "x" },
                                right: { kind: "IntLit", value: 1 },
                            },
                        },
                    },
                ],
            });
        });

        it("should parse spread with list field value", () => {
            const expr = parseExpression("{ ...obj, items: [1, 2, 3] }");

            expect(expr).toMatchObject({
                kind: "RecordUpdate",
                record: { kind: "Var", name: "obj" },
                updates: [
                    {
                        kind: "Field",
                        name: "items",
                        value: {
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

        it("should parse multiple sequential spreads with fields", () => {
            const expr = parseExpression("{ ...a, x: 1, ...b, y: 2, ...c }");

            expect(expr).toMatchObject({
                kind: "RecordUpdate",
                record: { kind: "Var", name: "a" },
                updates: [
                    { kind: "Field", name: "x", value: { kind: "IntLit", value: 1 } },
                    { kind: "Spread", expr: { kind: "Var", name: "b" } },
                    { kind: "Field", name: "y", value: { kind: "IntLit", value: 2 } },
                    { kind: "Spread", expr: { kind: "Var", name: "c" } },
                ],
            });
        });

        it("should parse spread with match expression field", () => {
            const expr = parseExpression("{ ...obj, value: match x { | Some(v) => v | None => 0 } }");

            expect(expr).toMatchObject({
                kind: "RecordUpdate",
                record: { kind: "Var", name: "obj" },
                updates: [
                    {
                        kind: "Field",
                        name: "value",
                        value: {
                            kind: "Match",
                            expr: { kind: "Var", name: "x" },
                        },
                    },
                ],
            });
        });

        it("should parse deeply nested spreads", () => {
            const expr = parseExpression("{ ...a, b: { ...c, d: { ...e, f: 1 } } }");

            expect(expr).toMatchObject({
                kind: "RecordUpdate",
                record: { kind: "Var", name: "a" },
                updates: [
                    {
                        kind: "Field",
                        name: "b",
                        value: {
                            kind: "RecordUpdate",
                            record: { kind: "Var", name: "c" },
                            updates: [
                                {
                                    kind: "Field",
                                    name: "d",
                                    value: {
                                        kind: "RecordUpdate",
                                        record: { kind: "Var", name: "e" },
                                        updates: [
                                            {
                                                kind: "Field",
                                                name: "f",
                                                value: { kind: "IntLit", value: 1 },
                                            },
                                        ],
                                    },
                                },
                            ],
                        },
                    },
                ],
            });
        });
    });
});
