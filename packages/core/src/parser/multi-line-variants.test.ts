/**
 * Tests for Multi-line Variant Types (Phase 7.2)
 *
 * Spec reference: docs/spec/03-type-system/algebraic-data-types.md
 *
 * Multi-line variant types allow formatting variants on separate lines with leading |:
 * type Option<T> =
 *   | Some(T)
 *   | None
 *
 * Requirements:
 * - Support leading | before first variant
 * - Support | on newlines between variants
 * - Support comments between variants
 * - Maintain backward compatibility with inline syntax
 */

import type { Module } from "../types/index.js";

import { describe, expect, it } from "vitest";

import { Lexer } from "../lexer/lexer.js";
import { Parser } from "./parser.js";

// Helper to parse source code
function parseModule(source: string): Module {
    const lexer = new Lexer(source, "test.vf");
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens, "test.vf");
    return parser.parse();
}

describe("Multi-line Variant Types", () => {
    describe("leading pipe syntax", () => {
        it("should parse type with leading pipe on same line", () => {
            const ast = parseModule("type Bool = | True | False;");

            expect(ast.declarations).toHaveLength(1);
            const decl = ast.declarations[0];
            expect(decl?.kind).toBe("TypeDecl");
            if (decl && decl.kind === "TypeDecl") {
                expect(decl.name).toBe("Bool");
                expect(decl.definition.kind).toBe("VariantTypeDef");
                if (decl.definition.kind === "VariantTypeDef") {
                    expect(decl.definition.constructors).toHaveLength(2);
                    expect(decl.definition.constructors[0]?.name).toBe("True");
                    expect(decl.definition.constructors[1]?.name).toBe("False");
                }
            }
        });

        it("should parse type with leading pipe and newlines", () => {
            const ast = parseModule(`
        type Bool =
          | True
          | False;
      `);

            expect(ast.declarations).toHaveLength(1);
            const decl = ast.declarations[0];
            expect(decl?.kind).toBe("TypeDecl");
            if (decl && decl.kind === "TypeDecl") {
                expect(decl.name).toBe("Bool");
                expect(decl.definition.kind).toBe("VariantTypeDef");
                if (decl.definition.kind === "VariantTypeDef") {
                    expect(decl.definition.constructors).toHaveLength(2);
                    expect(decl.definition.constructors[0]?.name).toBe("True");
                    expect(decl.definition.constructors[1]?.name).toBe("False");
                }
            }
        });

        it("should parse Option type with leading pipe", () => {
            const ast = parseModule(`
        type Option<T> =
          | Some(T)
          | None;
      `);

            expect(ast.declarations).toHaveLength(1);
            const decl = ast.declarations[0];
            expect(decl?.kind).toBe("TypeDecl");
            if (decl && decl.kind === "TypeDecl") {
                expect(decl.name).toBe("Option");
                expect(decl.params).toHaveLength(1);
                expect(decl.params[0]).toBe("T");
                expect(decl.definition.kind).toBe("VariantTypeDef");
                if (decl.definition.kind === "VariantTypeDef") {
                    expect(decl.definition.constructors).toHaveLength(2);
                    expect(decl.definition.constructors[0]?.name).toBe("Some");
                    expect(decl.definition.constructors[1]?.name).toBe("None");
                }
            }
        });

        it("should parse Result type with leading pipe", () => {
            const ast = parseModule(`
        type Result<T, E> =
          | Ok(T)
          | Err(E);
      `);

            expect(ast.declarations).toHaveLength(1);
            const decl = ast.declarations[0];
            expect(decl?.kind).toBe("TypeDecl");
            if (decl && decl.kind === "TypeDecl") {
                expect(decl.name).toBe("Result");
                expect(decl.params).toHaveLength(2);
                expect(decl.params[0]).toBe("T");
                expect(decl.params[1]).toBe("E");
                expect(decl.definition.kind).toBe("VariantTypeDef");
                if (decl.definition.kind === "VariantTypeDef") {
                    expect(decl.definition.constructors).toHaveLength(2);
                    expect(decl.definition.constructors[0]?.name).toBe("Ok");
                    expect(decl.definition.constructors[1]?.name).toBe("Err");
                }
            }
        });
    });

    describe("multi-line formatting variations", () => {
        it("should parse variants with extra whitespace", () => {
            const ast = parseModule(`
        type Option<T> =
          | Some(T)
          | None;
      `);

            expect(ast.declarations).toHaveLength(1);
            const decl = ast.declarations[0];
            expect(decl?.kind).toBe("TypeDecl");
            if (decl && decl.kind === "TypeDecl" && decl.definition.kind === "VariantTypeDef") {
                expect(decl.definition.constructors).toHaveLength(2);
            }
        });

        it("should parse variants with varying indentation", () => {
            const ast = parseModule(`
        type Tree<T> =
        | Leaf(T)
        | Node(Tree<T>, Tree<T>);
      `);

            expect(ast.declarations).toHaveLength(1);
            const decl = ast.declarations[0];
            expect(decl?.kind).toBe("TypeDecl");
            if (decl && decl.kind === "TypeDecl") {
                expect(decl.name).toBe("Tree");
                expect(decl.definition.kind).toBe("VariantTypeDef");
                if (decl.definition.kind === "VariantTypeDef") {
                    expect(decl.definition.constructors).toHaveLength(2);
                    expect(decl.definition.constructors[0]?.name).toBe("Leaf");
                    expect(decl.definition.constructors[1]?.name).toBe("Node");
                }
            }
        });

        it("should parse variants with blank lines between them", () => {
            const ast = parseModule(`
        type Status =
          | Active

          | Inactive

          | Pending;
      `);

            expect(ast.declarations).toHaveLength(1);
            const decl = ast.declarations[0];
            expect(decl?.kind).toBe("TypeDecl");
            if (decl && decl.kind === "TypeDecl" && decl.definition.kind === "VariantTypeDef") {
                expect(decl.definition.constructors).toHaveLength(3);
                expect(decl.definition.constructors[0]?.name).toBe("Active");
                expect(decl.definition.constructors[1]?.name).toBe("Inactive");
                expect(decl.definition.constructors[2]?.name).toBe("Pending");
            }
        });

        it("should parse many variants on separate lines", () => {
            const ast = parseModule(`
        type Color =
          | Red
          | Green
          | Blue
          | Yellow
          | Orange
          | Purple;
      `);

            expect(ast.declarations).toHaveLength(1);
            const decl = ast.declarations[0];
            expect(decl?.kind).toBe("TypeDecl");
            if (decl && decl.kind === "TypeDecl" && decl.definition.kind === "VariantTypeDef") {
                expect(decl.definition.constructors).toHaveLength(6);
                expect(decl.definition.constructors[0]?.name).toBe("Red");
                expect(decl.definition.constructors[5]?.name).toBe("Purple");
            }
        });
    });

    describe("comments in variant definitions", () => {
        it("should parse type with comments before variants", () => {
            const ast = parseModule(`
        type Option<T> =
          // Represents a present value
          | Some(T)
          // Represents absence of a value
          | None;
      `);

            expect(ast.declarations).toHaveLength(1);
            const decl = ast.declarations[0];
            expect(decl?.kind).toBe("TypeDecl");
            if (decl && decl.kind === "TypeDecl" && decl.definition.kind === "VariantTypeDef") {
                expect(decl.definition.constructors).toHaveLength(2);
            }
        });

        it("should parse type with block comments", () => {
            const ast = parseModule(`
        type Result<T, E> =
          /* Success case */
          | Ok(T)
          /* Error case */
          | Err(E);
      `);

            expect(ast.declarations).toHaveLength(1);
            const decl = ast.declarations[0];
            expect(decl?.kind).toBe("TypeDecl");
            if (decl && decl.kind === "TypeDecl" && decl.definition.kind === "VariantTypeDef") {
                expect(decl.definition.constructors).toHaveLength(2);
            }
        });

        it("should parse type with inline comments after variants", () => {
            const ast = parseModule(`
        type Status =
          | Active   // Currently running
          | Inactive // Not running
          | Error;   // Failed
      `);

            expect(ast.declarations).toHaveLength(1);
            const decl = ast.declarations[0];
            expect(decl?.kind).toBe("TypeDecl");
            if (decl && decl.kind === "TypeDecl" && decl.definition.kind === "VariantTypeDef") {
                expect(decl.definition.constructors).toHaveLength(3);
            }
        });
    });

    describe("mixed formatting styles", () => {
        it("should parse type mixing single and multi-line", () => {
            const ast = parseModule(`
        type Mixed =
          | First | Second
          | Third;
      `);

            expect(ast.declarations).toHaveLength(1);
            const decl = ast.declarations[0];
            expect(decl?.kind).toBe("TypeDecl");
            if (decl && decl.kind === "TypeDecl" && decl.definition.kind === "VariantTypeDef") {
                expect(decl.definition.constructors).toHaveLength(3);
                expect(decl.definition.constructors[0]?.name).toBe("First");
                expect(decl.definition.constructors[1]?.name).toBe("Second");
                expect(decl.definition.constructors[2]?.name).toBe("Third");
            }
        });

        it("should parse without leading pipe (traditional syntax)", () => {
            const ast = parseModule(`
        type Traditional =
          First
          | Second
          | Third;
      `);

            expect(ast.declarations).toHaveLength(1);
            const decl = ast.declarations[0];
            expect(decl?.kind).toBe("TypeDecl");
            if (decl && decl.kind === "TypeDecl" && decl.definition.kind === "VariantTypeDef") {
                expect(decl.definition.constructors).toHaveLength(3);
                expect(decl.definition.constructors[0]?.name).toBe("First");
                expect(decl.definition.constructors[1]?.name).toBe("Second");
                expect(decl.definition.constructors[2]?.name).toBe("Third");
            }
        });

        it("should parse inline definition (no newlines)", () => {
            const ast = parseModule("type Inline = First | Second | Third;");

            expect(ast.declarations).toHaveLength(1);
            const decl = ast.declarations[0];
            expect(decl?.kind).toBe("TypeDecl");
            if (decl && decl.kind === "TypeDecl" && decl.definition.kind === "VariantTypeDef") {
                expect(decl.definition.constructors).toHaveLength(3);
            }
        });
    });

    describe("complex variant payloads", () => {
        it("should parse multi-line variants with multiple fields", () => {
            const ast = parseModule(`
        type User =
          | Guest
          | Registered(String, String)
          | Admin(String, String, Int);
      `);

            expect(ast.declarations).toHaveLength(1);
            const decl = ast.declarations[0];
            expect(decl?.kind).toBe("TypeDecl");
            if (decl && decl.kind === "TypeDecl" && decl.definition.kind === "VariantTypeDef") {
                expect(decl.definition.constructors).toHaveLength(3);
                expect(decl.definition.constructors[0]?.name).toBe("Guest");
                expect(decl.definition.constructors[1]?.name).toBe("Registered");
                expect(decl.definition.constructors[2]?.name).toBe("Admin");

                // Check payloads
                expect(decl.definition.constructors[0]?.args).toHaveLength(0);
                expect(decl.definition.constructors[1]?.args.length).toBeGreaterThan(0);
                expect(decl.definition.constructors[2]?.args.length).toBeGreaterThan(0);
            }
        });

        it("should parse multi-line variants with generic types", () => {
            const ast = parseModule(`
        type Container<T> =
          | Empty
          | Single(T)
          | Multiple(List<T>);
      `);

            expect(ast.declarations).toHaveLength(1);
            const decl = ast.declarations[0];
            expect(decl?.kind).toBe("TypeDecl");
            if (decl && decl.kind === "TypeDecl" && decl.definition.kind === "VariantTypeDef") {
                expect(decl.definition.constructors).toHaveLength(3);
                expect(decl.definition.constructors[0]?.name).toBe("Empty");
                expect(decl.definition.constructors[1]?.name).toBe("Single");
                expect(decl.definition.constructors[2]?.name).toBe("Multiple");
            }
        });

        it("should parse multi-line variants with nested types", () => {
            const ast = parseModule(`
        type Expression =
          | Const(Int)
          | Var(String)
          | Add(Expression, Expression)
          | Mul(Expression, Expression);
      `);

            expect(ast.declarations).toHaveLength(1);
            const decl = ast.declarations[0];
            expect(decl?.kind).toBe("TypeDecl");
            if (decl && decl.kind === "TypeDecl" && decl.definition.kind === "VariantTypeDef") {
                expect(decl.definition.constructors).toHaveLength(4);
                expect(decl.definition.constructors[2]?.name).toBe("Add");
                expect(decl.definition.constructors[3]?.name).toBe("Mul");
            }
        });
    });

    describe("real-world spec examples", () => {
        it("should parse Option type from spec", () => {
            // From spec: algebraic-data-types.md
            const ast = parseModule(`
        type Option<T> =
          | Some(T)
          | None;
      `);

            expect(ast.declarations).toHaveLength(1);
            const decl = ast.declarations[0];
            expect(decl?.kind).toBe("TypeDecl");
            if (decl && decl.kind === "TypeDecl") {
                expect(decl.name).toBe("Option");
                expect(decl.params).toEqual(["T"]);
                expect(decl.definition.kind).toBe("VariantTypeDef");
                if (decl.definition.kind === "VariantTypeDef") {
                    expect(decl.definition.constructors).toHaveLength(2);
                }
            }
        });

        it("should parse Result type from spec", () => {
            // From spec: algebraic-data-types.md
            const ast = parseModule(`
        type Result<T, E> =
          | Ok(T)
          | Err(E);
      `);

            expect(ast.declarations).toHaveLength(1);
            const decl = ast.declarations[0];
            expect(decl?.kind).toBe("TypeDecl");
            if (decl && decl.kind === "TypeDecl") {
                expect(decl.name).toBe("Result");
                expect(decl.params).toEqual(["T", "E"]);
                expect(decl.definition.kind).toBe("VariantTypeDef");
                if (decl.definition.kind === "VariantTypeDef") {
                    expect(decl.definition.constructors).toHaveLength(2);
                }
            }
        });

        it("should parse List type from spec", () => {
            // Common recursive type definition
            const ast = parseModule(`
        type List<T> =
          | Nil
          | Cons(T, List<T>);
      `);

            expect(ast.declarations).toHaveLength(1);
            const decl = ast.declarations[0];
            expect(decl?.kind).toBe("TypeDecl");
            if (decl && decl.kind === "TypeDecl") {
                expect(decl.name).toBe("List");
                expect(decl.definition.kind).toBe("VariantTypeDef");
                if (decl.definition.kind === "VariantTypeDef") {
                    expect(decl.definition.constructors).toHaveLength(2);
                }
            }
        });
    });

    describe("edge cases", () => {
        it("should parse single variant with leading pipe", () => {
            const ast = parseModule(`
        type Unit =
          | Unit;
      `);

            expect(ast.declarations).toHaveLength(1);
            const decl = ast.declarations[0];
            expect(decl?.kind).toBe("TypeDecl");
            if (decl && decl.kind === "TypeDecl" && decl.definition.kind === "VariantTypeDef") {
                expect(decl.definition.constructors).toHaveLength(1);
                expect(decl.definition.constructors[0]?.name).toBe("Unit");
            }
        });

        it("should parse type with extremely long variant list", () => {
            const ast = parseModule(`
        type DayOfWeek =
          | Monday
          | Tuesday
          | Wednesday
          | Thursday
          | Friday
          | Saturday
          | Sunday;
      `);

            expect(ast.declarations).toHaveLength(1);
            const decl = ast.declarations[0];
            expect(decl?.kind).toBe("TypeDecl");
            if (decl && decl.kind === "TypeDecl" && decl.definition.kind === "VariantTypeDef") {
                expect(decl.definition.constructors).toHaveLength(7);
            }
        });

        it("should parse multiple multi-line type definitions", () => {
            const ast = parseModule(`
        type Bool =
          | True
          | False;

        type Option<T> =
          | Some(T)
          | None;

        type Result<T, E> =
          | Ok(T)
          | Err(E);
      `);

            expect(ast.declarations).toHaveLength(3);
            expect(ast.declarations[0]?.kind).toBe("TypeDecl");
            expect(ast.declarations[1]?.kind).toBe("TypeDecl");
            expect(ast.declarations[2]?.kind).toBe("TypeDecl");
        });
    });
});
