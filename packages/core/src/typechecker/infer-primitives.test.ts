/**
 * Tests for type inference - primitive types and basic expressions
 */

import type {
    CoreApp,
    CoreBinOp,
    CoreBoolLit,
    CoreFloatLit,
    CoreIntLit,
    CoreLambda,
    CoreStringLit,
    CoreTypeAnnotation,
    CoreTypeConst,
    CoreUnitLit,
    CoreVar,
    CoreVarPattern,
} from "../types/core-ast.js";
import type { TypeEnv } from "../types/environment.js";

import { beforeEach, describe, expect, it } from "vitest";

import { TypeError } from "../utils/error.js";
import { getBuiltinEnv } from "./builtins.js";
import { createContext, inferExpr } from "./infer.js";
import { primitiveTypes, resetTypeVarCounter, typeToString } from "./types.js";

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

describe("Type Inference - Literals", () => {
    beforeEach(() => {
        resetTypeVarCounter();
    });

    it("should infer Int type for integer literals", () => {
        const expr: CoreIntLit = { kind: "CoreIntLit", value: 42, loc: testLoc };
        const env = createTestEnv();
        const ctx = createContext(env);

        const result = inferExpr(ctx, expr);

        expect(result.type).toEqual(primitiveTypes.Int);
    });

    it("should infer Float type for float literals", () => {
        const expr: CoreFloatLit = { kind: "CoreFloatLit", value: 3.14, loc: testLoc };
        const env = createTestEnv();
        const ctx = createContext(env);

        const result = inferExpr(ctx, expr);

        expect(result.type).toEqual(primitiveTypes.Float);
    });

    it("should infer String type for string literals", () => {
        const expr: CoreStringLit = { kind: "CoreStringLit", value: "hello", loc: testLoc };
        const env = createTestEnv();
        const ctx = createContext(env);

        const result = inferExpr(ctx, expr);

        expect(result.type).toEqual(primitiveTypes.String);
    });

    it("should infer Bool type for boolean literals", () => {
        const expr: CoreBoolLit = { kind: "CoreBoolLit", value: true, loc: testLoc };
        const env = createTestEnv();
        const ctx = createContext(env);

        const result = inferExpr(ctx, expr);

        expect(result.type).toEqual(primitiveTypes.Bool);
    });

    it("should infer Unit type for unit literals", () => {
        const expr: CoreUnitLit = { kind: "CoreUnitLit", loc: testLoc };
        const env = createTestEnv();
        const ctx = createContext(env);

        const result = inferExpr(ctx, expr);

        expect(result.type).toEqual(primitiveTypes.Unit);
    });
});

describe("Type Inference - Variables", () => {
    beforeEach(() => {
        resetTypeVarCounter();
    });

    it("should lookup variable in environment", () => {
        const expr: CoreVar = { kind: "CoreVar", name: "panic", loc: testLoc };
        const env = createTestEnv();
        const ctx = createContext(env);

        const result = inferExpr(ctx, expr);

        // panic has type (String) -> Never
        expect(result.type.type).toBe("Fun");
        if (result.type.type === "Fun") {
            expect(result.type.params).toHaveLength(1);
            expect(result.type.params[0]).toEqual(primitiveTypes.String);
            expect(result.type.return).toEqual(primitiveTypes.Never);
        }
    });

    it("should instantiate polymorphic types", () => {
        const expr: CoreVar = { kind: "CoreVar", name: "Some", loc: testLoc };
        const env = createTestEnv();
        const ctx = createContext(env);

        const result = inferExpr(ctx, expr);

        // Some has type forall a. (a) -> Option<a>
        // After instantiation, should have fresh type variables
        expect(result.type.type).toBe("Fun");
        if (result.type.type === "Fun") {
            expect(result.type.params).toHaveLength(1);
            const paramType = result.type.params[0];
            expect(paramType?.type).toBe("Var");

            // Return type should be Option<T> where T is the param type
            expect(result.type.return.type).toBe("App");
        }
    });

    it("should throw error for undefined variable", () => {
        const expr: CoreVar = { kind: "CoreVar", name: "undefinedVar", loc: testLoc };
        const env = createTestEnv();
        const ctx = createContext(env);

        expect(() => inferExpr(ctx, expr)).toThrow(TypeError);
        expect(() => inferExpr(ctx, expr)).toThrow(/Undefined variable/);
    });
});

