/**
 * Tests for record update desugaring
 *
 * Record update syntax: { record | field1: value1, field2: value2 }
 * Desugars to: CoreRecordUpdate preserving update semantics for code generator
 */

import type { Expr, Location } from "../types/ast.js";
import type { CoreRecordUpdate } from "../types/core-ast.js";

import { describe, expect, it } from "vitest";

import { desugar } from "./desugarer.js";

const testLoc: Location = {
    file: "test.vf",
    line: 1,
    column: 1,
    offset: 0,
};

describe("Record Update - Single Field", () => {
    it("should desugar single field update", () => {
        // { person | age: 31 }
        const update: Expr = {
            kind: "RecordUpdate",
            record: { kind: "Var", name: "person", loc: testLoc },
            updates: [
                {
                    name: "age",
                    value: { kind: "IntLit", value: 31, loc: testLoc },
                    loc: testLoc,
                },
            ],
            loc: testLoc,
        };

        const result = desugar(update);

        expect(result.kind).toBe("CoreRecordUpdate");
        expect((result as CoreRecordUpdate).record.kind).toBe("CoreVar");
        expect((result as CoreRecordUpdate).record.name).toBe("person");
        expect((result as CoreRecordUpdate).updates).toHaveLength(1);
        expect((result as CoreRecordUpdate).updates[0].name).toBe("age");
        expect((result as CoreRecordUpdate).updates[0].value.kind).toBe("CoreIntLit");
        expect((result as CoreRecordUpdate).updates[0].value.value).toBe(31);
    });

    it("should desugar field update with expression", () => {
        // { point | x: point.x + 1 }
        const update: Expr = {
            kind: "RecordUpdate",
            record: { kind: "Var", name: "point", loc: testLoc },
            updates: [
                {
                    name: "x",
                    value: {
                        kind: "BinOp",
                        op: "Add",
                        left: {
                            kind: "RecordAccess",
                            record: { kind: "Var", name: "point", loc: testLoc },
                            field: "x",
                            loc: testLoc,
                        },
                        right: { kind: "IntLit", value: 1, loc: testLoc },
                        loc: testLoc,
                    },
                    loc: testLoc,
                },
            ],
            loc: testLoc,
        };

        const result = desugar(update);

        expect(result.kind).toBe("CoreRecordUpdate");
        expect((result as CoreRecordUpdate).updates[0].name).toBe("x");
        // Value should be desugared BinOp
        expect((result as CoreRecordUpdate).updates[0].value.kind).toBe("CoreBinOp");
    });
});

describe("Record Update - Multiple Fields", () => {
    it("should desugar two field update", () => {
        // { person | age: 31, name: "Alice" }
        const update: Expr = {
            kind: "RecordUpdate",
            record: { kind: "Var", name: "person", loc: testLoc },
            updates: [
                {
                    name: "age",
                    value: { kind: "IntLit", value: 31, loc: testLoc },
                    loc: testLoc,
                },
                {
                    name: "name",
                    value: { kind: "StringLit", value: "Alice", loc: testLoc },
                    loc: testLoc,
                },
            ],
            loc: testLoc,
        };

        const result = desugar(update);

        expect(result.kind).toBe("CoreRecordUpdate");
        expect((result as CoreRecordUpdate).updates).toHaveLength(2);
        expect((result as CoreRecordUpdate).updates[0].name).toBe("age");
        expect((result as CoreRecordUpdate).updates[0].value.value).toBe(31);
        expect((result as CoreRecordUpdate).updates[1].name).toBe("name");
        expect((result as CoreRecordUpdate).updates[1].value.value).toBe("Alice");
    });

    it("should desugar three field update", () => {
        // { config | host: "localhost", port: 8080, debug: true }
        const update: Expr = {
            kind: "RecordUpdate",
            record: { kind: "Var", name: "config", loc: testLoc },
            updates: [
                {
                    name: "host",
                    value: { kind: "StringLit", value: "localhost", loc: testLoc },
                    loc: testLoc,
                },
                {
                    name: "port",
                    value: { kind: "IntLit", value: 8080, loc: testLoc },
                    loc: testLoc,
                },
                {
                    name: "debug",
                    value: { kind: "BoolLit", value: true, loc: testLoc },
                    loc: testLoc,
                },
            ],
            loc: testLoc,
        };

        const result = desugar(update);

        expect(result.kind).toBe("CoreRecordUpdate");
        expect((result as CoreRecordUpdate).updates).toHaveLength(3);
        expect((result as CoreRecordUpdate).updates[0].name).toBe("host");
        expect((result as CoreRecordUpdate).updates[1].name).toBe("port");
        expect((result as CoreRecordUpdate).updates[2].name).toBe("debug");
    });
});

