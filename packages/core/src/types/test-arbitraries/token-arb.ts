/**
 * fast-check arbitraries for the lexer token type and helpers for round-tripping
 * tokens through `lex(render(token))`.
 *
 * The lexer never emits a negative numeric literal — `-` is a separate
 * `OP_MINUS` token. So `intLiteralArb` and `floatLiteralArb` only generate
 * non-negative values. Identifiers exclude every keyword, reserved keyword,
 * and boolean literal so a generated `IDENTIFIER` round-trips as `IDENTIFIER`
 * (not `KEYWORD` or `BOOL_LITERAL`).
 */

import type { Keyword, Token } from "../token.js";

import * as fc from "fast-check";

import { KEYWORDS, RESERVED_KEYWORDS } from "../token.js";

const SYNTHETIC_LOCATION = { file: "<arb>", line: 1, column: 1, offset: 0 } as const;

/** All keyword strings as a frozen array for arbitrary selection. */
export const KEYWORD_LIST: readonly Keyword[] = Object.freeze([...KEYWORDS]);

/** All reserved-keyword strings as a frozen array for arbitrary selection. */
export const RESERVED_KEYWORD_LIST: readonly string[] = Object.freeze([...RESERVED_KEYWORDS]);

/** Set of strings that an `IDENTIFIER`-shaped string must not match. */
const IDENTIFIER_EXCLUSIONS: ReadonlySet<string> = new Set<string>([
    ...KEYWORDS,
    ...RESERVED_KEYWORDS,
    "true",
    "false",
]);

/** ASCII characters valid as identifier-start (matches lexer rule for ASCII). */
const IDENTIFIER_START_CHARS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_";
/** ASCII characters valid as identifier-continue. */
const IDENTIFIER_CONT_CHARS = `${IDENTIFIER_START_CHARS}0123456789`;

/**
 * Arbitrary for ASCII identifier strings that are guaranteed to lex as `IDENTIFIER`
 * (not a keyword, reserved keyword, or boolean literal).
 *
 * Restricted to ASCII so the round-trip is independent of Unicode normalization;
 * Unicode identifier coverage lives in the lexer's
 * `unicode-normalization.test.ts` directly via `stringContentArb`.
 */
export const identifierArb: fc.Arbitrary<string> = fc
    .tuple(
        fc.constantFrom(...IDENTIFIER_START_CHARS.split("")),
        fc.stringMatching(new RegExp(`^[${IDENTIFIER_CONT_CHARS}]*$`), { maxLength: 12 }),
    )
    .map(([head, tail]) => head + tail)
    .filter((s) => !IDENTIFIER_EXCLUSIONS.has(s));

/** Arbitrary for keyword strings (one of the active language keywords). */
export const keywordArb: fc.Arbitrary<Keyword> = fc.constantFrom(...KEYWORD_LIST);

/** Arbitrary for reserved-keyword strings (always rejected by the lexer). */
export const reservedKeywordArb: fc.Arbitrary<string> = fc.constantFrom(...RESERVED_KEYWORD_LIST);

/** Arbitrary for boolean literal source ("true" | "false"). */
export const boolLiteralArb: fc.Arbitrary<boolean> = fc.boolean();

/**
 * Non-negative safe integer. Negatives are emitted as `OP_MINUS` followed by
 * the literal, so the literal itself is always >= 0.
 */
export const intLiteralArb: fc.Arbitrary<number> = fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER });

/**
 * Finite, non-negative double whose `String(value)` round-trips through
 * `parseFloat` and contains a `.` or exponent so the lexer routes it to
 * `FLOAT_LITERAL` (not `INT_LITERAL`).
 */
export const floatLiteralArb: fc.Arbitrary<number> = fc
    .double({ noNaN: true, noDefaultInfinity: true, min: 0 })
    .filter((x) => {
        if (!Number.isFinite(x)) return false;
        const s = String(x);
        if (!(s.includes(".") || s.includes("e") || s.includes("E"))) return false;
        return parseFloat(s) === x;
    });

/**
 * String content for `STRING_LITERAL` tokens. Already NFC-normalized so the
 * lexer's normalization step is a no-op and round-trip equality holds. Astral
 * codepoints and escape-triggering characters are deliberately included; the
 * default `fc.string()` mixes ASCII and Unicode.
 */
