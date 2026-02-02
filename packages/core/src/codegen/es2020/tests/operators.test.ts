import { describe, expect, it } from "vitest";

import {
    ATOM_PRECEDENCE,
    CALL_PRECEDENCE,
    getBinaryPrecedence,
    getUnaryPrecedence,
    JS_BINARY_OP,
    JS_UNARY_OP,
    MEMBER_PRECEDENCE,
    needsParens,
    PRECEDENCE,
} from "../emit-operators.js";

describe("Emit Operators", () => {
    describe("PRECEDENCE", () => {
        it("should have LogicalOr with lowest precedence (among binary ops)", () => {
            expect(PRECEDENCE.LogicalOr).toBe(3);
        });

        it("should have LogicalAnd higher precedence than LogicalOr", () => {
            expect(PRECEDENCE.LogicalAnd).toBeGreaterThan(PRECEDENCE.LogicalOr);
        });

        it("should have equality operators lower precedence than arithmetic", () => {
            expect(PRECEDENCE.Equal).toBeLessThan(PRECEDENCE.Add);
            expect(PRECEDENCE.NotEqual).toBeLessThan(PRECEDENCE.Subtract);
        });

        it("should have multiplicative operators highest precedence", () => {
            expect(PRECEDENCE.Multiply).toBeGreaterThan(PRECEDENCE.Add);
            expect(PRECEDENCE.IntDivide).toBeGreaterThan(PRECEDENCE.Subtract);
            expect(PRECEDENCE.Modulo).toBeGreaterThan(PRECEDENCE.Add);
        });

        it("should have comparison operators between equality and arithmetic", () => {
            expect(PRECEDENCE.LessThan).toBeGreaterThan(PRECEDENCE.Equal);
            expect(PRECEDENCE.LessThan).toBeLessThan(PRECEDENCE.Add);
        });

        it("should have Concat same precedence as Add (both use +)", () => {
            expect(PRECEDENCE.Concat).toBe(PRECEDENCE.Add);
        });

        it("should have RefAssign with lowest precedence (assignment-like)", () => {
            expect(PRECEDENCE.RefAssign).toBe(2);
            expect(PRECEDENCE.RefAssign).toBeLessThan(PRECEDENCE.LogicalOr);
        });
    });

    describe("getBinaryPrecedence", () => {
        it("should return correct precedence for arithmetic operators", () => {
            expect(getBinaryPrecedence("Add")).toBe(11);
            expect(getBinaryPrecedence("Subtract")).toBe(11);
            expect(getBinaryPrecedence("Multiply")).toBe(12);
            expect(getBinaryPrecedence("IntDivide")).toBe(12);
            expect(getBinaryPrecedence("FloatDivide")).toBe(12);
            expect(getBinaryPrecedence("Modulo")).toBe(12);
        });

        it("should return correct precedence for logical operators", () => {
            expect(getBinaryPrecedence("LogicalAnd")).toBe(4);
            expect(getBinaryPrecedence("LogicalOr")).toBe(3);
        });

        it("should return correct precedence for comparison operators", () => {
            expect(getBinaryPrecedence("LessThan")).toBe(9);
            expect(getBinaryPrecedence("LessEqual")).toBe(9);
            expect(getBinaryPrecedence("GreaterThan")).toBe(9);
            expect(getBinaryPrecedence("GreaterEqual")).toBe(9);
        });
    });

    describe("getUnaryPrecedence", () => {
        it("should return high precedence for all unary operators", () => {
            expect(getUnaryPrecedence("Negate")).toBe(14);
            expect(getUnaryPrecedence("LogicalNot")).toBe(14);
            expect(getUnaryPrecedence("Deref")).toBe(14);
        });

        it("should have higher precedence than binary operators", () => {
            expect(getUnaryPrecedence("Negate")).toBeGreaterThan(PRECEDENCE.Multiply);
        });
    });

    describe("needsParens", () => {
        it("should return true when inner precedence is lower (looser binding)", () => {
            // Add in Multiply context: (a + b) * c
            expect(needsParens(PRECEDENCE.Add, PRECEDENCE.Multiply)).toBe(true);
        });

        it("should return false when inner precedence is higher (tighter binding)", () => {
            // Multiply in Add context: a * b + c (no parens needed on a * b)
            expect(needsParens(PRECEDENCE.Multiply, PRECEDENCE.Add)).toBe(false);
        });

        it("should return false when precedences are equal", () => {
            // Left associativity handles a + b + c
            expect(needsParens(PRECEDENCE.Add, PRECEDENCE.Add)).toBe(false);
        });

        it("should never need parens for atoms", () => {
            expect(needsParens(ATOM_PRECEDENCE, PRECEDENCE.LogicalOr)).toBe(false);
            expect(needsParens(ATOM_PRECEDENCE, 0)).toBe(false);
        });

        it("should need parens for LogicalOr in most contexts", () => {
            expect(needsParens(PRECEDENCE.LogicalOr, PRECEDENCE.LogicalAnd)).toBe(true);
            expect(needsParens(PRECEDENCE.LogicalOr, PRECEDENCE.Equal)).toBe(true);
        });
    });

    describe("CALL_PRECEDENCE and MEMBER_PRECEDENCE", () => {
        it("should have very high precedence", () => {
            expect(CALL_PRECEDENCE).toBe(17);
            expect(MEMBER_PRECEDENCE).toBe(18);
        });

        it("should have member access higher than function call", () => {
            expect(MEMBER_PRECEDENCE).toBeGreaterThan(CALL_PRECEDENCE);
        });

        it("should be higher than unary operators", () => {
            expect(CALL_PRECEDENCE).toBeGreaterThan(getUnaryPrecedence("Negate"));
        });
    });

    describe("JS_BINARY_OP", () => {
        it("should map arithmetic operators to JS operators", () => {
            expect(JS_BINARY_OP.Add).toBe("+");
            expect(JS_BINARY_OP.Subtract).toBe("-");
            expect(JS_BINARY_OP.Multiply).toBe("*");
            expect(JS_BINARY_OP.FloatDivide).toBe("/");
            expect(JS_BINARY_OP.Modulo).toBe("%");
        });

        it("should map comparison operators to JS operators", () => {
            expect(JS_BINARY_OP.LessThan).toBe("<");
            expect(JS_BINARY_OP.LessEqual).toBe("<=");
            expect(JS_BINARY_OP.GreaterThan).toBe(">");
            expect(JS_BINARY_OP.GreaterEqual).toBe(">=");
        });

        it("should map equality operators to strict equality", () => {
            expect(JS_BINARY_OP.Equal).toBe("===");
            expect(JS_BINARY_OP.NotEqual).toBe("!==");
        });

        it("should map logical operators to JS operators", () => {
            expect(JS_BINARY_OP.LogicalAnd).toBe("&&");
            expect(JS_BINARY_OP.LogicalOr).toBe("||");
        });

        it("should use + for string concatenation", () => {
            expect(JS_BINARY_OP.Concat).toBe("+");
        });

        it("should have null for special-case operators", () => {
            expect(JS_BINARY_OP.Divide).toBe(null); // Should never appear
            expect(JS_BINARY_OP.IntDivide).toBe(null); // Math.trunc needed
            expect(JS_BINARY_OP.RefAssign).toBe(null); // Special syntax
        });
    });

    describe("JS_UNARY_OP", () => {
        it("should map simple unary operators", () => {
            expect(JS_UNARY_OP.Negate).toBe("-");
            expect(JS_UNARY_OP.LogicalNot).toBe("!");
        });

        it("should have null for Deref (special syntax)", () => {
            expect(JS_UNARY_OP.Deref).toBe(null);
        });
    });
});
