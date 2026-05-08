/**
 * Per-code factory tests for undefined-reference diagnostic codes (VF4100-VF4103).
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

describe("VF4100 — UndefinedVariable", () => {
    it("produces the expected diagnostic", () => {
        const diag = createDiagnostic("VF4100", loc, { name: "x", suggestions: "xs, y" });
        expect(diag).toMatchObject({ code: "VF4100", severity: "error" });
        expect(diag.diagnosticMessage).toBe("Undefined variable 'x'");
        expect(diag.hint).toBe("Did you mean: xs, y?");
    });
});

describe("VF4101 — UndefinedType", () => {
    it("produces the expected diagnostic", () => {
        const diag = createDiagnostic("VF4101", loc, { name: "MyType" });
        expect(diag).toMatchObject({ code: "VF4101", severity: "error" });
        expect(diag.diagnosticMessage).toBe("Undefined type 'MyType'");
        expect(diag.hint).toBe("Check the type name spelling or import the type");
    });
});

describe("VF4102 — UndefinedConstructor", () => {
    it("produces the expected diagnostic", () => {
        const diag = createDiagnostic("VF4102", loc, { name: "Sme" });
        expect(diag).toMatchObject({ code: "VF4102", severity: "error" });
        expect(diag.diagnosticMessage).toBe("Undefined constructor 'Sme'");
        expect(diag.hint).toBe("Check the constructor name or define the variant type");
    });
});

describe("VF4103 — UndefinedField", () => {
    it("produces the expected diagnostic", () => {
        const diag = createDiagnostic("VF4103", loc, {
            field: "z",
            recordType: "{ x: Int, y: Int }",
            availableFields: "x, y",
        });
        expect(diag).toMatchObject({ code: "VF4103", severity: "error" });
        expect(diag.diagnosticMessage).toBe("Field 'z' does not exist on type { x: Int, y: Int }");
        expect(diag.hint).toBe("Available fields: x, y");
    });
});
