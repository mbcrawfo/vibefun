/**
 * Integration tests for external overload validation and resolution.
 *
 * [BUG: VF-FC-0008] Overload grouping/validation (VF4801/VF4802/VF4803) and
 * arity-based call resolution run on the post-desugar Core AST — these tests
 * exercise the full lex → parse → desugar → typeCheck pipeline that the
 * pre-fix validators never reached.
 */

import { describe, expect, it } from "vitest";

import { desugarModule } from "../desugarer/index.js";
import { VibefunDiagnostic } from "../diagnostics/index.js";
import { Lexer } from "../lexer/index.js";
import { Parser } from "../parser/index.js";
import { typeCheck } from "./typechecker.js";

function check(source: string): ReturnType<typeof typeCheck> {
    const lexer = new Lexer(source, "test.vf");
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens, "test.vf");
    return typeCheck(desugarModule(parser.parse()));
}

function expectDiagnostic(source: string, code: string): void {
    try {
        check(source);
        expect.fail(`Expected ${code} diagnostic`);
    } catch (error: unknown) {
        expect(error).toBeInstanceOf(VibefunDiagnostic);
        expect((error as VibefunDiagnostic).code).toBe(code);
    }
}

describe("external overloads (post-desugar pipeline)", () => {
    describe("group formation", () => {
        it("same-named externals form an ExternalOverload binding", () => {
            const typed = check(`external f: (Int) -> Int = "f";
external f: (Int, Int) -> Int = "f";`);
            const binding = typed.env.values.get("f");
            expect(binding?.kind).toBe("ExternalOverload");
            if (binding?.kind === "ExternalOverload") {
                expect(binding.overloads).toHaveLength(2);
                expect(binding.jsName).toBe("f");
            }
        });

        it("external-block members join the same overload group", () => {
            const typed = check(`external {
  g: (Int) -> Int = "g";
  g: (Int, Int) -> Int = "g";
};`);
            const binding = typed.env.values.get("g");
            expect(binding?.kind).toBe("ExternalOverload");
        });

        it("a single external stays a plain External binding", () => {
            const typed = check(`external f: (Int) -> Int = "f";`);
            expect(typed.env.values.get("f")?.kind).toBe("External");
        });
    });

    describe("validation", () => {
        it("VF4801 for inconsistent JS names", () => {
            expectDiagnostic(
                `external f: (Int) -> Int = "a";
external f: (Int, Int) -> Int = "b";`,
                "VF4801",
            );
        });

        it("VF4802 for inconsistent from modules", () => {
            expectDiagnostic(
                `external f: (Int) -> Int = "x" from "a";
external f: (Int, Int) -> Int = "x" from "b";`,
                "VF4802",
            );
        });

        it("VF4803 for a non-function overload shape", () => {
            expectDiagnostic(
                `external f: (Int) -> Int = "x";
external f: Int = "x";`,
                "VF4803",
            );
        });
    });

    describe("call resolution", () => {
        it("resolves by arity and types each overload independently", () => {
            const typed = check(`external pick: (Int) -> Int = "p";
external pick: (Int, Int) -> Int = "p";
let one = unsafe { pick(1) };
let two = unsafe { pick(1, 2) };`);
            expect(typed.declarationTypes.get("one")).toEqual({ type: "Const", name: "Int" });
            expect(typed.declarationTypes.get("two")).toEqual({ type: "Const", name: "Int" });
        });

        it("VF4201 when no overload matches the call arity", () => {
            expectDiagnostic(
                `external pick: (Int) -> Int = "p";
external pick: (Int, Int) -> Int = "p";
let r = unsafe { pick(1, 2, 3) };`,
                "VF4201",
            );
        });

        it("VF4205 when several overloads share the call arity", () => {
            expectDiagnostic(
                `external log: (String) -> Unit = "l";
external log: (Int) -> Unit = "l";
let r = unsafe { log(1) };`,
                "VF4205",
            );
        });

        it("VF4804 for a bare overloaded reference (no call context)", () => {
            expectDiagnostic(
                `external pick: (Int) -> Int = "p";
external pick: (Int, Int) -> Int = "p";
let f = unsafe { pick };`,
                "VF4804",
            );
        });

        it("VF4805 for an overloaded call outside unsafe", () => {
            expectDiagnostic(
                `external pick: (Int) -> Int = "p";
external pick: (Int, Int) -> Int = "p";
let r = pick(1);`,
                "VF4805",
            );
        });

        it("rejects an argument type mismatch against the resolved overload", () => {
            expectDiagnostic(
                `external pick: (Int) -> Int = "p";
external pick: (Int, Int) -> Int = "p";
let r = unsafe { pick("oops") };`,
                "VF4020",
            );
        });
    });
});
