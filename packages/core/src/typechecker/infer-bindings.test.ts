/**
 * Tests for type inference - let-bindings, references, and value restriction
 */

import type {
    CoreApp,
    CoreBinOp,
    CoreBoolLit,
    CoreIntLit,
    CoreLambda,
    CoreLet,
    CoreStringLit,
    CoreUnaryOp,
    CoreUnsafe,
    CoreVar,
    CoreVarPattern,
} from "../types/core-ast.js";
import type { Type, TypeEnv } from "../types/environment.js";

import { beforeEach, describe, expect, it } from "vitest";

import { VibefunDiagnostic } from "../diagnostics/index.js";
import { getBuiltinEnv } from "./builtins.js";
import { createContext, inferExpr } from "./infer/index.js";
import { constType, freshTypeVar, isTypeVar, primitiveTypes, resetTypeVarCounter } from "./types.js";

const testLoc = { file: "test.vf", line: 1, column: 1, offset: 0 };

function createTestEnv(): TypeEnv {
    const builtins = getBuiltinEnv();
    const values = new Map();

    // Convert builtin type schemes to Value bindings
    for (const [name, scheme] of builtins.entries()) {
        values.set(name, {
            kind: "Value" as const,
            scheme,
            loc: { file: "<builtin>", line: 0, column: 0, offset: 0 },
        });
    }

    return {
        values,
        types: new Map(),
    };
}

describe("Type Inference - Let-Bindings", () => {
    beforeEach(() => {
        resetTypeVarCounter();
    });

    it("should infer type for simple let-binding", () => {
        // let x = 42 in x
        const pattern: CoreVarPattern = { kind: "CoreVarPattern", name: "x", loc: testLoc };
        const value: CoreIntLit = { kind: "CoreIntLit", value: 42, loc: testLoc };
        const body: CoreVar = { kind: "CoreVar", name: "x", loc: testLoc };
        const expr: CoreLet = {
            kind: "CoreLet",
            pattern,
            value,
            body,
            mutable: false,
            recursive: false,
            loc: testLoc,
        };

        const env = createTestEnv();
        const ctx = createContext(env);

        const result = inferExpr(ctx, expr);

        expect(result.type).toEqual(primitiveTypes.Int);
    });

    it("should support polymorphic let-bindings", () => {
        // let id = x => x in (id(42), id(true))
        const param: CoreVarPattern = { kind: "CoreVarPattern", name: "x", loc: testLoc };
        const xVar: CoreVar = { kind: "CoreVar", name: "x", loc: testLoc };
        const idFunc: CoreLambda = { kind: "CoreLambda", param, body: xVar, loc: testLoc };

        // id(42)
        const idVar1: CoreVar = { kind: "CoreVar", name: "id", loc: testLoc };
        const intLit: CoreIntLit = { kind: "CoreIntLit", value: 42, loc: testLoc };
        const idInt: CoreApp = { kind: "CoreApp", func: idVar1, args: [intLit], loc: testLoc };

        // id(true)
        const idVar2: CoreVar = { kind: "CoreVar", name: "id", loc: testLoc };
        const boolLit: CoreBoolLit = { kind: "CoreBoolLit", value: true, loc: testLoc };
        const idBool: CoreApp = { kind: "CoreApp", func: idVar2, args: [boolLit], loc: testLoc };

        // Use idInt as body (simplified test - just check it type checks)
        const pattern: CoreVarPattern = { kind: "CoreVarPattern", name: "id", loc: testLoc };
        const expr: CoreLet = {
            kind: "CoreLet",
            pattern,
            value: idFunc,
            body: idInt,
            mutable: false,
            recursive: false,
            loc: testLoc,
        };

        const env = createTestEnv();
        const ctx = createContext(env);

        const result = inferExpr(ctx, expr);

        // id(42) should have type Int
        expect(result.type).toEqual(primitiveTypes.Int);

        // Now test that id can also be used with Bool
        const expr2: CoreLet = {
            kind: "CoreLet",
            pattern,
            value: idFunc,
            body: idBool,
            mutable: false,
            recursive: false,
            loc: testLoc,
        };

        const result2 = inferExpr(ctx, expr2);
        expect(result2.type).toEqual(primitiveTypes.Bool);
    });

    it("should support recursive let-bindings", () => {
        // let rec factorial = n => if n == 0 then 1 else n * factorial(n - 1) in factorial(5)
        // Simplified: let rec f = x => f(x) in f(42)
        const pattern: CoreVarPattern = { kind: "CoreVarPattern", name: "f", loc: testLoc };
        const param: CoreVarPattern = { kind: "CoreVarPattern", name: "x", loc: testLoc };
        const fVar: CoreVar = { kind: "CoreVar", name: "f", loc: testLoc };
        const xVar: CoreVar = { kind: "CoreVar", name: "x", loc: testLoc };
        const recursiveCall: CoreApp = { kind: "CoreApp", func: fVar, args: [xVar], loc: testLoc };
        const recFunc: CoreLambda = { kind: "CoreLambda", param, body: recursiveCall, loc: testLoc };

        const fVar2: CoreVar = { kind: "CoreVar", name: "f", loc: testLoc };
        const intLit: CoreIntLit = { kind: "CoreIntLit", value: 42, loc: testLoc };
        const body: CoreApp = { kind: "CoreApp", func: fVar2, args: [intLit], loc: testLoc };

        const expr: CoreLet = {
            kind: "CoreLet",
            pattern,
            value: recFunc,
            body,
            mutable: false,
            recursive: true,
            loc: testLoc,
        };

        const env = createTestEnv();
        const ctx = createContext(env);

        const result = inferExpr(ctx, expr);

        // Should successfully type check (infinite loop but well-typed)
        // The result is a type variable because f has type 'a -> 'b where 'b is unconstrained
        expect(result.type.type).toBe("Var");
    });
});