describe("Record Update - Nested Updates", () => {
    it("should desugar nested record update", () => {
        // { outer | inner: { inner | value: 42 } }
        const innerUpdate: Expr = {
            kind: "RecordUpdate",
            record: { kind: "Var", name: "inner", loc: testLoc },
            updates: [
                {
                    name: "value",
                    value: { kind: "IntLit", value: 42, loc: testLoc },
                    loc: testLoc,
                },
            ],
            loc: testLoc,
        };

        const outerUpdate: Expr = {
            kind: "RecordUpdate",
            record: { kind: "Var", name: "outer", loc: testLoc },
            updates: [
                {
                    name: "inner",
                    value: innerUpdate,
                    loc: testLoc,
                },
            ],
            loc: testLoc,
        };

        const result = desugar(outerUpdate);

        expect(result.kind).toBe("CoreRecordUpdate");
        expect((result as CoreRecordUpdate).updates[0].name).toBe("inner");
        // Inner value should be a desugared record update
        expect((result as CoreRecordUpdate).updates[0].value.kind).toBe("CoreRecordUpdate");
        expect((result as CoreRecordUpdate).updates[0].value.record.name).toBe("inner");
    });

    it("should desugar double nested update", () => {
        // { a | b: { b | c: { c | value: 10 } } }
        const innermost: Expr = {
            kind: "RecordUpdate",
            record: { kind: "Var", name: "c", loc: testLoc },
            updates: [
                {
                    name: "value",
                    value: { kind: "IntLit", value: 10, loc: testLoc },
                    loc: testLoc,
                },
            ],
            loc: testLoc,
        };

        const middle: Expr = {
            kind: "RecordUpdate",
            record: { kind: "Var", name: "b", loc: testLoc },
            updates: [
                {
                    name: "c",
                    value: innermost,
                    loc: testLoc,
                },
            ],
            loc: testLoc,
        };

        const outer: Expr = {
            kind: "RecordUpdate",
            record: { kind: "Var", name: "a", loc: testLoc },
            updates: [
                {
                    name: "b",
                    value: middle,
                    loc: testLoc,
                },
            ],
            loc: testLoc,
        };

        const result = desugar(outer);

        expect(result.kind).toBe("CoreRecordUpdate");
        const middleResult = (result as CoreRecordUpdate).updates[0].value;
        expect(middleResult.kind).toBe("CoreRecordUpdate");
        const innermostResult = middleResult.updates[0].value;
        expect(innermostResult.kind).toBe("CoreRecordUpdate");
    });
});

describe("Record Update - Complex Expressions", () => {
    it("should desugar update with lambda expression", () => {
        // { obj | callback: (x) => x + 1 }
        const update: Expr = {
            kind: "RecordUpdate",
            record: { kind: "Var", name: "obj", loc: testLoc },
            updates: [
                {
                    name: "callback",
                    value: {
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
                    },
                    loc: testLoc,
                },
            ],
            loc: testLoc,
        };

        const result = desugar(update);

        expect(result.kind).toBe("CoreRecordUpdate");
        expect((result as CoreRecordUpdate).updates[0].value.kind).toBe("CoreLambda");
    });

    it("should desugar update with match expression", () => {
        // { obj | result: match value { | Some(x) => x | None => 0 } }
        const update: Expr = {
            kind: "RecordUpdate",
            record: { kind: "Var", name: "obj", loc: testLoc },
            updates: [
                {
                    name: "result",
                    value: {
                        kind: "Match",
                        expr: { kind: "Var", name: "value", loc: testLoc },
                        cases: [
                            {
                                pattern: {
                                    kind: "ConstructorPattern",
                                    constructor: "Some",
                                    args: [{ kind: "VarPattern", name: "x", loc: testLoc }],
                                    loc: testLoc,
                                },
                                body: { kind: "Var", name: "x", loc: testLoc },
                                loc: testLoc,
                            },
                            {
                                pattern: {
                                    kind: "ConstructorPattern",
                                    constructor: "None",
                                    args: [],
                                    loc: testLoc,
                                },
                                body: { kind: "IntLit", value: 0, loc: testLoc },
                                loc: testLoc,
                            },
                        ],
                        loc: testLoc,
                    },
                    loc: testLoc,
                },
            ],
            loc: testLoc,
        };

        const result = desugar(update);

        expect(result.kind).toBe("CoreRecordUpdate");
        expect((result as CoreRecordUpdate).updates[0].value.kind).toBe("CoreMatch");
    });

    it("should desugar update with record construction", () => {
        // { outer | inner: { x: 1, y: 2 } }
        const update: Expr = {
            kind: "RecordUpdate",
            record: { kind: "Var", name: "outer", loc: testLoc },
            updates: [
                {
                    name: "inner",
                    value: {
                        kind: "Record",
                        fields: [
                            {
                                name: "x",
                                value: { kind: "IntLit", value: 1, loc: testLoc },
                                loc: testLoc,
                            },
                            {
                                name: "y",
                                value: { kind: "IntLit", value: 2, loc: testLoc },
                                loc: testLoc,
                            },
                        ],
                        loc: testLoc,
                    },
                    loc: testLoc,
                },
            ],
            loc: testLoc,
        };

        const result = desugar(update);

        expect(result.kind).toBe("CoreRecordUpdate");
        expect((result as CoreRecordUpdate).updates[0].value.kind).toBe("CoreRecord");
        expect((result as CoreRecordUpdate).updates[0].value.fields).toHaveLength(2);
    });
});

