/**
 * Tests for the diagnostic registry
 */

import type { DiagnosticDefinition } from "./diagnostic.js";

import { beforeEach, describe, expect, it } from "vitest";

import { registry } from "./registry.js";

// Helper to create a test definition
function testDefinition(code: string, overrides: Partial<DiagnosticDefinition> = {}): DiagnosticDefinition {
    return {
        code,
        title: "TestError",
        messageTemplate: "Test error for {thing}",
        severity: "error",
        phase: "typechecker",
        category: "test",
        explanation: "Test explanation",
        example: {
            bad: "bad code",
            good: "good code",
            description: "Fixed the code",
        },
        ...overrides,
    };
}

describe("DiagnosticRegistry", () => {
    beforeEach(() => {
        // Clear registry before each test
        registry.clear();
    });

    describe("register", () => {
        it("registers a diagnostic definition", () => {
            const def = testDefinition("VF0001");

            registry.register(def);

            expect(registry.has("VF0001")).toBe(true);
            expect(registry.get("VF0001")).toBe(def);
        });

        it("throws on duplicate code registration", () => {
            const def1 = testDefinition("VF0001");
            const def2 = testDefinition("VF0001", { title: "AnotherError" });

            registry.register(def1);

            expect(() => registry.register(def2)).toThrow("Duplicate diagnostic code: VF0001");
        });

        it("allows different codes to be registered", () => {
            const def1 = testDefinition("VF0001");
            const def2 = testDefinition("VF0002");

            registry.register(def1);
            registry.register(def2);

            expect(registry.size).toBe(2);
        });
    });

    describe("registerAll", () => {
        it("registers multiple definitions", () => {
            const defs = [testDefinition("VF0001"), testDefinition("VF0002"), testDefinition("VF0003")];

            registry.registerAll(defs);

            expect(registry.size).toBe(3);
            expect(registry.has("VF0001")).toBe(true);
            expect(registry.has("VF0002")).toBe(true);
            expect(registry.has("VF0003")).toBe(true);
        });

        it("throws on duplicate in batch", () => {
            const defs = [testDefinition("VF0001"), testDefinition("VF0001")];

            expect(() => registry.registerAll(defs)).toThrow("Duplicate diagnostic code: VF0001");
        });
    });

    describe("get", () => {
        it("returns undefined for unknown code", () => {
            expect(registry.get("VF9999")).toBeUndefined();
        });

        it("returns the definition for known code", () => {
            const def = testDefinition("VF0001");
            registry.register(def);

            expect(registry.get("VF0001")).toBe(def);
        });
    });

    describe("has", () => {
        it("returns false for unknown code", () => {
            expect(registry.has("VF9999")).toBe(false);
        });

        it("returns true for known code", () => {
            registry.register(testDefinition("VF0001"));

            expect(registry.has("VF0001")).toBe(true);
        });
    });

    describe("all", () => {
        it("returns empty array when no codes registered", () => {
            expect(registry.all()).toEqual([]);
        });

        it("returns all registered definitions", () => {
            const def1 = testDefinition("VF0001");
            const def2 = testDefinition("VF0002");
            registry.register(def1);
            registry.register(def2);

            const all = registry.all();

            expect(all).toHaveLength(2);
            expect(all).toContain(def1);
            expect(all).toContain(def2);
        });
    });

    describe("byPhase", () => {
        it("filters definitions by phase", () => {
            registry.register(testDefinition("VF1001", { phase: "lexer" }));
            registry.register(testDefinition("VF2001", { phase: "parser" }));
            registry.register(testDefinition("VF4001", { phase: "typechecker" }));
            registry.register(testDefinition("VF4002", { phase: "typechecker" }));

            const typecheckerCodes = registry.byPhase("typechecker");

            expect(typecheckerCodes).toHaveLength(2);
            expect(typecheckerCodes.every((d) => d.phase === "typechecker")).toBe(true);
        });

        it("returns empty array for phase with no codes", () => {
            registry.register(testDefinition("VF1001", { phase: "lexer" }));

            expect(registry.byPhase("codegen")).toEqual([]);
        });
    });

    describe("bySeverity", () => {
        it("filters definitions by severity", () => {
            registry.register(testDefinition("VF4001", { severity: "error" }));
            registry.register(testDefinition("VF4002", { severity: "error" }));
            registry.register(testDefinition("VF4900", { severity: "warning" }));

            const warnings = registry.bySeverity("warning");
            const errors = registry.bySeverity("error");

            expect(warnings).toHaveLength(1);
            expect(warnings[0]?.code).toBe("VF4900");
            expect(errors).toHaveLength(2);
        });
    });

    describe("explain", () => {
        it("returns undefined for unknown code", () => {
            expect(registry.explain("VF9999")).toBeUndefined();
        });

        it("returns formatted explanation for known code", () => {
            const def = testDefinition("VF4001", {
                title: "TypeMismatch",
                messageTemplate: "Expected {expected}, got {actual}",
                hintTemplate: "Try changing the type",
                relatedCodes: ["VF4002", "VF4003"],
                seeAlso: ["spec/types/inference.md"],
            });
            registry.register(def);

            const explanation = registry.explain("VF4001");

            expect(explanation).toBeDefined();
            expect(explanation).toContain("VF4001: TypeMismatch");
            expect(explanation).toContain("Severity: error");
            expect(explanation).toContain("Phase: typechecker");
            expect(explanation).toContain("Message template:");
            expect(explanation).toContain("Expected {expected}, got {actual}");
            expect(explanation).toContain("Explanation:");
            expect(explanation).toContain("Example:");
            expect(explanation).toContain("Problem:");
            expect(explanation).toContain("Solution:");
            expect(explanation).toContain("Hint:");
            expect(explanation).toContain("Related codes:");
            expect(explanation).toContain("VF4002, VF4003");
            expect(explanation).toContain("See also:");
            expect(explanation).toContain("spec/types/inference.md");
        });

        it("omits optional sections when not present", () => {
            const def = testDefinition("VF4001"); // No hint, relatedCodes, seeAlso
            registry.register(def);

            const explanation = registry.explain("VF4001");

            expect(explanation).toBeDefined();
            expect(explanation).not.toContain("Hint:");
            expect(explanation).not.toContain("Related codes:");
            expect(explanation).not.toContain("See also:");
        });
    });

    describe("size", () => {
        it("returns 0 for empty registry", () => {
            expect(registry.size).toBe(0);
        });

        it("returns correct count", () => {
            registry.register(testDefinition("VF0001"));
            registry.register(testDefinition("VF0002"));

            expect(registry.size).toBe(2);
        });
    });

    describe("clear", () => {
        it("removes all registered codes", () => {
            registry.register(testDefinition("VF0001"));
            registry.register(testDefinition("VF0002"));

            registry.clear();

            expect(registry.size).toBe(0);
            expect(registry.has("VF0001")).toBe(false);
        });
    });
});
