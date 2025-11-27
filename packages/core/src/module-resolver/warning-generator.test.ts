/**
 * Tests for warning generation in module resolution.
 *
 * These tests verify that the warning generator correctly creates
 * VF5900 (circular dependency) and VF5901 (case sensitivity) warnings,
 * as well as VF5004 (self-import) errors.
 */

import type { Location } from "../types/index.js";
import type { Cycle, SelfImport } from "./cycle-detector.js";

import { beforeEach, describe, expect, it } from "vitest";

import { initializeDiagnosticCodes } from "../diagnostics/codes/index.js";
import { WarningCollector } from "../diagnostics/warning-collector.js";
import {
    formatCycleForWarning,
    generateCaseSensitivityWarning,
    generateCircularDependencyWarning,
    generateCircularDependencyWarnings,
    generateSelfImportError,
    generateSelfImportErrors,
    generateWarningsFromCycles,
} from "./warning-generator.js";

// =============================================================================
// Test Setup
// =============================================================================

// Initialize registry before tests
beforeEach(() => {
    initializeDiagnosticCodes();
});

/**
 * Helper to create a Location for testing.
 */
function createLocation(file: string, line = 1, column = 1, offset = 0): Location {
    return { file, line, column, offset };
}

/**
 * Helper to create a Cycle for testing.
 */
function createCycle(paths: string[], isTypeOnly: boolean, locs?: Location[]): Cycle {
    const locations = locs ?? paths.map((p, i) => createLocation(p, i + 1, 1, i * 30));
    return { path: paths, isTypeOnly, locations };
}

/**
 * Helper to create a SelfImport for testing.
 */
function createSelfImport(modulePath: string, loc?: Location): SelfImport {
    return {
        modulePath,
        location: loc ?? createLocation(modulePath),
    };
}

// =============================================================================
// formatCycleForWarning Tests
// =============================================================================

describe("formatCycleForWarning", () => {
    it("should format simple cycle with basenames", () => {
        const cycle = createCycle(["/src/a.vf", "/src/b.vf"], false);

        const result = formatCycleForWarning(cycle);

        expect(result).toBe("a.vf → b.vf → a.vf");
    });

    it("should format cycle with full paths when requested", () => {
        const cycle = createCycle(["/src/a.vf", "/src/b.vf"], false);

        const result = formatCycleForWarning(cycle, true);

        expect(result).toBe("/src/a.vf → /src/b.vf → /src/a.vf");
    });

    it("should format three-module cycle", () => {
        const cycle = createCycle(["/src/a.vf", "/src/b.vf", "/src/c.vf"], false);

        const result = formatCycleForWarning(cycle);

        expect(result).toBe("a.vf → b.vf → c.vf → a.vf");
    });

    it("should format long cycle (10+ modules)", () => {
        const paths = Array.from({ length: 10 }, (_, i) => `/src/mod${i}.vf`);
        const cycle = createCycle(paths, false);

        const result = formatCycleForWarning(cycle);

        expect(result).toContain("mod0.vf → mod1.vf");
        expect(result).toContain("mod9.vf → mod0.vf");
        expect(result.split(" → ")).toHaveLength(11); // 10 + 1 for closing
    });

    it("should handle empty cycle path", () => {
        const cycle = createCycle([], false, []);

        const result = formatCycleForWarning(cycle);

        expect(result).toBe("");
    });

    it("should handle single module cycle (self-import edge case)", () => {
        const cycle = createCycle(["/src/self.vf"], false);

        const result = formatCycleForWarning(cycle);

        expect(result).toBe("self.vf → self.vf");
    });
});

// =============================================================================
// generateCircularDependencyWarning Tests (VF5900)
// =============================================================================

describe("generateCircularDependencyWarning", () => {
    it("should create VF5900 diagnostic", () => {
        const cycle = createCycle(["/src/a.vf", "/src/b.vf"], false);

        const warning = generateCircularDependencyWarning(cycle);

        expect(warning.code).toBe("VF5900");
        expect(warning.severity).toBe("warning");
    });

    it("should include cycle path in message", () => {
        const cycle = createCycle(["/src/a.vf", "/src/b.vf", "/src/c.vf"], false);

        const warning = generateCircularDependencyWarning(cycle);

        expect(warning.message).toContain("a.vf → b.vf → c.vf → a.vf");
    });

    it("should use first import location", () => {
        const locs = [createLocation("/src/a.vf", 5, 1, 100), createLocation("/src/b.vf", 3, 1, 50)];
        const cycle = createCycle(["/src/a.vf", "/src/b.vf"], false, locs);

        const warning = generateCircularDependencyWarning(cycle);

        expect(warning.location.file).toBe("/src/a.vf");
        expect(warning.location.line).toBe(5);
    });

    it("should include hint about restructuring", () => {
        const cycle = createCycle(["/src/a.vf", "/src/b.vf"], false);

        const warning = generateCircularDependencyWarning(cycle);

        expect(warning.hint).toContain("restructuring");
    });
});

