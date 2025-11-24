/**
 * Character classification utilities for the lexer
 *
 * Provides functions for classifying characters (digits, identifiers, etc.)
 */

/**
 * Check if a character is a decimal digit (0-9)
 * @param char - The character to check
 * @returns true if char is 0-9
 */
export function isDigit(char: string): boolean {
    return char >= "0" && char <= "9";
}

/**
 * Check if a character is a hexadecimal digit (0-9, a-f, A-F)
 * @param char - The character to check
 * @returns true if char is a hex digit
 */
export function isHexDigit(char: string): boolean {
    return isDigit(char) || (char >= "a" && char <= "f") || (char >= "A" && char <= "F");
}

/**
 * Check if a character can start an identifier
 * Identifiers can start with Unicode letters, emoji, or underscore
 * @param char - The character to check
 * @returns true if char can start an identifier
 */
export function isIdentifierStart(char: string): boolean {
    if (char === "_") return true;
    // Check if it's a Unicode letter or emoji using Unicode property escapes
    // \p{L} matches any Unicode letter character
    // \p{Emoji_Presentation} matches emoji that display as emoji by default
    return /[\p{L}\p{Emoji_Presentation}]/u.test(char);
}

/**
 * Check if a character can continue an identifier
 * Identifiers can continue with Unicode letters, emoji, digits, combining marks, or underscore
 * @param char - The character to check
 * @returns true if char can continue an identifier
 */
export function isIdentifierContinue(char: string): boolean {
    if (char === "_") return true;
    if (char >= "0" && char <= "9") return true;
    // Check if it's a Unicode letter, emoji, or combining mark
    // \p{L} = Letters, \p{M} = Marks (including combining characters)
    // \p{Emoji_Presentation} = Emoji displayed as emoji by default
    // U+200D = Zero-Width Joiner for complex emoji sequences
    if (char === "\u200D") return true; // ZWJ for emoji sequences like 👨‍💻
    return /[\p{L}\p{M}\p{Emoji_Presentation}]/u.test(char);
}
