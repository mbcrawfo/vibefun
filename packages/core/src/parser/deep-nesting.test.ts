/**
 * Deep nesting edge case tests
 *
 * Tests parser behavior with deeply nested structures to verify:
 * - Recursion limits are handled gracefully
 * - Stack overflow prevention
 * - Performance with extreme nesting depths
 */

import type { Expr, RecordField } from "../types/index.js";

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

describe("Parser - Deep Nesting Edge Cases", () => {
    describe("deeply nested parenthesized expressions", () => {
        it("should parse 20 levels of nested parentheses", () => {
            const nesting = 20;
            const open = "(".repeat(nesting);
            const close = ")".repeat(nesting);
            const source = `${open}42${close}`;

            const expr = parseExpression(source);

            // Parser optimizes away unnecessary parentheses
            // Just verify it parses successfully without stack overflow
            expect(expr).toMatchObject({
                kind: "IntLit",
                value: 42,
            });
        });

        it("should parse 50 levels of nested parentheses", () => {
            const nesting = 50;
            const open = "(".repeat(nesting);
            const close = ")".repeat(nesting);
            const source = `${open}42${close}`;

            const expr = parseExpression(source);

            // Parser optimizes away parentheses - verify no stack overflow
            expect(expr.kind).toBe("IntLit");
        });

        it("should parse deeply nested arithmetic expressions", () => {
            // ((((1 + 2) + 3) + 4) + 5) ... + 20
            const nesting = 20;
            let source = "1";
            for (let i = 2; i <= nesting; i++) {
                source = `(${source} + ${i})`;
            }

            const expr = parseExpression(source);

            // Should successfully parse as nested BinOp
            expect(expr.kind).toBe("BinOp");
            expect(expr.loc).toBeDefined();
        });
    });

    describe("deeply nested type parameters", () => {
        it("should parse 20 levels of nested type parameters in declaration", () => {
            // Test via type declaration since parseType is not public
            let typeStr = "Int";
            for (let i = 0; i < 20; i++) {
                typeStr = `List<${typeStr}>`;
            }

            const source = `type Nested = ${typeStr};`;
            const module = parseModule(source);

            // Should successfully parse without stack overflow
            expect(module.declarations).toHaveLength(1);
            expect(module.declarations[0]?.kind).toBe("TypeDecl");
        });

        it("should parse deeply nested generic types in declaration", () => {
            // Option<Result<Either<A, B>, C>>
            const source = "type Complex = Option<Result<Either<A, B>, C>>;";
            const module = parseModule(source);

            expect(module.declarations).toHaveLength(1);
            expect(module.declarations[0]?.kind).toBe("TypeDecl");
        });

        it("should parse 50 levels of nested type parameters", () => {
            let typeStr = "Int";
            for (let i = 0; i < 50; i++) {
                typeStr = `Option<${typeStr}>`;
            }

            const source = `type VeryNested = ${typeStr};`;
            const module = parseModule(source);

            // Verify it parses successfully without stack overflow
            expect(module.declarations).toHaveLength(1);
        });
    });

    describe("deeply nested pattern matches", () => {
        it("should parse 20 levels of nested Some patterns", () => {
            let pattern = "x";
            for (let i = 0; i < 20; i++) {
                pattern = `Some(${pattern})`;
            }

            const source = `let f = () => match value { | ${pattern} => 1 | None => 0 };`;
            const module = parseModule(source);

            // Should parse successfully without stack overflow
            expect(module.declarations).toHaveLength(1);
            const decl = module.declarations[0];
            expect(decl).toBeDefined();
            if (decl && decl.kind === "LetDecl") {
                expect(decl.pattern.kind).toBe("VarPattern");
            }
        });

        it("should parse deeply nested constructor patterns", () => {
            const source = `let f = () => match value { | Some(Some(Some(x))) => 1 | _ => 0 };`;
            const module = parseModule(source);

            // Should parse successfully
            expect(module.declarations).toHaveLength(1);
        });
    });

    describe("deeply nested match expressions", () => {
        it("should parse nested match expressions", () => {
            const source = `let f = () => match x { | Some(y) => match y { | Some(z) => match z { | Some(w) => w | None => 0 } | None => 0 } | None => 0 };`;
            const module = parseModule(source);

            // Should parse successfully
            expect(module.declarations).toHaveLength(1);
        });

        it("should parse 10 levels of nested match expressions", () => {
            // Build deeply nested match
            let source = "value";
            for (let i = 0; i < 10; i++) {
                source = `match ${source} { | Some(x) => x | None => 0 }`;
            }

            const fullSource = `let f = () => ${source};`;
            const module = parseModule(fullSource);

            // Verify it parses successfully without stack overflow
            expect(module.declarations).toHaveLength(1);
        });
    });

    describe("deeply nested list literals", () => {
        it("should parse 20 levels of nested list literals", () => {
            let source = "1";
            for (let i = 0; i < 20; i++) {
                source = `[${source}]`;
            }

            const expr = parseExpression(source);

            // Verify structure - lists use kind "List" not "ListLit"
            let current: Expr = expr;
            let depth = 0;
            while (current.kind === "List") {
                depth++;
                expect(current.elements).toHaveLength(1);
                // Elements are wrapped in { kind: "Element", expr: ... }
                const element = current.elements[0];
                expect(element).toBeDefined();
                current = element!.expr;
            }

            expect(depth).toBe(20);
            expect(current).toMatchObject({
                kind: "IntLit",
                value: 1,
            });
        });

        it("should parse 50 levels of nested list literals", () => {
            let source = "42";
            for (let i = 0; i < 50; i++) {
                source = `[${source}]`;
            }

            const expr = parseExpression(source);

            // Verify it parses successfully
            let current: Expr = expr;
            let depth = 0;
            while (current.kind === "List") {
                depth++;
                const element = current.elements[0];
                expect(element).toBeDefined();
                current = element!.expr;
            }

            expect(depth).toBe(50);
        });
    });

    describe("deeply nested function applications", () => {
        it("should parse deeply nested function calls", () => {
            // f(g(h(i(j(k(x))))))
            let source = "x";
            for (let i = 0; i < 10; i++) {
                const funcName = String.fromCharCode(97 + i); // a, b, c, ...
                source = `${funcName}(${source})`;
            }

            const expr = parseExpression(source);

            // Verify structure
            expect(expr.kind).toBe("App");

            let current: Expr | undefined = expr;
            let depth = 0;
            while (current && current.kind === "App") {
                depth++;
                current = current.args?.[0];
            }

            expect(depth).toBe(10);
        });
    });

    describe("deeply nested record literals", () => {
        it("should parse nested record literals", () => {
            const source = `{ a: { b: { c: { d: { e: 42 } } } } }`;

            const expr = parseExpression(source);

            expect(expr.kind).toBe("Record");

            // Verify nested structure - records use kind "Record" not "RecordLit"
            if (expr.kind === "Record") {
                let current: Expr = expr;
                let depth = 0;

                while (current.kind === "Record") {
                    depth++;
                    const field: RecordField | undefined = current.fields[0];
                    expect(field).toBeDefined();
                    expect(field?.kind).toBe("Field");
                    if (field?.kind === "Field") {
                        current = field.value;
                    }
                }

                expect(depth).toBe(5);
                expect(current).toMatchObject({
                    kind: "IntLit",
                    value: 42,
                });
            }
        });

        it("should parse 20 levels of nested records", () => {
            // Build nested record
            let source = "42";
            for (let i = 0; i < 20; i++) {
                source = `{ x: ${source} }`;
            }

            const expr = parseExpression(source);

            let current: Expr = expr;
            let depth = 0;

            while (current.kind === "Record") {
                depth++;
                const field: RecordField | undefined = current.fields[0];
                expect(field).toBeDefined();
                expect(field?.kind).toBe("Field");
                if (field?.kind === "Field") {
                    current = field.value;
                }
            }

            expect(depth).toBe(20);
        });
    });
});
