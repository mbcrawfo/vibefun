/**
 * Source-level arbitraries for parser property tests.
 *
 * These generate raw source-string fragments (identifiers, literal text,
 * type names) that the lexer/parser will accept. Use these when the property
 * is about parsing arbitrary source — e.g. determinism, location coverage,
 * or "parser does not throw" — rather than starting from an AST.
 */

import * as fc from "fast-check";

import { KEYWORDS, RESERVED_KEYWORDS } from "../token.js";

const SYNTH_LOC = { file: "<arb>", line: 1, column: 1, offset: 0 } as const;

/**
 * Synthetic location used when constructing AST nodes from generators. Tests
 * comparing AST shapes should ignore `loc`; this constant exists so generated
 * nodes remain structurally complete (every node has a `loc` field per the
 * Location-coverage invariant).
 */
export const SYNTHETIC_LOCATION = SYNTH_LOC;

const RESERVED: ReadonlySet<string> = new Set<string>([...KEYWORDS, ...RESERVED_KEYWORDS, "true", "false"]);

/**
 * Generate a lowercase ASCII identifier (suitable for value names and type
 * variables). Excludes keywords, reserved keywords, and boolean literals.
 */
export const lowerIdentifierArb: fc.Arbitrary<string> = fc
    .stringMatching(/^[a-z][a-z0-9_]{0,7}$/)
    .filter((s) => !RESERVED.has(s));

/**
 * Generate an uppercase ASCII identifier (suitable for type constants and
 * variant constructors). PascalCase short identifiers.
 */
export const upperIdentifierArb: fc.Arbitrary<string> = fc.stringMatching(/^[A-Z][a-zA-Z0-9_]{0,7}$/);

/**
 * Safe string-literal *content* (no quotes, no backslashes, no control
 * characters). Use as the inner value of a `StringLit` AST node, or wrap in
 * double quotes for source rendering.
 */
export const safeStringContentArb: fc.Arbitrary<string> = fc.stringMatching(/^[ -!#-[\]-~]{0,16}$/);

/**
 * Render a string value as a vibefun string literal. Escapes the four
 * sequences the lexer recognizes as escapes; everything else passes through.
 * Pair with `safeStringContentArb` for round-trip-safe values.
 */
export function renderStringLit(value: string): string {
    let out = '"';
    for (const ch of value) {
        if (ch === "\\") out += "\\\\";
        else if (ch === '"') out += '\\"';
        else if (ch === "\n") out += "\\n";
        else if (ch === "\t") out += "\\t";
        else out += ch;
    }
    out += '"';
    return out;
}

/**
 * A non-negative safe integer (avoids `Number.MIN_SAFE_INTEGER`/negative
 * literal corner cases — generate `UnaryOp Negate` explicitly when negation
 * is needed so the AST round-trip matches the parser's output).
 */
export const nonNegativeIntArb: fc.Arbitrary<number> = fc.integer({ min: 0, max: 1_000_000_000 });

/**
 * A finite, non-negative float in a safe range. Excludes NaN/Infinity which
 * have no source representation, and excludes values that would round-trip
 * through the lexer with surprising decimal expansion.
 */
export const nonNegativeFloatArb: fc.Arbitrary<number> = fc
    .double({ min: 0, max: 1_000_000, noNaN: true, noDefaultInfinity: true })
    .filter((n) => Number.isFinite(n));