export const stringContentArb: fc.Arbitrary<string> = fc.string({ maxLength: 32 }).map((s) => s.normalize("NFC"));

/**
 * Render a `STRING_LITERAL` value into source. `JSON.stringify` produces a
 * double-quoted form with `\uXXXX` for non-printables — every escape it emits
 * is accepted by the lexer's escape parser.
 */
export function renderStringLiteral(value: string): string {
    return JSON.stringify(value);
}

/**
 * Token kinds that operator/punctuation descriptors can identify. Narrower than
 * `Token["type"]` so the descriptor table cannot accidentally include `EOF`,
 * `NEWLINE`, literals, or identifiers.
 */
export type OperatorOrPunctuationTokenType =
    | "OP_PLUS"
    | "OP_MINUS"
    | "OP_STAR"
    | "OP_SLASH"
    | "OP_PERCENT"
    | "OP_EQ"
    | "OP_NEQ"
    | "OP_LT"
    | "OP_GT"
    | "OP_LTE"
    | "OP_GTE"
    | "OP_AND"
    | "OP_OR"
    | "OP_BANG"
    | "OP_AMPERSAND"
    | "OP_PIPE_GT"
    | "OP_GT_GT"
    | "OP_LT_LT"
    | "OP_EQUALS"
    | "OP_ASSIGN"
    | "OP_CONS"
    | "LPAREN"
    | "RPAREN"
    | "LBRACE"
    | "RBRACE"
    | "LBRACKET"
    | "RBRACKET"
    | "COMMA"
    | "DOT"
    | "SPREAD"
    | "COLON"
    | "SEMICOLON"
    | "ARROW"
    | "FAT_ARROW"
    | "PIPE";

/** Descriptor used to assemble operator/punctuation arbitraries. */
export interface OperatorDescriptor {
    readonly type: OperatorOrPunctuationTokenType;
    readonly value: string;
}

/** Multi-character operators as recognised by the lexer (longest-match group). */
export const MULTI_CHAR_OPERATORS: readonly OperatorDescriptor[] = Object.freeze([
    { type: "OP_EQ", value: "==" },
    { type: "OP_NEQ", value: "!=" },
    { type: "OP_LTE", value: "<=" },
    { type: "OP_GTE", value: ">=" },
    { type: "OP_PIPE_GT", value: "|>" },
    { type: "OP_GT_GT", value: ">>" },
    { type: "OP_LT_LT", value: "<<" },
    { type: "ARROW", value: "->" },
    { type: "FAT_ARROW", value: "=>" },
    { type: "OP_CONS", value: "::" },
    { type: "OP_ASSIGN", value: ":=" },
    { type: "OP_AND", value: "&&" },
    { type: "OP_OR", value: "||" },
    { type: "SPREAD", value: "..." },
]);

/** Single-character operators. */
export const SINGLE_CHAR_OPERATORS: readonly OperatorDescriptor[] = Object.freeze([
    { type: "OP_PLUS", value: "+" },
    { type: "OP_MINUS", value: "-" },
    { type: "OP_STAR", value: "*" },
    { type: "OP_SLASH", value: "/" },
    { type: "OP_PERCENT", value: "%" },
    { type: "OP_LT", value: "<" },
    { type: "OP_GT", value: ">" },
    { type: "OP_EQUALS", value: "=" },
    { type: "OP_BANG", value: "!" },
    { type: "OP_AMPERSAND", value: "&" },
]);

/** Punctuation tokens (single character except `...` is in operators). */
export const PUNCTUATION_DESCRIPTORS: readonly OperatorDescriptor[] = Object.freeze([
    { type: "LPAREN", value: "(" },
    { type: "RPAREN", value: ")" },
    { type: "LBRACE", value: "{" },
    { type: "RBRACE", value: "}" },
    { type: "LBRACKET", value: "[" },
    { type: "RBRACKET", value: "]" },
    { type: "COMMA", value: "," },
    { type: "DOT", value: "." },
    { type: "COLON", value: ":" },
    { type: "SEMICOLON", value: ";" },
    { type: "PIPE", value: "|" },
]);

/** All operator/punctuation descriptors — useful for round-trip enumeration. */
export const ALL_OPERATOR_DESCRIPTORS: readonly OperatorDescriptor[] = Object.freeze([
    ...MULTI_CHAR_OPERATORS,
    ...SINGLE_CHAR_OPERATORS,
    ...PUNCTUATION_DESCRIPTORS,
]);

