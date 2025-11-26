/**
 * Lexer diagnostic codes (VF1xxx)
 *
 * Error codes for the lexical analysis phase.
 *
 * Subcategory allocation:
 * - VF1000-VF1099: String literal errors
 * - VF1100-VF1199: Number literal errors
 * - VF1200-VF1299: Escape sequence errors (reserved)
 * - VF1300-VF1399: Comment errors
 * - VF1400-VF1499: Operators/symbols errors
 * - VF1500-VF1599: Identifiers/keywords (reserved)
 * - VF1900-VF1999: Lexer warnings (reserved)
 */

import type { DiagnosticDefinition } from "../diagnostic.js";

import { registry } from "../registry.js";

// =============================================================================
// VF1000-VF1099: String Literal Errors
// =============================================================================

export const VF1001: DiagnosticDefinition = {
    code: "VF1001",
    title: "UnterminatedString",
    messageTemplate: "Unterminated string: newline in single-line string",
    severity: "error",
    phase: "lexer",
    category: "string",
    hintTemplate: 'Use """ for multi-line strings or escape the newline with \\n',
    explanation:
        "Single-line strings (using single double-quotes) cannot contain literal newlines. " +
        'If you need a string that spans multiple lines, use triple-quoted strings ("""...""") ' +
        "or escape the newline character with \\n.",
    example: {
        bad: 'let msg = "Hello\nWorld"',
        good: 'let msg = "Hello\\nWorld"\n// or\nlet msg = """\nHello\nWorld\n"""',
        description: "Use escape sequence \\n or triple-quoted string for multi-line content",
    },
    relatedCodes: ["VF1002", "VF1003"],
    seeAlso: ["spec/02-syntax/literals.md"],
};

export const VF1002: DiagnosticDefinition = {
    code: "VF1002",
    title: "UnterminatedStringEOF",
    messageTemplate: 'Unterminated string: expected closing "',
    severity: "error",
    phase: "lexer",
    category: "string",
    hintTemplate: 'Add a closing " at the end of the string',
    explanation:
        "The string literal was not closed before the end of the file. " +
        "Every opening double-quote must have a matching closing double-quote.",
    example: {
        bad: 'let msg = "Hello world',
        good: 'let msg = "Hello world"',
        description: 'Added closing " at the end of the string',
    },
    relatedCodes: ["VF1001", "VF1003"],
};

export const VF1003: DiagnosticDefinition = {
    code: "VF1003",
    title: "UnterminatedMultilineString",
    messageTemplate: 'Unterminated multi-line string: expected closing """',
    severity: "error",
    phase: "lexer",
    category: "string",
    hintTemplate: 'Add closing """ at the end of the string',
    explanation:
        "The multi-line string literal was not closed before the end of the file. " +
        'Triple-quoted strings must end with """.',
    example: {
        bad: 'let msg = """\nHello\nWorld',
        good: 'let msg = """\nHello\nWorld\n"""',
        description: 'Added closing """ at the end of the multi-line string',
    },
    relatedCodes: ["VF1001", "VF1002"],
};

// =============================================================================
// VF1010-VF1019: Escape Sequence Errors
// =============================================================================

export const VF1010: DiagnosticDefinition = {
    code: "VF1010",
    title: "InvalidEscapeSequence",
    messageTemplate: "Invalid escape sequence: \\{char}",
    severity: "error",
    phase: "lexer",
    category: "string",
    hintTemplate: "Valid escapes: \\n, \\t, \\r, \\\", \\', \\\\, \\xHH, \\uXXXX, \\u{XXXXXX}",
    explanation:
        "The escape sequence is not recognized. Vibefun supports the following escape sequences: " +
        '\\n (newline), \\t (tab), \\r (carriage return), \\" (double quote), ' +
        "\\' (single quote), \\\\ (backslash), \\xHH (hex byte), " +
        "\\uXXXX (unicode), \\u{XXXXXX} (unicode code point).",
    example: {
        bad: 'let path = "C:\\Users\\name"',
        good: 'let path = "C:\\\\Users\\\\name"',
        description: "Escaped backslashes with \\\\",
    },
    relatedCodes: ["VF1011", "VF1012"],
};

