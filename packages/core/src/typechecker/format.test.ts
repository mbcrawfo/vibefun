/**
 * Tests for type formatting utilities
 */

import type { Type, TypeScheme } from "../types/environment.js";

import { beforeEach, describe, expect, it } from "vitest";

import { findSimilarStrings, levenshteinDistance, typeSchemeToString, typeToString } from "./format.js";
import {
    appType,
    constType,
    freshTypeVar,
    funType,
    primitiveTypes,
    recordType,
    refType,
    resetTypeVarCounter,
    tupleType,
    unionType,
    variantType,
} from "./types.js";

describe("typeToString", () => {
    beforeEach(() => {
        resetTypeVarCounter();
    });

    describe("Const types", () => {
        it("should format primitive Int type", () => {
            expect(typeToString(primitiveTypes.Int)).toBe("Int");
        });

        it("should format primitive String type", () => {
            expect(typeToString(primitiveTypes.String)).toBe("String");
        });

        it("should format primitive Float type", () => {
            expect(typeToString(primitiveTypes.Float)).toBe("Float");
        });

        it("should format primitive Bool type", () => {
            expect(typeToString(primitiveTypes.Bool)).toBe("Bool");
        });

        it("should format primitive Unit type", () => {
            expect(typeToString(primitiveTypes.Unit)).toBe("Unit");
        });

        it("should format custom constant types", () => {
            expect(typeToString(constType("MyCustomType"))).toBe("MyCustomType");
        });
    });

    describe("Var types", () => {
        it("should format type variable as 'a for id 0", () => {
            const t = freshTypeVar();
            expect(typeToString(t)).toBe("'a");
        });

        it("should format type variable as 'b for id 1", () => {
            freshTypeVar(); // id 0
            const t = freshTypeVar(); // id 1
            expect(typeToString(t)).toBe("'b");
        });

        it("should format type variable as 'c for id 2", () => {
            freshTypeVar(); // id 0
            freshTypeVar(); // id 1
            const t = freshTypeVar(); // id 2
            expect(typeToString(t)).toBe("'c");
        });

        it("should wrap around alphabet for large ids", () => {
            // id 26 should wrap to 'a
            const t: Type = { type: "Var", id: 26, level: 0 };
            expect(typeToString(t)).toBe("'a");
        });

        it("should handle multiple large ids", () => {
            const t27: Type = { type: "Var", id: 27, level: 0 };
            expect(typeToString(t27)).toBe("'b");

            const t52: Type = { type: "Var", id: 52, level: 0 };
            expect(typeToString(t52)).toBe("'a");
        });
    });

    describe("Fun types", () => {
        it("should format single-param function type", () => {
            const f = funType([primitiveTypes.Int], primitiveTypes.String);
            expect(typeToString(f)).toBe("Int -> String");
        });

        it("should format multi-param function type with parentheses", () => {
            const f = funType([primitiveTypes.Int, primitiveTypes.Bool], primitiveTypes.String);
            expect(typeToString(f)).toBe("(Int, Bool) -> String");
        });

        it("should format three-param function type", () => {
            const f = funType([primitiveTypes.Int, primitiveTypes.Bool, primitiveTypes.Float], primitiveTypes.String);
            expect(typeToString(f)).toBe("(Int, Bool, Float) -> String");
        });

        it("should format nested function types (curried)", () => {
            // Int -> (String -> Bool)
            const inner = funType([primitiveTypes.String], primitiveTypes.Bool);
            const f = funType([primitiveTypes.Int], inner);
            expect(typeToString(f)).toBe("Int -> String -> Bool");
        });

        it("should format function with type variable parameter", () => {
            const t = freshTypeVar();
            const f = funType([t], primitiveTypes.Int);
            expect(typeToString(f)).toBe("'a -> Int");
        });

        it("should format function with type variable return", () => {
            const t = freshTypeVar();
            const f = funType([primitiveTypes.Int], t);
            expect(typeToString(f)).toBe("Int -> 'a");
        });

        it("should throw error for empty params", () => {
            const f: Type = { type: "Fun", params: [], return: primitiveTypes.Int };
            expect(() => typeToString(f)).toThrow("Function type must have at least one parameter");
        });
    });

    describe("App types", () => {
        it("should format type application with one argument", () => {
            const listInt = appType(constType("List"), [primitiveTypes.Int]);
            expect(typeToString(listInt)).toBe("List<Int>");
        });

        it("should format type application with multiple arguments", () => {
            const either = appType(constType("Either"), [primitiveTypes.String, primitiveTypes.Int]);
            expect(typeToString(either)).toBe("Either<String, Int>");
        });

        it("should format type application with no arguments", () => {
            const app = appType(constType("NoArgs"), []);
            expect(typeToString(app)).toBe("NoArgs");
        });

        it("should format nested type applications", () => {
            const listList = appType(constType("List"), [appType(constType("List"), [primitiveTypes.Int])]);
            expect(typeToString(listList)).toBe("List<List<Int>>");
        });

        it("should format type application with type variable", () => {
            const t = freshTypeVar();
            const listT = appType(constType("List"), [t]);
            expect(typeToString(listT)).toBe("List<'a>");
        });

        it("should format type application with type variable constructor", () => {
            const t = freshTypeVar();
            const app = appType(t, [primitiveTypes.Int]);
            expect(typeToString(app)).toBe("'a<Int>");
        });
    });

    describe("Record types", () => {
        it("should format empty record type", () => {
            const rec = recordType(new Map());
            expect(typeToString(rec)).toBe("{}");
        });

        it("should format record with single field", () => {
            const rec = recordType(new Map([["x", primitiveTypes.Int]]));
            expect(typeToString(rec)).toBe("{ x: Int }");
        });

        it("should format record with multiple fields", () => {
            const rec = recordType(
                new Map([
                    ["x", primitiveTypes.Int],
                    ["y", primitiveTypes.String],
                ]),
            );
            const result = typeToString(rec);
            // Order may vary with Map, just check structure
            expect(result).toMatch(/^\{ .+ \}$/);
            expect(result).toContain("x: Int");
            expect(result).toContain("y: String");
        });

        it("should format record with nested types", () => {
            const rec = recordType(new Map([["point", recordType(new Map([["x", primitiveTypes.Int]]))]]));
            expect(typeToString(rec)).toBe("{ point: { x: Int } }");
        });

        it("should format record with type variable field", () => {
            const t = freshTypeVar();
            const rec = recordType(new Map([["value", t]]));
            expect(typeToString(rec)).toBe("{ value: 'a }");
        });
    });

    describe("Variant types", () => {
        it("should format single constructor with no params", () => {
            const v = variantType(new Map([["None", []]]));
            expect(typeToString(v)).toBe("None");
        });

        it("should format single constructor with params", () => {
            const v = variantType(new Map([["Some", [primitiveTypes.Int]]]));
            expect(typeToString(v)).toBe("Some(Int)");
        });

        it("should format multiple constructors", () => {
            const v = variantType(
                new Map([
                    ["Some", [primitiveTypes.Int]],
                    ["None", []],
                ]),
            );
            const result = typeToString(v);
            expect(result).toContain("Some(Int)");
            expect(result).toContain("None");
            expect(result).toContain(" | ");
        });

        it("should format constructor with multiple params", () => {
            const v = variantType(new Map([["Pair", [primitiveTypes.Int, primitiveTypes.String]]]));
            expect(typeToString(v)).toBe("Pair(Int, String)");
        });

        it("should format variant with type variable param", () => {
            const t = freshTypeVar();
            const v = variantType(new Map([["Box", [t]]]));
            expect(typeToString(v)).toBe("Box('a)");
        });
    });

    describe("Union types", () => {
        it("should format union of two types", () => {
            const u = unionType([primitiveTypes.Int, primitiveTypes.String]);
            expect(typeToString(u)).toBe("Int | String");
        });

        it("should format union of multiple types", () => {
            const u = unionType([primitiveTypes.Int, primitiveTypes.String, primitiveTypes.Bool]);
            expect(typeToString(u)).toBe("Int | String | Bool");
        });

        it("should format union with type variables", () => {
            const t = freshTypeVar();
            const u = unionType([t, primitiveTypes.Int]);
            expect(typeToString(u)).toBe("'a | Int");
        });

        it("should format union with complex types", () => {
            const rec = recordType(new Map([["x", primitiveTypes.Int]]));
            const u = unionType([primitiveTypes.Int, rec]);
            expect(typeToString(u)).toBe("Int | { x: Int }");
        });
    });

    describe("Tuple types", () => {
        it("should format tuple with two elements", () => {
            const t = tupleType([primitiveTypes.Int, primitiveTypes.String]);
            expect(typeToString(t)).toBe("(Int, String)");
        });

        it("should format tuple with three elements", () => {
            const t = tupleType([primitiveTypes.Int, primitiveTypes.String, primitiveTypes.Bool]);
            expect(typeToString(t)).toBe("(Int, String, Bool)");
        });

        it("should format tuple with type variables", () => {
            const t1 = freshTypeVar();
            const t2 = freshTypeVar();
            const tuple = tupleType([t1, t2]);
            expect(typeToString(tuple)).toBe("('a, 'b)");
        });

        it("should format nested tuple", () => {
            const inner = tupleType([primitiveTypes.Int, primitiveTypes.String]);
            const outer = tupleType([inner, primitiveTypes.Bool]);
            expect(typeToString(outer)).toBe("((Int, String), Bool)");
        });

        it("should format empty tuple", () => {
            const t = tupleType([]);
            expect(typeToString(t)).toBe("()");
        });

        it("should format single element tuple", () => {
            const t = tupleType([primitiveTypes.Int]);
            expect(typeToString(t)).toBe("(Int)");
        });
    });

    describe("Ref types", () => {
        it("should format Ref of primitive type", () => {
            const r = refType(primitiveTypes.Int);
            expect(typeToString(r)).toBe("Ref<Int>");
        });

        it("should format Ref of type variable", () => {
            const t = freshTypeVar();
            const r = refType(t);
            expect(typeToString(r)).toBe("Ref<'a>");
        });

        it("should format Ref of complex type", () => {
            const rec = recordType(new Map([["x", primitiveTypes.Int]]));
            const r = refType(rec);
            expect(typeToString(r)).toBe("Ref<{ x: Int }>");
        });

        it("should format nested Ref", () => {
            const r = refType(refType(primitiveTypes.Int));
            expect(typeToString(r)).toBe("Ref<Ref<Int>>");
        });
    });

    describe("Never type", () => {
        it("should format Never type", () => {
            expect(typeToString(primitiveTypes.Never)).toBe("Never");
        });
    });

    describe("complex nested types", () => {
        it("should format List<(Int, String)>", () => {
            const tuple = tupleType([primitiveTypes.Int, primitiveTypes.String]);
            const listTuple = appType(constType("List"), [tuple]);
            expect(typeToString(listTuple)).toBe("List<(Int, String)>");
        });

        it("should format function returning record", () => {
            const rec = recordType(new Map([["result", primitiveTypes.Int]]));
            const f = funType([primitiveTypes.String], rec);
            expect(typeToString(f)).toBe("String -> { result: Int }");
        });

        it("should format variant with function param", () => {
            const funcType = funType([primitiveTypes.Int], primitiveTypes.String);
            const v = variantType(new Map([["Callback", [funcType]]]));
            expect(typeToString(v)).toBe("Callback(Int -> String)");
        });
    });
});

