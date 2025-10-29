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
    | "import"
    | "export"
    | "external"
    | "unsafe"
    | "from"
    | "as"
    | "ref";

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
    | { type: "PLUS"; value: string; loc: Location }
    | { type: "MINUS"; value: string; loc: Location }
    | { type: "STAR"; value: string; loc: Location }
    | { type: "SLASH"; value: string; loc: Location }
    | { type: "PERCENT"; value: string; loc: Location }

    // Operators - Comparison
    | { type: "EQ_EQ"; value: string; loc: Location }
    | { type: "BANG_EQ"; value: string; loc: Location }
    | { type: "LT"; value: string; loc: Location }
    | { type: "GT"; value: string; loc: Location }
    | { type: "LT_EQ"; value: string; loc: Location }
    | { type: "GT_EQ"; value: string; loc: Location }

    // Operators - Logical
    | { type: "AMP_AMP"; value: string; loc: Location }
    | { type: "PIPE_PIPE"; value: string; loc: Location }
    | { type: "BANG"; value: string; loc: Location }

    // Operators - String
    | { type: "AMP"; value: string; loc: Location }

    // Operators - Pipe and Composition
    | { type: "PIPE_GT"; value: string; loc: Location }
    | { type: "GT_GT"; value: string; loc: Location }
    | { type: "LT_LT"; value: string; loc: Location }

    // Assignment and Special Operators
    | { type: "EQ"; value: string; loc: Location }
    | { type: "COLON_EQ"; value: string; loc: Location }
    | { type: "COLON_COLON"; value: string; loc: Location }

    // Punctuation
    | { type: "LPAREN"; value: string; loc: Location }
    | { type: "RPAREN"; value: string; loc: Location }
    | { type: "LBRACE"; value: string; loc: Location }
    | { type: "RBRACE"; value: string; loc: Location }
    | { type: "LBRACKET"; value: string; loc: Location }
    | { type: "RBRACKET"; value: string; loc: Location }
    | { type: "COMMA"; value: string; loc: Location }
    | { type: "DOT"; value: string; loc: Location }
    | { type: "DOT_DOT_DOT"; value: string; loc: Location }
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
    "import",
    "export",
    "external",
    "unsafe",
    "from",
    "as",
    "ref",
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
