/**
 * Tests for type inference - mutually recursive let-bindings (let rec ... and ...).
 */

import type { CoreApp, CoreBinOp, CoreIntLit, CoreLambda, CoreVar, CoreVarPattern } from "../types/core-ast.js";

import { beforeEach, describe, expect, it } from "vitest";

import { VibefunDiagnostic } from "../diagnostics/index.js";
import { createContext, inferExpr } from "./infer/index.js";
import { createTestEnv, testLoc } from "./typechecker-test-helpers.js";
import { primitiveTypes, resetTypeVarCounter } from "./types.js";

describe("Type Inference - Mutually Recursive Let-Bindings (let rec ... and ...)", () => {
    beforeEach(() => {
        resetTypeVarCounter();
    });

    it("should infer type for mutually recursive functions with termination", () => {
        // let rec f = x => x + 1 and g = x => f(x) + 1 in f(1)
        // A simple non-cyclic mutual recursion that terminates
        const env = createTestEnv();
        const ctx = createContext(env);

        // f = x => x + 1
        const fParam: CoreVarPattern = { kind: "CoreVarPattern", name: "x", loc: testLoc };
        const xVar1: CoreVar = { kind: "CoreVar", name: "x", loc: testLoc };
        const one1: CoreIntLit = { kind: "CoreIntLit", value: 1, loc: testLoc };
        const fBody: CoreBinOp = { kind: "CoreBinOp", op: "Add", left: xVar1, right: one1, loc: testLoc };
        const fValue: CoreLambda = { kind: "CoreLambda", param: fParam, body: fBody, loc: testLoc };

        // g = x => f(x) + 1
        const gParam: CoreVarPattern = { kind: "CoreVarPattern", name: "x", loc: testLoc };
        const fVar: CoreVar = { kind: "CoreVar", name: "f", loc: testLoc };
        const xVar2: CoreVar = { kind: "CoreVar", name: "x", loc: testLoc };
        const fCall: CoreApp = { kind: "CoreApp", func: fVar, args: [xVar2], loc: testLoc };
        const one2: CoreIntLit = { kind: "CoreIntLit", value: 1, loc: testLoc };
        const gBody: CoreBinOp = { kind: "CoreBinOp", op: "Add", left: fCall, right: one2, loc: testLoc };
        const gValue: CoreLambda = { kind: "CoreLambda", param: gParam, body: gBody, loc: testLoc };

        // body: f(1)
        const fVar2: CoreVar = { kind: "CoreVar", name: "f", loc: testLoc };
        const intLit: CoreIntLit = { kind: "CoreIntLit", value: 1, loc: testLoc };
        const bodyApp: CoreApp = { kind: "CoreApp", func: fVar2, args: [intLit], loc: testLoc };

        const expr: import("../types/core-ast.js").CoreLetRecExpr = {
            kind: "CoreLetRecExpr",
            bindings: [
                {
                    pattern: { kind: "CoreVarPattern", name: "f", loc: testLoc },
                    value: fValue,
                    mutable: false,
                    loc: testLoc,
                },
                {
                    pattern: { kind: "CoreVarPattern", name: "g", loc: testLoc },
                    value: gValue,
                    mutable: false,
                    loc: testLoc,
                },
            ],
            body: bodyApp,
            loc: testLoc,
        };

        const result = inferExpr(ctx, expr);

        // f(1) should have type Int
        expect(result.type).toEqual(primitiveTypes.Int);
    });

    it("should infer type for mutually recursive functions with concrete types", () => {
        // let rec f = x => x + 1 and g = x => f(x) in g(10)
        const env = createTestEnv();
        const ctx = createContext(env);

        // f = x => x + 1
        const fParam: CoreVarPattern = { kind: "CoreVarPattern", name: "x", loc: testLoc };
        const xVar1: CoreVar = { kind: "CoreVar", name: "x", loc: testLoc };
        const one: CoreIntLit = { kind: "CoreIntLit", value: 1, loc: testLoc };
        const fBody: CoreBinOp = { kind: "CoreBinOp", op: "Add", left: xVar1, right: one, loc: testLoc };
        const fValue: CoreLambda = { kind: "CoreLambda", param: fParam, body: fBody, loc: testLoc };

        // g = x => f(x)
        const gParam: CoreVarPattern = { kind: "CoreVarPattern", name: "x", loc: testLoc };
        const fVar: CoreVar = { kind: "CoreVar", name: "f", loc: testLoc };
        const xVar2: CoreVar = { kind: "CoreVar", name: "x", loc: testLoc };
        const gBody: CoreApp = { kind: "CoreApp", func: fVar, args: [xVar2], loc: testLoc };
        const gValue: CoreLambda = { kind: "CoreLambda", param: gParam, body: gBody, loc: testLoc };

        // body: g(10)
        const gVar: CoreVar = { kind: "CoreVar", name: "g", loc: testLoc };
        const ten: CoreIntLit = { kind: "CoreIntLit", value: 10, loc: testLoc };
        const bodyApp: CoreApp = { kind: "CoreApp", func: gVar, args: [ten], loc: testLoc };

        const expr: import("../types/core-ast.js").CoreLetRecExpr = {
            kind: "CoreLetRecExpr",
            bindings: [
                {
                    pattern: { kind: "CoreVarPattern", name: "f", loc: testLoc },
                    value: fValue,
                    mutable: false,
                    loc: testLoc,
                },
                {
                    pattern: { kind: "CoreVarPattern", name: "g", loc: testLoc },
                    value: gValue,
                    mutable: false,
                    loc: testLoc,
                },
            ],
            body: bodyApp,
            loc: testLoc,
        };

        const result = inferExpr(ctx, expr);

        // g(10) should have type Int
        expect(result.type).toEqual(primitiveTypes.Int);
    });

    it("should infer type for single binding in let rec expr", () => {
        // let rec f = x => f(x) in f(42)
        const env = createTestEnv();
        const ctx = createContext(env);

        const param: CoreVarPattern = { kind: "CoreVarPattern", name: "x", loc: testLoc };
        const fVar: CoreVar = { kind: "CoreVar", name: "f", loc: testLoc };
        const xVar: CoreVar = { kind: "CoreVar", name: "x", loc: testLoc };
        const recCall: CoreApp = { kind: "CoreApp", func: fVar, args: [xVar], loc: testLoc };
        const fValue: CoreLambda = { kind: "CoreLambda", param, body: recCall, loc: testLoc };

        const fVar2: CoreVar = { kind: "CoreVar", name: "f", loc: testLoc };
        const intLit: CoreIntLit = { kind: "CoreIntLit", value: 42, loc: testLoc };
        const bodyApp: CoreApp = { kind: "CoreApp", func: fVar2, args: [intLit], loc: testLoc };

        const expr: import("../types/core-ast.js").CoreLetRecExpr = {
            kind: "CoreLetRecExpr",
            bindings: [
                {
                    pattern: { kind: "CoreVarPattern", name: "f", loc: testLoc },
                    value: fValue,
                    mutable: false,
                    loc: testLoc,
                },
            ],
            body: bodyApp,
            loc: testLoc,
        };

        const result = inferExpr(ctx, expr);

        // Should type check
        expect(result.type.type).toBe("Var");
    });

    it("should reject non-variable patterns in let rec expr bindings", () => {
        // Pattern matching in let rec bindings is not supported
        const env = createTestEnv();
        const ctx = createContext(env);

        const tuplePattern: import("../types/core-ast.js").CoreTuplePattern = {
            kind: "CoreTuplePattern",
            elements: [
                { kind: "CoreVarPattern", name: "a", loc: testLoc },
                { kind: "CoreVarPattern", name: "b", loc: testLoc },
            ],
            loc: testLoc,
        };

        const intLit: CoreIntLit = { kind: "CoreIntLit", value: 42, loc: testLoc };
        const xVar: CoreVar = { kind: "CoreVar", name: "x", loc: testLoc };

        const expr: import("../types/core-ast.js").CoreLetRecExpr = {
            kind: "CoreLetRecExpr",
            bindings: [
                {
                    pattern: tuplePattern,
                    value: intLit,
                    mutable: false,
                    loc: testLoc,
                },
            ],
            body: xVar,
            loc: testLoc,
        };

        expect(() => inferExpr(ctx, expr)).toThrow(VibefunDiagnostic);
    });

    it("should accept mutable bindings in let rec expr (parser enforces ref shape)", () => {
        // `let rec x = ref(42) and ... in x` — the typechecker no longer
        // blocks mutable bindings; the parser enforces the `ref(...)`
        // shape, and HM infers Ref<Int> naturally through the ref builtin.
        const env = createTestEnv();
        const ctx = createContext(env);

        const intLit: CoreIntLit = { kind: "CoreIntLit", value: 42, loc: testLoc };
        const refVar: CoreVar = { kind: "CoreVar", name: "ref", loc: testLoc };
        const refCall: CoreApp = { kind: "CoreApp", func: refVar, args: [intLit], loc: testLoc };
        const xVar: CoreVar = { kind: "CoreVar", name: "x", loc: testLoc };

        const expr: import("../types/core-ast.js").CoreLetRecExpr = {
            kind: "CoreLetRecExpr",
            bindings: [
                {
                    pattern: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                    value: refCall,
                    mutable: true,
                    loc: testLoc,
                },
            ],
            body: xVar,
            loc: testLoc,
        };

        expect(() => inferExpr(ctx, expr)).not.toThrow();
    });

    it("should reject mutable bindings in let rec expr whose RHS is not Ref<T>", () => {
        // The Ref<T> requirement (VF4018) extends to recursive mutable
        // bindings too. Without this, `let rec mut x = 0 and …` would
        // slip through even though the equivalent non-recursive form
        // errors via inferLet.
        const env = createTestEnv();
        const ctx = createContext(env);

        const intLit: CoreIntLit = { kind: "CoreIntLit", value: 42, loc: testLoc };
        const xVar: CoreVar = { kind: "CoreVar", name: "x", loc: testLoc };

        const expr: import("../types/core-ast.js").CoreLetRecExpr = {
            kind: "CoreLetRecExpr",
            bindings: [
                {
                    pattern: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                    value: intLit,
                    mutable: true,
                    loc: testLoc,
                },
            ],
            body: xVar,
            loc: testLoc,
        };

        try {
            inferExpr(ctx, expr);
            throw new Error("Expected VF4018 to be thrown");
        } catch (err) {
            expect(err).toBeInstanceOf(VibefunDiagnostic);
            if (err instanceof VibefunDiagnostic) {
                expect(err.code).toBe("VF4018");
            }
        }
    });
});
