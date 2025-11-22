/**
 * Multiple Spreads Tests
 *
 * Tests multiple spread operators in lists and records per spec
 * (data-literals.md:352-353, 126-149)
 */

import type { Expr } from "../types/ast.js";

import { describe, expect, it } from "vitest";

import { Lexer } from "../lexer/index.js";
import { Parser } from "./parser.js";

function parseExpr(source: string): Expr {
    // Wrap the expression in a let declaration
    const wrappedSource = `let x = ${source};`;
    const lexer = new Lexer(wrappedSource, "test.vf");
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens, "test.vf");
    const module = parser.parse();
    const firstDecl = module.declarations[0];
    if (!firstDecl || firstDecl.kind !== "LetDecl") {
        throw new Error("Expected LetDecl");
    }
    return firstDecl.value;
}

describe("Multiple Spreads - List Expressions", () => {
    describe("Two spreads", () => {
        it("should parse list with two spreads", () => {
            const expr = parseExpr("[...xs, ...ys]");

            expect(expr.kind).toBe("List");
            if (expr.kind !== "List") return;

            expect(expr.elements).toHaveLength(2);
            expect(expr.elements[0]!.kind).toBe("Spread");
            expect(expr.elements[1]!.kind).toBe("Spread");

            if (expr.elements[0]!.kind === "Spread") {
                expect(expr.elements[0]!.expr.kind).toBe("Var");
                if (expr.elements[0]!.expr.kind === "Var") {
                    expect(expr.elements[0]!.expr.name).toBe("xs");
                }
            }

            if (expr.elements[1]!.kind === "Spread") {
                expect(expr.elements[1]!.expr.kind).toBe("Var");
                if (expr.elements[1]!.expr.kind === "Var") {
                    expect(expr.elements[1]!.expr.name).toBe("ys");
                }
            }
        });

        it("should parse list with spreads and elements", () => {
            const expr = parseExpr("[...first, 0, ...second]");

            expect(expr.kind).toBe("List");
            if (expr.kind !== "List") return;

            expect(expr.elements).toHaveLength(3);
            expect(expr.elements[0]!.kind).toBe("Spread");
            expect(expr.elements[1]!.kind).toBe("Element");
            expect(expr.elements[2]!.kind).toBe("Spread");
        });
    });

    describe("Three or more spreads", () => {
        it("should parse list with three spreads", () => {
            const expr = parseExpr("[...a, ...b, ...c]");

            expect(expr.kind).toBe("List");
            if (expr.kind !== "List") return;

            expect(expr.elements).toHaveLength(3);
            expect(expr.elements.every((el) => el.kind === "Spread")).toBe(true);
        });

        it("should parse list with multiple spreads and elements", () => {
            const expr = parseExpr("[1, ...a, 2, ...b, 3, ...c, 4]");

            expect(expr.kind).toBe("List");
            if (expr.kind !== "List") return;

            expect(expr.elements).toHaveLength(7);

            // Verify pattern: Element, Spread, Element, Spread, Element, Spread, Element
            expect(expr.elements[0]!.kind).toBe("Element");
            expect(expr.elements[1]!.kind).toBe("Spread");
            expect(expr.elements[2]!.kind).toBe("Element");
            expect(expr.elements[3]!.kind).toBe("Spread");
            expect(expr.elements[4]!.kind).toBe("Element");
            expect(expr.elements[5]!.kind).toBe("Spread");
            expect(expr.elements[6]!.kind).toBe("Element");
        });

        it("should parse list with many consecutive spreads", () => {
            const expr = parseExpr("[...a, ...b, ...c, ...d, ...e]");

            expect(expr.kind).toBe("List");
            if (expr.kind !== "List") return;

            expect(expr.elements).toHaveLength(5);
            expect(expr.elements.every((el) => el.kind === "Spread")).toBe(true);
        });
    });

    describe("Spreads in various positions", () => {
        it("should parse spreads at start and end", () => {
            const expr = parseExpr("[...start, 1, 2, ...end]");

            expect(expr.kind).toBe("List");
            if (expr.kind !== "List") return;

            expect(expr.elements).toHaveLength(4);
            expect(expr.elements[0]!.kind).toBe("Spread");
            expect(expr.elements[1]!.kind).toBe("Element");
            expect(expr.elements[2]!.kind).toBe("Element");
            expect(expr.elements[3]!.kind).toBe("Spread");
        });

        it("should parse multiple spreads in middle", () => {
            const expr = parseExpr("[1, ...a, ...b, ...c, 2]");

            expect(expr.kind).toBe("List");
            if (expr.kind !== "List") return;

            expect(expr.elements).toHaveLength(5);
            expect(expr.elements[0]!.kind).toBe("Element");
            expect(expr.elements[1]!.kind).toBe("Spread");
            expect(expr.elements[2]!.kind).toBe("Spread");
            expect(expr.elements[3]!.kind).toBe("Spread");
            expect(expr.elements[4]!.kind).toBe("Element");
        });
    });

    describe("Combined with trailing commas", () => {
        it("should parse multiple spreads with trailing comma", () => {
            const expr = parseExpr("[...a, ...b, ...c,]");

            expect(expr.kind).toBe("List");
            if (expr.kind !== "List") return;

            expect(expr.elements).toHaveLength(3);
            expect(expr.elements.every((el) => el.kind === "Spread")).toBe(true);
        });

        it("should parse spreads and elements with trailing comma", () => {
            const expr = parseExpr("[1, ...middle, 2,]");

            expect(expr.kind).toBe("List");
            if (expr.kind !== "List") return;

            expect(expr.elements).toHaveLength(3);
            expect(expr.elements[0]!.kind).toBe("Element");
            expect(expr.elements[1]!.kind).toBe("Spread");
            expect(expr.elements[2]!.kind).toBe("Element");
        });

        it("should parse complex list with multiple spreads and trailing comma", () => {
            const expr = parseExpr("[...a, 1, ...b, 2, ...c,]");

            expect(expr.kind).toBe("List");
            if (expr.kind !== "List") return;

            expect(expr.elements).toHaveLength(5);
        });
    });

    describe("Multi-line lists with spreads", () => {
        it("should parse multi-line list with multiple spreads", () => {
            const expr = parseExpr(`[
                ...first,
                ...second,
                ...third,
            ]`);

            expect(expr.kind).toBe("List");
            if (expr.kind !== "List") return;

            expect(expr.elements).toHaveLength(3);
            expect(expr.elements.every((el) => el.kind === "Spread")).toBe(true);
        });

        it("should parse multi-line list with spreads and elements", () => {
            const expr = parseExpr(`[
                1,
                ...middle,
                2,
                ...end,
            ]`);

            expect(expr.kind).toBe("List");
            if (expr.kind !== "List") return;

            expect(expr.elements).toHaveLength(4);
        });
    });
});

