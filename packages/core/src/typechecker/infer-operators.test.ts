/**
 * Tests for type inference - binary and unary operators
 */

import type { CoreBinOp, CoreBoolLit, CoreIntLit, CoreStringLit, CoreUnaryOp } from "../types/core-ast.js";
import type { TypeEnv } from "../types/environment.js";

import { beforeEach, describe, expect, it } from "vitest";

import { TypeError } from "../utils/error.js";
import { getBuiltinEnv } from "./builtins.js";
import { createContext, inferExpr } from "./infer/index.js";
import { primitiveTypes, resetTypeVarCounter } from "./types.js";

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
