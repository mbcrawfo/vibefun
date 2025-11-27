/**
 * Tests for desugarTypeExpr
 */

import type { Location, RecordTypeField, TypeExpr, VariantConstructor } from "../types/ast.js";
import type { CoreRecordTypeField, CoreVariantConstructor } from "../types/core-ast.js";

import { describe, expect, it } from "vitest";

import { desugarTypeExpr } from "./desugarTypeExpr.js";

// Test location
const testLoc: Location = { file: "test.vf", line: 1, column: 1, offset: 0 };

// Helper to create a simple desugar function for record fields
function mockDesugarRecordField(field: RecordTypeField): CoreRecordTypeField {
    return {
        name: field.name,
        typeExpr: desugarTypeExpr(field.typeExpr, mockDesugarRecordField, mockDesugarVariantCtor),
        loc: field.loc,
    };
}

// Helper to create a simple desugar function for variant constructors
function mockDesugarVariantCtor(ctor: VariantConstructor): CoreVariantConstructor {
    return {
        name: ctor.name,
        args: ctor.args.map((arg) => desugarTypeExpr(arg, mockDesugarRecordField, mockDesugarVariantCtor)),
        loc: ctor.loc,
    };
}

describe("desugarTypeExpr", () => {
    it("should exist", () => {
        expect(desugarTypeExpr).toBeDefined();
    });

    describe("TypeVar", () => {
        it("should desugar type variable", () => {
            const typeExpr: TypeExpr = { kind: "TypeVar", name: "a", loc: testLoc };

            const result = desugarTypeExpr(typeExpr, mockDesugarRecordField, mockDesugarVariantCtor);

            expect(result.kind).toBe("CoreTypeVar");
            if (result.kind === "CoreTypeVar") {
                expect(result.name).toBe("a");
            }
        });

        it("should preserve location in type variable", () => {
            const loc: Location = { file: "module.vf", line: 5, column: 10, offset: 50 };
            const typeExpr: TypeExpr = { kind: "TypeVar", name: "b", loc };

            const result = desugarTypeExpr(typeExpr, mockDesugarRecordField, mockDesugarVariantCtor);

            expect(result.loc).toEqual(loc);
        });

        it("should preserve multi-character type variable names", () => {
            const typeExpr: TypeExpr = { kind: "TypeVar", name: "alpha", loc: testLoc };

            const result = desugarTypeExpr(typeExpr, mockDesugarRecordField, mockDesugarVariantCtor);

            if (result.kind === "CoreTypeVar") {
                expect(result.name).toBe("alpha");
            }
        });
    });

    describe("TypeConst", () => {
        it("should desugar type constant", () => {
            const typeExpr: TypeExpr = { kind: "TypeConst", name: "Int", loc: testLoc };

            const result = desugarTypeExpr(typeExpr, mockDesugarRecordField, mockDesugarVariantCtor);

            expect(result.kind).toBe("CoreTypeConst");
            if (result.kind === "CoreTypeConst") {
                expect(result.name).toBe("Int");
            }
        });

        it("should preserve location in type constant", () => {
            const loc: Location = { file: "other.vf", line: 10, column: 1, offset: 100 };
            const typeExpr: TypeExpr = { kind: "TypeConst", name: "String", loc };

            const result = desugarTypeExpr(typeExpr, mockDesugarRecordField, mockDesugarVariantCtor);

            expect(result.loc).toEqual(loc);
        });

        it("should handle custom type names", () => {
            const typeExpr: TypeExpr = { kind: "TypeConst", name: "MyCustomType", loc: testLoc };

            const result = desugarTypeExpr(typeExpr, mockDesugarRecordField, mockDesugarVariantCtor);

            if (result.kind === "CoreTypeConst") {
                expect(result.name).toBe("MyCustomType");
            }
        });
    });

    describe("TypeApp", () => {
        it("should desugar simple type application", () => {
            const typeExpr: TypeExpr = {
                kind: "TypeApp",
                constructor: { kind: "TypeConst", name: "List", loc: testLoc },
                args: [{ kind: "TypeConst", name: "Int", loc: testLoc }],
                loc: testLoc,
            };

            const result = desugarTypeExpr(typeExpr, mockDesugarRecordField, mockDesugarVariantCtor);

            expect(result.kind).toBe("CoreTypeApp");
            if (result.kind === "CoreTypeApp") {
                expect(result.constructor.kind).toBe("CoreTypeConst");
                expect(result.args).toHaveLength(1);
                expect(result.args[0]?.kind).toBe("CoreTypeConst");
            }
        });

        it("should desugar type application with multiple arguments", () => {
            const typeExpr: TypeExpr = {
                kind: "TypeApp",
                constructor: { kind: "TypeConst", name: "Either", loc: testLoc },
                args: [
                    { kind: "TypeConst", name: "String", loc: testLoc },
                    { kind: "TypeConst", name: "Int", loc: testLoc },
                ],
                loc: testLoc,
            };

            const result = desugarTypeExpr(typeExpr, mockDesugarRecordField, mockDesugarVariantCtor);

            if (result.kind === "CoreTypeApp") {
                expect(result.args).toHaveLength(2);
            }
        });

        it("should desugar type application with no arguments", () => {
            const typeExpr: TypeExpr = {
                kind: "TypeApp",
                constructor: { kind: "TypeConst", name: "Unit", loc: testLoc },
                args: [],
                loc: testLoc,
            };

            const result = desugarTypeExpr(typeExpr, mockDesugarRecordField, mockDesugarVariantCtor);

            if (result.kind === "CoreTypeApp") {
                expect(result.args).toHaveLength(0);
            }
        });

        it("should desugar nested type applications", () => {
            // List<Option<Int>>
            const typeExpr: TypeExpr = {
                kind: "TypeApp",
                constructor: { kind: "TypeConst", name: "List", loc: testLoc },
                args: [
                    {
                        kind: "TypeApp",
                        constructor: { kind: "TypeConst", name: "Option", loc: testLoc },
                        args: [{ kind: "TypeConst", name: "Int", loc: testLoc }],
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            };

            const result = desugarTypeExpr(typeExpr, mockDesugarRecordField, mockDesugarVariantCtor);

            expect(result.kind).toBe("CoreTypeApp");
            if (result.kind === "CoreTypeApp") {
                const innerArg = result.args[0];
                expect(innerArg?.kind).toBe("CoreTypeApp");
            }
        });

        it("should desugar type application with type variable constructor", () => {
            // f<Int> where f is a type variable
            const typeExpr: TypeExpr = {
                kind: "TypeApp",
                constructor: { kind: "TypeVar", name: "f", loc: testLoc },
                args: [{ kind: "TypeConst", name: "Int", loc: testLoc }],
                loc: testLoc,
            };

            const result = desugarTypeExpr(typeExpr, mockDesugarRecordField, mockDesugarVariantCtor);

            if (result.kind === "CoreTypeApp") {
                expect(result.constructor.kind).toBe("CoreTypeVar");
            }
        });

        it("should preserve location in type application", () => {
            const loc: Location = { file: "app.vf", line: 20, column: 5, offset: 200 };
            const typeExpr: TypeExpr = {
                kind: "TypeApp",
                constructor: { kind: "TypeConst", name: "List", loc: testLoc },
                args: [],
                loc,
            };

            const result = desugarTypeExpr(typeExpr, mockDesugarRecordField, mockDesugarVariantCtor);

            expect(result.loc).toEqual(loc);
        });
    });

    describe("FunctionType", () => {
        it("should desugar single parameter function type", () => {
            // Int -> String
            const typeExpr: TypeExpr = {
                kind: "FunctionType",
                params: [{ kind: "TypeConst", name: "Int", loc: testLoc }],
                return_: { kind: "TypeConst", name: "String", loc: testLoc },
                loc: testLoc,
            };

            const result = desugarTypeExpr(typeExpr, mockDesugarRecordField, mockDesugarVariantCtor);

            expect(result.kind).toBe("CoreFunctionType");
            if (result.kind === "CoreFunctionType") {
                expect(result.params).toHaveLength(1);
                expect(result.params[0]?.kind).toBe("CoreTypeConst");
                expect(result.return_.kind).toBe("CoreTypeConst");
            }
        });

        it("should desugar multiple parameter function type", () => {
            // (Int, Bool) -> String
            const typeExpr: TypeExpr = {
                kind: "FunctionType",
                params: [
                    { kind: "TypeConst", name: "Int", loc: testLoc },
                    { kind: "TypeConst", name: "Bool", loc: testLoc },
                ],
                return_: { kind: "TypeConst", name: "String", loc: testLoc },
                loc: testLoc,
            };

            const result = desugarTypeExpr(typeExpr, mockDesugarRecordField, mockDesugarVariantCtor);

            if (result.kind === "CoreFunctionType") {
                expect(result.params).toHaveLength(2);
            }
        });

        it("should desugar nested function types (higher-order)", () => {
            // (Int -> Bool) -> String
            const typeExpr: TypeExpr = {
                kind: "FunctionType",
                params: [
                    {
                        kind: "FunctionType",
                        params: [{ kind: "TypeConst", name: "Int", loc: testLoc }],
                        return_: { kind: "TypeConst", name: "Bool", loc: testLoc },
                        loc: testLoc,
                    },
                ],
                return_: { kind: "TypeConst", name: "String", loc: testLoc },
                loc: testLoc,
            };

            const result = desugarTypeExpr(typeExpr, mockDesugarRecordField, mockDesugarVariantCtor);

            if (result.kind === "CoreFunctionType") {
                expect(result.params[0]?.kind).toBe("CoreFunctionType");
            }
        });

        it("should desugar function with type variable parameters", () => {
            // 'a -> 'a
            const typeExpr: TypeExpr = {
                kind: "FunctionType",
                params: [{ kind: "TypeVar", name: "a", loc: testLoc }],
                return_: { kind: "TypeVar", name: "a", loc: testLoc },
                loc: testLoc,
            };

            const result = desugarTypeExpr(typeExpr, mockDesugarRecordField, mockDesugarVariantCtor);

            if (result.kind === "CoreFunctionType") {
                expect(result.params[0]?.kind).toBe("CoreTypeVar");
                expect(result.return_.kind).toBe("CoreTypeVar");
            }
        });

        it("should preserve location in function type", () => {
            const loc: Location = { file: "fn.vf", line: 15, column: 3, offset: 150 };
            const typeExpr: TypeExpr = {
                kind: "FunctionType",
                params: [{ kind: "TypeConst", name: "Int", loc: testLoc }],
                return_: { kind: "TypeConst", name: "Int", loc: testLoc },
                loc,
            };

            const result = desugarTypeExpr(typeExpr, mockDesugarRecordField, mockDesugarVariantCtor);

            expect(result.loc).toEqual(loc);
        });
    });

    describe("RecordType", () => {
        it("should desugar empty record type", () => {
            const typeExpr: TypeExpr = {
                kind: "RecordType",
                fields: [],
                loc: testLoc,
            };

            const result = desugarTypeExpr(typeExpr, mockDesugarRecordField, mockDesugarVariantCtor);

            expect(result.kind).toBe("CoreRecordType");
            if (result.kind === "CoreRecordType") {
                expect(result.fields).toHaveLength(0);
            }
        });

        it("should desugar record type with single field", () => {
            const typeExpr: TypeExpr = {
                kind: "RecordType",
                fields: [{ name: "x", typeExpr: { kind: "TypeConst", name: "Int", loc: testLoc }, loc: testLoc }],
                loc: testLoc,
            };

            const result = desugarTypeExpr(typeExpr, mockDesugarRecordField, mockDesugarVariantCtor);

            if (result.kind === "CoreRecordType") {
                expect(result.fields).toHaveLength(1);
                expect(result.fields[0]?.name).toBe("x");
            }
        });

        it("should desugar record type with multiple fields", () => {
            const typeExpr: TypeExpr = {
                kind: "RecordType",
                fields: [
                    { name: "x", typeExpr: { kind: "TypeConst", name: "Int", loc: testLoc }, loc: testLoc },
                    { name: "y", typeExpr: { kind: "TypeConst", name: "String", loc: testLoc }, loc: testLoc },
                ],
                loc: testLoc,
            };

            const result = desugarTypeExpr(typeExpr, mockDesugarRecordField, mockDesugarVariantCtor);

            if (result.kind === "CoreRecordType") {
                expect(result.fields).toHaveLength(2);
            }
        });

        it("should desugar record type with nested types", () => {
            const typeExpr: TypeExpr = {
                kind: "RecordType",
                fields: [
                    {
                        name: "point",
                        typeExpr: {
                            kind: "RecordType",
                            fields: [
                                {
                                    name: "x",
                                    typeExpr: { kind: "TypeConst", name: "Int", loc: testLoc },
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

            const result = desugarTypeExpr(typeExpr, mockDesugarRecordField, mockDesugarVariantCtor);

            if (result.kind === "CoreRecordType") {
                expect(result.fields[0]?.typeExpr.kind).toBe("CoreRecordType");
            }
        });

        it("should call desugarRecordTypeField for each field", () => {
            const calledNames: string[] = [];
            const trackingDesugarField = (field: RecordTypeField): CoreRecordTypeField => {
                calledNames.push(field.name);
                return mockDesugarRecordField(field);
            };

            const typeExpr: TypeExpr = {
                kind: "RecordType",
                fields: [
                    { name: "a", typeExpr: { kind: "TypeConst", name: "Int", loc: testLoc }, loc: testLoc },
                    { name: "b", typeExpr: { kind: "TypeConst", name: "Int", loc: testLoc }, loc: testLoc },
                ],
                loc: testLoc,
            };

            desugarTypeExpr(typeExpr, trackingDesugarField, mockDesugarVariantCtor);

            expect(calledNames).toContain("a");
            expect(calledNames).toContain("b");
        });

        it("should preserve location in record type", () => {
            const loc: Location = { file: "rec.vf", line: 30, column: 1, offset: 300 };
            const typeExpr: TypeExpr = {
                kind: "RecordType",
                fields: [],
                loc,
            };

            const result = desugarTypeExpr(typeExpr, mockDesugarRecordField, mockDesugarVariantCtor);

            expect(result.loc).toEqual(loc);
        });
    });

    describe("VariantType", () => {
        it("should desugar empty variant type", () => {
            const typeExpr: TypeExpr = {
                kind: "VariantType",
                constructors: [],
                loc: testLoc,
            };

            const result = desugarTypeExpr(typeExpr, mockDesugarRecordField, mockDesugarVariantCtor);

            expect(result.kind).toBe("CoreVariantType");
            if (result.kind === "CoreVariantType") {
                expect(result.constructors).toHaveLength(0);
            }
        });

        it("should desugar variant type with single constructor without args", () => {
            const typeExpr: TypeExpr = {
                kind: "VariantType",
                constructors: [{ name: "None", args: [], loc: testLoc }],
                loc: testLoc,
            };

            const result = desugarTypeExpr(typeExpr, mockDesugarRecordField, mockDesugarVariantCtor);

            if (result.kind === "CoreVariantType") {
                expect(result.constructors).toHaveLength(1);
                expect(result.constructors[0]?.name).toBe("None");
                expect(result.constructors[0]?.args).toHaveLength(0);
            }
        });

        it("should desugar variant type with constructor with args", () => {
            const typeExpr: TypeExpr = {
                kind: "VariantType",
                constructors: [
                    { name: "Some", args: [{ kind: "TypeConst", name: "Int", loc: testLoc }], loc: testLoc },
                ],
                loc: testLoc,
            };

            const result = desugarTypeExpr(typeExpr, mockDesugarRecordField, mockDesugarVariantCtor);

            if (result.kind === "CoreVariantType") {
                expect(result.constructors[0]?.args).toHaveLength(1);
            }
        });

        it("should desugar variant type with multiple constructors", () => {
            const typeExpr: TypeExpr = {
                kind: "VariantType",
                constructors: [
                    { name: "Some", args: [{ kind: "TypeVar", name: "a", loc: testLoc }], loc: testLoc },
                    { name: "None", args: [], loc: testLoc },
                ],
                loc: testLoc,
            };

            const result = desugarTypeExpr(typeExpr, mockDesugarRecordField, mockDesugarVariantCtor);

            if (result.kind === "CoreVariantType") {
                expect(result.constructors).toHaveLength(2);
            }
        });

        it("should call desugarVariantConstructor for each constructor", () => {
            const calledNames: string[] = [];
            const trackingDesugarCtor = (ctor: VariantConstructor): CoreVariantConstructor => {
                calledNames.push(ctor.name);
                return mockDesugarVariantCtor(ctor);
            };

            const typeExpr: TypeExpr = {
                kind: "VariantType",
                constructors: [
                    { name: "A", args: [], loc: testLoc },
                    { name: "B", args: [], loc: testLoc },
                ],
                loc: testLoc,
            };

            desugarTypeExpr(typeExpr, mockDesugarRecordField, trackingDesugarCtor);

            expect(calledNames).toContain("A");
            expect(calledNames).toContain("B");
        });

        it("should preserve location in variant type", () => {
            const loc: Location = { file: "var.vf", line: 40, column: 1, offset: 400 };
            const typeExpr: TypeExpr = {
                kind: "VariantType",
                constructors: [],
                loc,
            };

            const result = desugarTypeExpr(typeExpr, mockDesugarRecordField, mockDesugarVariantCtor);

            expect(result.loc).toEqual(loc);
        });
    });

    describe("UnionType", () => {
        it("should desugar union type with two types", () => {
            const typeExpr: TypeExpr = {
                kind: "UnionType",
                types: [
                    { kind: "TypeConst", name: "Int", loc: testLoc },
                    { kind: "TypeConst", name: "String", loc: testLoc },
                ],
                loc: testLoc,
            };

            const result = desugarTypeExpr(typeExpr, mockDesugarRecordField, mockDesugarVariantCtor);

            expect(result.kind).toBe("CoreUnionType");
            if (result.kind === "CoreUnionType") {
                expect(result.types).toHaveLength(2);
            }
        });

        it("should desugar union type with multiple types", () => {
            const typeExpr: TypeExpr = {
                kind: "UnionType",
                types: [
                    { kind: "TypeConst", name: "Int", loc: testLoc },
                    { kind: "TypeConst", name: "String", loc: testLoc },
                    { kind: "TypeConst", name: "Bool", loc: testLoc },
                ],
                loc: testLoc,
            };

            const result = desugarTypeExpr(typeExpr, mockDesugarRecordField, mockDesugarVariantCtor);

            if (result.kind === "CoreUnionType") {
                expect(result.types).toHaveLength(3);
            }
        });

        it("should recursively desugar union member types", () => {
            const typeExpr: TypeExpr = {
                kind: "UnionType",
                types: [
                    { kind: "TypeVar", name: "a", loc: testLoc },
                    {
                        kind: "TypeApp",
                        constructor: { kind: "TypeConst", name: "List", loc: testLoc },
                        args: [{ kind: "TypeVar", name: "a", loc: testLoc }],
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            };

            const result = desugarTypeExpr(typeExpr, mockDesugarRecordField, mockDesugarVariantCtor);

            if (result.kind === "CoreUnionType") {
                expect(result.types[0]?.kind).toBe("CoreTypeVar");
                expect(result.types[1]?.kind).toBe("CoreTypeApp");
            }
        });

        it("should preserve location in union type", () => {
            const loc: Location = { file: "union.vf", line: 50, column: 1, offset: 500 };
            const typeExpr: TypeExpr = {
                kind: "UnionType",
                types: [
                    { kind: "TypeConst", name: "Int", loc: testLoc },
                    { kind: "TypeConst", name: "String", loc: testLoc },
                ],
                loc,
            };

            const result = desugarTypeExpr(typeExpr, mockDesugarRecordField, mockDesugarVariantCtor);

            expect(result.loc).toEqual(loc);
        });
    });

    describe("TupleType", () => {
        it("should desugar tuple type with two elements", () => {
            const typeExpr: TypeExpr = {
                kind: "TupleType",
                elements: [
                    { kind: "TypeConst", name: "Int", loc: testLoc },
                    { kind: "TypeConst", name: "String", loc: testLoc },
                ],
                loc: testLoc,
            };

            const result = desugarTypeExpr(typeExpr, mockDesugarRecordField, mockDesugarVariantCtor);

            expect(result.kind).toBe("CoreTupleType");
            if (result.kind === "CoreTupleType") {
                expect(result.elements).toHaveLength(2);
            }
        });

        it("should desugar tuple type with multiple elements", () => {
            const typeExpr: TypeExpr = {
                kind: "TupleType",
                elements: [
                    { kind: "TypeConst", name: "Int", loc: testLoc },
                    { kind: "TypeConst", name: "String", loc: testLoc },
                    { kind: "TypeConst", name: "Bool", loc: testLoc },
                ],
                loc: testLoc,
            };

            const result = desugarTypeExpr(typeExpr, mockDesugarRecordField, mockDesugarVariantCtor);

            if (result.kind === "CoreTupleType") {
                expect(result.elements).toHaveLength(3);
            }
        });

        it("should desugar empty tuple type", () => {
            const typeExpr: TypeExpr = {
                kind: "TupleType",
                elements: [],
                loc: testLoc,
            };

            const result = desugarTypeExpr(typeExpr, mockDesugarRecordField, mockDesugarVariantCtor);

            if (result.kind === "CoreTupleType") {
                expect(result.elements).toHaveLength(0);
            }
        });

        it("should recursively desugar tuple element types", () => {
            const typeExpr: TypeExpr = {
                kind: "TupleType",
                elements: [
                    { kind: "TypeVar", name: "a", loc: testLoc },
                    {
                        kind: "FunctionType",
                        params: [{ kind: "TypeConst", name: "Int", loc: testLoc }],
                        return_: { kind: "TypeConst", name: "Bool", loc: testLoc },
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            };

            const result = desugarTypeExpr(typeExpr, mockDesugarRecordField, mockDesugarVariantCtor);

            if (result.kind === "CoreTupleType") {
                expect(result.elements[0]?.kind).toBe("CoreTypeVar");
                expect(result.elements[1]?.kind).toBe("CoreFunctionType");
            }
        });

        it("should desugar nested tuple types", () => {
            const typeExpr: TypeExpr = {
                kind: "TupleType",
                elements: [
                    {
                        kind: "TupleType",
                        elements: [
                            { kind: "TypeConst", name: "Int", loc: testLoc },
                            { kind: "TypeConst", name: "Int", loc: testLoc },
                        ],
                        loc: testLoc,
                    },
                    { kind: "TypeConst", name: "String", loc: testLoc },
                ],
                loc: testLoc,
            };

            const result = desugarTypeExpr(typeExpr, mockDesugarRecordField, mockDesugarVariantCtor);

            if (result.kind === "CoreTupleType") {
                expect(result.elements[0]?.kind).toBe("CoreTupleType");
            }
        });

        it("should preserve location in tuple type", () => {
            const loc: Location = { file: "tuple.vf", line: 60, column: 1, offset: 600 };
            const typeExpr: TypeExpr = {
                kind: "TupleType",
                elements: [],
                loc,
            };

            const result = desugarTypeExpr(typeExpr, mockDesugarRecordField, mockDesugarVariantCtor);

            expect(result.loc).toEqual(loc);
        });
    });

    describe("complex nested types", () => {
        it("should desugar List<(Int, String | Bool)>", () => {
            const typeExpr: TypeExpr = {
                kind: "TypeApp",
                constructor: { kind: "TypeConst", name: "List", loc: testLoc },
                args: [
                    {
                        kind: "TupleType",
                        elements: [
                            { kind: "TypeConst", name: "Int", loc: testLoc },
                            {
                                kind: "UnionType",
                                types: [
                                    { kind: "TypeConst", name: "String", loc: testLoc },
                                    { kind: "TypeConst", name: "Bool", loc: testLoc },
                                ],
                                loc: testLoc,
                            },
                        ],
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            };

            const result = desugarTypeExpr(typeExpr, mockDesugarRecordField, mockDesugarVariantCtor);

            expect(result.kind).toBe("CoreTypeApp");
            if (result.kind === "CoreTypeApp") {
                const tupleArg = result.args[0];
                expect(tupleArg?.kind).toBe("CoreTupleType");
            }
        });

        it("should desugar ('a -> 'b) -> List<'a> -> List<'b>", () => {
            // A map function type
            const typeExpr: TypeExpr = {
                kind: "FunctionType",
                params: [
                    {
                        kind: "FunctionType",
                        params: [{ kind: "TypeVar", name: "a", loc: testLoc }],
                        return_: { kind: "TypeVar", name: "b", loc: testLoc },
                        loc: testLoc,
                    },
                    {
                        kind: "TypeApp",
                        constructor: { kind: "TypeConst", name: "List", loc: testLoc },
                        args: [{ kind: "TypeVar", name: "a", loc: testLoc }],
                        loc: testLoc,
                    },
                ],
                return_: {
                    kind: "TypeApp",
                    constructor: { kind: "TypeConst", name: "List", loc: testLoc },
                    args: [{ kind: "TypeVar", name: "b", loc: testLoc }],
                    loc: testLoc,
                },
                loc: testLoc,
            };

            const result = desugarTypeExpr(typeExpr, mockDesugarRecordField, mockDesugarVariantCtor);

            expect(result.kind).toBe("CoreFunctionType");
            if (result.kind === "CoreFunctionType") {
                expect(result.params).toHaveLength(2);
                expect(result.params[0]?.kind).toBe("CoreFunctionType");
                expect(result.params[1]?.kind).toBe("CoreTypeApp");
                expect(result.return_.kind).toBe("CoreTypeApp");
            }
        });
    });
});
