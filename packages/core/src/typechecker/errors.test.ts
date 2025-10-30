/**
 * Tests for type checker error reporting
 */

import type { Location } from "../types/ast.js";
import type { Type, TypeScheme } from "../types/environment.js";

import { describe, expect, it } from "vitest";

import {
    createConstructorArityError,
    createEscapeError,
    createInvalidGuardError,
    createMissingFieldError,
    createNonExhaustiveError,
    createNonRecordAccessError,
    createOccursCheckError,
    createOverloadError,
    createTypeMismatchError,
    createUndefinedConstructorError,
    createUndefinedTypeError,
    createUndefinedVariableError,
    createValueRestrictionError,
    TypeCheckerError,
    typeSchemeToString,
    typeToString,
} from "./errors.js";

// Helper to create a test location
const testLoc: Location = {
    file: "test.vf",
    line: 10,
    column: 5,
    offset: 100,
};

describe("TypeCheckerError", () => {
    it("should create error with message and location", () => {
        const error = new TypeCheckerError("Test error", testLoc);

        expect(error.message).toBe("Test error");
        expect(error.loc).toBe(testLoc);
        expect(error.hint).toBeUndefined();
    });

    it("should create error with hint", () => {
        const error = new TypeCheckerError("Test error", testLoc, "Try this instead");

        expect(error.message).toBe("Test error");
        expect(error.hint).toBe("Try this instead");
    });

    it("should format error with location", () => {
        const error = new TypeCheckerError("Test error", testLoc);
        const formatted = error.format();

        expect(formatted).toContain("test.vf:10:5");
        expect(formatted).toContain("Test error");
    });

    it("should format error with hint", () => {
        const error = new TypeCheckerError("Test error", testLoc, "Try this");
        const formatted = error.format();

        expect(formatted).toContain("Test error");
        expect(formatted).toContain("Hint: Try this");
    });
});

describe("typeToString", () => {
    it("should format primitive types", () => {
        const intType: Type = { type: "Const", name: "Int" };
        const stringType: Type = { type: "Const", name: "String" };
        const boolType: Type = { type: "Const", name: "Bool" };

        expect(typeToString(intType)).toBe("Int");
        expect(typeToString(stringType)).toBe("String");
        expect(typeToString(boolType)).toBe("Bool");
    });

    it("should format type variables", () => {
        const typeVar0: Type = { type: "Var", id: 0, level: 0 };
        const typeVar1: Type = { type: "Var", id: 1, level: 0 };
        const typeVar2: Type = { type: "Var", id: 2, level: 0 };

        expect(typeToString(typeVar0)).toBe("'a");
        expect(typeToString(typeVar1)).toBe("'b");
        expect(typeToString(typeVar2)).toBe("'c");
    });

    it("should format function types", () => {
        const intType: Type = { type: "Const", name: "Int" };
        const stringType: Type = { type: "Const", name: "String" };
        const funcType: Type = {
            type: "Fun",
            params: [intType],
            return: stringType,
        };

        expect(typeToString(funcType)).toBe("Int -> String");
    });

    it("should format curried function types", () => {
        const intType: Type = { type: "Const", name: "Int" };
        const func1: Type = {
            type: "Fun",
            params: [intType],
            return: intType,
        };
        const func2: Type = {
            type: "Fun",
            params: [intType],
            return: func1,
        };

        expect(typeToString(func2)).toBe("Int -> Int -> Int");
    });

    it("should format generic application types", () => {
        const intType: Type = { type: "Const", name: "Int" };
        const listCtor: Type = { type: "Const", name: "List" };
        const listInt: Type = {
            type: "App",
            constructor: listCtor,
            args: [intType],
        };

        expect(typeToString(listInt)).toBe("List<Int>");
    });

    it("should format nested generic types", () => {
        const intType: Type = { type: "Const", name: "Int" };
        const listCtor: Type = { type: "Const", name: "List" };
        const optionCtor: Type = { type: "Const", name: "Option" };

        const listInt: Type = {
            type: "App",
            constructor: listCtor,
            args: [intType],
        };
        const optionListInt: Type = {
            type: "App",
            constructor: optionCtor,
            args: [listInt],
        };

        expect(typeToString(optionListInt)).toBe("Option<List<Int>>");
    });

    it("should format record types", () => {
        const intType: Type = { type: "Const", name: "Int" };
        const stringType: Type = { type: "Const", name: "String" };
        const recordType: Type = {
            type: "Record",
            fields: new Map([
                ["name", stringType],
                ["age", intType],
            ]),
        };

        const result = typeToString(recordType);
        expect(result).toContain("name: String");
        expect(result).toContain("age: Int");
    });

    it("should format empty record types", () => {
        const recordType: Type = {
            type: "Record",
            fields: new Map(),
        };

        expect(typeToString(recordType)).toBe("{}");
    });

    it("should format variant types", () => {
        const intType: Type = { type: "Const", name: "Int" };
        const variantType: Type = {
            type: "Variant",
            name: "Option",
            constructors: new Map([
                ["Some", [intType]],
                ["None", []],
            ]),
        };

        const result = typeToString(variantType);
        expect(result).toContain("Some(Int)");
        expect(result).toContain("None");
    });

    it("should format union types", () => {
        const intType: Type = { type: "Const", name: "Int" };
        const stringType: Type = { type: "Const", name: "String" };
        const unionType: Type = {
            type: "Union",
            types: [intType, stringType],
        };

        expect(typeToString(unionType)).toBe("Int | String");
    });

    it("should format Ref types", () => {
        const intType: Type = { type: "Const", name: "Int" };
        const refType: Type = {
            type: "Ref",
            inner: intType,
        };

        expect(typeToString(refType)).toBe("Ref<Int>");
    });

    it("should format Never type", () => {
        const neverType: Type = { type: "Never" };

        expect(typeToString(neverType)).toBe("Never");
    });
});