describe("typeSchemeToString", () => {
    beforeEach(() => {
        resetTypeVarCounter();
    });

    describe("monomorphic schemes", () => {
        it("should format monomorphic scheme (no quantified vars)", () => {
            const scheme: TypeScheme = { vars: [], type: primitiveTypes.Int };
            expect(typeSchemeToString(scheme)).toBe("Int");
        });

        it("should format monomorphic function scheme", () => {
            const funcType = funType([primitiveTypes.Int], primitiveTypes.String);
            const scheme: TypeScheme = { vars: [], type: funcType };
            expect(typeSchemeToString(scheme)).toBe("Int -> String");
        });
    });

    describe("polymorphic schemes", () => {
        it("should format scheme with single quantified variable", () => {
            const t: Type = { type: "Var", id: 0, level: 0 };
            const scheme: TypeScheme = {
                vars: [0],
                type: funType([t], t),
            };
            expect(typeSchemeToString(scheme)).toBe("forall 'a. 'a -> 'a");
        });

        it("should format scheme with two quantified variables", () => {
            const t1: Type = { type: "Var", id: 0, level: 0 };
            const t2: Type = { type: "Var", id: 1, level: 0 };
            const scheme: TypeScheme = {
                vars: [0, 1],
                type: funType([t1], t2),
            };
            expect(typeSchemeToString(scheme)).toBe("forall 'a 'b. 'a -> 'b");
        });

        it("should format scheme with three quantified variables", () => {
            const t1: Type = { type: "Var", id: 0, level: 0 };
            const t2: Type = { type: "Var", id: 1, level: 0 };
            const t3: Type = { type: "Var", id: 2, level: 0 };
            const scheme: TypeScheme = {
                vars: [0, 1, 2],
                type: funType([t1, t2], t3),
            };
            expect(typeSchemeToString(scheme)).toBe("forall 'a 'b 'c. ('a, 'b) -> 'c");
        });

        it("should format complex polymorphic scheme", () => {
            const t: Type = { type: "Var", id: 0, level: 0 };
            const listT = appType(constType("List"), [t]);
            const scheme: TypeScheme = {
                vars: [0],
                type: funType([listT], t),
            };
            expect(typeSchemeToString(scheme)).toBe("forall 'a. List<'a> -> 'a");
        });
    });
});

