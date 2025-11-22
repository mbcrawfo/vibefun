/**
 * Import Namespace Tests - Phase 4.1
 *
 * Tests for import * as Namespace syntax
 * Spec: docs/spec/08-modules.md:27
 */

import type { Module } from "../types/index.js";

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

describe("Parser - Import Namespace (Phase 4.1)", () => {
    describe("basic namespace imports", () => {
        it("parses basic namespace import", () => {
            const module = parseModule('import * as List from "./list";');
            expect(module.imports).toHaveLength(1);
            const imp = module.imports[0]!;
            expect(imp).toBeDefined();
            expect(imp).toMatchObject({
                kind: "ImportDecl",
                items: [{ name: "*", alias: "List", isType: false }],
                from: "./list",
            });
        });

        it("parses namespace import with lowercase identifier", () => {
            const module = parseModule('import * as utils from "./utils";');
            expect(module.imports).toHaveLength(1);
            const imp = module.imports[0]!;
            expect(imp).toMatchObject({
                kind: "ImportDecl",
                items: [{ name: "*", alias: "utils", isType: false }],
                from: "./utils",
            });
        });

        it("parses namespace import with multiple word identifier", () => {
            const module = parseModule('import * as StringUtils from "./string-utils";');
            expect(module.imports).toHaveLength(1);
            const imp = module.imports[0]!;
            expect(imp).toMatchObject({
                kind: "ImportDecl",
                items: [{ name: "*", alias: "StringUtils", isType: false }],
                from: "./string-utils",
            });
        });

        it("parses namespace import from relative path", () => {
            const module = parseModule('import * as Parent from "../parent";');
            expect(module.imports).toHaveLength(1);
            const imp = module.imports[0]!;
            expect(imp).toMatchObject({
                kind: "ImportDecl",
                items: [{ name: "*", alias: "Parent", isType: false }],
                from: "../parent",
            });
        });

        it("parses namespace import from nested path", () => {
            const module = parseModule('import * as Utils from "./utils/index";');
            expect(module.imports).toHaveLength(1);
            const imp = module.imports[0]!;
            expect(imp).toMatchObject({
                kind: "ImportDecl",
                items: [{ name: "*", alias: "Utils", isType: false }],
                from: "./utils/index",
            });
        });

        it("parses namespace import from package", () => {
            const module = parseModule('import * as Std from "std/list";');
            expect(module.imports).toHaveLength(1);
            const imp = module.imports[0]!;
            expect(imp).toMatchObject({
                kind: "ImportDecl",
                items: [{ name: "*", alias: "Std", isType: false }],
                from: "std/list",
            });
        });
    });

    describe("type namespace imports", () => {
        it("parses type namespace import", () => {
            const module = parseModule('import type * as Types from "./types";');
            expect(module.imports).toHaveLength(1);
            const imp = module.imports[0]!;
            expect(imp).toMatchObject({
                kind: "ImportDecl",
                items: [{ name: "*", alias: "Types", isType: true }],
                from: "./types",
            });
        });

        it("parses type namespace import with uppercase identifier", () => {
            const module = parseModule('import type * as API from "./api";');
            expect(module.imports).toHaveLength(1);
            const imp = module.imports[0]!;
            expect(imp).toMatchObject({
                kind: "ImportDecl",
                items: [{ name: "*", alias: "API", isType: true }],
                from: "./api",
            });
        });

        it("parses type namespace from package", () => {
            const module = parseModule('import type * as StdTypes from "std/types";');
            expect(module.imports).toHaveLength(1);
            const imp = module.imports[0]!;
            expect(imp).toMatchObject({
                kind: "ImportDecl",
                items: [{ name: "*", alias: "StdTypes", isType: true }],
                from: "std/types",
            });
        });
    });

    describe("multiple namespace imports", () => {
        it("parses multiple namespace imports", () => {
            const source = `
                import * as List from "./list";
                import * as String from "./string";
                import * as Math from "./math";
            `;
            const module = parseModule(source);
            expect(module.imports).toHaveLength(3);
            expect(module.imports[0]).toMatchObject({
                kind: "ImportDecl",
                items: [{ name: "*", alias: "List", isType: false }],
                from: "./list",
            });
            expect(module.imports[1]).toMatchObject({
                kind: "ImportDecl",
                items: [{ name: "*", alias: "String", isType: false }],
                from: "./string",
            });
            expect(module.imports[2]).toMatchObject({
                kind: "ImportDecl",
                items: [{ name: "*", alias: "Math", isType: false }],
                from: "./math",
            });
        });

        it("parses mixed namespace and named imports", () => {
            const source = `
                import * as List from "./list";
                import { map, filter } from "./array";
            `;
            const module = parseModule(source);
            expect(module.imports).toHaveLength(2);
            expect(module.imports[0]).toMatchObject({
                kind: "ImportDecl",
                items: [{ name: "*", alias: "List", isType: false }],
                from: "./list",
            });
            expect(module.imports[1]).toMatchObject({
                kind: "ImportDecl",
                items: [
                    { name: "map", isType: false },
                    { name: "filter", isType: false },
                ],
                from: "./array",
            });
        });

        it("parses mixed type and value namespace imports", () => {
            const source = `
                import type * as Types from "./types";
                import * as Values from "./values";
            `;
            const module = parseModule(source);
            expect(module.imports).toHaveLength(2);
            expect(module.imports[0]).toMatchObject({
                kind: "ImportDecl",
                items: [{ name: "*", alias: "Types", isType: true }],
                from: "./types",
            });
            expect(module.imports[1]).toMatchObject({
                kind: "ImportDecl",
                items: [{ name: "*", alias: "Values", isType: false }],
                from: "./values",
            });
        });
    });

    describe("namespace import usage scenarios", () => {
        it("parses namespace import with subsequent usage in declarations", () => {
            const source = `
                import * as List from "./list";
                let doubled = List.map(numbers, (x) => x * 2);
            `;
            const module = parseModule(source);
            expect(module.imports).toHaveLength(1);
            expect(module.declarations).toHaveLength(1);
            expect(module.imports[0]).toMatchObject({
                kind: "ImportDecl",
                items: [{ name: "*", alias: "List", isType: false }],
                from: "./list",
            });
        });

        it("parses type namespace import with subsequent code", () => {
            const source = `
                import type * as API from "./api";
                let x = 42;
            `;
            const module = parseModule(source);
            expect(module.imports).toHaveLength(1);
            expect(module.declarations).toHaveLength(1);
            expect(module.imports[0]).toMatchObject({
                kind: "ImportDecl",
                items: [{ name: "*", alias: "API", isType: true }],
                from: "./api",
            });
        });

        it("parses multiple namespace imports with usage", () => {
            const source = `
                import * as List from "./list";
                import * as String from "./string";
                let names = List.map(users, (u) => String.toUpper(u.name));
            `;
            const module = parseModule(source);
            expect(module.imports).toHaveLength(2);
            expect(module.declarations).toHaveLength(1);
        });
    });

    describe("error cases", () => {
        it("throws on namespace import without alias", () => {
            expect(() => parseModule('import * from "./list";')).toThrow();
        });

        it("throws on namespace import without 'as' keyword", () => {
            expect(() => parseModule('import * List from "./list";')).toThrow();
        });

        it("throws on namespace import without from clause", () => {
            expect(() => parseModule("import * as List;")).toThrow();
        });

        it("throws on namespace import with empty alias", () => {
            expect(() => parseModule('import * as from "./list";')).toThrow();
        });

        it("throws on namespace import with reserved keyword as alias", () => {
            expect(() => parseModule('import * as let from "./list";')).toThrow();
        });

        it("throws on namespace import with number as alias", () => {
            expect(() => parseModule('import * as 123 from "./list";')).toThrow();
        });
    });

    describe("whitespace and formatting", () => {
        it("parses namespace import with extra whitespace", () => {
            const module = parseModule('import   *   as   List   from   "./list"  ;');
            expect(module.imports).toHaveLength(1);
            const imp = module.imports[0]!;
            expect(imp).toMatchObject({
                kind: "ImportDecl",
                items: [{ name: "*", alias: "List", isType: false }],
                from: "./list",
            });
        });

        // Edge case: multi-line imports with newlines between tokens
        // Currently not supported - would require special newline handling
        it.skip("parses namespace import on multiple lines", () => {
            const source = `import *
                as List
                from "./list";`;
            const module = parseModule(source);
            expect(module.imports).toHaveLength(1);
            const imp = module.imports[0]!;
            expect(imp).toMatchObject({
                kind: "ImportDecl",
                items: [{ name: "*", alias: "List", isType: false }],
                from: "./list",
            });
        });

        it("parses type namespace import with extra whitespace", () => {
            const module = parseModule('import  type  *  as  Types  from  "./types"  ;');
            expect(module.imports).toHaveLength(1);
            const imp = module.imports[0]!;
            expect(imp).toMatchObject({
                kind: "ImportDecl",
                items: [{ name: "*", alias: "Types", isType: true }],
                from: "./types",
            });
        });
    });
});
