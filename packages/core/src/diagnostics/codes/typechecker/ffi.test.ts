/**
 * Per-code factory tests for FFI diagnostic codes (VF4800-VF4806).
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

describe("VF4800 — FFIError", () => {
    it("produces the expected diagnostic", () => {
        const diag = createDiagnostic("VF4800", loc, { message: "invalid external declaration" });
        expect(diag).toMatchObject({ code: "VF4800", severity: "error" });
        expect(diag.diagnosticMessage).toBe("invalid external declaration");
        expect(diag.hint).toBe("Check the external declaration");
    });
});

describe("VF4801 — FFIInconsistentName", () => {
    it("produces the expected diagnostic", () => {
        const diag = createDiagnostic("VF4801", loc, { name: "parse" });
        expect(diag).toMatchObject({ code: "VF4801", severity: "error" });
        expect(diag.diagnosticMessage).toBe("Inconsistent JavaScript names for 'parse'");
        expect(diag.hint).toBe("All overloads must map to the same JavaScript function");
    });
});

describe("VF4802 — FFIInconsistentImport", () => {
    it("produces the expected diagnostic", () => {
        const diag = createDiagnostic("VF4802", loc, { name: "parse" });
        expect(diag).toMatchObject({ code: "VF4802", severity: "error" });
        expect(diag.diagnosticMessage).toBe("Inconsistent module imports for 'parse'");
        expect(diag.hint).toBe("All overloads must have the same 'from' clause");
    });
});

describe("VF4803 — FFINotFunction", () => {
    it("produces the expected diagnostic", () => {
        const diag = createDiagnostic("VF4803", loc, { name: "PI" });
        expect(diag).toMatchObject({ code: "VF4803", severity: "error" });
        expect(diag.diagnosticMessage).toBe("Overloaded external 'PI' must have function type");
        expect(diag.hint).toBe("Only functions can be overloaded");
    });
});

describe("VF4804 — FFIOverloadNotSupported", () => {
    it("produces the expected diagnostic", () => {
        const diag = createDiagnostic("VF4804", loc, { name: "parse" });
        expect(diag).toMatchObject({ code: "VF4804", severity: "error" });
        expect(diag.diagnosticMessage).toBe("Overloaded external 'parse' not yet supported in this context");
        expect(diag.hint).toBe("Overloaded externals require explicit overload resolution");
    });
});

describe("VF4805 — ExternalCallOutsideUnsafe", () => {
    it("produces the expected diagnostic", () => {
        const diag = createDiagnostic("VF4805", loc, { name: "log" });
        expect(diag).toMatchObject({ code: "VF4805", severity: "error" });
        expect(diag.diagnosticMessage).toBe("External 'log' can only be referenced inside an unsafe block");
        expect(diag.hint).toBe("Wrap the call in `unsafe { ... }` or expose a safe wrapper that does");
    });
});

describe("VF4806 — TryCatchOutsideUnsafe", () => {
    it("produces the expected diagnostic", () => {
        const diag = createDiagnostic("VF4806", loc, {});
        expect(diag).toMatchObject({ code: "VF4806", severity: "error" });
        expect(diag.diagnosticMessage).toBe("try/catch is only allowed inside an unsafe block");
        expect(diag.hint).toBe("Wrap the try/catch in `unsafe { ... }` or move it into a helper that does");
    });
});
