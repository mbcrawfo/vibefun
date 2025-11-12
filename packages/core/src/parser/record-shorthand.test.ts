/**
 * Record Shorthand Syntax Tests
 *
 * Tests record field shorthand in both construction and update
 */

import type { Expr } from "../types/ast.js";

import { describe, expect, it } from "vitest";

import { Lexer } from "../lexer/index.js";
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

describe("Record Shorthand - Construction", () => {
    describe("Basic Shorthand", () => {
        it("should parse single shorthand field", () => {
            const expr = parseExpr("let obj = { name };");
            expect(expr.kind).toBe("Record");
            if (expr.kind !== "Record") return;
            expect(expr.fields).toHaveLength(1);
            const field = expr.fields[0];
            if (!field || field.kind !== "Field") throw new Error("Expected Field");
            expect(field.name).toBe("name");
            expect(field.value.kind).toBe("Var");
            if (field.value.kind !== "Var") return;
            expect(field.value.name).toBe("name");
        });

        it("should parse multiple shorthand fields", () => {
            const expr = parseExpr("let obj = { name, age, active };");
            expect(expr.kind).toBe("Record");
            if (expr.kind !== "Record") return;
            expect(expr.fields).toHaveLength(3);

            const field1 = expr.fields[0];
            if (!field1 || field1.kind !== "Field") throw new Error("Expected Field");
            expect(field1.name).toBe("name");
            expect(field1.value.kind).toBe("Var");

            const field2 = expr.fields[1];
            if (!field2 || field2.kind !== "Field") throw new Error("Expected Field");
            expect(field2.name).toBe("age");

            const field3 = expr.fields[2];
            if (!field3 || field3.kind !== "Field") throw new Error("Expected Field");
            expect(field3.name).toBe("active");
        });
    });

    describe("Mixed Shorthand and Regular Fields", () => {
        it("should parse shorthand and regular fields together", () => {
            const expr = parseExpr("let obj = { name, age: 30 };");
            expect(expr.kind).toBe("Record");
            if (expr.kind !== "Record") return;
            expect(expr.fields).toHaveLength(2);

            const field1 = expr.fields[0];
            if (!field1 || field1.kind !== "Field") throw new Error("Expected Field");
            expect(field1.name).toBe("name");
            expect(field1.value.kind).toBe("Var");

            const field2 = expr.fields[1];
            if (!field2 || field2.kind !== "Field") throw new Error("Expected Field");
            expect(field2.name).toBe("age");
            expect(field2.value.kind).toBe("IntLit");
        });

        it("should parse regular fields before shorthand", () => {
            const expr = parseExpr("let obj = { x: 1, y: 2, name };");
            expect(expr.kind).toBe("Record");
            if (expr.kind !== "Record") return;
            expect(expr.fields).toHaveLength(3);
        });

        it("should parse alternating shorthand and regular fields", () => {
            const expr = parseExpr("let obj = { name, x: 1, age, y: 2 };");
            expect(expr.kind).toBe("Record");
            if (expr.kind !== "Record") return;
            expect(expr.fields).toHaveLength(4);
        });
    });

    describe("Shorthand with Multi-line", () => {
        it("should parse shorthand fields on separate lines", () => {
            const expr = parseExpr(`let obj = {
                name,
                age,
                active
            };`);
            expect(expr.kind).toBe("Record");
            if (expr.kind !== "Record") return;
            expect(expr.fields).toHaveLength(3);
        });

        it("should parse mixed fields on separate lines", () => {
            const expr = parseExpr(`let obj = {
                name,
                age: 30,
                active
            };`);
            expect(expr.kind).toBe("Record");
            if (expr.kind !== "Record") return;
            expect(expr.fields).toHaveLength(3);
        });
    });
});

