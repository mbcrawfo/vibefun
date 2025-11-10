/**
 * Tuple Expression and Pattern Tests
 *
 * Tests parsing of tuple expressions and tuple patterns
 */

import { describe, expect, it } from "vitest";

import { Lexer } from "../lexer/index.js";
import type { Expr, Pattern } from "../types/ast.js";
import { Parser } from "./parser.js";

function parseExpr(source: string): Expr {
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

function parsePattern(source: string): Pattern {
    const lexer = new Lexer(source, "test.vf");
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens, "test.vf");
    const module = parser.parse();
    const firstDecl = module.declarations[0];
    if (!firstDecl || firstDecl.kind !== "LetDecl") {
        throw new Error("Expected LetDecl");
    }
    return firstDecl.pattern;
}

describe("Tuple Expressions", () => {
    describe("Basic Tuples", () => {
        it("should parse 2-tuple", () => {
            const expr = parseExpr("let x = (1, 2)");
            expect(expr.kind).toBe("Tuple");
            if (expr.kind !== "Tuple") return;
            expect(expr.elements).toHaveLength(2);
        });

        it("should parse 3-tuple", () => {
            const expr = parseExpr("let x = (1, 2, 3)");
            expect(expr.kind).toBe("Tuple");
            if (expr.kind !== "Tuple") return;
            expect(expr.elements).toHaveLength(3);
        });

        it("should parse 4-tuple", () => {
            const expr = parseExpr("let x = (1, 2, 3, 4)");
            expect(expr.kind).toBe("Tuple");
            if (expr.kind !== "Tuple") return;
            expect(expr.elements).toHaveLength(4);
        });

        it("should NOT parse single element as tuple (grouped expression)", () => {
            const expr = parseExpr("let x = (1)");
            // Single element in parens is just grouping, not a tuple
            expect(expr.kind).toBe("IntLit");
        });

        it("should NOT parse empty parens as tuple (unit)", () => {
            const expr = parseExpr("let x = ()");
            // Empty parens are unit, not a 0-tuple
            expect(expr.kind).toBe("UnitLit");
        });
    });

    describe("Tuple with Different Types", () => {
        it("should parse tuple with mixed literal types", () => {
            const expr = parseExpr("let x = (1, \"hello\", true)");
            expect(expr.kind).toBe("Tuple");
            if (expr.kind !== "Tuple") return;
            expect(expr.elements[0]?.kind).toBe("IntLit");
            expect(expr.elements[1]?.kind).toBe("StringLit");
            expect(expr.elements[2]?.kind).toBe("BoolLit");
        });

        it("should parse tuple with variables", () => {
            const expr = parseExpr("let x = (a, b, c)");
            expect(expr.kind).toBe("Tuple");
            if (expr.kind !== "Tuple") return;
            expect(expr.elements[0]?.kind).toBe("Var");
            expect(expr.elements[1]?.kind).toBe("Var");
            expect(expr.elements[2]?.kind).toBe("Var");
        });

        it("should parse tuple with expressions", () => {
            const expr = parseExpr("let x = (a + 1, b * 2, c - 3)");
            expect(expr.kind).toBe("Tuple");
            if (expr.kind !== "Tuple") return;
            expect(expr.elements[0]?.kind).toBe("BinOp");
            expect(expr.elements[1]?.kind).toBe("BinOp");
            expect(expr.elements[2]?.kind).toBe("BinOp");
        });

        it("should parse tuple with function calls", () => {
            const expr = parseExpr("let x = (f(), g(1), h(2, 3))");
            expect(expr.kind).toBe("Tuple");
            if (expr.kind !== "Tuple") return;
            expect(expr.elements[0]?.kind).toBe("App");
            expect(expr.elements[1]?.kind).toBe("App");
            expect(expr.elements[2]?.kind).toBe("App");
        });
    });

    describe("Nested Tuples", () => {
        it("should parse tuple containing tuples", () => {
            const expr = parseExpr("let x = ((1, 2), (3, 4))");
            expect(expr.kind).toBe("Tuple");
            if (expr.kind !== "Tuple") return;
            expect(expr.elements).toHaveLength(2);
            expect(expr.elements[0]?.kind).toBe("Tuple");
            expect(expr.elements[1]?.kind).toBe("Tuple");
        });

        it("should parse deeply nested tuples", () => {
            const expr = parseExpr("let x = (1, (2, (3, 4)))");
            expect(expr.kind).toBe("Tuple");
            if (expr.kind !== "Tuple") return;
            expect(expr.elements).toHaveLength(2);
            const second = expr.elements[1];
            expect(second?.kind).toBe("Tuple");
            if (second?.kind !== "Tuple") return;
            const inner = second.elements[1];
            expect(inner?.kind).toBe("Tuple");
        });
    });

    describe("Tuples in Different Contexts", () => {
        it("should parse tuple in function call", () => {
            const expr = parseExpr("let x = f((1, 2))");
            expect(expr.kind).toBe("App");
            if (expr.kind !== "App") return;
            const arg = expr.args[0];
            expect(arg?.kind).toBe("Tuple");
        });

        it("should parse tuple in list", () => {
            const expr = parseExpr("let x = [(1, 2), (3, 4)]");
            expect(expr.kind).toBe("List");
            if (expr.kind !== "List") return;
            const first = expr.elements[0];
            if (!first || first.kind !== "Element") return;
            expect(first.value.kind).toBe("Tuple");
        });

        it("should parse tuple in record field", () => {
            const expr = parseExpr("let x = { point: (1, 2) }");
            expect(expr.kind).toBe("Record");
            if (expr.kind !== "Record") return;
            const field = expr.fields[0];
            if (!field || field.kind !== "Field") return;
            expect(field.value.kind).toBe("Tuple");
        });

        it("should parse tuple in match scrutinee", () => {
            const expr = parseExpr("let x = match (1, 2) { | (a, b) => a + b }");
            expect(expr.kind).toBe("Match");
            if (expr.kind !== "Match") return;
            expect(expr.expr.kind).toBe("Tuple");
        });
    });

    describe("Tuple vs Lambda Disambiguation", () => {
        it("should parse (x, y) => body as lambda, not tuple", () => {
            const expr = parseExpr("let f = (x, y) => x + y");
            expect(expr.kind).toBe("Lambda");
            if (expr.kind !== "Lambda") return;
            expect(expr.params).toHaveLength(2);
        });

        it("should parse (x, y) without arrow as tuple", () => {
            const expr = parseExpr("let t = (x, y)");
            expect(expr.kind).toBe("Tuple");
            if (expr.kind !== "Tuple") return;
            expect(expr.elements).toHaveLength(2);
        });
    });
});

