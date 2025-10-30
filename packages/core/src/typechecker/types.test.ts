/**
 * Tests for type representation utilities
 */

import { beforeEach, describe, expect, it } from "vitest";

import {
    appType,
    constType,
    freeInScheme,
    freeTypeVars,
    freeTypeVarsAtLevel,
    freshTypeVar,
    funType,
    isAppType,
    isConstType,
    isFunType,
    isRecordType,
    isTypeVar,
    isUnionType,
    isVariantType,
    primitiveTypes,
    recordType,
    refType,
    resetTypeVarCounter,
    schemeToString,
    typeEquals,
    typeToString,
    unionType,
    variantType,
} from "./types.js";

describe("Type Construction", () => {
    beforeEach(() => {
        resetTypeVarCounter();
    });

    it("should create fresh type variables with incrementing IDs", () => {
        const t1 = freshTypeVar();
        const t2 = freshTypeVar();
        const t3 = freshTypeVar();

        expect(t1).toEqual({ type: "Var", id: 0, level: 0 });
        expect(t2).toEqual({ type: "Var", id: 1, level: 0 });
        expect(t3).toEqual({ type: "Var", id: 2, level: 0 });
    });

    it("should create fresh type variables with specified levels", () => {
        const t1 = freshTypeVar(0);
        const t2 = freshTypeVar(1);
        const t3 = freshTypeVar(2);

        expect(isTypeVar(t1) && t1.level).toBe(0);
        expect(isTypeVar(t2) && t2.level).toBe(1);
        expect(isTypeVar(t3) && t3.level).toBe(2);
    });

    it("should create constant types", () => {
        const intType = constType("Int");
        expect(intType).toEqual({ type: "Const", name: "Int" });
    });

    it("should create function types", () => {
        const intToString = funType([primitiveTypes.Int], primitiveTypes.String);
        expect(intToString).toEqual({
            type: "Fun",
            params: [{ type: "Const", name: "Int" }],
            return: { type: "Const", name: "String" },
        });
    });

    it("should create function types with multiple parameters", () => {
        const addType = funType([primitiveTypes.Int, primitiveTypes.Int], primitiveTypes.Int);
        expect(isFunType(addType)).toBe(true);
        if (isFunType(addType)) {
            expect(addType.params).toHaveLength(2);
        }
    });

    it("should create type applications", () => {
        const listOfInt = appType(constType("List"), [primitiveTypes.Int]);
        expect(listOfInt).toEqual({
            type: "App",
            constructor: { type: "Const", name: "List" },
            args: [{ type: "Const", name: "Int" }],
        });
    });

    it("should create record types", () => {
        const personType = recordType(
            new Map([
                ["name", primitiveTypes.String],
                ["age", primitiveTypes.Int],
            ]),
        );
        expect(personType.type).toBe("Record");
        if (isRecordType(personType)) {
            expect(personType.fields.size).toBe(2);
            expect(personType.fields.get("name")).toEqual(primitiveTypes.String);
        }
    });

    it("should create variant types", () => {
        const optionType = variantType(
            new Map([
                ["Some", [freshTypeVar()]],
                ["None", []],
            ]),
        );
        expect(optionType.type).toBe("Variant");
        if (isVariantType(optionType)) {
            expect(optionType.constructors.size).toBe(2);
        }
    });

    it("should create union types", () => {
        const intOrString = unionType([primitiveTypes.Int, primitiveTypes.String]);
        expect(intOrString).toEqual({
            type: "Union",
            types: [primitiveTypes.Int, primitiveTypes.String],
        });
    });

    it("should create reference types", () => {
        const refInt = refType(primitiveTypes.Int);
        expect(refInt).toEqual({
            type: "App",
            constructor: { type: "Const", name: "Ref" },
            args: [primitiveTypes.Int],
        });
    });
});

