/**
 * Generic External Declarations Tests
 *
 * Tests for external declarations with type parameters as specified in:
 * docs/spec/10-javascript-interop/external-declarations.md:325
 */

import type { Declaration, Module } from "../types/index.js";

import { describe, expect, it } from "vitest";

import { Lexer } from "../lexer/index.js";
import { Parser } from "./parser.js";

// Helper to parse a module from source code
function parseModule(source: string): Module {
    const lexer = new Lexer(source, "test.vf");
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens, "test.vf");
    return parser.parse();
}

// Helper to get first declaration
function parseDecl(source: string): Declaration {
    const module = parseModule(source);
    const decl = module.declarations[0];
    if (!decl) {
        throw new Error("Expected at least one declaration in parsed module");
    }
    return decl;
}

describe("Parser - Generic External Declarations", () => {
    describe("basic generic externals", () => {
        it("should parse external with single type parameter", () => {
            const decl = parseDecl('external identity: <T>(T) -> T = "id";');

            expect(decl).toMatchObject({
                kind: "ExternalDecl",
                name: "identity",
                typeParams: ["T"],
                typeExpr: {
                    kind: "FunctionType",
                    params: [{ kind: "TypeConst", name: "T" }],
                    return_: { kind: "TypeConst", name: "T" },
                },
                jsName: "id",
            });
            expect(decl.kind === "ExternalDecl" && decl.exported).toBe(false);
        });

        it("should parse external with multiple type parameters", () => {
            const decl = parseDecl('external map: <A, B>(Array<A>, (A) -> B) -> Array<B> = "map";');

            expect(decl).toMatchObject({
                kind: "ExternalDecl",
                name: "map",
                typeParams: ["A", "B"],
                jsName: "map",
            });

            // Verify type structure
            if (decl.kind !== "ExternalDecl") return;
            expect(decl.typeExpr.kind).toBe("FunctionType");
        });

        it("should parse external with three type parameters", () => {
            const decl = parseDecl('external compose: <A, B, C>((B) -> C, (A) -> B) -> (A) -> C = "compose";');

            expect(decl).toMatchObject({
                kind: "ExternalDecl",
                name: "compose",
                typeParams: ["A", "B", "C"],
                jsName: "compose",
            });
        });
    });

    describe("generic externals with from clause", () => {
        it("should parse generic external with from clause", () => {
            const decl = parseDecl('external map: <A, B>(Array<A>, (A) -> B) -> Array<B> = "map" from "array-utils";');

            expect(decl).toMatchObject({
                kind: "ExternalDecl",
                name: "map",
                typeParams: ["A", "B"],
                jsName: "map",
                from: "array-utils",
            });
        });

        it("should parse generic external with complex module path", () => {
            const decl = parseDecl(
                'external zip: <A, B>(Array<A>, Array<B>) -> Array<(A, B)> = "zip" from "./utils/array.js";',
            );

            expect(decl).toMatchObject({
                kind: "ExternalDecl",
                name: "zip",
                typeParams: ["A", "B"],
                from: "./utils/array.js",
            });
        });
    });

    describe("exported generic externals", () => {
        it("should parse exported generic external", () => {
            const decl = parseDecl('export external map: <A, B>(List<A>, (A) -> B) -> List<B> = "map";');

            expect(decl).toMatchObject({
                kind: "ExternalDecl",
                name: "map",
                typeParams: ["A", "B"],
                exported: true,
            });
        });

        it("should parse exported generic external with from clause", () => {
            const decl = parseDecl(
                'export external filter: <T>(Array<T>, (T) -> Bool) -> Array<T> = "filter" from "lodash";',
            );

            expect(decl).toMatchObject({
                kind: "ExternalDecl",
                name: "filter",
                typeParams: ["T"],
                exported: true,
                from: "lodash",
            });
        });
    });

    describe("complex generic type signatures", () => {
        it("should parse higher-order generic function", () => {
            const decl = parseDecl('external foldLeft: <A, B>(Array<A>, B, (B, A) -> B) -> B = "reduce";');

            expect(decl).toMatchObject({
                kind: "ExternalDecl",
                name: "foldLeft",
                typeParams: ["A", "B"],
                jsName: "reduce",
            });

            // Verify it's a function type
            if (decl.kind !== "ExternalDecl") return;
            expect(decl.typeExpr.kind).toBe("FunctionType");
        });

        it("should parse generic with nested type constructors", () => {
            const decl = parseDecl('external flatMap: <A, B>(Option<A>, (A) -> Option<B>) -> Option<B> = "flatMap";');

            expect(decl).toMatchObject({
                kind: "ExternalDecl",
                name: "flatMap",
                typeParams: ["A", "B"],
                jsName: "flatMap",
            });
        });

        it("should parse generic with tuple types", () => {
            const decl = parseDecl('external unzip: <A, B>(Array<(A, B)>) -> (Array<A>, Array<B>) = "unzip";');

            expect(decl).toMatchObject({
                kind: "ExternalDecl",
                name: "unzip",
                typeParams: ["A", "B"],
                jsName: "unzip",
            });
        });

        it("should parse generic returning function type", () => {
            const decl = parseDecl('external curry: <A, B, C>((A, B) -> C) -> (A) -> (B) -> C = "curry";');

            expect(decl).toMatchObject({
                kind: "ExternalDecl",
                name: "curry",
                typeParams: ["A", "B", "C"],
                jsName: "curry",
            });
        });
    });

    describe("generic externals in blocks", () => {
        it("should parse generic external value in block", () => {
            const decl = parseDecl(`external {
                map: <A, B>(Array<A>, (A) -> B) -> Array<B> = "Array.prototype.map";
                filter: <T>(Array<T>, (T) -> Bool) -> Array<T> = "Array.prototype.filter";
            };`);

            expect(decl.kind).toBe("ExternalBlock");
            if (decl.kind !== "ExternalBlock") return;

            expect(decl.items).toHaveLength(2);

            expect(decl.items[0]!).toMatchObject({
                kind: "ExternalValue",
                name: "map",
                typeParams: ["A", "B"],
                jsName: "Array.prototype.map",
            });

            expect(decl.items[1]!).toMatchObject({
                kind: "ExternalValue",
                name: "filter",
                typeParams: ["T"],
                jsName: "Array.prototype.filter",
            });
        });

        it("should parse generic external block with from clause", () => {
            const decl = parseDecl(`external from "lodash" {
                map: <A, B>(Array<A>, (A) -> B) -> Array<B> = "map";
                filter: <T>(Array<T>, (T) -> Bool) -> Array<T> = "filter";
            };`);

            expect(decl.kind).toBe("ExternalBlock");
            if (decl.kind !== "ExternalBlock") return;

            expect(decl.from).toBe("lodash");
            expect(decl.items).toHaveLength(2);

            expect(decl.items[0]!).toMatchObject({
                kind: "ExternalValue",
                name: "map",
                typeParams: ["A", "B"],
            });
        });

        it("should parse mixed generic and non-generic externals in block", () => {
            const decl = parseDecl(`external {
                map: <A, B>(Array<A>, (A) -> B) -> Array<B> = "map";
                log: (String) -> Unit = "console.log";
                filter: <T>(Array<T>, (T) -> Bool) -> Array<T> = "filter";
            };`);

            expect(decl.kind).toBe("ExternalBlock");
            if (decl.kind !== "ExternalBlock") return;

            expect(decl.items).toHaveLength(3);

            // First is generic
            expect(decl.items[0]!).toMatchObject({
                kind: "ExternalValue",
                name: "map",
                typeParams: ["A", "B"],
            });

            // Second is not generic
            expect(decl.items[1]!).toMatchObject({
                kind: "ExternalValue",
                name: "log",
                jsName: "console.log",
            });
            // Verify that typeParams is undefined for non-generic externals
            expect(decl.items[1]!.typeParams).toBeUndefined();

            // Third is generic
            expect(decl.items[2]!).toMatchObject({
                kind: "ExternalValue",
                name: "filter",
                typeParams: ["T"],
            });
        });

        it("should parse exported generic external block", () => {
            const decl = parseDecl(`export external {
                map: <A, B>(Array<A>, (A) -> B) -> Array<B> = "map";
            };`);

            expect(decl.kind).toBe("ExternalBlock");
            if (decl.kind !== "ExternalBlock") return;

            expect(decl.exported).toBe(true);
            expect(decl.items[0]!).toMatchObject({
                kind: "ExternalValue",
                name: "map",
                typeParams: ["A", "B"],
            });
        });
    });

    describe("spec examples", () => {
        it("should parse spec example: generic map", () => {
            const decl = parseDecl('external map: <A, B>(Array<A>, (A) -> B) -> Array<B> = "map" from "array-utils";');

            expect(decl).toMatchObject({
                kind: "ExternalDecl",
                name: "map",
                typeParams: ["A", "B"],
                jsName: "map",
                from: "array-utils",
            });
        });

        it("should parse spec example: zip with multiple type params", () => {
            const decl = parseDecl('external zip: <A, B>(Array<A>, Array<B>) -> Array<(A, B)> = "zip";');

            expect(decl).toMatchObject({
                kind: "ExternalDecl",
                name: "zip",
                typeParams: ["A", "B"],
                jsName: "zip",
            });
        });

        it("should parse spec example: compose with three type params", () => {
            const decl = parseDecl('external compose: <A, B, C>((B) -> C, (A) -> B) -> (A) -> C = "compose";');

            expect(decl).toMatchObject({
                kind: "ExternalDecl",
                name: "compose",
                typeParams: ["A", "B", "C"],
                jsName: "compose",
            });
        });

        it("should parse spec example: sort with implied constraints", () => {
            const decl = parseDecl('external sort: <T>(Array<T>, (T, T) -> Int) -> Array<T> = "sort";');

            expect(decl).toMatchObject({
                kind: "ExternalDecl",
                name: "sort",
                typeParams: ["T"],
                jsName: "sort",
            });
        });
    });

    describe("edge cases", () => {
        it("should handle whitespace around type parameters", () => {
            const decl = parseDecl('external map: < A , B >(Array<A>, (A) -> B) -> Array<B> = "map";');

            expect(decl).toMatchObject({
                kind: "ExternalDecl",
                name: "map",
                typeParams: ["A", "B"],
            });
        });

        it("should parse single character type parameters", () => {
            const decl = parseDecl('external map: <A, B, C, D>(A, B, C, D) -> D = "x";');

            expect(decl).toMatchObject({
                kind: "ExternalDecl",
                name: "map",
                typeParams: ["A", "B", "C", "D"],
            });
        });

        it("should parse longer type parameter names", () => {
            const decl = parseDecl('external convert: <Input, Output>(Input) -> Output = "convert";');

            expect(decl).toMatchObject({
                kind: "ExternalDecl",
                name: "convert",
                typeParams: ["Input", "Output"],
            });
        });
    });

    describe("error cases", () => {
        it("should throw on empty type parameter list", () => {
            expect(() => parseDecl('external id: <>(Int) -> Int = "id";')).toThrow();
        });

        it("should throw on unclosed type parameter list", () => {
            expect(() => parseDecl('external id: <T(T) -> T = "id";')).toThrow();
        });

        it("should throw on invalid type parameter (not identifier)", () => {
            expect(() => parseDecl('external id: <123>(Int) -> Int = "id";')).toThrow();
        });

        it("should throw on missing comma between type params", () => {
            expect(() => parseDecl('external map: <A B>(A) -> B = "map";')).toThrow();
        });

        it("should allow trailing comma in type params", () => {
            const decl = parseDecl('external map: <A, B,>(A) -> B = "map";');
            expect(decl.kind).toBe("ExternalDecl");
            if (decl.kind !== "ExternalDecl") return;
            expect(decl.typeParams).toHaveLength(2);
        });
    });
});
