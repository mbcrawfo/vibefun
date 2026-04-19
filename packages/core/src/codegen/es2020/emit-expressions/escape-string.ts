/**
 * String-escaping utility used by string-literal emission and exposed
 * publicly for other codegen helpers that need identical semantics.
 */

/**
 * Escape a string for use in a JavaScript string literal
 *
 * Handles:
 * - Control characters (\n, \t, \r, etc.)
 * - Backslash and quote escaping
 * - Unicode line separators (U+2028, U+2029) - MUST be escaped in JS strings
 * - Other non-printable characters
 */
export function escapeString(str: string): string {
    let result = "";
    for (let i = 0; i < str.length; i++) {
        const char = str.charAt(i);
        const code = char.charCodeAt(0);

        switch (char) {
            case "\\":
                result += "\\\\";
                break;
            case '"':
                result += '\\"';
                break;
            case "\n":
                result += "\\n";
                break;
            case "\r":
                result += "\\r";
                break;
            case "\t":
                result += "\\t";
                break;
            case "\b":
                result += "\\b";
                break;
            case "\f":
                result += "\\f";
                break;
            case "\v":
                result += "\\v";
                break;
            case "\0": {
                // When null byte is followed by a digit, use \x00 to avoid
                // invalid octal escape sequences (e.g., \01 would be octal)
                const next = str.charAt(i + 1);
                const needsHex = next >= "0" && next <= "9";
                result += needsHex ? "\\x00" : "\\0";
                break;
            }
            default:
                // U+2028 (Line Separator) and U+2029 (Paragraph Separator)
                // These are valid in JS strings but MUST be escaped in string literals
                // because they're line terminators
                if (code === 0x2028) {
                    result += "\\u2028";
                } else if (code === 0x2029) {
                    result += "\\u2029";
                } else if (code < 0x20) {
                    // Other control characters (0x00-0x1F, excluding handled ones)
                    result += "\\x" + code.toString(16).padStart(2, "0");
                } else {
                    result += char;
                }
        }
    }
    return result;
}
