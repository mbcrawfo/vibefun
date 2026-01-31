/**
 * PLACEHOLDER TEST - Expand when CLI has more testable functionality
 *
 * This test covers the formatError utility. Additional tests should be
 * added as CLI functionality grows.
 */
import type { Diagnostic, DiagnosticDefinition, Location } from "@vibefun/core";

import { VibefunDiagnostic } from "@vibefun/core";
import { describe, expect, it } from "vitest";

import { formatError } from "./format-error.js";

// Helper to create a test location
function testLoc(line = 1, column = 1): Location {
    return { file: "test.vf", line, column, offset: 0 };
}

// Helper to create a test diagnostic definition
function testDefinition(): DiagnosticDefinition {
    return {
        code: "VF9999",
        title: "TestError",
        messageTemplate: "Test error message",
        severity: "error",
        phase: "parser",
        category: "test",
        explanation: "This is a test error",
        example: {
            bad: "bad code",
            good: "good code",
            description: "Fixed the issue",
        },
    };
}

// Helper to create a VibefunDiagnostic for testing
function createTestDiagnostic(message: string, loc?: Location): VibefunDiagnostic {
    const diagnostic: Diagnostic = {
        definition: testDefinition(),
        message,
        location: loc ?? testLoc(1, 1),
    };
    return new VibefunDiagnostic(diagnostic);
}

describe("formatError", () => {
    // TODO: Add more comprehensive tests as CLI grows

    it("formats VibefunDiagnostic errors", () => {
        const error = createTestDiagnostic("Test error");
        const result = formatError(error, "hello");
        expect(result).toContain("Test error");
        expect(result).toContain("VF9999");
    });

    it("formats VibefunDiagnostic with source context", () => {
        const error = createTestDiagnostic("Unexpected token", testLoc(1, 5));
        const result = formatError(error, "let x = 42");
        expect(result).toContain("let x = 42");
        expect(result).toContain("^");
    });

    it("formats regular Error objects", () => {
        const error = new Error("Something went wrong");
        const result = formatError(error, "");
        expect(result).toBe("Error: Something went wrong");
    });

    it("formats unknown error types", () => {
        const result = formatError("string error", "");
        expect(result).toBe("string error");
    });

    it("formats null/undefined as string", () => {
        expect(formatError(null, "")).toBe("null");
        expect(formatError(undefined, "")).toBe("undefined");
    });

    it("formats number as string", () => {
        expect(formatError(42, "")).toBe("42");
    });
});