export const VF1011: DiagnosticDefinition = {
    code: "VF1011",
    title: "InvalidHexEscape",
    messageTemplate: "Invalid \\xHH escape: expected 2 hex digits",
    severity: "error",
    phase: "lexer",
    category: "string",
    hintTemplate: "Use exactly 2 hex digits (0-9, a-f, A-F) after \\x",
    explanation:
        "The \\x escape sequence requires exactly 2 hexadecimal digits to specify a byte value. " +
        "Valid hex digits are 0-9, a-f, and A-F.",
    example: {
        bad: 'let char = "\\x4"',
        good: 'let char = "\\x41"  // ASCII "A"',
        description: "Used exactly 2 hex digits",
    },
    relatedCodes: ["VF1010", "VF1012"],
};

export const VF1012: DiagnosticDefinition = {
    code: "VF1012",
    title: "InvalidUnicodeEscape",
    messageTemplate: "Invalid unicode escape: {reason}",
    severity: "error",
    phase: "lexer",
    category: "string",
    hintTemplate: "Use \\uXXXX (4 hex digits) or \\u{XXXXXX} (1-6 hex digits, max 10FFFF)",
    explanation:
        "Unicode escapes must be either \\uXXXX with exactly 4 hex digits, or \\u{...} with 1-6 hex digits. " +
        "The code point must not exceed 0x10FFFF.",
    example: {
        bad: 'let emoji = "\\u{1F600"  // missing closing brace',
        good: 'let emoji = "\\u{1F600}"  // 😀',
        description: "Added closing brace to unicode escape",
    },
    relatedCodes: ["VF1010", "VF1011"],
};

// =============================================================================
// VF1100-VF1199: Number Literal Errors
// =============================================================================

export const VF1100: DiagnosticDefinition = {
    code: "VF1100",
    title: "InvalidNumberSeparator",
    messageTemplate: "Invalid number separator: underscore must be between digits",
    severity: "error",
    phase: "lexer",
    category: "number",
    hintTemplate: "Remove trailing underscore or add more digits",
    explanation:
        "Numeric separators (underscores) are allowed to improve readability, but they must appear " +
        "between digits. They cannot appear at the start, end, or adjacent to other separators.",
    example: {
        bad: "let n = 1_000_",
        good: "let n = 1_000",
        description: "Removed trailing underscore",
    },
    relatedCodes: ["VF1101", "VF1102", "VF1103"],
};

export const VF1101: DiagnosticDefinition = {
    code: "VF1101",
    title: "InvalidBinaryLiteral",
    messageTemplate: "Invalid binary literal: expected at least one binary digit after 0b",
    severity: "error",
    phase: "lexer",
    category: "number",
    hintTemplate: "Add binary digits (0 or 1) after 0b",
    explanation:
        "Binary literals start with 0b or 0B and must contain at least one binary digit (0 or 1). " +
        "Example: 0b1010 represents the decimal value 10.",
    example: {
        bad: "let flags = 0b",
        good: "let flags = 0b1010",
        description: "Added binary digits after the 0b prefix",
    },
    relatedCodes: ["VF1100", "VF1102"],
};

export const VF1102: DiagnosticDefinition = {
    code: "VF1102",
    title: "InvalidHexLiteral",
    messageTemplate: "Invalid hex literal: expected at least one hex digit after 0x",
    severity: "error",
    phase: "lexer",
    category: "number",
    hintTemplate: "Add hex digits (0-9, a-f, A-F) after 0x",
    explanation:
        "Hexadecimal literals start with 0x or 0X and must contain at least one hex digit. " +
        "Valid hex digits are 0-9, a-f, and A-F. Example: 0xFF represents the decimal value 255.",
    example: {
        bad: "let color = 0x",
        good: "let color = 0xFF00FF",
        description: "Added hex digits after the 0x prefix",
    },
    relatedCodes: ["VF1100", "VF1101"],
};