describe("Type Inference - Lambdas", () => {
    beforeEach(() => {
        resetTypeVarCounter();
    });

    it("should infer type for identity function", () => {
        // x => x
        const param: CoreVarPattern = { kind: "CoreVarPattern", name: "x", loc: testLoc };
        const body: CoreVar = { kind: "CoreVar", name: "x", loc: testLoc };
        const expr: CoreLambda = { kind: "CoreLambda", param, body, loc: testLoc };

        const env = createTestEnv();
        const ctx = createContext(env);

        const result = inferExpr(ctx, expr);

        // Should be ('t0) -> 't0
        expect(result.type.type).toBe("Fun");
        if (result.type.type === "Fun") {
            expect(result.type.params).toHaveLength(1);
            const paramType = result.type.params[0];
            expect(paramType?.type).toBe("Var");
            expect(result.type.return).toEqual(paramType);
        }
    });

    it("should infer type for constant function", () => {
        // x => 42
        const param: CoreVarPattern = { kind: "CoreVarPattern", name: "x", loc: testLoc };
        const body: CoreIntLit = { kind: "CoreIntLit", value: 42, loc: testLoc };
        const expr: CoreLambda = { kind: "CoreLambda", param, body, loc: testLoc };

        const env = createTestEnv();
        const ctx = createContext(env);

        const result = inferExpr(ctx, expr);

        // Should be ('t0) -> Int
        expect(result.type.type).toBe("Fun");
        if (result.type.type === "Fun") {
            expect(result.type.params).toHaveLength(1);
            expect(result.type.params[0]?.type).toBe("Var");
            expect(result.type.return).toEqual(primitiveTypes.Int);
        }
    });
});

describe("Type Inference - Applications", () => {
    beforeEach(() => {
        resetTypeVarCounter();
    });

    it("should infer type for simple application", () => {
        // panic("error")
        const func: CoreVar = { kind: "CoreVar", name: "panic", loc: testLoc };
        const arg: CoreStringLit = { kind: "CoreStringLit", value: "error", loc: testLoc };
        const expr: CoreApp = { kind: "CoreApp", func, args: [arg], loc: testLoc };

        const env = createTestEnv();
        const ctx = createContext(env);

        const result = inferExpr(ctx, expr);

        expect(result.type).toEqual(primitiveTypes.Never);
    });

    it("should infer type for polymorphic application", () => {
        // Some(42)
        const func: CoreVar = { kind: "CoreVar", name: "Some", loc: testLoc };
        const arg: CoreIntLit = { kind: "CoreIntLit", value: 42, loc: testLoc };
        const expr: CoreApp = { kind: "CoreApp", func, args: [arg], loc: testLoc };

        const env = createTestEnv();
        const ctx = createContext(env);

        const result = inferExpr(ctx, expr);

        // Should be Option<Int>
        expect(result.type.type).toBe("App");
        if (result.type.type === "App") {
            expect(result.type.constructor).toEqual({ type: "Const", name: "Option" });
            expect(result.type.args).toHaveLength(1);
            expect(result.type.args[0]).toEqual(primitiveTypes.Int);
        }
    });

    it("should infer type for curried application", () => {
        // (x => y => x)(42)(true)
        // Inner lambda: y => x
        const innerParam: CoreVarPattern = { kind: "CoreVarPattern", name: "y", loc: testLoc };
        const innerBody: CoreVar = { kind: "CoreVar", name: "x", loc: testLoc };
        const innerLambda: CoreLambda = { kind: "CoreLambda", param: innerParam, body: innerBody, loc: testLoc };

        // Outer lambda: x => (y => x)
        const outerParam: CoreVarPattern = { kind: "CoreVarPattern", name: "x", loc: testLoc };
        const outerLambda: CoreLambda = { kind: "CoreLambda", param: outerParam, body: innerLambda, loc: testLoc };

        // First application: (x => y => x)(42)
        const arg1: CoreIntLit = { kind: "CoreIntLit", value: 42, loc: testLoc };
        const app1: CoreApp = { kind: "CoreApp", func: outerLambda, args: [arg1], loc: testLoc };

        // Second application: ((x => y => x)(42))(true)
        const arg2: CoreBoolLit = { kind: "CoreBoolLit", value: true, loc: testLoc };
        const app2: CoreApp = { kind: "CoreApp", func: app1, args: [arg2], loc: testLoc };

        const env = createTestEnv();
        const ctx = createContext(env);

        const result = inferExpr(ctx, app2);

        // Result should be Int (the type of the first argument)
        expect(result.type).toEqual(primitiveTypes.Int);
    });

    it("should infer type for identity application", () => {
        // (x => x)(42)
        const param: CoreVarPattern = { kind: "CoreVarPattern", name: "x", loc: testLoc };
        const body: CoreVar = { kind: "CoreVar", name: "x", loc: testLoc };
        const lambda: CoreLambda = { kind: "CoreLambda", param, body, loc: testLoc };
        const arg: CoreIntLit = { kind: "CoreIntLit", value: 42, loc: testLoc };
        const expr: CoreApp = { kind: "CoreApp", func: lambda, args: [arg], loc: testLoc };

        const env = createTestEnv();
        const ctx = createContext(env);

        const result = inferExpr(ctx, expr);

        expect(result.type).toEqual(primitiveTypes.Int);
    });
});

