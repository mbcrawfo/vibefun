/**
 * Tests for type inference - let-binding error cases and generalization edge cases.
 */

import type {
    CoreApp,
    CoreIntLit,
    CoreLambda,
    CoreLet,
    CoreStringLit,
    CoreVar,
    CoreVarPattern,
} from "../types/core-ast.js";

import { beforeEach, describe, expect, it } from "vitest";

import { VibefunDiagnostic } from "../diagnostics/index.js";
import { createContext, inferExpr } from "./infer/index.js";
import { createTestEnv, testLoc } from "./typechecker-test-helpers.js";
import { primitiveTypes, resetTypeVarCounter } from "./types.js";

describe("Type Inference - Let-Binding Error Cases", () => {
    beforeEach(() => {
        resetTypeVarCounter();
    });

    it("should accept mutable let-bindings and infer Ref<T>", () => {
        // `let mut x = ref(42) in x` — the typechecker accepts `mutable:
        // true` and infers the value as Ref<Int> via the ref builtin.
        const pattern: CoreVarPattern = { kind: "CoreVarPattern", name: "x", loc: testLoc };
        const intLit: CoreIntLit = { kind: "CoreIntLit", value: 42, loc: testLoc };
        const refVar: CoreVar = { kind: "CoreVar", name: "ref", loc: testLoc };
        const refCall: CoreApp = { kind: "CoreApp", func: refVar, args: [intLit], loc: testLoc };
        const body: CoreVar = { kind: "CoreVar", name: "x", loc: testLoc };
        const expr: CoreLet = {
            kind: "CoreLet",
            pattern,
            value: refCall,
            body,
            mutable: true,
            recursive: false,
            loc: testLoc,
        };

        const env = createTestEnv();
        const ctx = createContext(env);

        const result = inferExpr(ctx, expr);
        // Ref<Int> is represented as App(Const("Ref"), [Int]).
        expect(result.type.type).toBe("App");
        if (result.type.type === "App") {
            expect(result.type.constructor.type).toBe("Const");
            if (result.type.constructor.type === "Const") {
                expect(result.type.constructor.name).toBe("Ref");
            }
        }
    });

    it("should reject `let mut x = <non-Ref>` with VF4018", () => {
        // Per docs/spec/07-mutable-references.md: a `let mut` binding must
        // hold a Ref<T>. The parser permits any RHS shape (so aliasing
        // forms like `let mut b = a;` parse), but the typechecker rejects
        // RHS values whose inferred type isn't Ref<T>.
        const pattern: CoreVarPattern = { kind: "CoreVarPattern", name: "x", loc: testLoc };
        const intLit: CoreIntLit = { kind: "CoreIntLit", value: 5, loc: testLoc };
        const body: CoreVar = { kind: "CoreVar", name: "x", loc: testLoc };
        const expr: CoreLet = {
            kind: "CoreLet",
            pattern,
            value: intLit,
            body,
            mutable: true,
            recursive: false,
            loc: testLoc,
        };

        const env = createTestEnv();
        const ctx = createContext(env);

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

    it("should accept `let mut b = a;` ref aliasing", () => {
        // Per docs/spec/07-mutable-references.md "Ref Equality and
        // Aliasing": `let mut b = a;` (where a : Ref<T>) must be allowed.
        // The new typechecker enforcement unifies the RHS with Ref<fresh>
        // and lets the alias case through.
        const aPattern: CoreVarPattern = { kind: "CoreVarPattern", name: "a", loc: testLoc };
        const intLit: CoreIntLit = { kind: "CoreIntLit", value: 0, loc: testLoc };
        const refVar: CoreVar = { kind: "CoreVar", name: "ref", loc: testLoc };
        const refCall: CoreApp = { kind: "CoreApp", func: refVar, args: [intLit], loc: testLoc };

        const bPattern: CoreVarPattern = { kind: "CoreVarPattern", name: "b", loc: testLoc };
        const aRef: CoreVar = { kind: "CoreVar", name: "a", loc: testLoc };
        const innerBody: CoreVar = { kind: "CoreVar", name: "b", loc: testLoc };
        const inner: CoreLet = {
            kind: "CoreLet",
            pattern: bPattern,
            value: aRef,
            body: innerBody,
            mutable: true,
            recursive: false,
            loc: testLoc,
        };
        const outer: CoreLet = {
            kind: "CoreLet",
            pattern: aPattern,
            value: refCall,
            body: inner,
            mutable: true,
            recursive: false,
            loc: testLoc,
        };

        const env = createTestEnv();
        const ctx = createContext(env);

        const result = inferExpr(ctx, outer);
        expect(result.type.type).toBe("App");
        if (result.type.type === "App" && result.type.constructor.type === "Const") {
            expect(result.type.constructor.name).toBe("Ref");
        }
    });

    it("should destructure a tuple pattern in a let-binding", () => {
        // let (a, b) = (1, 2) in a
        const tuplePattern: import("../types/core-ast.js").CoreTuplePattern = {
            kind: "CoreTuplePattern",
            elements: [
                { kind: "CoreVarPattern", name: "a", loc: testLoc },
                { kind: "CoreVarPattern", name: "b", loc: testLoc },
            ],
            loc: testLoc,
        };

        const intLit1: CoreIntLit = { kind: "CoreIntLit", value: 1, loc: testLoc };
        const intLit2: CoreIntLit = { kind: "CoreIntLit", value: 2, loc: testLoc };
        const tuple: import("../types/core-ast.js").CoreTuple = {
            kind: "CoreTuple",
            elements: [intLit1, intLit2],
            loc: testLoc,
        };

        const aVar: CoreVar = { kind: "CoreVar", name: "a", loc: testLoc };

        const expr: CoreLet = {
            kind: "CoreLet",
            pattern: tuplePattern,
            value: tuple,
            body: aVar,
            mutable: false,
            recursive: false,
            loc: testLoc,
        };

        const env = createTestEnv();
        const ctx = createContext(env);
        const result = inferExpr(ctx, expr);

        expect(result.type).toEqual(primitiveTypes.Int);
    });

    it("should reject recursive tuple let-bindings", () => {
        // let rec (a, b) = (1, 2) in a
        const tuplePattern: import("../types/core-ast.js").CoreTuplePattern = {
            kind: "CoreTuplePattern",
            elements: [
                { kind: "CoreVarPattern", name: "a", loc: testLoc },
                { kind: "CoreVarPattern", name: "b", loc: testLoc },
            ],
            loc: testLoc,
        };

        const intLit1: CoreIntLit = { kind: "CoreIntLit", value: 1, loc: testLoc };
        const intLit2: CoreIntLit = { kind: "CoreIntLit", value: 2, loc: testLoc };
        const tuple: import("../types/core-ast.js").CoreTuple = {
            kind: "CoreTuple",
            elements: [intLit1, intLit2],
            loc: testLoc,
        };

        const aVar: CoreVar = { kind: "CoreVar", name: "a", loc: testLoc };

        const expr: CoreLet = {
            kind: "CoreLet",
            pattern: tuplePattern,
            value: tuple,
            body: aVar,
            mutable: false,
            recursive: true,
            loc: testLoc,
        };

        const env = createTestEnv();
        const ctx = createContext(env);

        expect(() => inferExpr(ctx, expr)).toThrow(VibefunDiagnostic);
    });

    it("should reject record patterns in let-bindings (not yet supported)", () => {
        // let { x } = rec in x
        const recordPattern: import("../types/core-ast.js").CoreRecordPattern = {
            kind: "CoreRecordPattern",
            fields: [
                {
                    name: "x",
                    pattern: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                    loc: testLoc,
                },
            ],
            loc: testLoc,
        };

        const recordExpr: import("../types/core-ast.js").CoreRecord = {
            kind: "CoreRecord",
            fields: [
                {
                    kind: "Field",
                    name: "x",
                    value: { kind: "CoreIntLit", value: 1, loc: testLoc },
                    loc: testLoc,
                },
            ],
            loc: testLoc,
        };

        const xVar: CoreVar = { kind: "CoreVar", name: "x", loc: testLoc };

        const expr: CoreLet = {
            kind: "CoreLet",
            pattern: recordPattern,
            value: recordExpr,
            body: xVar,
            mutable: false,
            recursive: false,
            loc: testLoc,
        };

        const env = createTestEnv();
        const ctx = createContext(env);

        expect(() => inferExpr(ctx, expr)).toThrow(VibefunDiagnostic);
    });

    it("should handle shadowing in let-bindings", () => {
        // let x = 42 in let x = "hello" in x
        const env = createTestEnv();
        const ctx = createContext(env);

        const pattern1: CoreVarPattern = { kind: "CoreVarPattern", name: "x", loc: testLoc };
        const value1: CoreIntLit = { kind: "CoreIntLit", value: 42, loc: testLoc };

        const pattern2: CoreVarPattern = { kind: "CoreVarPattern", name: "x", loc: testLoc };
        const value2: CoreStringLit = { kind: "CoreStringLit", value: "hello", loc: testLoc };
        const xVar: CoreVar = { kind: "CoreVar", name: "x", loc: testLoc };

        const innerLet: CoreLet = {
            kind: "CoreLet",
            pattern: pattern2,
            value: value2,
            body: xVar,
            mutable: false,
            recursive: false,
            loc: testLoc,
        };

        const expr: CoreLet = {
            kind: "CoreLet",
            pattern: pattern1,
            value: value1,
            body: innerLet,
            mutable: false,
            recursive: false,
            loc: testLoc,
        };

        const result = inferExpr(ctx, expr);

        // Inner x shadows outer x, so result should be String
        expect(result.type).toEqual(primitiveTypes.String);
    });
});

describe("Type Inference - Generalization Edge Cases", () => {
    beforeEach(() => {
        resetTypeVarCounter();
    });

    it("should generalize lambda expressions (syntactic values)", () => {
        // let f = x => x in f
        const env = createTestEnv();
        const ctx = createContext(env);

        const param: CoreVarPattern = { kind: "CoreVarPattern", name: "x", loc: testLoc };
        const xVar: CoreVar = { kind: "CoreVar", name: "x", loc: testLoc };
        const lambda: CoreLambda = { kind: "CoreLambda", param, body: xVar, loc: testLoc };

        const pattern: CoreVarPattern = { kind: "CoreVarPattern", name: "f", loc: testLoc };
        const fVar: CoreVar = { kind: "CoreVar", name: "f", loc: testLoc };

        const expr: CoreLet = {
            kind: "CoreLet",
            pattern,
            value: lambda,
            body: fVar,
            mutable: false,
            recursive: false,
            loc: testLoc,
        };

        const result = inferExpr(ctx, expr);

        // f should be a function type
        expect(result.type.type).toBe("Fun");
    });

    it("should not generalize function applications", () => {
        // let y = (x => x)(42) in y
        const env = createTestEnv();
        const ctx = createContext(env);

        const param: CoreVarPattern = { kind: "CoreVarPattern", name: "x", loc: testLoc };
        const xVar: CoreVar = { kind: "CoreVar", name: "x", loc: testLoc };
        const lambda: CoreLambda = { kind: "CoreLambda", param, body: xVar, loc: testLoc };

        const intLit: CoreIntLit = { kind: "CoreIntLit", value: 42, loc: testLoc };
        const app: CoreApp = { kind: "CoreApp", func: lambda, args: [intLit], loc: testLoc };

        const pattern: CoreVarPattern = { kind: "CoreVarPattern", name: "y", loc: testLoc };
        const yVar: CoreVar = { kind: "CoreVar", name: "y", loc: testLoc };

        const expr: CoreLet = {
            kind: "CoreLet",
            pattern,
            value: app,
            body: yVar,
            mutable: false,
            recursive: false,
            loc: testLoc,
        };

        const result = inferExpr(ctx, expr);

        // y should have type Int (monomorphic)
        expect(result.type).toEqual(primitiveTypes.Int);
    });

    it("should generalize literal values", () => {
        // let x = 42 in x
        const env = createTestEnv();
        const ctx = createContext(env);

        const pattern: CoreVarPattern = { kind: "CoreVarPattern", name: "x", loc: testLoc };
        const intLit: CoreIntLit = { kind: "CoreIntLit", value: 42, loc: testLoc };
        const xVar: CoreVar = { kind: "CoreVar", name: "x", loc: testLoc };

        const expr: CoreLet = {
            kind: "CoreLet",
            pattern,
            value: intLit,
            body: xVar,
            mutable: false,
            recursive: false,
            loc: testLoc,
        };

        const result = inferExpr(ctx, expr);

        // x should have type Int
        expect(result.type).toEqual(primitiveTypes.Int);
    });

    describe("Wildcard pattern", () => {
        it("should accept `let _ = value; body`", () => {
            // let _ = 42 in "done"
            const env = createTestEnv();
            const ctx = createContext(env);

            const intLit: CoreIntLit = { kind: "CoreIntLit", value: 42, loc: testLoc };
            const body: CoreStringLit = { kind: "CoreStringLit", value: "done", loc: testLoc };

            const expr: CoreLet = {
                kind: "CoreLet",
                pattern: { kind: "CoreWildcardPattern", loc: testLoc },
                value: intLit,
                body,
                mutable: false,
                recursive: false,
                loc: testLoc,
            };

            const result = inferExpr(ctx, expr);
            expect(result.type).toEqual(primitiveTypes.String);
        });

        it("should not bind `_` in the body scope", () => {
            // let _ = 42 in _  -> VF4100: Undefined variable '_'
            const env = createTestEnv();
            const ctx = createContext(env);

            const intLit: CoreIntLit = { kind: "CoreIntLit", value: 42, loc: testLoc };
            const underscoreRef: CoreVar = { kind: "CoreVar", name: "_", loc: testLoc };

            const expr: CoreLet = {
                kind: "CoreLet",
                pattern: { kind: "CoreWildcardPattern", loc: testLoc },
                value: intLit,
                body: underscoreRef,
                mutable: false,
                recursive: false,
                loc: testLoc,
            };

            expect(() => inferExpr(ctx, expr)).toThrow(VibefunDiagnostic);
        });

        it("should still reject other non-variable patterns with VF4017", () => {
            // let 42 = 42 in 1  -> VF4017 (literal pattern still unsupported)
            const env = createTestEnv();
            const ctx = createContext(env);

            const intLit: CoreIntLit = { kind: "CoreIntLit", value: 42, loc: testLoc };
            const body: CoreIntLit = { kind: "CoreIntLit", value: 1, loc: testLoc };

            const expr: CoreLet = {
                kind: "CoreLet",
                pattern: { kind: "CoreLiteralPattern", literal: 42, loc: testLoc },
                value: intLit,
                body,
                mutable: false,
                recursive: false,
                loc: testLoc,
            };

            expect(() => inferExpr(ctx, expr)).toThrow(VibefunDiagnostic);
        });
    });

    describe("Tuple destructuring", () => {
        it("should bind each tuple element into the body scope", () => {
            // let (a, b) = (1, 2) in a + b  -> Int
            const env = createTestEnv();
            const ctx = createContext(env);

            const tupleExpr: import("../types/core-ast.js").CoreTuple = {
                kind: "CoreTuple",
                elements: [
                    { kind: "CoreIntLit", value: 1, loc: testLoc },
                    { kind: "CoreIntLit", value: 2, loc: testLoc },
                ],
                loc: testLoc,
            };

            const body: import("../types/core-ast.js").CoreBinOp = {
                kind: "CoreBinOp",
                op: "Add",
                left: { kind: "CoreVar", name: "a", loc: testLoc },
                right: { kind: "CoreVar", name: "b", loc: testLoc },
                loc: testLoc,
            };

            const expr: CoreLet = {
                kind: "CoreLet",
                pattern: {
                    kind: "CoreTuplePattern",
                    elements: [
                        { kind: "CoreVarPattern", name: "a", loc: testLoc },
                        { kind: "CoreVarPattern", name: "b", loc: testLoc },
                    ],
                    loc: testLoc,
                },
                value: tupleExpr,
                body,
                mutable: false,
                recursive: false,
                loc: testLoc,
            };

            const result = inferExpr(ctx, expr);
            expect(result.type).toEqual(primitiveTypes.Int);
        });

        it("should support nested tuple destructuring", () => {
            // let ((a, b), c) = ((1, 2), 3) in a + b + c  -> Int
            const env = createTestEnv();
            const ctx = createContext(env);

            const innerTuple: import("../types/core-ast.js").CoreTuple = {
                kind: "CoreTuple",
                elements: [
                    { kind: "CoreIntLit", value: 1, loc: testLoc },
                    { kind: "CoreIntLit", value: 2, loc: testLoc },
                ],
                loc: testLoc,
            };
            const outerTuple: import("../types/core-ast.js").CoreTuple = {
                kind: "CoreTuple",
                elements: [innerTuple, { kind: "CoreIntLit", value: 3, loc: testLoc }],
                loc: testLoc,
            };

            const aPlusB: import("../types/core-ast.js").CoreBinOp = {
                kind: "CoreBinOp",
                op: "Add",
                left: { kind: "CoreVar", name: "a", loc: testLoc },
                right: { kind: "CoreVar", name: "b", loc: testLoc },
                loc: testLoc,
            };
            const body: import("../types/core-ast.js").CoreBinOp = {
                kind: "CoreBinOp",
                op: "Add",
                left: aPlusB,
                right: { kind: "CoreVar", name: "c", loc: testLoc },
                loc: testLoc,
            };

            const expr: CoreLet = {
                kind: "CoreLet",
                pattern: {
                    kind: "CoreTuplePattern",
                    elements: [
                        {
                            kind: "CoreTuplePattern",
                            elements: [
                                { kind: "CoreVarPattern", name: "a", loc: testLoc },
                                { kind: "CoreVarPattern", name: "b", loc: testLoc },
                            ],
                            loc: testLoc,
                        },
                        { kind: "CoreVarPattern", name: "c", loc: testLoc },
                    ],
                    loc: testLoc,
                },
                value: outerTuple,
                body,
                mutable: false,
                recursive: false,
                loc: testLoc,
            };

            const result = inferExpr(ctx, expr);
            expect(result.type).toEqual(primitiveTypes.Int);
        });

        it("should not generalize tuple-destructured bindings (value restriction)", () => {
            // let t = (x) => { let (a, _) = (x, x); a };
            // Outer lambda generalizes over x's tyvar, but the destructured
            // `a` alone must remain monomorphic inside the body.
            const env = createTestEnv();
            const ctx = createContext(env);

            const tupleExpr: import("../types/core-ast.js").CoreTuple = {
                kind: "CoreTuple",
                elements: [
                    { kind: "CoreVar", name: "x", loc: testLoc },
                    { kind: "CoreVar", name: "x", loc: testLoc },
                ],
                loc: testLoc,
            };

            const letAB: CoreLet = {
                kind: "CoreLet",
                pattern: {
                    kind: "CoreTuplePattern",
                    elements: [
                        { kind: "CoreVarPattern", name: "a", loc: testLoc },
                        { kind: "CoreWildcardPattern", loc: testLoc },
                    ],
                    loc: testLoc,
                },
                value: tupleExpr,
                body: { kind: "CoreVar", name: "a", loc: testLoc },
                mutable: false,
                recursive: false,
                loc: testLoc,
            };

            const lambda: import("../types/core-ast.js").CoreLambda = {
                kind: "CoreLambda",
                param: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                body: letAB,
                loc: testLoc,
            };

            const result = inferExpr(ctx, lambda);
            // Outer lambda: (A) -> A
            expect(result.type.type).toBe("Fun");
            if (result.type.type === "Fun") {
                expect(result.type.params).toHaveLength(1);
                expect(result.type.params[0]).toEqual(result.type.return);
            }
        });
    });
});
