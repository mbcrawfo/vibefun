/**
 * Per-code factory tests for variant diagnostic codes (VF4600-VF4602).
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

describe("VF4600 — UnknownConstructor", () => {
    it("produces the expected diagnostic", () => {
        const diag = createDiagnostic("VF4600", loc, { name: "Purple", constructors: "Red, Green, Blue" });
        expect(diag).toMatchObject({ code: "VF4600", severity: "error" });
        expect(diag.diagnosticMessage).toBe("Unknown constructor 'Purple' for variant type");
        expect(diag.hint).toBe("Available constructors: Red, Green, Blue");
    });
});

describe("VF4601 — ConstructorArgMismatch", () => {
    it("produces the expected diagnostic", () => {
        const diag = createDiagnostic("VF4601", loc, { name: "Some", expected: "Int", actual: "String" });
        expect(diag).toMatchObject({ code: "VF4601", severity: "error" });
        expect(diag.diagnosticMessage).toBe("Constructor 'Some' argument type mismatch: expected Int, got String");
        expect(diag.hint).toBe("Check the constructor's expected argument types");
    });
});

describe("VF4602 — VariantMismatch", () => {
    it("produces the expected diagnostic", () => {
        const diag = createDiagnostic("VF4602", loc, { expected: "Color", actual: "Shape" });
        expect(diag).toMatchObject({ code: "VF4602", severity: "error" });
        expect(diag.diagnosticMessage).toBe("Expected variant type Color, got Shape");
        expect(diag.hint).toBe("Check that the variant type matches");
    });
});
