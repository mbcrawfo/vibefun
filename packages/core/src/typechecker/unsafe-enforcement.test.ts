/**
 * Integration tests for unsafe-block enforcement.
 *
 * Covers the rule from `docs/spec/10-javascript-interop/unsafe-blocks.md`:
 * an `external` binding may only be referenced inside an `unsafe` block.
 * The full pipeline (lex → parse → desugar → typecheck) is exercised so
 * regressions in any layer — including context-threading in the inferer —
 * are caught.
 */

import { describe, expect, it } from "vitest";

import { desugarModule } from "../desugarer/index.js";
import { expectDiagnostic } from "../diagnostics/test-helpers.js";
import { Lexer } from "../lexer/index.js";
import { Parser } from "../parser/parser.js";
import { typeCheck } from "./typechecker.js";

function typecheckSource(source: string): ReturnType<typeof typeCheck> {
    const lexer = new Lexer(source, "test.vf");
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens, "test.vf");
    const ast = parser.parse();
    const coreModule = desugarModule(ast);
    return typeCheck(coreModule);
}

const EXT_LOG = 'external console_log: (String) -> Unit = "console.log";\n';
const EXT_ABS = 'external math_abs: (Int) -> Int = "Math.abs";\n';

describe("Unsafe-block enforcement", () => {
    describe("rejects external references outside unsafe", () => {
        it("direct call at module top level", () => {
            expectDiagnostic(() => typecheckSource(`${EXT_LOG}let _ = console_log("hi");`), "VF4805");
        });

        it("external used as a first-class value outside unsafe", () => {
            expectDiagnostic(() => typecheckSource(`${EXT_LOG}let f = console_log;`), "VF4805");
        });

        it("call nested inside a let body outside unsafe", () => {
            expectDiagnostic(() => typecheckSource(`${EXT_ABS}let x = { let y = 1; math_abs(y); };`), "VF4805");
        });

        it("call inside a lambda body that is not wrapped in unsafe", () => {
            // The lambda literal sits inside an outer `unsafe` block but its
            // body is a fresh safe scope, so referencing the external inside
            // the lambda must still be rejected.
            expectDiagnostic(
                () =>
                    typecheckSource(
                        `${EXT_LOG}let greet = unsafe { (name) => console_log(name) };\nlet _ = unsafe { greet("x") };`,
                    ),
                "VF4805",
            );
        });

        it("call inside a match arm outside unsafe", () => {
            expectDiagnostic(
                () => typecheckSource(`${EXT_LOG}let x = 1;\nlet _ = match x { | 1 => console_log("a") | _ => () };`),
                "VF4805",
            );
        });
    });

    describe("allows external references inside unsafe", () => {
        it("direct call inside unsafe", () => {
            expect(() => typecheckSource(`${EXT_LOG}let _ = unsafe { console_log("hi") };`)).not.toThrow();
        });

        it("nested unsafe is redundant but legal", () => {
            expect(() =>
                typecheckSource(`${EXT_ABS}let y = unsafe { let x = unsafe { math_abs(-5) }; x };`),
            ).not.toThrow();
        });

        it("lambda body wraps its own unsafe, caller does not need one", () => {
            expect(() =>
                typecheckSource(
                    `${EXT_LOG}let safeLog = (s: String) => unsafe { console_log(s) };\nlet _ = safeLog("x");`,
                ),
            ).not.toThrow();
        });

        it("external used as first-class value inside unsafe", () => {
            expect(() => typecheckSource(`${EXT_LOG}let _ = unsafe { let f = console_log; f };`)).not.toThrow();
        });

        it("pipe through external inside unsafe", () => {
            expect(() => typecheckSource(`${EXT_ABS}let r = unsafe { -5 |> math_abs };`)).not.toThrow();
        });
    });
});