describe("Primitive Types", () => {
    it("should provide all primitive type constants", () => {
        expect(primitiveTypes.Int).toEqual({ type: "Const", name: "Int" });
        expect(primitiveTypes.Float).toEqual({ type: "Const", name: "Float" });
        expect(primitiveTypes.String).toEqual({ type: "Const", name: "String" });
        expect(primitiveTypes.Bool).toEqual({ type: "Const", name: "Bool" });
        expect(primitiveTypes.Unit).toEqual({ type: "Const", name: "Unit" });
        expect(primitiveTypes.Never).toEqual({ type: "Const", name: "Never" });
    });
});

describe("Type Predicates", () => {
    beforeEach(() => {
        resetTypeVarCounter();
    });

    it("should identify type variables", () => {
        const t = freshTypeVar();
        expect(isTypeVar(t)).toBe(true);
        expect(isConstType(t)).toBe(false);
    });

    it("should identify constant types", () => {
        const t = primitiveTypes.Int;
        expect(isConstType(t)).toBe(true);
        expect(isTypeVar(t)).toBe(false);
    });

    it("should identify function types", () => {
        const t = funType([primitiveTypes.Int], primitiveTypes.String);
        expect(isFunType(t)).toBe(true);
        expect(isConstType(t)).toBe(false);
    });

    it("should identify type applications", () => {
        const t = appType(constType("List"), [primitiveTypes.Int]);
        expect(isAppType(t)).toBe(true);
        expect(isFunType(t)).toBe(false);
    });

    it("should identify record types", () => {
        const t = recordType(new Map([["x", primitiveTypes.Int]]));
        expect(isRecordType(t)).toBe(true);
        expect(isVariantType(t)).toBe(false);
    });

    it("should identify variant types", () => {
        const t = variantType(new Map([["Some", [primitiveTypes.Int]]]));
        expect(isVariantType(t)).toBe(true);
        expect(isRecordType(t)).toBe(false);
    });

    it("should identify union types", () => {
        const t = unionType([primitiveTypes.Int, primitiveTypes.String]);
        expect(isUnionType(t)).toBe(true);
        expect(isConstType(t)).toBe(false);
    });
});

describe("Free Type Variables", () => {
    beforeEach(() => {
        resetTypeVarCounter();
    });

    it("should find free variables in type variable", () => {
        const t = freshTypeVar();
        const free = freeTypeVars(t);
        expect(free.size).toBe(1);
        expect(free.has(0)).toBe(true);
    });

    it("should find no free variables in constant type", () => {
        const free = freeTypeVars(primitiveTypes.Int);
        expect(free.size).toBe(0);
    });

    it("should find free variables in function type", () => {
        const t1 = freshTypeVar();
        const t2 = freshTypeVar();
        const funcType = funType([t1], t2);
        const free = freeTypeVars(funcType);
        expect(free.size).toBe(2);
        expect(free.has(0)).toBe(true);
        expect(free.has(1)).toBe(true);
    });

    it("should find free variables in type application", () => {
        const t = freshTypeVar();
        const listType = appType(constType("List"), [t]);
        const free = freeTypeVars(listType);
        expect(free.size).toBe(1);
        expect(free.has(0)).toBe(true);
    });

    it("should find free variables in record type", () => {
        const t1 = freshTypeVar();
        const t2 = freshTypeVar();
        const recType = recordType(
            new Map([
                ["x", t1],
                ["y", t2],
            ]),
        );
        const free = freeTypeVars(recType);
        expect(free.size).toBe(2);
    });

    it("should find free variables in variant type", () => {
        const t = freshTypeVar();
        const varType = variantType(
            new Map([
                ["Some", [t]],
                ["None", []],
            ]),
        );
        const free = freeTypeVars(varType);
        expect(free.size).toBe(1);
        expect(free.has(0)).toBe(true);
    });

    it("should find free variables in nested types", () => {
        const t1 = freshTypeVar();
        const t2 = freshTypeVar();
        const nestedType = appType(constType("List"), [funType([t1], t2)]);
        const free = freeTypeVars(nestedType);
        expect(free.size).toBe(2);
    });
});