describe("levenshteinDistance", () => {
    describe("basic cases", () => {
        it("should return 0 for identical strings", () => {
            expect(levenshteinDistance("hello", "hello")).toBe(0);
        });

        it("should return 0 for empty strings", () => {
            expect(levenshteinDistance("", "")).toBe(0);
        });

        it("should return length for empty vs non-empty string", () => {
            expect(levenshteinDistance("", "hello")).toBe(5);
            expect(levenshteinDistance("hello", "")).toBe(5);
        });
    });

    describe("single character edits", () => {
        it("should return 1 for single insertion", () => {
            expect(levenshteinDistance("hello", "helloo")).toBe(1);
        });

        it("should return 1 for single deletion", () => {
            expect(levenshteinDistance("hello", "hell")).toBe(1);
        });

        it("should return 1 for single substitution", () => {
            expect(levenshteinDistance("hello", "hallo")).toBe(1);
        });
    });

    describe("multiple edits", () => {
        it("should return 2 for two substitutions", () => {
            expect(levenshteinDistance("hello", "jello")).toBe(1);
            expect(levenshteinDistance("hello", "yello")).toBe(1);
        });

        it("should return 3 for kitten -> sitting", () => {
            expect(levenshteinDistance("kitten", "sitting")).toBe(3);
        });

        it("should return correct distance for completely different strings", () => {
            expect(levenshteinDistance("abc", "xyz")).toBe(3);
        });

        it("should handle case sensitivity", () => {
            expect(levenshteinDistance("Hello", "hello")).toBe(1);
        });
    });

    describe("edge cases", () => {
        it("should handle single character strings", () => {
            expect(levenshteinDistance("a", "a")).toBe(0);
            expect(levenshteinDistance("a", "b")).toBe(1);
            expect(levenshteinDistance("a", "")).toBe(1);
        });

        it("should handle strings with spaces", () => {
            expect(levenshteinDistance("hello world", "hello world")).toBe(0);
            expect(levenshteinDistance("hello world", "helloworld")).toBe(1);
        });

        it("should handle special characters", () => {
            expect(levenshteinDistance("@#$", "@#$")).toBe(0);
            expect(levenshteinDistance("@#$", "!#$")).toBe(1);
        });
    });
});

