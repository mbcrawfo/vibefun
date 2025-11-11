/**
 * Lambda Precedence Tests
 *
 * Tests lambda expressions at precedence level 0 (lowest)
 * Lambdas have the lowest precedence and are right-associative
 */

import type { Expr } from "../types/ast.js";

import { describe, expect, it } from "vitest";

import { Lexer } from "../lexer/index.js";
import { Parser } from "./parser.js";

function parse(source: string): Expr {
    const lexer = new Lexer(source, "test.vf");
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens, "test.vf");
    const module = parser.parse();
    const firstDecl = module.declarations[0];
    if (!firstDecl || firstDecl.kind !== "LetDecl") {
        throw new Error("Expected LetDecl");
    }
    return firstDecl.value;
}

describe("Lambda Precedence - Level 0", () => {
    it("should parse single-parameter lambda without parens", () => {
        const expr = parse("let f = x => x + 1");
        expect(expr.kind).toBe("Lambda");
        if (expr.kind !== "Lambda") return;
        expect(expr.params).toHaveLength(1);
        expect(expr.body.kind).toBe("BinOp");
    });

    it("should parse multi-parameter lambda with parens", () => {
        const expr = parse("let f = (x, y) => x + y");
        expect(expr.kind).toBe("Lambda");
        if (expr.kind !== "Lambda") return;
        expect(expr.params).toHaveLength(2);
    });

    describe("Right Associativity", () => {
        it("should parse x => y => z as x => (y => z)", () => {
            const expr = parse("let f = x => y => z");
            expect(expr.kind).toBe("Lambda");
            if (expr.kind !== "Lambda") return;
            expect(expr.params).toHaveLength(1);

            // Body should be another lambda
            const body = expr.body;
            expect(body.kind).toBe("Lambda");
            if (body.kind !== "Lambda") return;
            expect(body.params).toHaveLength(1);

            // Inner body should be variable z
            expect(body.body.kind).toBe("Var");
        });

        it("should parse a => b => c => d as nested right-associative", () => {
            const expr = parse("let f = a => b => c => d");
            expect(expr.kind).toBe("Lambda");
            if (expr.kind !== "Lambda") return;

            // a => (b => (c => d))
            let current = expr.body;
            expect(current.kind).toBe("Lambda"); // b =>
            if (current.kind !== "Lambda") return;

            current = current.body;
            expect(current.kind).toBe("Lambda"); // c =>
            if (current.kind !== "Lambda") return;

            current = current.body;
            expect(current.kind).toBe("Var"); // d
        });
    });

    describe("Lambda Body Extends to End", () => {
        it("should parse x => x + 1 * 2 with full expression as body", () => {
            const expr = parse("let f = x => x + 1 * 2");
            expect(expr.kind).toBe("Lambda");
            if (expr.kind !== "Lambda") return;

            // Body should be entire expression: x + (1 * 2)
            expect(expr.body.kind).toBe("BinOp");
            if (expr.body.kind !== "BinOp") return;
            expect(expr.body.op).toBe("Add");
        });

        it("should parse x => if y then 1 else 2 with if as body", () => {
            const expr = parse("let f = x => if y then 1 else 2");
            expect(expr.kind).toBe("Lambda");
            if (expr.kind !== "Lambda") return;
            expect(expr.body.kind).toBe("If");
        });

        it("should parse x => match y { | Some(v) => v | None => 0 }", () => {
            const expr = parse("let f = x => match y { | Some(v) => v | None => 0 }");
            expect(expr.kind).toBe("Lambda");
            if (expr.kind !== "Lambda") return;
            expect(expr.body.kind).toBe("Match");
        });
    });

    describe("Lambda with Other Operators", () => {
        it("should parse x => y := 42 (ref assign in body)", () => {
            const expr = parse("let f = x => y := 42");
            expect(expr.kind).toBe("Lambda");
            if (expr.kind !== "Lambda") return;
            expect(expr.body.kind).toBe("BinOp");
            if (expr.body.kind !== "BinOp") return;
            expect(expr.body.op).toBe("RefAssign");
        });

        it("should parse x => y :: ys (cons in body)", () => {
            const expr = parse("let f = x => y :: ys");
            expect(expr.kind).toBe("Lambda");
            if (expr.kind !== "Lambda") return;
            expect(expr.body.kind).toBe("BinOp");
            if (expr.body.kind !== "BinOp") return;
            expect(expr.body.op).toBe("Cons");
        });

        it("should parse x => y |> f (pipe in body)", () => {
            const expr = parse("let f = x => y |> f");
            expect(expr.kind).toBe("Lambda");
            if (expr.kind !== "Lambda") return;
            expect(expr.body.kind).toBe("Pipe");
        });
    });

    describe("Lambda in Different Contexts", () => {
        it.skip("should parse lambda in function call: map (x => x + 1) list", () => {
            const expr = parse("let result = map (x => x + 1) list");
            expect(expr.kind).toBe("App");
            if (expr.kind !== "App") return;

            // First arg should be lambda
            const firstArg = expr.args[0];
            if (!firstArg) throw new Error("Expected first argument");
            expect(firstArg.kind).toBe("Lambda");
        });

        it("should parse lambda in record: { transform: x => x * 2 }", () => {
            const expr = parse("let config = { transform: x => x * 2 }");
            expect(expr.kind).toBe("Record");
            if (expr.kind !== "Record") return;

            const field = expr.fields[0];
            if (!field || field.kind !== "Field") throw new Error("Expected field");
            expect(field.value.kind).toBe("Lambda");
        });

        it("should parse lambda in list: [x => x + 1, y => y * 2]", () => {
            const expr = parse("let fns = [x => x + 1, y => y * 2]");
            expect(expr.kind).toBe("List");
            if (expr.kind !== "List") return;

            const first = expr.elements[0];
            if (!first || first.kind !== "Element") throw new Error("Expected element");
            expect(first.expr.kind).toBe("Lambda");

            const second = expr.elements[1];
            if (!second || second.kind !== "Element") throw new Error("Expected element");
            expect(second.expr.kind).toBe("Lambda");
        });

        it("should parse lambda in tuple: (x => x, y => y)", () => {
            const expr = parse("let pair = (x => x, y => y)");
            expect(expr.kind).toBe("Tuple");
            if (expr.kind !== "Tuple") return;
            expect(expr.elements).toHaveLength(2);
            expect(expr.elements[0]?.kind).toBe("Lambda");
            expect(expr.elements[1]?.kind).toBe("Lambda");
        });
    });

    describe("Complex Lambda Expressions", () => {
        it("should parse lambda returning lambda: x => (y => x + y)", () => {
            const expr = parse("let f = x => (y => x + y)");
            expect(expr.kind).toBe("Lambda");
            if (expr.kind !== "Lambda") return;

            // Due to right-associativity, x => y => x + y is same as x => (y => x + y)
            const body = expr.body;
            expect(body.kind).toBe("Lambda");
        });

        it("should parse lambda with block body: x => { let y = x * 2; y + 1 }", () => {
            const expr = parse("let f = x => { let y = x * 2; y + 1 }");
            expect(expr.kind).toBe("Lambda");
            if (expr.kind !== "Lambda") return;
            expect(expr.body.kind).toBe("Block");
        });

        it("should parse lambda with pattern matching: (x, y) => match (x, y) { | (0, 0) => 0 | _ => 1 }", () => {
            const expr = parse("let f = (x, y) => match (x, y) { | (0, 0) => 0 | _ => 1 }");
            expect(expr.kind).toBe("Lambda");
            if (expr.kind !== "Lambda") return;
            expect(expr.params).toHaveLength(2);
            expect(expr.body.kind).toBe("Match");
        });
    });
});