describe("Free Type Variables at Level", () => {
    beforeEach(() => {
        resetTypeVarCounter();
    });

    it("should find variables at or below specified level", () => {
        const t1 = freshTypeVar(0);
        const t2 = freshTypeVar(1);
        const t3 = freshTypeVar(2);
        const funcType = funType([t1, t2], t3);

        const freeLevel0 = freeTypeVarsAtLevel(funcType, 0);
        expect(freeLevel0.size).toBe(1);
        expect(freeLevel0.has(0)).toBe(true);

        const freeLevel1 = freeTypeVarsAtLevel(funcType, 1);
        expect(freeLevel1.size).toBe(2);
        expect(freeLevel1.has(0)).toBe(true);
        expect(freeLevel1.has(1)).toBe(true);

        const freeLevel2 = freeTypeVarsAtLevel(funcType, 2);
        expect(freeLevel2.size).toBe(3);
    });

    it("should exclude variables above specified level", () => {
        const t1 = freshTypeVar(5);
        const t2 = freshTypeVar(3);
        const funcType = funType([t1], t2);

        const freeLevel3 = freeTypeVarsAtLevel(funcType, 3);
        expect(freeLevel3.size).toBe(1);
        expect(freeLevel3.has(1)).toBe(true); // t2 with level 3
        expect(freeLevel3.has(0)).toBe(false); // t1 with level 5 excluded
    });
});

describe("Free Variables in Scheme", () => {
    beforeEach(() => {
        resetTypeVarCounter();
    });

    it("should exclude quantified variables", () => {
        const t1 = freshTypeVar();
        const t2 = freshTypeVar();
        const funcType = funType([t1], t2);
        const scheme = { vars: [0], type: funcType }; // quantify t1

        const free = freeInScheme(scheme);
        expect(free.size).toBe(1);
        expect(free.has(1)).toBe(true); // t2 is free
        expect(free.has(0)).toBe(false); // t1 is quantified
    });

    it("should return all variables if none quantified", () => {
        const t1 = freshTypeVar();
        const t2 = freshTypeVar();
        const funcType = funType([t1], t2);
        const scheme = { vars: [], type: funcType };

        const free = freeInScheme(scheme);
        expect(free.size).toBe(2);
    });
});

describe("Type Equality", () => {
    beforeEach(() => {
        resetTypeVarCounter();
    });

    it("should check type variable equality by ID", () => {
        const t1 = freshTypeVar();
        const t2 = freshTypeVar();
        expect(typeEquals(t1, t1)).toBe(true);
        expect(typeEquals(t1, t2)).toBe(false);
    });

    it("should check constant type equality by name", () => {
        expect(typeEquals(primitiveTypes.Int, primitiveTypes.Int)).toBe(true);
        expect(typeEquals(primitiveTypes.Int, primitiveTypes.String)).toBe(false);
    });

    it("should check function type equality structurally", () => {
        const f1 = funType([primitiveTypes.Int], primitiveTypes.String);
        const f2 = funType([primitiveTypes.Int], primitiveTypes.String);
        const f3 = funType([primitiveTypes.String], primitiveTypes.Int);

        expect(typeEquals(f1, f2)).toBe(true);
        expect(typeEquals(f1, f3)).toBe(false);
    });

    it("should check record type equality structurally", () => {
        const r1 = recordType(new Map([["x", primitiveTypes.Int]]));
        const r2 = recordType(new Map([["x", primitiveTypes.Int]]));
        const r3 = recordType(new Map([["y", primitiveTypes.Int]]));

        expect(typeEquals(r1, r2)).toBe(true);
        expect(typeEquals(r1, r3)).toBe(false);
    });

    it("should check variant type equality structurally", () => {
        const v1 = variantType(new Map([["Some", [primitiveTypes.Int]]]));
        const v2 = variantType(new Map([["Some", [primitiveTypes.Int]]]));
        const v3 = variantType(new Map([["None", []]]));

        expect(typeEquals(v1, v2)).toBe(true);
        expect(typeEquals(v1, v3)).toBe(false);
    });

    it("should check complex nested type equality", () => {
        const t1 = appType(constType("List"), [funType([primitiveTypes.Int], primitiveTypes.String)]);
        const t2 = appType(constType("List"), [funType([primitiveTypes.Int], primitiveTypes.String)]);
        const t3 = appType(constType("List"), [funType([primitiveTypes.String], primitiveTypes.Int)]);

        expect(typeEquals(t1, t2)).toBe(true);
        expect(typeEquals(t1, t3)).toBe(false);
    });
});

