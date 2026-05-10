/**
 * Tests for type inference of `Ref<T>` over composite element types.
 *
 * Spec ref: docs/spec/07-mutable-references.md:292-332 — `Ref<T>` is
 * fully polymorphic in `T` and may hold records, variants, or sit
 * inside collections like `List<Ref<T>>`. Audit (07 F-10) flagged
 * that composite-element coverage was thin: only basic Int/String/Bool
 * refs were exercised in unit tests, with composite cases living in
 * E2E only. These tests pin the structural type equality at the
 * typechecker layer (U) and the surface→Core path (I) so a
 * regression that loses the inner type structure surfaces here.
 */

import type { Expr, Location } from "../types/ast.js";
import type {
    CoreApp,
    CoreExpr,
    CoreIntLit,
    CoreLet,
    CoreVar,
    CoreVariant,
    CoreVarPattern,
} from "../types/core-ast.js";
import type { Type } from "../types/environment.js";

import { beforeEach, describe, expect, it } from "vitest";

import { desugar } from "../desugarer/desugarer.js";
import { createContext, inferExpr } from "./infer/index.js";
import { createTestEnv, testLoc } from "./typechecker-test-helpers.js";
import { constType, primitiveTypes, resetTypeVarCounter } from "./types.js";

const surfaceLoc: Location = testLoc;

function refOf(inner: Type): Type {
    return { type: "App", constructor: constType("Ref"), args: [inner] };
}

function listOf(inner: Type): Type {
    return { type: "App", constructor: constType("List"), args: [inner] };
}

function expectRef(actual: Type, message: string): Type {
    if (actual.type !== "App") throw new Error(`${message}: expected App type, got ${actual.type}`);
    if (actual.constructor.type !== "Const" || actual.constructor.name !== "Ref") {
        throw new Error(`${message}: expected Ref<…>, got ${actual.constructor.type}`);
    }
    if (actual.args.length !== 1) {
        throw new Error(`${message}: expected one type argument to Ref`);
    }
    return actual.args[0]!;
}

