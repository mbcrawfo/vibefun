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
        it("only produces tokens whose discriminator is one of the generated token kinds", () => {
            const expectedTypes = new Set<string>([
                "INT_LITERAL",
                "FLOAT_LITERAL",
                "STRING_LITERAL",
                "BOOL_LITERAL",
                "IDENTIFIER",
                "KEYWORD",
                ...MULTI_CHAR_OPERATORS.map((d) => d.type),
                ...SINGLE_CHAR_OPERATORS.map((d) => d.type),
                ...PUNCTUATION_DESCRIPTORS.map((d) => d.type),
            ]);
            fc.assert(fc.property(tokenArb, (t) => expectedTypes.has(t.type)));
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
        const loc = { file: "<arb>", line: 1, column: 1, offset: 0 };

        it("BOOL_LITERAL renders to 'true' or 'false'", () => {
            fc.assert(
                fc.property(boolLiteralArb, (b) => {
                    const rendered = renderToken({ type: "BOOL_LITERAL", value: b, loc });
                    return rendered === (b ? "true" : "false");
                }),
            );
        });

        it("INT_LITERAL renders to a string of digits only", () => {
            fc.assert(
                fc.property(intLiteralArb, (n) => /^[0-9]+$/.test(renderToken({ type: "INT_LITERAL", value: n, loc }))),
            );
        });

        it("STRING_LITERAL renders to JSON text that round-trips its content", () => {
            fc.assert(
                fc.property(stringContentArb, (s) => {
                    const rendered = renderToken({ type: "STRING_LITERAL", value: s, loc });
                    return JSON.parse(rendered) === s;
                }),
            );
        });

        it("KEYWORD/EOF/NEWLINE branches render deterministically", () => {
            fc.assert(
                fc.property(keywordArb, (kw) => {
                    const keywordOk = renderToken({ type: "KEYWORD", value: kw, keyword: kw, loc }) === kw;
                    const eofOk = renderToken({ type: "EOF", value: "", loc }) === "";
                    const newlineOk = renderToken({ type: "NEWLINE", value: "\n", loc }) === "\n";
                    return keywordOk && eofOk && newlineOk;
                }),
            );
        });
    });

    describe("renderTokenStream", () => {
        it("inserts exactly one separator space between adjacent space-free tokens", () => {
            const spaceFreeTokenArb = tokenArb.filter((t) => !renderToken(t).includes(" "));
            fc.assert(
                fc.property(fc.array(spaceFreeTokenArb, { maxLength: 8 }), (tokens) => {
                    if (tokens.length === 0) return renderTokenStream(tokens) === "";
                    const expectedSpaces = tokens.length - 1;
                    const rendered = renderTokenStream(tokens);
                    const spaceCount = (rendered.match(/ /g) ?? []).length;
                    return spaceCount === expectedSpaces && !rendered.includes("  ");
                }),
            );
        });
    });

    describe("tokensEquivalent", () => {
        const loc = { file: "<arb>", line: 1, column: 1, offset: 0 };

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

        it("returns false on type mismatch", () => {
            fc.assert(
                fc.property(intLiteralArb, identifierArb, (n, name) => {
                    const a = { type: "INT_LITERAL", value: n, loc } as const;
                    const b = { type: "IDENTIFIER", value: name, loc } as const;
                    return !tokensEquivalent(a, b) && !tokensEquivalent(b, a);
                }),
            );
        });

        it("returns false when KEYWORD value or keyword tag differ", () => {
            fc.assert(
                fc.property(keywordArb, keywordArb, (a, b) => {
                    if (a === b) return true;
                    const ka = { type: "KEYWORD", value: a, keyword: a, loc } as const;
                    const kb = { type: "KEYWORD", value: b, keyword: b, loc } as const;
                    return !tokensEquivalent(ka, kb);
                }),
            );
        });

        it("returns false when value differs for same-kind tokens", () => {
            fc.assert(
                fc.property(intLiteralArb, intLiteralArb, (a, b) => {
                    if (a === b) return true;
                    const ta = { type: "INT_LITERAL", value: a, loc } as const;
                    const tb = { type: "INT_LITERAL", value: b, loc } as const;
                    return !tokensEquivalent(ta, tb);
                }),
            );
        });
    });
});
