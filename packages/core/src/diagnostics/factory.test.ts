/**
 * Tests for diagnostic factory functions
 */

import type { Location } from "../types/ast.js";
import type { DiagnosticDefinition } from "./diagnostic.js";

import { beforeEach, describe, expect, it } from "vitest";

import { VibefunDiagnostic } from "./diagnostic.js";
import { createDiagnostic, createDiagnosticFromDefinition, interpolate, throwDiagnostic } from "./factory.js";
import { registry } from "./registry.js";

// Helper to create a test location
function testLoc(line = 1, column = 1): Location {
    return { file: "test.vf", line, column, offset: 0 };
}

// Helper to create a test definition
function testDefinition(overrides: Partial<DiagnosticDefinition> = {}): DiagnosticDefinition {
    return {
        code: "VF9999",
        title: "TestError",
        messageTemplate: "Error with {param1} and {param2}",
        severity: "error",
        phase: "typechecker",
        category: "test",
        explanation: "Test explanation",
        example: {
            bad: "bad",
            good: "good",
            description: "Fixed",
        },
        ...overrides,
    };
}

describe("interpolate", () => {
    it("replaces simple placeholders", () => {
        const result = interpolate("Hello, {name}!", { name: "World" });

        expect(result).toBe("Hello, World!");
    });

    it("replaces multiple placeholders", () => {
        const result = interpolate("Expected {expected}, got {actual}", {
            expected: "Int",
            actual: "String",
        });

        expect(result).toBe("Expected Int, got String");
    });

    it("handles number values", () => {
        const result = interpolate("Line {line}, column {column}", {
            line: 42,
            column: 10,
        });

        expect(result).toBe("Line 42, column 10");
    });

    it("handles same placeholder multiple times", () => {
        const result = interpolate("{x} + {x} = {y}", { x: 2, y: 4 });

        expect(result).toBe("2 + 2 = 4");
    });

    it("leaves unmatched placeholders as-is", () => {
        const result = interpolate("Expected {expected}, got {actual}", {
            expected: "Int",
        });

        expect(result).toBe("Expected Int, got {actual}");
    });

    it("handles empty params", () => {
        const result = interpolate("No {placeholders} here", {});

        expect(result).toBe("No {placeholders} here");
    });

    it("handles template with no placeholders", () => {
        const result = interpolate("Plain message", { unused: "value" });

        expect(result).toBe("Plain message");
    });

    it("handles special regex characters in values", () => {
        const result = interpolate("Type: {type}", { type: "List<Int>" });

        expect(result).toBe("Type: List<Int>");
    });

    it("handles empty string values", () => {
        const result = interpolate("Name: {name}", { name: "" });

        expect(result).toBe("Name: ");
    });
});

describe("createDiagnostic", () => {
    beforeEach(() => {
        registry.clear();
    });

    it("creates a diagnostic from registered code", () => {
        const def = testDefinition();
        registry.register(def);

        const diagnostic = createDiagnostic("VF9999", testLoc(), {
            param1: "foo",
            param2: "bar",
        });

        expect(diagnostic).toBeInstanceOf(VibefunDiagnostic);
        expect(diagnostic.code).toBe("VF9999");
        expect(diagnostic.diagnosticMessage).toBe("Error with foo and bar");
    });

    it("throws for unknown code", () => {
        expect(() => createDiagnostic("VF0000", testLoc())).toThrow("Unknown diagnostic code: VF0000");
    });

    it("includes location in diagnostic", () => {
        registry.register(testDefinition());

        const diagnostic = createDiagnostic("VF9999", testLoc(10, 5), {
            param1: "a",
            param2: "b",
        });

        expect(diagnostic.location.line).toBe(10);
        expect(diagnostic.location.column).toBe(5);
    });

    it("interpolates hint template", () => {
        registry.register(
            testDefinition({
                hintTemplate: "Try using {suggestion} instead",
            }),
        );

        const diagnostic = createDiagnostic("VF9999", testLoc(), {
            param1: "a",
            param2: "b",
            suggestion: "something else",
        });

        expect(diagnostic.hint).toBe("Try using something else instead");
    });

    it("handles missing params gracefully", () => {
        registry.register(testDefinition());

        const diagnostic = createDiagnostic("VF9999", testLoc(), {});

        // Unmatched placeholders remain
        expect(diagnostic.diagnosticMessage).toBe("Error with {param1} and {param2}");
    });
});

describe("throwDiagnostic", () => {
    beforeEach(() => {
        registry.clear();
    });

    it("throws a VibefunDiagnostic", () => {
        registry.register(testDefinition());

        expect(() => throwDiagnostic("VF9999", testLoc(), { param1: "a", param2: "b" })).toThrow(VibefunDiagnostic);
    });

    it("throws with correct code", () => {
        registry.register(testDefinition());

        let caught: unknown;
        try {
            throwDiagnostic("VF9999", testLoc(), { param1: "a", param2: "b" });
        } catch (error) {
            caught = error;
        }
        expect(caught).toBeInstanceOf(VibefunDiagnostic);
        expect((caught as VibefunDiagnostic).code).toBe("VF9999");
    });

    it("throws with interpolated message", () => {
        registry.register(testDefinition());

        let caught: unknown;
        try {
            throwDiagnostic("VF9999", testLoc(), { param1: "foo", param2: "bar" });
        } catch (error) {
            caught = error;
        }
        expect((caught as VibefunDiagnostic).diagnosticMessage).toBe("Error with foo and bar");
    });

    it("throws for unknown code", () => {
        expect(() => throwDiagnostic("VF0000", testLoc())).toThrow("Unknown diagnostic code: VF0000");
    });
});

describe("createDiagnosticFromDefinition", () => {
    it("creates diagnostic directly from definition", () => {
        const def = testDefinition();

        const diagnostic = createDiagnosticFromDefinition(def, testLoc(), {
            param1: "x",
            param2: "y",
        });

        expect(diagnostic).toBeInstanceOf(VibefunDiagnostic);
        expect(diagnostic.code).toBe("VF9999");
        expect(diagnostic.diagnosticMessage).toBe("Error with x and y");
    });

    it("does not require registry registration", () => {
        registry.clear();
        const def = testDefinition({ code: "VF1234" });

        // Should work without registration
        const diagnostic = createDiagnosticFromDefinition(def, testLoc(), {
            param1: "a",
            param2: "b",
        });

        expect(diagnostic.code).toBe("VF1234");
    });

    it("interpolates hint when present", () => {
        const def = testDefinition({
            hintTemplate: "Hint: {hint}",
        });

        const diagnostic = createDiagnosticFromDefinition(def, testLoc(), {
            param1: "a",
            param2: "b",
            hint: "some hint",
        });

        expect(diagnostic.hint).toBe("Hint: some hint");
    });

    it("returns undefined hint when no template", () => {
        const def = testDefinition(); // No hintTemplate

        const diagnostic = createDiagnosticFromDefinition(def, testLoc(), {
            param1: "a",
            param2: "b",
        });

        expect(diagnostic.hint).toBeUndefined();
    });
});