describe("Type Inference - RefAssign and Deref", () => {
    beforeEach(() => {
        resetTypeVarCounter();
    });

    it("should infer type for dereference operator", () => {
        // Given a variable of type Ref<Int>, !x should have type Int
        // We'll simulate this by creating an environment with a Ref<Int> variable
        const env = createTestEnv();

        // Add a binding: x : Ref<Int>
        const refIntType: Type = {
            type: "App",
            constructor: constType("Ref"),
            args: [primitiveTypes.Int],
        };
        env.values.set("x", {
            kind: "Value",
            scheme: { vars: [], type: refIntType },
            loc: testLoc,
        });

        const ctx = createContext(env);

        // !x
        const xVar: CoreVar = { kind: "CoreVar", name: "x", loc: testLoc };
        const expr: CoreUnaryOp = { kind: "CoreUnaryOp", op: "Deref", expr: xVar, loc: testLoc };

        const result = inferExpr(ctx, expr);

        expect(result.type).toEqual(primitiveTypes.Int);
    });

    it("should infer polymorphic type for dereference", () => {
        // Given x : Ref<'a>, !x should have type 'a
        const env = createTestEnv();

        const tVar = freshTypeVar(0);
        const refTType: Type = {
            type: "App",
            constructor: constType("Ref"),
            args: [tVar],
        };

        // x : ∀'a. Ref<'a> (generalized)
        const tVarId = isTypeVar(tVar) ? tVar.id : 0;
        env.values.set("x", {
            kind: "Value",
            scheme: { vars: [tVarId], type: refTType },
            loc: testLoc,
        });

        const ctx = createContext(env);

        // !x
        const xVar: CoreVar = { kind: "CoreVar", name: "x", loc: testLoc };
        const expr: CoreUnaryOp = { kind: "CoreUnaryOp", op: "Deref", expr: xVar, loc: testLoc };

        const result = inferExpr(ctx, expr);

        // Result should be a fresh type variable (instantiated from 'a)
        expect(result.type.type).toBe("Var");
    });

    it("should infer type for reference assignment", () => {
        // Given x : Ref<Int>, x := 42 should have type Unit
        const env = createTestEnv();

        const refIntType: Type = {
            type: "App",
            constructor: constType("Ref"),
            args: [primitiveTypes.Int],
        };
        env.values.set("x", {
            kind: "Value",
            scheme: { vars: [], type: refIntType },
            loc: testLoc,
        });

        const ctx = createContext(env);

        // x := 42
        const xVar: CoreVar = { kind: "CoreVar", name: "x", loc: testLoc };
        const intLit: CoreIntLit = { kind: "CoreIntLit", value: 42, loc: testLoc };
        const expr: CoreBinOp = { kind: "CoreBinOp", op: "RefAssign", left: xVar, right: intLit, loc: testLoc };

        const result = inferExpr(ctx, expr);

        expect(result.type).toEqual(primitiveTypes.Unit);
    });

    it("should reject mismatched types in reference assignment", () => {
        // Given x : Ref<Int>, x := "hello" should fail
        const env = createTestEnv();

        const refIntType: Type = {
            type: "App",
            constructor: constType("Ref"),
            args: [primitiveTypes.Int],
        };
        env.values.set("x", {
            kind: "Value",
            scheme: { vars: [], type: refIntType },
            loc: testLoc,
        });

        const ctx = createContext(env);

        // x := "hello"
        const xVar: CoreVar = { kind: "CoreVar", name: "x", loc: testLoc };
        const strLit: CoreStringLit = { kind: "CoreStringLit", value: "hello", loc: testLoc };
        const expr: CoreBinOp = { kind: "CoreBinOp", op: "RefAssign", left: xVar, right: strLit, loc: testLoc };

        expect(() => inferExpr(ctx, expr)).toThrow(VibefunDiagnostic);
    });

    it("should reject dereference of non-reference types", () => {
        // Given x : Int, !x should fail
        const env = createTestEnv();

        env.values.set("x", {
            kind: "Value",
            scheme: { vars: [], type: primitiveTypes.Int },
            loc: testLoc,
        });

        const ctx = createContext(env);

        // !x
        const xVar: CoreVar = { kind: "CoreVar", name: "x", loc: testLoc };
        const expr: CoreUnaryOp = { kind: "CoreUnaryOp", op: "Deref", expr: xVar, loc: testLoc };

        expect(() => inferExpr(ctx, expr)).toThrow(VibefunDiagnostic);
    });
});

