/**
 * Basic type checker tests
 * Tests simple literals, basic functions, externals, and arithmetic
 */

import type { CoreIntLit, CoreLambda } from "../types/core-ast.js";

import { describe, expect, it } from "vitest";

import { createModule, testLoc } from "./typechecker-test-helpers.js";
import { typeCheck } from "./typechecker.js";

describe("typeCheck - Basic Type Checking", () => {
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

    it("should type check external function declaration", () => {
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

    it("should type check simple arithmetic function", () => {
        // let add = (x) => (y) => x + y
        const module = createModule([
            {
                kind: "CoreLetDecl",
                pattern: {
                    kind: "CoreVarPattern",
                    name: "add",
                    loc: testLoc,
                },
                value: {
                    kind: "CoreLambda",
                    param: {
                        kind: "CoreVarPattern",
                        name: "x",
                        loc: testLoc,
                    },
                    body: {
                        kind: "CoreLambda",
                        param: {
                            kind: "CoreVarPattern",
                            name: "y",
                            loc: testLoc,
                        },
                        body: {
                            kind: "CoreBinOp",
                            op: "Add",
                            left: {
                                kind: "CoreVar",
                                name: "x",
                                loc: testLoc,
                            },
                            right: {
                                kind: "CoreVar",
                                name: "y",
                                loc: testLoc,
                            },
                            loc: testLoc,
                        },
                        loc: testLoc,
                    },
                    loc: testLoc,
                },
                mutable: false,
                recursive: false,
                exported: true,
                loc: testLoc,
            },
        ]);

        const result = typeCheck(module);

        expect(result.declarationTypes.has("add")).toBe(true);
        const addType = result.declarationTypes.get("add");
        expect(addType?.type).toBe("Fun");
        if (addType?.type === "Fun") {
            expect(addType.params).toHaveLength(1);
            expect(addType.return.type).toBe("Fun");
        }
    });

    it("should type check function with type annotation", () => {
        // let double: (Int) -> Int = (x) => x * 2
        const module = createModule([
            {
                kind: "CoreLetDecl",
                pattern: {
                    kind: "CoreVarPattern",
                    name: "double",
                    loc: testLoc,
                },
                value: {
                    kind: "CoreTypeAnnotation",
                    expr: {
                        kind: "CoreLambda",
                        param: {
                            kind: "CoreVarPattern",
                            name: "x",
                            loc: testLoc,
                        },
                        body: {
                            kind: "CoreBinOp",
                            op: "Multiply",
                            left: {
                                kind: "CoreVar",
                                name: "x",
                                loc: testLoc,
                            },
                            right: {
                                kind: "CoreIntLit",
                                value: 2,
                                loc: testLoc,
                            },
                            loc: testLoc,
                        },
                        loc: testLoc,
                    },
                    typeExpr: {
                        kind: "CoreFunctionType",
                        params: [
                            {
                                kind: "CoreTypeConst",
                                name: "Int",
                                loc: testLoc,
                            },
                        ],
                        return_: {
                            kind: "CoreTypeConst",
                            name: "Int",
                            loc: testLoc,
                        },
                        loc: testLoc,
                    },
                    loc: testLoc,
                },
                mutable: false,
                recursive: false,
                exported: true,
                loc: testLoc,
            },
        ]);

        const result = typeCheck(module);

        expect(result.declarationTypes.has("double")).toBe(true);
        const doubleType = result.declarationTypes.get("double");
        expect(doubleType?.type).toBe("Fun");
    });

    it("should type check comparison operators", () => {
        // let isGreater = (x) => (y) => x > y
        const module = createModule([
            {
                kind: "CoreLetDecl",
                pattern: {
                    kind: "CoreVarPattern",
                    name: "isGreater",
                    loc: testLoc,
                },
                value: {
                    kind: "CoreLambda",
                    param: {
                        kind: "CoreVarPattern",
                        name: "x",
                        loc: testLoc,
                    },
                    body: {
                        kind: "CoreLambda",
                        param: {
                            kind: "CoreVarPattern",
                            name: "y",
                            loc: testLoc,
                        },
                        body: {
                            kind: "CoreBinOp",
                            op: "GreaterThan",
                            left: {
                                kind: "CoreVar",
                                name: "x",
                                loc: testLoc,
                            },
                            right: {
                                kind: "CoreVar",
                                name: "y",
                                loc: testLoc,
                            },
                            loc: testLoc,
                        },
                        loc: testLoc,
                    },
                    loc: testLoc,
                },
                mutable: false,
                recursive: false,
                exported: true,
                loc: testLoc,
            },
        ]);

        const result = typeCheck(module);

        expect(result.declarationTypes.has("isGreater")).toBe(true);
        const isGreaterType = result.declarationTypes.get("isGreater");
        expect(isGreaterType?.type).toBe("Fun");
        if (isGreaterType?.type === "Fun") {
            // Returns (Int) -> Bool
            const innerFn = isGreaterType.return;
            expect(innerFn.type).toBe("Fun");
            if (innerFn.type === "Fun") {
                expect(innerFn.return).toMatchObject({ type: "Const", name: "Bool" });
            }
        }
    });
});
