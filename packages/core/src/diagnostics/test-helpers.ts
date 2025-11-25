/**
 * Test helpers for diagnostic assertions
 *
 * These utilities make it easy to test that code throws the expected
 * diagnostics with correct codes and properties.
 */

import type { WarningCollector } from "./warning-collector.js";

import { expect } from "vitest";

import { VibefunDiagnostic } from "./diagnostic.js";

/**
 * Expect a function to throw a VibefunDiagnostic with the given code.
 * Returns the caught diagnostic for further assertions.
 *
 * @param fn - Function expected to throw a VibefunDiagnostic
 * @param expectedCode - Expected diagnostic code (e.g., "VF4001")
 * @returns The caught VibefunDiagnostic for further assertions
 * @throws AssertionError if function doesn't throw or throws wrong code
 *
 * @example
 * ```typescript
 * const diag = expectDiagnostic(() => typecheck(program), "VF4001");
 * expect(diag.diagnosticMessage).toContain("expected Int");
 * expect(diag.location.line).toBe(5);
 * ```
 */
export function expectDiagnostic(fn: () => void, expectedCode: string): VibefunDiagnostic {
    let caught: unknown;

    try {
        fn();
    } catch (error) {
        caught = error;
    }

    // Verify something was thrown
    expect(caught, `Expected function to throw VibefunDiagnostic with code ${expectedCode}`).toBeDefined();

    // Verify it's a VibefunDiagnostic
    expect(
        caught instanceof VibefunDiagnostic,
        `Expected VibefunDiagnostic, got ${caught instanceof Error ? caught.constructor.name : typeof caught}: ${caught}`,
    ).toBe(true);

    const diagnostic = caught as VibefunDiagnostic;

    // Verify the code matches
    expect(diagnostic.code, `Expected diagnostic code ${expectedCode}, got ${diagnostic.code}`).toBe(expectedCode);

    return diagnostic;
}

/**
 * Expect a warning with the given code to be collected.
 * Returns the warning for further assertions.
 *
 * @param collector - The WarningCollector to search
 * @param expectedCode - Expected diagnostic code (e.g., "VF4900")
 * @returns The found warning for further assertions
 * @throws AssertionError if warning not found
 *
 * @example
 * ```typescript
 * const collector = new WarningCollector();
 * typecheck(program, source, { warningCollector: collector });
 * const warning = expectWarning(collector, "VF4900");
 * expect(warning.diagnosticMessage).toContain("unreachable");
 * ```
 */
export function expectWarning(collector: WarningCollector, expectedCode: string): VibefunDiagnostic {
    const warnings = collector.getWarnings();
    const found = warnings.find((w) => w.code === expectedCode);

    expect(
        found,
        `Expected warning ${expectedCode} to be collected. Found warnings: ${warnings.map((w) => w.code).join(", ") || "none"}`,
    ).toBeDefined();

    return found as VibefunDiagnostic;
}

/**
 * Expect that no warnings were collected.
 *
 * @param collector - The WarningCollector to check
 * @throws AssertionError if any warnings were collected
 *
 * @example
 * ```typescript
 * const collector = new WarningCollector();
 * typecheck(validProgram, source, { warningCollector: collector });
 * expectNoWarnings(collector);
 * ```
 */
export function expectNoWarnings(collector: WarningCollector): void {
    const warnings = collector.getWarnings();
    expect(
        warnings.length,
        `Expected no warnings, but found: ${warnings.map((w) => `${w.code}: ${w.diagnosticMessage}`).join(", ")}`,
    ).toBe(0);
}

/**
 * Expect a function to throw a VibefunDiagnostic (any code).
 * Useful when you just want to verify an error occurs without checking the specific code.
 *
 * @param fn - Function expected to throw a VibefunDiagnostic
 * @returns The caught VibefunDiagnostic
 * @throws AssertionError if function doesn't throw a VibefunDiagnostic
 *
 * @example
 * ```typescript
 * const diag = expectAnyDiagnostic(() => typecheck(badProgram));
 * expect(diag.severity).toBe("error");
 * ```
 */
export function expectAnyDiagnostic(fn: () => void): VibefunDiagnostic {
    let caught: unknown;

    try {
        fn();
    } catch (error) {
        caught = error;
    }

    expect(caught, "Expected function to throw VibefunDiagnostic").toBeDefined();

    expect(
        caught instanceof VibefunDiagnostic,
        `Expected VibefunDiagnostic, got ${caught instanceof Error ? caught.constructor.name : typeof caught}`,
    ).toBe(true);

    return caught as VibefunDiagnostic;
}