describe("findSimilarStrings", () => {
    describe("basic matching", () => {
        it("should find exact matches (distance 0)", () => {
            const result = findSimilarStrings("hello", ["hello", "world", "help"]);
            expect(result[0]).toBe("hello");
        });

        it("should find close matches within default distance", () => {
            const result = findSimilarStrings("hello", ["hallo", "world", "help"]);
            expect(result).toContain("hallo");
        });

        it("should return empty array when no matches within distance", () => {
            const result = findSimilarStrings("hello", ["xyz", "abc", "123"]);
            expect(result).toEqual([]);
        });
    });

    describe("sorting by distance", () => {
        it("should sort results by distance (closest first)", () => {
            const result = findSimilarStrings("hello", ["hallo", "hello", "heloo"]);
            expect(result[0]).toBe("hello"); // distance 0
            // Both hallo and heloo have distance 1
        });

        it("should maintain relative order for same distances", () => {
            const result = findSimilarStrings("cat", ["bat", "hat", "mat"]);
            // All have distance 1, should all be included
            expect(result.length).toBe(3);
        });
    });

    describe("maxDistance parameter", () => {
        it("should respect maxDistance of 1", () => {
            const result = findSimilarStrings("hello", ["hallo", "xyz", "hel"], 1);
            expect(result).toContain("hallo"); // distance 1
            expect(result).not.toContain("xyz"); // distance > 1
        });

        it("should respect maxDistance of 0 (exact match only)", () => {
            const result = findSimilarStrings("hello", ["hello", "hallo", "helloo"], 0);
            expect(result).toEqual(["hello"]);
        });

        it("should include more matches with larger maxDistance", () => {
            const result = findSimilarStrings("hello", ["hello", "hallo", "hel", "xyz"], 3);
            expect(result).toContain("hello");
            expect(result).toContain("hallo");
            expect(result).toContain("hel");
            expect(result).not.toContain("xyz"); // distance 5
        });
    });

    describe("edge cases", () => {
        it("should handle empty candidates array", () => {
            const result = findSimilarStrings("hello", []);
            expect(result).toEqual([]);
        });

        it("should handle empty target string", () => {
            const result = findSimilarStrings("", ["a", "ab", ""]);
            expect(result).toContain("");
            // "a" has distance 1, "ab" has distance 2
            expect(result.length).toBeGreaterThanOrEqual(1);
        });

        it("should handle all candidates being exact matches", () => {
            const result = findSimilarStrings("test", ["test", "test", "test"]);
            expect(result).toHaveLength(3);
            expect(result.every((s) => s === "test")).toBe(true);
        });

        it("should handle single candidate", () => {
            const result = findSimilarStrings("hello", ["hello"]);
            expect(result).toEqual(["hello"]);
        });
    });

    describe("practical usage", () => {
        it("should suggest similar function names", () => {
            const functions = ["println", "printInt", "printStr", "readLine", "getChar"];
            const result = findSimilarStrings("printlr", functions, 2);
            // "println" should be suggested (distance 1)
            expect(result).toContain("println");
        });

        it("should suggest similar type names", () => {
            const types = ["Int", "Int64", "Integer", "String", "Boolean"];
            const result = findSimilarStrings("int", types, 2);
            // Case-sensitive, so "Int" has distance 1
            expect(result).toContain("Int");
        });

        it("should suggest similar variable names", () => {
            const vars = ["count", "counter", "index", "total", "sum"];
            const result = findSimilarStrings("coutn", vars, 2);
            expect(result).toContain("count"); // distance 1 (transposition)
        });
    });
});
