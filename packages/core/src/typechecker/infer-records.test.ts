/**
 * Tests for type inference - records and record type annotations
 */

import type {
    CoreRecord,
    CoreRecordAccess,
    CoreRecordField,
    CoreRecordUpdate,
    CoreTypeAnnotation,
    CoreVar,
} from "../types/core-ast.js";
import type { Type, TypeEnv } from "../types/environment.js";
import type { InferenceContext } from "./infer.js";

import { beforeEach, describe, expect, it } from "vitest";

import { TypeError } from "../utils/error.js";
import { getBuiltinEnv } from "./builtins.js";
import { createContext, inferExpr } from "./infer.js";
import { primitiveTypes, resetTypeVarCounter } from "./types.js";

const testLoc = { file: "test.vf", line: 1, column: 1, offset: 0 };

function createTestEnv(): TypeEnv {
    const builtins = getBuiltinEnv();
    const values = new Map();

    // Convert builtin type schemes to Value bindings
    for (const [name, scheme] of builtins.entries()) {
        values.set(name, {
            kind: "Value" as const,
            scheme,
            loc: { file: "<builtin>", line: 0, column: 0, offset: 0 },
        });
    }

    return {
        values,
        types: new Map(),
    };
}

describe("Type Inference - Records", () => {
    beforeEach(() => {
        resetTypeVarCounter();
    });

    it("should infer type for empty record", () => {
        // {}
        const expr: CoreRecord = {
            kind: "CoreRecord",
            fields: [],
            loc: testLoc,
        };

        const env = createTestEnv();
        const ctx = createContext(env);

        const result = inferExpr(ctx, expr);

        expect(result.type.type).toBe("Record");
        if (result.type.type === "Record") {
            expect(result.type.fields.size).toBe(0);
        }
    });

    it("should infer type for simple record", () => {
        // { x: 42, y: "hello" }
        const xField: CoreRecordField = {
            kind: "Field",
            name: "x",
            value: { kind: "CoreIntLit", value: 42, loc: testLoc },
            loc: testLoc,
        };
        const yField: CoreRecordField = {
            kind: "Field",
            name: "y",
            value: { kind: "CoreStringLit", value: "hello", loc: testLoc },
            loc: testLoc,
        };
        const expr: CoreRecord = {
            kind: "CoreRecord",
            fields: [xField, yField],
            loc: testLoc,
        };

        const env = createTestEnv();
        const ctx = createContext(env);

        const result = inferExpr(ctx, expr);

        expect(result.type.type).toBe("Record");
        if (result.type.type === "Record") {
            expect(result.type.fields.size).toBe(2);
            expect(result.type.fields.get("x")).toEqual(primitiveTypes.Int);
            expect(result.type.fields.get("y")).toEqual(primitiveTypes.String);
        }
    });

    it("should infer type for record field access", () => {
        // Given r : { x: Int, y: String }, r.x should have type Int
        const env = createTestEnv();

        const recordType: Type = {
            type: "Record",
            fields: new Map([
                ["x", primitiveTypes.Int],
                ["y", primitiveTypes.String],
            ]),
        };
        env.values.set("r", {
            kind: "Value",
            scheme: { vars: [], type: recordType },
            loc: testLoc,
        });

        const ctx = createContext(env);

        // r.x
        const rVar: CoreVar = { kind: "CoreVar", name: "r", loc: testLoc };
        const expr: CoreRecordAccess = {
            kind: "CoreRecordAccess",
            record: rVar,
            field: "x",
            loc: testLoc,
        };

        const result = inferExpr(ctx, expr);

        expect(result.type).toEqual(primitiveTypes.Int);
    });

    it("should reject accessing non-existent field", () => {
        // Given r : { x: Int }, r.z should fail
        const env = createTestEnv();

        const recordType: Type = {
            type: "Record",
            fields: new Map([["x", primitiveTypes.Int]]),
        };
        env.values.set("r", {
            kind: "Value",
            scheme: { vars: [], type: recordType },
            loc: testLoc,
        });

        const ctx = createContext(env);

        // r.z
        const rVar: CoreVar = { kind: "CoreVar", name: "r", loc: testLoc };
        const expr: CoreRecordAccess = {
            kind: "CoreRecordAccess",
            record: rVar,
            field: "z",
            loc: testLoc,
        };

        expect(() => inferExpr(ctx, expr)).toThrow(TypeError);
    });

    it("should reject accessing field on non-record", () => {
        // Given x : Int, x.field should fail
        const env = createTestEnv();

        env.values.set("x", {
            kind: "Value",
            scheme: { vars: [], type: primitiveTypes.Int },
            loc: testLoc,
        });

        const ctx = createContext(env);

        // x.field
        const xVar: CoreVar = { kind: "CoreVar", name: "x", loc: testLoc };
        const expr: CoreRecordAccess = {
            kind: "CoreRecordAccess",
            record: xVar,
            field: "field",
            loc: testLoc,
        };

        expect(() => inferExpr(ctx, expr)).toThrow(TypeError);
    });

    it("should infer type for record update", () => {
        // Given r : { x: Int, y: String }, { r with x = 100 } should have type { x: Int, y: String }
        const env = createTestEnv();

        const recordType: Type = {
            type: "Record",
            fields: new Map([
                ["x", primitiveTypes.Int],
                ["y", primitiveTypes.String],
            ]),
        };
        env.values.set("r", {
            kind: "Value",
            scheme: { vars: [], type: recordType },
            loc: testLoc,
        });

        const ctx = createContext(env);

        // { r with x = 100 }
        const rVar: CoreVar = { kind: "CoreVar", name: "r", loc: testLoc };
        const updateField: CoreRecordField = {
            kind: "Field",
            name: "x",
            value: { kind: "CoreIntLit", value: 100, loc: testLoc },
            loc: testLoc,
        };
        const expr: CoreRecordUpdate = {
            kind: "CoreRecordUpdate",
            record: rVar,
            updates: [updateField],
            loc: testLoc,
        };

        const result = inferExpr(ctx, expr);

        expect(result.type.type).toBe("Record");
        if (result.type.type === "Record") {
            expect(result.type.fields.size).toBe(2);
            expect(result.type.fields.get("x")).toEqual(primitiveTypes.Int);
            expect(result.type.fields.get("y")).toEqual(primitiveTypes.String);
        }
    });

    it("should reject updating non-existent field", () => {
        // Given r : { x: Int }, { r with z = 42 } should fail
        const env = createTestEnv();

        const recordType: Type = {
            type: "Record",
            fields: new Map([["x", primitiveTypes.Int]]),
        };
        env.values.set("r", {
            kind: "Value",
            scheme: { vars: [], type: recordType },
            loc: testLoc,
        });

        const ctx = createContext(env);

        // { r with z = 42 }
        const rVar: CoreVar = { kind: "CoreVar", name: "r", loc: testLoc };
        const updateField: CoreRecordField = {
            kind: "Field",
            name: "z",
            value: { kind: "CoreIntLit", value: 42, loc: testLoc },
            loc: testLoc,
        };
        const expr: CoreRecordUpdate = {
            kind: "CoreRecordUpdate",
            record: rVar,
            updates: [updateField],
            loc: testLoc,
        };

        expect(() => inferExpr(ctx, expr)).toThrow(TypeError);
    });

    it("should reject type mismatch in record update", () => {
        // Given r : { x: Int }, { r with x = "hello" } should fail
        const env = createTestEnv();

        const recordType: Type = {
            type: "Record",
            fields: new Map([["x", primitiveTypes.Int]]),
        };
        env.values.set("r", {
            kind: "Value",
            scheme: { vars: [], type: recordType },
            loc: testLoc,
        });

        const ctx = createContext(env);

        // { r with x = "hello" }
        const rVar: CoreVar = { kind: "CoreVar", name: "r", loc: testLoc };
        const updateField: CoreRecordField = {
            kind: "Field",
            name: "x",
            value: { kind: "CoreStringLit", value: "hello", loc: testLoc },
            loc: testLoc,
        };
        const expr: CoreRecordUpdate = {
            kind: "CoreRecordUpdate",
            record: rVar,
            updates: [updateField],
            loc: testLoc,
        };

        expect(() => inferExpr(ctx, expr)).toThrow(TypeError);
    });
});

