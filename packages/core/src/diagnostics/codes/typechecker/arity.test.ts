/**
 * Per-code factory tests for arity diagnostic codes (VF4200-VF4205).
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

describe("VF4200 — ConstructorArity", () => {
    it("produces the expected diagnostic", () => {
        const diag = createDiagnostic("VF4200", loc, { name: "Some", expected: 1, actual: 2 });
        expect(diag).toMatchObject({ code: "VF4200", severity: "error" });
        expect(diag.diagnosticMessage).toBe("Constructor 'Some' expects 1 argument(s), got 2");
        expect(diag.hint).toBe("Check the constructor definition for the correct number of arguments");
    });
});

describe("VF4201 — NoMatchingOverload", () => {
    it("produces the expected diagnostic", () => {
        const diag = createDiagnostic("VF4201", loc, {
            name: "max",
            argCount: 1,
            signatures: "  max(Int, Int) -> Int",
        });
        expect(diag).toMatchObject({ code: "VF4201", severity: "error" });
        expect(diag.diagnosticMessage).toBe("No matching overload for 'max' with 1 argument(s)");
        expect(diag.hint).toBe("Available signatures:\n  max(Int, Int) -> Int");
    });
});

describe("VF4202 — WrongArgumentCount", () => {
    it("produces the expected diagnostic", () => {
        const diag = createDiagnostic("VF4202", loc, { expected: 2, actual: 1 });
        expect(diag).toMatchObject({ code: "VF4202", severity: "error" });
        expect(diag.diagnosticMessage).toBe("Function expects 2 argument(s), got 1");
        expect(diag.hint).toBe("Check the function signature for the expected arguments");
    });
});

describe("VF4203 — TupleArity", () => {
    it("produces the expected diagnostic", () => {
        const diag = createDiagnostic("VF4203", loc, { expected: 2, actual: 3 });
        expect(diag).toMatchObject({ code: "VF4203", severity: "error" });
        expect(diag.diagnosticMessage).toBe("Expected 2-tuple, got 3-tuple");
        expect(diag.hint).toBe("Tuple sizes must match exactly");
    });
});

describe("VF4204 — TypeArgumentCount", () => {
    it("produces the expected diagnostic", () => {
        const diag = createDiagnostic("VF4204", loc, { name: "List", expected: 1, actual: 0 });
        expect(diag).toMatchObject({ code: "VF4204", severity: "error" });
        expect(diag.diagnosticMessage).toBe("Type 'List' expects 1 type argument(s), got 0");
        expect(diag.hint).toBe("Check the type definition for required type parameters");
    });
});

describe("VF4205 — AmbiguousOverload", () => {
    it("produces the expected diagnostic", () => {
        const diag = createDiagnostic("VF4205", loc, { name: "process" });
        expect(diag).toMatchObject({ code: "VF4205", severity: "error" });
        expect(diag.diagnosticMessage).toBe("Ambiguous call to 'process': multiple overloads match");
        expect(diag.hint).toBe("Add type annotations to disambiguate");
    });
});
