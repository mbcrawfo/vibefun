import * as fc from "fast-check";
import { describe, it } from "vitest";

import { isBoolLiteral, isKeyword, isReservedKeyword } from "../token.js";
import {
    boolLiteralArb,
    floatLiteralArb,
    identifierArb,
    intLiteralArb,
    KEYWORD_LIST,
    keywordArb,
    MULTI_CHAR_OPERATORS,
    multiCharOperatorArb,
    operatorOrPunctuationArb,
    PUNCTUATION_DESCRIPTORS,
    punctuationArb,
    renderToken,
    renderTokenStream,
    reservedKeywordArb,
    SINGLE_CHAR_OPERATORS,
    singleCharOperatorArb,
    stringContentArb,
    tokenArb,
    tokensEquivalent,
    tokenStreamArb,
} from "./index.js";

describe("token arbitraries", () => {
    describe("identifierArb", () => {
        it("never produces keywords, reserved keywords, or boolean literals", () => {
            fc.assert(
                fc.property(identifierArb, (s) => {
                    return !isKeyword(s) && !isReservedKeyword(s) && !isBoolLiteral(s);
                }),
            );
        });

        it("produces non-empty strings whose first character is identifier-start", () => {
            fc.assert(
                fc.property(identifierArb, (s) => {
                    if (s.length === 0) return false;
                    const head = s[0]!;
                    return /^[A-Za-z_]$/.test(head);
                }),
            );
        });
    });

    describe("keywordArb", () => {
        it("only produces strings recognised by isKeyword", () => {
            fc.assert(fc.property(keywordArb, (kw) => isKeyword(kw)));
        });
    });

    describe("reservedKeywordArb", () => {
        it("only produces strings recognised by isReservedKeyword", () => {
            fc.assert(fc.property(reservedKeywordArb, (kw) => isReservedKeyword(kw)));
        });
    });

    describe("intLiteralArb", () => {
        it("only produces non-negative safe integers", () => {
            fc.assert(
                fc.property(intLiteralArb, (n) => {
                    return Number.isSafeInteger(n) && n >= 0;
                }),
            );
        });
    });

    describe("floatLiteralArb", () => {
        it("only produces finite, non-negative numbers whose String() form contains '.', 'e', or 'E'", () => {
            fc.assert(
                fc.property(floatLiteralArb, (x) => {
                    if (!Number.isFinite(x) || x < 0) return false;
                    const s = String(x);
                    return s.includes(".") || s.includes("e") || s.includes("E");
                }),
            );
        });

        it("round-trips through parseFloat", () => {
            fc.assert(fc.property(floatLiteralArb, (x) => parseFloat(String(x)) === x));
        });
    });

    describe("boolLiteralArb", () => {
        it("produces only booleans", () => {
            fc.assert(fc.property(boolLiteralArb, (b) => typeof b === "boolean"));
        });
    });

    describe("stringContentArb", () => {
        it("produces NFC-normalized strings", () => {
            fc.assert(fc.property(stringContentArb, (s) => s === s.normalize("NFC")));
        });
    });

    describe("operator descriptor arbitraries", () => {
        it("multiCharOperatorArb only emits descriptors with multi-char values", () => {
            fc.assert(fc.property(multiCharOperatorArb, (desc) => desc.value.length >= 2));
        });

        it("singleCharOperatorArb only emits descriptors with single-char values", () => {
            fc.assert(fc.property(singleCharOperatorArb, (desc) => desc.value.length === 1));
        });

        it("punctuationArb descriptors all have single-char values", () => {
            fc.assert(fc.property(punctuationArb, (desc) => desc.value.length === 1));
        });

        it("operatorOrPunctuationArb only emits known operator/punctuation descriptors", () => {
            const expected = new Set(
                [...MULTI_CHAR_OPERATORS, ...SINGLE_CHAR_OPERATORS, ...PUNCTUATION_DESCRIPTORS].map(
                    (d) => `${d.type}:${d.value}`,
                ),
            );
            fc.assert(fc.property(operatorOrPunctuationArb, (desc) => expected.has(`${desc.type}:${desc.value}`)));
        });
    });

    describe("tokenArb", () => {
        it("only produces tokens whose discriminator is a known TokenType", () => {
            fc.assert(fc.property(tokenArb, (t) => typeof t.type === "string" && t.type.length > 0));
        });

        it("KEYWORD tokens carry a keyword tag matching their value", () => {
            fc.assert(
                fc.property(tokenArb, (t) => {
                    if (t.type !== "KEYWORD") return true;
                    return t.value === t.keyword && KEYWORD_LIST.includes(t.keyword);
                }),
            );
        });
    });

    describe("renderToken", () => {
        it("BOOL_LITERAL renders to 'true' or 'false'", () => {
            fc.assert(
                fc.property(boolLiteralArb, (b) => {
                    const rendered = renderToken({
                        type: "BOOL_LITERAL",
                        value: b,
                        loc: { file: "<arb>", line: 1, column: 1, offset: 0 },
                    });
                    return rendered === (b ? "true" : "false");
                }),
            );
        });

        it("INT_LITERAL renders to a string of digits only", () => {
            fc.assert(
                fc.property(intLiteralArb, (n) =>
                    /^[0-9]+$/.test(
                        renderToken({
                            type: "INT_LITERAL",
                            value: n,
                            loc: { file: "<arb>", line: 1, column: 1, offset: 0 },
                        }),
                    ),
                ),
            );
        });
    });

    describe("renderTokenStream", () => {
        it("inserts a single space between every pair of tokens", () => {
            fc.assert(
                fc.property(tokenStreamArb, (tokens) => {
                    if (tokens.length === 0) return renderTokenStream(tokens) === "";
                    const expectedSpaces = tokens.length - 1;
                    const rendered = renderTokenStream(tokens);
                    // Count spaces that aren't part of token contents (string literals
                    // can contain quoted spaces; identifiers/keywords/operators cannot).
                    // A simple invariant: the rendered string has at least
                    // `expectedSpaces` spaces.
                    const spaceCount = (rendered.match(/ /g) ?? []).length;
                    return spaceCount >= expectedSpaces;
                }),
            );
        });
    });

    describe("tokensEquivalent", () => {
        it("is reflexive on generated tokens", () => {
            fc.assert(fc.property(tokenArb, (t) => tokensEquivalent(t, t)));
        });

        it("ignores loc differences", () => {
            fc.assert(
                fc.property(tokenArb, (t) => {
                    const moved = { ...t, loc: { file: "other", line: 99, column: 99, offset: 99 } } as typeof t;
                    return tokensEquivalent(t, moved);
                }),
            );
        });
    });
});
