/**
 * Tests for substitution utilities
 */

import type { CoreExpr } from "../types/core-ast.js";

import { describe, expect, it } from "vitest";

import { freshen, substitute, substituteMultiple } from "./substitution.js";

const testLoc = { file: "test", line: 1, column: 1, offset: 0 };

describe("Substitution Utilities", () => {
    describe("substitute", () => {
        it("should substitute variable with literal", () => {
            const expr: CoreExpr = { kind: "CoreVar", name: "x", loc: testLoc };
            const replacement: CoreExpr = { kind: "CoreIntLit", value: 42, loc: testLoc };

            const result = substitute(expr, "x", replacement);

            expect(result).toEqual(replacement);
        });

        it("should not substitute different variable", () => {
            const expr: CoreExpr = { kind: "CoreVar", name: "y", loc: testLoc };
            const replacement: CoreExpr = { kind: "CoreIntLit", value: 42, loc: testLoc };

            const result = substitute(expr, "x", replacement);

            expect(result).toEqual(expr);
        });

        it("should substitute in binary operations", () => {
            // x + x
            const expr: CoreExpr = {
                kind: "CoreBinOp",
                op: "Add",
                left: { kind: "CoreVar", name: "x", loc: testLoc },
                right: { kind: "CoreVar", name: "x", loc: testLoc },
                loc: testLoc,
            };

            const replacement: CoreExpr = { kind: "CoreIntLit", value: 5, loc: testLoc };
            const result = substitute(expr, "x", replacement);

            expect(result.kind).toBe("CoreBinOp");
            if (result.kind === "CoreBinOp") {
                expect(result.left).toEqual(replacement);
                expect(result.right).toEqual(replacement);
            }
        });

        it("should not substitute bound variables in let", () => {
            // let x = 1 in x
            const expr: CoreExpr = {
                kind: "CoreLet",
                pattern: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                value: { kind: "CoreIntLit", value: 1, loc: testLoc },
                body: { kind: "CoreVar", name: "x", loc: testLoc },
                mutable: false,
                recursive: false,
                loc: testLoc,
            };

            const replacement: CoreExpr = { kind: "CoreIntLit", value: 99, loc: testLoc };
            const result = substitute(expr, "x", replacement);

            // x in body should NOT be replaced (it's bound by pattern)
            expect(result.kind).toBe("CoreLet");
            if (result.kind === "CoreLet") {
                expect(result.body).toEqual({ kind: "CoreVar", name: "x", loc: testLoc });
            }
        });

        it("should substitute in let value but not bound variable in body", () => {
            // let y = x in y
            const expr: CoreExpr = {
                kind: "CoreLet",
                pattern: { kind: "CoreVarPattern", name: "y", loc: testLoc },
                value: { kind: "CoreVar", name: "x", loc: testLoc },
                body: { kind: "CoreVar", name: "y", loc: testLoc },
                mutable: false,
                recursive: false,
                loc: testLoc,
            };

            const replacement: CoreExpr = { kind: "CoreIntLit", value: 42, loc: testLoc };
            const result = substitute(expr, "x", replacement);

            expect(result.kind).toBe("CoreLet");
            if (result.kind === "CoreLet") {
                expect(result.value).toEqual(replacement); // x replaced in value
                expect(result.body).toEqual({ kind: "CoreVar", name: "y", loc: testLoc }); // y unchanged
            }
        });

        it("should handle capture avoidance in let", () => {
            // let x = 1 in y
            // Substitute y with x
            const expr: CoreExpr = {
                kind: "CoreLet",
                pattern: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                value: { kind: "CoreIntLit", value: 1, loc: testLoc },
                body: { kind: "CoreVar", name: "y", loc: testLoc },
                mutable: false,
                recursive: false,
                loc: testLoc,
            };

            const replacement: CoreExpr = { kind: "CoreVar", name: "x", loc: testLoc };
            const result = substitute(expr, "y", replacement);

            // Should rename bound x to avoid capture
            expect(result.kind).toBe("CoreLet");
            if (result.kind === "CoreLet") {
                // Pattern should be renamed (x -> x_1 or similar)
                const pattern = result.pattern;
                expect(pattern.kind).toBe("CoreVarPattern");
                if (pattern && pattern.kind === "CoreVarPattern") {
                    expect(pattern.name).not.toBe("x");
                    expect(pattern.name).toContain("x");
                }
            }
        });

        it("should not substitute bound lambda parameter", () => {
            // (x) => x
            const expr: CoreExpr = {
                kind: "CoreLambda",
                param: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                body: { kind: "CoreVar", name: "x", loc: testLoc },
                loc: testLoc,
            };

            const replacement: CoreExpr = { kind: "CoreIntLit", value: 42, loc: testLoc };
            const result = substitute(expr, "x", replacement);

            // x in body should NOT be replaced (bound by param)
            expect(result.kind).toBe("CoreLambda");
            if (result.kind === "CoreLambda") {
                expect(result.body).toEqual({ kind: "CoreVar", name: "x", loc: testLoc });
            }
        });

        it("should substitute free variables in lambda", () => {
            // (x) => y
            const expr: CoreExpr = {
                kind: "CoreLambda",
                param: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                body: { kind: "CoreVar", name: "y", loc: testLoc },
                loc: testLoc,
            };

            const replacement: CoreExpr = { kind: "CoreIntLit", value: 42, loc: testLoc };
            const result = substitute(expr, "y", replacement);

            expect(result.kind).toBe("CoreLambda");
            if (result.kind === "CoreLambda") {
                expect(result.body).toEqual(replacement);
            }
        });

        it("should handle capture avoidance in lambda", () => {
            // (x) => y
            // Substitute y with x (free variable in replacement)
            const expr: CoreExpr = {
                kind: "CoreLambda",
                param: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                body: { kind: "CoreVar", name: "y", loc: testLoc },
                loc: testLoc,
            };

            const replacement: CoreExpr = { kind: "CoreVar", name: "x", loc: testLoc };
            const result = substitute(expr, "y", replacement);

            // Should rename bound parameter to avoid capturing free x
            expect(result.kind).toBe("CoreLambda");
            if (result.kind === "CoreLambda") {
                const param = result.param;
                expect(param.kind).toBe("CoreVarPattern");
                if (param && param.kind === "CoreVarPattern") {
                    expect(param.name).not.toBe("x");
                    expect(param.name).toContain("x");
                }
            }
        });

        it("should substitute in match expression", () => {
            // match x { _ => y }
            const expr: CoreExpr = {
                kind: "CoreMatch",
                expr: { kind: "CoreVar", name: "x", loc: testLoc },
                cases: [
                    {
                        pattern: { kind: "CoreWildcardPattern", loc: testLoc },
                        body: { kind: "CoreVar", name: "y", loc: testLoc },
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            };

            const replacement: CoreExpr = { kind: "CoreIntLit", value: 42, loc: testLoc };
            const result = substitute(expr, "x", replacement);

            expect(result.kind).toBe("CoreMatch");
            if (result.kind === "CoreMatch") {
                expect(result.expr).toEqual(replacement);
            }
        });

        it("should handle pattern bindings in match cases", () => {
            // match val { x => x }
            const expr: CoreExpr = {
                kind: "CoreMatch",
                expr: { kind: "CoreVar", name: "val", loc: testLoc },
                cases: [
                    {
                        pattern: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                        body: { kind: "CoreVar", name: "x", loc: testLoc },
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            };

            const replacement: CoreExpr = { kind: "CoreIntLit", value: 42, loc: testLoc };
            const result = substitute(expr, "x", replacement);

            // x in body should NOT be replaced (bound by pattern)
            expect(result.kind).toBe("CoreMatch");
            if (result.kind === "CoreMatch") {
                const case0 = result.cases[0];
                expect(case0).toBeDefined();
                if (case0) {
                    expect(case0.body).toEqual({ kind: "CoreVar", name: "x", loc: testLoc });
                }
            }
        });
    });

    describe("substituteMultiple", () => {
        it("should substitute multiple variables simultaneously", () => {
            // x + y
            const expr: CoreExpr = {
                kind: "CoreBinOp",
                op: "Add",
                left: { kind: "CoreVar", name: "x", loc: testLoc },
                right: { kind: "CoreVar", name: "y", loc: testLoc },
                loc: testLoc,
            };

            const bindings = new Map<string, CoreExpr>([
                ["x", { kind: "CoreIntLit", value: 1, loc: testLoc }],
                ["y", { kind: "CoreIntLit", value: 2, loc: testLoc }],
            ]);

            const result = substituteMultiple(expr, bindings);

            expect(result.kind).toBe("CoreBinOp");
            if (result.kind === "CoreBinOp") {
                expect(result.left).toEqual({ kind: "CoreIntLit", value: 1, loc: testLoc });
                expect(result.right).toEqual({ kind: "CoreIntLit", value: 2, loc: testLoc });
            }
        });

        it("should handle empty bindings", () => {
            const expr: CoreExpr = { kind: "CoreVar", name: "x", loc: testLoc };
            const bindings = new Map<string, CoreExpr>();

            const result = substituteMultiple(expr, bindings);
            expect(result).toEqual(expr);
        });
    });

    describe("freshen", () => {
        it("should return same name if not in avoid set", () => {
            const avoidSet = new Set(["y", "z"]);
            expect(freshen("x", avoidSet)).toBe("x");
        });

        it("should generate fresh name if in avoid set", () => {
            const avoidSet = new Set(["x"]);
            const fresh = freshen("x", avoidSet);

            expect(fresh).not.toBe("x");
            expect(fresh).toContain("x");
        });

        it("should generate unique names for multiple conflicts", () => {
            const avoidSet = new Set(["x", "x_1", "x_2"]);
            const fresh = freshen("x", avoidSet);

            expect(fresh).not.toBe("x");
            expect(fresh).not.toBe("x_1");
            expect(fresh).not.toBe("x_2");
            expect(fresh).toContain("x");
        });
    });

    describe("substitute - literals", () => {
        it("should return float literals unchanged", () => {
            const expr: CoreExpr = { kind: "CoreFloatLit", value: 3.14, loc: testLoc };
            const result = substitute(expr, "x", { kind: "CoreIntLit", value: 1, loc: testLoc });
            expect(result).toEqual(expr);
        });

        it("should return string literals unchanged", () => {
            const expr: CoreExpr = { kind: "CoreStringLit", value: "hello", loc: testLoc };
            const result = substitute(expr, "x", { kind: "CoreIntLit", value: 1, loc: testLoc });
            expect(result).toEqual(expr);
        });

        it("should return bool literals unchanged", () => {
            const expr: CoreExpr = { kind: "CoreBoolLit", value: true, loc: testLoc };
            const result = substitute(expr, "x", { kind: "CoreIntLit", value: 1, loc: testLoc });
            expect(result).toEqual(expr);
        });

        it("should return unit literals unchanged", () => {
            const expr: CoreExpr = { kind: "CoreUnitLit", loc: testLoc };
            const result = substitute(expr, "x", { kind: "CoreIntLit", value: 1, loc: testLoc });
            expect(result).toEqual(expr);
        });

        it("should return int literals unchanged", () => {
            const expr: CoreExpr = { kind: "CoreIntLit", value: 42, loc: testLoc };
            const result = substitute(expr, "x", { kind: "CoreIntLit", value: 1, loc: testLoc });
            expect(result).toEqual(expr);
        });
    });

    describe("substitute - application", () => {
        it("should substitute in function and arguments", () => {
            // f(x, y)
            const expr: CoreExpr = {
                kind: "CoreApp",
                func: { kind: "CoreVar", name: "f", loc: testLoc },
                args: [
                    { kind: "CoreVar", name: "x", loc: testLoc },
                    { kind: "CoreVar", name: "y", loc: testLoc },
                ],
                loc: testLoc,
            };

            const result = substitute(expr, "x", { kind: "CoreIntLit", value: 42, loc: testLoc });

            expect(result.kind).toBe("CoreApp");
            if (result.kind === "CoreApp") {
                expect(result.func).toEqual({ kind: "CoreVar", name: "f", loc: testLoc });
                expect(result.args[0]).toEqual({ kind: "CoreIntLit", value: 42, loc: testLoc });
                expect(result.args[1]).toEqual({ kind: "CoreVar", name: "y", loc: testLoc });
            }
        });

        it("should substitute in function position", () => {
            const expr: CoreExpr = {
                kind: "CoreApp",
                func: { kind: "CoreVar", name: "f", loc: testLoc },
                args: [{ kind: "CoreIntLit", value: 1, loc: testLoc }],
                loc: testLoc,
            };

            const replacement: CoreExpr = {
                kind: "CoreLambda",
                param: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                body: { kind: "CoreVar", name: "x", loc: testLoc },
                loc: testLoc,
            };

            const result = substitute(expr, "f", replacement);

            expect(result.kind).toBe("CoreApp");
            if (result.kind === "CoreApp") {
                expect(result.func).toEqual(replacement);
            }
        });
    });

    describe("substitute - records", () => {
        it("should substitute in record field values", () => {
            // { a: x, b: y }
            const expr: CoreExpr = {
                kind: "CoreRecord",
                fields: [
                    { kind: "Field", name: "a", value: { kind: "CoreVar", name: "x", loc: testLoc }, loc: testLoc },
                    { kind: "Field", name: "b", value: { kind: "CoreVar", name: "y", loc: testLoc }, loc: testLoc },
                ],
                loc: testLoc,
            };

            const result = substitute(expr, "x", { kind: "CoreIntLit", value: 42, loc: testLoc });

            expect(result.kind).toBe("CoreRecord");
            if (result.kind === "CoreRecord") {
                const fieldA = result.fields[0];
                if (fieldA?.kind === "Field") {
                    expect(fieldA.value).toEqual({ kind: "CoreIntLit", value: 42, loc: testLoc });
                }
                const fieldB = result.fields[1];
                if (fieldB?.kind === "Field") {
                    expect(fieldB.value).toEqual({ kind: "CoreVar", name: "y", loc: testLoc });
                }
            }
        });

        it("should substitute in record spread expressions", () => {
            // { ...base }
            const expr: CoreExpr = {
                kind: "CoreRecord",
                fields: [{ kind: "Spread", expr: { kind: "CoreVar", name: "base", loc: testLoc }, loc: testLoc }],
                loc: testLoc,
            };

            const result = substitute(expr, "base", { kind: "CoreVar", name: "other", loc: testLoc });

            expect(result.kind).toBe("CoreRecord");
            if (result.kind === "CoreRecord") {
                const spread = result.fields[0];
                if (spread?.kind === "Spread") {
                    expect(spread.expr).toEqual({ kind: "CoreVar", name: "other", loc: testLoc });
                }
            }
        });
    });

    describe("substitute - record access", () => {
        it("should substitute in record being accessed", () => {
            // x.field
            const expr: CoreExpr = {
                kind: "CoreRecordAccess",
                record: { kind: "CoreVar", name: "x", loc: testLoc },
                field: "field",
                loc: testLoc,
            };

            const result = substitute(expr, "x", { kind: "CoreVar", name: "y", loc: testLoc });

            expect(result.kind).toBe("CoreRecordAccess");
            if (result.kind === "CoreRecordAccess") {
                expect(result.record).toEqual({ kind: "CoreVar", name: "y", loc: testLoc });
                expect(result.field).toBe("field");
            }
        });
    });

    describe("substitute - record update", () => {
        it("should substitute in record and update values", () => {
            // { x | a: y }
            const expr: CoreExpr = {
                kind: "CoreRecordUpdate",
                record: { kind: "CoreVar", name: "x", loc: testLoc },
                updates: [
                    { kind: "Field", name: "a", value: { kind: "CoreVar", name: "y", loc: testLoc }, loc: testLoc },
                ],
                loc: testLoc,
            };

            const result1 = substitute(expr, "x", { kind: "CoreVar", name: "r", loc: testLoc });
            expect(result1.kind).toBe("CoreRecordUpdate");
            if (result1.kind === "CoreRecordUpdate") {
                expect(result1.record).toEqual({ kind: "CoreVar", name: "r", loc: testLoc });
            }

            const result2 = substitute(expr, "y", { kind: "CoreIntLit", value: 42, loc: testLoc });
            expect(result2.kind).toBe("CoreRecordUpdate");
            if (result2.kind === "CoreRecordUpdate") {
                const update = result2.updates[0];
                if (update?.kind === "Field") {
                    expect(update.value).toEqual({ kind: "CoreIntLit", value: 42, loc: testLoc });
                }
            }
        });

        it("should substitute in record update spread expressions", () => {
            // { r | ...other }
            const expr: CoreExpr = {
                kind: "CoreRecordUpdate",
                record: { kind: "CoreVar", name: "r", loc: testLoc },
                updates: [{ kind: "Spread", expr: { kind: "CoreVar", name: "other", loc: testLoc }, loc: testLoc }],
                loc: testLoc,
            };

            const result = substitute(expr, "other", { kind: "CoreVar", name: "x", loc: testLoc });

            expect(result.kind).toBe("CoreRecordUpdate");
            if (result.kind === "CoreRecordUpdate") {
                const spread = result.updates[0];
                if (spread?.kind === "Spread") {
                    expect(spread.expr).toEqual({ kind: "CoreVar", name: "x", loc: testLoc });
                }
            }
        });
    });

    describe("substitute - variants", () => {
        it("should substitute in variant constructor arguments", () => {
            // Some(x)
            const expr: CoreExpr = {
                kind: "CoreVariant",
                constructor: "Some",
                args: [{ kind: "CoreVar", name: "x", loc: testLoc }],
                loc: testLoc,
            };

            const result = substitute(expr, "x", { kind: "CoreIntLit", value: 42, loc: testLoc });

            expect(result.kind).toBe("CoreVariant");
            if (result.kind === "CoreVariant") {
                expect(result.constructor).toBe("Some");
                expect(result.args[0]).toEqual({ kind: "CoreIntLit", value: 42, loc: testLoc });
            }
        });

        it("should handle multiple variant arguments", () => {
            // Pair(x, y)
            const expr: CoreExpr = {
                kind: "CoreVariant",
                constructor: "Pair",
                args: [
                    { kind: "CoreVar", name: "x", loc: testLoc },
                    { kind: "CoreVar", name: "y", loc: testLoc },
                ],
                loc: testLoc,
            };

            const bindings = new Map<string, CoreExpr>([
                ["x", { kind: "CoreIntLit", value: 1, loc: testLoc }],
                ["y", { kind: "CoreIntLit", value: 2, loc: testLoc }],
            ]);

            const result = substituteMultiple(expr, bindings);

            expect(result.kind).toBe("CoreVariant");
            if (result.kind === "CoreVariant") {
                expect(result.args[0]).toEqual({ kind: "CoreIntLit", value: 1, loc: testLoc });
                expect(result.args[1]).toEqual({ kind: "CoreIntLit", value: 2, loc: testLoc });
            }
        });
    });

    describe("substitute - unary operations", () => {
        it("should substitute in unary operand", () => {
            // -x
            const expr: CoreExpr = {
                kind: "CoreUnaryOp",
                op: "Negate",
                expr: { kind: "CoreVar", name: "x", loc: testLoc },
                loc: testLoc,
            };

            const result = substitute(expr, "x", { kind: "CoreIntLit", value: 42, loc: testLoc });

            expect(result.kind).toBe("CoreUnaryOp");
            if (result.kind === "CoreUnaryOp") {
                expect(result.op).toBe("Negate");
                expect(result.expr).toEqual({ kind: "CoreIntLit", value: 42, loc: testLoc });
            }
        });

        it("should substitute in not operation", () => {
            // not x
            const expr: CoreExpr = {
                kind: "CoreUnaryOp",
                op: "LogicalNot",
                expr: { kind: "CoreVar", name: "x", loc: testLoc },
                loc: testLoc,
            };

            const result = substitute(expr, "x", { kind: "CoreBoolLit", value: true, loc: testLoc });

            expect(result.kind).toBe("CoreUnaryOp");
            if (result.kind === "CoreUnaryOp") {
                expect(result.expr).toEqual({ kind: "CoreBoolLit", value: true, loc: testLoc });
            }
        });
    });

    describe("substitute - tuples", () => {
        it("should substitute in tuple elements", () => {
            // (x, y, z)
            const expr: CoreExpr = {
                kind: "CoreTuple",
                elements: [
                    { kind: "CoreVar", name: "x", loc: testLoc },
                    { kind: "CoreVar", name: "y", loc: testLoc },
                    { kind: "CoreVar", name: "z", loc: testLoc },
                ],
                loc: testLoc,
            };

            const result = substitute(expr, "y", { kind: "CoreIntLit", value: 42, loc: testLoc });

            expect(result.kind).toBe("CoreTuple");
            if (result.kind === "CoreTuple") {
                expect(result.elements[0]).toEqual({ kind: "CoreVar", name: "x", loc: testLoc });
                expect(result.elements[1]).toEqual({ kind: "CoreIntLit", value: 42, loc: testLoc });
                expect(result.elements[2]).toEqual({ kind: "CoreVar", name: "z", loc: testLoc });
            }
        });
    });

    describe("substitute - type annotations", () => {
        it("should substitute in annotated expression", () => {
            // (x : Int)
            const expr: CoreExpr = {
                kind: "CoreTypeAnnotation",
                expr: { kind: "CoreVar", name: "x", loc: testLoc },
                typeExpr: { kind: "CoreTypeConst", name: "Int", loc: testLoc },
                loc: testLoc,
            };

            const result = substitute(expr, "x", { kind: "CoreIntLit", value: 42, loc: testLoc });

            expect(result.kind).toBe("CoreTypeAnnotation");
            if (result.kind === "CoreTypeAnnotation") {
                expect(result.expr).toEqual({ kind: "CoreIntLit", value: 42, loc: testLoc });
            }
        });
    });

    describe("substitute - unsafe blocks", () => {
        it("should substitute in unsafe expression", () => {
            // unsafe { x }
            const expr: CoreExpr = {
                kind: "CoreUnsafe",
                expr: { kind: "CoreVar", name: "x", loc: testLoc },
                loc: testLoc,
            };

            const result = substitute(expr, "x", { kind: "CoreIntLit", value: 42, loc: testLoc });

            expect(result.kind).toBe("CoreUnsafe");
            if (result.kind === "CoreUnsafe") {
                expect(result.expr).toEqual({ kind: "CoreIntLit", value: 42, loc: testLoc });
            }
        });
    });

    describe("substitute - let rec expressions", () => {
        it("should handle shadowing in recursive bindings", () => {
            // let rec x = 1 in x
            const expr: CoreExpr = {
                kind: "CoreLetRecExpr",
                bindings: [
                    {
                        pattern: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                        value: { kind: "CoreIntLit", value: 1, loc: testLoc },
                        mutable: false,
                        loc: testLoc,
                    },
                ],
                body: { kind: "CoreVar", name: "x", loc: testLoc },
                loc: testLoc,
            };

            // Substituting x should have no effect (shadowed)
            const result = substitute(expr, "x", { kind: "CoreIntLit", value: 99, loc: testLoc });

            expect(result.kind).toBe("CoreLetRecExpr");
            if (result.kind === "CoreLetRecExpr") {
                expect(result.body).toEqual({ kind: "CoreVar", name: "x", loc: testLoc });
            }
        });

        it("should substitute free variables in recursive binding values", () => {
            // let rec f = (x) => y in f(1)
            const expr: CoreExpr = {
                kind: "CoreLetRecExpr",
                bindings: [
                    {
                        pattern: { kind: "CoreVarPattern", name: "f", loc: testLoc },
                        value: {
                            kind: "CoreLambda",
                            param: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                            body: { kind: "CoreVar", name: "y", loc: testLoc },
                            loc: testLoc,
                        },
                        mutable: false,
                        loc: testLoc,
                    },
                ],
                body: {
                    kind: "CoreApp",
                    func: { kind: "CoreVar", name: "f", loc: testLoc },
                    args: [{ kind: "CoreIntLit", value: 1, loc: testLoc }],
                    loc: testLoc,
                },
                loc: testLoc,
            };

            const result = substitute(expr, "y", { kind: "CoreIntLit", value: 42, loc: testLoc });

            expect(result.kind).toBe("CoreLetRecExpr");
            if (result.kind === "CoreLetRecExpr") {
                const binding = result.bindings[0];
                if (binding?.value.kind === "CoreLambda") {
                    expect(binding.value.body).toEqual({ kind: "CoreIntLit", value: 42, loc: testLoc });
                }
            }
        });

        it("should handle capture avoidance in let rec", () => {
            // let rec x = 1 in y
            // Substitute y with x (would capture)
            const expr: CoreExpr = {
                kind: "CoreLetRecExpr",
                bindings: [
                    {
                        pattern: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                        value: { kind: "CoreIntLit", value: 1, loc: testLoc },
                        mutable: false,
                        loc: testLoc,
                    },
                ],
                body: { kind: "CoreVar", name: "y", loc: testLoc },
                loc: testLoc,
            };

            const result = substitute(expr, "y", { kind: "CoreVar", name: "x", loc: testLoc });

            expect(result.kind).toBe("CoreLetRecExpr");
            if (result.kind === "CoreLetRecExpr") {
                // The bound x should be renamed to avoid capture
                const pattern = result.bindings[0]?.pattern;
                if (pattern?.kind === "CoreVarPattern") {
                    expect(pattern.name).not.toBe("x");
                    expect(pattern.name).toContain("x");
                }
            }
        });

        it("should handle multiple mutually recursive bindings", () => {
            // let rec f = g and g = f in f
            const expr: CoreExpr = {
                kind: "CoreLetRecExpr",
                bindings: [
                    {
                        pattern: { kind: "CoreVarPattern", name: "f", loc: testLoc },
                        value: { kind: "CoreVar", name: "g", loc: testLoc },
                        mutable: false,
                        loc: testLoc,
                    },
                    {
                        pattern: { kind: "CoreVarPattern", name: "g", loc: testLoc },
                        value: { kind: "CoreVar", name: "f", loc: testLoc },
                        mutable: false,
                        loc: testLoc,
                    },
                ],
                body: { kind: "CoreVar", name: "f", loc: testLoc },
                loc: testLoc,
            };

            // Substituting external variable
            const result = substitute(expr, "z", { kind: "CoreIntLit", value: 42, loc: testLoc });
            expect(result).toEqual(expr); // No change

            // f and g are shadowed
            const result2 = substitute(expr, "f", { kind: "CoreIntLit", value: 99, loc: testLoc });
            expect(result2.kind).toBe("CoreLetRecExpr");
            if (result2.kind === "CoreLetRecExpr") {
                expect(result2.body).toEqual({ kind: "CoreVar", name: "f", loc: testLoc });
            }
        });
    });

    describe("substitute - match with guards", () => {
        it("should substitute in match guard expressions", () => {
            // match val { x when x > 0 => x }
            const expr: CoreExpr = {
                kind: "CoreMatch",
                expr: { kind: "CoreVar", name: "val", loc: testLoc },
                cases: [
                    {
                        pattern: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                        guard: {
                            kind: "CoreBinOp",
                            op: "GreaterThan",
                            left: { kind: "CoreVar", name: "x", loc: testLoc },
                            right: { kind: "CoreVar", name: "threshold", loc: testLoc },
                            loc: testLoc,
                        },
                        body: { kind: "CoreVar", name: "x", loc: testLoc },
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            };

            // x in guard/body should not be replaced (bound by pattern)
            const result = substitute(expr, "x", { kind: "CoreIntLit", value: 42, loc: testLoc });
            expect(result.kind).toBe("CoreMatch");
            if (result.kind === "CoreMatch" && result.cases[0]?.guard?.kind === "CoreBinOp") {
                expect(result.cases[0].guard.left).toEqual({ kind: "CoreVar", name: "x", loc: testLoc });
            }

            // threshold should be replaced in guard
            const result2 = substitute(expr, "threshold", { kind: "CoreIntLit", value: 0, loc: testLoc });
            expect(result2.kind).toBe("CoreMatch");
            if (result2.kind === "CoreMatch" && result2.cases[0]?.guard?.kind === "CoreBinOp") {
                expect(result2.cases[0].guard.right).toEqual({ kind: "CoreIntLit", value: 0, loc: testLoc });
            }
        });

        it("should handle capture avoidance in match guards", () => {
            // match val { x when y > 0 => x }
            // Substitute y with x (would capture)
            const expr: CoreExpr = {
                kind: "CoreMatch",
                expr: { kind: "CoreVar", name: "val", loc: testLoc },
                cases: [
                    {
                        pattern: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                        guard: {
                            kind: "CoreBinOp",
                            op: "GreaterThan",
                            left: { kind: "CoreVar", name: "y", loc: testLoc },
                            right: { kind: "CoreIntLit", value: 0, loc: testLoc },
                            loc: testLoc,
                        },
                        body: { kind: "CoreVar", name: "x", loc: testLoc },
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            };

            const result = substitute(expr, "y", { kind: "CoreVar", name: "x", loc: testLoc });

            expect(result.kind).toBe("CoreMatch");
            if (result.kind === "CoreMatch") {
                const pattern = result.cases[0]?.pattern;
                if (pattern?.kind === "CoreVarPattern") {
                    // Pattern should be renamed to avoid capture
                    expect(pattern.name).not.toBe("x");
                    expect(pattern.name).toContain("x");
                }
            }
        });
    });

    describe("substitute - complex patterns", () => {
        it("should handle tuple patterns in let", () => {
            // let (x, y) = val in x + y
            const expr: CoreExpr = {
                kind: "CoreLet",
                pattern: {
                    kind: "CoreTuplePattern",
                    elements: [
                        { kind: "CoreVarPattern", name: "x", loc: testLoc },
                        { kind: "CoreVarPattern", name: "y", loc: testLoc },
                    ],
                    loc: testLoc,
                },
                value: { kind: "CoreVar", name: "val", loc: testLoc },
                body: {
                    kind: "CoreBinOp",
                    op: "Add",
                    left: { kind: "CoreVar", name: "x", loc: testLoc },
                    right: { kind: "CoreVar", name: "y", loc: testLoc },
                    loc: testLoc,
                },
                mutable: false,
                recursive: false,
                loc: testLoc,
            };

            // x and y in body should not be replaced (bound)
            const result = substitute(expr, "x", { kind: "CoreIntLit", value: 99, loc: testLoc });
            expect(result.kind).toBe("CoreLet");
            if (result.kind === "CoreLet" && result.body.kind === "CoreBinOp") {
                expect(result.body.left).toEqual({ kind: "CoreVar", name: "x", loc: testLoc });
            }

            // val in value should be replaced
            const result2 = substitute(expr, "val", { kind: "CoreVar", name: "tuple", loc: testLoc });
            expect(result2.kind).toBe("CoreLet");
            if (result2.kind === "CoreLet") {
                expect(result2.value).toEqual({ kind: "CoreVar", name: "tuple", loc: testLoc });
            }
        });

        it("should handle variant patterns in match", () => {
            // match opt { Some(x) => x, None => 0 }
            const expr: CoreExpr = {
                kind: "CoreMatch",
                expr: { kind: "CoreVar", name: "opt", loc: testLoc },
                cases: [
                    {
                        pattern: {
                            kind: "CoreVariantPattern",
                            constructor: "Some",
                            args: [{ kind: "CoreVarPattern", name: "x", loc: testLoc }],
                            loc: testLoc,
                        },
                        body: { kind: "CoreVar", name: "x", loc: testLoc },
                        loc: testLoc,
                    },
                    {
                        pattern: { kind: "CoreVariantPattern", constructor: "None", args: [], loc: testLoc },
                        body: { kind: "CoreIntLit", value: 0, loc: testLoc },
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            };

            // x in Some case body should not be replaced
            const result = substitute(expr, "x", { kind: "CoreIntLit", value: 99, loc: testLoc });
            expect(result.kind).toBe("CoreMatch");
            if (result.kind === "CoreMatch") {
                expect(result.cases[0]?.body).toEqual({ kind: "CoreVar", name: "x", loc: testLoc });
            }
        });

        it("should handle record patterns in match", () => {
            // match r { { name, age } => name }
            const expr: CoreExpr = {
                kind: "CoreMatch",
                expr: { kind: "CoreVar", name: "r", loc: testLoc },
                cases: [
                    {
                        pattern: {
                            kind: "CoreRecordPattern",
                            fields: [
                                {
                                    name: "name",
                                    pattern: { kind: "CoreVarPattern", name: "name", loc: testLoc },
                                    loc: testLoc,
                                },
                                {
                                    name: "age",
                                    pattern: { kind: "CoreVarPattern", name: "age", loc: testLoc },
                                    loc: testLoc,
                                },
                            ],
                            loc: testLoc,
                        },
                        body: { kind: "CoreVar", name: "name", loc: testLoc },
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            };

            // name in body should not be replaced (bound)
            const result = substitute(expr, "name", { kind: "CoreStringLit", value: "replaced", loc: testLoc });
            expect(result.kind).toBe("CoreMatch");
            if (result.kind === "CoreMatch") {
                expect(result.cases[0]?.body).toEqual({ kind: "CoreVar", name: "name", loc: testLoc });
            }
        });

        it("should handle wildcard patterns", () => {
            // match x { _ => y }
            const expr: CoreExpr = {
                kind: "CoreMatch",
                expr: { kind: "CoreVar", name: "x", loc: testLoc },
                cases: [
                    {
                        pattern: { kind: "CoreWildcardPattern", loc: testLoc },
                        body: { kind: "CoreVar", name: "y", loc: testLoc },
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            };

            // y should be replaced
            const result = substitute(expr, "y", { kind: "CoreIntLit", value: 42, loc: testLoc });
            expect(result.kind).toBe("CoreMatch");
            if (result.kind === "CoreMatch") {
                expect(result.cases[0]?.body).toEqual({ kind: "CoreIntLit", value: 42, loc: testLoc });
            }
        });

        it("should handle literal patterns", () => {
            // match x { 0 => y }
            const expr: CoreExpr = {
                kind: "CoreMatch",
                expr: { kind: "CoreVar", name: "x", loc: testLoc },
                cases: [
                    {
                        pattern: {
                            kind: "CoreLiteralPattern",
                            literal: 0,
                            loc: testLoc,
                        },
                        body: { kind: "CoreVar", name: "y", loc: testLoc },
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            };

            // y should be replaced
            const result = substitute(expr, "y", { kind: "CoreIntLit", value: 42, loc: testLoc });
            expect(result.kind).toBe("CoreMatch");
            if (result.kind === "CoreMatch") {
                expect(result.cases[0]?.body).toEqual({ kind: "CoreIntLit", value: 42, loc: testLoc });
            }
        });
    });

    describe("substitute - lambda with complex patterns", () => {
        it("should handle tuple pattern parameters", () => {
            // ((x, y)) => x + y
            const expr: CoreExpr = {
                kind: "CoreLambda",
                param: {
                    kind: "CoreTuplePattern",
                    elements: [
                        { kind: "CoreVarPattern", name: "x", loc: testLoc },
                        { kind: "CoreVarPattern", name: "y", loc: testLoc },
                    ],
                    loc: testLoc,
                },
                body: {
                    kind: "CoreBinOp",
                    op: "Add",
                    left: { kind: "CoreVar", name: "x", loc: testLoc },
                    right: { kind: "CoreVar", name: "y", loc: testLoc },
                    loc: testLoc,
                },
                loc: testLoc,
            };

            // x and y in body should not be replaced
            const result = substitute(expr, "x", { kind: "CoreIntLit", value: 99, loc: testLoc });
            expect(result.kind).toBe("CoreLambda");
            if (result.kind === "CoreLambda" && result.body.kind === "CoreBinOp") {
                expect(result.body.left).toEqual({ kind: "CoreVar", name: "x", loc: testLoc });
            }
        });

        it("should handle capture avoidance with tuple pattern", () => {
            // ((x, y)) => z
            // Substitute z with x (would capture)
            const expr: CoreExpr = {
                kind: "CoreLambda",
                param: {
                    kind: "CoreTuplePattern",
                    elements: [
                        { kind: "CoreVarPattern", name: "x", loc: testLoc },
                        { kind: "CoreVarPattern", name: "y", loc: testLoc },
                    ],
                    loc: testLoc,
                },
                body: { kind: "CoreVar", name: "z", loc: testLoc },
                loc: testLoc,
            };

            const result = substitute(expr, "z", { kind: "CoreVar", name: "x", loc: testLoc });

            expect(result.kind).toBe("CoreLambda");
            if (result.kind === "CoreLambda") {
                const param = result.param;
                if (param.kind === "CoreTuplePattern") {
                    // The x in pattern should be renamed to avoid capture
                    const firstElem = param.elements[0];
                    if (firstElem?.kind === "CoreVarPattern") {
                        expect(firstElem.name).not.toBe("x");
                    }
                }
            }
        });
    });

    describe("substitute - nested let with no capture", () => {
        it("should handle nested let without shadowing", () => {
            // let a = x in let b = y in a + b
            const expr: CoreExpr = {
                kind: "CoreLet",
                pattern: { kind: "CoreVarPattern", name: "a", loc: testLoc },
                value: { kind: "CoreVar", name: "x", loc: testLoc },
                body: {
                    kind: "CoreLet",
                    pattern: { kind: "CoreVarPattern", name: "b", loc: testLoc },
                    value: { kind: "CoreVar", name: "y", loc: testLoc },
                    body: {
                        kind: "CoreBinOp",
                        op: "Add",
                        left: { kind: "CoreVar", name: "a", loc: testLoc },
                        right: { kind: "CoreVar", name: "b", loc: testLoc },
                        loc: testLoc,
                    },
                    mutable: false,
                    recursive: false,
                    loc: testLoc,
                },
                mutable: false,
                recursive: false,
                loc: testLoc,
            };

            // x should be replaced in outer let value
            const result = substitute(expr, "x", { kind: "CoreIntLit", value: 1, loc: testLoc });
            expect(result.kind).toBe("CoreLet");
            if (result.kind === "CoreLet") {
                expect(result.value).toEqual({ kind: "CoreIntLit", value: 1, loc: testLoc });
            }

            // y should be replaced in inner let value
            const result2 = substitute(expr, "y", { kind: "CoreIntLit", value: 2, loc: testLoc });
            expect(result2.kind).toBe("CoreLet");
            if (result2.kind === "CoreLet" && result2.body.kind === "CoreLet") {
                expect(result2.body.value).toEqual({ kind: "CoreIntLit", value: 2, loc: testLoc });
            }
        });
    });
});
