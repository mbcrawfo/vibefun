/**
 * Token type definitions for the Vibefun lexer
 */

import type { Location } from "./ast.js";

/**
 * Keywords in the Vibefun language
 */
export type Keyword =
    | "let"
    | "mut"
    | "type"
    | "if"
    | "then"
    | "else"
    | "match"
    | "when"
    | "rec"
    | "and"
    | "import"
    | "export"
    | "external"
    | "unsafe"
    | "while"
    | "from"
    | "as"
    | "ref"
    | "try"
    | "catch";

/**
 * Token types - discriminated union for type safety
 */
export type Token =
    // Literals
    | { type: "INT_LITERAL"; value: number; loc: Location }
    | { type: "FLOAT_LITERAL"; value: number; loc: Location }
    | { type: "STRING_LITERAL"; value: string; loc: Location }
    | { type: "BOOL_LITERAL"; value: boolean; loc: Location }

    // Identifiers and Keywords
    | { type: "IDENTIFIER"; value: string; loc: Location }
    | { type: "KEYWORD"; value: string; keyword: Keyword; loc: Location }

    // Operators - Arithmetic
    | { type: "OP_PLUS"; value: string; loc: Location }
    | { type: "OP_MINUS"; value: string; loc: Location }
    | { type: "OP_STAR"; value: string; loc: Location }
    | { type: "OP_SLASH"; value: string; loc: Location }
    | { type: "OP_PERCENT"; value: string; loc: Location }

    // Operators - Comparison
    | { type: "OP_EQ"; value: string; loc: Location }
    | { type: "OP_NEQ"; value: string; loc: Location }
    | { type: "OP_LT"; value: string; loc: Location }
    | { type: "OP_GT"; value: string; loc: Location }
    | { type: "OP_LTE"; value: string; loc: Location }
    | { type: "OP_GTE"; value: string; loc: Location }

    // Operators - Logical
    | { type: "OP_AND"; value: string; loc: Location }
    | { type: "OP_OR"; value: string; loc: Location }
    | { type: "OP_BANG"; value: string; loc: Location }

    // Operators - String
    | { type: "OP_AMPERSAND"; value: string; loc: Location }

    // Operators - Pipe and Composition
    | { type: "OP_PIPE_GT"; value: string; loc: Location }
    | { type: "OP_GT_GT"; value: string; loc: Location }
    | { type: "OP_LT_LT"; value: string; loc: Location }

    // Assignment and Special Operators
    | { type: "OP_EQUALS"; value: string; loc: Location }
    | { type: "OP_ASSIGN"; value: string; loc: Location }
    | { type: "OP_CONS"; value: string; loc: Location }

    // Punctuation
    | { type: "LPAREN"; value: string; loc: Location }
    | { type: "RPAREN"; value: string; loc: Location }
    | { type: "LBRACE"; value: string; loc: Location }
    | { type: "RBRACE"; value: string; loc: Location }
    | { type: "LBRACKET"; value: string; loc: Location }
    | { type: "RBRACKET"; value: string; loc: Location }
    | { type: "COMMA"; value: string; loc: Location }
    | { type: "DOT"; value: string; loc: Location }
    | { type: "SPREAD"; value: string; loc: Location }
    | { type: "COLON"; value: string; loc: Location }
    | { type: "SEMICOLON"; value: string; loc: Location }
    | { type: "ARROW"; value: string; loc: Location }
    | { type: "FAT_ARROW"; value: string; loc: Location }
    | { type: "PIPE"; value: string; loc: Location }

    // Special
    | { type: "EOF"; value: string; loc: Location }
    | { type: "NEWLINE"; value: string; loc: Location };

/**
 * Token type enum for easier type checking
 */
export type TokenType = Token["type"];

/**
 * Keyword set for O(1) lookup
 */
export const KEYWORDS: ReadonlySet<Keyword> = new Set([
    "let",
    "mut",
    "type",
    "if",
    "then",
    "else",
    "match",
    "when",
    "rec",
    "and",
    "import",
    "export",
    "external",
    "unsafe",
    "while",
    "from",
    "as",
    "ref",
    "try",
    "catch",
]);

/**
 * Check if a string is a keyword
 */
export function isKeyword(str: string): str is Keyword {
    return KEYWORDS.has(str as Keyword);
}

/**
 * Reserved boolean literals
 */
export const BOOL_LITERALS: ReadonlySet<string> = new Set(["true", "false"]);

/**
 * Check if a string is a boolean literal
 */
export function isBoolLiteral(str: string): boolean {
    return BOOL_LITERALS.has(str);
}

/**
 * Reserved keywords for future language features
 */
export const RESERVED_KEYWORDS: ReadonlySet<string> = new Set([
    "async",
    "await",
    "trait",
    "impl",
    "where",
    "do",
    "yield",
    "return",
]);

/**
 * Check if a string is a reserved keyword
 */
export function isReservedKeyword(str: string): boolean {
    return RESERVED_KEYWORDS.has(str);
}
