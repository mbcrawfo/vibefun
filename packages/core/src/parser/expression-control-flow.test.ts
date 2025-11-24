/**
 * Expression parsing tests - Control flow
 */

import { describe, expect, it } from "vitest";

import { ParserError } from "../utils/index.js";
import { parseExpression } from "./expression-test-helpers.js";

describe("Parser - Control Flow", () => {
    describe("block expressions", () => {
        it("should parse block with multiple expressions", () => {
            const expr = parseExpression("{ 1; 2; 3; }");

            expect(expr).toMatchObject({
                kind: "Block",
                exprs: [
                    { kind: "IntLit", value: 1 },
                    { kind: "IntLit", value: 2 },
                    { kind: "IntLit", value: 3 },
                ],
            });
        });

        it("should parse block with trailing semicolon", () => {
            const expr = parseExpression("{ 1; 2; }");

            expect(expr).toMatchObject({
                kind: "Block",
                exprs: [
                    { kind: "IntLit", value: 1 },
                    { kind: "IntLit", value: 2 },
                ],
            });
        });

        it("should parse block starting with if", () => {
            const expr = parseExpression("{ if true then 1 else 2; 3; }");

            expect(expr).toMatchObject({
                kind: "Block",
                exprs: [
                    {
                        kind: "If",
                        condition: { kind: "BoolLit", value: true },
                        then: { kind: "IntLit", value: 1 },
                        else_: { kind: "IntLit", value: 2 },
                    },
                    { kind: "IntLit", value: 3 },
                ],
            });
        });

        it("should parse nested blocks", () => {
            const expr = parseExpression("{ { 1; 2; }; 3; }");

            expect(expr).toMatchObject({
                kind: "Block",
                exprs: [
                    {
                        kind: "Block",
                        exprs: [
                            { kind: "IntLit", value: 1 },
                            { kind: "IntLit", value: 2 },
                        ],
                    },
                    { kind: "IntLit", value: 3 },
                ],
            });
        });

        it("should parse block with function calls", () => {
            const expr = parseExpression("{ print(x); y; }");

            expect(expr).toMatchObject({
                kind: "Block",
                exprs: [
                    {
                        kind: "App",
                        func: { kind: "Var", name: "print" },
                        args: [{ kind: "Var", name: "x" }],
                    },
                    { kind: "Var", name: "y" },
                ],
            });
        });

        it("should parse block with complex expressions", () => {
            const expr = parseExpression("{ (x) => x + 1; 10; }");

            expect(expr).toMatchObject({
                kind: "Block",
                exprs: [
                    {
                        kind: "Lambda",
                        params: [{ pattern: { kind: "VarPattern", name: "x" } }],
                        body: {
                            kind: "BinOp",
                            op: "Add",
                        },
                    },
                    { kind: "IntLit", value: 10 },
                ],
            });
        });

        it("should parse block in lambda body", () => {
            const expr = parseExpression("(x) => { x + 1; x; }");

            expect(expr).toMatchObject({
                kind: "Lambda",
                params: [{ pattern: { kind: "VarPattern", name: "x" } }],
                body: {
                    kind: "Block",
                    exprs: [
                        {
                            kind: "BinOp",
                            op: "Add",
                            left: { kind: "Var", name: "x" },
                            right: { kind: "IntLit", value: 1 },
                        },
                        { kind: "Var", name: "x" },
                    ],
                },
            });
        });

        it("should parse block with match expression", () => {
            const expr = parseExpression("{ match x { | 1 => a | 2 => b }; c; }");

            expect(expr).toMatchObject({
                kind: "Block",
                exprs: [
                    {
                        kind: "Match",
                        expr: { kind: "Var", name: "x" },
                    },
                    { kind: "Var", name: "c" },
                ],
            });
        });

        it("should parse single field shorthand as record (not ambiguous)", () => {
            // Single field shorthand like { x } is valid - creates record with field x
            const expr = parseExpression("{ x }");
            expect(expr.kind).toBe("Record");
            if (expr.kind !== "Record") return;
            expect(expr.fields).toHaveLength(1);
        });

        it("should throw on missing semicolon between expressions", () => {
            expect(() => parseExpression("{ 1 2 }")).toThrow(ParserError);
        });

        it("should throw on unclosed block", () => {
            expect(() => parseExpression("{ 1; 2")).toThrow(ParserError);
        });

        it("should allow single expression with semicolon", () => {
            const expr = parseExpression("{ 42; }");

            expect(expr).toMatchObject({
                kind: "Block",
                exprs: [{ kind: "IntLit", value: 42 }],
            });
        });

        it("should distinguish blocks from records", () => {
            const block = parseExpression("{ 1; 2; }");
            const record = parseExpression("{ x: 1 }");

            expect(block.kind).toBe("Block");
            expect(record.kind).toBe("Record");
        });
    });

    describe("unsafe blocks", () => {
        it("should parse unsafe block with simple expression", () => {
            const expr = parseExpression("unsafe { x }");

            expect(expr).toMatchObject({
                kind: "Unsafe",
                expr: { kind: "Var", name: "x" },
            });
            expect(expr.loc).toBeDefined();
        });

        it("should parse unsafe block with function call", () => {
            const expr = parseExpression("unsafe { log(message) }");

            expect(expr).toMatchObject({
                kind: "Unsafe",
                expr: {
                    kind: "App",
                    func: { kind: "Var", name: "log" },
                    args: [{ kind: "Var", name: "message" }],
                },
            });
        });

        it("should parse unsafe block with complex expression", () => {
            const expr = parseExpression("unsafe { x + y * 2 }");

            expect(expr).toMatchObject({
                kind: "Unsafe",
                expr: {
                    kind: "BinOp",
                    op: "Add",
                    left: { kind: "Var", name: "x" },
                    right: {
                        kind: "BinOp",
                        op: "Multiply",
                        left: { kind: "Var", name: "y" },
                        right: { kind: "IntLit", value: 2 },
                    },
                },
            });
        });

        it("should parse nested unsafe blocks", () => {
            const expr = parseExpression("unsafe { unsafe { x } }");

            expect(expr).toMatchObject({
                kind: "Unsafe",
                expr: {
                    kind: "Unsafe",
                    expr: { kind: "Var", name: "x" },
                },
            });
        });

        it("should parse unsafe block in larger expression", () => {
            const expr = parseExpression("unsafe { getValue() } + 10");

            expect(expr).toMatchObject({
                kind: "BinOp",
                op: "Add",
                left: {
                    kind: "Unsafe",
                    expr: {
                        kind: "App",
                        func: { kind: "Var", name: "getValue" },
                        args: [],
                    },
                },
                right: { kind: "IntLit", value: 10 },
            });
        });

        it("should throw on unsafe without braces", () => {
            expect(() => parseExpression("unsafe x")).toThrow(ParserError);
        });

        it("should throw on unclosed unsafe block", () => {
            expect(() => parseExpression("unsafe { x")).toThrow(ParserError);
        });

        it("should parse unsafe with record construction", () => {
            const expr = parseExpression("unsafe { { x: 1, y: 2 } }");

            expect(expr).toMatchObject({
                kind: "Unsafe",
                expr: {
                    kind: "Record",
                    fields: [
                        { name: "x", value: { kind: "IntLit", value: 1 } },
                        { name: "y", value: { kind: "IntLit", value: 2 } },
                    ],
                },
            });
        });
    });

    describe("control flow", () => {
        describe("if expressions", () => {
            it("should parse if-then-else", () => {
                const expr = parseExpression("if x then 1 else 0");

                expect(expr).toMatchObject({
                    kind: "If",
                    condition: { kind: "Var", name: "x" },
                    then: { kind: "IntLit", value: 1 },
                    else_: { kind: "IntLit", value: 0 },
                });
            });

            it("should parse if with complex condition", () => {
                const expr = parseExpression("if x > 0 then x else -x");

                expect(expr).toMatchObject({
                    kind: "If",
                    condition: {
                        kind: "BinOp",
                        op: "GreaterThan",
                        left: { kind: "Var", name: "x" },
                        right: { kind: "IntLit", value: 0 },
                    },
                    then: { kind: "Var", name: "x" },
                    else_: {
                        kind: "UnaryOp",
                        op: "Negate",
                        expr: { kind: "Var", name: "x" },
                    },
                });
            });

            it("should parse nested if expressions", () => {
                const expr = parseExpression("if a then if b then 1 else 2 else 3");

                expect(expr).toMatchObject({
                    kind: "If",
                    condition: { kind: "Var", name: "a" },
                    then: {
                        kind: "If",
                        condition: { kind: "Var", name: "b" },
                        then: { kind: "IntLit", value: 1 },
                        else_: { kind: "IntLit", value: 2 },
                    },
                    else_: { kind: "IntLit", value: 3 },
                });
            });

            it("should parse if with function calls", () => {
                const expr = parseExpression("if isEmpty(list) then 0 else length(list)");

                expect(expr).toMatchObject({
                    kind: "If",
                    condition: {
                        kind: "App",
                        func: { kind: "Var", name: "isEmpty" },
                        args: [{ kind: "Var", name: "list" }],
                    },
                    then: { kind: "IntLit", value: 0 },
                    else_: {
                        kind: "App",
                        func: { kind: "Var", name: "length" },
                        args: [{ kind: "Var", name: "list" }],
                    },
                });
            });
        });

        describe("if-without-else (parser inserts Unit literal)", () => {
            it("should parse if-without-else and insert Unit literal", () => {
                const expr = parseExpression("if x then action()");

                expect(expr).toMatchObject({
                    kind: "If",
                    condition: { kind: "Var", name: "x" },
                    then: {
                        kind: "App",
                        func: { kind: "Var", name: "action" },
                        args: [],
                    },
                    else_: { kind: "UnitLit" },
                });
            });

            it("should parse if-without-else with complex condition", () => {
                const expr = parseExpression("if x > 0 then step()");

                expect(expr).toMatchObject({
                    kind: "If",
                    condition: {
                        kind: "BinOp",
                        op: "GreaterThan",
                        left: { kind: "Var", name: "x" },
                        right: { kind: "IntLit", value: 0 },
                    },
                    then: {
                        kind: "App",
                        func: { kind: "Var", name: "step" },
                        args: [],
                    },
                    else_: { kind: "UnitLit" },
                });
            });

            it("should verify else_ field is never undefined", () => {
                const expr = parseExpression("if cond then 1");

                expect(expr).toMatchObject({
                    kind: "If",
                    else_: { kind: "UnitLit" },
                });
                // Explicitly verify else_ is defined
                if (expr.kind === "If") {
                    expect(expr.else_).toBeDefined();
                    expect(expr.else_).not.toBeNull();
                    expect(expr.else_).not.toBeUndefined();
                }
            });

            it("should parse if-without-else in block context", () => {
                const expr = parseExpression("{ if flag then update(); result; }");

                expect(expr.kind).toBe("Block");
                if (expr.kind !== "Block") return;

                const ifExpr = expr.exprs[0];
                expect(ifExpr).toMatchObject({
                    kind: "If",
                    else_: { kind: "UnitLit" },
                });
            });

            it("should verify UnitLit has location information", () => {
                const expr = parseExpression("if x then y");

                if (expr.kind !== "If") {
                    throw new Error("Expected If expression");
                }

                // Verify else_ is UnitLit with location
                expect(expr.else_.kind).toBe("UnitLit");
                expect(expr.else_.loc).toBeDefined();
                expect(expr.else_.loc.file).toBe("test.vf");
            });
        });

        describe("match expressions", () => {
            it("should parse match with single case", () => {
                const expr = parseExpression("match x { | y => y + 1 }");

                expect(expr).toMatchObject({
                    kind: "Match",
                    expr: { kind: "Var", name: "x" },
                    cases: [
                        {
                            pattern: { kind: "VarPattern", name: "y" },
                            body: {
                                kind: "BinOp",
                                op: "Add",
                                left: { kind: "Var", name: "y" },
                                right: { kind: "IntLit", value: 1 },
                            },
                        },
                    ],
                });
            });

            it("should parse match with multiple cases", () => {
                const expr = parseExpression("match x { | a => 1 | b => 2 | c => 3 }");

                expect(expr).toMatchObject({
                    kind: "Match",
                    expr: { kind: "Var", name: "x" },
                    cases: [
                        {
                            pattern: { kind: "VarPattern", name: "a" },
                            body: { kind: "IntLit", value: 1 },
                        },
                        {
                            pattern: { kind: "VarPattern", name: "b" },
                            body: { kind: "IntLit", value: 2 },
                        },
                        {
                            pattern: { kind: "VarPattern", name: "c" },
                            body: { kind: "IntLit", value: 3 },
                        },
                    ],
                });
            });

            it("should parse match with wildcard pattern", () => {
                const expr = parseExpression("match x { | _ => 0 }");

                expect(expr).toMatchObject({
                    kind: "Match",
                    expr: { kind: "Var", name: "x" },
                    cases: [
                        {
                            pattern: { kind: "WildcardPattern" },
                            body: { kind: "IntLit", value: 0 },
                        },
                    ],
                });
            });

            it("should parse match with guard", () => {
                const expr = parseExpression("match x { | n when n > 0 => n | _ => 0 }");

                expect(expr).toMatchObject({
                    kind: "Match",
                    expr: { kind: "Var", name: "x" },
                    cases: [
                        {
                            pattern: { kind: "VarPattern", name: "n" },
                            guard: {
                                kind: "BinOp",
                                op: "GreaterThan",
                                left: { kind: "Var", name: "n" },
                                right: { kind: "IntLit", value: 0 },
                            },
                            body: { kind: "Var", name: "n" },
                        },
                        {
                            pattern: { kind: "WildcardPattern" },
                            body: { kind: "IntLit", value: 0 },
                        },
                    ],
                });
            });

            it("should require leading pipes for all cases", () => {
                const expr = parseExpression("match x { | a => 1 | b => 2 }");

                expect(expr).toMatchObject({
                    kind: "Match",
                    expr: { kind: "Var", name: "x" },
                    cases: [
                        {
                            pattern: { kind: "VarPattern", name: "a" },
                            body: { kind: "IntLit", value: 1 },
                        },
                        {
                            pattern: { kind: "VarPattern", name: "b" },
                            body: { kind: "IntLit", value: 2 },
                        },
                    ],
                });
            });

            it("should parse lambda as match case body", () => {
                const expr = parseExpression("match x { | Some(v) => v => v + 1 | None => () => 0 }");

                expect(expr.kind).toBe("Match");
                if (expr.kind !== "Match") return;

                expect(expr.expr).toMatchObject({ kind: "Var", name: "x" });
                expect(expr.cases).toHaveLength(2);

                // First case: Some(v) => v => v + 1
                const case1 = expr.cases[0];
                expect(case1?.pattern.kind).toBe("ConstructorPattern");
                if (case1?.pattern.kind === "ConstructorPattern") {
                    expect(case1.pattern.constructor).toBe("Some");
                    expect(case1.pattern.args).toHaveLength(1);
                }
                expect(case1?.body.kind).toBe("Lambda");

                // Second case: None => () => 0
                const case2 = expr.cases[1];
                expect(case2?.pattern.kind).toBe("ConstructorPattern");
                if (case2?.pattern.kind === "ConstructorPattern") {
                    expect(case2.pattern.constructor).toBe("None");
                    expect(case2.pattern.args).toHaveLength(0);
                }
                expect(case2?.body.kind).toBe("Lambda");
            });

            it("should parse match with complex expressions", () => {
                const expr = parseExpression("match getValue() { | x => x * 2 + 1 }");

                expect(expr).toMatchObject({
                    kind: "Match",
                    expr: {
                        kind: "App",
                        func: { kind: "Var", name: "getValue" },
                        args: [],
                    },
                    cases: [
                        {
                            pattern: { kind: "VarPattern", name: "x" },
                            body: {
                                kind: "BinOp",
                                op: "Add",
                                left: {
                                    kind: "BinOp",
                                    op: "Multiply",
                                    left: { kind: "Var", name: "x" },
                                    right: { kind: "IntLit", value: 2 },
                                },
                                right: { kind: "IntLit", value: 1 },
                            },
                        },
                    ],
                });
            });
        });
    });
});
