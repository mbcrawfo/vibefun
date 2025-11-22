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

// Helper to create a parser and parse a module
function parseModule(source: string) {
    const lexer = new Lexer(source, "test.vf");
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens, "test.vf");
    return parser.parse();
}

describe("Empty Blocks", () => {
    describe("basic empty blocks", () => {
        it("should parse empty block expression", () => {
            const ast = parseExpression("{}");

            expect(ast.kind).toBe("Block");
            if (ast.kind === "Block") {
                expect(ast.exprs).toEqual([]);
            }
        });

        it("should parse empty block in let binding", () => {
            const ast = parseModule("let nothing = {};");

            expect(ast.declarations).toHaveLength(1);
            const decl = ast.declarations[0];
            if (decl) {
                expect(decl.kind).toBe("LetDecl");
            }
            if (decl && decl.kind === "LetDecl") {
                expect(decl.value.kind).toBe("Block");
                if (decl.value.kind === "Block") {
                    expect(decl.value.exprs).toEqual([]);
                }
            }
        });

        it("should parse multiple empty blocks", () => {
            const ast = parseModule(`
        let a = {};
        let b = {};
      `);

            expect(ast.declarations).toHaveLength(2);

            const decl1 = ast.declarations[0];
            const decl2 = ast.declarations[1];
            if (decl1 && decl1.kind === "LetDecl" && decl2 && decl2.kind === "LetDecl") {
                expect(decl1.value.kind).toBe("Block");
                expect(decl2.value.kind).toBe("Block");
                if (decl1.value.kind === "Block" && decl2.value.kind === "Block") {
                    expect(decl1.value.exprs).toEqual([]);
                    expect(decl2.value.exprs).toEqual([]);
                }
            }
        });
    });

    describe("empty blocks in lambdas", () => {
        it("should parse empty block as lambda body", () => {
            const ast = parseExpression("() => {}");

            expect(ast.kind).toBe("Lambda");
            if (ast.kind === "Lambda") {
                expect(ast.body.kind).toBe("Block");
                if (ast.body.kind === "Block") {
                    expect(ast.body.exprs).toEqual([]);
                }
            }
        });

        it("should parse lambda with params and empty block", () => {
            const ast = parseExpression("(x, y) => {}");

            expect(ast.kind).toBe("Lambda");
            if (ast.kind === "Lambda") {
                expect(ast.params).toHaveLength(2);
                expect(ast.body.kind).toBe("Block");
                if (ast.body.kind === "Block") {
                    expect(ast.body.exprs).toEqual([]);
                }
            }
        });

        it("should parse typed lambda with empty block", () => {
            const ast = parseExpression("(x: Int): Unit => {}");

            expect(ast.kind).toBe("Lambda");
            if (ast.kind === "Lambda") {
                expect(ast.returnType).toBeDefined();
                expect(ast.returnType?.kind).toBe("TypeConst");
                expect(ast.body.kind).toBe("Block");
                if (ast.body.kind === "Block") {
                    expect(ast.body.exprs).toEqual([]);
                }
            }
        });
    });

    describe("empty blocks in if expressions", () => {
        it("should parse empty block in then branch", () => {
            const ast = parseExpression("if condition then {} else doSomething()");

            expect(ast.kind).toBe("If");
            if (ast.kind === "If") {
                expect(ast.then.kind).toBe("Block");
                if (ast.then.kind === "Block") {
                    expect(ast.then.exprs).toEqual([]);
                }
            }
        });

        it("should parse empty block in else branch", () => {
            const ast = parseExpression("if condition then doSomething() else {}");

            expect(ast.kind).toBe("If");
            if (ast.kind === "If") {
                expect(ast.else_.kind).toBe("Block");
                if (ast.else_.kind === "Block") {
                    expect(ast.else_.exprs).toEqual([]);
                }
            }
        });

        it("should parse empty blocks in both branches", () => {
            const ast = parseExpression("if condition then {} else {}");

            expect(ast.kind).toBe("If");
            if (ast.kind === "If") {
                expect(ast.then.kind).toBe("Block");
                expect(ast.else_.kind).toBe("Block");
                if (ast.then.kind === "Block" && ast.else_.kind === "Block") {
                    expect(ast.then.exprs).toEqual([]);
                    expect(ast.else_.exprs).toEqual([]);
                }
            }
        });
    });

    describe("empty blocks in match expressions", () => {
        it("should parse empty block in match arm", () => {
            const ast = parseExpression("match x { | Some(v) => {} | None => 0 }");

            expect(ast.kind).toBe("Match");
            if (ast.kind === "Match") {
                expect(ast.cases).toHaveLength(2);
                const firstCase = ast.cases[0];
                if (firstCase) {
                    expect(firstCase.body.kind).toBe("Block");
                    if (firstCase.body.kind === "Block") {
                        expect(firstCase.body.exprs).toEqual([]);
                    }
                }
            }
        });

        it("should parse all match arms with empty blocks", () => {
            const ast = parseExpression("match x { | Some(v) => {} | None => {} }");

            expect(ast.kind).toBe("Match");
            if (ast.kind === "Match") {
                expect(ast.cases).toHaveLength(2);
                ast.cases.forEach((matchCase) => {
                    expect(matchCase.body.kind).toBe("Block");
                    if (matchCase.body.kind === "Block") {
                        expect(matchCase.body.exprs).toEqual([]);
                    }
                });
            }
        });

        it("should parse empty block with guard in match arm", () => {
            const ast = parseExpression("match x { | n when n > 0 => {} | _ => 1 }");

            expect(ast.kind).toBe("Match");
            if (ast.kind === "Match") {
                expect(ast.cases).toHaveLength(2);
                const firstCase = ast.cases[0];
                if (firstCase) {
                    expect(firstCase.guard).toBeDefined();
                    expect(firstCase.body.kind).toBe("Block");
                    if (firstCase.body.kind === "Block") {
                        expect(firstCase.body.exprs).toEqual([]);
                    }
                }
            }
        });
    });

    describe("empty blocks in nested contexts", () => {
        it("should parse empty block inside another block", () => {
            const ast = parseExpression("{ {}; 1; }");

            expect(ast.kind).toBe("Block");
            if (ast.kind === "Block") {
                expect(ast.exprs).toHaveLength(2);
                const firstExpr = ast.exprs[0];
                if (firstExpr) {
                    expect(firstExpr.kind).toBe("Block");
                    if (firstExpr.kind === "Block") {
                        expect(firstExpr.exprs).toEqual([]);
                    }
                }
            }
        });

        it("should parse empty block in function call argument", () => {
            const ast = parseExpression("doSomething({})");

            expect(ast.kind).toBe("App");
            if (ast.kind === "App") {
                expect(ast.args).toHaveLength(1);
                const arg0 = ast.args[0];
                if (arg0) {
                    expect(arg0.kind).toBe("Block");
                    if (arg0.kind === "Block") {
                        expect(arg0.exprs).toEqual([]);
                    }
                }
            }
        });

        it("should parse empty block in list", () => {
            const ast = parseExpression("[{}, 1, {}]");

            expect(ast.kind).toBe("List");
            if (ast.kind === "List") {
                expect(ast.elements).toHaveLength(3);
                const elem0 = ast.elements[0];
                const elem2 = ast.elements[2];
                if (elem0 && elem0.kind === "Element" && elem2 && elem2.kind === "Element") {
                    expect(elem0.expr.kind).toBe("Block");
                    expect(elem2.expr.kind).toBe("Block");
                    if (elem0.expr.kind === "Block" && elem2.expr.kind === "Block") {
                        expect(elem0.expr.exprs).toEqual([]);
                        expect(elem2.expr.exprs).toEqual([]);
                    }
                }
            }
        });
    });

    describe("empty blocks with whitespace and formatting", () => {
        it("should parse empty block with spaces", () => {
            const ast = parseExpression("{  }");

            expect(ast.kind).toBe("Block");
            if (ast.kind === "Block") {
                expect(ast.exprs).toEqual([]);
            }
        });

        it("should parse empty block with newlines", () => {
            const ast = parseExpression("{\n\n}");

            expect(ast.kind).toBe("Block");
            if (ast.kind === "Block") {
                expect(ast.exprs).toEqual([]);
            }
        });

        it("should parse empty block with comments", () => {
            const ast = parseExpression("{ /* nothing here */ }");

            expect(ast.kind).toBe("Block");
            if (ast.kind === "Block") {
                expect(ast.exprs).toEqual([]);
            }
        });

        it("should parse multi-line empty block", () => {
            const ast = parseExpression(`{
        // This is an empty block
      }`);

            expect(ast.kind).toBe("Block");
            if (ast.kind === "Block") {
                expect(ast.exprs).toEqual([]);
            }
        });
    });

    describe("empty blocks - spec examples", () => {
        it("should parse spec example: let nothing = {}", () => {
            // From spec: functions-composition.md:170
            const ast = parseModule("let nothing = {};");

            expect(ast.declarations).toHaveLength(1);
            const decl = ast.declarations[0];
            if (decl && decl.kind === "LetDecl") {
                expect(decl.pattern.kind).toBe("VarPattern");
                if (decl.pattern.kind === "VarPattern") {
                    expect(decl.pattern.name).toBe("nothing");
                }
                expect(decl.value.kind).toBe("Block");
                if (decl.value.kind === "Block") {
                    expect(decl.value.exprs).toEqual([]);
                }
            }
        });

        it("should parse spec example: if condition then {} else doSomething()", () => {
            // From spec: functions-composition.md:173
            const ast = parseExpression("if condition then {} else doSomething()");

            expect(ast.kind).toBe("If");
            if (ast.kind === "If") {
                expect(ast.then.kind).toBe("Block");
                if (ast.then.kind === "Block") {
                    expect(ast.then.exprs).toEqual([]);
                }
            }
        });
    });
});
