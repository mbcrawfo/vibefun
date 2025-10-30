/**
 * Integration tests for the main type checker
 */

import type { Location } from "../types/ast.js";
import type { CoreDeclaration, CoreIntLit, CoreLambda, CoreModule } from "../types/core-ast.js";

import { describe, expect, it } from "vitest";

import { typeCheck } from "./typechecker.js";

// Helper to create a test location
const testLoc: Location = {
    file: "test.vf",
    line: 1,
    column: 1,
    offset: 0,
};

// Helper to create a simple module
function createModule(declarations: CoreDeclaration[]): CoreModule {
    return {
        declarations,
        imports: [],
        loc: testLoc,
    };
}

describe("typeCheck", () => {
    it("should type check a simple integer literal binding", () => {
        const intLit: CoreIntLit = {
            kind: "CoreIntLit",
            value: 42,
            loc: testLoc,
        };

        const module = createModule([
            {
                kind: "CoreLetDecl",
                pattern: {
                    kind: "CoreVarPattern",
                    name: "x",
                    loc: testLoc,
                },
                value: intLit,
                mutable: false,
                recursive: false,
                exported: true,
                loc: testLoc,
            },
        ]);

        const result = typeCheck(module);

        expect(result.declarationTypes.has("x")).toBe(true);
        const xType = result.declarationTypes.get("x");
        expect(xType).toMatchObject({ type: "Const", name: "Int" });
    });

    it("should type check identity function", () => {
        const idFunc: CoreLambda = {
            kind: "CoreLambda",
            param: {
                kind: "CoreVarPattern",
                name: "x",
                loc: testLoc,
            },
            body: {
                kind: "CoreVar",
                name: "x",
                loc: testLoc,
            },
            loc: testLoc,
        };

        const module = createModule([
            {
                kind: "CoreLetDecl",
                pattern: {
                    kind: "CoreVarPattern",
                    name: "id",
                    loc: testLoc,
                },
                value: idFunc,
                mutable: false,
                recursive: false,
                exported: true,
                loc: testLoc,
            },
        ]);

        const result = typeCheck(module);

        expect(result.declarationTypes.has("id")).toBe(true);
        const idType = result.declarationTypes.get("id");
        expect(idType?.type).toBe("Fun");
    });

    it("should have built-in types in environment", () => {
        const module = createModule([]);
        const result = typeCheck(module);

        // Check that built-ins are present
        expect(result.env.values.has("List.map")).toBe(true);
        expect(result.env.values.has("Option.map")).toBe(true);
        expect(result.env.values.has("ref")).toBe(true);
    });

    it.skip("should type check external function declaration", () => {
        const module = createModule([
            {
                kind: "CoreExternalDecl",
                name: "log",
                typeExpr: {
                    kind: "CoreFunctionType",
                    params: [
                        {
                            kind: "CoreTypeConst",
                            name: "String",
                            loc: testLoc,
                        },
                    ],
                    return_: {
                        kind: "CoreTypeConst",
                        name: "Unit",
                        loc: testLoc,
                    },
                    loc: testLoc,
                },
                jsName: "console.log",
                exported: false,
                loc: testLoc,
            },
        ]);

        const result = typeCheck(module);

        expect(result.declarationTypes.has("log")).toBe(true);
        const logType = result.declarationTypes.get("log");
        expect(logType?.type).toBe("Fun");
    });

    it("should type check string literal", () => {
        const module = createModule([
            {
                kind: "CoreLetDecl",
                pattern: {
                    kind: "CoreVarPattern",
                    name: "msg",
                    loc: testLoc,
                },
                value: {
                    kind: "CoreStringLit",
                    value: "Hello, World!",
                    loc: testLoc,
                },
                mutable: false,
                recursive: false,
                exported: true,
                loc: testLoc,
            },
        ]);

        const result = typeCheck(module);

        expect(result.declarationTypes.has("msg")).toBe(true);
        const msgType = result.declarationTypes.get("msg");
        expect(msgType).toMatchObject({ type: "Const", name: "String" });
    });

    it("should type check boolean literal", () => {
        const module = createModule([
            {
                kind: "CoreLetDecl",
                pattern: {
                    kind: "CoreVarPattern",
                    name: "flag",
                    loc: testLoc,
                },
                value: {
                    kind: "CoreBoolLit",
                    value: true,
                    loc: testLoc,
                },
                mutable: false,
                recursive: false,
                exported: true,
                loc: testLoc,
            },
        ]);

        const result = typeCheck(module);

        expect(result.declarationTypes.has("flag")).toBe(true);
        const flagType = result.declarationTypes.get("flag");
        expect(flagType).toMatchObject({ type: "Const", name: "Bool" });
    });

    it("should type check multiple declarations", () => {
        const module = createModule([
            {
                kind: "CoreLetDecl",
                pattern: {
                    kind: "CoreVarPattern",
                    name: "x",
                    loc: testLoc,
                },
                value: {
                    kind: "CoreIntLit",
                    value: 10,
                    loc: testLoc,
                },
                mutable: false,
                recursive: false,
                exported: true,
                loc: testLoc,
            },
            {
                kind: "CoreLetDecl",
                pattern: {
                    kind: "CoreVarPattern",
                    name: "y",
                    loc: testLoc,
                },
                value: {
                    kind: "CoreStringLit",
                    value: "test",
                    loc: testLoc,
                },
                mutable: false,
                recursive: false,
                exported: true,
                loc: testLoc,
            },
        ]);

        const result = typeCheck(module);

        expect(result.declarationTypes.has("x")).toBe(true);
        expect(result.declarationTypes.has("y")).toBe(true);

        const xType = result.declarationTypes.get("x");
        const yType = result.declarationTypes.get("y");

        expect(xType).toMatchObject({ type: "Const", name: "Int" });
        expect(yType).toMatchObject({ type: "Const", name: "String" });
    });
});
