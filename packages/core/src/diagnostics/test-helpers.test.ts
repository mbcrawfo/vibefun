/**
 * Tests for test helper functions
 */

import type { Location } from "../types/ast.js";
import type { Diagnostic, DiagnosticDefinition } from "./diagnostic.js";

import { describe, expect, it } from "vitest";

import { VibefunDiagnostic } from "./diagnostic.js";
import { expectAnyDiagnostic, expectDiagnostic, expectNoWarnings, expectWarning } from "./test-helpers.js";
import { WarningCollector } from "./warning-collector.js";

// Helper to create a test location
function testLoc(line = 1, column = 1): Location {
    return { file: "test.vf", line, column, offset: 0 };
}

// Helper to create a test diagnostic definition
function testDefinition(code: string, severity: "error" | "warning" = "error"): DiagnosticDefinition {
    return {
        code,
        title: "TestDiagnostic",
        messageTemplate: "Test message",
        severity,
        phase: "typechecker",
        category: "test",
        explanation: "Test",
        example: { bad: "bad", good: "good", description: "Fixed" },
    };
}

// Helper to create a VibefunDiagnostic
function createDiag(code: string, message: string, severity: "error" | "warning" = "error"): VibefunDiagnostic {
    const diagnostic: Diagnostic = {
        definition: testDefinition(code, severity),
        message,
        location: testLoc(5, 10),
    };
    return new VibefunDiagnostic(diagnostic);
}

describe("expectDiagnostic", () => {
    it("succeeds when function throws correct code", () => {
        const fn = () => {
            throw createDiag("VF4001", "Type mismatch");
        };

        const result = expectDiagnostic(fn, "VF4001");

        expect(result.code).toBe("VF4001");
    });

    it("returns the diagnostic for further assertions", () => {
        const fn = () => {
            throw createDiag("VF4001", "Expected Int, got String");
        };

        const diag = expectDiagnostic(fn, "VF4001");

        expect(diag.diagnosticMessage).toBe("Expected Int, got String");
        expect(diag.location.line).toBe(5);
        expect(diag.location.column).toBe(10);
    });

    it("fails when function does not throw", () => {
        const fn = () => {
            // No throw
        };

        expect(() => expectDiagnostic(fn, "VF4001")).toThrow();
    });

    it("fails when function throws wrong code", () => {
        const fn = () => {
            throw createDiag("VF4002", "Wrong error");
        };

        expect(() => expectDiagnostic(fn, "VF4001")).toThrow();
    });

    it("fails when function throws non-VibefunDiagnostic", () => {
        const fn = () => {
            throw new Error("Regular error");
        };

        expect(() => expectDiagnostic(fn, "VF4001")).toThrow();
    });

    it("fails when function throws string", () => {
        const fn = () => {
            throw "string error";
        };

        expect(() => expectDiagnostic(fn, "VF4001")).toThrow();
    });
});

describe("expectWarning", () => {
    it("succeeds when warning is collected", () => {
        const collector = new WarningCollector();
        collector.add(createDiag("VF4900", "Unreachable pattern", "warning"));

        const warning = expectWarning(collector, "VF4900");

        expect(warning.code).toBe("VF4900");
    });

    it("returns the warning for further assertions", () => {
        const collector = new WarningCollector();
        collector.add(createDiag("VF4900", "Pattern is unreachable", "warning"));

        const warning = expectWarning(collector, "VF4900");

        expect(warning.diagnosticMessage).toBe("Pattern is unreachable");
    });

    it("finds warning among multiple", () => {
        const collector = new WarningCollector();
        collector.add(createDiag("VF4901", "Warning 1", "warning"));
        collector.add(createDiag("VF4900", "Warning 2", "warning"));
        collector.add(createDiag("VF4902", "Warning 3", "warning"));

        const warning = expectWarning(collector, "VF4900");

        expect(warning.code).toBe("VF4900");
        expect(warning.diagnosticMessage).toBe("Warning 2");
    });

    it("fails when warning not collected", () => {
        const collector = new WarningCollector();
        collector.add(createDiag("VF4901", "Different warning", "warning"));

        expect(() => expectWarning(collector, "VF4900")).toThrow();
    });

    it("fails when collector is empty", () => {
        const collector = new WarningCollector();

        expect(() => expectWarning(collector, "VF4900")).toThrow(
            /Expected warning VF4900 to be collected. Found warnings: none/,
        );
    });
});

describe("expectNoWarnings", () => {
    it("succeeds when collector is empty", () => {
        const collector = new WarningCollector();

        expect(() => expectNoWarnings(collector)).not.toThrow();
    });

    it("fails when warnings are collected", () => {
        const collector = new WarningCollector();
        collector.add(createDiag("VF4900", "Unexpected warning", "warning"));

        expect(() => expectNoWarnings(collector)).toThrow();
    });

    it("includes warning info in failure message", () => {
        const collector = new WarningCollector();
        collector.add(createDiag("VF4900", "First warning", "warning"));
        collector.add(createDiag("VF4901", "Second warning", "warning"));

        expect(() => expectNoWarnings(collector)).toThrow(/VF4900.*First warning/);
    });
});

describe("expectAnyDiagnostic", () => {
    it("succeeds when function throws a VibefunDiagnostic", () => {
        const fn = () => {
            throw createDiag("VF4001", "Some error");
        };

        const result = expectAnyDiagnostic(fn);

        expect(result).toBeInstanceOf(VibefunDiagnostic);
    });

    it("returns the diagnostic for further assertions", () => {
        const fn = () => {
            throw createDiag("VF4001", "Test error");
        };

        const diag = expectAnyDiagnostic(fn);

        expect(diag.code).toBe("VF4001");
        expect(diag.severity).toBe("error");
    });

    it("fails when function does not throw", () => {
        const fn = () => {
            // No throw
        };

        expect(() => expectAnyDiagnostic(fn)).toThrow();
    });

    it("fails when function throws non-VibefunDiagnostic", () => {
        const fn = () => {
            throw new Error("Regular error");
        };

        expect(() => expectAnyDiagnostic(fn)).toThrow();
    });
});
