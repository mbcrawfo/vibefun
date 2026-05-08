/**
 * Tests for the diagnostic registry
 */

import type { DiagnosticDefinition } from "./diagnostic.js";

import * as fc from "fast-check";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { registerDesugarerCodes } from "./codes/desugarer.js";
import { registerLexerCodes } from "./codes/lexer.js";
import { registerModulesCodes } from "./codes/modules.js";
import { registerParserCodes } from "./codes/parser/index.js";
import { registerTypecheckerCodes } from "./codes/typechecker/index.js";
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

    describe("Properties", () => {
        // Code arbitrary: any 4-digit numeric VFxxxx code. Only one definition
        // per code is allowed by the registry, so a unique-array generator
        // keeps the test setup safe.
        const codeArb = fc.stringMatching(/^VF\d{4}$/);

        it("property: get returns undefined for any unregistered code", () => {
            registry.clear();
            fc.assert(
                fc.property(codeArb, (code) => {
                    return registry.get(code) === undefined && !registry.has(code);
                }),
            );
        });

        it("property: registering a code makes get and has consistent", () => {
            fc.assert(
                fc.property(codeArb, (code) => {
                    registry.clear();
                    const def = testDefinition(code);
                    registry.register(def);
                    return registry.has(code) && registry.get(code) === def;
                }),
            );
        });

        it("property: byPhase('typechecker') returns only typechecker codes", () => {
            fc.assert(
                fc.property(fc.uniqueArray(codeArb, { minLength: 1, maxLength: 5 }), (codes) => {
                    registry.clear();
                    codes.forEach((c, i) =>
                        registry.register(testDefinition(c, { phase: i % 2 === 0 ? "typechecker" : "lexer" })),
                    );
                    const typecheckers = registry.byPhase("typechecker");
                    return typecheckers.every((d) => d.phase === "typechecker");
                }),
            );
        });
    });
});

/**
 * Meta-tests asserting spec-mandated conventions across the entire registry.
 *
 * These tests reload the production registry directly (the unit-test suite
 * above clears the singleton in beforeEach), so they run in their own
 * top-level describe block with explicit setup/teardown.
 */
describe("Diagnostic registry conventions (meta-tests)", () => {
    function reloadProductionRegistry(): void {
        registry.clear();
        registerDesugarerCodes();
        registerLexerCodes();
        registerModulesCodes();
        registerParserCodes();
        registerTypecheckerCodes();
    }

    beforeEach(() => {
        reloadProductionRegistry();
    });

    afterAll(() => {
        // Leave the registry populated so any subsequent test files that
        // depend on diagnostic codes (e.g. throwDiagnostic call sites) work.
        reloadProductionRegistry();
    });

    // F-19: tripwire on the registered-code count. Plan-asserted target is 127.
    // Adding or removing a VFxxxx definition requires updating this assertion
    // (and regenerating docs/errors/ via `pnpm docs:errors`).
    it("F-19: registry contains the expected number of registered codes", () => {
        expect(registry.size).toBe(127);
    });

    // F-10: every registered warning must live in its phase's reserved
    // 9xx slot per `codes/README.md` (e.g. typechecker warnings VF4900-VF4999,
    // module warnings VF5900-VF5999).
    it("F-10: every warning code lives in its phase's 900-999 range", () => {
        const warnings = registry.bySeverity("warning");
        expect(warnings.length).toBeGreaterThan(0);
        const warningRangePattern = /^VF\d9\d{2}$/;
        const offenders = warnings.filter((def) => !warningRangePattern.test(def.code));
        expect(offenders).toEqual([]);
    });

    // F-10 (typechecker subset): the spec under test names VF4900-VF4999
    // explicitly as the typechecker warning reservation. Asserting it as a
    // separate check makes a regression in the typechecker phase localizable.
    it("F-10: every typechecker warning lives in VF4900-VF4999", () => {
        const typecheckerWarnings = registry.bySeverity("warning").filter((def) => def.phase === "typechecker");
        const typecheckerRangePattern = /^VF49\d{2}$/;
        const offenders = typecheckerWarnings.filter((def) => !typecheckerRangePattern.test(def.code));
        expect(offenders).toEqual([]);
    });

    // F-10 (inverse): nothing in any phase's warning range may be filed as an
    // error. Catches the symmetric mistake — an error mis-assigned a 9xx code.
    it("F-10: no error code lives in a phase's 900-999 warning range", () => {
        const errors = registry.bySeverity("error");
        const warningRangePattern = /^VF\d9\d{2}$/;
        const misfiled = errors.filter((def) => warningRangePattern.test(def.code));
        expect(misfiled).toEqual([]);
    });
});
