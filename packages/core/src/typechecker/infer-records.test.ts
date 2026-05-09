/**
 * Tests for type inference - records and record type annotations
 */

import type {
    CoreIntLit,
    CoreLet,
    CoreRecord,
    CoreRecordAccess,
    CoreRecordField,
    CoreRecordUpdate,
    CoreTypeAnnotation,
    CoreVar,
    CoreVarPattern,
} from "../types/core-ast.js";
import type { Type, TypeEnv } from "../types/environment.js";
import type { InferenceContext } from "./infer/index.js";

import * as fc from "fast-check";
import { beforeEach, describe, expect, it } from "vitest";

import { VibefunDiagnostic } from "../diagnostics/index.js";
import { getBuiltinEnv } from "./builtins.js";
import { createContext, inferExpr } from "./infer/index.js";
import { primitiveTypes, resetTypeVarCounter, typeEquals } from "./types.js";

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

    // Spec: 04-expressions/data-literals.md §Field Shorthand — `{ x }` is the same
    // as `{ x: x }`, so the field inherits the bound variable's type.
    // Audit: 04b F-04. The desugarer emits a Field whose value is `CoreVar("x")`,
    // so this test pins inference at exactly that post-desugar shape.
    it("should infer shorthand field type from outer let binding", () => {
        // let x = 5 in { x }
        const xPattern: CoreVarPattern = { kind: "CoreVarPattern", name: "x", loc: testLoc };
        const xValue: CoreIntLit = { kind: "CoreIntLit", value: 5, loc: testLoc };
        const xRef: CoreVar = { kind: "CoreVar", name: "x", loc: testLoc };
        const shorthandField: CoreRecordField = {
            kind: "Field",
            name: "x",
            value: xRef,
            loc: testLoc,
        };
        const record: CoreRecord = {
            kind: "CoreRecord",
            fields: [shorthandField],
            loc: testLoc,
        };
        const expr: CoreLet = {
            kind: "CoreLet",
            pattern: xPattern,
            value: xValue,
            body: record,
            mutable: false,
            loc: testLoc,
        };

        const env = createTestEnv();
        const ctx = createContext(env);

        const result = inferExpr(ctx, expr);

        expect(result.type.type).toBe("Record");
        if (result.type.type === "Record") {
            expect(result.type.fields.size).toBe(1);
            expect(result.type.fields.get("x")).toEqual(primitiveTypes.Int);
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

        expect(() => inferExpr(ctx, expr)).toThrow(VibefunDiagnostic);
        try {
            inferExpr(ctx, expr);
        } catch (e) {
            expect(e).toBeInstanceOf(VibefunDiagnostic);
            expect((e as VibefunDiagnostic).code).toBe("VF4501");
        }
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

        expect(() => inferExpr(ctx, expr)).toThrow(VibefunDiagnostic);
        try {
            inferExpr(ctx, expr);
        } catch (e) {
            expect(e).toBeInstanceOf(VibefunDiagnostic);
            expect((e as VibefunDiagnostic).code).toBe("VF4500");
        }
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

        expect(() => inferExpr(ctx, expr)).toThrow(VibefunDiagnostic);
        try {
            inferExpr(ctx, expr);
        } catch (e) {
            expect(e).toBeInstanceOf(VibefunDiagnostic);
            expect((e as VibefunDiagnostic).code).toBe("VF4501");
        }
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

        expect(() => inferExpr(ctx, expr)).toThrow(VibefunDiagnostic);
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

        expect(() => inferExpr(ctx, expr)).toThrow(VibefunDiagnostic);
        try {
            inferExpr(ctx, expr);
        } catch (e) {
            expect(e).toBeInstanceOf(VibefunDiagnostic);
            expect((e as VibefunDiagnostic).code).toBe("VF4017");
        }
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

        expect(() => inferExpr(ctx, expr)).toThrow(VibefunDiagnostic);
        try {
            inferExpr(ctx, expr);
        } catch (e) {
            expect(e).toBeInstanceOf(VibefunDiagnostic);
            expect((e as VibefunDiagnostic).code).toBe("VF4017");
        }
    });
});

