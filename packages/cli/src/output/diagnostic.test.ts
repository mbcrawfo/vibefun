import type { Diagnostic, DiagnosticDefinition } from "@vibefun/core";
import type { PhaseTimings } from "../utils/timer.js";

import { VibefunDiagnostic } from "@vibefun/core";
import { describe, expect, it } from "vitest";

import { createColors } from "../utils/colors.js";
import { formatDiagnosticHuman, formatDiagnosticsJson, formatSuccessJson, toJsonDiagnostic } from "./diagnostic.js";

/**
 * Create a test diagnostic definition
 */
function createTestDefinition(overrides: Partial<DiagnosticDefinition> = {}): DiagnosticDefinition {
    return {
        code: "VF1001",
        title: "TestError",
        messageTemplate: "Test error message",
        severity: "error",
        phase: "lexer",
        category: "test",
        explanation: "Test explanation",
        example: {
            bad: "bad code",
            good: "good code",
            description: "fixed it",
        },
        ...overrides,
    };
}

/**
 * Create a test diagnostic
 */
function createTestDiagnostic(
    defOverrides: Partial<DiagnosticDefinition> = {},
    diagOverrides: Partial<Omit<Diagnostic, "definition">> = {},
): VibefunDiagnostic {
    const definition = createTestDefinition(defOverrides);
    const diagnostic: Diagnostic = {
        definition,
        message: definition.messageTemplate,
        location: { file: "test.vf", line: 5, column: 10, offset: 50 },
        ...diagOverrides,
    };
    return new VibefunDiagnostic(diagnostic);
}

describe("toJsonDiagnostic", () => {
    it("should convert diagnostic to JSON format", () => {
        const diagnostic = createTestDiagnostic();
        const json = toJsonDiagnostic(diagnostic);

        expect(json).toEqual({
            code: "VF1001",
            severity: "error",
            message: "Test error message",
            location: {
                file: "test.vf",
                line: 5,
                column: 10,
            },
            phase: "lexer",
        });
    });

    it("should preserve warning severity", () => {
        const diagnostic = createTestDiagnostic({ severity: "warning" });
        const json = toJsonDiagnostic(diagnostic);

        expect(json.severity).toBe("warning");
    });

    it("should preserve phase", () => {
        const diagnostic = createTestDiagnostic({ phase: "typechecker" });
        const json = toJsonDiagnostic(diagnostic);

        expect(json.phase).toBe("typechecker");
    });
});

describe("formatDiagnosticHuman", () => {
    const source = "let x = 42\nlet y = @#$\nlet z = 0";

    it("should format diagnostic without colors", () => {
        const diagnostic = createTestDiagnostic({}, { location: { file: "test.vf", line: 2, column: 9, offset: 19 } });
        const output = formatDiagnosticHuman(diagnostic, source);

        // Should use the built-in format method
        expect(output).toContain("VF1001");
        expect(output).toContain("Test error message");
    });

    it("should format diagnostic with colors", () => {
        const diagnostic = createTestDiagnostic({}, { location: { file: "test.vf", line: 2, column: 9, offset: 19 } });
        const colors = createColors(true);
        const output = formatDiagnosticHuman(diagnostic, source, colors);

        // Should include ANSI codes
        expect(output).toContain("\x1b[");
        expect(output).toContain("VF1001");
        expect(output).toContain("test.vf:2:9");
    });

    it("should show source context", () => {
        const diagnostic = createTestDiagnostic({}, { location: { file: "test.vf", line: 2, column: 9, offset: 19 } });
        const colors = createColors(true);
        const output = formatDiagnosticHuman(diagnostic, source, colors);

        expect(output).toContain("let y = @#$");
    });
});

describe("formatDiagnosticsJson", () => {
    it("should format empty diagnostics as success", () => {
        const output = formatDiagnosticsJson([]);
        const parsed = JSON.parse(output);

        expect(parsed.success).toBe(true);
        expect(parsed.diagnostics).toEqual([]);
    });

    it("should format multiple diagnostics", () => {
        const diagnostics = [
            createTestDiagnostic({ code: "VF1001" }),
            createTestDiagnostic({ code: "VF2001", phase: "parser" }),
        ];
        const output = formatDiagnosticsJson(diagnostics);
        const parsed = JSON.parse(output);

        expect(parsed.success).toBe(false);
        expect(parsed.diagnostics).toHaveLength(2);
        expect(parsed.diagnostics[0].code).toBe("VF1001");
        expect(parsed.diagnostics[1].code).toBe("VF2001");
    });

    it("should include timing when provided", () => {
        const timings: PhaseTimings = {
            totalMs: 100,
            phases: [
                { name: "lex", durationMs: 10 },
                { name: "parse", durationMs: 20, metadata: { nodes: 50 } },
            ],
            outputBytes: 1024,
        };

        const output = formatDiagnosticsJson([], timings);
        const parsed = JSON.parse(output);

        expect(parsed.timing).toBeDefined();
        expect(parsed.timing.totalMs).toBe(100);
        expect(parsed.timing.phases).toHaveLength(2);
        expect(parsed.timing.outputBytes).toBe(1024);
    });

    it("should produce valid JSON", () => {
        const diagnostics = [createTestDiagnostic()];
        const output = formatDiagnosticsJson(diagnostics);

        expect(() => JSON.parse(output)).not.toThrow();
    });
});

describe("formatSuccessJson", () => {
    it("should format success without output path", () => {
        const output = formatSuccessJson(undefined);
        const parsed = JSON.parse(output);

        expect(parsed.success).toBe(true);
        expect(parsed.diagnostics).toEqual([]);
        expect(parsed.output).toBeUndefined();
    });

    it("should include output path when provided", () => {
        const output = formatSuccessJson("dist/output.js");
        const parsed = JSON.parse(output);

        expect(parsed.success).toBe(true);
        expect(parsed.output).toBe("dist/output.js");
    });

    it("should include timing when provided", () => {
        const timings: PhaseTimings = {
            totalMs: 50,
            phases: [{ name: "compile", durationMs: 50 }],
        };

        const output = formatSuccessJson("output.js", timings);
        const parsed = JSON.parse(output);

        expect(parsed.timing.totalMs).toBe(50);
    });
});
