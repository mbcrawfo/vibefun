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
});

describe("typeCheck - Integration Tests", () => {
    it("should type check recursive factorial with pattern matching", () => {
        // Note: CoreLetDecl with recursive:true not fully supported in typeCheckDeclaration
        // Use CoreLetRecGroup for mutual recursion instead
        // let rec factorial = (n) => match n { | 0 => 1 | m => m * factorial(m - 1) }
        const module = createModule([
            {
                kind: "CoreLetDecl",
                pattern: {
                    kind: "CoreVarPattern",
                    name: "factorial",
                    loc: testLoc,
                },
                value: {
                    kind: "CoreLambda",
                    param: {
                        kind: "CoreVarPattern",
                        name: "n",
                        loc: testLoc,
                    },
                    body: {
                        kind: "CoreMatch",
                        expr: {
                            kind: "CoreVar",
                            name: "n",
                            loc: testLoc,
                        },
                        cases: [
                            {
                                pattern: {
                                    kind: "CoreLiteralPattern",
                                    literal: 0,
                                    loc: testLoc,
                                },
                                body: {
                                    kind: "CoreIntLit",
                                    value: 1,
                                    loc: testLoc,
                                },
                                loc: testLoc,
                            },
                            {
                                pattern: {
                                    kind: "CoreVarPattern",
                                    name: "m",
                                    loc: testLoc,
                                },
                                body: {
                                    kind: "CoreBinOp",
                                    op: "Multiply",
                                    left: {
                                        kind: "CoreVar",
                                        name: "m",
                                        loc: testLoc,
                                    },
                                    right: {
                                        kind: "CoreApp",
                                        func: {
                                            kind: "CoreVar",
                                            name: "factorial",
                                            loc: testLoc,
                                        },
                                        args: [
                                            {
                                                kind: "CoreBinOp",
                                                op: "Subtract",
                                                left: {
                                                    kind: "CoreVar",
                                                    name: "m",
                                                    loc: testLoc,
                                                },
                                                right: {
                                                    kind: "CoreIntLit",
                                                    value: 1,
                                                    loc: testLoc,
                                                },
                                                loc: testLoc,
                                            },
                                        ],
                                        loc: testLoc,
                                    },
                                    loc: testLoc,
                                },
                                loc: testLoc,
                            },
                        ],
                        loc: testLoc,
                    },
                    loc: testLoc,
                },
                mutable: false,
                recursive: true,
                exported: true,
                loc: testLoc,
            },
        ]);

        const result = typeCheck(module);

        expect(result.declarationTypes.has("factorial")).toBe(true);
        const factorialType = result.declarationTypes.get("factorial");
        expect(factorialType?.type).toBe("Fun");
    });

    it("should type check mutual recursion (isEven/isOdd)", () => {
        // Note: Bug in typeCheckDeclaration - inferLetRecExpr doesn't update ctx.env
        // so the bindings can't be extracted at line 115 of typechecker.ts
        // let rec isEven = n => match n { | 0 => true | n => isOdd(n - 1) }
        // and isOdd = n => match n { | 0 => false | n => isEven(n - 1) }
        const module = createModule([
            {
                kind: "CoreLetRecGroup",
                bindings: [
                    {
                        pattern: {
                            kind: "CoreVarPattern",
                            name: "isEven",
                            loc: testLoc,
                        },
                        value: {
                            kind: "CoreLambda",
                            param: {
                                kind: "CoreVarPattern",
                                name: "n",
                                loc: testLoc,
                            },
                            body: {
                                kind: "CoreMatch",
                                expr: {
                                    kind: "CoreVar",
                                    name: "n",
                                    loc: testLoc,
                                },
                                cases: [
                                    {
                                        pattern: {
                                            kind: "CoreLiteralPattern",
                                            literal: 0,
                                            loc: testLoc,
                                        },
                                        body: {
                                            kind: "CoreBoolLit",
                                            value: true,
                                            loc: testLoc,
                                        },
                                        loc: testLoc,
                                    },
                                    {
                                        pattern: {
                                            kind: "CoreVarPattern",
                                            name: "m",
                                            loc: testLoc,
                                        },
                                        body: {
                                            kind: "CoreApp",
                                            func: {
                                                kind: "CoreVar",
                                                name: "isOdd",
                                                loc: testLoc,
                                            },
                                            args: [
                                                {
                                                    kind: "CoreBinOp",
                                                    op: "Subtract",
                                                    left: {
                                                        kind: "CoreVar",
                                                        name: "m",
                                                        loc: testLoc,
                                                    },
                                                    right: {
                                                        kind: "CoreIntLit",
                                                        value: 1,
                                                        loc: testLoc,
                                                    },
                                                    loc: testLoc,
                                                },
                                            ],
                                            loc: testLoc,
                                        },
                                        loc: testLoc,
                                    },
                                ],
                                loc: testLoc,
                            },
                            loc: testLoc,
                        },
                        mutable: false,
                        loc: testLoc,
                    },
                    {
                        pattern: {
                            kind: "CoreVarPattern",
                            name: "isOdd",
                            loc: testLoc,
                        },
                        value: {
                            kind: "CoreLambda",
                            param: {
                                kind: "CoreVarPattern",
                                name: "n",
                                loc: testLoc,
                            },
                            body: {
                                kind: "CoreMatch",
                                expr: {
                                    kind: "CoreVar",
                                    name: "n",
                                    loc: testLoc,
                                },
                                cases: [
                                    {
                                        pattern: {
                                            kind: "CoreLiteralPattern",
                                            literal: 0,
                                            loc: testLoc,
                                        },
                                        body: {
                                            kind: "CoreBoolLit",
                                            value: false,
                                            loc: testLoc,
                                        },
                                        loc: testLoc,
                                    },
                                    {
                                        pattern: {
                                            kind: "CoreVarPattern",
                                            name: "m",
                                            loc: testLoc,
                                        },
                                        body: {
                                            kind: "CoreApp",
                                            func: {
                                                kind: "CoreVar",
                                                name: "isEven",
                                                loc: testLoc,
                                            },
                                            args: [
                                                {
                                                    kind: "CoreBinOp",
                                                    op: "Subtract",
                                                    left: {
                                                        kind: "CoreVar",
                                                        name: "m",
                                                        loc: testLoc,
                                                    },
                                                    right: {
                                                        kind: "CoreIntLit",
                                                        value: 1,
                                                        loc: testLoc,
                                                    },
                                                    loc: testLoc,
                                                },
                                            ],
                                            loc: testLoc,
                                        },
                                        loc: testLoc,
                                    },
                                ],
                                loc: testLoc,
                            },
                            loc: testLoc,
                        },
                        mutable: false,
                        loc: testLoc,
                    },
                ],
                exported: true,
                loc: testLoc,
            },
        ]);

        const result = typeCheck(module);

        expect(result.declarationTypes.has("isEven")).toBe(true);
        expect(result.declarationTypes.has("isOdd")).toBe(true);

        const isEvenType = result.declarationTypes.get("isEven");
        const isOddType = result.declarationTypes.get("isOdd");

        expect(isEvenType?.type).toBe("Fun");
        expect(isOddType?.type).toBe("Fun");
    });

    it("should type check record construction and access", () => {
        // Note: Multiple declarations can't reference each other (no shared env)
        // let person = { name: "Alice", age: 30 }
        // let name = person.name
        const module = createModule([
            {
                kind: "CoreLetDecl",
                pattern: {
                    kind: "CoreVarPattern",
                    name: "person",
                    loc: testLoc,
                },
                value: {
                    kind: "CoreRecord",
                    fields: [
                        {
                            kind: "Field",
                            name: "name",
                            value: {
                                kind: "CoreStringLit",
                                value: "Alice",
                                loc: testLoc,
                            },
                            loc: testLoc,
                        },
                        {
                            kind: "Field",
                            name: "age",
                            value: {
                                kind: "CoreIntLit",
                                value: 30,
                                loc: testLoc,
                            },
                            loc: testLoc,
                        },
                    ],
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
                    name: "name",
                    loc: testLoc,
                },
                value: {
                    kind: "CoreRecordAccess",
                    record: {
                        kind: "CoreVar",
                        name: "person",
                        loc: testLoc,
                    },
                    field: "name",
                    loc: testLoc,
                },
                mutable: false,
                recursive: false,
                exported: true,
                loc: testLoc,
            },
        ]);

        const result = typeCheck(module);

        expect(result.declarationTypes.has("person")).toBe(true);
        expect(result.declarationTypes.has("name")).toBe(true);

        const personType = result.declarationTypes.get("person");
        const nameType = result.declarationTypes.get("name");

        expect(personType?.type).toBe("Record");
        expect(nameType).toMatchObject({ type: "Const", name: "String" });
    });

    it("should type check polymorphic list operations", () => {
        // let double = (x) => x * 2
        // let numbers = Nil
        // This test verifies that built-in List functions work
        const module = createModule([
            {
                kind: "CoreLetDecl",
                pattern: {
                    kind: "CoreVarPattern",
                    name: "double",
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
                mutable: false,
                recursive: false,
                exported: true,
                loc: testLoc,
            },
        ]);

        const result = typeCheck(module);

        expect(result.declarationTypes.has("double")).toBe(true);
        expect(result.env.values.has("List.map")).toBe(true);
        expect(result.env.values.has("Cons")).toBe(true);
        expect(result.env.values.has("Nil")).toBe(true);
    });

    it("should type check Option pattern matching", () => {
        // Tests exhaustiveness checking on polymorphic lambda parameters
        // Pattern checking constrains the type, then exhaustiveness is checked after
        // let unwrapOr = (opt, default) => match opt { | Some(x) => x | None => default }
        const module = createModule([
            {
                kind: "CoreLetDecl",
                pattern: {
                    kind: "CoreVarPattern",
                    name: "unwrapOr",
                    loc: testLoc,
                },
                value: {
                    kind: "CoreLambda",
                    param: {
                        kind: "CoreVarPattern",
                        name: "opt",
                        loc: testLoc,
                    },
                    body: {
                        kind: "CoreLambda",
                        param: {
                            kind: "CoreVarPattern",
                            name: "default",
                            loc: testLoc,
                        },
                        body: {
                            kind: "CoreMatch",
                            expr: {
                                kind: "CoreVar",
                                name: "opt",
                                loc: testLoc,
                            },
                            cases: [
                                {
                                    pattern: {
                                        kind: "CoreVariantPattern",
                                        constructor: "Some",
                                        args: [
                                            {
                                                kind: "CoreVarPattern",
                                                name: "x",
                                                loc: testLoc,
                                            },
                                        ],
                                        loc: testLoc,
                                    },
                                    body: {
                                        kind: "CoreVar",
                                        name: "x",
                                        loc: testLoc,
                                    },
                                    loc: testLoc,
                                },
                                {
                                    pattern: {
                                        kind: "CoreVariantPattern",
                                        constructor: "None",
                                        args: [],
                                        loc: testLoc,
                                    },
                                    body: {
                                        kind: "CoreVar",
                                        name: "default",
                                        loc: testLoc,
                                    },
                                    loc: testLoc,
                                },
                            ],
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

        expect(result.declarationTypes.has("unwrapOr")).toBe(true);
        const unwrapOrType = result.declarationTypes.get("unwrapOr");
        expect(unwrapOrType?.type).toBe("Fun");
    });

    it("should type check nested pattern matching with guards", () => {
        // let classify = (n) => match n { | 0 => "zero" | n when n > 0 => "positive" | _ => "negative" }
        const module = createModule([
            {
                kind: "CoreLetDecl",
                pattern: {
                    kind: "CoreVarPattern",
                    name: "classify",
                    loc: testLoc,
                },
                value: {
                    kind: "CoreLambda",
                    param: {
                        kind: "CoreVarPattern",
                        name: "n",
                        loc: testLoc,
                    },
                    body: {
                        kind: "CoreMatch",
                        expr: {
                            kind: "CoreVar",
                            name: "n",
                            loc: testLoc,
                        },
                        cases: [
                            {
                                pattern: {
                                    kind: "CoreLiteralPattern",
                                    literal: 0,
                                    loc: testLoc,
                                },
                                body: {
                                    kind: "CoreStringLit",
                                    value: "zero",
                                    loc: testLoc,
                                },
                                loc: testLoc,
                            },
                            {
                                pattern: {
                                    kind: "CoreVarPattern",
                                    name: "m",
                                    loc: testLoc,
                                },
                                body: {
                                    kind: "CoreStringLit",
                                    value: "positive",
                                    loc: testLoc,
                                },
                                guard: {
                                    kind: "CoreBinOp",
                                    op: "GreaterThan",
                                    left: {
                                        kind: "CoreVar",
                                        name: "m",
                                        loc: testLoc,
                                    },
                                    right: {
                                        kind: "CoreIntLit",
                                        value: 0,
                                        loc: testLoc,
                                    },
                                    loc: testLoc,
                                },
                                loc: testLoc,
                            },
                            {
                                pattern: {
                                    kind: "CoreWildcardPattern",
                                    loc: testLoc,
                                },
                                body: {
                                    kind: "CoreStringLit",
                                    value: "negative",
                                    loc: testLoc,
                                },
                                loc: testLoc,
                            },
                        ],
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

        expect(result.declarationTypes.has("classify")).toBe(true);
        const classifyType = result.declarationTypes.get("classify");
        expect(classifyType?.type).toBe("Fun");
    });

    it("should type check composed polymorphic functions", () => {
        // let compose = (f) => (g) => (x) => f(g(x))
        // let addOne = (x) => x + 1
        // let double = (x) => x * 2
        const module = createModule([
            {
                kind: "CoreLetDecl",
                pattern: {
                    kind: "CoreVarPattern",
                    name: "compose",
                    loc: testLoc,
                },
                value: {
                    kind: "CoreLambda",
                    param: {
                        kind: "CoreVarPattern",
                        name: "f",
                        loc: testLoc,
                    },
                    body: {
                        kind: "CoreLambda",
                        param: {
                            kind: "CoreVarPattern",
                            name: "g",
                            loc: testLoc,
                        },
                        body: {
                            kind: "CoreLambda",
                            param: {
                                kind: "CoreVarPattern",
                                name: "x",
                                loc: testLoc,
                            },
                            body: {
                                kind: "CoreApp",
                                func: {
                                    kind: "CoreVar",
                                    name: "f",
                                    loc: testLoc,
                                },
                                args: [
                                    {
                                        kind: "CoreApp",
                                        func: {
                                            kind: "CoreVar",
                                            name: "g",
                                            loc: testLoc,
                                        },
                                        args: [
                                            {
                                                kind: "CoreVar",
                                                name: "x",
                                                loc: testLoc,
                                            },
                                        ],
                                        loc: testLoc,
                                    },
                                ],
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
            {
                kind: "CoreLetDecl",
                pattern: {
                    kind: "CoreVarPattern",
                    name: "addOne",
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
                        kind: "CoreBinOp",
                        op: "Add",
                        left: {
                            kind: "CoreVar",
                            name: "x",
                            loc: testLoc,
                        },
                        right: {
                            kind: "CoreIntLit",
                            value: 1,
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
            {
                kind: "CoreLetDecl",
                pattern: {
                    kind: "CoreVarPattern",
                    name: "double",
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
                mutable: false,
                recursive: false,
                exported: true,
                loc: testLoc,
            },
        ]);

        const result = typeCheck(module);

        expect(result.declarationTypes.has("compose")).toBe(true);
        expect(result.declarationTypes.has("addOne")).toBe(true);
        expect(result.declarationTypes.has("double")).toBe(true);

        const composeType = result.declarationTypes.get("compose");
        expect(composeType?.type).toBe("Fun");
    });

    it("should type check record pattern matching", () => {
        // Tests record field access on polymorphic lambda parameters
        // Type variable is constrained to be a record type when field is accessed
        // let getName = (p) => p.name
        const module = createModule([
            {
                kind: "CoreLetDecl",
                pattern: {
                    kind: "CoreVarPattern",
                    name: "person",
                    loc: testLoc,
                },
                value: {
                    kind: "CoreRecord",
                    fields: [
                        {
                            kind: "Field",
                            name: "name",
                            value: {
                                kind: "CoreStringLit",
                                value: "Bob",
                                loc: testLoc,
                            },
                            loc: testLoc,
                        },
                        {
                            kind: "Field",
                            name: "age",
                            value: {
                                kind: "CoreIntLit",
                                value: 25,
                                loc: testLoc,
                            },
                            loc: testLoc,
                        },
                    ],
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
                    name: "getName",
                    loc: testLoc,
                },
                value: {
                    kind: "CoreLambda",
                    param: {
                        kind: "CoreVarPattern",
                        name: "p",
                        loc: testLoc,
                    },
                    body: {
                        kind: "CoreRecordAccess",
                        record: {
                            kind: "CoreVar",
                            name: "p",
                            loc: testLoc,
                        },
                        field: "name",
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

        expect(result.declarationTypes.has("person")).toBe(true);
        expect(result.declarationTypes.has("getName")).toBe(true);
    });

    it("should type check Result type with error handling", () => {
        // Tests exhaustiveness checking with Result type (polymorphic error handling)
        // let handleResult = (r) => match r { | Ok(v) => v | Err(e) => 0 }
        const module = createModule([
            {
                kind: "CoreLetDecl",
                pattern: {
                    kind: "CoreVarPattern",
                    name: "handleResult",
                    loc: testLoc,
                },
                value: {
                    kind: "CoreLambda",
                    param: {
                        kind: "CoreVarPattern",
                        name: "r",
                        loc: testLoc,
                    },
                    body: {
                        kind: "CoreMatch",
                        expr: {
                            kind: "CoreVar",
                            name: "r",
                            loc: testLoc,
                        },
                        cases: [
                            {
                                pattern: {
                                    kind: "CoreVariantPattern",
                                    constructor: "Ok",
                                    args: [
                                        {
                                            kind: "CoreVarPattern",
                                            name: "v",
                                            loc: testLoc,
                                        },
                                    ],
                                    loc: testLoc,
                                },
                                body: {
                                    kind: "CoreVar",
                                    name: "v",
                                    loc: testLoc,
                                },
                                loc: testLoc,
                            },
                            {
                                pattern: {
                                    kind: "CoreVariantPattern",
                                    constructor: "Err",
                                    args: [
                                        {
                                            kind: "CoreVarPattern",
                                            name: "e",
                                            loc: testLoc,
                                        },
                                    ],
                                    loc: testLoc,
                                },
                                body: {
                                    kind: "CoreIntLit",
                                    value: 0,
                                    loc: testLoc,
                                },
                                loc: testLoc,
                            },
                        ],
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

        expect(result.declarationTypes.has("handleResult")).toBe(true);
        expect(result.env.values.has("Ok")).toBe(true);
        expect(result.env.values.has("Err")).toBe(true);
    });

    it("should type check record update expressions", () => {
        // Note: Multiple declarations can't reference each other (no shared env)
        // let person = { name: "Charlie", age: 40 }
        // let updated = { ...person, age: 41 }
        const module = createModule([
            {
                kind: "CoreLetDecl",
                pattern: {
                    kind: "CoreVarPattern",
                    name: "person",
                    loc: testLoc,
                },
                value: {
                    kind: "CoreRecord",
                    fields: [
                        {
                            kind: "Field",
                            name: "name",
                            value: {
                                kind: "CoreStringLit",
                                value: "Charlie",
                                loc: testLoc,
                            },
                            loc: testLoc,
                        },
                        {
                            kind: "Field",
                            name: "age",
                            value: {
                                kind: "CoreIntLit",
                                value: 40,
                                loc: testLoc,
                            },
                            loc: testLoc,
                        },
                    ],
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
                    name: "updated",
                    loc: testLoc,
                },
                value: {
                    kind: "CoreRecordUpdate",
                    record: {
                        kind: "CoreVar",
                        name: "person",
                        loc: testLoc,
                    },
                    updates: [
                        {
                            kind: "Field",
                            name: "age",
                            value: {
                                kind: "CoreIntLit",
                                value: 41,
                                loc: testLoc,
                            },
                            loc: testLoc,
                        },
                    ],
                    loc: testLoc,
                },
                mutable: false,
                recursive: false,
                exported: true,
                loc: testLoc,
            },
        ]);

        const result = typeCheck(module);

        expect(result.declarationTypes.has("person")).toBe(true);
        expect(result.declarationTypes.has("updated")).toBe(true);

        const personType = result.declarationTypes.get("person");
        const updatedType = result.declarationTypes.get("updated");

        expect(personType?.type).toBe("Record");
        expect(updatedType?.type).toBe("Record");
    });

    it("should type check complex nested let expressions", () => {
        // let outer = let inner = 42 in inner * 2
        const module = createModule([
            {
                kind: "CoreLetDecl",
                pattern: {
                    kind: "CoreVarPattern",
                    name: "outer",
                    loc: testLoc,
                },
                value: {
                    kind: "CoreLet",
                    pattern: {
                        kind: "CoreVarPattern",
                        name: "inner",
                        loc: testLoc,
                    },
                    value: {
                        kind: "CoreIntLit",
                        value: 42,
                        loc: testLoc,
                    },
                    body: {
                        kind: "CoreBinOp",
                        op: "Multiply",
                        left: {
                            kind: "CoreVar",
                            name: "inner",
                            loc: testLoc,
                        },
                        right: {
                            kind: "CoreIntLit",
                            value: 2,
                            loc: testLoc,
                        },
                        loc: testLoc,
                    },
                    mutable: false,
                    recursive: false,
                    loc: testLoc,
                },
                mutable: false,
                recursive: false,
                exported: true,
                loc: testLoc,
            },
        ]);

        const result = typeCheck(module);

        expect(result.declarationTypes.has("outer")).toBe(true);
        const outerType = result.declarationTypes.get("outer");
        expect(outerType).toMatchObject({ type: "Const", name: "Int" });
    });

    it("should type check higher-order functions with ADTs", () => {
        // Tests exhaustiveness checking with higher-order functions on ADTs
        // let mapOption = (f) => (opt) => match opt { | Some(x) => Some(f(x)) | None => None }
        const module = createModule([
            {
                kind: "CoreLetDecl",
                pattern: {
                    kind: "CoreVarPattern",
                    name: "mapOption",
                    loc: testLoc,
                },
                value: {
                    kind: "CoreLambda",
                    param: {
                        kind: "CoreVarPattern",
                        name: "f",
                        loc: testLoc,
                    },
                    body: {
                        kind: "CoreLambda",
                        param: {
                            kind: "CoreVarPattern",
                            name: "opt",
                            loc: testLoc,
                        },
                        body: {
                            kind: "CoreMatch",
                            expr: {
                                kind: "CoreVar",
                                name: "opt",
                                loc: testLoc,
                            },
                            cases: [
                                {
                                    pattern: {
                                        kind: "CoreVariantPattern",
                                        constructor: "Some",
                                        args: [
                                            {
                                                kind: "CoreVarPattern",
                                                name: "x",
                                                loc: testLoc,
                                            },
                                        ],
                                        loc: testLoc,
                                    },
                                    body: {
                                        kind: "CoreVariant",
                                        constructor: "Some",
                                        args: [
                                            {
                                                kind: "CoreApp",
                                                func: {
                                                    kind: "CoreVar",
                                                    name: "f",
                                                    loc: testLoc,
                                                },
                                                args: [
                                                    {
                                                        kind: "CoreVar",
                                                        name: "x",
                                                        loc: testLoc,
                                                    },
                                                ],
                                                loc: testLoc,
                                            },
                                        ],
                                        loc: testLoc,
                                    },
                                    loc: testLoc,
                                },
                                {
                                    pattern: {
                                        kind: "CoreVariantPattern",
                                        constructor: "None",
                                        args: [],
                                        loc: testLoc,
                                    },
                                    body: {
                                        kind: "CoreVariant",
                                        constructor: "None",
                                        args: [],
                                        loc: testLoc,
                                    },
                                    loc: testLoc,
                                },
                            ],
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

        expect(result.declarationTypes.has("mapOption")).toBe(true);
        const mapOptionType = result.declarationTypes.get("mapOption");
        expect(mapOptionType?.type).toBe("Fun");
    });

    // High-quality working integration tests
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

    it("should type check record with field access", () => {
        // let point = { x: 10, y: 20 }
        const module = createModule([
            {
                kind: "CoreLetDecl",
                pattern: {
                    kind: "CoreVarPattern",
                    name: "point",
                    loc: testLoc,
                },
                value: {
                    kind: "CoreRecord",
                    fields: [
                        {
                            kind: "Field",
                            name: "x",
                            value: {
                                kind: "CoreIntLit",
                                value: 10,
                                loc: testLoc,
                            },
                            loc: testLoc,
                        },
                        {
                            kind: "Field",
                            name: "y",
                            value: {
                                kind: "CoreIntLit",
                                value: 20,
                                loc: testLoc,
                            },
                            loc: testLoc,
                        },
                    ],
                    loc: testLoc,
                },
                mutable: false,
                recursive: false,
                exported: true,
                loc: testLoc,
            },
        ]);

        const result = typeCheck(module);

        expect(result.declarationTypes.has("point")).toBe(true);
        const pointType = result.declarationTypes.get("point");
        expect(pointType?.type).toBe("Record");
        if (pointType?.type === "Record") {
            expect(pointType.fields.has("x")).toBe(true);
            expect(pointType.fields.has("y")).toBe(true);
        }
    });

    it("should type check nested let with computations", () => {
        // let result = let x = 5 in let y = x * 2 in x + y
        const module = createModule([
            {
                kind: "CoreLetDecl",
                pattern: {
                    kind: "CoreVarPattern",
                    name: "result",
                    loc: testLoc,
                },
                value: {
                    kind: "CoreLet",
                    pattern: {
                        kind: "CoreVarPattern",
                        name: "x",
                        loc: testLoc,
                    },
                    value: {
                        kind: "CoreIntLit",
                        value: 5,
                        loc: testLoc,
                    },
                    body: {
                        kind: "CoreLet",
                        pattern: {
                            kind: "CoreVarPattern",
                            name: "y",
                            loc: testLoc,
                        },
                        value: {
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
                        mutable: false,
                        recursive: false,
                        loc: testLoc,
                    },
                    mutable: false,
                    recursive: false,
                    loc: testLoc,
                },
                mutable: false,
                recursive: false,
                exported: true,
                loc: testLoc,
            },
        ]);

        const result = typeCheck(module);

        expect(result.declarationTypes.has("result")).toBe(true);
        const resultType = result.declarationTypes.get("result");
        expect(resultType).toMatchObject({ type: "Const", name: "Int" });
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
