/**
 * Error ordering meta-tests (F-03)
 *
 * Spec: docs/spec/03-type-system/04-error-reporting.md — "errors are
 * reported in source order".
 *
 * The typechecker is currently a single-error reporter (it throws on the
 * first encountered failure rather than collecting). Multi-error reporting
 * (F-04) is a separate feature gap. Until that lands, F-03 reduces to:
 *
 *   1. The first reported diagnostic for a multi-error fixture is the one
 *      whose source location is earliest.
 *   2. Run-to-run determinism — re-running the same input must report the
 *      same code at the same location, with no observable variation.
 */

import { describe, expect, it } from "vitest";

import { desugarModule } from "../desugarer/index.js";
import { VibefunDiagnostic } from "../diagnostics/index.js";
import { Lexer } from "../lexer/lexer.js";
import { Parser } from "../parser/parser.js";
import { typeCheck } from "./typechecker.js";

interface RunResult {
    code: string;
    line: number;
    column: number;
    file: string;
    message: string;
}

function runTypecheck(source: string): RunResult {
    const lexer = new Lexer(source, "ordering.vf");
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens, "ordering.vf");
    const surface = parser.parse();
    const core = desugarModule(surface);
    try {
        typeCheck(core);
    } catch (err) {
        if (err instanceof VibefunDiagnostic) {
            return {
                code: err.code,
                line: err.location.line,
                column: err.location.column,
                file: err.location.file,
                message: err.diagnosticMessage,
            };
        }
        throw err;
    }
    throw new Error("Expected typeCheck to throw a VibefunDiagnostic for the multi-error fixture");
}

describe("Error ordering (F-03)", () => {
    // Two independent type errors at known source locations:
    //   line 1: Int vs String mismatch on the first declaration
    //   line 2: String vs Int mismatch on the second declaration
    //
    // The typechecker throws on the first encountered failure, so this
    // fixture lets us assert that the *first-encountered location is the
    // first reported* (spec: "errors are reported in source order"). When
    // multi-error reporting (F-04) lands the test should be expanded to
    // assert the order of every collected diagnostic, not just the first.
    const multiErrorSource = ['let x: Int = "hello";', "let y: String = 42;"].join("\n");

    it("first reported diagnostic points at the first source-order error", () => {
        const result = runTypecheck(multiErrorSource);
        expect(result.line).toBe(1);
        // The earlier-line error must be reported, not the line-2 error.
        expect(result.line).toBeLessThan(2);
    });

    it("is deterministic run-to-run for the same input", () => {
        const first = runTypecheck(multiErrorSource);
        const second = runTypecheck(multiErrorSource);
        expect(second).toEqual(first);
    });

    it("is deterministic across many repeated runs", () => {
        const baseline = runTypecheck(multiErrorSource);
        for (let i = 0; i < 5; i++) {
            expect(runTypecheck(multiErrorSource)).toEqual(baseline);
        }
    });
});
