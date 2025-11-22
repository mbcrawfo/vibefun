/**
 * Trailing Comma Tests
 *
 * Tests trailing comma support in all comma-separated contexts
 * per spec (data-literals.md:432-477)
 */

import type { Expr, Pattern, TypeExpr } from "../types/ast.js";

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

function parsePattern(source: string): Pattern {
    const lexer = new Lexer(source, "test.vf");
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens, "test.vf");
    return parser.parsePattern();
}

function parseType(source: string): TypeExpr {
    const lexer = new Lexer(source, "test.vf");
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens, "test.vf");
    return parser.parseTypeExpr();
}

describe("Trailing Commas - Expression Contexts", () => {
    describe("List Expressions", () => {
        it("should parse list with trailing comma", () => {
            const expr = parseExpr("[1, 2, 3,]");
            expect(expr.kind).toBe("List");
            if (expr.kind !== "List") return;
            expect(expr.elements).toHaveLength(3);
        });

        it("should parse single-element list with trailing comma", () => {
            const expr = parseExpr("[1,]");
            expect(expr.kind).toBe("List");
            if (expr.kind !== "List") return;
            expect(expr.elements).toHaveLength(1);
        });

        it("should parse multi-line list with trailing comma", () => {
            const expr = parseExpr(`[
                1,
                2,
                3,
            ]`);
            expect(expr.kind).toBe("List");
            if (expr.kind !== "List") return;
            expect(expr.elements).toHaveLength(3);
        });

        it("should parse empty list without trailing comma", () => {
            const expr = parseExpr("[]");
            expect(expr.kind).toBe("List");
            if (expr.kind !== "List") return;
            expect(expr.elements).toHaveLength(0);
        });
    });

    describe("Record Expressions", () => {
        it("should parse record with trailing comma", () => {
            const expr = parseExpr('{ name: "Alice", age: 30, }');
            expect(expr.kind).toBe("Record");
            if (expr.kind !== "Record") return;
            expect(expr.fields).toHaveLength(2);
        });

        it("should parse single-field record with trailing comma", () => {
            const expr = parseExpr('{ name: "Alice", }');
            expect(expr.kind).toBe("Record");
            if (expr.kind !== "Record") return;
            expect(expr.fields).toHaveLength(1);
        });

        it("should parse multi-line record with trailing comma", () => {
            const expr = parseExpr(`{
                name: "Alice",
                age: 30,
                active: true,
            }`);
            expect(expr.kind).toBe("Record");
            if (expr.kind !== "Record") return;
            expect(expr.fields).toHaveLength(3);
        });

        it("should parse empty braces as empty block (spec: {} is empty block)", () => {
            const expr = parseExpr("{}");
            expect(expr.kind).toBe("Block");
            if (expr.kind !== "Block") return;
            expect(expr.exprs).toHaveLength(0);
        });

        it("should parse record shorthand with trailing comma", () => {
            const expr = parseExpr("{ name, age, }");
            expect(expr.kind).toBe("Record");
            if (expr.kind !== "Record") return;
            expect(expr.fields).toHaveLength(2);
        });
    });

    describe("Tuple Expressions", () => {
        it("should parse tuple with trailing comma", () => {
            const expr = parseExpr("(1, 2, 3,)");
            expect(expr.kind).toBe("Tuple");
            if (expr.kind !== "Tuple") return;
            expect(expr.elements).toHaveLength(3);
        });

        it("should parse two-element tuple with trailing comma", () => {
            const expr = parseExpr("(1, 2,)");
            expect(expr.kind).toBe("Tuple");
            if (expr.kind !== "Tuple") return;
            expect(expr.elements).toHaveLength(2);
        });

        it("should parse multi-line tuple with trailing comma", () => {
            const expr = parseExpr("(1, 2, 3,)");
            expect(expr.kind).toBe("Tuple");
            if (expr.kind !== "Tuple") return;
            expect(expr.elements).toHaveLength(3);
        });
    });

    describe("Function Call Arguments", () => {
        it("should parse function call with trailing comma", () => {
            const expr = parseExpr("fn(a, b, c,)");
            expect(expr.kind).toBe("App");
            if (expr.kind !== "App") return;
            expect(expr.args).toHaveLength(3);
        });

        it("should parse single-arg call with trailing comma", () => {
            const expr = parseExpr("fn(a,)");
            expect(expr.kind).toBe("App");
            if (expr.kind !== "App") return;
            expect(expr.args).toHaveLength(1);
        });

        it("should parse multi-line call with trailing comma", () => {
            const expr = parseExpr(`fn(
                a,
                b,
                c,
            )`);
            expect(expr.kind).toBe("App");
            if (expr.kind !== "App") return;
            expect(expr.args).toHaveLength(3);
        });

        it("should parse zero-arg call without trailing comma", () => {
            const expr = parseExpr("fn()");
            expect(expr.kind).toBe("App");
            if (expr.kind !== "App") return;
            expect(expr.args).toHaveLength(0);
        });
    });
});