describe("Type Formatting", () => {
    beforeEach(() => {
        resetTypeVarCounter();
    });

    it("should format type variables", () => {
        const t = freshTypeVar();
        expect(typeToString(t)).toBe("'t0");
    });

    it("should format constant types", () => {
        expect(typeToString(primitiveTypes.Int)).toBe("Int");
        expect(typeToString(primitiveTypes.String)).toBe("String");
    });

    it("should format function types with single parameter", () => {
        const f = funType([primitiveTypes.Int], primitiveTypes.String);
        expect(typeToString(f)).toBe("Int -> String");
    });

    it("should format function types with multiple parameters", () => {
        const f = funType([primitiveTypes.Int, primitiveTypes.String], primitiveTypes.Bool);
        expect(typeToString(f)).toBe("(Int, String) -> Bool");
    });

    it("should format type applications", () => {
        const listInt = appType(constType("List"), [primitiveTypes.Int]);
        expect(typeToString(listInt)).toBe("List<Int>");
    });

    it("should format nested type applications", () => {
        const listOfList = appType(constType("List"), [appType(constType("List"), [primitiveTypes.Int])]);
        expect(typeToString(listOfList)).toBe("List<List<Int>>");
    });

    it("should format record types", () => {
        const rec = recordType(
            new Map([
                ["name", primitiveTypes.String],
                ["age", primitiveTypes.Int],
            ]),
        );
        const str = typeToString(rec);
        expect(str).toContain("name: String");
        expect(str).toContain("age: Int");
        expect(str).toMatch(/\{.*\}/);
    });

    it("should format variant types", () => {
        const variant = variantType(
            new Map([
                ["Some", [primitiveTypes.Int]],
                ["None", []],
            ]),
        );
        const str = typeToString(variant);
        expect(str).toContain("Some(Int)");
        expect(str).toContain("None");
        expect(str).toContain("|");
    });

    it("should format union types", () => {
        const union = unionType([primitiveTypes.Int, primitiveTypes.String]);
        expect(typeToString(union)).toBe("Int | String");
    });

    it("should format complex nested types", () => {
        const t = funType([appType(constType("List"), [primitiveTypes.Int])], primitiveTypes.String);
        expect(typeToString(t)).toBe("List<Int> -> String");
    });
});

describe("Scheme Formatting", () => {
    beforeEach(() => {
        resetTypeVarCounter();
    });

    it("should format monomorphic scheme without forall", () => {
        const scheme = { vars: [], type: primitiveTypes.Int };
        expect(schemeToString(scheme)).toBe("Int");
    });

    it("should format polymorphic scheme with forall", () => {
        const t = freshTypeVar();
        const scheme = { vars: [0], type: funType([t], t) };
        expect(schemeToString(scheme)).toBe("forall 't0. 't0 -> 't0");
    });

    it("should format scheme with multiple quantified variables", () => {
        const t1 = freshTypeVar();
        const t2 = freshTypeVar();
        const scheme = { vars: [0, 1], type: funType([t1], t2) };
        expect(schemeToString(scheme)).toBe("forall 't0 't1. 't0 -> 't1");
    });
});
