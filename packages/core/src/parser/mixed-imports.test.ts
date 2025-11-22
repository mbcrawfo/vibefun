/**
 * Mixed Type/Value Imports Tests - Phase 4.2
 *
 * Tests for mixing type and value imports in a single import statement
 * Spec: docs/spec/08-modules.md:33
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

describe("Parser - Mixed Type/Value Imports (Phase 4.2)", () => {
    describe("basic mixed imports", () => {
        it("parses mixed type and value import", () => {
            const module = parseModule('import { type User, getUser } from "./api";');
            expect(module.imports).toHaveLength(1);
            const imp = module.imports[0]!;
            expect(imp).toMatchObject({
                kind: "ImportDecl",
                items: [
                    { name: "User", isType: true },
                    { name: "getUser", isType: false },
                ],
                from: "./api",
            });
        });

        it("parses multiple types with values", () => {
            const module = parseModule('import { type User, type Post, getUser, updateUser } from "./api";');
            expect(module.imports).toHaveLength(1);
            const imp = module.imports[0]!;
            expect(imp).toMatchObject({
                kind: "ImportDecl",
                items: [
                    { name: "User", isType: true },
                    { name: "Post", isType: true },
                    { name: "getUser", isType: false },
                    { name: "updateUser", isType: false },
                ],
                from: "./api",
            });
        });

        it("parses values before types", () => {
            const module = parseModule('import { fetchData, type Response, type Error } from "./http";');
            expect(module.imports).toHaveLength(1);
            const imp = module.imports[0]!;
            expect(imp).toMatchObject({
                kind: "ImportDecl",
                items: [
                    { name: "fetchData", isType: false },
                    { name: "Response", isType: true },
                    { name: "Error", isType: true },
                ],
                from: "./http",
            });
        });

        it("parses interleaved types and values", () => {
            const module = parseModule('import { getValue, type Value, setValue, type Result } from "./store";');
            expect(module.imports).toHaveLength(1);
            const imp = module.imports[0]!;
            expect(imp).toMatchObject({
                kind: "ImportDecl",
                items: [
                    { name: "getValue", isType: false },
                    { name: "Value", isType: true },
                    { name: "setValue", isType: false },
                    { name: "Result", isType: true },
                ],
                from: "./store",
            });
        });
    });

    describe("mixed imports with aliases", () => {
        it("parses type import with alias", () => {
            const module = parseModule('import { type User as U, getUser } from "./api";');
            expect(module.imports).toHaveLength(1);
            const imp = module.imports[0]!;
            expect(imp).toMatchObject({
                kind: "ImportDecl",
                items: [
                    { name: "User", alias: "U", isType: true },
                    { name: "getUser", isType: false },
                ],
                from: "./api",
            });
        });

        it("parses value import with alias", () => {
            const module = parseModule('import { type User, getUser as fetch } from "./api";');
            expect(module.imports).toHaveLength(1);
            const imp = module.imports[0]!;
            expect(imp).toMatchObject({
                kind: "ImportDecl",
                items: [
                    { name: "User", isType: true },
                    { name: "getUser", alias: "fetch", isType: false },
                ],
                from: "./api",
            });
        });

        it("parses both types and values with aliases", () => {
            const module = parseModule('import { type User as U, getUser as fetchUser, type Post as P } from "./api";');
            expect(module.imports).toHaveLength(1);
            const imp = module.imports[0]!;
            expect(imp).toMatchObject({
                kind: "ImportDecl",
                items: [
                    { name: "User", alias: "U", isType: true },
                    { name: "getUser", alias: "fetchUser", isType: false },
                    { name: "Post", alias: "P", isType: true },
                ],
                from: "./api",
            });
        });

        it("parses mixed imports with multiple aliases", () => {
            const module = parseModule(
                'import { type Request as Req, type Response as Res, send as sendData, receive as getData } from "./rpc";',
            );
            expect(module.imports).toHaveLength(1);
            const imp = module.imports[0]!;
            expect(imp).toMatchObject({
                kind: "ImportDecl",
                items: [
                    { name: "Request", alias: "Req", isType: true },
                    { name: "Response", alias: "Res", isType: true },
                    { name: "send", alias: "sendData", isType: false },
                    { name: "receive", alias: "getData", isType: false },
                ],
                from: "./rpc",
            });
        });
    });

    describe("import type { ... } - all types", () => {
        it("parses import type with multiple types", () => {
            const module = parseModule('import type { User, Post, Comment } from "./types";');
            expect(module.imports).toHaveLength(1);
            const imp = module.imports[0]!;
            expect(imp).toMatchObject({
                kind: "ImportDecl",
                items: [
                    { name: "User", isType: true },
                    { name: "Post", isType: true },
                    { name: "Comment", isType: true },
                ],
                from: "./types",
            });
        });

        it("parses import type with aliases", () => {
            const module = parseModule('import type { User as U, Post as P } from "./types";');
            expect(module.imports).toHaveLength(1);
            const imp = module.imports[0]!;
            expect(imp).toMatchObject({
                kind: "ImportDecl",
                items: [
                    { name: "User", alias: "U", isType: true },
                    { name: "Post", alias: "P", isType: true },
                ],
                from: "./types",
            });
        });

        it("parses import type with single type", () => {
            const module = parseModule('import type { User } from "./types";');
            expect(module.imports).toHaveLength(1);
            const imp = module.imports[0]!;
            expect(imp).toMatchObject({
                kind: "ImportDecl",
                items: [{ name: "User", isType: true }],
                from: "./types",
            });
        });
    });

    describe("edge cases", () => {
        it("parses single type import without alias", () => {
            const module = parseModule('import { type User } from "./api";');
            expect(module.imports).toHaveLength(1);
            const imp = module.imports[0]!;
            expect(imp).toMatchObject({
                kind: "ImportDecl",
                items: [{ name: "User", isType: true }],
                from: "./api",
            });
        });

        it("parses many mixed imports", () => {
            const module = parseModule('import { type A, b, type C, d, type E, f, type G, h } from "./module";');
            expect(module.imports).toHaveLength(1);
            const imp = module.imports[0]!;
            expect(imp).toMatchObject({
                kind: "ImportDecl",
                items: [
                    { name: "A", isType: true },
                    { name: "b", isType: false },
                    { name: "C", isType: true },
                    { name: "d", isType: false },
                    { name: "E", isType: true },
                    { name: "f", isType: false },
                    { name: "G", isType: true },
                    { name: "h", isType: false },
                ],
                from: "./module",
            });
        });

        it("parses mixed imports with same name (different purpose)", () => {
            // This tests that you can import a type and a value with the same name
            // by using aliases
            const module = parseModule('import { type Result as ResultType, Result as ResultValue } from "./result";');
            expect(module.imports).toHaveLength(1);
            const imp = module.imports[0]!;
            expect(imp).toMatchObject({
                kind: "ImportDecl",
                items: [
                    { name: "Result", alias: "ResultType", isType: true },
                    { name: "Result", alias: "ResultValue", isType: false },
                ],
                from: "./result",
            });
        });
    });

    describe("whitespace and formatting", () => {
        it("parses mixed imports with extra whitespace", () => {
            const module = parseModule('import  {  type  User  ,  getUser  ,  type  Post  }  from  "./api"  ;');
            expect(module.imports).toHaveLength(1);
            const imp = module.imports[0]!;
            expect(imp).toMatchObject({
                kind: "ImportDecl",
                items: [
                    { name: "User", isType: true },
                    { name: "getUser", isType: false },
                    { name: "Post", isType: true },
                ],
                from: "./api",
            });
        });

        it("parses mixed imports on multiple lines", () => {
            const source = `import {
                type User,
                getUser,
                type Post,
                createPost
            } from "./api";`;
            const module = parseModule(source);
            expect(module.imports).toHaveLength(1);
            const imp = module.imports[0]!;
            expect(imp).toMatchObject({
                kind: "ImportDecl",
                items: [
                    { name: "User", isType: true },
                    { name: "getUser", isType: false },
                    { name: "Post", isType: true },
                    { name: "createPost", isType: false },
                ],
                from: "./api",
            });
        });

        it("parses import type on multiple lines", () => {
            const source = `import type {
                User,
                Post,
                Comment
            } from "./types";`;
            const module = parseModule(source);
            expect(module.imports).toHaveLength(1);
            const imp = module.imports[0]!;
            expect(imp).toMatchObject({
                kind: "ImportDecl",
                items: [
                    { name: "User", isType: true },
                    { name: "Post", isType: true },
                    { name: "Comment", isType: true },
                ],
                from: "./types",
            });
        });
    });

    describe("combining with other import forms", () => {
        it("parses regular imports and mixed imports from different modules", () => {
            const source = `
                import { map, filter } from "./array";
                import { type User, getUser } from "./api";
            `;
            const module = parseModule(source);
            expect(module.imports).toHaveLength(2);
            expect(module.imports[0]).toMatchObject({
                kind: "ImportDecl",
                items: [
                    { name: "map", isType: false },
                    { name: "filter", isType: false },
                ],
                from: "./array",
            });
            expect(module.imports[1]).toMatchObject({
                kind: "ImportDecl",
                items: [
                    { name: "User", isType: true },
                    { name: "getUser", isType: false },
                ],
                from: "./api",
            });
        });

        it("parses namespace and mixed imports", () => {
            const source = `
                import * as List from "./list";
                import { type User, getUser } from "./api";
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
                    { name: "User", isType: true },
                    { name: "getUser", isType: false },
                ],
                from: "./api",
            });
        });

        it("parses type namespace and mixed imports", () => {
            const source = `
                import type * as Types from "./types";
                import { type User, getUser } from "./api";
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
                items: [
                    { name: "User", isType: true },
                    { name: "getUser", isType: false },
                ],
                from: "./api",
            });
        });
    });

    describe("real-world scenarios", () => {
        it("parses typical API module imports", () => {
            const module = parseModule(
                'import { type Request, type Response, type Error, fetchJson, postJson, handleError } from "./http";',
            );
            expect(module.imports).toHaveLength(1);
            const imp = module.imports[0]!;
            expect(imp.kind).toBe("ImportDecl");
            if (imp.kind === "ImportDecl") {
                expect(imp.items).toHaveLength(6);
                expect(imp.items.filter((item) => item.isType)).toHaveLength(3);
                expect(imp.items.filter((item) => !item.isType)).toHaveLength(3);
            }
        });

        it("parses store module with state types and actions", () => {
            const module = parseModule(
                'import { type State, type Action, type Reducer, createStore, dispatch, subscribe } from "./store";',
            );
            expect(module.imports).toHaveLength(1);
            const imp = module.imports[0]!;
            expect(imp.kind).toBe("ImportDecl");
            if (imp.kind === "ImportDecl") {
                expect(imp.items).toHaveLength(6);
                expect(imp.items.filter((item) => item.isType)).toHaveLength(3);
                expect(imp.items.filter((item) => !item.isType)).toHaveLength(3);
            }
        });

        it("parses database module with types and functions", () => {
            const module = parseModule(
                'import { type User as UserModel, type Post as PostModel, findUser, createUser, findPost } from "./db";',
            );
            expect(module.imports).toHaveLength(1);
            const imp = module.imports[0]!;
            expect(imp).toMatchObject({
                kind: "ImportDecl",
                items: [
                    { name: "User", alias: "UserModel", isType: true },
                    { name: "Post", alias: "PostModel", isType: true },
                    { name: "findUser", isType: false },
                    { name: "createUser", isType: false },
                    { name: "findPost", isType: false },
                ],
                from: "./db",
            });
        });
    });

    describe("usage with declarations", () => {
        it("parses mixed imports followed by code using them", () => {
            const source = `
                import { type User, getUser, type Post, createPost } from "./api";
                let user = getUser(42);
                let post = createPost({ title: "Hello", author: user });
            `;
            const module = parseModule(source);
            expect(module.imports).toHaveLength(1);
            expect(module.declarations).toHaveLength(2);
        });

        it("parses type-only imports followed by type annotations", () => {
            const source = `
                import type { User, Post } from "./types";
                let x = 42;
            `;
            const module = parseModule(source);
            expect(module.imports).toHaveLength(1);
            expect(module.declarations).toHaveLength(1);
        });
    });
});