describe("typeSchemeToString", () => {
    it("should format monomorphic type scheme", () => {
        const intType: Type = { type: "Const", name: "Int" };
        const scheme: TypeScheme = {
            vars: [],
            type: intType,
        };

        expect(typeSchemeToString(scheme)).toBe("Int");
    });

    it("should format polymorphic type scheme", () => {
        const typeVar: Type = { type: "Var", id: 0, level: 0 };
        const scheme: TypeScheme = {
            vars: [0],
            type: typeVar,
        };

        expect(typeSchemeToString(scheme)).toBe("forall 'a. 'a");
    });

    it("should format polymorphic function scheme", () => {
        const typeVar: Type = { type: "Var", id: 0, level: 0 };
        const funcType: Type = {
            type: "Fun",
            params: [typeVar],
            return: typeVar,
        };
        const scheme: TypeScheme = {
            vars: [0],
            type: funcType,
        };

        expect(typeSchemeToString(scheme)).toBe("forall 'a. 'a -> 'a");
    });
});

describe("Error factory functions", () => {
    describe("createTypeMismatchError", () => {
        it("should create type mismatch error", () => {
            const intType: Type = { type: "Const", name: "Int" };
            const stringType: Type = { type: "Const", name: "String" };

            const error = createTypeMismatchError(intType, stringType, testLoc);

            expect(error.message).toContain("Type mismatch");
            expect(error.message).toContain("Int");
            expect(error.message).toContain("String");
            expect(error.loc).toBe(testLoc);
        });

        it("should include context in error message", () => {
            const intType: Type = { type: "Const", name: "Int" };
            const stringType: Type = { type: "Const", name: "String" };

            const error = createTypeMismatchError(intType, stringType, testLoc, "function application");

            expect(error.message).toContain("function application");
        });
    });

    describe("createUndefinedVariableError", () => {
        it("should create undefined variable error", () => {
            const error = createUndefinedVariableError("foo", testLoc);

            expect(error.message).toContain("Undefined variable 'foo'");
            expect(error.loc).toBe(testLoc);
        });

        it("should include suggestions in hint", () => {
            const error = createUndefinedVariableError("foo", testLoc, ["for", "foe"]);

            expect(error.hint).toContain("Did you mean");
            expect(error.hint).toContain("for");
            expect(error.hint).toContain("foe");
        });
    });

    describe("createNonExhaustiveError", () => {
        it("should create non-exhaustive error", () => {
            const error = createNonExhaustiveError(["None", "Some"], testLoc);

            expect(error.message).toContain("Non-exhaustive pattern match");
            expect(error.message).toContain("None");
            expect(error.message).toContain("Some");
            expect(error.hint).toBeDefined();
        });
    });

    describe("createOccursCheckError", () => {
        it("should create occurs check error", () => {
            const typeVar: Type = { type: "Var", id: 0, level: 0 };
            const listCtor: Type = { type: "Const", name: "List" };
            const listOfVar: Type = {
                type: "App",
                constructor: listCtor,
                args: [typeVar],
            };

            const error = createOccursCheckError(typeVar, listOfVar, testLoc);

            expect(error.message).toContain("infinite type");
            expect(error.message).toContain("'a");
            expect(error.message).toContain("List<'a>");
            expect(error.hint).toBeDefined();
        });
    });

    describe("createOverloadError", () => {
        it("should create overload error with available overloads", () => {
            const intType: Type = { type: "Const", name: "Int" };
            const stringType: Type = { type: "Const", name: "String" };

            const overload1: TypeScheme = {
                vars: [],
                type: {
                    type: "Fun",
                    params: [stringType],
                    return: intType,
                },
            };

            const overload2: TypeScheme = {
                vars: [],
                type: {
                    type: "Fun",
                    params: [stringType, intType],
                    return: intType,
                },
            };

            const error = createOverloadError("fetch", 3, [overload1, overload2], testLoc);

            expect(error.message).toContain("No matching overload");
            expect(error.message).toContain("fetch");
            expect(error.message).toContain("3 arguments");
            expect(error.hint).toContain("Available overloads");
        });
    });

    describe("createUndefinedTypeError", () => {
        it("should create undefined type error", () => {
            const error = createUndefinedTypeError("CustomType", testLoc);

            expect(error.message).toContain("Undefined type 'CustomType'");
            expect(error.loc).toBe(testLoc);
        });
    });

    describe("createMissingFieldError", () => {
        it("should create missing field error", () => {
            const intType: Type = { type: "Const", name: "Int" };
            const recordType: Type = {
                type: "Record",
                fields: new Map([["age", intType]]),
            };

            const error = createMissingFieldError("name", recordType, testLoc);

            expect(error.message).toContain("Field 'name' does not exist");
            expect(error.loc).toBe(testLoc);
        });

        it("should suggest similar field names", () => {
            const intType: Type = { type: "Const", name: "Int" };
            const recordType: Type = {
                type: "Record",
                fields: new Map([
                    ["name", intType],
                    ["age", intType],
                ]),
            };

            const error = createMissingFieldError("nam", recordType, testLoc);

            expect(error.hint).toContain("Did you mean");
            expect(error.hint).toContain("name");
        });
    });

    describe("createNonRecordAccessError", () => {
        it("should create non-record access error", () => {
            const intType: Type = { type: "Const", name: "Int" };

            const error = createNonRecordAccessError(intType, testLoc);

            expect(error.message).toContain("Cannot access field on non-record");
            expect(error.message).toContain("Int");
            expect(error.loc).toBe(testLoc);
        });
    });

    describe("createUndefinedConstructorError", () => {
        it("should create undefined constructor error", () => {
            const error = createUndefinedConstructorError("SomeConstructor", testLoc);

            expect(error.message).toContain("Undefined constructor 'SomeConstructor'");
            expect(error.loc).toBe(testLoc);
        });
    });

    describe("createConstructorArityError", () => {
        it("should create constructor arity error", () => {
            const error = createConstructorArityError("Some", 1, 2, testLoc);

            expect(error.message).toContain("Constructor 'Some' expects 1 argument");
            expect(error.message).toContain("got 2");
            expect(error.loc).toBe(testLoc);
        });
    });

    describe("createValueRestrictionError", () => {
        it("should create value restriction error", () => {
            const error = createValueRestrictionError("r", testLoc);

            expect(error.message).toContain("Cannot generalize non-syntactic value");
            expect(error.message).toContain("'r'");
            expect(error.hint).toBeDefined();
            expect(error.hint).toContain("type annotation");
            expect(error.loc).toBe(testLoc);
        });
    });

    describe("createEscapeError", () => {
        it("should create type variable escape error", () => {
            const error = createEscapeError(testLoc);

            expect(error.message).toContain("Type variable would escape");
            expect(error.hint).toBeDefined();
            expect(error.loc).toBe(testLoc);
        });
    });

    describe("createInvalidGuardError", () => {
        it("should create invalid guard error", () => {
            const intType: Type = { type: "Const", name: "Int" };

            const error = createInvalidGuardError(intType, testLoc);

            expect(error.message).toContain("Pattern guard must have type Bool");
            expect(error.message).toContain("Int");
            expect(error.loc).toBe(testLoc);
        });
    });
});