describe("Record Inference Properties", () => {
    type FieldSpec = { readonly name: string; readonly kind: "Int" | "String" | "Bool" };

    const fieldNameArb = fc.constantFrom("x", "y", "z", "name", "value", "left", "right");
    const fieldKindArb = fc.constantFrom("Int", "String", "Bool") as fc.Arbitrary<FieldSpec["kind"]>;
    const fieldSpecArb: fc.Arbitrary<FieldSpec> = fc
        .tuple(fieldNameArb, fieldKindArb)
        .map(([name, kind]): FieldSpec => ({ name, kind }));

    function literalForKind(kind: FieldSpec["kind"]): import("../types/core-ast.js").CoreExpr {
        switch (kind) {
            case "Int":
                return { kind: "CoreIntLit", value: 0, loc: testLoc };
            case "String":
                return { kind: "CoreStringLit", value: "s", loc: testLoc };
            case "Bool":
                return { kind: "CoreBoolLit", value: true, loc: testLoc };
        }
    }

    function expectedType(kind: FieldSpec["kind"]): Type {
        switch (kind) {
            case "Int":
                return primitiveTypes.Int;
            case "String":
                return primitiveTypes.String;
            case "Bool":
                return primitiveTypes.Bool;
        }
    }

    it("property: empty record always infers to a Record with zero fields", () => {
        // Pin the trivial-record contract: even after running through the
        // full inference machinery, the empty literal `{}` produces a Record
        // type with an empty field map (not a fresh type variable).
        const expr: CoreRecord = { kind: "CoreRecord", fields: [], loc: testLoc };
        for (let i = 0; i < 16; i++) {
            const result = inferExpr(createContext(createTestEnv()), expr);
            expect(result.type.type).toBe("Record");
            if (result.type.type === "Record") {
                expect(result.type.fields.size).toBe(0);
            }
        }
    });

    it("property: a record literal with N distinct fields infers to a Record with N matching field types", () => {
        fc.assert(
            fc.property(
                fc.uniqueArray(fieldSpecArb, { minLength: 1, maxLength: 4, selector: (f) => f.name }),
                (specs) => {
                    const fields: CoreRecordField[] = specs.map((spec) => ({
                        kind: "Field",
                        name: spec.name,
                        value: literalForKind(spec.kind),
                        loc: testLoc,
                    }));
                    const expr: CoreRecord = { kind: "CoreRecord", fields, loc: testLoc };
                    const result = inferExpr(createContext(createTestEnv()), expr);
                    expect(result.type.type).toBe("Record");
                    if (result.type.type === "Record") {
                        expect(result.type.fields.size).toBe(specs.length);
                        for (const spec of specs) {
                            const got = result.type.fields.get(spec.name);
                            expect(got).toBeDefined();
                            if (got) {
                                expect(typeEquals(got, expectedType(spec.kind))).toBe(true);
                            }
                        }
                    }
                },
            ),
        );
    });

    it("property: record inference is deterministic — same input yields the same field set", () => {
        fc.assert(
            fc.property(
                fc.uniqueArray(fieldSpecArb, { minLength: 1, maxLength: 4, selector: (f) => f.name }),
                (specs) => {
                    const fields: CoreRecordField[] = specs.map((spec) => ({
                        kind: "Field",
                        name: spec.name,
                        value: literalForKind(spec.kind),
                        loc: testLoc,
                    }));
                    const expr: CoreRecord = { kind: "CoreRecord", fields, loc: testLoc };
                    const a = inferExpr(createContext(createTestEnv()), expr);
                    const b = inferExpr(createContext(createTestEnv()), expr);
                    expect(typeEquals(a.type, b.type)).toBe(true);
                },
            ),
        );
    });
});