/** Arbitrary picking a multi-char operator descriptor. */
export const multiCharOperatorArb: fc.Arbitrary<OperatorDescriptor> = fc.constantFrom(...MULTI_CHAR_OPERATORS);

/** Arbitrary picking a single-char operator descriptor. */
export const singleCharOperatorArb: fc.Arbitrary<OperatorDescriptor> = fc.constantFrom(...SINGLE_CHAR_OPERATORS);

/** Arbitrary picking a punctuation descriptor. */
export const punctuationArb: fc.Arbitrary<OperatorDescriptor> = fc.constantFrom(...PUNCTUATION_DESCRIPTORS);

/** Arbitrary picking any operator or punctuation descriptor. */
export const operatorOrPunctuationArb: fc.Arbitrary<OperatorDescriptor> = fc.constantFrom(...ALL_OPERATOR_DESCRIPTORS);

/**
 * Generate a single non-EOF, non-NEWLINE token. The `loc` is a synthetic
 * sentinel — round-trip tests must compare ignoring `loc` since the actual
 * location depends on rendered position.
 */
export const tokenArb: fc.Arbitrary<Token> = fc.oneof(
    intLiteralArb.map((value) => ({ type: "INT_LITERAL", value, loc: SYNTHETIC_LOCATION }) as Token),
    floatLiteralArb.map((value) => ({ type: "FLOAT_LITERAL", value, loc: SYNTHETIC_LOCATION }) as Token),
    stringContentArb.map((value) => ({ type: "STRING_LITERAL", value, loc: SYNTHETIC_LOCATION }) as Token),
    boolLiteralArb.map((value) => ({ type: "BOOL_LITERAL", value, loc: SYNTHETIC_LOCATION }) as Token),
    identifierArb.map((value) => ({ type: "IDENTIFIER", value, loc: SYNTHETIC_LOCATION }) as Token),
    keywordArb.map((kw) => ({ type: "KEYWORD", value: kw, keyword: kw, loc: SYNTHETIC_LOCATION }) as Token),
    operatorOrPunctuationArb.map((desc) => ({ type: desc.type, value: desc.value, loc: SYNTHETIC_LOCATION }) as Token),
);

/**
 * Render a single token back to source text. The result is the smallest
 * source string that, when fed to the lexer, produces the same token kind
 * and value as the input.
 *
 * `EOF` and `NEWLINE` are not handled here — `EOF` has no source form and
 * `NEWLINE` is rendered as `"\n"` only when assembled by `renderTokenStream`.
 */
export function renderToken(token: Token): string {
    switch (token.type) {
        case "INT_LITERAL":
            return String(token.value);
        case "FLOAT_LITERAL":
            return String(token.value);
        case "STRING_LITERAL":
            return renderStringLiteral(token.value);
        case "BOOL_LITERAL":
            return token.value ? "true" : "false";
        case "IDENTIFIER":
            return token.value;
        case "KEYWORD":
            return token.keyword;
        case "EOF":
            return "";
        case "NEWLINE":
            return "\n";
        default:
            return token.value;
    }
}

/**
 * Render a sequence of tokens, separating each with a single space. The
 * separator is mandatory because adjacent tokens can otherwise be merged by
 * the lexer's maximal-munch rule (e.g. `<` + `=` would become `<=`).
 */
export function renderTokenStream(tokens: readonly Token[]): string {
    return tokens.map(renderToken).join(" ");
}

/**
 * Arbitrary for a list of non-EOF tokens (NEWLINE excluded for stream
 * round-tripping; comments and whitespace are added at render time).
 */
export const tokenStreamArb: fc.Arbitrary<readonly Token[]> = fc.array(tokenArb, { maxLength: 8 });

/**
 * Compare two tokens for round-trip equivalence: same kind, same value,
 * and (for keywords) same keyword tag. Locations and `hasLeadingWhitespace`
 * are intentionally ignored because they depend on rendered position.
 */
export function tokensEquivalent(a: Token, b: Token): boolean {
    if (a.type !== b.type) return false;
    if (a.type === "KEYWORD" && b.type === "KEYWORD") {
        return a.value === b.value && a.keyword === b.keyword;
    }
    return a.value === b.value;
}
