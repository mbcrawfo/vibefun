/**
 * Tests for type inference - binary and unary operators
 */

import type {
    CoreBinOp,
    CoreBoolLit,
    CoreFloatLit,
    CoreIntLit,
    CoreStringLit,
    CoreUnaryOp,
} from "../types/core-ast.js";
import type { TypeEnv } from "../types/environment.js";

import * as fc from "fast-check";
import { beforeEach, describe, expect, it } from "vitest";

import { VibefunDiagnostic } from "../diagnostics/index.js";
import { getBuiltinEnv } from "./builtins.js";
import { createContext, inferExpr } from "./infer/index.js";
import { freshTypeVar, primitiveTypes, resetTypeVarCounter, typeEquals } from "./types.js";

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

        expect(() => inferExpr(ctx, expr)).toThrow(VibefunDiagnostic);
    });

    it("should infer type for IntDivide", () => {
        const left: CoreIntLit = { kind: "CoreIntLit", value: 10, loc: testLoc };
        const right: CoreIntLit = { kind: "CoreIntLit", value: 3, loc: testLoc };
        const expr: CoreBinOp = { kind: "CoreBinOp", op: "IntDivide", left, right, loc: testLoc };

        const env = createTestEnv();
        const ctx = createContext(env);

        const result = inferExpr(ctx, expr);

        expect(result.type).toEqual(primitiveTypes.Int);
    });

    it("should infer type for FloatDivide", () => {
        const left: CoreFloatLit = { kind: "CoreFloatLit", value: 10.0, loc: testLoc };
        const right: CoreFloatLit = { kind: "CoreFloatLit", value: 3.0, loc: testLoc };
        const expr: CoreBinOp = { kind: "CoreBinOp", op: "FloatDivide", left, right, loc: testLoc };

        const env = createTestEnv();
        const ctx = createContext(env);

        const result = inferExpr(ctx, expr);

        expect(result.type).toEqual(primitiveTypes.Float);
    });

    it("should lower Divide to IntDivide for Int operands", () => {
        const left: CoreIntLit = { kind: "CoreIntLit", value: 10, loc: testLoc };
        const right: CoreIntLit = { kind: "CoreIntLit", value: 2, loc: testLoc };
        const expr: CoreBinOp = { kind: "CoreBinOp", op: "Divide", left, right, loc: testLoc };

        const env = createTestEnv();
        const ctx = createContext(env);

        // After inference, the operator should be mutated to IntDivide
        inferExpr(ctx, expr);

        expect(expr.op).toBe("IntDivide");
    });

    it("should infer Float result type for Divide with Float operands", () => {
        const left: CoreFloatLit = { kind: "CoreFloatLit", value: 5.0, loc: testLoc };
        const right: CoreFloatLit = { kind: "CoreFloatLit", value: 2.0, loc: testLoc };
        const expr: CoreBinOp = { kind: "CoreBinOp", op: "Divide", left, right, loc: testLoc };

        const env = createTestEnv();
        const ctx = createContext(env);

        const result = inferExpr(ctx, expr);

        expect(result.type).toEqual(primitiveTypes.Float);
    });

    it("should lower Divide to FloatDivide for Float operands", () => {
        const left: CoreFloatLit = { kind: "CoreFloatLit", value: 5.0, loc: testLoc };
        const right: CoreFloatLit = { kind: "CoreFloatLit", value: 2.0, loc: testLoc };
        const expr: CoreBinOp = { kind: "CoreBinOp", op: "Divide", left, right, loc: testLoc };

        const env = createTestEnv();
        const ctx = createContext(env);

        // After inference, the operator should be mutated to FloatDivide
        inferExpr(ctx, expr);

        expect(expr.op).toBe("FloatDivide");
    });

    it("should reject Divide with mixed Int and Float operands", () => {
        const left: CoreIntLit = { kind: "CoreIntLit", value: 5, loc: testLoc };
        const right: CoreFloatLit = { kind: "CoreFloatLit", value: 2.0, loc: testLoc };
        const expr: CoreBinOp = { kind: "CoreBinOp", op: "Divide", left, right, loc: testLoc };

        const env = createTestEnv();
        const ctx = createContext(env);

        // Should throw because Int and Float cannot unify
        expect(() => inferExpr(ctx, expr)).toThrow(VibefunDiagnostic);
    });

    it("should reject Divide with non-numeric operands", () => {
        const left: CoreStringLit = { kind: "CoreStringLit", value: "hello", loc: testLoc };
        const right: CoreStringLit = { kind: "CoreStringLit", value: "world", loc: testLoc };
        const expr: CoreBinOp = { kind: "CoreBinOp", op: "Divide", left, right, loc: testLoc };

        const env = createTestEnv();
        const ctx = createContext(env);

        // Should throw because String is not a numeric type
        expect(() => inferExpr(ctx, expr)).toThrow(VibefunDiagnostic);
    });

    describe("polymorphic numeric operators — free-type-variable fallback", () => {
        it("defaults free operands to Int for arithmetic", () => {
            // `(x, y) => x + y` — both operands are type variables.
            const env = createTestEnv();
            const tvLeft = freshTypeVar(0);
            const tvRight = freshTypeVar(0);
            env.values.set("x", {
                kind: "Value" as const,
                scheme: { vars: [], type: tvLeft },
                loc: testLoc,
            });
            env.values.set("y", {
                kind: "Value" as const,
                scheme: { vars: [], type: tvRight },
                loc: testLoc,
            });
            const expr: CoreBinOp = {
                kind: "CoreBinOp",
                op: "Add",
                left: { kind: "CoreVar", name: "x", loc: testLoc },
                right: { kind: "CoreVar", name: "y", loc: testLoc },
                loc: testLoc,
            };

            const ctx = createContext(env);
            const result = inferExpr(ctx, expr);

            expect(result.type).toEqual(primitiveTypes.Int);
        });

        it("defaults free operands to Int for comparison and returns Bool", () => {
            const env = createTestEnv();
            const tvLeft = freshTypeVar(0);
            const tvRight = freshTypeVar(0);
            env.values.set("a", {
                kind: "Value" as const,
                scheme: { vars: [], type: tvLeft },
                loc: testLoc,
            });
            env.values.set("b", {
                kind: "Value" as const,
                scheme: { vars: [], type: tvRight },
                loc: testLoc,
            });
            const expr: CoreBinOp = {
                kind: "CoreBinOp",
                op: "LessThan",
                left: { kind: "CoreVar", name: "a", loc: testLoc },
                right: { kind: "CoreVar", name: "b", loc: testLoc },
                loc: testLoc,
            };

            const ctx = createContext(env);
            const result = inferExpr(ctx, expr);

            expect(result.type).toEqual(primitiveTypes.Bool);
        });
    });

    describe("polymorphic numeric operators (Int or Float)", () => {
        const arithmeticOps = ["Add", "Subtract", "Multiply", "Modulo"] as const;
        const comparisonOps = ["LessThan", "LessEqual", "GreaterThan", "GreaterEqual"] as const;

        for (const op of arithmeticOps) {
            it(`should infer Float for ${op} with Float operands`, () => {
                const left: CoreFloatLit = { kind: "CoreFloatLit", value: 1.5, loc: testLoc };
                const right: CoreFloatLit = { kind: "CoreFloatLit", value: 2.5, loc: testLoc };
                const expr: CoreBinOp = { kind: "CoreBinOp", op, left, right, loc: testLoc };

                const env = createTestEnv();
                const ctx = createContext(env);

                const result = inferExpr(ctx, expr);

                expect(result.type).toEqual(primitiveTypes.Float);
                // Operator is not lowered — Divide is the only op that splits into Int/Float variants
                expect(expr.op).toBe(op);
            });

            it(`should infer Int for ${op} with Int operands`, () => {
                const left: CoreIntLit = { kind: "CoreIntLit", value: 3, loc: testLoc };
                const right: CoreIntLit = { kind: "CoreIntLit", value: 4, loc: testLoc };
                const expr: CoreBinOp = { kind: "CoreBinOp", op, left, right, loc: testLoc };

                const env = createTestEnv();
                const ctx = createContext(env);

                const result = inferExpr(ctx, expr);

                expect(result.type).toEqual(primitiveTypes.Int);
                expect(expr.op).toBe(op);
            });

            it(`should reject ${op} with mixed Int and Float operands`, () => {
                const left: CoreIntLit = { kind: "CoreIntLit", value: 3, loc: testLoc };
                const right: CoreFloatLit = { kind: "CoreFloatLit", value: 2.5, loc: testLoc };
                const expr: CoreBinOp = { kind: "CoreBinOp", op, left, right, loc: testLoc };

                const env = createTestEnv();
                const ctx = createContext(env);

                expect(() => inferExpr(ctx, expr)).toThrow(VibefunDiagnostic);
            });

            it(`should reject ${op} with non-numeric operands`, () => {
                const left: CoreStringLit = { kind: "CoreStringLit", value: "a", loc: testLoc };
                const right: CoreStringLit = { kind: "CoreStringLit", value: "b", loc: testLoc };
                const expr: CoreBinOp = { kind: "CoreBinOp", op, left, right, loc: testLoc };

                const env = createTestEnv();
                const ctx = createContext(env);

                expect(() => inferExpr(ctx, expr)).toThrow(VibefunDiagnostic);
            });
        }

        for (const op of comparisonOps) {
            it(`should infer Bool for ${op} with Float operands`, () => {
                const left: CoreFloatLit = { kind: "CoreFloatLit", value: 1.5, loc: testLoc };
                const right: CoreFloatLit = { kind: "CoreFloatLit", value: 2.5, loc: testLoc };
                const expr: CoreBinOp = { kind: "CoreBinOp", op, left, right, loc: testLoc };

                const env = createTestEnv();
                const ctx = createContext(env);

                const result = inferExpr(ctx, expr);

                expect(result.type).toEqual(primitiveTypes.Bool);
                expect(expr.op).toBe(op);
            });

            it(`should infer Bool for ${op} with Int operands`, () => {
                const left: CoreIntLit = { kind: "CoreIntLit", value: 3, loc: testLoc };
                const right: CoreIntLit = { kind: "CoreIntLit", value: 4, loc: testLoc };
                const expr: CoreBinOp = { kind: "CoreBinOp", op, left, right, loc: testLoc };

                const env = createTestEnv();
                const ctx = createContext(env);

                const result = inferExpr(ctx, expr);

                expect(result.type).toEqual(primitiveTypes.Bool);
            });

            it(`should reject ${op} with mixed Int and Float operands`, () => {
                const left: CoreIntLit = { kind: "CoreIntLit", value: 3, loc: testLoc };
                const right: CoreFloatLit = { kind: "CoreFloatLit", value: 2.5, loc: testLoc };
                const expr: CoreBinOp = { kind: "CoreBinOp", op, left, right, loc: testLoc };

                const env = createTestEnv();
                const ctx = createContext(env);

                expect(() => inferExpr(ctx, expr)).toThrow(VibefunDiagnostic);
            });

            it(`should reject ${op} with non-numeric operands`, () => {
                const left: CoreBoolLit = { kind: "CoreBoolLit", value: true, loc: testLoc };
                const right: CoreBoolLit = { kind: "CoreBoolLit", value: false, loc: testLoc };
                const expr: CoreBinOp = { kind: "CoreBinOp", op, left, right, loc: testLoc };

                const env = createTestEnv();
                const ctx = createContext(env);

                expect(() => inferExpr(ctx, expr)).toThrow(VibefunDiagnostic);
            });
        }
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

        expect(() => inferExpr(ctx, expr)).toThrow(VibefunDiagnostic);
    });

    it("should infer Float for negation of a Float operand", () => {
        const inner: CoreFloatLit = { kind: "CoreFloatLit", value: 3.14, loc: testLoc };
        const expr: CoreUnaryOp = { kind: "CoreUnaryOp", op: "Negate", expr: inner, loc: testLoc };

        const env = createTestEnv();
        const ctx = createContext(env);

        const result = inferExpr(ctx, expr);

        expect(result.type).toEqual(primitiveTypes.Float);
    });

    it("should reject negation of a Bool operand", () => {
        const inner: CoreBoolLit = { kind: "CoreBoolLit", value: true, loc: testLoc };
        const expr: CoreUnaryOp = { kind: "CoreUnaryOp", op: "Negate", expr: inner, loc: testLoc };

        const env = createTestEnv();
        const ctx = createContext(env);

        expect(() => inferExpr(ctx, expr)).toThrow(VibefunDiagnostic);
    });

    it("defaults a free type variable to Int when negated", () => {
        // `let f = (x) => -x` — x's type is a free variable inside the lambda
        // body. Polymorphic Negate's fallback should unify it with Int.
        const env = createTestEnv();
        const tv = freshTypeVar(0);
        env.values.set("x", {
            kind: "Value" as const,
            scheme: { vars: [], type: tv },
            loc: testLoc,
        });
        const expr: CoreUnaryOp = {
            kind: "CoreUnaryOp",
            op: "Negate",
            expr: { kind: "CoreVar", name: "x", loc: testLoc },
            loc: testLoc,
        };

        const ctx = createContext(env);
        const result = inferExpr(ctx, expr);

        expect(result.type).toEqual(primitiveTypes.Int);
    });

    describe("prefix ! disambiguation (LogicalNot vs Deref)", () => {
        it("keeps LogicalNot when the operand is Bool", () => {
            const inner: CoreBoolLit = { kind: "CoreBoolLit", value: true, loc: testLoc };
            const expr: CoreUnaryOp = { kind: "CoreUnaryOp", op: "LogicalNot", expr: inner, loc: testLoc };

            const env = createTestEnv();
            const ctx = createContext(env);

            const result = inferExpr(ctx, expr);

            expect(result.type).toEqual(primitiveTypes.Bool);
            expect(expr.op).toBe("LogicalNot");
        });

        it("rewrites LogicalNot to Deref when the operand resolves to Ref<T>", () => {
            // !ref(42) — the inner expression is a ref() application producing Ref<Int>
            const inner = {
                kind: "CoreApp" as const,
                func: { kind: "CoreVar" as const, name: "ref", loc: testLoc },
                args: [{ kind: "CoreIntLit" as const, value: 42, loc: testLoc }],
                loc: testLoc,
            };
            const expr: CoreUnaryOp = {
                kind: "CoreUnaryOp",
                op: "LogicalNot",
                expr: inner,
                loc: testLoc,
            };

            const env = createTestEnv();
            const ctx = createContext(env);

            const result = inferExpr(ctx, expr);

            expect(result.type).toEqual(primitiveTypes.Int);
            expect(expr.op).toBe("Deref");
        });

        it("keeps LogicalNot when the operand is a free type variable (default)", () => {
            // `let f = (x) => !x` — without further constraints, x remains a type
            // variable. The spec default is LogicalNot; operand unifies with Bool.
            const inner = { kind: "CoreVar" as const, name: "x", loc: testLoc };
            const expr: CoreUnaryOp = { kind: "CoreUnaryOp", op: "LogicalNot", expr: inner, loc: testLoc };

            const env = createTestEnv();
            // Register `x` as a free type variable by hand for this isolated test
            const tv = freshTypeVar(0);
            env.values.set("x", {
                kind: "Value" as const,
                scheme: { vars: [], type: tv },
                loc: testLoc,
            });

            const ctx = createContext(env);

            const result = inferExpr(ctx, expr);

            expect(result.type).toEqual(primitiveTypes.Bool);
            expect(expr.op).toBe("LogicalNot");
        });
    });
});

