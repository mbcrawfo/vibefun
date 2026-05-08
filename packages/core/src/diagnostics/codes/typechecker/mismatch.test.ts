/**
 * Per-code factory tests for type mismatch diagnostic codes (VF4001-VF4018).
 *
 * Each test asserts that `createDiagnostic("VF<code>", loc, params)` produces
 * the exact code, severity, formatted message, and hint defined by its
 * `DiagnosticDefinition`. Generic factory mechanics are covered in
 * `../../factory.test.ts`; these tests pin the per-code rendering contract.
 */

import type { Location } from "../../../types/ast.js";

import { beforeEach, describe, expect, it } from "vitest";

import { createDiagnostic } from "../../factory.js";
import { initializeDiagnosticCodes } from "../../index.js";

const loc: Location = { file: "test.vf", line: 1, column: 1, offset: 0 };

beforeEach(() => {
    initializeDiagnosticCodes();
});

describe("VF4001 — TypeMismatch", () => {
    it("produces the expected diagnostic", () => {
        const diag = createDiagnostic("VF4001", loc, { expected: "Int", actual: "String" });
        expect(diag).toMatchObject({ code: "VF4001", severity: "error" });
        expect(diag.diagnosticMessage).toBe("Type mismatch: expected Int, got String");
        expect(diag.hint).toBe("Check that the expression has the expected type");
    });
});

describe("VF4002 — ArgumentTypeMismatch", () => {
    it("produces the expected diagnostic", () => {
        const diag = createDiagnostic("VF4002", loc, { expected: "Int", actual: "String" });
        expect(diag).toMatchObject({ code: "VF4002", severity: "error" });
        expect(diag.diagnosticMessage).toBe("Argument type mismatch: expected Int, got String");
        expect(diag.hint).toBe("Check the argument type matches the function parameter");
    });
});

describe("VF4003 — ReturnTypeMismatch", () => {
    it("produces the expected diagnostic", () => {
        const diag = createDiagnostic("VF4003", loc, { expected: "Int", actual: "String" });
        expect(diag).toMatchObject({ code: "VF4003", severity: "error" });
        expect(diag.diagnosticMessage).toBe("Return type mismatch: expected Int, got String");
        expect(diag.hint).toBe("Check the function body returns the declared type");
    });
});

describe("VF4004 — BranchTypeMismatch", () => {
    it("produces the expected diagnostic", () => {
        const diag = createDiagnostic("VF4004", loc, { expected: "Int", actual: "String" });
        expect(diag).toMatchObject({ code: "VF4004", severity: "error" });
        expect(diag.diagnosticMessage).toBe("Branch type mismatch: expected Int, got String");
        expect(diag.hint).toBe("All branches of a match expression must have the same type");
    });
});

describe("VF4005 — IfBranchTypeMismatch", () => {
    it("produces the expected diagnostic", () => {
        const diag = createDiagnostic("VF4005", loc, { thenType: "Int", elseType: "String" });
        expect(diag).toMatchObject({ code: "VF4005", severity: "error" });
        expect(diag.diagnosticMessage).toBe(
            "If branches have different types: then-branch has Int, else-branch has String",
        );
        expect(diag.hint).toBe("Both branches of an if expression must have the same type");
    });
});

describe("VF4006 — ListElementMismatch", () => {
    it("produces the expected diagnostic", () => {
        const diag = createDiagnostic("VF4006", loc, { expected: "Int", actual: "String" });
        expect(diag).toMatchObject({ code: "VF4006", severity: "error" });
        expect(diag.diagnosticMessage).toBe("List element type mismatch: expected Int, got String");
        expect(diag.hint).toBe("All list elements must have the same type");
    });
});

describe("VF4007 — TupleElementMismatch", () => {
    it("produces the expected diagnostic", () => {
        const diag = createDiagnostic("VF4007", loc, { index: 1, expected: "Int", actual: "String" });
        expect(diag).toMatchObject({ code: "VF4007", severity: "error" });
        expect(diag.diagnosticMessage).toBe("Tuple element 1: expected Int, got String");
        expect(diag.hint).toBe("Check the type of the tuple element at the specified index");
    });
});

describe("VF4008 — RecordFieldMismatch", () => {
    it("produces the expected diagnostic", () => {
        const diag = createDiagnostic("VF4008", loc, { field: "name", expected: "String", actual: "Int" });
        expect(diag).toMatchObject({ code: "VF4008", severity: "error" });
        expect(diag.diagnosticMessage).toBe("Field 'name': expected String, got Int");
        expect(diag.hint).toBe("Check the type of the record field");
    });
});

