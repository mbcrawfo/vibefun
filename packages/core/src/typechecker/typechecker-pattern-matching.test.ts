/**
 * Pattern matching type checking tests
 * Tests pattern matching with variants, guards, and exhaustiveness
 */

import { describe, expect, it } from "vitest";

import { createModule, testLoc } from "./typechecker-test-helpers.js";
import { typeCheck } from "./typechecker.js";

describe("typeCheck - Pattern Matching", () => {
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
});
