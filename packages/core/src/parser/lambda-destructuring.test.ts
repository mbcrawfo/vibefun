import type { Expr, Pattern } from "../types/index.js";

import { describe, expect, it } from "vitest";

import { Lexer } from "../lexer/lexer.js";
import { Parser } from "./parser.js";

// Helper to parse an expression
function parseExpr(source: string): Expr {
    const lexer = new Lexer(source, "test.vf");
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens, "test.vf");
    return parser.parseExpression();
}

describe("Lambda Parameter Destructuring", () => {
    describe("record destructuring", () => {
        it("should parse single-field record destructuring", () => {
            const source = "({ name }) => name";
            const ast = parseExpr(source);

            expect(ast.kind).toBe("Lambda");
            if (ast.kind !== "Lambda") throw new Error("Not a lambda");
            expect(ast.params).toHaveLength(1);
            expect(ast.params[0]?.pattern.kind).toBe("RecordPattern");
            const recordPattern = ast.params[0]?.pattern as Extract<Pattern, { kind: "RecordPattern" }>;
            expect(recordPattern.fields).toHaveLength(1);
            expect(recordPattern.fields[0]).toMatchObject({
                name: "name",
                pattern: { kind: "VarPattern", name: "name" },
            });
        });

        it("should parse multi-field record destructuring", () => {
            const source = "({ name, age }) => name";

            const ast = parseExpr(source);

            expect(ast.kind).toBe("Lambda");
            if (ast.kind !== "Lambda") throw new Error("Not a lambda");
            expect(ast.params).toHaveLength(1);
            expect(ast.params[0]?.pattern.kind).toBe("RecordPattern");
            const recordPattern = ast.params[0]?.pattern as Extract<Pattern, { kind: "RecordPattern" }>;
            expect(recordPattern.fields).toHaveLength(2);
        });

        it("should parse record destructuring with renamed fields", () => {
            const source = "({ name: userName, age: userAge }) => userName";

            const ast = parseExpr(source);

            expect(ast.kind).toBe("Lambda");
            if (ast.kind !== "Lambda") throw new Error("Not a lambda");
            const recordPattern = ast.params[0]?.pattern as Extract<Pattern, { kind: "RecordPattern" }>;
            expect(recordPattern.fields[0]).toMatchObject({
                name: "name",
                pattern: { kind: "VarPattern", name: "userName" },
            });
        });
    });

    describe("tuple destructuring", () => {
        it("should parse tuple destructuring with two elements", () => {
            const source = "((x, y)) => x + y";

            const ast = parseExpr(source);

            expect(ast.kind).toBe("Lambda");
            if (ast.kind !== "Lambda") throw new Error("Not a lambda");
            expect(ast.params).toHaveLength(1);
            expect(ast.params[0]?.pattern.kind).toBe("TuplePattern");
            const tuplePattern = ast.params[0]?.pattern as Extract<Pattern, { kind: "TuplePattern" }>;
            expect(tuplePattern.elements).toHaveLength(2);
            expect(tuplePattern.elements[0]?.kind).toBe("VarPattern");
            expect(tuplePattern.elements[1]?.kind).toBe("VarPattern");
        });

        it("should parse tuple destructuring with more elements", () => {
            const source = "((a, b, c)) => a + b + c";

            const ast = parseExpr(source);

            expect(ast.kind).toBe("Lambda");
            if (ast.kind !== "Lambda") throw new Error("Not a lambda");
            const tuplePattern = ast.params[0]?.pattern as Extract<Pattern, { kind: "TuplePattern" }>;
            expect(tuplePattern.elements).toHaveLength(3);
        });
    });

    describe("list destructuring", () => {
        it("should parse list destructuring with fixed elements", () => {
            const source = "([first, second]) => first";

            const ast = parseExpr(source);

            expect(ast.kind).toBe("Lambda");
            if (ast.kind !== "Lambda") throw new Error("Not a lambda");
            expect(ast.params).toHaveLength(1);
            expect(ast.params[0]?.pattern.kind).toBe("ListPattern");
            const listPattern = ast.params[0]?.pattern as Extract<Pattern, { kind: "ListPattern" }>;
            expect(listPattern.elements).toHaveLength(2);
            expect(listPattern.rest).toBeUndefined();
        });

        it("should parse list destructuring with rest pattern", () => {
            const source = "([first, ...rest]) => first";

            const ast = parseExpr(source);

            expect(ast.kind).toBe("Lambda");
            if (ast.kind !== "Lambda") throw new Error("Not a lambda");
            const listPattern = ast.params[0]?.pattern as Extract<Pattern, { kind: "ListPattern" }>;
            expect(listPattern.elements).toHaveLength(1);
            expect(listPattern.rest).toBeDefined();
            expect(listPattern.rest).toMatchObject({
                kind: "VarPattern",
                name: "rest",
            });
        });

        it("should parse list with wildcard rest", () => {
            const source = "([first, ..._]) => first";

            const ast = parseExpr(source);

            expect(ast.kind).toBe("Lambda");
            if (ast.kind !== "Lambda") throw new Error("Not a lambda");
            const listPattern = ast.params[0]?.pattern as Extract<Pattern, { kind: "ListPattern" }>;
            expect(listPattern.rest?.kind).toBe("WildcardPattern");
        });
    });

    describe("nested destructuring", () => {
        it("should parse nested record destructuring", () => {
            const source = "({ user: { name } }) => name";

            const ast = parseExpr(source);

            expect(ast.kind).toBe("Lambda");
            if (ast.kind !== "Lambda") throw new Error("Not a lambda");
            const recordPattern = ast.params[0]?.pattern as Extract<Pattern, { kind: "RecordPattern" }>;
            expect(recordPattern.fields[0]?.name).toBe("user");
            expect(recordPattern.fields[0]?.pattern.kind).toBe("RecordPattern");
        });

        it("should parse deeply nested destructuring", () => {
            const source = "({ profile: { user: { name } } }) => name";

            const ast = parseExpr(source);

            expect(ast.kind).toBe("Lambda");
            if (ast.kind !== "Lambda") throw new Error("Not a lambda");
            expect(ast.params).toHaveLength(1);
            expect(ast.params[0]?.pattern.kind).toBe("RecordPattern");
        });

        it("should parse record inside tuple", () => {
            const source = "(({ name }, age)) => name";

            const ast = parseExpr(source);

            expect(ast.kind).toBe("Lambda");
            if (ast.kind !== "Lambda") throw new Error("Not a lambda");
            const tuplePattern = ast.params[0]?.pattern as Extract<Pattern, { kind: "TuplePattern" }>;
            expect(tuplePattern.elements[0]?.kind).toBe("RecordPattern");
            expect(tuplePattern.elements[1]?.kind).toBe("VarPattern");
        });

        it("should parse tuple inside record", () => {
            const source = "({ coords: (x, y) }) => x";

            const ast = parseExpr(source);

            expect(ast.kind).toBe("Lambda");
            if (ast.kind !== "Lambda") throw new Error("Not a lambda");
            const recordPattern = ast.params[0]?.pattern as Extract<Pattern, { kind: "RecordPattern" }>;
            expect(recordPattern.fields[0]?.name).toBe("coords");
            expect(recordPattern.fields[0]?.pattern.kind).toBe("TuplePattern");
        });
    });

    describe("mixed parameter types", () => {
        it("should parse mix of simple and destructured parameters", () => {
            const source = "(prefix, { value }) => prefix";

            const ast = parseExpr(source);

            expect(ast.kind).toBe("Lambda");
            if (ast.kind !== "Lambda") throw new Error("Not a lambda");
            expect(ast.params).toHaveLength(2);
            expect(ast.params[0]?.pattern.kind).toBe("VarPattern");
            expect(ast.params[1]?.pattern.kind).toBe("RecordPattern");
        });

        it("should parse multiple destructured parameters", () => {
            const source = "({ name }, { age }) => name";

            const ast = parseExpr(source);

            expect(ast.kind).toBe("Lambda");
            if (ast.kind !== "Lambda") throw new Error("Not a lambda");
            expect(ast.params).toHaveLength(2);
            expect(ast.params[0]?.pattern.kind).toBe("RecordPattern");
            expect(ast.params[1]?.pattern.kind).toBe("RecordPattern");
        });

        it("should parse destructuring with simple params in different positions", () => {
            const source = "({ x }, y, { z }) => x + y + z";

            const ast = parseExpr(source);

            expect(ast.kind).toBe("Lambda");
            if (ast.kind !== "Lambda") throw new Error("Not a lambda");
            expect(ast.params).toHaveLength(3);
            expect(ast.params[0]?.pattern.kind).toBe("RecordPattern");
            expect(ast.params[1]?.pattern.kind).toBe("VarPattern");
            expect(ast.params[2]?.pattern.kind).toBe("RecordPattern");
        });
    });

    describe("destructuring with type annotations", () => {
        it("should parse record destructuring with type annotation", () => {
            const source = "({ name }: { name: String }) => name";

            const ast = parseExpr(source);

            expect(ast.kind).toBe("Lambda");
            if (ast.kind !== "Lambda") throw new Error("Not a lambda");
            expect(ast.params[0]?.type).toBeDefined();
            expect(ast.params[0]?.type?.kind).toBe("RecordType");
        });

        it("should parse tuple destructuring with type annotation", () => {
            const source = "((x, y): (Int, Int)) => x + y";

            const ast = parseExpr(source);

            expect(ast.kind).toBe("Lambda");
            if (ast.kind !== "Lambda") throw new Error("Not a lambda");
            expect(ast.params[0]?.type).toBeDefined();
            // Type should be a function type with two Int parameters
            // or a tuple type - depending on how we represent it
        });

        it("should parse list destructuring with type annotation", () => {
            const source = "([x, y]: List<Int>) => x + y";

            const ast = parseExpr(source);

            expect(ast.kind).toBe("Lambda");
            if (ast.kind !== "Lambda") throw new Error("Not a lambda");
            expect(ast.params[0]?.type).toBeDefined();
            expect(ast.params[0]?.type?.kind).toBe("TypeApp");
        });

        it("should parse multiple params with mixed type annotations", () => {
            const source = "(x: Int, { name }: { name: String }) => name";

            const ast = parseExpr(source);

            expect(ast.kind).toBe("Lambda");
            if (ast.kind !== "Lambda") throw new Error("Not a lambda");
            expect(ast.params).toHaveLength(2);
            expect(ast.params[0]?.type?.kind).toBe("TypeConst");
            expect(ast.params[1]?.type?.kind).toBe("RecordType");
        });
    });

    describe("destructuring with return types", () => {
        it("should parse record destructuring with return type", () => {
            const source = "({ name }): String => name";

            const ast = parseExpr(source);

            expect(ast.kind).toBe("Lambda");
            if (ast.kind !== "Lambda") throw new Error("Not a lambda");
            expect(ast.returnType).toBeDefined();
            expect(ast.returnType?.kind).toBe("TypeConst");
        });

        it("should parse destructuring with both param and return types", () => {
            const source = "({ name }: { name: String }): String => name";

            const ast = parseExpr(source);

            expect(ast.kind).toBe("Lambda");
            if (ast.kind !== "Lambda") throw new Error("Not a lambda");
            expect(ast.params[0]?.type).toBeDefined();
            expect(ast.returnType).toBeDefined();
        });
    });

    describe("constructor patterns in parameters", () => {
        it("should parse Some constructor in parameter", () => {
            const source = "(Some(x)) => x";

            const ast = parseExpr(source);

            expect(ast.kind).toBe("Lambda");
            if (ast.kind !== "Lambda") throw new Error("Not a lambda");
            expect(ast.params[0]?.pattern.kind).toBe("ConstructorPattern");
            const ctorPattern = ast.params[0]?.pattern as Extract<Pattern, { kind: "ConstructorPattern" }>;
            expect(ctorPattern.constructor).toBe("Some");
            expect(ctorPattern.args).toHaveLength(1);
        });

        it("should parse Ok constructor with tuple", () => {
            const source = "(Ok((x, y))) => x";

            const ast = parseExpr(source);

            expect(ast.kind).toBe("Lambda");
            if (ast.kind !== "Lambda") throw new Error("Not a lambda");
            const ctorPattern = ast.params[0]?.pattern as Extract<Pattern, { kind: "ConstructorPattern" }>;
            expect(ctorPattern.constructor).toBe("Ok");
            expect(ctorPattern.args[0]?.kind).toBe("TuplePattern");
        });
    });

    describe("wildcard patterns", () => {
        it("should parse wildcard in record destructuring", () => {
            const source = "({ name: _, age }) => age";

            const ast = parseExpr(source);

            expect(ast.kind).toBe("Lambda");
            if (ast.kind !== "Lambda") throw new Error("Not a lambda");
            const recordPattern = ast.params[0]?.pattern as Extract<Pattern, { kind: "RecordPattern" }>;
            expect(recordPattern.fields[0]?.name).toBe("name");
            expect(recordPattern.fields[0]?.pattern.kind).toBe("WildcardPattern");
        });

        it("should parse wildcard in list position", () => {
            const source = "([_, second]) => second";

            const ast = parseExpr(source);

            expect(ast.kind).toBe("Lambda");
            if (ast.kind !== "Lambda") throw new Error("Not a lambda");
            const listPattern = ast.params[0]?.pattern as Extract<Pattern, { kind: "ListPattern" }>;
            expect(listPattern.elements[0]?.kind).toBe("WildcardPattern");
        });
    });

    describe("error cases", () => {
        it("should reject incomplete destructuring", () => {
            const source = "({) => 1";

            expect(() => parseExpr(source)).toThrow();
        });

        it("should reject destructuring without closing paren", () => {
            const source = "({ name } => name";

            expect(() => parseExpr(source)).toThrow();
        });
    });

    describe("edge cases", () => {
        it("should parse empty record pattern", () => {
            const source = "({}) => 1";

            const ast = parseExpr(source);

            expect(ast.kind).toBe("Lambda");
            if (ast.kind !== "Lambda") throw new Error("Not a lambda");
            const recordPattern = ast.params[0]?.pattern as Extract<Pattern, { kind: "RecordPattern" }>;
            expect(recordPattern.fields).toHaveLength(0);
        });

        it("should parse newlines between parameters", () => {
            const source = `({ name },
                           { age }) => name`;

            const ast = parseExpr(source);

            expect(ast.kind).toBe("Lambda");
            if (ast.kind !== "Lambda") throw new Error("Not a lambda");
            expect(ast.params).toHaveLength(2);
        });
    });

    describe("real-world examples from spec", () => {
        it("should parse getName example", () => {
            const source = "({ name }) => name";

            const ast = parseExpr(source);

            expect(ast.kind).toBe("Lambda");
        });

        it("should parse getCoords example", () => {
            const source = "({ x, y }) => (x, y)";

            const ast = parseExpr(source);

            expect(ast.kind).toBe("Lambda");
        });

        it("should parse getFirst example", () => {
            const source = "([first, ..._]) => first";

            const ast = parseExpr(source);

            expect(ast.kind).toBe("Lambda");
        });

        it("should parse addPair example", () => {
            const source = "([a, b]) => a + b";

            const ast = parseExpr(source);

            expect(ast.kind).toBe("Lambda");
        });

        it("should parse processUser example", () => {
            const source = '({ profile: { name, age } }) => name & " is " & String.fromInt(age)';

            const ast = parseExpr(source);

            expect(ast.kind).toBe("Lambda");
        });

        it("should parse combine example", () => {
            const source = "(prefix, { value }) => prefix & String.fromInt(value)";

            const ast = parseExpr(source);

            expect(ast.kind).toBe("Lambda");
        });
    });
});
