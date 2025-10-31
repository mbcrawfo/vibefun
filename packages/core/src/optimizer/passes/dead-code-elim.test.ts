/**
 * Tests for Dead Code Elimination optimization pass
 */

import type { CoreExpr } from "../../types/core-ast.js";

import { describe, expect, it } from "vitest";

import { DeadCodeEliminationPass } from "./dead-code-elim.js";

const testLoc = { file: "test", line: 1, column: 1, offset: 0 };

describe("DeadCodeEliminationPass", () => {
    const pass = new DeadCodeEliminationPass();

    describe("Unused let bindings", () => {
        it("should remove unused let binding", () => {
            // let x = 5 in y
            const expr: CoreExpr = {
                kind: "CoreLet",
                pattern: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                value: { kind: "CoreIntLit", value: 5, loc: testLoc },
                body: { kind: "CoreVar", name: "y", loc: testLoc },
                mutable: false,
                recursive: false,
                loc: testLoc,
            };

            const result = pass.transform(expr);

            // Should eliminate to: y
            expect(result).toEqual({ kind: "CoreVar", name: "y", loc: testLoc });
        });

        it("should keep used let binding", () => {
            // let x = 5 in x
            const expr: CoreExpr = {
                kind: "CoreLet",
                pattern: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                value: { kind: "CoreIntLit", value: 5, loc: testLoc },
                body: { kind: "CoreVar", name: "x", loc: testLoc },
                mutable: false,
                recursive: false,
                loc: testLoc,
            };

            const result = pass.transform(expr);

            // Should keep binding (x is used)
            expect(result).toEqual(expr);
        });

        it("should not remove mutable bindings", () => {
            // let mut x = 5 in y
            const expr: CoreExpr = {
                kind: "CoreLet",
                pattern: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                value: { kind: "CoreIntLit", value: 5, loc: testLoc },
                body: { kind: "CoreVar", name: "y", loc: testLoc },
                mutable: true, // Mutable
                recursive: false,
                loc: testLoc,
            };

            const result = pass.transform(expr);

            // Should NOT eliminate (mutable)
            expect(result).toEqual(expr);
        });

        it("should not remove recursive bindings", () => {
            // let rec f = ... in body
            const expr: CoreExpr = {
                kind: "CoreLet",
                pattern: { kind: "CoreVarPattern", name: "f", loc: testLoc },
                value: {
                    kind: "CoreLambda",
                    param: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                    body: { kind: "CoreVar", name: "x", loc: testLoc },
                    loc: testLoc,
                },
                body: { kind: "CoreVar", name: "result", loc: testLoc },
                mutable: false,
                recursive: true, // Recursive
                loc: testLoc,
            };

            const result = pass.transform(expr);

            // Should NOT eliminate (recursive)
            expect(result).toEqual(expr);
        });

        it("should not remove bindings with side effects", () => {
            // let x = unsafe { ... } in y
            const expr: CoreExpr = {
                kind: "CoreLet",
                pattern: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                value: {
                    kind: "CoreUnsafe",
                    expr: { kind: "CoreIntLit", value: 5, loc: testLoc },
                    loc: testLoc,
                },
                body: { kind: "CoreVar", name: "y", loc: testLoc },
                mutable: false,
                recursive: false,
                loc: testLoc,
            };

            const result = pass.transform(expr);

            // Should NOT eliminate (has unsafe block)
            expect(result).toEqual(expr);
        });

        it("should not remove destructuring patterns", () => {
            // let { x, y } = record in z
            const expr: CoreExpr = {
                kind: "CoreLet",
                pattern: {
                    kind: "CoreRecordPattern",
                    fields: [
                        { name: "x", pattern: { kind: "CoreVarPattern", name: "x", loc: testLoc }, loc: testLoc },
                        { name: "y", pattern: { kind: "CoreVarPattern", name: "y", loc: testLoc }, loc: testLoc },
                    ],
                    loc: testLoc,
                },
                value: { kind: "CoreVar", name: "record", loc: testLoc },
                body: { kind: "CoreVar", name: "z", loc: testLoc },
                mutable: false,
                recursive: false,
                loc: testLoc,
            };

            const result = pass.transform(expr);

            // Should NOT eliminate (complex pattern)
            expect(result).toEqual(expr);
        });
    });

    describe("Match on known boolean", () => {
        it("should simplify match true to first matching branch", () => {
            // match true { true => 1, false => 2 }
            const expr: CoreExpr = {
                kind: "CoreMatch",
                expr: { kind: "CoreBoolLit", value: true, loc: testLoc },
                cases: [
                    {
                        pattern: { kind: "CoreLiteralPattern", literal: true, loc: testLoc },
                        body: { kind: "CoreIntLit", value: 1, loc: testLoc },
                        loc: testLoc,
                    },
                    {
                        pattern: { kind: "CoreLiteralPattern", literal: false, loc: testLoc },
                        body: { kind: "CoreIntLit", value: 2, loc: testLoc },
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            };

            const result = pass.transform(expr);

            // Should simplify to: 1
            expect(result).toEqual({ kind: "CoreIntLit", value: 1, loc: testLoc });
        });

        it("should simplify match false to second matching branch", () => {
            // match false { true => 1, false => 2 }
            const expr: CoreExpr = {
                kind: "CoreMatch",
                expr: { kind: "CoreBoolLit", value: false, loc: testLoc },
                cases: [
                    {
                        pattern: { kind: "CoreLiteralPattern", literal: true, loc: testLoc },
                        body: { kind: "CoreIntLit", value: 1, loc: testLoc },
                        loc: testLoc,
                    },
                    {
                        pattern: { kind: "CoreLiteralPattern", literal: false, loc: testLoc },
                        body: { kind: "CoreIntLit", value: 2, loc: testLoc },
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            };

            const result = pass.transform(expr);

            // Should simplify to: 2
            expect(result).toEqual({ kind: "CoreIntLit", value: 2, loc: testLoc });
        });

        it("should simplify match to wildcard when no literal matches", () => {
            // match true { _ => 42 }
            const expr: CoreExpr = {
                kind: "CoreMatch",
                expr: { kind: "CoreBoolLit", value: true, loc: testLoc },
                cases: [
                    {
                        pattern: { kind: "CoreWildcardPattern", loc: testLoc },
                        body: { kind: "CoreIntLit", value: 42, loc: testLoc },
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            };

            const result = pass.transform(expr);

            // Should simplify to: 42
            expect(result).toEqual({ kind: "CoreIntLit", value: 42, loc: testLoc });
        });
    });

    describe("Match on known integer", () => {
        it("should simplify match on integer literal", () => {
            // match 5 { 3 => "a", 5 => "b", _ => "c" }
            const expr: CoreExpr = {
                kind: "CoreMatch",
                expr: { kind: "CoreIntLit", value: 5, loc: testLoc },
                cases: [
                    {
                        pattern: { kind: "CoreLiteralPattern", literal: 3, loc: testLoc },
                        body: { kind: "CoreStringLit", value: "a", loc: testLoc },
                        loc: testLoc,
                    },
                    {
                        pattern: { kind: "CoreLiteralPattern", literal: 5, loc: testLoc },
                        body: { kind: "CoreStringLit", value: "b", loc: testLoc },
                        loc: testLoc,
                    },
                    {
                        pattern: { kind: "CoreWildcardPattern", loc: testLoc },
                        body: { kind: "CoreStringLit", value: "c", loc: testLoc },
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            };

            const result = pass.transform(expr);

            // Should simplify to: "b"
            expect(result).toEqual({ kind: "CoreStringLit", value: "b", loc: testLoc });
        });

        it("should fall through to wildcard if no literal matches", () => {
            // match 10 { 3 => "a", 5 => "b", _ => "c" }
            const expr: CoreExpr = {
                kind: "CoreMatch",
                expr: { kind: "CoreIntLit", value: 10, loc: testLoc },
                cases: [
                    {
                        pattern: { kind: "CoreLiteralPattern", literal: 3, loc: testLoc },
                        body: { kind: "CoreStringLit", value: "a", loc: testLoc },
                        loc: testLoc,
                    },
                    {
                        pattern: { kind: "CoreLiteralPattern", literal: 5, loc: testLoc },
                        body: { kind: "CoreStringLit", value: "b", loc: testLoc },
                        loc: testLoc,
                    },
                    {
                        pattern: { kind: "CoreWildcardPattern", loc: testLoc },
                        body: { kind: "CoreStringLit", value: "c", loc: testLoc },
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            };

            const result = pass.transform(expr);

            // Should simplify to: "c"
            expect(result).toEqual({ kind: "CoreStringLit", value: "c", loc: testLoc });
        });
    });

    describe("Match on known string", () => {
        it("should simplify match on string literal", () => {
            // match "hello" { "world" => 1, "hello" => 2, _ => 3 }
            const expr: CoreExpr = {
                kind: "CoreMatch",
                expr: { kind: "CoreStringLit", value: "hello", loc: testLoc },
                cases: [
                    {
                        pattern: { kind: "CoreLiteralPattern", literal: "world", loc: testLoc },
                        body: { kind: "CoreIntLit", value: 1, loc: testLoc },
                        loc: testLoc,
                    },
                    {
                        pattern: { kind: "CoreLiteralPattern", literal: "hello", loc: testLoc },
                        body: { kind: "CoreIntLit", value: 2, loc: testLoc },
                        loc: testLoc,
                    },
                    {
                        pattern: { kind: "CoreWildcardPattern", loc: testLoc },
                        body: { kind: "CoreIntLit", value: 3, loc: testLoc },
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            };

            const result = pass.transform(expr);

            // Should simplify to: 2
            expect(result).toEqual({ kind: "CoreIntLit", value: 2, loc: testLoc });
        });
    });

    describe("Match on known variant", () => {
        it("should simplify match on variant with wildcard args", () => {
            // match Some(5) { Some(_) => 1, None => 2 }
            const expr: CoreExpr = {
                kind: "CoreMatch",
                expr: {
                    kind: "CoreVariant",
                    constructor: "Some",
                    args: [{ kind: "CoreIntLit", value: 5, loc: testLoc }],
                    loc: testLoc,
                },
                cases: [
                    {
                        pattern: {
                            kind: "CoreVariantPattern",
                            constructor: "Some",
                            args: [{ kind: "CoreWildcardPattern", loc: testLoc }],
                            loc: testLoc,
                        },
                        body: { kind: "CoreIntLit", value: 1, loc: testLoc },
                        loc: testLoc,
                    },
                    {
                        pattern: {
                            kind: "CoreVariantPattern",
                            constructor: "None",
                            args: [],
                            loc: testLoc,
                        },
                        body: { kind: "CoreIntLit", value: 2, loc: testLoc },
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            };

            const result = pass.transform(expr);

            // Should simplify to: 1
            expect(result).toEqual({ kind: "CoreIntLit", value: 1, loc: testLoc });
        });
    });

    describe("Unreachable branches", () => {
        it("should remove branches after wildcard", () => {
            // match x { _ => 1, y => 2, z => 3 }
            const expr: CoreExpr = {
                kind: "CoreMatch",
                expr: { kind: "CoreVar", name: "x", loc: testLoc },
                cases: [
                    {
                        pattern: { kind: "CoreWildcardPattern", loc: testLoc },
                        body: { kind: "CoreIntLit", value: 1, loc: testLoc },
                        loc: testLoc,
                    },
                    {
                        pattern: { kind: "CoreVarPattern", name: "y", loc: testLoc },
                        body: { kind: "CoreIntLit", value: 2, loc: testLoc },
                        loc: testLoc,
                    },
                    {
                        pattern: { kind: "CoreVarPattern", name: "z", loc: testLoc },
                        body: { kind: "CoreIntLit", value: 3, loc: testLoc },
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            };

            const result = pass.transform(expr);

            // Should have only one case
            expect(result.kind).toBe("CoreMatch");
            if (result.kind === "CoreMatch") {
                expect(result.cases).toHaveLength(1);
                expect(result.cases[0]?.pattern.kind).toBe("CoreWildcardPattern");
            }
        });

        it("should not remove branches after variable pattern (catches all)", () => {
            // match x { y => 1, z => 2 }
            const expr: CoreExpr = {
                kind: "CoreMatch",
                expr: { kind: "CoreVar", name: "x", loc: testLoc },
                cases: [
                    {
                        pattern: { kind: "CoreVarPattern", name: "y", loc: testLoc },
                        body: { kind: "CoreIntLit", value: 1, loc: testLoc },
                        loc: testLoc,
                    },
                    {
                        pattern: { kind: "CoreVarPattern", name: "z", loc: testLoc },
                        body: { kind: "CoreIntLit", value: 2, loc: testLoc },
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            };

            const result = pass.transform(expr);

            // Should have only one case (first variable pattern catches all)
            expect(result.kind).toBe("CoreMatch");
            if (result.kind === "CoreMatch") {
                expect(result.cases).toHaveLength(1);
            }
        });

        it("should keep branches after guarded wildcard", () => {
            // match x { _ when false => 1, y => 2 }
            const expr: CoreExpr = {
                kind: "CoreMatch",
                expr: { kind: "CoreVar", name: "x", loc: testLoc },
                cases: [
                    {
                        pattern: { kind: "CoreWildcardPattern", loc: testLoc },
                        guard: { kind: "CoreBoolLit", value: false, loc: testLoc },
                        body: { kind: "CoreIntLit", value: 1, loc: testLoc },
                        loc: testLoc,
                    },
                    {
                        pattern: { kind: "CoreVarPattern", name: "y", loc: testLoc },
                        body: { kind: "CoreIntLit", value: 2, loc: testLoc },
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            };

            const result = pass.transform(expr);

            // Should keep both cases (first has guard, may not match)
            expect(result.kind).toBe("CoreMatch");
            if (result.kind === "CoreMatch") {
                expect(result.cases).toHaveLength(2);
            }
        });
    });

    describe("Guards", () => {
        it("should skip patterns with failing guards", () => {
            // match 5 { 5 when false => 1, _ => 2 }
            const expr: CoreExpr = {
                kind: "CoreMatch",
                expr: { kind: "CoreIntLit", value: 5, loc: testLoc },
                cases: [
                    {
                        pattern: { kind: "CoreLiteralPattern", literal: 5, loc: testLoc },
                        guard: { kind: "CoreBoolLit", value: false, loc: testLoc },
                        body: { kind: "CoreIntLit", value: 1, loc: testLoc },
                        loc: testLoc,
                    },
                    {
                        pattern: { kind: "CoreWildcardPattern", loc: testLoc },
                        body: { kind: "CoreIntLit", value: 2, loc: testLoc },
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            };

            const result = pass.transform(expr);

            // Should simplify to: 2 (first case fails guard)
            expect(result).toEqual({ kind: "CoreIntLit", value: 2, loc: testLoc });
        });

        it("should use patterns with succeeding guards", () => {
            // match 5 { 5 when true => 1, _ => 2 }
            const expr: CoreExpr = {
                kind: "CoreMatch",
                expr: { kind: "CoreIntLit", value: 5, loc: testLoc },
                cases: [
                    {
                        pattern: { kind: "CoreLiteralPattern", literal: 5, loc: testLoc },
                        guard: { kind: "CoreBoolLit", value: true, loc: testLoc },
                        body: { kind: "CoreIntLit", value: 1, loc: testLoc },
                        loc: testLoc,
                    },
                    {
                        pattern: { kind: "CoreWildcardPattern", loc: testLoc },
                        body: { kind: "CoreIntLit", value: 2, loc: testLoc },
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            };

            const result = pass.transform(expr);

            // Should simplify to: 1 (first case succeeds)
            expect(result).toEqual({ kind: "CoreIntLit", value: 1, loc: testLoc });
        });
    });

    describe("Unsafe block preservation", () => {
        it("should not eliminate inside unsafe blocks", () => {
            const expr: CoreExpr = {
                kind: "CoreUnsafe",
                expr: {
                    kind: "CoreLet",
                    pattern: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                    value: { kind: "CoreIntLit", value: 5, loc: testLoc },
                    body: { kind: "CoreVar", name: "y", loc: testLoc },
                    mutable: false,
                    recursive: false,
                    loc: testLoc,
                },
                loc: testLoc,
            };

            const result = pass.transform(expr);

            // Should NOT eliminate (inside unsafe block)
            expect(result).toEqual(expr);
        });
    });
});