describe("Type Annotations", () => {
    let ctx: InferenceContext;

    beforeEach(() => {
        resetTypeVarCounter();
        const env = createTestEnv();
        ctx = createContext(env);
    });

    it("should convert record type annotations", () => {
        // ({ x: 42, y: 100 }: { x: Int, y: Int })
        const expr: CoreTypeAnnotation = {
            kind: "CoreTypeAnnotation",
            expr: {
                kind: "CoreRecord",
                fields: [
                    { kind: "Field", name: "x", value: { kind: "CoreIntLit", value: 42, loc: testLoc }, loc: testLoc },
                    { kind: "Field", name: "y", value: { kind: "CoreIntLit", value: 100, loc: testLoc }, loc: testLoc },
                ],
                loc: testLoc,
            },
            typeExpr: {
                kind: "CoreRecordType",
                fields: [
                    {
                        name: "x",
                        typeExpr: { kind: "CoreTypeConst", name: "Int", loc: testLoc },
                        loc: testLoc,
                    },
                    {
                        name: "y",
                        typeExpr: { kind: "CoreTypeConst", name: "Int", loc: testLoc },
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            },
            loc: testLoc,
        };

        const result = inferExpr(ctx, expr);

        expect(result.type.type).toBe("Record");
        if (result.type.type === "Record") {
            expect(result.type.fields.get("x")).toEqual(primitiveTypes.Int);
            expect(result.type.fields.get("y")).toEqual(primitiveTypes.Int);
        }
    });

    it("should error on type variable in annotation", () => {
        // (42: 'a) - type variables not supported in annotations
        const expr: CoreTypeAnnotation = {
            kind: "CoreTypeAnnotation",
            expr: { kind: "CoreIntLit", value: 42, loc: testLoc },
            typeExpr: {
                kind: "CoreTypeVar",
                name: "a",
                loc: testLoc,
            },
            loc: testLoc,
        };

        expect(() => inferExpr(ctx, expr)).toThrow("Type variables are not yet supported");
    });

    it("should error on inline variant type in annotation", () => {
        // (42: Some(Int) | None) - inline variants not supported
        const expr: CoreTypeAnnotation = {
            kind: "CoreTypeAnnotation",
            expr: { kind: "CoreIntLit", value: 42, loc: testLoc },
            typeExpr: {
                kind: "CoreVariantType",
                constructors: [
                    {
                        name: "Some",
                        args: [{ kind: "CoreTypeConst", name: "Int", loc: testLoc }],
                        loc: testLoc,
                    },
                    {
                        name: "None",
                        args: [],
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            },
            loc: testLoc,
        };

        expect(() => inferExpr(ctx, expr)).toThrow("Inline variant types are not supported");
    });
});