// =============================================================================
// generateCircularDependencyWarnings Tests
// =============================================================================

describe("generateCircularDependencyWarnings", () => {
    it("should add warnings to collector for value cycles", () => {
        const collector = new WarningCollector();
        const cycles = [createCycle(["/src/a.vf", "/src/b.vf"], false), createCycle(["/src/x.vf", "/src/y.vf"], false)];

        generateCircularDependencyWarnings(cycles, collector);

        expect(collector.count).toBe(2);
    });

    it("should skip type-only cycles", () => {
        const collector = new WarningCollector();
        const cycles = [
            createCycle(["/src/a.vf", "/src/b.vf"], true), // type-only
            createCycle(["/src/x.vf", "/src/y.vf"], false), // value
        ];

        generateCircularDependencyWarnings(cycles, collector);

        expect(collector.count).toBe(1);
        const warnings = collector.getWarnings();
        expect(warnings[0]?.message).toContain("x.vf");
    });

    it("should handle no cycles", () => {
        const collector = new WarningCollector();

        generateCircularDependencyWarnings([], collector);

        expect(collector.hasWarnings()).toBe(false);
    });

    it("should handle all type-only cycles", () => {
        const collector = new WarningCollector();
        const cycles = [createCycle(["/src/a.vf", "/src/b.vf"], true), createCycle(["/src/x.vf", "/src/y.vf"], true)];

        generateCircularDependencyWarnings(cycles, collector);

        expect(collector.hasWarnings()).toBe(false);
    });
});

// =============================================================================
// generateSelfImportError Tests (VF5004)
// =============================================================================

describe("generateSelfImportError", () => {
    it("should create VF5004 diagnostic", () => {
        const selfImport = createSelfImport("/src/utils.vf");

        const error = generateSelfImportError(selfImport);

        expect(error.code).toBe("VF5004");
        expect(error.severity).toBe("error");
    });

    it("should include module path in message", () => {
        const selfImport = createSelfImport("/src/utils.vf");

        const error = generateSelfImportError(selfImport);

        expect(error.message).toContain("utils.vf");
    });

    it("should use basename in error message", () => {
        const selfImport = createSelfImport("/very/long/path/to/module.vf");

        const error = generateSelfImportError(selfImport);

        // The diagnostic message (without location) should contain basename
        expect(error.diagnosticMessage).toContain("module.vf");
        // The full error message includes location, so it will contain the full path
        // But the key is that the path parameter in the message template uses basename
        expect(error.diagnosticMessage).not.toContain("/very/long");
    });

    it("should preserve location", () => {
        const loc = createLocation("/src/utils.vf", 10, 5, 200);
        const selfImport = createSelfImport("/src/utils.vf", loc);

        const error = generateSelfImportError(selfImport);

        expect(error.location.line).toBe(10);
        expect(error.location.column).toBe(5);
    });
});

// =============================================================================
// generateSelfImportErrors Tests
// =============================================================================

describe("generateSelfImportErrors", () => {
    it("should generate errors for all self-imports", () => {
        const selfImports = [createSelfImport("/src/a.vf"), createSelfImport("/src/b.vf")];

        const errors = generateSelfImportErrors(selfImports);

        expect(errors).toHaveLength(2);
        expect(errors[0]?.code).toBe("VF5004");
        expect(errors[1]?.code).toBe("VF5004");
    });

    it("should return empty array for no self-imports", () => {
        const errors = generateSelfImportErrors([]);

        expect(errors).toHaveLength(0);
    });
});

// =============================================================================
// generateCaseSensitivityWarning Tests (VF5901)
// =============================================================================

describe("generateCaseSensitivityWarning", () => {
    it("should create VF5901 diagnostic", () => {
        const warning = generateCaseSensitivityWarning(
            "./Utils",
            "./utils.vf",
            createLocation("/src/main.vf", 1, 20, 19),
        );

        expect(warning.code).toBe("VF5901");
        expect(warning.severity).toBe("warning");
    });

    it("should include both paths in message", () => {
        const warning = generateCaseSensitivityWarning("./Utils", "./utils.vf", createLocation("/src/main.vf"));

        expect(warning.message).toContain("Utils");
        expect(warning.message).toContain("utils.vf");
    });

    it("should extract basenames for cleaner display", () => {
        const warning = generateCaseSensitivityWarning(
            "./path/to/MyModule",
            "/absolute/path/to/mymodule.vf",
            createLocation("/src/main.vf"),
        );

        expect(warning.message).toContain("MyModule");
        expect(warning.message).toContain("mymodule.vf");
        expect(warning.message).not.toContain("/absolute");
    });

    it("should include hint about exact casing", () => {
        const warning = generateCaseSensitivityWarning("./Utils", "./utils.vf", createLocation("/src/main.vf"));

        expect(warning.hint).toContain("exact casing");
    });
});

// =============================================================================
// generateWarningsFromCycles Tests
// =============================================================================

