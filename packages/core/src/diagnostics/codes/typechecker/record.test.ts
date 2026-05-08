/**
 * Per-code factory tests for record diagnostic codes (VF4500-VF4504).
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

describe("VF4500 — NonRecordAccess", () => {
    it("produces the expected diagnostic", () => {
        const diag = createDiagnostic("VF4500", loc, { actual: "Int" });
        expect(diag).toMatchObject({ code: "VF4500", severity: "error" });
        expect(diag.diagnosticMessage).toBe("Cannot access field on non-record type Int");
        expect(diag.hint).toBe("Field access is only valid on record types");
    });
});

describe("VF4501 — MissingRecordField", () => {
    it("produces the expected diagnostic", () => {
        const diag = createDiagnostic("VF4501", loc, { field: "age", availableFields: "name, email" });
        expect(diag).toMatchObject({ code: "VF4501", severity: "error" });
        expect(diag.diagnosticMessage).toBe("Field 'age' not found in record type");
        expect(diag.hint).toBe("Available fields: name, email");
    });
});

describe("VF4502 — DuplicateRecordField", () => {
    it("produces the expected diagnostic", () => {
        const diag = createDiagnostic("VF4502", loc, { field: "x" });
        expect(diag).toMatchObject({ code: "VF4502", severity: "error" });
        expect(diag.diagnosticMessage).toBe("Duplicate field 'x' in record");
        expect(diag.hint).toBe("Each field name can only appear once in a record");
    });
});

describe("VF4503 — MissingRequiredField", () => {
    it("produces the expected diagnostic", () => {
        const diag = createDiagnostic("VF4503", loc, {
            field: "age",
            expected: "{ name: String, age: Int }",
            actual: "{ name: String }",
        });
        expect(diag).toMatchObject({ code: "VF4503", severity: "error" });
        expect(diag.diagnosticMessage).toBe(
            "Record is missing required field 'age' (expected { name: String, age: Int }, got { name: String })",
        );
        expect(diag.hint).toBe("Add field 'age' to the record, or change the expected type");
    });
});

describe("VF4504 — RecordExtraFieldInInvariantPosition", () => {
    it("produces the expected diagnostic", () => {
        const diag = createDiagnostic("VF4504", loc, {
            field: "y",
            expected: "{ x: Int }",
            actual: "{ x: Int, y: Int }",
        });
        expect(diag).toMatchObject({ code: "VF4504", severity: "error" });
        expect(diag.diagnosticMessage).toBe(
            "Record has unexpected field 'y' not allowed at this generic-parameter position " +
                "(expected { x: Int }, got { x: Int, y: Int })",
        );
        expect(diag.hint).toBe("Generic type parameters are invariant — record fields must match exactly here");
    });
});