describe("Record Shorthand - Update with Spread", () => {
    describe("Shorthand in Update", () => {
        it("should parse shorthand in record update", () => {
            const expr = parseExpr("let updated = { ...base, name };");
            expect(expr.kind).toBe("RecordUpdate");
            if (expr.kind !== "RecordUpdate") return;

            // First spread becomes the record field
            expect(expr.record.kind).toBe("Var");
            if (expr.record.kind !== "Var") return;
            expect(expr.record.name).toBe("base");

            // Only the shorthand field in updates
            expect(expr.updates.length).toBe(1);

            const nameField = expr.updates[0];
            if (!nameField || nameField.kind !== "Field") throw new Error("Expected Field");
            expect(nameField.name).toBe("name");
            expect(nameField.value.kind).toBe("Var");
            if (nameField.value.kind !== "Var") return;
            expect(nameField.value.name).toBe("name");
        });

        it("should parse multiple shorthand fields in update", () => {
            const expr = parseExpr("let updated = { ...base, name, age, active };");
            expect(expr.kind).toBe("RecordUpdate");
            if (expr.kind !== "RecordUpdate") return;

            // First spread in record field, 3 fields in updates
            expect(expr.record.kind).toBe("Var");
            expect(expr.updates.length).toBe(3);
        });

        it("should parse mixed shorthand and regular in update", () => {
            const expr = parseExpr("let updated = { ...base, name, x: 1, age };");
            expect(expr.kind).toBe("RecordUpdate");
            if (expr.kind !== "RecordUpdate") return;

            // Find the regular field (x: 1)
            const regularField = expr.updates.find((f) => f.kind === "Field" && f.name === "x");
            if (!regularField || regularField.kind !== "Field") throw new Error("Expected Field");
            expect(regularField.value.kind).toBe("IntLit");
        });
    });

    describe("Shorthand with Multiple Spreads", () => {
        it("should parse shorthand with multiple spreads", () => {
            const expr = parseExpr("let updated = { ...base, name, ...extra, age };");
            expect(expr.kind).toBe("RecordUpdate");
            if (expr.kind !== "RecordUpdate") return;

            // First spread (...base) in record field
            expect(expr.record.kind).toBe("Var");
            if (expr.record.kind !== "Var") return;
            expect(expr.record.name).toBe("base");

            // Updates has: name, ...extra, age (1 spread + 2 fields)
            expect(expr.updates.length).toBe(3);
            const spreads = expr.updates.filter((f) => f.kind === "Spread");
            expect(spreads.length).toBe(1);
            if (spreads[0]?.kind !== "Spread") return;
            expect(spreads[0].expr.kind).toBe("Var");
        });
    });

    describe("Shorthand in Multi-line Update", () => {
        it("should parse shorthand in multi-line update", () => {
            const expr = parseExpr(`let updated = {
                ...base,
                name,
                age
            };`);
            expect(expr.kind).toBe("RecordUpdate");
            if (expr.kind !== "RecordUpdate") return;

            // First spread in record field, 2 fields in updates
            expect(expr.record.kind).toBe("Var");
            expect(expr.updates.length).toBe(2);
        });

        it("should parse mixed fields in multi-line update", () => {
            const expr = parseExpr(`let updated = {
                ...base,
                name,
                x: 42,
                age
            };`);
            expect(expr.kind).toBe("RecordUpdate");
            if (expr.kind !== "RecordUpdate") return;

            // First spread in record field, 3 fields in updates
            expect(expr.record.kind).toBe("Var");
            expect(expr.updates.length).toBe(3);
        });
    });
});

describe("Record Shorthand - Edge Cases", () => {
    describe("Empty and Single Field", () => {
        it("should parse single shorthand field", () => {
            const expr = parseExpr("let obj = { x };");
            expect(expr.kind).toBe("Record");
            if (expr.kind !== "Record") return;
            expect(expr.fields).toHaveLength(1);
        });

        it("should NOT parse empty record as shorthand", () => {
            const expr = parseExpr("let obj = { };");
            expect(expr.kind).toBe("Record");
            if (expr.kind !== "Record") return;
            expect(expr.fields).toHaveLength(0);
        });
    });

    describe("Shorthand in Nested Records", () => {
        it("should parse shorthand in nested record", () => {
            const expr = parseExpr("let obj = { outer: { name, age } };");
            expect(expr.kind).toBe("Record");
            if (expr.kind !== "Record") return;

            const outerField = expr.fields[0];
            if (!outerField || outerField.kind !== "Field") throw new Error("Expected Field");
            expect(outerField.value.kind).toBe("Record");

            if (outerField.value.kind !== "Record") return;
            const innerFields = outerField.value.fields;
            expect(innerFields).toHaveLength(2);
        });

        it("should parse shorthand at multiple nesting levels", () => {
            const expr = parseExpr("let obj = { a, nested: { b, inner: { c } } };");
            expect(expr.kind).toBe("Record");
            if (expr.kind !== "Record") return;
            expect(expr.fields.length).toBeGreaterThanOrEqual(2);
        });
    });

    describe("Shorthand with Complex Values", () => {
        it("should parse shorthand where variable is result of call", () => {
            // Note: shorthand { name } means { name: name }, so name must be a variable
            const expr = parseExpr("let result = { name, computed };");
            expect(expr.kind).toBe("Record");
        });

        it("should parse shorthand in record within list", () => {
            const expr = parseExpr("let list = [{ name }, { age }];");
            expect(expr.kind).toBe("List");
            if (expr.kind !== "List") return;

            const first = expr.elements[0];
            if (!first || first.kind !== "Element") return;
            expect(first.expr.kind).toBe("Record");
        });

        it("should parse shorthand in record within tuple", () => {
            const expr = parseExpr("let pair = ({ name }, { age });");
            expect(expr.kind).toBe("Tuple");
            if (expr.kind !== "Tuple") return;
            expect(expr.elements[0]?.kind).toBe("Record");
            expect(expr.elements[1]?.kind).toBe("Record");
        });
    });

    describe("Trailing Commas with Shorthand", () => {
        it("should parse shorthand with trailing comma", () => {
            const expr = parseExpr("let obj = { name, age, };");
            expect(expr.kind).toBe("Record");
            if (expr.kind !== "Record") return;
            expect(expr.fields).toHaveLength(2);
        });

        it("should parse single shorthand with trailing comma", () => {
            const expr = parseExpr("let obj = { name, };");
            expect(expr.kind).toBe("Record");
            if (expr.kind !== "Record") return;
            expect(expr.fields).toHaveLength(1);
        });
    });
});
