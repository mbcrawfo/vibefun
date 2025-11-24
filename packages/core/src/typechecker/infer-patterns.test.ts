/**
 * Tests for type inference - variants and pattern matching
 */

import type { Module } from "../types/ast.js";
import type {
    CoreBinOp,
    CoreIntLit,
    CoreLet,
    CoreMatch,
    CoreMatchCase,
    CoreRecord,
    CoreStringLit,
    CoreVariant,
} from "../types/core-ast.js";
import type { InferenceContext } from "./infer.js";

import { beforeEach, describe, expect, it } from "vitest";

import { buildEnvironment } from "./environment.js";
import { inferExpr } from "./infer.js";
import { primitiveTypes, resetTypeVarCounter } from "./types.js";
import { emptySubst } from "./unify.js";

const testLoc = { file: "test.vf", line: 1, column: 1, offset: 0 };

describe("Type Inference - Variants", () => {
    beforeEach(() => {
        resetTypeVarCounter();
    });

    it("should infer type for None constructor", () => {
        // None (no arguments)
        const expr: CoreVariant = {
            kind: "CoreVariant",
            constructor: "None",
            args: [],
            loc: testLoc,
        };

        const emptyModule: Module = {
            imports: [],
            declarations: [],
            loc: testLoc,
        };
        const env = buildEnvironment(emptyModule);
        const ctx: InferenceContext = {
            env,
            level: 0,
            subst: emptySubst(),
        };

        const result = inferExpr(ctx, expr);

        // Should have type Option<'a> where 'a is a fresh type variable
        expect(result.type.type).toBe("App");
        if (result.type.type === "App") {
            expect(result.type.constructor.type).toBe("Const");
            if (result.type.constructor.type === "Const") {
                expect(result.type.constructor.name).toBe("Option");
            }
        }
    });

    it("should infer type for Some constructor", () => {
        // Some(42)
        const intLit: CoreIntLit = { kind: "CoreIntLit", value: 42, loc: testLoc };
        const expr: CoreVariant = {
            kind: "CoreVariant",
            constructor: "Some",
            args: [intLit],
            loc: testLoc,
        };

        const emptyModule: Module = {
            imports: [],
            declarations: [],
            loc: testLoc,
        };
        const env = buildEnvironment(emptyModule);
        const ctx: InferenceContext = {
            env,
            level: 0,
            subst: emptySubst(),
        };

        const result = inferExpr(ctx, expr);

        // Should have type Option<Int>
        expect(result.type.type).toBe("App");
        if (result.type.type === "App") {
            expect(result.type.constructor.type).toBe("Const");
            if (result.type.constructor.type === "Const") {
                expect(result.type.constructor.name).toBe("Option");
            }
            expect(result.type.args[0]).toEqual(primitiveTypes.Int);
        }
    });

    it("should infer type for Nil constructor", () => {
        // Nil
        const expr: CoreVariant = {
            kind: "CoreVariant",
            constructor: "Nil",
            args: [],
            loc: testLoc,
        };

        const emptyModule: Module = {
            imports: [],
            declarations: [],
            loc: testLoc,
        };
        const env = buildEnvironment(emptyModule);
        const ctx: InferenceContext = {
            env,
            level: 0,
            subst: emptySubst(),
        };

        const result = inferExpr(ctx, expr);

        // Should have type List<'a>
        expect(result.type.type).toBe("App");
        if (result.type.type === "App") {
            expect(result.type.constructor.type).toBe("Const");
            if (result.type.constructor.type === "Const") {
                expect(result.type.constructor.name).toBe("List");
            }
        }
    });

    it("should infer type for Cons constructor", () => {
        // Cons(1, Nil)
        const intLit: CoreIntLit = { kind: "CoreIntLit", value: 1, loc: testLoc };
        const nil: CoreVariant = {
            kind: "CoreVariant",
            constructor: "Nil",
            args: [],
            loc: testLoc,
        };
        const expr: CoreVariant = {
            kind: "CoreVariant",
            constructor: "Cons",
            args: [intLit, nil],
            loc: testLoc,
        };

        const emptyModule: Module = {
            imports: [],
            declarations: [],
            loc: testLoc,
        };
        const env = buildEnvironment(emptyModule);
        const ctx: InferenceContext = {
            env,
            level: 0,
            subst: emptySubst(),
        };

        const result = inferExpr(ctx, expr);

        // Should have type List<Int>
        expect(result.type.type).toBe("App");
        if (result.type.type === "App") {
            expect(result.type.constructor.type).toBe("Const");
            if (result.type.constructor.type === "Const") {
                expect(result.type.constructor.name).toBe("List");
            }
            expect(result.type.args[0]).toEqual(primitiveTypes.Int);
        }
    });

    it("should infer type for Ok constructor", () => {
        // Ok(42)
        const intLit: CoreIntLit = { kind: "CoreIntLit", value: 42, loc: testLoc };
        const expr: CoreVariant = {
            kind: "CoreVariant",
            constructor: "Ok",
            args: [intLit],
            loc: testLoc,
        };

        const emptyModule: Module = {
            imports: [],
            declarations: [],
            loc: testLoc,
        };
        const env = buildEnvironment(emptyModule);
        const ctx: InferenceContext = {
            env,
            level: 0,
            subst: emptySubst(),
        };

        const result = inferExpr(ctx, expr);

        // Should have type Result<Int, 'e>
        expect(result.type.type).toBe("App");
        if (result.type.type === "App") {
            expect(result.type.constructor.type).toBe("Const");
            if (result.type.constructor.type === "Const") {
                expect(result.type.constructor.name).toBe("Result");
            }
            expect(result.type.args[0]).toEqual(primitiveTypes.Int);
            // Second argument should be a type variable
            expect(result.type.args[1]?.type).toBe("Var");
        }
    });

    it("should reject undefined constructor", () => {
        // UndefinedConstructor()
        const expr: CoreVariant = {
            kind: "CoreVariant",
            constructor: "UndefinedConstructor",
            args: [],
            loc: testLoc,
        };

        const emptyModule: Module = {
            imports: [],
            declarations: [],
            loc: testLoc,
        };
        const env = buildEnvironment(emptyModule);
        const ctx: InferenceContext = {
            env,
            level: 0,
            subst: emptySubst(),
        };

        expect(() => inferExpr(ctx, expr)).toThrow();
    });

    it("should reject wrong number of arguments to constructor", () => {
        // Some() - Some expects 1 argument
        const expr: CoreVariant = {
            kind: "CoreVariant",
            constructor: "Some",
            args: [],
            loc: testLoc,
        };

        const emptyModule: Module = {
            imports: [],
            declarations: [],
            loc: testLoc,
        };
        const env = buildEnvironment(emptyModule);
        const ctx: InferenceContext = {
            env,
            level: 0,
            subst: emptySubst(),
        };

        expect(() => inferExpr(ctx, expr)).toThrow();
    });

    it("should work with polymorphic constructors", () => {
        // Cons("hello", Nil) works because Cons is polymorphic
        // Cons: ∀'a. ('a, List<'a>) -> List<'a>
        // So Cons("hello", Nil) has type List<String>
        const strLit: CoreStringLit = { kind: "CoreStringLit", value: "hello", loc: testLoc };
        const nil: CoreVariant = {
            kind: "CoreVariant",
            constructor: "Nil",
            args: [],
            loc: testLoc,
        };
        const expr: CoreVariant = {
            kind: "CoreVariant",
            constructor: "Cons",
            args: [strLit, nil],
            loc: testLoc,
        };

        const emptyModule: Module = {
            imports: [],
            declarations: [],
            loc: testLoc,
        };
        const env = buildEnvironment(emptyModule);
        const ctx: InferenceContext = {
            env,
            level: 0,
            subst: emptySubst(),
        };

        const result = inferExpr(ctx, expr);

        expect(result.type.type).toBe("App");
        if (result.type.type === "App") {
            expect(result.type.constructor.type).toBe("Const");
            if (result.type.constructor.type === "Const") {
                expect(result.type.constructor.name).toBe("List");
            }
            expect(result.type.args[0]).toEqual(primitiveTypes.String);
        }
    });
});

