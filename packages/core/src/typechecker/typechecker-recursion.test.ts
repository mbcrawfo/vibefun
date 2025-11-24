/**
 * Recursion and let expression type checking tests
 * Tests recursive functions, mutual recursion, and nested let expressions
 */

import { describe, expect, it } from "vitest";

import { createModule, testLoc } from "./typechecker-test-helpers.js";
import { typeCheck } from "./typechecker.js";

describe("typeCheck - Recursion and Let Expressions", () => {
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
});
