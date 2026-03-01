/**
 * Integration tests for type annotation enforcement on let bindings.
 *
 * These tests run the full pipeline (lex -> parse -> desugar -> typecheck)
 * to verify that type annotations on let bindings are properly enforced.
 */

import { describe, expect, it } from "vitest";

import { desugarModule } from "../desugarer/index.js";
import { expectDiagnostic } from "../diagnostics/test-helpers.js";
import { Lexer } from "../lexer/index.js";
import { Parser } from "../parser/parser.js";
import { typeCheck } from "./typechecker.js";

/**
 * Run the full compilation pipeline on source code and return typecheck result.
 */
function typecheckSource(source: string) {
    const lexer = new Lexer(source, "test.vf");
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens, "test.vf");
    const ast = parser.parse();
    const coreModule = desugarModule(ast);
    return typeCheck(coreModule);
}

describe("Type annotations on let bindings", () => {
    describe("valid annotations", () => {
        it("accepts let with matching Int annotation", () => {
            const result = typecheckSource("let x: Int = 42;");
            expect(result.declarationTypes.has("x")).toBe(true);
            expect(result.declarationTypes.get("x")).toMatchObject({
                type: "Const",
                name: "Int",
            });
        });

        it("accepts let with matching String annotation", () => {
            const result = typecheckSource('let s: String = "hello";');
            expect(result.declarationTypes.has("s")).toBe(true);
            expect(result.declarationTypes.get("s")).toMatchObject({
                type: "Const",
                name: "String",
            });
        });

        it("accepts let with matching Bool annotation", () => {
            const result = typecheckSource("let b: Bool = true;");
            expect(result.declarationTypes.has("b")).toBe(true);
            expect(result.declarationTypes.get("b")).toMatchObject({
                type: "Const",
                name: "Bool",
            });
        });

        it("accepts let rec with matching function annotation", () => {
            const result = typecheckSource("let rec f: (Int) -> Int = (n) => n;");
            expect(result.declarationTypes.has("f")).toBe(true);
        });

        it("accepts mutable let with matching Ref<Int> annotation", () => {
            const result = typecheckSource("let mut x: Ref<Int> = ref(0);");
            expect(result.declarationTypes.has("x")).toBe(true);
        });
    });

    describe("mismatched annotations", () => {
        it("rejects Int annotation with String value", () => {
            expectDiagnostic(() => typecheckSource('let x: Int = "hello";'), "VF4020");
        });

        it("rejects String annotation with Int value", () => {
            expectDiagnostic(() => typecheckSource("let s: String = 42;"), "VF4020");
        });

        it("rejects Bool annotation with Int value", () => {
            expectDiagnostic(() => typecheckSource("let b: Bool = 42;"), "VF4020");
        });

        it("rejects let rec with mismatched return type annotation", () => {
            // f is annotated as (Int) -> String but returns Int (n)
            expectDiagnostic(() => typecheckSource("let rec f: (Int) -> String = (n) => n;"), "VF4020");
        });

        it("rejects mutable let when Ref element type mismatches annotation", () => {
            expectDiagnostic(() => typecheckSource('let mut x: Ref<Int> = ref("hello");'), "VF4020");
        });
    });

    describe("let expressions in blocks", () => {
        it("accepts matching annotation in let expression", () => {
            const result = typecheckSource("let result = { let x: Int = 42; x; };");
            expect(result.declarationTypes.has("result")).toBe(true);
            expect(result.declarationTypes.get("result")).toMatchObject({
                type: "Const",
                name: "Int",
            });
        });

        it("rejects mismatched annotation in let expression", () => {
            expectDiagnostic(() => typecheckSource('let result = { let x: Int = "hello"; x; };'), "VF4020");
        });
    });
});