export const VF1103: DiagnosticDefinition = {
    code: "VF1103",
    title: "InvalidOctalLiteral",
    messageTemplate: "Invalid octal literal: expected at least one octal digit after 0o",
    severity: "error",
    phase: "lexer",
    category: "number",
    hintTemplate: "Add octal digits (0-7) after 0o",
    explanation:
        "Octal literals start with 0o or 0O and must contain at least one octal digit (0-7). " +
        "Example: 0o755 represents the decimal value 493.",
    example: {
        bad: "let perms = 0o",
        good: "let perms = 0o755",
        description: "Added octal digits after the 0o prefix",
    },
    relatedCodes: ["VF1100", "VF1101", "VF1102"],
};

export const VF1104: DiagnosticDefinition = {
    code: "VF1104",
    title: "InvalidScientificNotation",
    messageTemplate: "Invalid scientific notation: expected digit after exponent",
    severity: "error",
    phase: "lexer",
    category: "number",
    hintTemplate: "Add at least one digit after 'e' or 'E'",
    explanation:
        "Scientific notation requires at least one digit after the exponent indicator (e or E). " +
        "An optional sign (+ or -) can appear before the exponent digits.",
    example: {
        bad: "let big = 1.5e",
        good: "let big = 1.5e10",
        description: "Added exponent value after 'e'",
    },
    relatedCodes: ["VF1100"],
};

// =============================================================================
// VF1300-VF1399: Comment Errors
// =============================================================================

export const VF1300: DiagnosticDefinition = {
    code: "VF1300",
    title: "UnterminatedComment",
    messageTemplate: "Unterminated multi-line comment",
    severity: "error",
    phase: "lexer",
    category: "comment",
    hintTemplate: "Add closing */",
    explanation:
        "Multi-line comments starting with /* must be closed with */. " +
        "Vibefun supports nested comments, so make sure each /* has a matching */.",
    example: {
        bad: "/* This comment\nnever ends",
        good: "/* This comment\nis properly closed */",
        description: "Added closing */ to the comment",
    },
};

// =============================================================================
// VF1400-VF1499: Operator/Symbol Errors
// =============================================================================

export const VF1400: DiagnosticDefinition = {
    code: "VF1400",
    title: "UnexpectedCharacter",
    messageTemplate: "Unexpected character: '{char}'",
    severity: "error",
    phase: "lexer",
    category: "syntax",
    hintTemplate: "This character is not valid in vibefun syntax",
    explanation:
        "The lexer encountered a character that is not part of the vibefun language syntax. " +
        "This might be a typo, a character from a different keyboard layout, or an unsupported symbol.",
    example: {
        bad: "let x = 5 @ 3",
        good: "let x = 5 * 3",
        description: "Replaced invalid @ with valid operator *",
    },
};

// =============================================================================
// VF1500-VF1599: Identifier/Keyword Errors
// =============================================================================

export const VF1500: DiagnosticDefinition = {
    code: "VF1500",
    title: "ReservedKeyword",
    messageTemplate: "'{keyword}' is a reserved keyword for future language features",
    severity: "error",
    phase: "lexer",
    category: "identifier",
    hintTemplate: "Reserved keywords cannot be used as identifiers",
    explanation:
        "This identifier is reserved for future language features and cannot be used as a variable name, " +
        "function name, or any other user-defined identifier. Choose a different name for your identifier.",
    example: {
        bad: "let class = 5",
        good: "let myClass = 5",
        description: "Used a different identifier name",
    },
    relatedCodes: ["VF1400"],
};

// =============================================================================
// Registration
// =============================================================================

const lexerCodes: readonly DiagnosticDefinition[] = [
    // String literals
    VF1001,
    VF1002,
    VF1003,
    // Escape sequences
    VF1010,
    VF1011,
    VF1012,
    // Number literals
    VF1100,
    VF1101,
    VF1102,
    VF1103,
    VF1104,
    // Comments
    VF1300,
    // Operators/symbols
    VF1400,
    // Identifiers/keywords
    VF1500,
];

/**
 * Register all lexer diagnostic codes with the global registry.
 */
export function registerLexerCodes(): void {
    registry.registerAll(lexerCodes);
}
