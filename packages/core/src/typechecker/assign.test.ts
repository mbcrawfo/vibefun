/**
 * Integration tests for typechecking mutable-binding reassignment.
 *
 * [BUG: VF-FC-0005] `x = expr;` requires the target to be a `let mut`
 * binding (VF4019 otherwise; VF4100 when unbound), unifies the value with
 * the binding's monomorphic type, and has type Unit. Full
 * lex → parse → desugar → typeCheck pipeline.
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

describe("mutable-binding reassignment typechecking", () => {
    it("accepts reassigning a mut binding to a matching ref", () => {
        expect(() =>
            check(`let mut x = ref(0);
x = ref(10);`),
        ).not.toThrow();
    });

    it("the reassignment statement has type Unit", () => {
        // The block's trailing statement is the assignment, so the block's
        // value (and thus `u`) is the assignment's Unit.
        const typed = check(`let mut x = ref(0);
let u: Unit = {
  x = ref(1);
};`);
        expect(typed.declarationTypes.get("u")).toEqual({ type: "Const", name: "Unit" });
    });

    it("rejects reassigning an immutable binding with VF4019", () => {
        expectDiagnostic(
            `let y = 42;
y = 43;`,
            "VF4019",
        );
    });

    it("rejects reassigning an unbound name with VF4100", () => {
        expectDiagnostic(`z = ref(1);`, "VF4100");
    });

    it("rejects a value whose type does not unify with the binding", () => {
        try {
            check(`let mut x = ref(0);
x = ref("hello");`);
            expect.fail("Expected a unification diagnostic");
        } catch (error: unknown) {
            expect(error).toBeInstanceOf(VibefunDiagnostic);
        }
    });

    it("rejects reassigning an external binding with VF4019", () => {
        expectDiagnostic(
            `external f: (Int) -> Int = "f";
f = ref(1);`,
            "VF4019",
        );
    });

    it("rejects reassigning a lambda parameter (not a mut binding)", () => {
        expectDiagnostic(
            `let f = (n: Int) => {
  n = 5;
  n;
};`,
            "VF4019",
        );
    });
});