describe("VF4009 — NumericTypeMismatch", () => {
    it("produces the expected diagnostic", () => {
        const diag = createDiagnostic("VF4009", loc, { message: "cannot mix Int and Float" });
        expect(diag).toMatchObject({ code: "VF4009", severity: "error" });
        expect(diag.diagnosticMessage).toBe("Numeric type mismatch: cannot mix Int and Float");
        expect(diag.hint).toBe("Int and Float are different types and cannot be mixed implicitly");
    });
});

describe("VF4010 — OperatorTypeMismatch", () => {
    it("produces the expected diagnostic", () => {
        const diag = createDiagnostic("VF4010", loc, { op: "+", left: "Int", right: "String" });
        expect(diag).toMatchObject({ code: "VF4010", severity: "error" });
        expect(diag.diagnosticMessage).toBe("Cannot apply operator '+' to types Int and String");
        expect(diag.hint).toBe("Check that the operator is valid for these types");
    });
});

describe("VF4011 — GuardTypeMismatch", () => {
    it("produces the expected diagnostic", () => {
        const diag = createDiagnostic("VF4011", loc, { actual: "Int" });
        expect(diag).toMatchObject({ code: "VF4011", severity: "error" });
        expect(diag.diagnosticMessage).toBe("Guard must be Bool, got Int");
        expect(diag.hint).toBe("Pattern guards must evaluate to Bool");
    });
});

describe("VF4012 — AnnotationMismatch", () => {
    it("produces the expected diagnostic", () => {
        const diag = createDiagnostic("VF4012", loc, { expected: "Int", actual: "String" });
        expect(diag).toMatchObject({ code: "VF4012", severity: "error" });
        expect(diag.diagnosticMessage).toBe("Type annotation Int does not match inferred type String");
        expect(diag.hint).toBe("Either fix the type annotation or the expression");
    });
});

describe("VF4013 — NotAFunction", () => {
    it("produces the expected diagnostic", () => {
        const diag = createDiagnostic("VF4013", loc, { actual: "Int" });
        expect(diag).toMatchObject({ code: "VF4013", severity: "error" });
        expect(diag.diagnosticMessage).toBe("Cannot call non-function type Int");
        expect(diag.hint).toBe("Only functions can be called with arguments");
    });
});

describe("VF4014 — NotARecord", () => {
    it("produces the expected diagnostic", () => {
        const diag = createDiagnostic("VF4014", loc, { actual: "Int" });
        expect(diag).toMatchObject({ code: "VF4014", severity: "error" });
        expect(diag.diagnosticMessage).toBe("Cannot access field on non-record type Int");
        expect(diag.hint).toBe("Only records have fields that can be accessed with .field syntax");
    });
});

describe("VF4015 — NotARef", () => {
    it("produces the expected diagnostic", () => {
        const diag = createDiagnostic("VF4015", loc, { actual: "Int" });
        expect(diag).toMatchObject({ code: "VF4015", severity: "error" });
        expect(diag.diagnosticMessage).toBe("Cannot dereference non-Ref type Int");
        expect(diag.hint).toBe("Only Ref values can be dereferenced with ! or assigned with :=");
    });
});

describe("VF4016 — RefAssignmentMismatch", () => {
    it("produces the expected diagnostic", () => {
        const diag = createDiagnostic("VF4016", loc, { expected: "Int", actual: "String" });
        expect(diag).toMatchObject({ code: "VF4016", severity: "error" });
        expect(diag.diagnosticMessage).toBe("Cannot assign String to Ref<Int>");
        expect(diag.hint).toBe("The assigned value must match the Ref's inner type");
    });
});

describe("VF4017 — NotImplemented", () => {
    it("produces the expected diagnostic", () => {
        const diag = createDiagnostic("VF4017", loc, {
            feature: "pattern matching in let bindings",
            hint: "Use match expressions instead",
        });
        expect(diag).toMatchObject({ code: "VF4017", severity: "error" });
        expect(diag.diagnosticMessage).toBe("pattern matching in let bindings not yet implemented");
        expect(diag.hint).toBe("Use match expressions instead");
    });
});

describe("VF4018 — MutableBindingRequiresRef", () => {
    it("produces the expected diagnostic", () => {
        const diag = createDiagnostic("VF4018", loc, {});
        expect(diag).toMatchObject({ code: "VF4018", severity: "error" });
        expect(diag.diagnosticMessage).toBe("Mutable binding ('let mut ...') requires a Ref<T> value");
        expect(diag.hint).toBe("Wrap the value in ref(...) or assign from an existing Ref binding");
    });
});
