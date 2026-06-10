/**
 * Integration tests for unannotated destructuring lambda parameters.
 *
 * [BUG: VF-FC-0004] `({ x, y }) => body` desugars to a lambda whose body
 * matches the parameter against a record pattern. When the parameter has no
 * annotation, the record pattern pins the fresh scrutinee variable to the
 * CLOSED record type implied by the pattern's fields (records have no row
 * polymorphism). Full lex → parse → desugar → typeCheck pipeline.
 */

import { describe, expect, it } from "vitest";

import { desugarModule } from "../desugarer/index.js";
import { VibefunDiagnostic } from "../diagnostics/index.js";
import { Lexer } from "../lexer/index.js";
import { Parser } from "../parser/index.js";
import { typeCheck } from "./typechecker.js";
import { typeToString } from "./types.js";

function check(source: string): ReturnType<typeof typeCheck> {
    const lexer = new Lexer(source, "test.vf");
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens, "test.vf");
    return typeCheck(desugarModule(parser.parse()));
}

describe("lambda destructuring parameter inference", () => {
    it("infers a record-pattern parameter without an annotation", () => {
        const typed = check(`let f = ({ x, y }) => x + y;
let result = f({ x: 1, y: 2 });`);
        expect(typed.declarationTypes.get("result")).toEqual({ type: "Const", name: "Int" });
    });

    it("infers the closed record parameter type from the pattern fields", () => {
        const typed = check(`let f = ({ x, y }) => x + y;`);
        const fType = typed.declarationTypes.get("f");
        expect(fType).toBeDefined();
        expect(typeToString(fType!)).toBe("{ x: Int, y: Int } -> Int");
    });

    it("infers nested record destructuring", () => {
        const typed = check(`let f = ({ inner: { a } }) => a + 1;
let result = f({ inner: { a: 41 } });`);
        expect(typed.declarationTypes.get("result")).toEqual({ type: "Const", name: "Int" });
    });

    it("the inferred record type is closed: missing fields are rejected", () => {
        try {
            check(`let f = ({ x, y }) => x + y;
let result = f({ x: 1 });`);
            expect.fail("Expected a diagnostic for the missing field");
        } catch (error: unknown) {
            expect(error).toBeInstanceOf(VibefunDiagnostic);
        }
    });

    it("field uses at incompatible concrete types are rejected", () => {
        try {
            check(`let f = ({ x }) => x + 1;
let result = f({ x: "oops" });`);
            expect.fail("Expected a type mismatch diagnostic");
        } catch (error: unknown) {
            expect(error).toBeInstanceOf(VibefunDiagnostic);
        }
    });

    it("an annotated destructuring parameter still works", () => {
        const typed = check(`let f = ({ x, y }: { x: Int, y: Int }) => x + y;
let result = f({ x: 1, y: 2 });`);
        expect(typed.declarationTypes.get("result")).toEqual({ type: "Const", name: "Int" });
    });
});