describe("Type Inference - Ref over composite types (07 F-10)", () => {
    beforeEach(() => {
        resetTypeVarCounter();
    });

    // U: ref({ x: 1 }) infers Ref<{ x: Int }>.
    it("infers Ref<Record> from `let mut r = ref({ x: 1 }) in r`", () => {
        const env = createTestEnv();
        const ctx = createContext(env);

        const refVar: CoreVar = { kind: "CoreVar", name: "ref", loc: testLoc };
        const intLit: CoreIntLit = { kind: "CoreIntLit", value: 1, loc: testLoc };
        const recordLit: CoreExpr = {
            kind: "CoreRecord",
            fields: [{ kind: "Field", name: "x", value: intLit, loc: testLoc }],
            loc: testLoc,
        };
        const refCall: CoreApp = {
            kind: "CoreApp",
            func: refVar,
            args: [recordLit],
            loc: testLoc,
        };
        const rPattern: CoreVarPattern = { kind: "CoreVarPattern", name: "r", loc: testLoc };
        const rBody: CoreVar = { kind: "CoreVar", name: "r", loc: testLoc };
        const expr: CoreLet = {
            kind: "CoreLet",
            pattern: rPattern,
            value: refCall,
            body: rBody,
            mutable: true,
            loc: testLoc,
        };

        const result = inferExpr(ctx, expr);
        const inner = expectRef(result.type, "Ref<Record>");
        expect(inner.type).toBe("Record");
        if (inner.type === "Record") {
            expect(inner.fields.get("x")).toEqual(primitiveTypes.Int);
        }
    });

    // U: ref(Some(5)) infers Ref<Option<Int>>.
    it("infers Ref<Option<Int>> from `let mut r = ref(Some(5)) in r`", () => {
        const env = createTestEnv();
        const ctx = createContext(env);

        const fiveLit: CoreIntLit = { kind: "CoreIntLit", value: 5, loc: testLoc };
        const someVariant: CoreVariant = {
            kind: "CoreVariant",
            constructor: "Some",
            args: [fiveLit],
            loc: testLoc,
        };
        const refVar: CoreVar = { kind: "CoreVar", name: "ref", loc: testLoc };
        const refCall: CoreApp = {
            kind: "CoreApp",
            func: refVar,
            args: [someVariant],
            loc: testLoc,
        };
        const rPattern: CoreVarPattern = { kind: "CoreVarPattern", name: "r", loc: testLoc };
        const rBody: CoreVar = { kind: "CoreVar", name: "r", loc: testLoc };
        const expr: CoreLet = {
            kind: "CoreLet",
            pattern: rPattern,
            value: refCall,
            body: rBody,
            mutable: true,
            loc: testLoc,
        };

        const result = inferExpr(ctx, expr);
        const inner = expectRef(result.type, "Ref<Option<Int>>");
        expect(inner.type).toBe("App");
        if (inner.type === "App") {
            expect(inner.constructor.type).toBe("Const");
            if (inner.constructor.type === "Const") {
                expect(inner.constructor.name).toBe("Option");
            }
            expect(inner.args).toHaveLength(1);
            expect(inner.args[0]).toEqual(primitiveTypes.Int);
        }
    });

    // U: [ref(1), ref(2)] (built as Cons(ref(1), Cons(ref(2), Nil))) infers
    // List<Ref<Int>>.
    it("infers List<Ref<Int>> from a list of ref(Int) elements", () => {
        const env = createTestEnv();
        const ctx = createContext(env);

        const refVar: CoreVar = { kind: "CoreVar", name: "ref", loc: testLoc };

        const ref1: CoreApp = {
            kind: "CoreApp",
            func: refVar,
            args: [{ kind: "CoreIntLit", value: 1, loc: testLoc }],
            loc: testLoc,
        };
        const ref2: CoreApp = {
            kind: "CoreApp",
            func: refVar,
            args: [{ kind: "CoreIntLit", value: 2, loc: testLoc }],
            loc: testLoc,
        };

        const nil: CoreVariant = { kind: "CoreVariant", constructor: "Nil", args: [], loc: testLoc };
        const consInner: CoreVariant = {
            kind: "CoreVariant",
            constructor: "Cons",
            args: [ref2, nil],
            loc: testLoc,
        };
        const consOuter: CoreVariant = {
            kind: "CoreVariant",
            constructor: "Cons",
            args: [ref1, consInner],
            loc: testLoc,
        };

        const result = inferExpr(ctx, consOuter);
        // Sanity-check the helper builders against the inferred type.
        const expected = listOf(refOf(primitiveTypes.Int));
        expect(expected.type).toBe("App");
        // Structural equality: we expect exactly List<Ref<Int>>.
        expect(result.type.type).toBe("App");
        if (result.type.type === "App") {
            expect(result.type.constructor.type).toBe("Const");
            if (result.type.constructor.type === "Const") {
                expect(result.type.constructor.name).toBe("List");
            }
            const elem = result.type.args[0]!;
            expect(elem.type).toBe("App");
            if (elem.type === "App") {
                expect(elem.constructor.type).toBe("Const");
                if (elem.constructor.type === "Const") {
                    expect(elem.constructor.name).toBe("Ref");
                }
                expect(elem.args[0]).toEqual(primitiveTypes.Int);
            }
        }
    });

    // I: surface-AST → desugar → typecheck for `let mut r = ref({ x: 1 }) in r`.
    // Pins that the desugarer preserves the composite RHS so the
    // typechecker still sees the record in the ref's argument.
    it("end-to-end: surface `let mut r = ref({ x: 1 })` desugars and typechecks to Ref<Record>", () => {
        // Surface AST: { let mut r = ref({ x: 1 }); r }
        const surface: Expr = {
            kind: "Block",
            exprs: [
                {
                    kind: "Let",
                    recursive: false,
                    mutable: true,
                    pattern: { kind: "VarPattern", name: "r", loc: surfaceLoc },
                    value: {
                        kind: "App",
                        func: { kind: "Var", name: "ref", loc: surfaceLoc },
                        args: [
                            {
                                kind: "Record",
                                fields: [
                                    {
                                        kind: "Field",
                                        name: "x",
                                        value: { kind: "IntLit", value: 1, loc: surfaceLoc },
                                        loc: surfaceLoc,
                                    },
                                ],
                                loc: surfaceLoc,
                            },
                        ],
                        loc: surfaceLoc,
                    },
                    // body is unused by desugarBlock — the actual body
                    // comes from the next expression in the block.
                    body: { kind: "UnitLit", loc: surfaceLoc },
                    loc: surfaceLoc,
                },
                { kind: "Var", name: "r", loc: surfaceLoc },
            ],
            loc: surfaceLoc,
        };

        const core = desugar(surface);
        const env = createTestEnv();
        const ctx = createContext(env);
        const result = inferExpr(ctx, core);
        const inner = expectRef(result.type, "I-layer Ref<Record>");
        expect(inner.type).toBe("Record");
        if (inner.type === "Record") {
            expect(inner.fields.get("x")).toEqual(primitiveTypes.Int);
        }
    });

    // I: surface-AST → desugar → typecheck for a list of refs.
    it("end-to-end: surface `[ref(1), ref(2)]` desugars and typechecks to List<Ref<Int>>", () => {
        const surface: Expr = {
            kind: "List",
            elements: [
                {
                    kind: "Element" as const,
                    expr: {
                        kind: "App",
                        func: { kind: "Var", name: "ref", loc: surfaceLoc },
                        args: [{ kind: "IntLit", value: 1, loc: surfaceLoc }],
                        loc: surfaceLoc,
                    },
                },
                {
                    kind: "Element" as const,
                    expr: {
                        kind: "App",
                        func: { kind: "Var", name: "ref", loc: surfaceLoc },
                        args: [{ kind: "IntLit", value: 2, loc: surfaceLoc }],
                        loc: surfaceLoc,
                    },
                },
            ],
            loc: surfaceLoc,
        };

        const core = desugar(surface);
        const env = createTestEnv();
        const ctx = createContext(env);
        const result = inferExpr(ctx, core);

        expect(result.type.type).toBe("App");
        if (result.type.type === "App") {
            expect(result.type.constructor.type).toBe("Const");
            if (result.type.constructor.type === "Const") {
                expect(result.type.constructor.name).toBe("List");
            }
            const elem = result.type.args[0]!;
            expect(elem.type).toBe("App");
            if (elem.type === "App") {
                expect(elem.constructor.type).toBe("Const");
                if (elem.constructor.type === "Const") {
                    expect(elem.constructor.name).toBe("Ref");
                }
                expect(elem.args[0]).toEqual(primitiveTypes.Int);
            }
        }
    });
});