describe("Type Inference - Type Annotations", () => {
    beforeEach(() => {
        resetTypeVarCounter();
    });

    it("should accept matching type annotation", () => {
        const inner: CoreIntLit = { kind: "CoreIntLit", value: 42, loc: testLoc };
        const typeExpr: CoreTypeConst = { kind: "CoreTypeConst", name: "Int", loc: testLoc };
        const expr: CoreTypeAnnotation = { kind: "CoreTypeAnnotation", expr: inner, typeExpr, loc: testLoc };

        const env = createTestEnv();
        const ctx = createContext(env);

        const result = inferExpr(ctx, expr);

        expect(result.type).toEqual(primitiveTypes.Int);
    });

    it("should reject mismatching type annotation", () => {
        const inner: CoreIntLit = { kind: "CoreIntLit", value: 42, loc: testLoc };
        const typeExpr: CoreTypeConst = { kind: "CoreTypeConst", name: "String", loc: testLoc };
        const expr: CoreTypeAnnotation = { kind: "CoreTypeAnnotation", expr: inner, typeExpr, loc: testLoc };

        const env = createTestEnv();
        const ctx = createContext(env);

        expect(() => inferExpr(ctx, expr)).toThrow(TypeError);
        expect(() => inferExpr(ctx, expr)).toThrow(/Type annotation mismatch/);
    });
});

describe("Type Inference - Complex Expressions", () => {
    beforeEach(() => {
        resetTypeVarCounter();
    });

    it("should infer type for nested arithmetic", () => {
        // (1 + 2) * 3
        const left: CoreIntLit = { kind: "CoreIntLit", value: 1, loc: testLoc };
        const right: CoreIntLit = { kind: "CoreIntLit", value: 2, loc: testLoc };
        const add: CoreBinOp = { kind: "CoreBinOp", op: "Add", left, right, loc: testLoc };
        const three: CoreIntLit = { kind: "CoreIntLit", value: 3, loc: testLoc };
        const expr: CoreBinOp = { kind: "CoreBinOp", op: "Multiply", left: add, right: three, loc: testLoc };

        const env = createTestEnv();
        const ctx = createContext(env);

        const result = inferExpr(ctx, expr);

        expect(result.type).toEqual(primitiveTypes.Int);
    });

    it("should infer type for function composition", () => {
        // (f => g => x => f(g(x)))
        // This is the composition operator
        const x: CoreVarPattern = { kind: "CoreVarPattern", name: "x", loc: testLoc };
        const gVar: CoreVar = { kind: "CoreVar", name: "g", loc: testLoc };
        const xVar: CoreVar = { kind: "CoreVar", name: "x", loc: testLoc };
        const gx: CoreApp = { kind: "CoreApp", func: gVar, args: [xVar], loc: testLoc };
        const fVar: CoreVar = { kind: "CoreVar", name: "f", loc: testLoc };
        const fgx: CoreApp = { kind: "CoreApp", func: fVar, args: [gx], loc: testLoc };

        const innerLambda: CoreLambda = { kind: "CoreLambda", param: x, body: fgx, loc: testLoc };
        const g: CoreVarPattern = { kind: "CoreVarPattern", name: "g", loc: testLoc };
        const midLambda: CoreLambda = { kind: "CoreLambda", param: g, body: innerLambda, loc: testLoc };
        const f: CoreVarPattern = { kind: "CoreVarPattern", name: "f", loc: testLoc };
        const compose: CoreLambda = { kind: "CoreLambda", param: f, body: midLambda, loc: testLoc };

        const env = createTestEnv();
        const ctx = createContext(env);

        const result = inferExpr(ctx, compose);

        // Should infer type: ('a -> 'b) -> ('c -> 'a) -> 'c -> 'b
        expect(result.type.type).toBe("Fun");
        expect(typeToString(result.type)).toContain("->");
    });
});
