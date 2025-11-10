/**
 * While Loop Expression Tests
 *
 * Tests parsing of while loop expressions
 */

import { describe, expect, it } from "vitest";

import { Lexer } from "../lexer/index.js";
import type { Expr } from "../types/ast.js";
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

describe("While Loop Expressions", () => {
    describe("Basic While Loops", () => {
        it("should parse simple while loop", () => {
            const expr = parse("let x = while true { print(42) }");
            expect(expr.kind).toBe("While");
            if (expr.kind !== "While") return;
            expect(expr.condition.kind).toBe("BoolLit");
            expect(expr.body.kind).toBe("Block");
        });

        it("should parse while loop with variable condition", () => {
            const expr = parse("let x = while running { step() }");
            expect(expr.kind).toBe("While");
            if (expr.kind !== "While") return;
            expect(expr.condition.kind).toBe("Var");
            if (expr.condition.kind !== "Var") return;
            expect(expr.condition.name).toBe("running");
        });

        it("should parse while loop with comparison condition", () => {
            const expr = parse("let x = while i < 10 { i := i + 1 }");
            expect(expr.kind).toBe("While");
            if (expr.kind !== "While") return;
            expect(expr.condition.kind).toBe("BinOp");
            if (expr.condition.kind !== "BinOp") return;
            expect(expr.condition.op).toBe("LessThan");
        });

        it("should parse while loop with complex boolean condition", () => {
            const expr = parse("let x = while i < 10 && !done { step() }");
            expect(expr.kind).toBe("While");
            if (expr.kind !== "While") return;
            expect(expr.condition.kind).toBe("BinOp");
            if (expr.condition.kind !== "BinOp") return;
            expect(expr.condition.op).toBe("LogicalAnd");
        });
    });

    describe("While Loop Bodies", () => {
        it("should parse while with single statement body", () => {
            const expr = parse("let x = while true { print(42) }");
            expect(expr.kind).toBe("While");
            if (expr.kind !== "While") return;
            expect(expr.body.kind).toBe("Block");
            if (expr.body.kind !== "Block") return;
            expect(expr.body.exprs).toHaveLength(1);
        });

        it("should parse while with multiple statement body", () => {
            const expr = parse("let x = while true { let y = 1; print(y); x := x + 1 }");
            expect(expr.kind).toBe("While");
            if (expr.kind !== "While") return;
            expect(expr.body.kind).toBe("Block");
            if (expr.body.kind !== "Block") return;
            expect(expr.body.exprs.length).toBeGreaterThan(1);
        });

        it("should parse while with nested if in body", () => {
            const expr = parse("let x = while true { if x > 10 then break() else step() }");
            expect(expr.kind).toBe("While");
            if (expr.kind !== "While") return;
            expect(expr.body.kind).toBe("Block");
        });

        it("should parse while with match in body", () => {
            const expr = parse("let x = while true { match state { | Running => step() | Done => () } }");
            expect(expr.kind).toBe("While");
            if (expr.kind !== "While") return;
            expect(expr.body.kind).toBe("Block");
        });
    });

    describe("Nested While Loops", () => {
        it("should parse nested while loops", () => {
            const expr = parse("let x = while i < 10 { while j < 10 { process(i, j) } }");
            expect(expr.kind).toBe("While");
            if (expr.kind !== "While") return;

            // Body should contain another while
            expect(expr.body.kind).toBe("Block");
            if (expr.body.kind !== "Block") return;
            const innerExpr = expr.body.exprs[0];
            expect(innerExpr?.kind).toBe("While");
        });

        it("should parse multiple while loops in sequence", () => {
            const expr = parse("let x = { while a { f() }; while b { g() } }");
            expect(expr.kind).toBe("Block");
            if (expr.kind !== "Block") return;
            expect(expr.exprs[0]?.kind).toBe("While");
            expect(expr.exprs[1]?.kind).toBe("While");
        });
    });

    describe("While Loops in Different Contexts", () => {
        it("should parse while in let binding", () => {
            const expr = parse("let result = while cond { step() }");
            expect(expr.kind).toBe("While");
        });

        it("should parse while in function call argument", () => {
            const expr = parse("let x = run(while true { step() })");
            expect(expr.kind).toBe("Call");
            if (expr.kind !== "Call") return;
            const arg = expr.args[0];
            expect(arg?.kind).toBe("While");
        });

        it("should parse while in record field", () => {
            const expr = parse("let config = { loop: while true { step() } }");
            expect(expr.kind).toBe("Record");
            if (expr.kind !== "Record") return;
            const field = expr.fields[0];
            if (!field || field.kind !== "Field") return;
            expect(field.value.kind).toBe("While");
        });

        it("should parse while in if branch", () => {
            const expr = parse("let x = if start then while running { step() } else ()");
            expect(expr.kind).toBe("If");
            if (expr.kind !== "If") return;
            expect(expr.then.kind).toBe("While");
        });

        it("should parse while in match case", () => {
            const expr = parse("let x = match mode { | Loop => while true { step() } | _ => () }");
            expect(expr.kind).toBe("Match");
            if (expr.kind !== "Match") return;
            const firstCase = expr.cases[0];
            expect(firstCase?.body.kind).toBe("While");
        });
    });

    describe("While Loop Edge Cases", () => {
        it("should parse while with function call condition", () => {
            const expr = parse("let x = while shouldContinue() { step() }");
            expect(expr.kind).toBe("While");
            if (expr.kind !== "While") return;
            expect(expr.condition.kind).toBe("Call");
        });

        it("should parse while with dereference in condition", () => {
            const expr = parse("let x = while !running { step() }");
            expect(expr.kind).toBe("While");
            if (expr.kind !== "While") return;
            expect(expr.condition.kind).toBe("UnaryOp");
            if (expr.condition.kind !== "UnaryOp") return;
            expect(expr.condition.op).toBe("LogicalNot");
        });

        it("should parse while with record access in condition", () => {
            const expr = parse("let x = while state.running { step() }");
            expect(expr.kind).toBe("While");
            if (expr.kind !== "While") return;
            expect(expr.condition.kind).toBe("RecordAccess");
        });

        it("should parse while with empty block body", () => {
            const expr = parse("let x = while true { () }");
            expect(expr.kind).toBe("While");
            if (expr.kind !== "While") return;
            expect(expr.body.kind).toBe("Block");
        });
    });

    describe("While with Type Annotations", () => {
        it("should parse while with type annotation", () => {
            const expr = parse("let x: Unit = while true { step() }");
            expect(expr.kind).toBe("TypeAnnotation");
            if (expr.kind !== "TypeAnnotation") return;
            expect(expr.expr.kind).toBe("While");
        });
    });
});
