/**
 * Tests for WarningCollector
 */

import type { Location } from "../types/ast.js";
import type { Diagnostic, DiagnosticDefinition } from "./diagnostic.js";

import { beforeEach, describe, expect, it } from "vitest";

import { VibefunDiagnostic } from "./diagnostic.js";
import { WarningCollector } from "./warning-collector.js";

// Helper to create a test location
function testLoc(line = 1, column = 1): Location {
    return { file: "test.vf", line, column, offset: 0 };
}

// Helper to create a warning definition
function warningDefinition(code = "VF4900"): DiagnosticDefinition {
    return {
        code,
        title: "TestWarning",
        messageTemplate: "This is a warning",
        severity: "warning",
        phase: "typechecker",
        category: "test",
        explanation: "Test warning",
        example: {
            bad: "bad",
            good: "good",
            description: "Fixed",
        },
    };
}

// Helper to create an error definition
function errorDefinition(): DiagnosticDefinition {
    return {
        ...warningDefinition(),
        code: "VF4001",
        title: "TestError",
        severity: "error",
    };
}

// Helper to create a diagnostic
function createWarning(code = "VF4900", message = "Test warning"): VibefunDiagnostic {
    const diagnostic: Diagnostic = {
        definition: warningDefinition(code),
        message,
        location: testLoc(),
    };
    return new VibefunDiagnostic(diagnostic);
}

function createError(): VibefunDiagnostic {
    const diagnostic: Diagnostic = {
        definition: errorDefinition(),
        message: "Test error",
        location: testLoc(),
    };
    return new VibefunDiagnostic(diagnostic);
}

describe("WarningCollector", () => {
    let collector: WarningCollector;

    beforeEach(() => {
        collector = new WarningCollector();
    });

    describe("add", () => {
        it("adds a warning to the collection", () => {
            const warning = createWarning();

            collector.add(warning);

            expect(collector.count).toBe(1);
        });

        it("throws when adding an error (not a warning)", () => {
            const error = createError();

            expect(() => collector.add(error)).toThrow("Expected warning diagnostic, got error: VF4001");
        });

        it("allows multiple warnings", () => {
            collector.add(createWarning("VF4900"));
            collector.add(createWarning("VF4901"));
            collector.add(createWarning("VF4902"));

            expect(collector.count).toBe(3);
        });
    });

    describe("getWarnings", () => {
        it("returns empty array initially", () => {
            expect(collector.getWarnings()).toEqual([]);
        });

        it("returns all added warnings", () => {
            const w1 = createWarning("VF4900", "Warning 1");
            const w2 = createWarning("VF4901", "Warning 2");

            collector.add(w1);
            collector.add(w2);

            const warnings = collector.getWarnings();
            expect(warnings).toHaveLength(2);
            expect(warnings[0]).toBe(w1);
            expect(warnings[1]).toBe(w2);
        });

        it("returns readonly array", () => {
            const warnings = collector.getWarnings();
            // TypeScript would error on: warnings.push(...)
            expect(Array.isArray(warnings)).toBe(true);
        });
    });

    describe("hasWarnings", () => {
        it("returns false when empty", () => {
            expect(collector.hasWarnings()).toBe(false);
        });

        it("returns true after adding warning", () => {
            collector.add(createWarning());

            expect(collector.hasWarnings()).toBe(true);
        });
    });

    describe("count", () => {
        it("returns 0 initially", () => {
            expect(collector.count).toBe(0);
        });

        it("returns correct count", () => {
            collector.add(createWarning("VF4900"));
            collector.add(createWarning("VF4901"));

            expect(collector.count).toBe(2);
        });
    });

    describe("clear", () => {
        it("removes all warnings", () => {
            collector.add(createWarning("VF4900"));
            collector.add(createWarning("VF4901"));

            collector.clear();

            expect(collector.count).toBe(0);
            expect(collector.hasWarnings()).toBe(false);
        });
    });

    describe("formatAll", () => {
        it("returns empty array when no warnings", () => {
            expect(collector.formatAll()).toEqual([]);
        });

        it("formats all warnings", () => {
            collector.add(createWarning("VF4900", "First warning"));
            collector.add(createWarning("VF4901", "Second warning"));

            const formatted = collector.formatAll();

            expect(formatted).toHaveLength(2);
            expect(formatted[0]).toContain("VF4900");
            expect(formatted[0]).toContain("First warning");
            expect(formatted[1]).toContain("VF4901");
            expect(formatted[1]).toContain("Second warning");
        });

        it("passes source to format", () => {
            const source = "let x = 42";
            collector.add(createWarning());

            const formatted = collector.formatAll(source);

            // Source should be included in formatted output
            expect(formatted[0]).toContain("let x = 42");
        });
    });
});