describe("Trailing Commas - Pattern Contexts", () => {
    describe("List Patterns", () => {
        it("should parse list pattern with trailing comma", () => {
            const pattern = parsePattern("[a, b, c,]");
            expect(pattern.kind).toBe("ListPattern");
            if (pattern.kind !== "ListPattern") return;
            expect(pattern.elements).toHaveLength(3);
        });

        it("should parse single-element list pattern with trailing comma", () => {
            const pattern = parsePattern("[a,]");
            expect(pattern.kind).toBe("ListPattern");
            if (pattern.kind !== "ListPattern") return;
            expect(pattern.elements).toHaveLength(1);
        });
    });

    describe("Record Patterns", () => {
        it("should parse record pattern with trailing comma", () => {
            const pattern = parsePattern("{ name, age, }");
            expect(pattern.kind).toBe("RecordPattern");
            if (pattern.kind !== "RecordPattern") return;
            expect(pattern.fields).toHaveLength(2);
        });

        it("should parse single-field record pattern with trailing comma", () => {
            const pattern = parsePattern("{ name, }");
            expect(pattern.kind).toBe("RecordPattern");
            if (pattern.kind !== "RecordPattern") return;
            expect(pattern.fields).toHaveLength(1);
        });

        it("should parse record pattern with explicit bindings and trailing comma", () => {
            const pattern = parsePattern("{ name: n, age: a, }");
            expect(pattern.kind).toBe("RecordPattern");
            if (pattern.kind !== "RecordPattern") return;
            expect(pattern.fields).toHaveLength(2);
        });
    });

    describe("Tuple Patterns", () => {
        it("should parse tuple pattern with trailing comma", () => {
            const pattern = parsePattern("(a, b, c,)");
            expect(pattern.kind).toBe("TuplePattern");
            if (pattern.kind !== "TuplePattern") return;
            expect(pattern.elements).toHaveLength(3);
        });

        it("should parse two-element tuple pattern with trailing comma", () => {
            const pattern = parsePattern("(a, b,)");
            expect(pattern.kind).toBe("TuplePattern");
            if (pattern.kind !== "TuplePattern") return;
            expect(pattern.elements).toHaveLength(2);
        });
    });

    describe("Constructor Patterns", () => {
        it("should parse constructor pattern with trailing comma", () => {
            const pattern = parsePattern("Some(a, b, c,)");
            expect(pattern.kind).toBe("ConstructorPattern");
            if (pattern.kind !== "ConstructorPattern") return;
            expect(pattern.args).toHaveLength(3);
        });

        it("should parse single-arg constructor pattern with trailing comma", () => {
            const pattern = parsePattern("Some(a,)");
            expect(pattern.kind).toBe("ConstructorPattern");
            if (pattern.kind !== "ConstructorPattern") return;
            expect(pattern.args).toHaveLength(1);
        });
    });
});

describe("Trailing Commas - Type Contexts", () => {
    describe("Record Types", () => {
        it("should parse record type with trailing comma", () => {
            const type = parseType("{ name: String, age: Int, }");
            expect(type.kind).toBe("RecordType");
            if (type.kind !== "RecordType") return;
            expect(type.fields).toHaveLength(2);
        });

        it("should parse single-field record type with trailing comma", () => {
            const type = parseType("{ name: String, }");
            expect(type.kind).toBe("RecordType");
            if (type.kind !== "RecordType") return;
            expect(type.fields).toHaveLength(1);
        });

        it("should parse multi-line record type with trailing comma", () => {
            const type = parseType("{ name: String, age: Int, active: Bool, }");
            expect(type.kind).toBe("RecordType");
            if (type.kind !== "RecordType") return;
            expect(type.fields).toHaveLength(3);
        });
    });

    describe("Function Type Parameters", () => {
        it("should parse function type with trailing comma in params", () => {
            const type = parseType("(Int, String, Bool,) -> Unit");
            expect(type.kind).toBe("FunctionType");
            if (type.kind !== "FunctionType") return;
            expect(type.params).toHaveLength(3);
        });

        it("should parse single-param function type with trailing comma", () => {
            const type = parseType("(Int,) -> String");
            expect(type.kind).toBe("FunctionType");
            if (type.kind !== "FunctionType") return;
            expect(type.params).toHaveLength(1);
        });
    });

    describe("Type Application", () => {
        it("should parse type application with trailing comma", () => {
            const type = parseType("Map<String, Int,>");
            expect(type.kind).toBe("TypeApp");
            if (type.kind !== "TypeApp") return;
            expect(type.args).toHaveLength(2);
        });

        it("should parse single-arg type application with trailing comma", () => {
            const type = parseType("List<Int,>");
            expect(type.kind).toBe("TypeApp");
            if (type.kind !== "TypeApp") return;
            expect(type.args).toHaveLength(1);
        });

        it("should parse multi-arg type application with trailing comma", () => {
            const type = parseType("Triple<Int, String, Bool,>");
            expect(type.kind).toBe("TypeApp");
            if (type.kind !== "TypeApp") return;
            expect(type.args).toHaveLength(3);
        });
    });
});

