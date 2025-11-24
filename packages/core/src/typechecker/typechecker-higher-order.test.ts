/**
 * Higher-order function type checking tests
 * Tests function composition, polymorphic functions, and ADT operations
 */

import { describe, expect, it } from "vitest";

import { createModule, testLoc } from "./typechecker-test-helpers.js";
import { typeCheck } from "./typechecker.js";

describe("typeCheck - Higher-Order Functions", () => {
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
});