describe("Multiple Spreads - Record Expressions", () => {
    describe("Two spreads", () => {
        it("should parse record with two spreads", () => {
            const expr = parseExpr("{ ...a, ...b }");

            expect(expr.kind).toBe("RecordUpdate");
            if (expr.kind !== "RecordUpdate") return;

            // First spread becomes the base record
            expect(expr.record.kind).toBe("Var");
            if (expr.record.kind === "Var") {
                expect(expr.record.name).toBe("a");
            }

            // Second spread is in updates
            expect(expr.updates).toHaveLength(1);
            expect(expr.updates[0]!.kind).toBe("Spread");
            if (expr.updates[0]!.kind === "Spread") {
                expect(expr.updates[0]!.expr.kind).toBe("Var");
                if (expr.updates[0]!.expr.kind === "Var") {
                    expect(expr.updates[0]!.expr.name).toBe("b");
                }
            }
        });

        it("should parse record with spreads and fields", () => {
            const expr = parseExpr("{ ...base, ...override, x: 1 }");

            expect(expr.kind).toBe("RecordUpdate");
            if (expr.kind !== "RecordUpdate") return;

            expect(expr.updates).toHaveLength(2);
            expect(expr.updates[0]!.kind).toBe("Spread");
            expect(expr.updates[1]!.kind).toBe("Field");
        });
    });

    describe("Three or more spreads", () => {
        it("should parse record with three spreads", () => {
            const expr = parseExpr("{ ...defaults, ...userConfig, ...overrides }");

            expect(expr.kind).toBe("RecordUpdate");
            if (expr.kind !== "RecordUpdate") return;

            // First spread is base
            expect(expr.record.kind).toBe("Var");

            // Other two are in updates
            expect(expr.updates).toHaveLength(2);
            expect(expr.updates[0]!.kind).toBe("Spread");
            expect(expr.updates[1]!.kind).toBe("Spread");
        });

        it("should parse record with many spreads", () => {
            const expr = parseExpr("{ ...a, ...b, ...c, ...d }");

            expect(expr.kind).toBe("RecordUpdate");
            if (expr.kind !== "RecordUpdate") return;

            expect(expr.updates).toHaveLength(3);
            expect(expr.updates.every((u) => u.kind === "Spread")).toBe(true);
        });
    });

    describe("Spread ordering semantics", () => {
        it("should preserve spread order - later overrides earlier", () => {
            // { ...a, ...b } means: start with a, then apply b (b overrides a)
            const expr = parseExpr("{ ...a, ...b }");

            expect(expr.kind).toBe("RecordUpdate");
            if (expr.kind !== "RecordUpdate") return;

            // Verify order: a is base, b is update
            expect(expr.record.kind).toBe("Var");
            if (expr.record.kind === "Var") {
                expect(expr.record.name).toBe("a");
            }

            expect(expr.updates[0]!.kind).toBe("Spread");
            if (expr.updates[0]!.kind === "Spread" && expr.updates[0]!.expr.kind === "Var") {
                expect(expr.updates[0]!.expr.name).toBe("b");
            }
        });

        it("should handle explicit field overriding spread", () => {
            const expr = parseExpr("{ ...base, x: 100 }");

            expect(expr.kind).toBe("RecordUpdate");
            if (expr.kind !== "RecordUpdate") return;

            // Explicit field comes after spread, so it overrides
            expect(expr.updates).toHaveLength(1);
            expect(expr.updates[0]!.kind).toBe("Field");
        });

        it("should handle spread overriding earlier spread fields", () => {
            // { ...base, ...override } - override's fields take precedence
            const expr = parseExpr("{ ...base, ...override }");

            expect(expr.kind).toBe("RecordUpdate");
            if (expr.kind !== "RecordUpdate") return;

            // First spread is base, second spread overrides
            expect(expr.record.kind).toBe("Var");
            if (expr.record.kind === "Var") {
                expect(expr.record.name).toBe("base");
            }

            expect(expr.updates).toHaveLength(1);
            expect(expr.updates[0]!.kind).toBe("Spread");
            if (expr.updates[0]!.kind === "Spread" && expr.updates[0]!.expr.kind === "Var") {
                expect(expr.updates[0]!.expr.name).toBe("override");
            }
        });

        it("should handle complex override chain", () => {
            // { ...a, x: 1, ...b, y: 2 }
            // Order: a's fields, then x: 1, then b's fields (overriding), then y: 2
            const expr = parseExpr("{ ...a, x: 1, ...b, y: 2 }");

            expect(expr.kind).toBe("RecordUpdate");
            if (expr.kind !== "RecordUpdate") return;

            expect(expr.updates).toHaveLength(3);
            expect(expr.updates[0]!.kind).toBe("Field");
            expect(expr.updates[1]!.kind).toBe("Spread");
            expect(expr.updates[2]!.kind).toBe("Field");
        });
    });

    describe("Combined with trailing commas", () => {
        it("should parse multiple spreads with trailing comma", () => {
            const expr = parseExpr("{ ...a, ...b, ...c, }");

            expect(expr.kind).toBe("RecordUpdate");
            if (expr.kind !== "RecordUpdate") return;

            expect(expr.updates).toHaveLength(2);
        });

        it("should parse spreads and fields with trailing comma", () => {
            const expr = parseExpr("{ ...base, x: 1, ...override, y: 2, }");

            expect(expr.kind).toBe("RecordUpdate");
            if (expr.kind !== "RecordUpdate") return;

            expect(expr.updates).toHaveLength(3);
        });
    });

    describe("Multi-line records with spreads", () => {
        it("should parse multi-line record with multiple spreads", () => {
            const expr = parseExpr(`{
                ...defaults,
                ...userConfig,
                ...overrides,
            }`);

            expect(expr.kind).toBe("RecordUpdate");
            if (expr.kind !== "RecordUpdate") return;

            expect(expr.updates).toHaveLength(2);
        });

        it("should parse multi-line record with spreads and fields", () => {
            const expr = parseExpr(`{
                ...base,
                x: 1,
                ...override,
                y: 2,
            }`);

            expect(expr.kind).toBe("RecordUpdate");
            if (expr.kind !== "RecordUpdate") return;

            expect(expr.updates).toHaveLength(3);
        });
    });

    describe("Complex spread expressions", () => {
        it("should parse spread of function call result", () => {
            const expr = parseExpr("{ ...getDefaults(), x: 1 }");

            expect(expr.kind).toBe("RecordUpdate");
            if (expr.kind !== "RecordUpdate") return;

            expect(expr.record.kind).toBe("App");
            expect(expr.updates).toHaveLength(1);
        });

        it("should parse spread of record field access", () => {
            const expr = parseExpr("{ ...config.defaults, x: 1 }");

            expect(expr.kind).toBe("RecordUpdate");
            if (expr.kind !== "RecordUpdate") return;

            expect(expr.record.kind).toBe("RecordAccess");
            expect(expr.updates).toHaveLength(1);
        });

        it("should parse nested record with spreads", () => {
            const expr = parseExpr("{ ...outer, nested: { ...inner, x: 1 } }");

            expect(expr.kind).toBe("RecordUpdate");
            if (expr.kind !== "RecordUpdate") return;

            expect(expr.updates).toHaveLength(1);
            expect(expr.updates[0]!.kind).toBe("Field");

            if (expr.updates[0]!.kind === "Field") {
                expect(expr.updates[0]!.value.kind).toBe("RecordUpdate");
            }
        });
    });
});

