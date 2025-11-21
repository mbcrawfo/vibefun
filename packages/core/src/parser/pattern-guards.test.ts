/**
 * Pattern Guards (when clauses) - Test Suite
 *
 * Tests for pattern guards in match expressions per spec:
 * docs/spec/05-pattern-matching/advanced-patterns.md:135-308
 *
 * Guards add Boolean conditions to patterns, allowing more precise matching
 * based on runtime values. Variables bound in patterns are in scope within guards.
 */

import type { Expr } from "../types/index.js";

import { describe, expect, it } from "vitest";

import { Lexer } from "../lexer/index.js";
import { Parser } from "./parser.js";

// Helper to create a parser and parse an expression
function parseExpression(source: string): Expr {
    const lexer = new Lexer(source.trim(), "test.vf");
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens, "test.vf");
    return parser.parseExpression();
}

describe("Pattern Guards (when clauses)", () => {
    describe("basic guard syntax", () => {
        it("should parse simple guard with variable pattern", () => {
            const source = `
                match n {
                    | x when x > 0 => "positive"
                    | _ => "non-positive"
                }
            `;
            const ast = parseExpression(source);

            expect(ast.kind).toBe("Match");
            if (ast.kind === "Match") {
                expect(ast.cases).toHaveLength(2);

                // First case with guard
                const case1 = ast.cases[0];
                expect(case1?.pattern.kind).toBe("VarPattern");
                expect(case1?.guard).toBeDefined();
                expect(case1?.guard?.kind).toBe("BinOp");
                if (case1?.guard?.kind === "BinOp") {
                    expect(case1.guard.op).toBe("GreaterThan");
                }

                // Second case without guard
                const case2 = ast.cases[1];
                expect(case2?.pattern.kind).toBe("WildcardPattern");
                expect(case2?.guard).toBeUndefined();
            }
        });

        it("should parse guard with multiple conditions using &&", () => {
            const source = `
                match n {
                    | x when x > 0 && x < 100 => "in range"
                    | _ => "out of range"
                }
            `;
            const ast = parseExpression(source);

            expect(ast.kind).toBe("Match");
            if (ast.kind === "Match") {
                const case1 = ast.cases[0];
                expect(case1?.guard).toBeDefined();
                expect(case1?.guard?.kind).toBe("BinOp");
                if (case1?.guard?.kind === "BinOp") {
                    expect(case1.guard.op).toBe("LogicalAnd");
                }
            }
        });

        it("should parse guard with multiple conditions using ||", () => {
            const source = `
                match n {
                    | x when x < 0 || x > 100 => "out of range"
                    | _ => "in range"
                }
            `;
            const ast = parseExpression(source);

            expect(ast.kind).toBe("Match");
            if (ast.kind === "Match") {
                const case1 = ast.cases[0];
                expect(case1?.guard).toBeDefined();
                expect(case1?.guard?.kind).toBe("BinOp");
                if (case1?.guard?.kind === "BinOp") {
                    expect(case1.guard.op).toBe("LogicalOr");
                }
            }
        });

        it("should parse guard with equality check", () => {
            const source = `
                match n {
                    | x when x == 0 => "zero"
                    | _ => "non-zero"
                }
            `;
            const ast = parseExpression(source);

            expect(ast.kind).toBe("Match");
            if (ast.kind === "Match") {
                const case1 = ast.cases[0];
                expect(case1?.guard).toBeDefined();
                expect(case1?.guard?.kind).toBe("BinOp");
                if (case1?.guard?.kind === "BinOp") {
                    expect(case1.guard.op).toBe("Equal");
                }
            }
        });
    });

    describe("guards with different pattern types", () => {
        it("should parse guard with tuple pattern", () => {
            const source = `
                match pair {
                    | (a, b) when a == b => "equal"
                    | (a, b) when a > b => "first larger"
                    | (a, b) => "second larger"
                }
            `;
            const ast = parseExpression(source);

            expect(ast.kind).toBe("Match");
            if (ast.kind === "Match") {
                expect(ast.cases).toHaveLength(3);

                const case1 = ast.cases[0];
                expect(case1?.pattern.kind).toBe("TuplePattern");
                expect(case1?.guard).toBeDefined();

                const case2 = ast.cases[1];
                expect(case2?.pattern.kind).toBe("TuplePattern");
                expect(case2?.guard).toBeDefined();

                const case3 = ast.cases[2];
                expect(case3?.pattern.kind).toBe("TuplePattern");
                expect(case3?.guard).toBeUndefined();
            }
        });

        it("should parse guard with list pattern", () => {
            const source = `
                match list {
                    | [x, ...xs] when x > 0 => "positive head"
                    | _ => "other"
                }
            `;
            const ast = parseExpression(source);

            expect(ast.kind).toBe("Match");
            if (ast.kind === "Match") {
                const case1 = ast.cases[0];
                expect(case1?.pattern.kind).toBe("ListPattern");
                expect(case1?.guard).toBeDefined();
            }
        });

        it("should parse guard with record pattern", () => {
            const source = `
                match person {
                    | { age, name } when age >= 18 => "adult"
                    | { age, name } => "minor"
                }
            `;
            const ast = parseExpression(source);

            expect(ast.kind).toBe("Match");
            if (ast.kind === "Match") {
                const case1 = ast.cases[0];
                expect(case1?.pattern.kind).toBe("RecordPattern");
                expect(case1?.guard).toBeDefined();
            }
        });

        it("should parse guard with constructor pattern", () => {
            const source = `
                match opt {
                    | Some(x) when x > 10 => "large"
                    | Some(x) when x > 0 => "small positive"
                    | Some(x) => "non-positive"
                    | None => "none"
                }
            `;
            const ast = parseExpression(source);

            expect(ast.kind).toBe("Match");
            if (ast.kind === "Match") {
                expect(ast.cases).toHaveLength(4);

                const case1 = ast.cases[0];
                expect(case1?.pattern.kind).toBe("ConstructorPattern");
                expect(case1?.guard).toBeDefined();

                const case2 = ast.cases[1];
                expect(case2?.pattern.kind).toBe("ConstructorPattern");
                expect(case2?.guard).toBeDefined();

                const case3 = ast.cases[2];
                expect(case3?.pattern.kind).toBe("ConstructorPattern");
                expect(case3?.guard).toBeUndefined();
            }
        });

        it("should parse guard with nested constructor pattern", () => {
            const source = `
                match result {
                    | Ok(Some(value)) when value > 0 => "positive"
                    | Ok(Some(value)) => "non-positive"
                    | _ => "other"
                }
            `;
            const ast = parseExpression(source);

            expect(ast.kind).toBe("Match");
            if (ast.kind === "Match") {
                const case1 = ast.cases[0];
                expect(case1?.pattern.kind).toBe("ConstructorPattern");
                expect(case1?.guard).toBeDefined();
            }
        });
    });

    describe("guards with multiple pattern variables", () => {
        it("should parse guard using multiple variables from tuple", () => {
            const source = `
                match pair {
                    | (a, b) when a + b > 100 => "large sum"
                    | (a, b) => "small sum"
                }
            `;
            const ast = parseExpression(source);

            expect(ast.kind).toBe("Match");
            if (ast.kind === "Match") {
                const case1 = ast.cases[0];
                expect(case1?.guard).toBeDefined();
                expect(case1?.guard?.kind).toBe("BinOp");
            }
        });

        it("should parse guard using variables from list pattern", () => {
            const source = `
                match list {
                    | [x, y, ...rest] when x + y > 100 => "large sum"
                    | [x, y, ..._] => "small sum"
                    | _ => "too few"
                }
            `;
            const ast = parseExpression(source);

            expect(ast.kind).toBe("Match");
            if (ast.kind === "Match") {
                const case1 = ast.cases[0];
                expect(case1?.guard).toBeDefined();
            }
        });

        it("should parse guard using variables from record pattern", () => {
            const source = `
                match point {
                    | { x, y } when x == y => "diagonal"
                    | { x, y } => "off diagonal"
                }
            `;
            const ast = parseExpression(source);

            expect(ast.kind).toBe("Match");
            if (ast.kind === "Match") {
                const case1 = ast.cases[0];
                expect(case1?.guard).toBeDefined();
            }
        });
    });

    describe("guards with outer scope references", () => {
        it("should parse guard referencing outer variable", () => {
            const source = `
                let threshold = 100;
                match value {
                    | x when x > threshold => "above"
                    | x => "below"
                }
            `;
            const ast = parseExpression(source);

            expect(ast.kind).toBe("Let");
            if (ast.kind === "Let") {
                expect(ast.body.kind).toBe("Match");
                if (ast.body.kind === "Match") {
                    const case1 = ast.body.cases[0];
                    expect(case1?.guard).toBeDefined();
                }
            }
        });

        it("should parse guard with function call", () => {
            const source = `
                match x {
                    | n when isValid(n) => "valid"
                    | _ => "invalid"
                }
            `;
            const ast = parseExpression(source);

            expect(ast.kind).toBe("Match");
            if (ast.kind === "Match") {
                const case1 = ast.cases[0];
                expect(case1?.guard).toBeDefined();
                expect(case1?.guard?.kind).toBe("App");
            }
        });
    });

    describe("multiple guards on same pattern type", () => {
        it("should parse multiple cases with different guards on variable pattern", () => {
            const source = `
                match n {
                    | x when x < 0 => "negative"
                    | x when x == 0 => "zero"
                    | x when x < 10 => "small positive"
                    | x => "large positive"
                }
            `;
            const ast = parseExpression(source);

            expect(ast.kind).toBe("Match");
            if (ast.kind === "Match") {
                expect(ast.cases).toHaveLength(4);

                // All except last should have guards
                for (let i = 0; i < 3; i++) {
                    expect(ast.cases[i]?.guard).toBeDefined();
                }
                expect(ast.cases[3]?.guard).toBeUndefined();
            }
        });

        it("should parse classification with ordered guards", () => {
            const source = `
                match x {
                    | n when n > 100 => "very large"
                    | n when n > 10 => "large"
                    | n when n > 0 => "positive"
                    | n => "non-positive"
                }
            `;
            const ast = parseExpression(source);

            expect(ast.kind).toBe("Match");
            if (ast.kind === "Match") {
                expect(ast.cases).toHaveLength(4);
                expect(ast.cases[0]?.guard).toBeDefined();
                expect(ast.cases[1]?.guard).toBeDefined();
                expect(ast.cases[2]?.guard).toBeDefined();
                expect(ast.cases[3]?.guard).toBeUndefined();
            }
        });
    });

    describe("guards with complex expressions", () => {
        it("should parse guard with arithmetic expression", () => {
            const source = `
                match x {
                    | n when n * 2 > 100 => "large doubled"
                    | n => "small"
                }
            `;
            const ast = parseExpression(source);

            expect(ast.kind).toBe("Match");
            if (ast.kind === "Match") {
                const case1 = ast.cases[0];
                expect(case1?.guard).toBeDefined();
            }
        });

        it("should parse guard with negation", () => {
            const source = `
                match x {
                    | n when !n => "falsy"
                    | n => "truthy"
                }
            `;
            const ast = parseExpression(source);

            expect(ast.kind).toBe("Match");
            if (ast.kind === "Match") {
                const case1 = ast.cases[0];
                expect(case1?.guard).toBeDefined();
                expect(case1?.guard?.kind).toBe("UnaryOp");
            }
        });
    });

    describe("integration with other features", () => {
        it("should parse guards in nested match expressions", () => {
            const source = `
                match outer {
                    | Some(inner) when match inner {
                        | x when x > 0 => true
                        | _ => false
                    } => "nested match with guard"
                    | _ => "other"
                }
            `;
            const ast = parseExpression(source);

            expect(ast.kind).toBe("Match");
            if (ast.kind === "Match") {
                const case1 = ast.cases[0];
                expect(case1?.guard).toBeDefined();
                expect(case1?.guard?.kind).toBe("Match");
            }
        });

        it("should parse guard with if expression", () => {
            const source = `
                match x {
                    | n when if n > 0 then true else false => "positive"
                    | _ => "non-positive"
                }
            `;
            const ast = parseExpression(source);

            expect(ast.kind).toBe("Match");
            if (ast.kind === "Match") {
                const case1 = ast.cases[0];
                expect(case1?.guard).toBeDefined();
                expect(case1?.guard?.kind).toBe("If");
            }
        });

        it("should parse guard with lambda call", () => {
            const source = `
                match x {
                    | n when ((x) => x > 0)(n) => "positive"
                    | _ => "non-positive"
                }
            `;
            const ast = parseExpression(source);

            expect(ast.kind).toBe("Match");
            if (ast.kind === "Match") {
                const case1 = ast.cases[0];
                expect(case1?.guard).toBeDefined();
            }
        });
    });

    describe("edge cases", () => {
        it("should parse guard with comparison chain", () => {
            const source = `
                match x {
                    | n when n > 0 && n < 100 => "in range"
                    | _ => "out of range"
                }
            `;
            const ast = parseExpression(source);

            expect(ast.kind).toBe("Match");
            if (ast.kind === "Match") {
                const case1 = ast.cases[0];
                expect(case1?.guard).toBeDefined();
            }
        });

        it("should parse guard that always evaluates to literal true", () => {
            const source = `
                match x {
                    | n when true => "always matches"
                    | _ => "never reached"
                }
            `;
            const ast = parseExpression(source);

            expect(ast.kind).toBe("Match");
            if (ast.kind === "Match") {
                const case1 = ast.cases[0];
                expect(case1?.guard).toBeDefined();
                expect(case1?.guard?.kind).toBe("BoolLit");
            }
        });

        it("should parse guard with record field access", () => {
            const source = `
                match obj {
                    | o when o.value > 10 => "large"
                    | _ => "small"
                }
            `;
            const ast = parseExpression(source);

            expect(ast.kind).toBe("Match");
            if (ast.kind === "Match") {
                const case1 = ast.cases[0];
                expect(case1?.guard).toBeDefined();
                expect(case1?.guard?.kind).toBe("BinOp");
            }
        });

        it("should parse guards with extra spacing", () => {
            const source = `match x { | n when n > 0 && n < 100 => "in range" | _ => "out of range" }`;
            const ast = parseExpression(source);

            expect(ast.kind).toBe("Match");
            if (ast.kind === "Match") {
                const case1 = ast.cases[0];
                expect(case1?.guard).toBeDefined();
            }
        });
    });

    describe("realistic examples from spec", () => {
        it("should parse classify function example", () => {
            const source = `
                match n {
                    | x when x < 0 => "negative"
                    | 0 => "zero"
                    | x when x > 0 && x < 10 => "small positive"
                    | x when x >= 10 => "large positive"
                }
            `;
            const ast = parseExpression(source);

            expect(ast.kind).toBe("Match");
            if (ast.kind === "Match") {
                expect(ast.cases).toHaveLength(4);
                expect(ast.cases[0]?.guard).toBeDefined();
                expect(ast.cases[1]?.guard).toBeUndefined(); // 0 literal pattern
                expect(ast.cases[2]?.guard).toBeDefined();
                expect(ast.cases[3]?.guard).toBeDefined();
            }
        });

        it("should parse filterList example with guards", () => {
            const source = `
                match list {
                    | [] => []
                    | [x, ...xs] when x >= minValue => [x]
                    | [_, ...xs] => []
                }
            `;
            const ast = parseExpression(source);

            expect(ast.kind).toBe("Match");
            if (ast.kind === "Match") {
                expect(ast.cases).toHaveLength(3);
                expect(ast.cases[0]?.guard).toBeUndefined();
                expect(ast.cases[1]?.guard).toBeDefined();
                expect(ast.cases[2]?.guard).toBeUndefined();
            }
        });
    });
});