describe("Record Update - Base Record Expressions", () => {
    it("should desugar update with record access as base", () => {
        // { obj.field | value: 42 }
        const update: Expr = {
            kind: "RecordUpdate",
            record: {
                kind: "RecordAccess",
                record: { kind: "Var", name: "obj", loc: testLoc },
                field: "field",
                loc: testLoc,
            },
            updates: [
                {
                    name: "value",
                    value: { kind: "IntLit", value: 42, loc: testLoc },
                    loc: testLoc,
                },
            ],
            loc: testLoc,
        };

        const result = desugar(update);

        expect(result.kind).toBe("CoreRecordUpdate");
        expect((result as CoreRecordUpdate).record.kind).toBe("CoreRecordAccess");
        expect((result as CoreRecordUpdate).record.field).toBe("field");
    });

    it("should desugar update with function call as base", () => {
        // { getRecord() | value: 42 }
        const update: Expr = {
            kind: "RecordUpdate",
            record: {
                kind: "App",
                func: { kind: "Var", name: "getRecord", loc: testLoc },
                args: [],
                loc: testLoc,
            },
            updates: [
                {
                    name: "value",
                    value: { kind: "IntLit", value: 42, loc: testLoc },
                    loc: testLoc,
                },
            ],
            loc: testLoc,
        };

        const result = desugar(update);

        expect(result.kind).toBe("CoreRecordUpdate");
        expect((result as CoreRecordUpdate).record.kind).toBe("CoreApp");
    });

    it("should desugar update with record literal as base", () => {
        // { { x: 1, y: 2 } | x: 10 }
        const update: Expr = {
            kind: "RecordUpdate",
            record: {
                kind: "Record",
                fields: [
                    {
                        name: "x",
                        value: { kind: "IntLit", value: 1, loc: testLoc },
                        loc: testLoc,
                    },
                    {
                        name: "y",
                        value: { kind: "IntLit", value: 2, loc: testLoc },
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            },
            updates: [
                {
                    name: "x",
                    value: { kind: "IntLit", value: 10, loc: testLoc },
                    loc: testLoc,
                },
            ],
            loc: testLoc,
        };

        const result = desugar(update);

        expect(result.kind).toBe("CoreRecordUpdate");
        expect((result as CoreRecordUpdate).record.kind).toBe("CoreRecord");
        expect((result as CoreRecordUpdate).record.fields).toHaveLength(2);
    });
});

describe("Record Update - Source Locations", () => {
    it("should preserve source locations", () => {
        const updateLoc: Location = {
            file: "test.vf",
            line: 42,
            column: 10,
            offset: 500,
        };

        const update: Expr = {
            kind: "RecordUpdate",
            record: { kind: "Var", name: "record", loc: testLoc },
            updates: [
                {
                    name: "field",
                    value: { kind: "IntLit", value: 1, loc: testLoc },
                    loc: testLoc,
                },
            ],
            loc: updateLoc,
        };

        const result = desugar(update);

        expect(result.loc).toBe(updateLoc);
    });
});
