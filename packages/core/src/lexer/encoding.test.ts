/**
 * Tests for source encoding handling in the lexer.
 *
 * Spec ref: docs/spec/02-lexical-structure/basic-structure.md:5-9
 * Source files use UTF-8 encoding. The spec is currently silent on
 * byte-order-mark (BOM) handling. This test pins the lexer's current
 * behaviour: a U+FEFF code unit at the start of source is rejected as
 * an unexpected character (VF1400). If the spec is later amended to
 * either consume or preserve the BOM, this test should be updated to
 * match.
 */

import { describe, expect, it } from "vitest";

import { expectDiagnostic } from "../diagnostics/index.js";
import { Lexer } from "./lexer.js";

describe("Lexer - source encoding", () => {
    it("rejects UTF-8 BOM at start of file with VF1400", () => {
        // F-01 (testing-gap chunk 05): BOM-prefixed source is treated as
        // an unexpected character, not silently consumed. Spec is silent
        // on BOM-handling — this test documents the as-implemented
        // behaviour rather than ratifying it as the desired contract.
        const bom = "﻿";
        const lexer = new Lexer(`${bom}let x = 1`, "test.vf");

        const diag = expectDiagnostic(() => lexer.tokenize(), "VF1400");
        expect(diag.location).toMatchObject({ line: 1, column: 1 });
    });

    it("tokenises the same source identically when the BOM is absent", () => {
        // Regression sentinel: should the lexer ever start consuming the
        // BOM, the BOM-prefixed input above must produce the same token
        // stream as this BOM-free input. Pin both ends of the equality
        // here so a future fix does not regress one without the other.
        const lexer = new Lexer("let x = 1", "test.vf");
        const tokens = lexer.tokenize().map((t) => ({ type: t.type, value: t.value }));

        expect(tokens).toEqual([
            { type: "KEYWORD", value: "let" },
            { type: "IDENTIFIER", value: "x" },
            { type: "OP_EQUALS", value: "=" },
            { type: "INT_LITERAL", value: 1 },
            { type: "EOF", value: "" },
        ]);
    });
});