describe("generateWarningsFromCycles", () => {
    it("should generate warnings for value cycles", () => {
        const cycles = [createCycle(["/src/a.vf", "/src/b.vf"], false)];
        const selfImports: SelfImport[] = [];

        const result = generateWarningsFromCycles(cycles, selfImports);

        expect(result.warnings).toHaveLength(1);
        expect(result.warnings[0]?.code).toBe("VF5900");
    });

    it("should skip type-only cycles", () => {
        const cycles = [createCycle(["/src/a.vf", "/src/b.vf"], true)];
        const selfImports: SelfImport[] = [];

        const result = generateWarningsFromCycles(cycles, selfImports);

        expect(result.warnings).toHaveLength(0);
    });

    it("should generate errors for self-imports", () => {
        const cycles: Cycle[] = [];
        const selfImports = [createSelfImport("/src/utils.vf")];

        const result = generateWarningsFromCycles(cycles, selfImports);

        expect(result.selfImportErrors).toHaveLength(1);
        expect(result.selfImportErrors[0]?.code).toBe("VF5004");
    });

    it("should handle mixed cycles and self-imports", () => {
        const cycles = [
            createCycle(["/src/a.vf", "/src/b.vf"], false), // value cycle
            createCycle(["/src/x.vf", "/src/y.vf"], true), // type-only cycle
        ];
        const selfImports = [createSelfImport("/src/self.vf")];

        const result = generateWarningsFromCycles(cycles, selfImports);

        expect(result.warnings).toHaveLength(1); // only value cycle
        expect(result.selfImportErrors).toHaveLength(1);
    });

    it("should return empty results for no issues", () => {
        const result = generateWarningsFromCycles([], []);

        expect(result.warnings).toHaveLength(0);
        expect(result.selfImportErrors).toHaveLength(0);
    });
});

// =============================================================================
// Snapshot Tests for Warning Format
// =============================================================================

describe("warning format snapshots", () => {
    it("should format VF5900 correctly", () => {
        const cycle = createCycle(["/src/moduleA.vf", "/src/moduleB.vf", "/src/moduleC.vf"], false, [
            createLocation("/src/moduleA.vf", 1, 1, 0),
            createLocation("/src/moduleB.vf", 2, 1, 25),
            createLocation("/src/moduleC.vf", 3, 1, 50),
        ]);

        const warning = generateCircularDependencyWarning(cycle);

        // Snapshot the formatted output
        expect(warning.format()).toMatchSnapshot("VF5900-circular-dependency");
    });

    it("should format VF5901 correctly", () => {
        const warning = generateCaseSensitivityWarning(
            "./Utils",
            "./utils.vf",
            createLocation("/src/main.vf", 1, 20, 19),
        );

        // Snapshot the formatted output
        expect(warning.format()).toMatchSnapshot("VF5901-case-sensitivity");
    });

    it("should format VF5004 correctly", () => {
        const selfImport = createSelfImport("/src/utils.vf", createLocation("/src/utils.vf", 5, 1, 100));

        const error = generateSelfImportError(selfImport);

        // Snapshot the formatted output
        expect(error.format()).toMatchSnapshot("VF5004-self-import");
    });

    it("should format long cycle correctly", () => {
        const paths = ["/src/alpha.vf", "/src/beta.vf", "/src/gamma.vf", "/src/delta.vf", "/src/epsilon.vf"];
        const cycle = createCycle(
            paths,
            false,
            paths.map((p, i) => createLocation(p, i + 1, 1, i * 30)),
        );

        const warning = generateCircularDependencyWarning(cycle);

        expect(warning.format()).toMatchSnapshot("VF5900-long-cycle");
    });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe("integration", () => {
    it("should work with WarningCollector end-to-end", () => {
        const collector = new WarningCollector();
        const cycles = [
            createCycle(["/src/a.vf", "/src/b.vf"], false),
            createCycle(["/src/x.vf", "/src/y.vf", "/src/z.vf"], false),
        ];

        generateCircularDependencyWarnings(cycles, collector);

        expect(collector.count).toBe(2);

        // Format all warnings
        const formatted = collector.formatAll();
        expect(formatted).toHaveLength(2);
        expect(formatted[0]).toContain("VF5900");
        expect(formatted[1]).toContain("VF5900");
    });

    it("should provide complete diagnostic information", () => {
        const loc = createLocation("/src/main.vf", 5, 10, 100);
        const cycle = createCycle(["/src/a.vf", "/src/b.vf"], false, [loc, createLocation("/src/b.vf", 3, 1, 50)]);

        const warning = generateCircularDependencyWarning(cycle);

        // Verify all diagnostic properties are set
        expect(warning.code).toBe("VF5900");
        expect(warning.diagnostic.definition.title).toBe("CircularDependency");
        expect(warning.severity).toBe("warning");
        expect(warning.diagnostic.definition.phase).toBe("modules");
        expect(warning.location.file).toBe("/src/main.vf");
        expect(warning.location.line).toBe(5);
        expect(warning.diagnosticMessage).toBeTruthy();
        expect(warning.hint).toBeTruthy();
    });
});
