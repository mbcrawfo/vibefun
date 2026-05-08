/**
 * Per-code factory tests for polymorphism diagnostic codes (VF4700-VF4701).
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

describe("VF4700 — ValueRestriction", () => {
    it("produces the expected diagnostic", () => {
        const diag = createDiagnostic("VF4700", loc, { name: "ids" });
        expect(diag).toMatchObject({ code: "VF4700", severity: "error" });
        expect(diag.diagnosticMessage).toBe("Cannot generalize non-syntactic value in binding 'ids'");
        expect(diag.hint).toBe("Add a type annotation or restructure the expression");
    });
});

describe("VF4701 — TypeEscape", () => {
    it("produces the expected diagnostic", () => {
        const diag = createDiagnostic("VF4701", loc, {});
        expect(diag).toMatchObject({ code: "VF4701", severity: "error" });
        expect(diag.diagnosticMessage).toBe("Type variable would escape its scope");
        expect(diag.hint).toBe("Add a type annotation to constrain the type");
    });
});
