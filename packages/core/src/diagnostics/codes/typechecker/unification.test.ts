/**
 * Per-code factory tests for unification diagnostic codes (VF4020-VF4027).
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

describe("VF4020 — CannotUnify", () => {
    it("produces the expected diagnostic", () => {
        const diag = createDiagnostic("VF4020", loc, { t1: "Int", t2: "Bool" });
        expect(diag).toMatchObject({ code: "VF4020", severity: "error" });
        expect(diag.diagnosticMessage).toBe("Cannot unify Int with Bool");
        expect(diag.hint).toBe("These types are fundamentally incompatible");
    });
});

describe("VF4021 — FunctionArityMismatch", () => {
    it("produces the expected diagnostic", () => {
        const diag = createDiagnostic("VF4021", loc, { arity1: 2, arity2: 3 });
        expect(diag).toMatchObject({ code: "VF4021", severity: "error" });
        expect(diag.diagnosticMessage).toBe("Cannot unify functions with different arity: 2 vs 3");
        expect(diag.hint).toBe("Functions must have the same number of parameters to unify");
    });
});

describe("VF4022 — TypeApplicationArityMismatch", () => {
    it("produces the expected diagnostic", () => {
        const diag = createDiagnostic("VF4022", loc, {});
        expect(diag).toMatchObject({ code: "VF4022", severity: "error" });
        expect(diag.diagnosticMessage).toBe("Cannot unify type applications with different arity");
        expect(diag.hint).toBe("Type constructors must have the same number of type arguments");
    });
});

describe("VF4023 — UnionArityMismatch", () => {
    it("produces the expected diagnostic", () => {
        const diag = createDiagnostic("VF4023", loc, {});
        expect(diag).toMatchObject({ code: "VF4023", severity: "error" });
        expect(diag.diagnosticMessage).toBe("Cannot unify unions with different number of types");
        expect(diag.hint).toBe("Union types must have the same number of member types");
    });
});

describe("VF4024 — IncompatibleTypes", () => {
    it("produces the expected diagnostic", () => {
        const diag = createDiagnostic("VF4024", loc, { type1: "{ a: Int }", type2: "Int -> Int" });
        expect(diag).toMatchObject({ code: "VF4024", severity: "error" });
        expect(diag.diagnosticMessage).toBe("Cannot unify types: { a: Int } with Int -> Int");
        expect(diag.hint).toBe("These type kinds cannot be unified");
    });
});

describe("VF4025 — VariantUnificationError", () => {
    it("produces the expected diagnostic", () => {
        const diag = createDiagnostic("VF4025", loc, { message: "constructor 'Foo' not in B" });
        expect(diag).toMatchObject({ code: "VF4025", severity: "error" });
        expect(diag.diagnosticMessage).toBe("Cannot unify variant types: constructor 'Foo' not in B");
        expect(diag.hint).toBe("Variant types must have exactly the same constructors");
    });
});

describe("VF4026 — TupleArityMismatch", () => {
    it("produces the expected diagnostic", () => {
        const diag = createDiagnostic("VF4026", loc, { expected: 2, actual: 3 });
        expect(diag).toMatchObject({ code: "VF4026", severity: "error" });
        expect(diag.diagnosticMessage).toBe("Cannot unify tuples: expected 2-tuple, got 3-tuple");
        expect(diag.hint).toBe("Tuples must have the same number of elements");
    });
});

describe("VF4027 — RecursiveTypeAlias", () => {
    it("produces the expected diagnostic", () => {
        const diag = createDiagnostic("VF4027", loc, { name: "Loop" });
        expect(diag).toMatchObject({ code: "VF4027", severity: "error" });
        expect(diag.diagnosticMessage).toBe("Type alias 'Loop' is unguardedly recursive");
        expect(diag.hint).toBe(
            "Wrap the recursion in a variant or record type — e.g. 'type List = Cons(Int, List) | Nil;'",
        );
    });
});
