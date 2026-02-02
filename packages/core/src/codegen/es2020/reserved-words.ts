/**
 * JavaScript reserved word handling
 *
 * Escapes identifiers that conflict with JavaScript reserved words
 * by appending a $ suffix.
 */

/**
 * JavaScript reserved words (ES2020+)
 *
 * Includes:
 * - Keywords
 * - Future reserved words
 * - Strict mode reserved words
 * - Built-in globals that should be avoided
 */
export const RESERVED_WORDS: ReadonlySet<string> = new Set([
    // Keywords
    "break",
    "case",
    "catch",
    "continue",
    "debugger",
    "default",
    "delete",
    "do",
    "else",
    "finally",
    "for",
    "function",
    "if",
    "in",
    "instanceof",
    "new",
    "return",
    "switch",
    "this",
    "throw",
    "try",
    "typeof",
    "var",
    "void",
    "while",
    "with",

    // ES6+ keywords
    "class",
    "const",
    "export",
    "extends",
    "import",
    "super",
    "let",
    "static",
    "yield",

    // Future reserved words
    "enum",

    // Strict mode reserved words
    "implements",
    "interface",
    "package",
    "private",
    "protected",
    "public",

    // Future reserved in strict mode
    "await",

    // Literals that are keywords
    "null",
    "true",
    "false",

    // Built-in globals we should avoid shadowing
    "undefined",
    "NaN",
    "Infinity",
    "eval",
    "arguments",
]);

/**
 * Check if an identifier is a JavaScript reserved word
 *
 * @param name - Identifier to check
 * @returns True if the identifier is reserved
 */
export function isReservedWord(name: string): boolean {
    return RESERVED_WORDS.has(name);
}

/**
 * Escape an identifier if it's a reserved word
 *
 * Reserved words are escaped by appending a $ suffix:
 * - class -> class$
 * - function -> function$
 *
 * Non-reserved identifiers pass through unchanged.
 *
 * @param name - Identifier to potentially escape
 * @returns Escaped identifier (or original if not reserved)
 */
export function escapeIdentifier(name: string): string {
    if (RESERVED_WORDS.has(name)) {
        return `${name}$`;
    }
    return name;
}
