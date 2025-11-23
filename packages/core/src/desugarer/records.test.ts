/**
 * Tests for record update desugaring
 *
 * Record update syntax: { record | field1: value1, field2: value2 }
 * Desugars to: CoreRecordUpdate preserving update semantics for code generator
 */

import type { Expr, Location } from "../types/ast.js";
import type {
    CoreIntLit,
    CoreRecord,
    CoreRecordAccess,
    CoreRecordUpdate,
    CoreStringLit,
    CoreVar,
} from "../types/core-ast.js";

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
                    kind: "Field",
                    name: "age",
                    value: { kind: "IntLit", value: 31, loc: testLoc },
                    loc: testLoc,
                },
            ],
            loc: testLoc,
        };

        const result = desugar(update) as CoreRecordUpdate;

        expect(result.kind).toBe("CoreRecordUpdate");
        expect(result.record.kind).toBe("CoreVar");
        expect((result.record as CoreVar).name).toBe("person");
        expect(result.updates).toHaveLength(1);
        expect((result.updates[0]! as { name: string }).name).toBe("age");
        expect((result.updates[0]! as { value: { kind: string } }).value.kind).toBe("CoreIntLit");
        expect((result.updates[0]! as { value: CoreIntLit }).value.value).toBe(31);
    });

    it("should desugar field update with expression", () => {
        // { point | x: point.x + 1 }
        const update: Expr = {
            kind: "RecordUpdate",
            record: { kind: "Var", name: "point", loc: testLoc },
            updates: [
                {
                    kind: "Field",
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

        const result = desugar(update) as CoreRecordUpdate;

        expect(result.kind).toBe("CoreRecordUpdate");
        expect((result.updates[0]! as { name: string }).name).toBe("x");
        // Value should be desugared BinOp
        expect((result.updates[0]! as { value: { kind: string } }).value.kind).toBe("CoreBinOp");
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
                    kind: "Field",
                    name: "age",
                    value: { kind: "IntLit", value: 31, loc: testLoc },
                    loc: testLoc,
                },
                {
                    kind: "Field",
                    name: "name",
                    value: { kind: "StringLit", value: "Alice", loc: testLoc },
                    loc: testLoc,
                },
            ],
            loc: testLoc,
        };

        const result = desugar(update) as CoreRecordUpdate;

        expect(result.kind).toBe("CoreRecordUpdate");
        expect(result.updates).toHaveLength(2);
        expect((result.updates[0]! as { name: string }).name).toBe("age");
        expect((result.updates[0]! as { value: CoreIntLit }).value.value).toBe(31);
        expect((result.updates[1]! as { name: string }).name).toBe("name");
        expect((result.updates[1]! as { value: CoreStringLit }).value.value).toBe("Alice");
    });

    it("should desugar three field update", () => {
        // { config | host: "localhost", port: 8080, debug: true }
        const update: Expr = {
            kind: "RecordUpdate",
            record: { kind: "Var", name: "config", loc: testLoc },
            updates: [
                {
                    kind: "Field",
                    name: "host",
                    value: { kind: "StringLit", value: "localhost", loc: testLoc },
                    loc: testLoc,
                },
                {
                    kind: "Field",
                    name: "port",
                    value: { kind: "IntLit", value: 8080, loc: testLoc },
                    loc: testLoc,
                },
                {
                    kind: "Field",
                    name: "debug",
                    value: { kind: "BoolLit", value: true, loc: testLoc },
                    loc: testLoc,
                },
            ],
            loc: testLoc,
        };

        const result = desugar(update) as CoreRecordUpdate;

        expect(result.kind).toBe("CoreRecordUpdate");
        expect(result.updates).toHaveLength(3);
        expect((result.updates[0]! as { name: string }).name).toBe("host");
        expect((result.updates[1]! as { name: string }).name).toBe("port");
        expect((result.updates[2]! as { name: string }).name).toBe("debug");
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
                    kind: "Field",
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
                    kind: "Field",
                    name: "inner",
                    value: innerUpdate,
                    loc: testLoc,
                },
            ],
            loc: testLoc,
        };

        const result = desugar(outerUpdate) as CoreRecordUpdate;

        expect(result.kind).toBe("CoreRecordUpdate");
        expect((result.updates[0]! as { name: string }).name).toBe("inner");
        // Inner value should be a desugared record update
        expect((result.updates[0]! as { value: { kind: string } }).value.kind).toBe("CoreRecordUpdate");
        expect((result.updates[0]! as { value: CoreRecordUpdate }).value.record.kind).toBe("CoreVar");
        expect(((result.updates[0]! as { value: CoreRecordUpdate }).value.record as CoreVar).name).toBe("inner");
    });

    it("should desugar double nested update", () => {
        // { a | b: { b | c: { c | value: 10 } } }
        const innermost: Expr = {
            kind: "RecordUpdate",
            record: { kind: "Var", name: "c", loc: testLoc },
            updates: [
                {
                    kind: "Field",
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
                    kind: "Field",
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
                    kind: "Field",
                    name: "b",
                    value: middle,
                    loc: testLoc,
                },
            ],
            loc: testLoc,
        };

        const result = desugar(outer) as CoreRecordUpdate;

        expect(result.kind).toBe("CoreRecordUpdate");
        const middleResult = (result.updates[0]! as { value: unknown }).value as CoreRecordUpdate;
        expect(middleResult.kind).toBe("CoreRecordUpdate");
        const innermostField = middleResult.updates[0]!;
        const innermostResult =
            innermostField.kind === "Field"
                ? (innermostField.value as CoreRecordUpdate)
                : (innermostField.expr as CoreRecordUpdate);
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
                    kind: "Field",
                    name: "callback",
                    value: {
                        kind: "Lambda",
                        params: [{ pattern: { kind: "VarPattern", name: "x", loc: testLoc }, loc: testLoc }],
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

        const result = desugar(update) as CoreRecordUpdate;

        expect(result.kind).toBe("CoreRecordUpdate");
        expect((result.updates[0]! as { value: { kind: string } }).value.kind).toBe("CoreLambda");
    });

    it("should desugar update with match expression", () => {
        // { obj | result: match value { | Some(x) => x | None => 0 } }
        const update: Expr = {
            kind: "RecordUpdate",
            record: { kind: "Var", name: "obj", loc: testLoc },
            updates: [
                {
                    kind: "Field",
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

        const result = desugar(update) as CoreRecordUpdate;

        expect(result.kind).toBe("CoreRecordUpdate");
        expect((result.updates[0]! as { value: { kind: string } }).value.kind).toBe("CoreMatch");
    });

    it("should desugar update with record construction", () => {
        // { outer | inner: { x: 1, y: 2 } }
        const update: Expr = {
            kind: "RecordUpdate",
            record: { kind: "Var", name: "outer", loc: testLoc },
            updates: [
                {
                    kind: "Field",
                    name: "inner",
                    value: {
                        kind: "Record",
                        fields: [
                            {
                                kind: "Field",
                                name: "x",
                                value: { kind: "IntLit", value: 1, loc: testLoc },
                                loc: testLoc,
                            },
                            {
                                kind: "Field",
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

        const result = desugar(update) as CoreRecordUpdate;

        expect(result.kind).toBe("CoreRecordUpdate");
        expect((result.updates[0]! as { value: { kind: string } }).value.kind).toBe("CoreRecord");
        expect((result.updates[0]! as { value: CoreRecord }).value.fields).toHaveLength(2);
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
                    kind: "Field",
                    name: "value",
                    value: { kind: "IntLit", value: 42, loc: testLoc },
                    loc: testLoc,
                },
            ],
            loc: testLoc,
        };

        const result = desugar(update) as CoreRecordUpdate;

        expect(result.kind).toBe("CoreRecordUpdate");
        expect(result.record.kind).toBe("CoreRecordAccess");
        expect((result.record as CoreRecordAccess).field).toBe("field");
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
                    kind: "Field",
                    name: "value",
                    value: { kind: "IntLit", value: 42, loc: testLoc },
                    loc: testLoc,
                },
            ],
            loc: testLoc,
        };

        const result = desugar(update) as CoreRecordUpdate;

        expect(result.kind).toBe("CoreRecordUpdate");
        expect(result.record.kind).toBe("CoreApp");
    });

    it("should desugar update with record literal as base", () => {
        // { { x: 1, y: 2 } | x: 10 }
        const update: Expr = {
            kind: "RecordUpdate",
            record: {
                kind: "Record",
                fields: [
                    {
                        kind: "Field",
                        name: "x",
                        value: { kind: "IntLit", value: 1, loc: testLoc },
                        loc: testLoc,
                    },
                    {
                        kind: "Field",
                        name: "y",
                        value: { kind: "IntLit", value: 2, loc: testLoc },
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            },
            updates: [
                {
                    kind: "Field",
                    name: "x",
                    value: { kind: "IntLit", value: 10, loc: testLoc },
                    loc: testLoc,
                },
            ],
            loc: testLoc,
        };

        const result = desugar(update) as CoreRecordUpdate;

        expect(result.kind).toBe("CoreRecordUpdate");
        expect(result.record.kind).toBe("CoreRecord");
        expect((result.record as CoreRecord).fields).toHaveLength(2);
    });
});

describe("Record Spread - Multiple Spreads", () => {
    it("should desugar record with multiple spreads", () => {
        // {...r1, ...r2, x: 1}
        const record: Expr = {
            kind: "Record",
            fields: [
                { kind: "Spread", expr: { kind: "Var", name: "r1", loc: testLoc }, loc: testLoc },
                { kind: "Spread", expr: { kind: "Var", name: "r2", loc: testLoc }, loc: testLoc },
                { kind: "Field", name: "x", value: { kind: "IntLit", value: 1, loc: testLoc }, loc: testLoc },
            ],
            loc: testLoc,
        };

        const result = desugar(record) as CoreRecord;

        expect(result.kind).toBe("CoreRecord");
        expect(result.fields).toHaveLength(3);
        expect(result.fields[0]!.kind).toBe("Spread");
        expect(result.fields[1]!.kind).toBe("Spread");
        expect(result.fields[2]!.kind).toBe("Field");
    });

    it("should desugar record with three spreads", () => {
        // {...r1, ...r2, ...r3}
        const record: Expr = {
            kind: "Record",
            fields: [
                { kind: "Spread", expr: { kind: "Var", name: "r1", loc: testLoc }, loc: testLoc },
                { kind: "Spread", expr: { kind: "Var", name: "r2", loc: testLoc }, loc: testLoc },
                { kind: "Spread", expr: { kind: "Var", name: "r3", loc: testLoc }, loc: testLoc },
            ],
            loc: testLoc,
        };

        const result = desugar(record) as CoreRecord;

        expect(result.kind).toBe("CoreRecord");
        expect(result.fields).toHaveLength(3);
        expect(result.fields[0]!.kind).toBe("Spread");
        expect(result.fields[1]!.kind).toBe("Spread");
        expect(result.fields[2]!.kind).toBe("Spread");
    });
});

describe("Record Spread - Nested Records", () => {
    it("should desugar nested record with spread", () => {
        // {user: {...person, age: 31}}
        const record: Expr = {
            kind: "Record",
            fields: [
                {
                    kind: "Field",
                    name: "user",
                    value: {
                        kind: "Record",
                        fields: [
                            { kind: "Spread", expr: { kind: "Var", name: "person", loc: testLoc }, loc: testLoc },
                            {
                                kind: "Field",
                                name: "age",
                                value: { kind: "IntLit", value: 31, loc: testLoc },
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

        const result = desugar(record) as CoreRecord;

        expect(result.kind).toBe("CoreRecord");
        expect(result.fields).toHaveLength(1);
        const userField = result.fields[0]! as { value: CoreRecord };
        expect(userField.value.kind).toBe("CoreRecord");
        expect(userField.value.fields).toHaveLength(2);
    });

    it("should desugar deeply nested records with spreads", () => {
        // {a: {b: {...c}}}
        const record: Expr = {
            kind: "Record",
            fields: [
                {
                    kind: "Field",
                    name: "a",
                    value: {
                        kind: "Record",
                        fields: [
                            {
                                kind: "Field",
                                name: "b",
                                value: {
                                    kind: "Record",
                                    fields: [
                                        {
                                            kind: "Spread",
                                            expr: { kind: "Var", name: "c", loc: testLoc },
                                            loc: testLoc,
                                        },
                                    ],
                                    loc: testLoc,
                                },
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

        const result = desugar(record) as CoreRecord;

        expect(result.kind).toBe("CoreRecord");
        // Navigate to deeply nested spread
        const aField = result.fields[0]! as { value: CoreRecord };
        const bField = aField.value.fields[0]! as { value: CoreRecord };
        expect(bField.value.fields[0]!.kind).toBe("Spread");
    });
});

describe("Record Spread - Empty Spread", () => {
    it("should desugar empty record spread", () => {
        // {...{}}
        const record: Expr = {
            kind: "Record",
            fields: [
                {
                    kind: "Spread",
                    expr: { kind: "Record", fields: [], loc: testLoc },
                    loc: testLoc,
                },
            ],
            loc: testLoc,
        };

        const result = desugar(record) as CoreRecord;

        expect(result.kind).toBe("CoreRecord");
        expect(result.fields).toHaveLength(1);
        expect(result.fields[0]!.kind).toBe("Spread");
    });
});

describe("Record Spread - Field Shadowing", () => {
    it("should preserve field shadowing order", () => {
        // {...r, x: 1, ...s, x: 2}
        // Code generator handles shadowing semantics
        const record: Expr = {
            kind: "Record",
            fields: [
                { kind: "Spread", expr: { kind: "Var", name: "r", loc: testLoc }, loc: testLoc },
                { kind: "Field", name: "x", value: { kind: "IntLit", value: 1, loc: testLoc }, loc: testLoc },
                { kind: "Spread", expr: { kind: "Var", name: "s", loc: testLoc }, loc: testLoc },
                { kind: "Field", name: "x", value: { kind: "IntLit", value: 2, loc: testLoc }, loc: testLoc },
            ],
            loc: testLoc,
        };

        const result = desugar(record) as CoreRecord;

        expect(result.kind).toBe("CoreRecord");
        expect(result.fields).toHaveLength(4);
        // Order preserved for code generator
        expect(result.fields[0]!.kind).toBe("Spread");
        expect((result.fields[1]! as { name: string }).name).toBe("x");
        expect(result.fields[2]!.kind).toBe("Spread");
        expect((result.fields[3]! as { name: string }).name).toBe("x");
    });

    it("should handle spread between same-named fields", () => {
        // {x: 1, ...middle, x: 2}
        const record: Expr = {
            kind: "Record",
            fields: [
                { kind: "Field", name: "x", value: { kind: "IntLit", value: 1, loc: testLoc }, loc: testLoc },
                { kind: "Spread", expr: { kind: "Var", name: "middle", loc: testLoc }, loc: testLoc },
                { kind: "Field", name: "x", value: { kind: "IntLit", value: 2, loc: testLoc }, loc: testLoc },
            ],
            loc: testLoc,
        };

        const result = desugar(record) as CoreRecord;

        expect(result.kind).toBe("CoreRecord");
        expect(result.fields).toHaveLength(3);
        // All fields preserved in order
        expect((result.fields[0]! as { name: string }).name).toBe("x");
        expect(result.fields[1]!.kind).toBe("Spread");
        expect((result.fields[2]! as { name: string }).name).toBe("x");
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
                    kind: "Field",
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
