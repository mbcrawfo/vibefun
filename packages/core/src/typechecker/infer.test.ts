/**
 * Tests for type inference engine
 */

import type {
    CoreApp,
    CoreBinOp,
    CoreBoolLit,
    CoreFloatLit,
    CoreIntLit,
    CoreLambda,
    CoreLet,
    CoreStringLit,
    CoreTypeAnnotation,
    CoreTypeConst,
    CoreUnaryOp,
    CoreUnitLit,
    CoreVar,
    CoreVarPattern,
} from "../types/core-ast.js";
import type { Type, TypeEnv } from "../types/environment.js";

import { beforeEach, describe, expect, it } from "vitest";

import { TypeError } from "../utils/error.js";
import { getBuiltinEnv } from "./builtins.js";
import { createContext, inferExpr } from "./infer.js";
import { constType, freshTypeVar, isTypeVar, primitiveTypes, resetTypeVarCounter, typeToString } from "./types.js";

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

describe("Type Inference - Binary Operators", () => {
    beforeEach(() => {
        resetTypeVarCounter();
    });

    it("should infer type for addition", () => {
        const left: CoreIntLit = { kind: "CoreIntLit", value: 1, loc: testLoc };
        const right: CoreIntLit = { kind: "CoreIntLit", value: 2, loc: testLoc };
        const expr: CoreBinOp = { kind: "CoreBinOp", op: "Add", left, right, loc: testLoc };

        const env = createTestEnv();
        const ctx = createContext(env);

        const result = inferExpr(ctx, expr);

        expect(result.type).toEqual(primitiveTypes.Int);
    });

    it("should infer type for subtraction", () => {
        const left: CoreIntLit = { kind: "CoreIntLit", value: 5, loc: testLoc };
        const right: CoreIntLit = { kind: "CoreIntLit", value: 3, loc: testLoc };
        const expr: CoreBinOp = { kind: "CoreBinOp", op: "Subtract", left, right, loc: testLoc };

        const env = createTestEnv();
        const ctx = createContext(env);

        const result = inferExpr(ctx, expr);

        expect(result.type).toEqual(primitiveTypes.Int);
    });

    it("should infer type for multiplication", () => {
        const left: CoreIntLit = { kind: "CoreIntLit", value: 3, loc: testLoc };
        const right: CoreIntLit = { kind: "CoreIntLit", value: 4, loc: testLoc };
        const expr: CoreBinOp = { kind: "CoreBinOp", op: "Multiply", left, right, loc: testLoc };

        const env = createTestEnv();
        const ctx = createContext(env);

        const result = inferExpr(ctx, expr);

        expect(result.type).toEqual(primitiveTypes.Int);
    });

    it("should infer type for division", () => {
        const left: CoreIntLit = { kind: "CoreIntLit", value: 10, loc: testLoc };
        const right: CoreIntLit = { kind: "CoreIntLit", value: 2, loc: testLoc };
        const expr: CoreBinOp = { kind: "CoreBinOp", op: "Divide", left, right, loc: testLoc };

        const env = createTestEnv();
        const ctx = createContext(env);

        const result = inferExpr(ctx, expr);

        expect(result.type).toEqual(primitiveTypes.Int);
    });

    it("should infer type for less than comparison", () => {
        const left: CoreIntLit = { kind: "CoreIntLit", value: 1, loc: testLoc };
        const right: CoreIntLit = { kind: "CoreIntLit", value: 2, loc: testLoc };
        const expr: CoreBinOp = { kind: "CoreBinOp", op: "LessThan", left, right, loc: testLoc };

        const env = createTestEnv();
        const ctx = createContext(env);

        const result = inferExpr(ctx, expr);

        expect(result.type).toEqual(primitiveTypes.Bool);
    });

    it("should infer type for equality comparison", () => {
        const left: CoreIntLit = { kind: "CoreIntLit", value: 1, loc: testLoc };
        const right: CoreIntLit = { kind: "CoreIntLit", value: 1, loc: testLoc };
        const expr: CoreBinOp = { kind: "CoreBinOp", op: "Equal", left, right, loc: testLoc };

        const env = createTestEnv();
        const ctx = createContext(env);

        const result = inferExpr(ctx, expr);

        expect(result.type).toEqual(primitiveTypes.Bool);
    });

    it("should infer type for logical and", () => {
        const left: CoreBoolLit = { kind: "CoreBoolLit", value: true, loc: testLoc };
        const right: CoreBoolLit = { kind: "CoreBoolLit", value: false, loc: testLoc };
        const expr: CoreBinOp = { kind: "CoreBinOp", op: "LogicalAnd", left, right, loc: testLoc };

        const env = createTestEnv();
        const ctx = createContext(env);

        const result = inferExpr(ctx, expr);

        expect(result.type).toEqual(primitiveTypes.Bool);
    });

    it("should infer type for string concatenation", () => {
        const left: CoreStringLit = { kind: "CoreStringLit", value: "hello", loc: testLoc };
        const right: CoreStringLit = { kind: "CoreStringLit", value: " world", loc: testLoc };
        const expr: CoreBinOp = { kind: "CoreBinOp", op: "Concat", left, right, loc: testLoc };

        const env = createTestEnv();
        const ctx = createContext(env);

        const result = inferExpr(ctx, expr);

        expect(result.type).toEqual(primitiveTypes.String);
    });

    it("should reject type mismatch in arithmetic", () => {
        const left: CoreIntLit = { kind: "CoreIntLit", value: 1, loc: testLoc };
        const right: CoreStringLit = { kind: "CoreStringLit", value: "2", loc: testLoc };
        const expr: CoreBinOp = { kind: "CoreBinOp", op: "Add", left, right, loc: testLoc };

        const env = createTestEnv();
        const ctx = createContext(env);

        expect(() => inferExpr(ctx, expr)).toThrow(TypeError);
    });
});

describe("Type Inference - Unary Operators", () => {
    beforeEach(() => {
        resetTypeVarCounter();
    });

    it("should infer type for negation", () => {
        const inner: CoreIntLit = { kind: "CoreIntLit", value: 42, loc: testLoc };
        const expr: CoreUnaryOp = { kind: "CoreUnaryOp", op: "Negate", expr: inner, loc: testLoc };

        const env = createTestEnv();
        const ctx = createContext(env);

        const result = inferExpr(ctx, expr);

        expect(result.type).toEqual(primitiveTypes.Int);
    });

    it("should infer type for logical not", () => {
        const inner: CoreBoolLit = { kind: "CoreBoolLit", value: true, loc: testLoc };
        const expr: CoreUnaryOp = { kind: "CoreUnaryOp", op: "LogicalNot", expr: inner, loc: testLoc };

        const env = createTestEnv();
        const ctx = createContext(env);

        const result = inferExpr(ctx, expr);

        expect(result.type).toEqual(primitiveTypes.Bool);
    });

    it("should reject type mismatch in negation", () => {
        const inner: CoreStringLit = { kind: "CoreStringLit", value: "hello", loc: testLoc };
        const expr: CoreUnaryOp = { kind: "CoreUnaryOp", op: "Negate", expr: inner, loc: testLoc };

        const env = createTestEnv();
        const ctx = createContext(env);

        expect(() => inferExpr(ctx, expr)).toThrow(TypeError);
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

        expect(() => inferExpr(ctx, expr)).toThrow(TypeError);
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

        expect(() => inferExpr(ctx, expr)).toThrow(TypeError);
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