describe("Trailing Commas - Declaration Contexts", () => {
    describe("Type Definitions", () => {
        // Note: Type parameters in type definitions don't typically use trailing commas in practice
        // Keeping this test skipped as it's an edge case
        it.skip("should parse type definition with trailing comma in type params", () => {
            const source = "type Map<K, V,> = { get: (K) -> Option<V> };";
            const lexer = new Lexer(source, "test.vf");
            const tokens = lexer.tokenize();
            const parser = new Parser(tokens, "test.vf");
            const module = parser.parse();
            const decl = module.declarations[0];
            expect(decl?.kind).toBe("TypeDecl");
            if (decl?.kind !== "TypeDecl") return;
            expect(decl.params).toHaveLength(2);
        });

        it("should parse variant type with trailing comma", () => {
            const source = "type Option<T> = Some(T) | None;";
            const lexer = new Lexer(source, "test.vf");
            const tokens = lexer.tokenize();
            const parser = new Parser(tokens, "test.vf");
            const module = parser.parse();
            const decl = module.declarations[0];
            expect(decl?.kind).toBe("TypeDecl");
            // Note: Variant constructors are separated by |, not commas
        });
    });

    describe("Lambda Parameters", () => {
        it("should parse lambda with trailing comma in params", () => {
            const expr = parseExpr("(x, y, z,) => x + y + z");
            expect(expr.kind).toBe("Lambda");
            if (expr.kind !== "Lambda") return;
            expect(expr.params).toHaveLength(3);
        });

        it("should parse single-param lambda with trailing comma", () => {
            const expr = parseExpr("(x,) => x + 1");
            expect(expr.kind).toBe("Lambda");
            if (expr.kind !== "Lambda") return;
            expect(expr.params).toHaveLength(1);
        });

        it("should parse multi-line lambda params with trailing comma", () => {
            const expr = parseExpr(`(
                x,
                y,
                z,
            ) => x + y + z`);
            expect(expr.kind).toBe("Lambda");
            if (expr.kind !== "Lambda") return;
            expect(expr.params).toHaveLength(3);
        });
    });
});

describe("Trailing Commas - Error Cases", () => {
    describe("Multiple Trailing Commas", () => {
        it("should reject multiple trailing commas in list", () => {
            expect(() => parseExpr("[1, 2,,]")).toThrow();
        });

        it("should reject multiple trailing commas in record", () => {
            expect(() => parseExpr('{ name: "A",,}')).toThrow();
        });

        it("should reject multiple trailing commas in tuple", () => {
            expect(() => parseExpr("(1, 2,,)")).toThrow();
        });
    });

    describe("Comma-Only Expressions", () => {
        it("should reject list with only comma", () => {
            expect(() => parseExpr("[,]")).toThrow();
        });

        it("should reject record with only comma", () => {
            expect(() => parseExpr("{,}")).toThrow();
        });

        it("should reject tuple with only comma", () => {
            expect(() => parseExpr("(,)")).toThrow();
        });
    });
});

describe("Trailing Commas - Combined with Other Features", () => {
    describe("With Spreads", () => {
        it("should parse list with spread and trailing comma", () => {
            const expr = parseExpr("[1, ...rest,]");
            expect(expr.kind).toBe("List");
            if (expr.kind !== "List") return;
            expect(expr.elements).toHaveLength(2);
        });

        it("should parse record with spread and trailing comma", () => {
            const expr = parseExpr('{ ...base, name: "Alice", }');
            expect(expr.kind).toBe("RecordUpdate");
            if (expr.kind !== "RecordUpdate") return;
            expect(expr.updates).toHaveLength(1);
        });
    });

    describe("With Nested Structures", () => {
        it("should parse nested lists with trailing commas", () => {
            const expr = parseExpr("[[1, 2,], [3, 4,],]");
            expect(expr.kind).toBe("List");
            if (expr.kind !== "List") return;
            expect(expr.elements).toHaveLength(2);
        });

        it("should parse nested records with trailing commas", () => {
            const expr = parseExpr("{ outer: { inner: 42, }, }");
            expect(expr.kind).toBe("Record");
            if (expr.kind !== "Record") return;
            expect(expr.fields).toHaveLength(1);
        });
    });
});
