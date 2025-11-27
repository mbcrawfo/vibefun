/**
 * Tests for type environment structures
 */

import type { ExternalOverload, Type, TypeBinding, TypeScheme, ValueBinding } from "./environment.js";

import { describe, expect, it } from "vitest";

import { addType, addValue, emptyEnv, isExternal, isOverloaded, lookupType, lookupValue } from "./environment.js";

const testLoc = { file: "test", line: 1, column: 1, offset: 0 };

describe("Type Environment", () => {
    describe("emptyEnv", () => {
        it("should create an environment with empty maps", () => {
            const env = emptyEnv();

            expect(env.values).toBeInstanceOf(Map);
            expect(env.types).toBeInstanceOf(Map);
            expect(env.values.size).toBe(0);
            expect(env.types.size).toBe(0);
        });

        it("should create independent environments", () => {
            const env1 = emptyEnv();
            const env2 = emptyEnv();

            env1.values.set("x", {
                kind: "Value",
                scheme: { vars: [], type: { type: "Const", name: "Int" } },
                loc: testLoc,
            });

            expect(env1.values.size).toBe(1);
            expect(env2.values.size).toBe(0);
        });
    });

    describe("lookupValue", () => {
        it("should return undefined for empty environment", () => {
            const env = emptyEnv();
            expect(lookupValue(env, "x")).toBeUndefined();
        });

        it("should return undefined for non-existent value", () => {
            const env = emptyEnv();
            env.values.set("y", {
                kind: "Value",
                scheme: { vars: [], type: { type: "Const", name: "Int" } },
                loc: testLoc,
            });

            expect(lookupValue(env, "x")).toBeUndefined();
        });

        it("should find existing Value binding", () => {
            const env = emptyEnv();
            const scheme: TypeScheme = {
                vars: [],
                type: { type: "Const", name: "Int" },
            };
            const binding: ValueBinding = {
                kind: "Value",
                scheme,
                loc: testLoc,
            };
            env.values.set("x", binding);

            const result = lookupValue(env, "x");
            expect(result).toEqual(binding);
            expect(result?.kind).toBe("Value");
        });

        it("should find existing External binding", () => {
            const env = emptyEnv();
            const scheme: TypeScheme = {
                vars: [],
                type: {
                    type: "Fun",
                    params: [{ type: "Const", name: "String" }],
                    return: { type: "Const", name: "Unit" },
                },
            };
            const binding: ValueBinding = {
                kind: "External",
                scheme,
                jsName: "console.log",

                loc: testLoc,
            };
            env.values.set("print", binding);

            const result = lookupValue(env, "print");
            expect(result).toEqual(binding);
            expect(result?.kind).toBe("External");
        });

        it("should find existing ExternalOverload binding", () => {
            const env = emptyEnv();
            const overloads: ExternalOverload[] = [
                {
                    paramTypes: [{ kind: "TypeConst", name: "Int", loc: testLoc }],
                    returnType: { kind: "TypeConst", name: "String", loc: testLoc },
                    loc: testLoc,
                },
                {
                    paramTypes: [{ kind: "TypeConst", name: "Float", loc: testLoc }],
                    returnType: { kind: "TypeConst", name: "String", loc: testLoc },
                    loc: testLoc,
                },
            ];
            const binding: ValueBinding = {
                kind: "ExternalOverload",
                overloads,
                jsName: "String",

                loc: testLoc,
            };
            env.values.set("toString", binding);

            const result = lookupValue(env, "toString");
            expect(result).toEqual(binding);
            expect(result?.kind).toBe("ExternalOverload");
        });
    });

    describe("lookupType", () => {
        it("should return undefined for empty environment", () => {
            const env = emptyEnv();
            expect(lookupType(env, "MyType")).toBeUndefined();
        });

        it("should return undefined for non-existent type", () => {
            const env = emptyEnv();
            env.types.set("OtherType", {
                kind: "Alias",
                params: [],
                definition: { type: "Const", name: "Int" },
                loc: testLoc,
            });

            expect(lookupType(env, "MyType")).toBeUndefined();
        });

        it("should find existing Alias type binding", () => {
            const env = emptyEnv();
            const binding: TypeBinding = {
                kind: "Alias",
                params: [],
                definition: { type: "Const", name: "Int" },
                loc: testLoc,
            };
            env.types.set("Age", binding);

            const result = lookupType(env, "Age");
            expect(result).toEqual(binding);
            expect(result?.kind).toBe("Alias");
        });

        it("should find existing Record type binding", () => {
            const env = emptyEnv();
            const fields = new Map<string, Type>([
                ["name", { type: "Const", name: "String" }],
                ["age", { type: "Const", name: "Int" }],
            ]);
            const binding: TypeBinding = {
                kind: "Record",
                params: [],
                fields,
                loc: testLoc,
            };
            env.types.set("Person", binding);

            const result = lookupType(env, "Person");
            expect(result).toEqual(binding);
            expect(result?.kind).toBe("Record");
        });

        it("should find existing Variant type binding", () => {
            const env = emptyEnv();
            const constructors = new Map<string, Type[]>([
                ["Some", [{ type: "Var", id: 1, level: 0 }]],
                ["None", []],
            ]);
            const binding: TypeBinding = {
                kind: "Variant",
                params: ["a"],
                constructors,
                loc: testLoc,
            };
            env.types.set("Option", binding);

            const result = lookupType(env, "Option");
            expect(result).toEqual(binding);
            expect(result?.kind).toBe("Variant");
        });

        it("should find existing External type binding", () => {
            const env = emptyEnv();
            const binding: TypeBinding = {
                kind: "External",
                definition: { type: "Const", name: "JsDate" },
                loc: testLoc,
            };
            env.types.set("Date", binding);

            const result = lookupType(env, "Date");
            expect(result).toEqual(binding);
            expect(result?.kind).toBe("External");
        });
    });

    describe("addValue", () => {
        it("should add a Value binding to empty environment", () => {
            const env = emptyEnv();
            const binding: ValueBinding = {
                kind: "Value",
                scheme: { vars: [], type: { type: "Const", name: "Int" } },
                loc: testLoc,
            };

            addValue(env, "x", binding);

            expect(env.values.get("x")).toEqual(binding);
        });

        it("should add multiple Value bindings", () => {
            const env = emptyEnv();
            const binding1: ValueBinding = {
                kind: "Value",
                scheme: { vars: [], type: { type: "Const", name: "Int" } },
                loc: testLoc,
            };
            const binding2: ValueBinding = {
                kind: "Value",
                scheme: { vars: [], type: { type: "Const", name: "String" } },
                loc: testLoc,
            };

            addValue(env, "x", binding1);
            addValue(env, "y", binding2);

            expect(env.values.get("x")).toEqual(binding1);
            expect(env.values.get("y")).toEqual(binding2);
            expect(env.values.size).toBe(2);
        });

        it("should overwrite existing binding with same name", () => {
            const env = emptyEnv();
            const oldBinding: ValueBinding = {
                kind: "Value",
                scheme: { vars: [], type: { type: "Const", name: "Int" } },
                loc: testLoc,
            };
            const newBinding: ValueBinding = {
                kind: "Value",
                scheme: { vars: [], type: { type: "Const", name: "String" } },
                loc: testLoc,
            };

            addValue(env, "x", oldBinding);
            addValue(env, "x", newBinding);

            expect(env.values.get("x")).toEqual(newBinding);
            expect(env.values.size).toBe(1);
        });

        it("should add External binding", () => {
            const env = emptyEnv();
            const binding: ValueBinding = {
                kind: "External",
                scheme: {
                    vars: [],
                    type: {
                        type: "Fun",
                        params: [{ type: "Const", name: "String" }],
                        return: { type: "Const", name: "Unit" },
                    },
                },
                jsName: "console.log",

                loc: testLoc,
            };

            addValue(env, "print", binding);

            expect(env.values.get("print")).toEqual(binding);
        });

        it("should add ExternalOverload binding", () => {
            const env = emptyEnv();
            const binding: ValueBinding = {
                kind: "ExternalOverload",
                overloads: [
                    {
                        paramTypes: [{ kind: "TypeConst", name: "Int", loc: testLoc }],
                        returnType: { kind: "TypeConst", name: "String", loc: testLoc },
                        loc: testLoc,
                    },
                ],
                jsName: "String",

                loc: testLoc,
            };

            addValue(env, "toString", binding);

            expect(env.values.get("toString")).toEqual(binding);
        });

        it("should not affect type bindings", () => {
            const env = emptyEnv();
            env.types.set("MyType", {
                kind: "Alias",
                params: [],
                definition: { type: "Const", name: "Int" },
                loc: testLoc,
            });

            addValue(env, "x", {
                kind: "Value",
                scheme: { vars: [], type: { type: "Const", name: "Int" } },
                loc: testLoc,
            });

            expect(env.types.size).toBe(1);
            expect(env.values.size).toBe(1);
        });
    });

    describe("addType", () => {
        it("should add an Alias type binding", () => {
            const env = emptyEnv();
            const binding: TypeBinding = {
                kind: "Alias",
                params: [],
                definition: { type: "Const", name: "Int" },
                loc: testLoc,
            };

            addType(env, "Age", binding);

            expect(env.types.get("Age")).toEqual(binding);
        });

        it("should add a Record type binding", () => {
            const env = emptyEnv();
            const binding: TypeBinding = {
                kind: "Record",
                params: [],
                fields: new Map([
                    ["name", { type: "Const", name: "String" }],
                    ["age", { type: "Const", name: "Int" }],
                ]),
                loc: testLoc,
            };

            addType(env, "Person", binding);

            expect(env.types.get("Person")).toEqual(binding);
        });

        it("should add a Variant type binding", () => {
            const env = emptyEnv();
            const binding: TypeBinding = {
                kind: "Variant",
                params: ["a"],
                constructors: new Map([
                    ["Some", [{ type: "Var", id: 1, level: 0 }]],
                    ["None", []],
                ]),
                loc: testLoc,
            };

            addType(env, "Option", binding);

            expect(env.types.get("Option")).toEqual(binding);
        });

        it("should add an External type binding", () => {
            const env = emptyEnv();
            const binding: TypeBinding = {
                kind: "External",
                definition: { type: "Const", name: "JsDate" },
                loc: testLoc,
            };

            addType(env, "Date", binding);

            expect(env.types.get("Date")).toEqual(binding);
        });

        it("should overwrite existing type binding with same name", () => {
            const env = emptyEnv();
            const oldBinding: TypeBinding = {
                kind: "Alias",
                params: [],
                definition: { type: "Const", name: "Int" },
                loc: testLoc,
            };
            const newBinding: TypeBinding = {
                kind: "Alias",
                params: [],
                definition: { type: "Const", name: "String" },
                loc: testLoc,
            };

            addType(env, "MyType", oldBinding);
            addType(env, "MyType", newBinding);

            expect(env.types.get("MyType")).toEqual(newBinding);
            expect(env.types.size).toBe(1);
        });

        it("should add multiple type bindings", () => {
            const env = emptyEnv();
            const binding1: TypeBinding = {
                kind: "Alias",
                params: [],
                definition: { type: "Const", name: "Int" },
                loc: testLoc,
            };
            const binding2: TypeBinding = {
                kind: "Alias",
                params: [],
                definition: { type: "Const", name: "String" },
                loc: testLoc,
            };

            addType(env, "Age", binding1);
            addType(env, "Name", binding2);

            expect(env.types.get("Age")).toEqual(binding1);
            expect(env.types.get("Name")).toEqual(binding2);
            expect(env.types.size).toBe(2);
        });

        it("should not affect value bindings", () => {
            const env = emptyEnv();
            env.values.set("x", {
                kind: "Value",
                scheme: { vars: [], type: { type: "Const", name: "Int" } },
                loc: testLoc,
            });

            addType(env, "MyType", {
                kind: "Alias",
                params: [],
                definition: { type: "Const", name: "Int" },
                loc: testLoc,
            });

            expect(env.values.size).toBe(1);
            expect(env.types.size).toBe(1);
        });
    });

    describe("isOverloaded", () => {
        it("should return false for Value binding", () => {
            const binding: ValueBinding = {
                kind: "Value",
                scheme: { vars: [], type: { type: "Const", name: "Int" } },
                loc: testLoc,
            };

            expect(isOverloaded(binding)).toBe(false);
        });

        it("should return false for External binding", () => {
            const binding: ValueBinding = {
                kind: "External",
                scheme: { vars: [], type: { type: "Const", name: "Int" } },
                jsName: "someFunc",

                loc: testLoc,
            };

            expect(isOverloaded(binding)).toBe(false);
        });

        it("should return true for ExternalOverload binding", () => {
            const binding: ValueBinding = {
                kind: "ExternalOverload",
                overloads: [
                    {
                        paramTypes: [{ kind: "TypeConst", name: "Int", loc: testLoc }],
                        returnType: { kind: "TypeConst", name: "String", loc: testLoc },
                        loc: testLoc,
                    },
                ],
                jsName: "toString",

                loc: testLoc,
            };

            expect(isOverloaded(binding)).toBe(true);
        });

        it("should work as type guard", () => {
            const binding: ValueBinding = {
                kind: "ExternalOverload",
                overloads: [
                    {
                        paramTypes: [{ kind: "TypeConst", name: "Int", loc: testLoc }],
                        returnType: { kind: "TypeConst", name: "String", loc: testLoc },
                        loc: testLoc,
                    },
                ],
                jsName: "toString",

                loc: testLoc,
            };

            if (isOverloaded(binding)) {
                // TypeScript should allow access to overloads
                expect(binding.overloads.length).toBe(1);
            }
        });
    });

    describe("isExternal", () => {
        it("should return false for Value binding", () => {
            const binding: ValueBinding = {
                kind: "Value",
                scheme: { vars: [], type: { type: "Const", name: "Int" } },
                loc: testLoc,
            };

            expect(isExternal(binding)).toBe(false);
        });

        it("should return true for External binding", () => {
            const binding: ValueBinding = {
                kind: "External",
                scheme: { vars: [], type: { type: "Const", name: "Int" } },
                jsName: "someFunc",

                loc: testLoc,
            };

            expect(isExternal(binding)).toBe(true);
        });

        it("should return true for ExternalOverload binding", () => {
            const binding: ValueBinding = {
                kind: "ExternalOverload",
                overloads: [
                    {
                        paramTypes: [{ kind: "TypeConst", name: "Int", loc: testLoc }],
                        returnType: { kind: "TypeConst", name: "String", loc: testLoc },
                        loc: testLoc,
                    },
                ],
                jsName: "toString",

                loc: testLoc,
            };

            expect(isExternal(binding)).toBe(true);
        });

        it("should work as type guard for External", () => {
            const binding: ValueBinding = {
                kind: "External",
                scheme: { vars: [], type: { type: "Const", name: "Int" } },
                jsName: "someFunc",
                from: "module",
                loc: testLoc,
            };

            if (isExternal(binding)) {
                // TypeScript should allow access to jsName for either external type
                expect(binding.jsName).toBe("someFunc");
            }
        });

        it("should work as type guard for ExternalOverload", () => {
            const binding: ValueBinding = {
                kind: "ExternalOverload",
                overloads: [],
                jsName: "toString",
                from: "module",
                loc: testLoc,
            };

            if (isExternal(binding)) {
                expect(binding.jsName).toBe("toString");
                expect(binding.from).toBe("module");
            }
        });
    });

    describe("TypeEnv usage patterns", () => {
        it("should support building an environment with multiple bindings", () => {
            const env = emptyEnv();

            // Add some value bindings
            addValue(env, "x", {
                kind: "Value",
                scheme: { vars: [], type: { type: "Const", name: "Int" } },
                loc: testLoc,
            });

            addValue(env, "print", {
                kind: "External",
                scheme: {
                    vars: [],
                    type: {
                        type: "Fun",
                        params: [{ type: "Const", name: "String" }],
                        return: { type: "Const", name: "Unit" },
                    },
                },
                jsName: "console.log",
                loc: testLoc,
            });

            // Add some type bindings
            addType(env, "Person", {
                kind: "Record",
                params: [],
                fields: new Map([
                    ["name", { type: "Const", name: "String" }],
                    ["age", { type: "Const", name: "Int" }],
                ]),
                loc: testLoc,
            });

            addType(env, "Option", {
                kind: "Variant",
                params: ["a"],
                constructors: new Map([
                    ["Some", [{ type: "Var", id: 1, level: 0 }]],
                    ["None", []],
                ]),
                loc: testLoc,
            });

            // Verify all bindings are accessible
            expect(lookupValue(env, "x")).toBeDefined();
            expect(lookupValue(env, "print")).toBeDefined();
            expect(lookupType(env, "Person")).toBeDefined();
            expect(lookupType(env, "Option")).toBeDefined();

            expect(env.values.size).toBe(2);
            expect(env.types.size).toBe(2);
        });

        it("should support polymorphic type schemes", () => {
            const env = emptyEnv();

            // identity : forall a. a -> a
            const identityScheme: TypeScheme = {
                vars: [1],
                type: {
                    type: "Fun",
                    params: [{ type: "Var", id: 1, level: 0 }],
                    return: { type: "Var", id: 1, level: 0 },
                },
            };

            addValue(env, "identity", {
                kind: "Value",
                scheme: identityScheme,
                loc: testLoc,
            });

            const result = lookupValue(env, "identity");
            expect(result?.kind).toBe("Value");
            if (result?.kind === "Value") {
                expect(result.scheme.vars).toEqual([1]);
            }
        });

        it("should support generic type definitions", () => {
            const env = emptyEnv();

            // type Option<a> = | Some(a) | None
            const constructors = new Map<string, Type[]>();
            constructors.set("None", []);
            constructors.set("Some", [{ type: "Var", id: 1, level: 0 }]);

            addType(env, "Option", {
                kind: "Variant",
                params: ["a"],
                constructors,
                loc: testLoc,
            });

            const result = lookupType(env, "Option");
            expect(result?.kind).toBe("Variant");
            if (result?.kind === "Variant") {
                expect(result.params).toEqual(["a"]);
                expect(result.constructors.has("None")).toBe(true);
                expect(result.constructors.has("Some")).toBe(true);
            }
        });

        it("should support external with module import", () => {
            const env = emptyEnv();

            addValue(env, "readFile", {
                kind: "External",
                scheme: {
                    vars: [],
                    type: {
                        type: "Fun",
                        params: [{ type: "Const", name: "String" }],
                        return: { type: "Const", name: "String" },
                    },
                },
                jsName: "readFileSync",
                from: "fs",
                loc: testLoc,
            });

            const result = lookupValue(env, "readFile");
            expect(result?.kind).toBe("External");
            if (result?.kind === "External") {
                expect(result.jsName).toBe("readFileSync");
                expect(result.from).toBe("fs");
            }
        });
    });

    describe("Type variants", () => {
        it("should support all Type variants", () => {
            // Test Var type
            const varType: Type = { type: "Var", id: 1, level: 0 };
            expect(varType.type).toBe("Var");

            // Test Const type
            const constType: Type = { type: "Const", name: "Int" };
            expect(constType.type).toBe("Const");

            // Test Fun type
            const funType: Type = {
                type: "Fun",
                params: [{ type: "Const", name: "Int" }],
                return: { type: "Const", name: "String" },
            };
            expect(funType.type).toBe("Fun");

            // Test App type
            const appType: Type = {
                type: "App",
                constructor: { type: "Const", name: "List" },
                args: [{ type: "Const", name: "Int" }],
            };
            expect(appType.type).toBe("App");

            // Test Record type
            const recordType: Type = {
                type: "Record",
                fields: new Map([["x", { type: "Const", name: "Int" }]]),
            };
            expect(recordType.type).toBe("Record");

            // Test Variant type
            const variantType: Type = {
                type: "Variant",
                name: "Option",
                constructors: new Map([["Some", [{ type: "Var", id: 1, level: 0 }]]]),
            };
            expect(variantType.type).toBe("Variant");

            // Test Union type
            const unionType: Type = {
                type: "Union",
                types: [
                    { type: "Const", name: "Int" },
                    { type: "Const", name: "String" },
                ],
            };
            expect(unionType.type).toBe("Union");

            // Test Tuple type
            const tupleType: Type = {
                type: "Tuple",
                elements: [
                    { type: "Const", name: "Int" },
                    { type: "Const", name: "String" },
                ],
            };
            expect(tupleType.type).toBe("Tuple");

            // Test Ref type
            const refType: Type = {
                type: "Ref",
                inner: { type: "Const", name: "Int" },
            };
            expect(refType.type).toBe("Ref");

            // Test Never type
            const neverType: Type = { type: "Never" };
            expect(neverType.type).toBe("Never");
        });
    });
});