describe("Tuple Patterns", () => {
    describe("Basic Tuple Patterns", () => {
        it("should parse 2-tuple pattern", () => {
            const pattern = parsePattern("let (x, y) = pair");
            expect(pattern.kind).toBe("TuplePattern");
            if (pattern.kind !== "TuplePattern") return;
            expect(pattern.elements).toHaveLength(2);
        });

        it("should parse 3-tuple pattern", () => {
            const pattern = parsePattern("let (x, y, z) = triple");
            expect(pattern.kind).toBe("TuplePattern");
            if (pattern.kind !== "TuplePattern") return;
            expect(pattern.elements).toHaveLength(3);
        });

        it("should parse empty tuple pattern (unit)", () => {
            const pattern = parsePattern("let () = unit");
            expect(pattern.kind).toBe("TuplePattern");
            if (pattern.kind !== "TuplePattern") return;
            expect(pattern.elements).toHaveLength(0);
        });

        it("should NOT parse single element as tuple pattern (grouped)", () => {
            const pattern = parsePattern("let (x) = value");
            // Single element is just a grouped variable pattern
            expect(pattern.kind).toBe("VarPattern");
        });
    });

    describe("Tuple Patterns with Different Element Patterns", () => {
        it("should parse tuple pattern with variable patterns", () => {
            const pattern = parsePattern("let (a, b, c) = value");
            expect(pattern.kind).toBe("TuplePattern");
            if (pattern.kind !== "TuplePattern") return;
            expect(pattern.elements[0]?.kind).toBe("VarPattern");
            expect(pattern.elements[1]?.kind).toBe("VarPattern");
            expect(pattern.elements[2]?.kind).toBe("VarPattern");
        });

        it("should parse tuple pattern with wildcard patterns", () => {
            const pattern = parsePattern("let (x, _, z) = value");
            expect(pattern.kind).toBe("TuplePattern");
            if (pattern.kind !== "TuplePattern") return;
            expect(pattern.elements[0]?.kind).toBe("VarPattern");
            expect(pattern.elements[1]?.kind).toBe("WildcardPattern");
            expect(pattern.elements[2]?.kind).toBe("VarPattern");
        });

        it("should parse tuple pattern with literal patterns", () => {
            const pattern = parsePattern("let (1, x, true) = value");
            expect(pattern.kind).toBe("TuplePattern");
            if (pattern.kind !== "TuplePattern") return;
            expect(pattern.elements[0]?.kind).toBe("LiteralPattern");
            expect(pattern.elements[1]?.kind).toBe("VarPattern");
            expect(pattern.elements[2]?.kind).toBe("LiteralPattern");
        });

        it("should parse tuple pattern with constructor patterns", () => {
            const pattern = parsePattern("let (Some(x), None, y) = value");
            expect(pattern.kind).toBe("TuplePattern");
            if (pattern.kind !== "TuplePattern") return;
            expect(pattern.elements[0]?.kind).toBe("ConstructorPattern");
            expect(pattern.elements[1]?.kind).toBe("ConstructorPattern");
            expect(pattern.elements[2]?.kind).toBe("VarPattern");
        });
    });

    describe("Nested Tuple Patterns", () => {
        it("should parse tuple pattern containing tuple patterns", () => {
            const pattern = parsePattern("let ((a, b), (c, d)) = value");
            expect(pattern.kind).toBe("TuplePattern");
            if (pattern.kind !== "TuplePattern") return;
            expect(pattern.elements).toHaveLength(2);
            expect(pattern.elements[0]?.kind).toBe("TuplePattern");
            expect(pattern.elements[1]?.kind).toBe("TuplePattern");
        });

        it("should parse deeply nested tuple patterns", () => {
            const pattern = parsePattern("let (x, (y, (z, w))) = value");
            expect(pattern.kind).toBe("TuplePattern");
            if (pattern.kind !== "TuplePattern") return;
            const second = pattern.elements[1];
            expect(second?.kind).toBe("TuplePattern");
            if (second?.kind !== "TuplePattern") return;
            const inner = second.elements[1];
            expect(inner?.kind).toBe("TuplePattern");
        });
    });

    describe("Tuple Patterns in Match", () => {
        it("should parse tuple pattern in match case", () => {
            const expr = parseExpr("let x = match pair { | (1, 2) => true | _ => false }");
            expect(expr.kind).toBe("Match");
            if (expr.kind !== "Match") return;
            const firstCase = expr.cases[0];
            expect(firstCase?.pattern.kind).toBe("TuplePattern");
        });

        it("should parse multiple tuple patterns in match", () => {
            const expr = parseExpr("let x = match point { | (0, 0) => \"origin\" | (x, 0) => \"x-axis\" | (0, y) => \"y-axis\" | _ => \"other\" }");
            expect(expr.kind).toBe("Match");
            if (expr.kind !== "Match") return;
            expect(expr.cases[0]?.pattern.kind).toBe("TuplePattern");
            expect(expr.cases[1]?.pattern.kind).toBe("TuplePattern");
            expect(expr.cases[2]?.pattern.kind).toBe("TuplePattern");
        });

        it("should parse nested tuple pattern in match", () => {
            const expr = parseExpr("let x = match data { | ((a, b), c) => a + b + c | _ => 0 }");
            expect(expr.kind).toBe("Match");
            if (expr.kind !== "Match") return;
            const pattern = expr.cases[0]?.pattern;
            expect(pattern?.kind).toBe("TuplePattern");
            if (pattern?.kind !== "TuplePattern") return;
            expect(pattern.elements[0]?.kind).toBe("TuplePattern");
        });
    });

    describe("Tuple Pattern Edge Cases", () => {
        it("should parse tuple pattern with all wildcards", () => {
            const pattern = parsePattern("let (_, _, _) = value");
            expect(pattern.kind).toBe("TuplePattern");
            if (pattern.kind !== "TuplePattern") return;
            expect(pattern.elements.every((e) => e.kind === "WildcardPattern")).toBe(true);
        });

        it("should parse tuple pattern with record pattern inside", () => {
            const pattern = parsePattern("let ({ x }, y) = value");
            expect(pattern.kind).toBe("TuplePattern");
            if (pattern.kind !== "TuplePattern") return;
            expect(pattern.elements[0]?.kind).toBe("RecordPattern");
            expect(pattern.elements[1]?.kind).toBe("VarPattern");
        });

        it("should parse tuple pattern with list pattern inside", () => {
            const pattern = parsePattern("let ([x, y], z) = value");
            expect(pattern.kind).toBe("TuplePattern");
            if (pattern.kind !== "TuplePattern") return;
            expect(pattern.elements[0]?.kind).toBe("ListPattern");
            expect(pattern.elements[1]?.kind).toBe("VarPattern");
        });
    });
});
