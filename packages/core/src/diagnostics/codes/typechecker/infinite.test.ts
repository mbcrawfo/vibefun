/**
 * Per-code factory tests for infinite type diagnostic codes (VF4300-VF4301).
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

describe("VF4300 — InfiniteType", () => {
    it("produces the expected diagnostic", () => {
        const diag = createDiagnostic("VF4300", loc, { typeVar: "'a", type: "'a -> 'a" });
        expect(diag).toMatchObject({ code: "VF4300", severity: "error" });
        expect(diag.diagnosticMessage).toBe("Cannot construct infinite type: 'a = 'a -> 'a");
        expect(diag.hint).toBe("Add a type annotation to clarify your intent");
    });
});

describe("VF4301 — RecursiveAlias", () => {
    it("produces the expected diagnostic", () => {
        const diag = createDiagnostic("VF4301", loc, { name: "Loop" });
        expect(diag).toMatchObject({ code: "VF4301", severity: "error" });
        expect(diag.diagnosticMessage).toBe("Type alias 'Loop' is recursive");
        expect(diag.hint).toBe("Use a variant type for recursive data structures");
    });
});
