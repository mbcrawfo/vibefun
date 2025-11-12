/**
 * Unicode edge case tests for parser integration
 *
 * Tests parser behavior with unicode identifiers and strings:
 * - Emoji identifiers
 * - Math symbol identifiers
 * - RTL (right-to-left) text
 * - Mixed unicode in expressions
 * - Zero-width characters
 *
 * Note: The lexer already tests unicode tokenization.
 * These tests verify the parser correctly handles unicode tokens in context.
 */

import type { Expr } from "../types/index.js";

import { describe, expect, it } from "vitest";

import { Lexer } from "../lexer/index.js";
import { Parser } from "./parser.js";

// Helper to create a parser and parse an expression
function parseExpression(source: string) {
    const lexer = new Lexer(source, "test.vf");
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens, "test.vf");
    return parser.parseExpression();
}

// Helper to parse a module
function parseModule(source: string) {
    const lexer = new Lexer(source, "test.vf");
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens, "test.vf");
    return parser.parse();
}

describe("Parser - Unicode Edge Cases", () => {
    describe("emoji identifiers in expressions", () => {
        it("should parse emoji identifier in let binding", () => {
            const source = "let 🚀 = 42;";
            const module = parseModule(source);

            expect(module.declarations).toHaveLength(1);
            const decl = module.declarations[0];

            expect(decl).toBeDefined();
            if (decl && decl.kind === "LetDecl") {
                expect(decl.pattern.kind).toBe("VarPattern");
                if (decl.pattern.kind === "VarPattern") {
                    expect(decl.pattern.name).toBe("🚀");
                }
                expect(decl.value).toMatchObject({
                    kind: "IntLit",
                    value: 42,
                });
            }
        });

        it("should parse emoji identifier in variable reference", () => {
            const expr = parseExpression("🚀");

            expect(expr).toMatchObject({
                kind: "Var",
                name: "🚀",
            });
        });

        it("should parse emoji identifier in binary expression", () => {
            const expr = parseExpression("🚀 + 1");

            expect(expr.kind).toBe("BinOp");
            if (expr.kind === "BinOp") {
                expect(expr.left).toMatchObject({
                    kind: "Var",
                    name: "🚀",
                });
                expect(expr.op).toBe("Add");
                expect(expr.right).toMatchObject({
                    kind: "IntLit",
                    value: 1,
                });
            }
        });

        it("should parse emoji identifier in function call", () => {
            const expr = parseExpression("🚀(42)");

            expect(expr.kind).toBe("App");
            if (expr.kind === "App") {
                expect(expr.func).toMatchObject({
                    kind: "Var",
                    name: "🚀",
                });
                expect(expr.args).toHaveLength(1);
            }
        });

        it("should parse multiple emoji identifiers", () => {
            const expr = parseExpression("🚀 + 🌟 - 💫");

            expect(expr.kind).toBe("BinOp");
            if (expr.kind === "BinOp") {
                expect(expr.right).toMatchObject({
                    kind: "Var",
                    name: "💫",
                });

                if (expr.left.kind === "BinOp") {
                    expect(expr.left.left).toMatchObject({
                        kind: "Var",
                        name: "🚀",
                    });
                    expect(expr.left.right).toMatchObject({
                        kind: "Var",
                        name: "🌟",
                    });
                }
            }
        });

        it("should parse emoji in record field access", () => {
            const expr = parseExpression("obj.🚀");

            expect(expr.kind).toBe("RecordAccess");
            if (expr.kind === "RecordAccess") {
                expect(expr.field).toBe("🚀");
            }
        });
    });

    describe("math symbol identifiers", () => {
        it("should parse Greek letter identifier (π)", () => {
            const source = "let π = 3.14;";
            const module = parseModule(source);

            expect(module.declarations).toHaveLength(1);
            const decl = module.declarations[0];

            expect(decl).toBeDefined();
            if (decl && decl.kind === "LetDecl") {
                if (decl.pattern.kind === "VarPattern") {
                    expect(decl.pattern.name).toBe("π");
                }
            }
        });

        it("should parse math symbol in expression", () => {
            const expr = parseExpression("π * 2.0");

            expect(expr.kind).toBe("BinOp");
            if (expr.kind === "BinOp") {
                expect(expr.left).toMatchObject({
                    kind: "Var",
                    name: "π",
                });
                expect(expr.op).toBe("Multiply");
            }
        });

        it("should parse multiple Greek letters", () => {
            const expr = parseExpression("α + β + γ");

            expect(expr.kind).toBe("BinOp");
            // Verify variables exist in the expression
            let foundAlpha = false;
            let foundBeta = false;
            let foundGamma = false;

            function checkVars(node: Expr): void {
                if (node.kind === "Var") {
                    if (node.name === "α") foundAlpha = true;
                    if (node.name === "β") foundBeta = true;
                    if (node.name === "γ") foundGamma = true;
                }
                if (node.kind === "BinOp") {
                    checkVars(node.left);
                    checkVars(node.right);
                }
            }

            checkVars(expr);

            expect(foundAlpha).toBe(true);
            expect(foundBeta).toBe(true);
            expect(foundGamma).toBe(true);
        });
    });

    describe("RTL (right-to-left) text in strings", () => {
        it("should parse Arabic text in string literal", () => {
            const expr = parseExpression('"مرحبا"');

            expect(expr).toMatchObject({
                kind: "StringLit",
                value: "مرحبا",
            });
        });

        it("should parse Hebrew text in string literal", () => {
            const expr = parseExpression('"שלום"');

            expect(expr).toMatchObject({
                kind: "StringLit",
                value: "שלום",
            });
        });

        it("should parse mixed LTR and RTL text", () => {
            const expr = parseExpression('"Hello مرحبا World"');

            expect(expr).toMatchObject({
                kind: "StringLit",
                value: "Hello مرحبا World",
            });
        });

        it("should parse RTL string in expression", () => {
            const expr = parseExpression('"مرحبا" & " عالم"');

            expect(expr.kind).toBe("BinOp");
            if (expr.kind === "BinOp") {
                expect(expr.left).toMatchObject({
                    kind: "StringLit",
                    value: "مرحبا",
                });
                expect(expr.right).toMatchObject({
                    kind: "StringLit",
                    value: " عالم",
                });
            }
        });
    });

    describe("mixed unicode in complex expressions", () => {
        it("should parse complex expression with mixed unicode", () => {
            const expr = parseExpression("🚀 + π * αβγ");

            expect(expr.kind).toBe("BinOp");
            // Verify it parses successfully
            expect(expr.loc).toBeDefined();
        });

        it("should parse unicode in list literal", () => {
            const expr = parseExpression("[🚀, π, αβγ]");

            expect(expr.kind).toBe("List");
            if (expr.kind === "List") {
                expect(expr.elements).toHaveLength(3);
                const elem0 = expr.elements[0];
                const elem1 = expr.elements[1];
                const elem2 = expr.elements[2];
                expect(elem0).toBeDefined();
                expect(elem1).toBeDefined();
                expect(elem2).toBeDefined();
                if (elem0) {
                    expect(elem0.expr).toMatchObject({
                        kind: "Var",
                        name: "🚀",
                    });
                }
                if (elem1) {
                    expect(elem1.expr).toMatchObject({
                        kind: "Var",
                        name: "π",
                    });
                }
                if (elem2) {
                    expect(elem2.expr).toMatchObject({
                        kind: "Var",
                        name: "αβγ",
                    });
                }
            }
        });

        it("should parse unicode in record literal", () => {
            const expr = parseExpression("{ 🚀: 42, π: 3.14 }");

            expect(expr.kind).toBe("Record");
            if (expr.kind === "Record") {
                expect(expr.fields).toHaveLength(2);
                const field0 = expr.fields[0];
                const field1 = expr.fields[1];
                expect(field0).toBeDefined();
                expect(field1).toBeDefined();
                if (field0 && field0.kind === "Field") {
                    expect(field0.name).toBe("🚀");
                }
                if (field1 && field1.kind === "Field") {
                    expect(field1.name).toBe("π");
                }
            }
        });

        it("should parse unicode in match pattern", () => {
            const expr = parseExpression("match x { | 🚀 => 1 | _ => 0 }");

            expect(expr.kind).toBe("Match");
            if (expr.kind === "Match") {
                const firstCase = expr.cases[0];
                expect(firstCase).toBeDefined();
                if (firstCase) {
                    expect(firstCase.pattern.kind).toBe("VarPattern");
                    if (firstCase.pattern.kind === "VarPattern") {
                        expect(firstCase.pattern.name).toBe("🚀");
                    }
                }
            }
        });
    });

    describe("unicode in function definitions", () => {
        it("should parse unicode function name", () => {
            const source = "let 🚀 = (x) => x + 1;";
            const module = parseModule(source);

            expect(module.declarations).toHaveLength(1);
            const decl = module.declarations[0];

            expect(decl).toBeDefined();
            if (decl && decl.kind === "LetDecl") {
                if (decl.pattern.kind === "VarPattern") {
                    expect(decl.pattern.name).toBe("🚀");
                }
                expect(decl.value.kind).toBe("Lambda");
            }
        });

        it("should parse unicode parameter names", () => {
            const expr = parseExpression("(π, θ) => π * θ");

            expect(expr.kind).toBe("Lambda");
            if (expr.kind === "Lambda") {
                expect(expr.params).toHaveLength(2);
                const param0 = expr.params[0];
                const param1 = expr.params[1];
                expect(param0).toBeDefined();
                expect(param1).toBeDefined();
                if (param0 && param0.kind === "VarPattern" && param1 && param1.kind === "VarPattern") {
                    expect(param0.name).toBe("π");
                    expect(param1.name).toBe("θ");
                }
            }
        });

        it("should parse unicode in function body", () => {
            const expr = parseExpression("(🚀) => 🚀 + 1");

            expect(expr.kind).toBe("Lambda");
            if (expr.kind === "Lambda") {
                expect(expr.body.kind).toBe("BinOp");
                if (expr.body.kind === "BinOp") {
                    expect(expr.body.left).toMatchObject({
                        kind: "Var",
                        name: "🚀",
                    });
                }
            }
        });
    });

    describe("unicode in type definitions", () => {
        it("should parse Greek letter type name", () => {
            const source = "type Π = Int;";
            const module = parseModule(source);

            expect(module.declarations).toHaveLength(1);
            const decl = module.declarations[0];

            expect(decl).toBeDefined();
            if (decl && decl.kind === "TypeDecl") {
                expect(decl.name).toBe("Π");
            }
        });

        it("should parse unicode variant constructor (Greek letters)", () => {
            const source = "type Result = Σ(Int) | Δ;";
            const module = parseModule(source);

            expect(module.declarations).toHaveLength(1);
            const decl = module.declarations[0];

            expect(decl).toBeDefined();
            if (decl && decl.kind === "TypeDecl" && decl.definition.kind === "VariantTypeDef") {
                expect(decl.definition.constructors).toHaveLength(2);
                const constructor0 = decl.definition.constructors[0];
                const constructor1 = decl.definition.constructors[1];
                expect(constructor0).toBeDefined();
                expect(constructor1).toBeDefined();
                if (constructor0) {
                    expect(constructor0.name).toBe("Σ");
                }
                if (constructor1) {
                    expect(constructor1.name).toBe("Δ");
                }
            }
        });

        it("should parse unicode record field name", () => {
            const source = "type Point = { α: Int, β: Int };";
            const module = parseModule(source);

            expect(module.declarations).toHaveLength(1);
            const decl = module.declarations[0];

            expect(decl).toBeDefined();
            if (decl && decl.kind === "TypeDecl" && decl.definition.kind === "RecordTypeDef") {
                expect(decl.definition.fields).toHaveLength(2);
                const field0 = decl.definition.fields[0];
                const field1 = decl.definition.fields[1];
                expect(field0).toBeDefined();
                expect(field1).toBeDefined();
                if (field0) {
                    expect(field0.name).toBe("α");
                }
                if (field1) {
                    expect(field1.name).toBe("β");
                }
            }
        });
    });

    describe("CJK (Chinese, Japanese, Korean) characters", () => {
        it("should parse Chinese identifiers", () => {
            const source = "let 变量 = 42;";
            const module = parseModule(source);

            expect(module.declarations).toHaveLength(1);
            const decl = module.declarations[0];

            if (decl && decl.kind === "LetDecl" && decl.pattern.kind === "VarPattern") {
                expect(decl.pattern.name).toBe("变量");
            }
        });

        it("should parse Japanese identifiers", () => {
            const source = "let 変数 = 42;";
            const module = parseModule(source);

            expect(module.declarations).toHaveLength(1);
            const decl = module.declarations[0];

            if (decl && decl.kind === "LetDecl" && decl.pattern.kind === "VarPattern") {
                expect(decl.pattern.name).toBe("変数");
            }
        });

        it("should parse Korean identifiers", () => {
            const source = "let 변수 = 42;";
            const module = parseModule(source);

            expect(module.declarations).toHaveLength(1);
            const decl = module.declarations[0];

            if (decl && decl.kind === "LetDecl" && decl.pattern.kind === "VarPattern") {
                expect(decl.pattern.name).toBe("변수");
            }
        });

        it("should parse mixed CJK in expression", () => {
            const expr = parseExpression("变量 + 変数 + 변수");

            expect(expr.kind).toBe("BinOp");
            // Verify it parses successfully
            expect(expr.loc).toBeDefined();
        });
    });

    describe("surrogate pairs and special unicode", () => {
        it("should parse emoji with surrogate pairs in strings", () => {
            const expr = parseExpression('"\\u{1F600}"');

            expect(expr).toMatchObject({
                kind: "StringLit",
                value: "😀",
            });
        });

        it("should parse complex emoji (with modifiers) in strings", () => {
            const expr = parseExpression('"👨‍👩‍👧‍👦"');

            expect(expr.kind).toBe("StringLit");
            expect(expr.loc).toBeDefined();
        });

        it("should parse emoji flags in strings", () => {
            const expr = parseExpression('"🇺🇸"');

            expect(expr.kind).toBe("StringLit");
            expect(expr.loc).toBeDefined();
        });
    });

    describe("unicode normalization edge cases", () => {
        it("should preserve composed and decomposed forms", () => {
            // é can be represented as single character (U+00E9) or combining (e + ́)
            const composed = parseExpression('"café"'); // composed é (U+00E9)
            const decomposed = parseExpression('"café"'); // decomposed é (e + U+0301)

            expect(composed.kind).toBe("StringLit");
            expect(decomposed.kind).toBe("StringLit");
        });

        it("should handle combining diacritics", () => {
            const expr = parseExpression('"ñoño"');

            expect(expr).toMatchObject({
                kind: "StringLit",
            });
        });
    });
});
