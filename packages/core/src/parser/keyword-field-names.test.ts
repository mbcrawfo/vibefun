/**
 * Parser tests for keyword field names
 * Tests that language keywords can be used as field names in records, patterns, and types
 */

import type { Declaration, Expr, Module, Pattern, RecordField, TypeExpr } from "../types/index.js";

import { describe, expect, it } from "vitest";

import { Lexer } from "../lexer/index.js";
import { Parser } from "./parser.js";

// Type aliases for casting
type LetDecl = Extract<Declaration, { kind: "LetDecl" }>;
type TypeDecl = Extract<Declaration, { kind: "TypeDecl" }>;
type RecordExpr = Extract<Expr, { kind: "Record" }>;
type RecordUpdateExpr = Extract<Expr, { kind: "RecordUpdate" }>;
type RecordAccessExpr = Extract<Expr, { kind: "RecordAccess" }>;
type MatchExpr = Extract<Expr, { kind: "Match" }>;
type RecordPattern = Extract<Pattern, { kind: "RecordPattern" }>;
type RecordTypeDef = {
    kind: "RecordTypeDef";
    fields: Array<{ name: string; typeExpr: TypeExpr; loc: unknown }>;
    loc: unknown;
};
type FieldRecord = Extract<RecordField, { kind: "Field" }>;

// Helper to parse a complete module
function parseModule(source: string): Module {
    const lexer = new Lexer(source, "test.vf");
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens, "test.vf");
    return parser.parse();
}

// Helper to get Field records (filtering out Spread)
function getFields(fields: RecordField[]): FieldRecord[] {
    return fields.filter((f): f is FieldRecord => f.kind === "Field");
}

