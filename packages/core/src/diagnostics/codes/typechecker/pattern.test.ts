/**
 * Per-code factory tests for pattern matching diagnostic codes (VF4400-VF4405).
 *
 * Each test asserts that `createDiagnostic("VF<code>", loc, params)` produces
 * the exact code, severity, formatted message, and hint defined by its
 * `DiagnosticDefinition`.
 */

import type { Location } from "../../../types/ast.js";

import { beforeEach, describe, expect, it } from "vitest";

import { createDiagnostic } from "../../factory.js";
import { initializeDiagnosticCodes } from "../../index.js";

const loc: Location = { file: "test.vf", line: 1, column: 1, offset: 0 };

beforeEach(() => {
    initializeDiagnosticCodes();
});

describe("VF4400 — NonExhaustiveMatch", () => {
    it("produces the expected diagnostic", () => {
        const diag = createDiagnostic("VF4400", loc, { missing: "None" });
        expect(diag).toMatchObject({ code: "VF4400", severity: "error" });
        expect(diag.diagnosticMessage).toBe("Non-exhaustive pattern match. Missing cases: None");
        expect(diag.hint).toBe("Add the missing pattern cases or use a wildcard (_) to match all remaining");
    });
});

describe("VF4401 — InvalidGuard", () => {
    it("produces the expected diagnostic", () => {
        const diag = createDiagnostic("VF4401", loc, { message: "guard must be Bool" });
        expect(diag).toMatchObject({ code: "VF4401", severity: "error" });
        expect(diag.diagnosticMessage).toBe("Invalid pattern guard: guard must be Bool");
        expect(diag.hint).toBe("Pattern guards must be valid boolean expressions");
    });
});

describe("VF4402 — DuplicateBinding", () => {
    it("produces the expected diagnostic", () => {
        const diag = createDiagnostic("VF4402", loc, { name: "x" });
        expect(diag).toMatchObject({ code: "VF4402", severity: "error" });
        expect(diag.diagnosticMessage).toBe("Duplicate pattern variable: 'x'");
        expect(diag.hint).toBe("Each variable can only be bound once in a pattern");
    });
});

describe("VF4403 — OrPatternBindsVariable", () => {
    it("produces the expected diagnostic", () => {
        const diag = createDiagnostic("VF4403", loc, {});
        expect(diag).toMatchObject({ code: "VF4403", severity: "error" });
        expect(diag.diagnosticMessage).toBe("Or-pattern alternatives cannot bind variables");
        expect(diag.hint).toBe(
            "Use only literals, wildcards, or constructors without bindings inside or-patterns, " +
                "or split the or-pattern into separate match arms",
        );
    });
});

describe("VF4404 — EmptyMatch", () => {
    it("produces the expected diagnostic", () => {
        const diag = createDiagnostic("VF4404", loc, {});
        expect(diag).toMatchObject({ code: "VF4404", severity: "error" });
        expect(diag.diagnosticMessage).toBe("Match expression has no cases");
        expect(diag.hint).toBe("Add at least one match case");
    });
});

describe("VF4405 — UnreachablePattern", () => {
    it("produces the expected diagnostic", () => {
        const diag = createDiagnostic("VF4405", loc, {});
        expect(diag).toMatchObject({ code: "VF4405", severity: "error" });
        expect(diag.diagnosticMessage).toBe("Unreachable pattern: an earlier catch-all already matches every value");
        expect(diag.hint).toBe("Remove this arm, or move it before the catch-all so it can match before the fallback");
    });
});
