/**
 * Tests for core diagnostic types and VibefunDiagnostic class
 */

import type { Location } from "../types/ast.js";
import type { Diagnostic, DiagnosticDefinition } from "./diagnostic.js";

import { describe, expect, it } from "vitest";

import { VibefunDiagnostic } from "./diagnostic.js";

// Helper to create a test location
function testLoc(line = 1, column = 1): Location {
    return { file: "test.vf", line, column, offset: 0 };
}

// Helper to create a test definition
function testDefinition(overrides: Partial<DiagnosticDefinition> = {}): DiagnosticDefinition {
    return {
        code: "VF9999",
        title: "TestError",
        messageTemplate: "Test error message",
        severity: "error",
        phase: "typechecker",
        category: "test",
        explanation: "This is a test error for unit testing.",
        example: {
            bad: "let x = bad",
            good: "let x = good",
            description: "Changed bad to good",
        },
        ...overrides,
    };
}

describe("VibefunDiagnostic", () => {
    describe("construction", () => {
        it("creates a diagnostic with correct properties", () => {
            const definition = testDefinition();
            const diagnostic: Diagnostic = {
                definition,
                message: "Test error message",
                location: testLoc(5, 10),
            };

            const error = new VibefunDiagnostic(diagnostic);

            expect(error.code).toBe("VF9999");
            expect(error.severity).toBe("error");
            expect(error.location.line).toBe(5);
            expect(error.location.column).toBe(10);
            expect(error.diagnosticMessage).toBe("Test error message");
            expect(error.hint).toBeUndefined();
        });

        it("includes hint when provided", () => {
            const definition = testDefinition({ hintTemplate: "Try this fix" });
            const diagnostic: Diagnostic = {
                definition,
                message: "Test error",
                location: testLoc(),
                hint: "Try this fix",
            };

            const error = new VibefunDiagnostic(diagnostic);

            expect(error.hint).toBe("Try this fix");
        });

        it("creates error message with code prefix and location", () => {
            const definition = testDefinition();
            const diagnostic: Diagnostic = {
                definition,
                message: "Type mismatch",
                location: testLoc(10, 5),
            };

            const error = new VibefunDiagnostic(diagnostic);

            expect(error.message).toContain("[VF9999]");
            expect(error.message).toContain("Type mismatch");
            expect(error.message).toContain("test.vf:10:5");
        });

        it("is instanceof Error", () => {
            const definition = testDefinition();
            const diagnostic: Diagnostic = {
                definition,
                message: "Test",
                location: testLoc(),
            };

            const error = new VibefunDiagnostic(diagnostic);

            expect(error instanceof Error).toBe(true);
            expect(error instanceof VibefunDiagnostic).toBe(true);
        });

        it("has name VibefunDiagnostic", () => {
            const definition = testDefinition();
            const diagnostic: Diagnostic = {
                definition,
                message: "Test",
                location: testLoc(),
            };

            const error = new VibefunDiagnostic(diagnostic);

            expect(error.name).toBe("VibefunDiagnostic");
        });
    });

    describe("format", () => {
        it("formats without source", () => {
            const definition = testDefinition();
            const diagnostic: Diagnostic = {
                definition,
                message: "Type mismatch: expected Int, got String",
                location: testLoc(5, 10),
            };

            const error = new VibefunDiagnostic(diagnostic);
            const formatted = error.format();

            expect(formatted).toContain("error[VF9999]");
            expect(formatted).toContain("Type mismatch: expected Int, got String");
            expect(formatted).toContain("--> test.vf:5:10");
        });

        it("formats with source context", () => {
            const source = `let x = 42
let y: Int = "hello"
let z = true`;
            const definition = testDefinition();
            const diagnostic: Diagnostic = {
                definition,
                message: "Type mismatch: expected Int, got String",
                location: { file: "test.vf", line: 2, column: 14, offset: 25 },
            };

            const error = new VibefunDiagnostic(diagnostic);
            const formatted = error.format(source);

            expect(formatted).toContain("error[VF9999]");
            expect(formatted).toContain('let y: Int = "hello"');
            expect(formatted).toContain("^"); // caret
        });

        it("formats warning with warning badge", () => {
            const definition = testDefinition({ severity: "warning" });
            const diagnostic: Diagnostic = {
                definition,
                message: "Unreachable pattern",
                location: testLoc(),
            };

            const error = new VibefunDiagnostic(diagnostic);
            const formatted = error.format();

            expect(formatted).toContain("warning[VF9999]");
        });

        it("includes hint when present", () => {
            const definition = testDefinition({ hintTemplate: "Try changing the type" });
            const diagnostic: Diagnostic = {
                definition,
                message: "Test error",
                location: testLoc(),
                hint: "Try changing the type to String",
            };

            const error = new VibefunDiagnostic(diagnostic);
            const formatted = error.format();

            expect(formatted).toContain("= hint: Try changing the type to String");
        });

        it("truncates long source lines", () => {
            // Create a source line longer than 120 characters
            const longLine = "let x = " + "a".repeat(150) + " // very long line";
            const source = `first line\n${longLine}\nthird line`;
            const definition = testDefinition();
            const diagnostic: Diagnostic = {
                definition,
                message: "Error on long line",
                location: { file: "test.vf", line: 2, column: 50, offset: 60 },
            };

            const error = new VibefunDiagnostic(diagnostic);
            const formatted = error.format(source);

            // Should contain ellipsis since line is truncated
            expect(formatted).toContain("...");
            // Should still have the caret
            expect(formatted).toContain("^");
        });

        it("handles error at start of truncated line", () => {
            const longLine = "a".repeat(200);
            const source = longLine;
            const definition = testDefinition();
            const diagnostic: Diagnostic = {
                definition,
                message: "Error at start",
                location: { file: "test.vf", line: 1, column: 1, offset: 0 },
            };

            const error = new VibefunDiagnostic(diagnostic);
            const formatted = error.format(source);

            // Should truncate at end, not start
            expect(formatted).toContain("...");
            expect(formatted).toContain("^");
        });

        it("handles error at end of truncated line", () => {
            const longLine = "a".repeat(200);
            const source = longLine;
            const definition = testDefinition();
            const diagnostic: Diagnostic = {
                definition,
                message: "Error at end",
                location: { file: "test.vf", line: 1, column: 190, offset: 189 },
            };

            const error = new VibefunDiagnostic(diagnostic);
            const formatted = error.format(source);

            // Should show truncation indicator
            expect(formatted).toContain("...");
            expect(formatted).toContain("^");
        });

        it("handles single line source", () => {
            const source = "let x = 42";
            const definition = testDefinition();
            const diagnostic: Diagnostic = {
                definition,
                message: "Test",
                location: { file: "test.vf", line: 1, column: 5, offset: 4 },
            };

            const error = new VibefunDiagnostic(diagnostic);
            const formatted = error.format(source);

            expect(formatted).toContain("let x = 42");
            expect(formatted).toContain("^");
        });

        it("handles empty source gracefully", () => {
            const source = "";
            const definition = testDefinition();
            const diagnostic: Diagnostic = {
                definition,
                message: "Test",
                location: testLoc(),
            };

            const error = new VibefunDiagnostic(diagnostic);
            const formatted = error.format(source);

            // Should not crash, just show basic info
            expect(formatted).toContain("error[VF9999]");
        });

        it("handles line number beyond source", () => {
            const source = "only one line";
            const definition = testDefinition();
            const diagnostic: Diagnostic = {
                definition,
                message: "Test",
                location: { file: "test.vf", line: 100, column: 1, offset: 0 },
            };

            const error = new VibefunDiagnostic(diagnostic);
            const formatted = error.format(source);

            // Should show header without source context
            expect(formatted).toContain("error[VF9999]");
            expect(formatted).not.toContain("100 |");
        });
    });
});