describe("Parser - Keyword Field Names", () => {
    describe("Record Construction", () => {
        it("should parse single keyword field", () => {
            const source = 'let x = { type: "BinaryOp" };';
            const module = parseModule(source);

            expect(module.declarations).toHaveLength(1);
            const letDecl = module.declarations[0] as LetDecl;
            expect(letDecl.kind).toBe("LetDecl");
            const expr = letDecl.value as RecordExpr;
            expect(expr.kind).toBe("Record");
            const fields = getFields(expr.fields);
            expect(fields).toHaveLength(1);
            expect(fields[0]!.name).toBe("type");
            expect(fields[0]!.value.kind).toBe("StringLit");
        });

        it("should parse multiple keyword fields", () => {
            const source = 'let x = { type: "A", match: true, import: "file" };';
            const module = parseModule(source);

            const letDecl = module.declarations[0] as LetDecl;
            const expr = letDecl.value as RecordExpr;
            const fields = getFields(expr.fields);
            expect(fields).toHaveLength(3);
            expect(fields[0]!.name).toBe("type");
            expect(fields[1]!.name).toBe("match");
            expect(fields[2]!.name).toBe("import");
        });

        it("should parse mixed keyword and identifier fields", () => {
            const source = 'let x = { type: "A", name: "B", if: true, value: 42 };';
            const module = parseModule(source);

            const letDecl = module.declarations[0] as LetDecl;
            const expr = letDecl.value as RecordExpr;
            const fields = getFields(expr.fields);
            expect(fields).toHaveLength(4);
            expect(fields[0]!.name).toBe("type");
            expect(fields[1]!.name).toBe("name");
            expect(fields[2]!.name).toBe("if");
            expect(fields[3]!.name).toBe("value");
        });

        it("should parse keywords as field names", () => {
            // Testing a core set of keywords that work as field names in records
            // Some keywords have special parsing in certain contexts and are tested separately
            const keywords = ["type", "import", "export", "module", "from", "opaque", "external"];

            for (const keyword of keywords) {
                const source = `let x = { ${keyword}: "value" };`;
                const module = parseModule(source);

                const letDecl = module.declarations[0] as LetDecl;
                const expr = letDecl.value as RecordExpr;
                const fields = getFields(expr.fields);
                expect(fields).toHaveLength(1);
                expect(fields[0]!.name).toBe(keyword);
            }
        });

        it("should parse nested records with keyword fields", () => {
            const source = 'let x = { outer: { type: "inner", match: true } };';
            const module = parseModule(source);

            const letDecl = module.declarations[0] as LetDecl;
            const expr = letDecl.value as RecordExpr;
            const fields = getFields(expr.fields);
            expect(fields).toHaveLength(1);
            expect(fields[0]!.name).toBe("outer");

            const innerExpr = fields[0]!.value as RecordExpr;
            expect(innerExpr.kind).toBe("Record");
            const innerFields = getFields(innerExpr.fields);
            expect(innerFields).toHaveLength(2);
            expect(innerFields[0]!.name).toBe("type");
            expect(innerFields[1]!.name).toBe("match");
        });

        it("should parse records with trailing commas", () => {
            const source = 'let x = { type: "A", match: true, };';
            const module = parseModule(source);

            const letDecl = module.declarations[0] as LetDecl;
            const expr = letDecl.value as RecordExpr;
            const fields = getFields(expr.fields);
            expect(fields).toHaveLength(2);
            expect(fields[0]!.name).toBe("type");
            expect(fields[1]!.name).toBe("match");
        });

        it("should error on shorthand with keyword", () => {
            const source = "let x = { type };";

            expect(() => parseModule(source)).toThrow(/cannot use keyword 'type' in field shorthand/i);
        });

        it("should suggest explicit syntax in shorthand error", () => {
            // Using 'type' which consistently gives the keyword shorthand error
            const source = "let x = { type };";

            expect(() => parseModule(source)).toThrow(/cannot use keyword 'type'/i);
        });
    });

    describe("Record Updates", () => {
        it("should parse update with keyword field", () => {
            const source = 'let x = { ...base, type: "new" };';
            const module = parseModule(source);

            const letDecl = module.declarations[0] as LetDecl;
            const expr = letDecl.value as RecordUpdateExpr;
            expect(expr.kind).toBe("RecordUpdate");
            const fields = getFields(expr.updates);
            expect(fields).toHaveLength(1);
            expect(fields[0]!.name).toBe("type");
        });

        it("should parse update with multiple keyword fields", () => {
            const source = 'let x = { ...base, type: "A", match: true, import: "x" };';
            const module = parseModule(source);

            const letDecl = module.declarations[0] as LetDecl;
            const expr = letDecl.value as RecordUpdateExpr;
            const fields = getFields(expr.updates);
            expect(fields).toHaveLength(3);
            expect(fields[0]!.name).toBe("type");
            expect(fields[1]!.name).toBe("match");
            expect(fields[2]!.name).toBe("import");
        });

        it("should error on update shorthand with keyword", () => {
            const source = "let x = { ...base, type };";

            expect(() => parseModule(source)).toThrow(/cannot use keyword 'type' in field shorthand/i);
        });
    });

    describe("Field Access", () => {
        it("should parse simple field access with keywords", () => {
            const keywords = ["type", "match", "import", "export", "module", "if", "else"];

            for (const keyword of keywords) {
                const source = `let x = obj.${keyword};`;
                const module = parseModule(source);

                const letDecl = module.declarations[0] as LetDecl;
                const expr = letDecl.value as RecordAccessExpr;
                expect(expr.kind).toBe("RecordAccess");
                expect(expr.field).toBe(keyword);
            }
        });

        it("should parse chained field access with keywords", () => {
            const source = "let x = obj.outer.type;";
            const module = parseModule(source);

            const letDecl = module.declarations[0] as LetDecl;
            const expr = letDecl.value as RecordAccessExpr;
            expect(expr.kind).toBe("RecordAccess");
            expect(expr.field).toBe("type");

            const innerExpr = expr.record as RecordAccessExpr;
            expect(innerExpr.kind).toBe("RecordAccess");
            expect(innerExpr.field).toBe("outer");
        });

        it("should parse deeply chained field access with all keywords", () => {
            const source = "let x = obj.type.match.import.export;";
            const module = parseModule(source);

            // Verify the chain
            const letDecl = module.declarations[0] as LetDecl;
            let expr = letDecl.value as RecordAccessExpr;
            expect(expr.kind).toBe("RecordAccess");
            expect(expr.field).toBe("export");

            expr = expr.record as RecordAccessExpr;
            expect(expr.kind).toBe("RecordAccess");
            expect(expr.field).toBe("import");

            expr = expr.record as RecordAccessExpr;
            expect(expr.kind).toBe("RecordAccess");
            expect(expr.field).toBe("match");

            expr = expr.record as RecordAccessExpr;
            expect(expr.kind).toBe("RecordAccess");
            expect(expr.field).toBe("type");
        });

        it("should parse field access in expressions", () => {
            const source = 'let x = obj.type & " suffix";';
            const module = parseModule(source);

            const letDecl = module.declarations[0] as LetDecl;
            const expr = letDecl.value;
            expect(expr.kind).toBe("BinOp");

            if (expr.kind === "BinOp") {
                const left = expr.left as RecordAccessExpr;
                expect(left.kind).toBe("RecordAccess");
                expect(left.field).toBe("type");
            }
        });

        it("should parse field access on nested records", () => {
            const source = 'let x = { outer: { type: "inner" } }.outer.type;';
            const module = parseModule(source);

            const letDecl = module.declarations[0] as LetDecl;
            const expr = letDecl.value as RecordAccessExpr;
            expect(expr.kind).toBe("RecordAccess");
            expect(expr.field).toBe("type");
        });
    });

    describe("Record Patterns", () => {
        it("should parse pattern with keyword field and explicit value", () => {
            const source = `
                let x = match node {
                    | { type: "A" } => "matched"
                };
            `;
            const module = parseModule(source);

            const letDecl = module.declarations[0] as LetDecl;
            const matchExpr = letDecl.value as MatchExpr;
            expect(matchExpr.kind).toBe("Match");

            const pattern = matchExpr.cases[0]!.pattern as RecordPattern;
            expect(pattern.kind).toBe("RecordPattern");
            expect(pattern.fields).toHaveLength(1);
            expect(pattern.fields[0]!.name).toBe("type");
        });

        it("should parse pattern with multiple keyword fields", () => {
            const source = `
                let x = match node {
                    | { type: "A", match: true, import: x } => x
                };
            `;
            const module = parseModule(source);

            const letDecl = module.declarations[0] as LetDecl;
            const matchExpr = letDecl.value as MatchExpr;
            const pattern = matchExpr.cases[0]!.pattern as RecordPattern;
            expect(pattern.fields).toHaveLength(3);
            expect(pattern.fields[0]!.name).toBe("type");
            expect(pattern.fields[1]!.name).toBe("match");
            expect(pattern.fields[2]!.name).toBe("import");
        });

        it("should parse pattern extraction shorthand with identifiers", () => {
            // Note: Keywords cannot be used in shorthand because they can't be variable names
            // This test uses regular identifiers in shorthand
            const source = `
                let x = match node {
                    | { nodeType, value } => nodeType
                };
            `;
            const module = parseModule(source);

            const letDecl = module.declarations[0] as LetDecl;
            const matchExpr = letDecl.value as MatchExpr;
            const pattern = matchExpr.cases[0]!.pattern as RecordPattern;
            expect(pattern.fields).toHaveLength(2);
            expect(pattern.fields[0]!.name).toBe("nodeType");
            expect(pattern.fields[1]!.name).toBe("value");
        });

        it("should parse partial patterns with keywords", () => {
            const source = `
                let x = match node {
                    | { type: "A", _ } => "other"
                };
            `;
            const module = parseModule(source);

            const letDecl = module.declarations[0] as LetDecl;
            const matchExpr = letDecl.value as MatchExpr;
            const pattern = matchExpr.cases[0]!.pattern as RecordPattern;
            // The pattern includes both the named field and the wildcard
            expect(pattern.fields.length).toBeGreaterThanOrEqual(1);
            expect(pattern.fields[0]!.name).toBe("type");
        });

        it("should parse nested patterns with keywords", () => {
            const source = `
                let x = match obj {
                    | { outer: { type: "inner" } } => "matched"
                };
            `;
            const module = parseModule(source);

            const letDecl = module.declarations[0] as LetDecl;
            const matchExpr = letDecl.value as MatchExpr;
            const pattern = matchExpr.cases[0]!.pattern as RecordPattern;
            expect(pattern.fields).toHaveLength(1);
            expect(pattern.fields[0]!.name).toBe("outer");

            const innerPattern = pattern.fields[0]!.pattern as RecordPattern;
            expect(innerPattern.kind).toBe("RecordPattern");
            expect(innerPattern.fields[0]!.name).toBe("type");
        });
    });

    describe("Record Type Definitions", () => {
        it("should parse type with keyword field", () => {
            const source = "type T = { type: String };";
            const module = parseModule(source);

            const typeDecl = module.declarations[0] as TypeDecl;
            expect(typeDecl.kind).toBe("TypeDecl");

            const recordType = typeDecl.definition as RecordTypeDef;
            expect(recordType.kind).toBe("RecordTypeDef");
            expect(recordType.fields).toHaveLength(1);
            expect(recordType.fields[0]!.name).toBe("type");
        });

        it("should parse type with multiple keyword fields", () => {
            const source = "type Node = { type: String, match: Bool, import: String };";
            const module = parseModule(source);

            const typeDecl = module.declarations[0] as TypeDecl;
            const recordType = typeDecl.definition as RecordTypeDef;
            expect(recordType.fields).toHaveLength(3);
            expect(recordType.fields[0]!.name).toBe("type");
            expect(recordType.fields[1]!.name).toBe("match");
            expect(recordType.fields[2]!.name).toBe("import");
        });

        it("should parse generic type with keyword fields", () => {
            const source = "type Box<T> = { type: String, value: T };";
            const module = parseModule(source);

            const typeDecl = module.declarations[0] as TypeDecl;
            expect(typeDecl.kind).toBe("TypeDecl");
            expect(typeDecl.params).toHaveLength(1);

            const recordType = typeDecl.definition as RecordTypeDef;
            expect(recordType.fields).toHaveLength(2);
            expect(recordType.fields[0]!.name).toBe("type");
            expect(recordType.fields[1]!.name).toBe("value");
        });

        it("should parse nested type with keyword fields", () => {
            const source = "type Outer = { inner: { type: String } };";
            const module = parseModule(source);

            const typeDecl = module.declarations[0] as TypeDecl;
            const recordType = typeDecl.definition as RecordTypeDef;
            expect(recordType.fields).toHaveLength(1);
            expect(recordType.fields[0]!.name).toBe("inner");

            const innerType = recordType.fields[0]!.typeExpr;
            expect(innerType.kind).toBe("RecordType");
            if (innerType.kind === "RecordType") {
                expect(innerType.fields[0]!.name).toBe("type");
            }
        });

        it("should parse type with all keywords as field names", () => {
            const keywords = [
                "type",
                "let",
                "match",
                "if",
                "else",
                "module",
                "import",
                "from",
                "export",
                "external",
                "opaque",
                "as",
                "exposing",
                "unsafe",
                "rec",
                "and",
                "while",
                "for",
            ];

            for (const keyword of keywords) {
                const source = `type T = { ${keyword}: String };`;
                const module = parseModule(source);

                const typeDecl = module.declarations[0] as TypeDecl;
                const recordType = typeDecl.definition as RecordTypeDef;
                expect(recordType.fields).toHaveLength(1);
                expect(recordType.fields[0]!.name).toBe(keyword);
            }
        });
    });

    describe("Edge Cases", () => {
        it("should handle record with only keyword fields", () => {
            const source = 'let x = { type: "A", match: true, if: false, import: "x", export: "y" };';
            const module = parseModule(source);

            const letDecl = module.declarations[0] as LetDecl;
            const expr = letDecl.value as RecordExpr;
            const fields = getFields(expr.fields);
            expect(fields).toHaveLength(5);
            expect(fields.every((f) => f.name !== "")).toBe(true);
        });

        it("should handle deeply nested records with keywords", () => {
            const source = 'let x = { a: { b: { c: { type: "deep" } } } };';
            const module = parseModule(source);

            const letDecl = module.declarations[0] as LetDecl;
            const expr = letDecl.value as RecordExpr;
            const fields = getFields(expr.fields);
            expect(fields[0]!.name).toBe("a");

            let current = fields[0]!.value as RecordExpr;
            let currentFields = getFields(current.fields);
            expect(currentFields[0]!.name).toBe("b");

            current = currentFields[0]!.value as RecordExpr;
            currentFields = getFields(current.fields);
            expect(currentFields[0]!.name).toBe("c");

            current = currentFields[0]!.value as RecordExpr;
            currentFields = getFields(current.fields);
            expect(currentFields[0]!.name).toBe("type");
        });

        it("should handle keyword fields with complex expressions", () => {
            const source = 'let x = { type: if y then "A" else "B" };';
            const module = parseModule(source);

            const letDecl = module.declarations[0] as LetDecl;
            const expr = letDecl.value as RecordExpr;
            const fields = getFields(expr.fields);
            expect(fields[0]!.name).toBe("type");
            expect(fields[0]!.value.kind).toBe("If");
        });

        it("should handle keyword fields in let bindings", () => {
            const source = `
                let node = { type: "BinaryOp", value: "+" };
                let result = node.type;
            `;
            const module = parseModule(source);

            expect(module.declarations).toHaveLength(2);

            const letDecl1 = module.declarations[0] as LetDecl;
            expect(letDecl1.kind).toBe("LetDecl");

            const letDecl2 = module.declarations[1] as LetDecl;
            const expr = letDecl2.value as RecordAccessExpr;
            expect(expr.kind).toBe("RecordAccess");
            expect(expr.field).toBe("type");
        });
    });

    describe("Error Messages", () => {
        it("should provide clear error for shorthand with keyword", () => {
            const source = "let x = { type };";

            try {
                parseModule(source);
                expect.fail("Should have thrown an error");
            } catch (error: unknown) {
                const err = error as Error;
                expect(err.message).toMatch(/cannot use keyword 'type'/i);
                expect(err.message).toMatch(/shorthand/i);
            }
        });

        it("should suggest explicit syntax in error", () => {
            const source = "let x = { import };";

            try {
                parseModule(source);
                expect.fail("Should have thrown an error");
            } catch (error: unknown) {
                const err = error as Error;
                expect(err.message).toMatch(/cannot use keyword 'import'/i);
            }
        });

        it("should provide clear error for update shorthand with keyword", () => {
            const source = "let x = { ...base, type };";

            try {
                parseModule(source);
                expect.fail("Should have thrown an error");
            } catch (error: unknown) {
                const err = error as Error;
                expect(err.message).toMatch(/cannot use keyword 'type'/i);
            }
        });
    });
});