describe("Operator Inference Properties", () => {
    const arithmeticOps = ["Add", "Subtract", "Multiply", "IntDivide", "Modulo"] as const;
    const comparisonOps = ["LessThan", "LessEqual", "GreaterThan", "GreaterEqual"] as const;
    const equalityOps = ["Equal", "NotEqual"] as const;
    const logicalOps = ["LogicalAnd", "LogicalOr"] as const;

    function intLit(value: number) {
        return { kind: "CoreIntLit" as const, value, loc: testLoc };
    }
    function boolLit(value: boolean) {
        return { kind: "CoreBoolLit" as const, value, loc: testLoc };
    }

    it("property: every Int+Int arithmetic op infers to Int", () => {
        fc.assert(
            fc.property(
                fc.constantFrom(...arithmeticOps),
                fc.integer({ min: -1000, max: 1000 }),
                fc.integer({ min: -1000, max: 1000 }),
                (op, a, b) => {
                    const expr: CoreBinOp = {
                        kind: "CoreBinOp",
                        op,
                        left: intLit(a),
                        right: intLit(b),
                        loc: testLoc,
                    };
                    const result = inferExpr(createContext(createTestEnv()), expr);
                    expect(typeEquals(result.type, primitiveTypes.Int)).toBe(true);
                },
            ),
        );
    });

    it("property: every Int<Int comparison op infers to Bool", () => {
        fc.assert(
            fc.property(
                fc.constantFrom(...comparisonOps),
                fc.integer({ min: -1000, max: 1000 }),
                fc.integer({ min: -1000, max: 1000 }),
                (op, a, b) => {
                    const expr: CoreBinOp = {
                        kind: "CoreBinOp",
                        op,
                        left: intLit(a),
                        right: intLit(b),
                        loc: testLoc,
                    };
                    const result = inferExpr(createContext(createTestEnv()), expr);
                    expect(typeEquals(result.type, primitiveTypes.Bool)).toBe(true);
                },
            ),
        );
    });

    it("property: equality / disequality on Int literals always infers to Bool", () => {
        fc.assert(
            fc.property(
                fc.constantFrom(...equalityOps),
                fc.integer({ min: -1000, max: 1000 }),
                fc.integer({ min: -1000, max: 1000 }),
                (op, a, b) => {
                    const expr: CoreBinOp = {
                        kind: "CoreBinOp",
                        op,
                        left: intLit(a),
                        right: intLit(b),
                        loc: testLoc,
                    };
                    const result = inferExpr(createContext(createTestEnv()), expr);
                    expect(typeEquals(result.type, primitiveTypes.Bool)).toBe(true);
                },
            ),
        );
    });

    it("property: every Bool && / || Bool infers to Bool", () => {
        fc.assert(
            fc.property(fc.constantFrom(...logicalOps), fc.boolean(), fc.boolean(), (op, a, b) => {
                const expr: CoreBinOp = {
                    kind: "CoreBinOp",
                    op,
                    left: boolLit(a),
                    right: boolLit(b),
                    loc: testLoc,
                };
                const result = inferExpr(createContext(createTestEnv()), expr);
                expect(typeEquals(result.type, primitiveTypes.Bool)).toBe(true);
            }),
        );
    });

    it("property: arithmetic op inference is deterministic", () => {
        fc.assert(
            fc.property(
                fc.constantFrom(...arithmeticOps),
                fc.integer({ min: -1000, max: 1000 }),
                fc.integer({ min: -1000, max: 1000 }),
                (op, a, b) => {
                    const expr: CoreBinOp = {
                        kind: "CoreBinOp",
                        op,
                        left: intLit(a),
                        right: intLit(b),
                        loc: testLoc,
                    };
                    const r1 = inferExpr(createContext(createTestEnv()), expr);
                    const r2 = inferExpr(createContext(createTestEnv()), expr);
                    expect(typeEquals(r1.type, r2.type)).toBe(true);
                },
            ),
        );
    });

    it("property: unary Negate on an IntLit infers to Int; LogicalNot on a BoolLit infers to Bool", () => {
        fc.assert(
            fc.property(fc.integer({ min: -1000, max: 1000 }), (n) => {
                const negate: CoreUnaryOp = { kind: "CoreUnaryOp", op: "Negate", expr: intLit(n), loc: testLoc };
                const result = inferExpr(createContext(createTestEnv()), negate);
                expect(typeEquals(result.type, primitiveTypes.Int)).toBe(true);
            }),
        );
        fc.assert(
            fc.property(fc.boolean(), (b) => {
                const not: CoreUnaryOp = { kind: "CoreUnaryOp", op: "LogicalNot", expr: boolLit(b), loc: testLoc };
                const result = inferExpr(createContext(createTestEnv()), not);
                expect(typeEquals(result.type, primitiveTypes.Bool)).toBe(true);
            }),
        );
    });
});
