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
        // List.map is no longer an ambient flat-key binding (phase 2.6);
        // stdlib functions are reached through explicit imports from
        // @vibefun/std. Variant constructors remain ambient, and the
        // compiler-reserved `__std__` root is pre-bound for desugarer-
        // synthesized references.
        expect(result.env.values.has("__std__")).toBe(true);
        expect(result.env.values.has("List.map")).toBe(false);
        expect(result.env.values.has("Cons")).toBe(true);
        expect(result.env.values.has("Nil")).toBe(true);
    });

    it("should generalize non-mutable bindings in a top-level CoreLetRecGroup", () => {
        // `let rec id x = x and …` at module scope should yield the
        // polymorphic scheme `∀a. a -> a` for `id`, mirroring how the
        // expression-level `inferLetRecExpr` and the non-recursive
        // top-level `CoreLetDecl` paths already generalize. Without
        // generalization, the binding stays at a concrete type var
        // and any later use of `id` at two different argument types
        // fails to unify.
        const module = createModule([
            {
                kind: "CoreLetRecGroup",
                bindings: [
                    {
                        pattern: { kind: "CoreVarPattern", name: "id", loc: testLoc },
                        value: {
                            kind: "CoreLambda",
                            param: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                            body: { kind: "CoreVar", name: "x", loc: testLoc },
                            loc: testLoc,
                        },
                        mutable: false,
                        loc: testLoc,
                    },
                ],
                exported: true,
                loc: testLoc,
            },
            // Two non-unifying uses force generalization to be observable:
            // if `id` were monomorphic at `t -> t`, the first use at Int
            // would pin `t := Int` and the second use at Bool would fail.
            {
                kind: "CoreLetDecl",
                pattern: { kind: "CoreVarPattern", name: "asInt", loc: testLoc },
                value: {
                    kind: "CoreApp",
                    func: { kind: "CoreVar", name: "id", loc: testLoc },
                    args: [{ kind: "CoreIntLit", value: 1, loc: testLoc }],
                    loc: testLoc,
                },
                mutable: false,
                recursive: false,
                exported: false,
                loc: testLoc,
            },
            {
                kind: "CoreLetDecl",
                pattern: { kind: "CoreVarPattern", name: "asBool", loc: testLoc },
                value: {
                    kind: "CoreApp",
                    func: { kind: "CoreVar", name: "id", loc: testLoc },
                    args: [{ kind: "CoreBoolLit", value: true, loc: testLoc }],
                    loc: testLoc,
                },
                mutable: false,
                recursive: false,
                exported: false,
                loc: testLoc,
            },
        ]);

        // Should not throw — the polymorphic `id` schema must let
        // `asInt` and `asBool` both succeed.
        const result = typeCheck(module);
        expect(result.declarationTypes.has("id")).toBe(true);
        expect(result.declarationTypes.has("asInt")).toBe(true);
        expect(result.declarationTypes.has("asBool")).toBe(true);
    });

    it("should propagate within-group substitution to earlier-stored bindings", () => {
        // Regression: in `let rec f = g and g = 1`, the substitution that
        // pins `g` (and transitively `f`) to `Int` is learned during
        // `g`'s inference iteration — *after* `f`'s entry has been
        // written into `inferredTypes`. Without re-applying the final
        // substitution to every entry before storing, `f` would remain
        // at its placeholder type variable instead of resolving to `Int`.
        const module = createModule([
            {
                kind: "CoreLetRecGroup",
                bindings: [
                    {
                        pattern: { kind: "CoreVarPattern", name: "f", loc: testLoc },
                        value: { kind: "CoreVar", name: "g", loc: testLoc },
                        mutable: false,
                        loc: testLoc,
                    },
                    {
                        pattern: { kind: "CoreVarPattern", name: "g", loc: testLoc },
                        value: { kind: "CoreIntLit", value: 1, loc: testLoc },
                        mutable: false,
                        loc: testLoc,
                    },
                ],
                exported: false,
                loc: testLoc,
            },
        ]);

        const result = typeCheck(module);
        const fType = result.declarationTypes.get("f");
        const gType = result.declarationTypes.get("g");
        expect(fType?.type).toBe("Const");
        expect(gType?.type).toBe("Const");
        if (fType?.type === "Const") expect(fType.name).toBe("Int");
        if (gType?.type === "Const") expect(gType.name).toBe("Int");
    });

    it("should propagate substitution from a CoreLetRecGroup back into earlier top-level bindings", () => {
        // Regression: a prior monomorphic top-level binding holding a
        // type variable (e.g. `let r = ref(None)` inferred as
        // `Ref<Option<a>>`) must be updated when a subsequent let-rec
        // group narrows that variable. Without applying `currentSubst`
        // to `env.values`, the prior binding's scheme keeps the un-
        // narrowed type and a *later* declaration that reads it sees
        // the wrong type.
        //
        // Construction: `let r = ref(None)` (monomorphic Ref<Option<t>>)
        // followed by `let rec consume = (x: Option<Int>) => x and tap = consume(!r)`.
        // The let-rec group unifies `Option<t>` with `Option<Int>`, so
        // `t := Int` must propagate back into `r`'s scheme stored in env.
        // We then add a third declaration `let extracted = !r` whose
        // inferred type pins down the propagation: it should be
        // `Option<Int>`, not the un-narrowed type variable.
        const module = createModule([
            {
                kind: "CoreLetDecl",
                pattern: { kind: "CoreVarPattern", name: "r", loc: testLoc },
                value: {
                    kind: "CoreApp",
                    func: { kind: "CoreVar", name: "ref", loc: testLoc },
                    args: [{ kind: "CoreVar", name: "None", loc: testLoc }],
                    loc: testLoc,
                },
                mutable: false,
                recursive: false,
                exported: false,
                loc: testLoc,
            },
            {
                kind: "CoreLetRecGroup",
                bindings: [
                    {
                        pattern: { kind: "CoreVarPattern", name: "consume", loc: testLoc },
                        value: {
                            kind: "CoreLambda",
                            param: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                            body: {
                                kind: "CoreMatch",
                                expr: { kind: "CoreVar", name: "x", loc: testLoc },
                                cases: [
                                    {
                                        pattern: {
                                            kind: "CoreVariantPattern",
                                            constructor: "Some",
                                            args: [
                                                {
                                                    kind: "CoreVarPattern",
                                                    name: "v",
                                                    loc: testLoc,
                                                },
                                            ],
                                            loc: testLoc,
                                        },
                                        body: { kind: "CoreVar", name: "v", loc: testLoc },
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
                            },
                            loc: testLoc,
                        },
                        mutable: false,
                        loc: testLoc,
                    },
                    {
                        pattern: { kind: "CoreVarPattern", name: "tap", loc: testLoc },
                        value: {
                            kind: "CoreApp",
                            func: { kind: "CoreVar", name: "consume", loc: testLoc },
                            args: [
                                {
                                    kind: "CoreUnaryOp",
                                    op: "Deref",
                                    expr: { kind: "CoreVar", name: "r", loc: testLoc },
                                    loc: testLoc,
                                },
                            ],
                            loc: testLoc,
                        },
                        mutable: false,
                        loc: testLoc,
                    },
                ],
                exported: false,
                loc: testLoc,
            },
            {
                kind: "CoreLetDecl",
                pattern: { kind: "CoreVarPattern", name: "extracted", loc: testLoc },
                value: {
                    kind: "CoreApp",
                    func: { kind: "CoreVar", name: "consume", loc: testLoc },
                    args: [
                        {
                            kind: "CoreUnaryOp",
                            op: "Deref",
                            expr: { kind: "CoreVar", name: "r", loc: testLoc },
                            loc: testLoc,
                        },
                    ],
                    loc: testLoc,
                },
                mutable: false,
                recursive: false,
                exported: false,
                loc: testLoc,
            },
        ]);

        // The let-rec group narrows `r`'s element type from `Option<t>`
        // to `Option<Int>`. If that narrowing weren't propagated to
        // env.values, the third declaration's `consume(!r)` would see a
        // stale `r` whose `!r` produces `Option<t>` and would get a
        // fresh, ungeneralized `t`. The test passes if type checking
        // succeeds and `extracted`'s type is `Int` (the body of `consume`
        // returns the contents of `Option<Int>` or `0`).
        const result = typeCheck(module);
        const extractedType = result.declarationTypes.get("extracted");
        expect(extractedType?.type).toBe("Const");
        if (extractedType?.type === "Const") expect(extractedType.name).toBe("Int");
    });

    it("should reject mutable bindings inside a top-level CoreLetRecGroup whose RHS isn't Ref<T>", () => {
        // Mirrors the VF4018 check that already existed for non-recursive
        // `let mut x = 0;` — the recursive group form must reject the
        // same way, otherwise `let rec f = … and mut x = 0` slips through.
        const module = createModule([
            {
                kind: "CoreLetRecGroup",
                bindings: [
                    {
                        pattern: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                        value: { kind: "CoreIntLit", value: 0, loc: testLoc },
                        mutable: true,
                        loc: testLoc,
                    },
                ],
                exported: false,
                loc: testLoc,
            },
        ]);

        expect(() => typeCheck(module)).toThrow(/VF4018/);
    });
});