describe("Multiple Spreads - Edge Cases", () => {
    describe("Empty and single spread", () => {
        it("should parse list with single spread", () => {
            const expr = parseExpr("[...items]");

            expect(expr.kind).toBe("List");
            if (expr.kind !== "List") return;

            expect(expr.elements).toHaveLength(1);
            expect(expr.elements[0]!.kind).toBe("Spread");
        });

        it("should parse record with single spread (shallow copy)", () => {
            const expr = parseExpr("{ ...obj }");

            expect(expr.kind).toBe("RecordUpdate");
            if (expr.kind !== "RecordUpdate") return;

            expect(expr.record.kind).toBe("Var");
            expect(expr.updates).toHaveLength(0);
        });
    });

    describe("Spread of complex expressions", () => {
        it("should parse list spread of list literal", () => {
            const expr = parseExpr("[...[1, 2, 3], 4]");

            expect(expr.kind).toBe("List");
            if (expr.kind !== "List") return;

            expect(expr.elements).toHaveLength(2);
            expect(expr.elements[0]!.kind).toBe("Spread");

            if (expr.elements[0]!.kind === "Spread") {
                expect(expr.elements[0]!.expr.kind).toBe("List");
            }
        });

        it("should parse record spread of record literal", () => {
            const expr = parseExpr("{ ...{ x: 1, y: 2 }, z: 3 }");

            expect(expr.kind).toBe("RecordUpdate");
            if (expr.kind !== "RecordUpdate") return;

            expect(expr.record.kind).toBe("Record");
            expect(expr.updates).toHaveLength(1);
        });

        it("should parse multiple spreads of complex expressions", () => {
            const expr = parseExpr("[...[1, 2], ...getItems(), ...someVar]");

            expect(expr.kind).toBe("List");
            if (expr.kind !== "List") return;

            expect(expr.elements).toHaveLength(3);
            expect(expr.elements.every((el) => el.kind === "Spread")).toBe(true);

            // Verify different expression types
            if (expr.elements[0]!.kind === "Spread") {
                expect(expr.elements[0]!.expr.kind).toBe("List");
            }
            if (expr.elements[1]!.kind === "Spread") {
                expect(expr.elements[1]!.expr.kind).toBe("App");
            }
            if (expr.elements[2]!.kind === "Spread") {
                expect(expr.elements[2]!.expr.kind).toBe("Var");
            }
        });
    });
});