describe("Type Inference - Match Expressions", () => {
    const emptyModule: Module = {
        imports: [],
        declarations: [],
        loc: testLoc,
    };
    const env = buildEnvironment(emptyModule);
    const ctx: InferenceContext = {
        env,
        level: 0,
        subst: emptySubst(),
    };

    it("should infer type for simple Option match", () => {
        // match Some(42) { Some(x) => x | None => 0 }
        const someExpr: CoreVariant = {
            kind: "CoreVariant",
            constructor: "Some",
            args: [{ kind: "CoreIntLit", value: 42, loc: testLoc }],
            loc: testLoc,
        };

        const someCase: CoreMatchCase = {
            pattern: {
                kind: "CoreVariantPattern",
                constructor: "Some",
                args: [{ kind: "CoreVarPattern", name: "x", loc: testLoc }],
                loc: testLoc,
            },
            body: { kind: "CoreVar", name: "x", loc: testLoc },
            loc: testLoc,
        };

        const noneCase: CoreMatchCase = {
            pattern: {
                kind: "CoreVariantPattern",
                constructor: "None",
                args: [],
                loc: testLoc,
            },
            body: { kind: "CoreIntLit", value: 0, loc: testLoc },
            loc: testLoc,
        };

        const expr: CoreMatch = {
            kind: "CoreMatch",
            expr: someExpr,
            cases: [someCase, noneCase],
            loc: testLoc,
        };

        const result = inferExpr(ctx, expr);

        expect(result.type).toEqual(primitiveTypes.Int);
    });

    it("should infer type for List match", () => {
        // match Cons(1, Nil) { Cons(h, t) => h | Nil => 0 }
        const nilExpr: CoreVariant = {
            kind: "CoreVariant",
            constructor: "Nil",
            args: [],
            loc: testLoc,
        };

        const consExpr: CoreVariant = {
            kind: "CoreVariant",
            constructor: "Cons",
            args: [{ kind: "CoreIntLit", value: 1, loc: testLoc }, nilExpr],
            loc: testLoc,
        };

        const consCase: CoreMatchCase = {
            pattern: {
                kind: "CoreVariantPattern",
                constructor: "Cons",
                args: [
                    { kind: "CoreVarPattern", name: "h", loc: testLoc },
                    { kind: "CoreVarPattern", name: "t", loc: testLoc },
                ],
                loc: testLoc,
            },
            body: { kind: "CoreVar", name: "h", loc: testLoc },
            loc: testLoc,
        };

        const nilCase: CoreMatchCase = {
            pattern: {
                kind: "CoreVariantPattern",
                constructor: "Nil",
                args: [],
                loc: testLoc,
            },
            body: { kind: "CoreIntLit", value: 0, loc: testLoc },
            loc: testLoc,
        };

        const expr: CoreMatch = {
            kind: "CoreMatch",
            expr: consExpr,
            cases: [consCase, nilCase],
            loc: testLoc,
        };

        const result = inferExpr(ctx, expr);

        expect(result.type).toEqual(primitiveTypes.Int);
    });

    it("should infer type for wildcard match", () => {
        // match 42 { _ => "any" }
        const expr: CoreMatch = {
            kind: "CoreMatch",
            expr: { kind: "CoreIntLit", value: 42, loc: testLoc },
            cases: [
                {
                    pattern: { kind: "CoreWildcardPattern", loc: testLoc },
                    body: { kind: "CoreStringLit", value: "any", loc: testLoc },
                    loc: testLoc,
                },
            ],
            loc: testLoc,
        };

        const result = inferExpr(ctx, expr);

        expect(result.type).toEqual(primitiveTypes.String);
    });

    it("should infer type for literal pattern match", () => {
        // match 1 { 1 => "one" | 2 => "two" | _ => "other" }
        const expr: CoreMatch = {
            kind: "CoreMatch",
            expr: { kind: "CoreIntLit", value: 1, loc: testLoc },
            cases: [
                {
                    pattern: { kind: "CoreLiteralPattern", literal: 1, loc: testLoc },
                    body: { kind: "CoreStringLit", value: "one", loc: testLoc },
                    loc: testLoc,
                },
                {
                    pattern: { kind: "CoreLiteralPattern", literal: 2, loc: testLoc },
                    body: { kind: "CoreStringLit", value: "two", loc: testLoc },
                    loc: testLoc,
                },
                {
                    pattern: { kind: "CoreWildcardPattern", loc: testLoc },
                    body: { kind: "CoreStringLit", value: "other", loc: testLoc },
                    loc: testLoc,
                },
            ],
            loc: testLoc,
        };

        const result = inferExpr(ctx, expr);

        expect(result.type).toEqual(primitiveTypes.String);
    });

    it("should infer type for record pattern match", () => {
        // match {x: 1, y: 2} { {x, y} => x }
        const recordExpr: CoreRecord = {
            kind: "CoreRecord",
            fields: [
                {
                    kind: "Field",
                    name: "x",
                    value: { kind: "CoreIntLit", value: 1, loc: testLoc },
                    loc: testLoc,
                },
                {
                    kind: "Field",
                    name: "y",
                    value: { kind: "CoreIntLit", value: 2, loc: testLoc },
                    loc: testLoc,
                },
            ],
            loc: testLoc,
        };

        const expr: CoreMatch = {
            kind: "CoreMatch",
            expr: recordExpr,
            cases: [
                {
                    pattern: {
                        kind: "CoreRecordPattern",
                        fields: [
                            {
                                name: "x",
                                pattern: { kind: "CoreVarPattern", name: "xVal", loc: testLoc },
                                loc: testLoc,
                            },
                            {
                                name: "y",
                                pattern: { kind: "CoreVarPattern", name: "yVal", loc: testLoc },
                                loc: testLoc,
                            },
                        ],
                        loc: testLoc,
                    },
                    body: { kind: "CoreVar", name: "xVal", loc: testLoc },
                    loc: testLoc,
                },
            ],
            loc: testLoc,
        };

        const result = inferExpr(ctx, expr);

        expect(result.type).toEqual(primitiveTypes.Int);
    });

    it("should infer type for nested pattern match", () => {
        // match Some(Some(42)) { Some(Some(x)) => x | _ => 0 }
        const innerSome: CoreVariant = {
            kind: "CoreVariant",
            constructor: "Some",
            args: [{ kind: "CoreIntLit", value: 42, loc: testLoc }],
            loc: testLoc,
        };

        const outerSome: CoreVariant = {
            kind: "CoreVariant",
            constructor: "Some",
            args: [innerSome],
            loc: testLoc,
        };

        const expr: CoreMatch = {
            kind: "CoreMatch",
            expr: outerSome,
            cases: [
                {
                    pattern: {
                        kind: "CoreVariantPattern",
                        constructor: "Some",
                        args: [
                            {
                                kind: "CoreVariantPattern",
                                constructor: "Some",
                                args: [{ kind: "CoreVarPattern", name: "x", loc: testLoc }],
                                loc: testLoc,
                            },
                        ],
                        loc: testLoc,
                    },
                    body: { kind: "CoreVar", name: "x", loc: testLoc },
                    loc: testLoc,
                },
                {
                    pattern: { kind: "CoreWildcardPattern", loc: testLoc },
                    body: { kind: "CoreIntLit", value: 0, loc: testLoc },
                    loc: testLoc,
                },
            ],
            loc: testLoc,
        };

        const result = inferExpr(ctx, expr);

        expect(result.type).toEqual(primitiveTypes.Int);
    });

    it("should infer type with guard expression", () => {
        // match Some(5) { Some(x) if x > 3 => x | _ => 0 }
        const someExpr: CoreVariant = {
            kind: "CoreVariant",
            constructor: "Some",
            args: [{ kind: "CoreIntLit", value: 5, loc: testLoc }],
            loc: testLoc,
        };

        const guard: CoreBinOp = {
            kind: "CoreBinOp",
            op: "GreaterThan",
            left: { kind: "CoreVar", name: "x", loc: testLoc },
            right: { kind: "CoreIntLit", value: 3, loc: testLoc },
            loc: testLoc,
        };

        const expr: CoreMatch = {
            kind: "CoreMatch",
            expr: someExpr,
            cases: [
                {
                    pattern: {
                        kind: "CoreVariantPattern",
                        constructor: "Some",
                        args: [{ kind: "CoreVarPattern", name: "x", loc: testLoc }],
                        loc: testLoc,
                    },
                    guard,
                    body: { kind: "CoreVar", name: "x", loc: testLoc },
                    loc: testLoc,
                },
                {
                    pattern: { kind: "CoreWildcardPattern", loc: testLoc },
                    body: { kind: "CoreIntLit", value: 0, loc: testLoc },
                    loc: testLoc,
                },
            ],
            loc: testLoc,
        };

        const result = inferExpr(ctx, expr);

        expect(result.type).toEqual(primitiveTypes.Int);
    });

    it("should unify all case body types", () => {
        // match Some(42) { Some(x) => x | None => 10 }
        const someExpr: CoreVariant = {
            kind: "CoreVariant",
            constructor: "Some",
            args: [{ kind: "CoreIntLit", value: 42, loc: testLoc }],
            loc: testLoc,
        };

        const expr: CoreMatch = {
            kind: "CoreMatch",
            expr: someExpr,
            cases: [
                {
                    pattern: {
                        kind: "CoreVariantPattern",
                        constructor: "Some",
                        args: [{ kind: "CoreVarPattern", name: "x", loc: testLoc }],
                        loc: testLoc,
                    },
                    body: { kind: "CoreVar", name: "x", loc: testLoc },
                    loc: testLoc,
                },
                {
                    pattern: {
                        kind: "CoreVariantPattern",
                        constructor: "None",
                        args: [],
                        loc: testLoc,
                    },
                    body: { kind: "CoreIntLit", value: 10, loc: testLoc },
                    loc: testLoc,
                },
            ],
            loc: testLoc,
        };

        const result = inferExpr(ctx, expr);

        expect(result.type).toEqual(primitiveTypes.Int);
    });

    it("should reject non-exhaustive match", () => {
        // match Some(42) { Some(x) => x } // Missing None case
        const someExpr: CoreVariant = {
            kind: "CoreVariant",
            constructor: "Some",
            args: [{ kind: "CoreIntLit", value: 42, loc: testLoc }],
            loc: testLoc,
        };

        const expr: CoreMatch = {
            kind: "CoreMatch",
            expr: someExpr,
            cases: [
                {
                    pattern: {
                        kind: "CoreVariantPattern",
                        constructor: "Some",
                        args: [{ kind: "CoreVarPattern", name: "x", loc: testLoc }],
                        loc: testLoc,
                    },
                    body: { kind: "CoreVar", name: "x", loc: testLoc },
                    loc: testLoc,
                },
            ],
            loc: testLoc,
        };

        expect(() => inferExpr(ctx, expr)).toThrow("Non-exhaustive");
    });

    it("should reject mismatched case types", () => {
        // match Some(42) { Some(x) => x | None => "string" }
        const someExpr: CoreVariant = {
            kind: "CoreVariant",
            constructor: "Some",
            args: [{ kind: "CoreIntLit", value: 42, loc: testLoc }],
            loc: testLoc,
        };

        const expr: CoreMatch = {
            kind: "CoreMatch",
            expr: someExpr,
            cases: [
                {
                    pattern: {
                        kind: "CoreVariantPattern",
                        constructor: "Some",
                        args: [{ kind: "CoreVarPattern", name: "x", loc: testLoc }],
                        loc: testLoc,
                    },
                    body: { kind: "CoreVar", name: "x", loc: testLoc },
                    loc: testLoc,
                },
                {
                    pattern: {
                        kind: "CoreVariantPattern",
                        constructor: "None",
                        args: [],
                        loc: testLoc,
                    },
                    body: { kind: "CoreStringLit", value: "string", loc: testLoc },
                    loc: testLoc,
                },
            ],
            loc: testLoc,
        };

        expect(() => inferExpr(ctx, expr)).toThrow();
    });

    it("should reject non-Bool guard", () => {
        // match Some(5) { Some(x) if "not bool" => x | _ => 0 }
        const someExpr: CoreVariant = {
            kind: "CoreVariant",
            constructor: "Some",
            args: [{ kind: "CoreIntLit", value: 5, loc: testLoc }],
            loc: testLoc,
        };

        const expr: CoreMatch = {
            kind: "CoreMatch",
            expr: someExpr,
            cases: [
                {
                    pattern: {
                        kind: "CoreVariantPattern",
                        constructor: "Some",
                        args: [{ kind: "CoreVarPattern", name: "x", loc: testLoc }],
                        loc: testLoc,
                    },
                    guard: { kind: "CoreStringLit", value: "not bool", loc: testLoc },
                    body: { kind: "CoreVar", name: "x", loc: testLoc },
                    loc: testLoc,
                },
                {
                    pattern: { kind: "CoreWildcardPattern", loc: testLoc },
                    body: { kind: "CoreIntLit", value: 0, loc: testLoc },
                    loc: testLoc,
                },
            ],
            loc: testLoc,
        };

        expect(() => inferExpr(ctx, expr)).toThrow();
    });

    it("should handle match in let-binding", () => {
        // let result = match Some(42) { Some(x) => x | None => 0 } in result
        const someExpr: CoreVariant = {
            kind: "CoreVariant",
            constructor: "Some",
            args: [{ kind: "CoreIntLit", value: 42, loc: testLoc }],
            loc: testLoc,
        };

        const matchExpr: CoreMatch = {
            kind: "CoreMatch",
            expr: someExpr,
            cases: [
                {
                    pattern: {
                        kind: "CoreVariantPattern",
                        constructor: "Some",
                        args: [{ kind: "CoreVarPattern", name: "x", loc: testLoc }],
                        loc: testLoc,
                    },
                    body: { kind: "CoreVar", name: "x", loc: testLoc },
                    loc: testLoc,
                },
                {
                    pattern: {
                        kind: "CoreVariantPattern",
                        constructor: "None",
                        args: [],
                        loc: testLoc,
                    },
                    body: { kind: "CoreIntLit", value: 0, loc: testLoc },
                    loc: testLoc,
                },
            ],
            loc: testLoc,
        };

        const expr: CoreLet = {
            kind: "CoreLet",
            pattern: { kind: "CoreVarPattern", name: "result", loc: testLoc },
            value: matchExpr,
            body: { kind: "CoreVar", name: "result", loc: testLoc },
            recursive: false,
            mutable: false,
            loc: testLoc,
        };

        const result = inferExpr(ctx, expr);

        expect(result.type).toEqual(primitiveTypes.Int);
    });
});