describe("Type Inference - Value Restriction", () => {
    beforeEach(() => {
        resetTypeVarCounter();
    });

    it("should generalize syntactic values", () => {
        // let id = x => x in id should be polymorphic
        const param: CoreVarPattern = { kind: "CoreVarPattern", name: "x", loc: testLoc };
        const xVar: CoreVar = { kind: "CoreVar", name: "x", loc: testLoc };
        const idFunc: CoreLambda = { kind: "CoreLambda", param, body: xVar, loc: testLoc };

        const pattern: CoreVarPattern = { kind: "CoreVarPattern", name: "id", loc: testLoc };
        const bodyVar: CoreVar = { kind: "CoreVar", name: "id", loc: testLoc };

        const expr: CoreLet = {
            kind: "CoreLet",
            pattern,
            value: idFunc,
            body: bodyVar,
            mutable: false,
            recursive: false,
            loc: testLoc,
        };

        const env = createTestEnv();
        const ctx = createContext(env);

        const result = inferExpr(ctx, expr);

        // id should have a polymorphic type
        expect(result.type.type).toBe("Fun");
    });

    it("should not generalize non-values (application)", () => {
        // let x = id(42) in ... should not be generalized
        // This is a simplification - we're testing that applications are not syntactic values

        // First bind id : ∀'a. 'a -> 'a
        const env = createTestEnv();

        const tVar = freshTypeVar(0);
        const tVarId = isTypeVar(tVar) ? tVar.id : 0;
        const idType: Type = {
            type: "Fun",
            params: [tVar],
            return: tVar,
        };
        env.values.set("id", {
            kind: "Value",
            scheme: { vars: [tVarId], type: idType },
            loc: testLoc,
        });

        const ctx = createContext(env);

        // let x = id(42) in x
        const pattern: CoreVarPattern = { kind: "CoreVarPattern", name: "x", loc: testLoc };
        const idVar: CoreVar = { kind: "CoreVar", name: "id", loc: testLoc };
        const intLit: CoreIntLit = { kind: "CoreIntLit", value: 42, loc: testLoc };
        const value: CoreApp = { kind: "CoreApp", func: idVar, args: [intLit], loc: testLoc };
        const xVar: CoreVar = { kind: "CoreVar", name: "x", loc: testLoc };

        const expr: CoreLet = {
            kind: "CoreLet",
            pattern,
            value,
            body: xVar,
            mutable: false,
            recursive: false,
            loc: testLoc,
        };

        const result = inferExpr(ctx, expr);

        // x should have monomorphic type Int (not generalized)
        expect(result.type).toEqual(primitiveTypes.Int);
    });

    it("should handle ref creation in value restriction", () => {
        // This tests that ref(x) would not be generalized (if ref were a function)
        // For now, we just verify the built-in ref function exists
        const env = createTestEnv();

        // Verify ref is in the environment
        const refBinding = env.values.get("ref");
        expect(refBinding).toBeDefined();
        expect(refBinding?.kind).toBe("Value");

        // ref should have type: ∀'a. 'a -> Ref<'a>
        const refScheme = refBinding?.kind === "Value" ? refBinding.scheme : null;
        expect(refScheme).toBeDefined();
        expect(refScheme?.vars.length).toBeGreaterThan(0); // Should be polymorphic
    });
});

describe("Type Inference - Unsafe Blocks", () => {
    beforeEach(() => {
        resetTypeVarCounter();
    });

    it("should infer type for unsafe block", () => {
        // unsafe { 42 }
        const intLit: CoreIntLit = { kind: "CoreIntLit", value: 42, loc: testLoc };
        const expr: CoreUnsafe = {
            kind: "CoreUnsafe",
            expr: intLit,
            loc: testLoc,
        };

        const env = createTestEnv();
        const ctx = createContext(env);

        const result = inferExpr(ctx, expr);

        expect(result.type).toEqual(primitiveTypes.Int);
    });

    it("should type check expression inside unsafe block", () => {
        // unsafe { x + y } where x: Int
        const env = createTestEnv();
        env.values.set("x", {
            kind: "Value",
            scheme: { vars: [], type: primitiveTypes.Int },
            loc: testLoc,
        });
        env.values.set("y", {
            kind: "Value",
            scheme: { vars: [], type: primitiveTypes.Int },
            loc: testLoc,
        });

        const ctx = createContext(env);

        const xVar: CoreVar = { kind: "CoreVar", name: "x", loc: testLoc };
        const yVar: CoreVar = { kind: "CoreVar", name: "y", loc: testLoc };
        const add: CoreBinOp = {
            kind: "CoreBinOp",
            op: "Add",
            left: xVar,
            right: yVar,
            loc: testLoc,
        };
        const expr: CoreUnsafe = {
            kind: "CoreUnsafe",
            expr: add,
            loc: testLoc,
        };

        const result = inferExpr(ctx, expr);

        expect(result.type).toEqual(primitiveTypes.Int);
    });
});
