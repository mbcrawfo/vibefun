/**
 * Core Lexer implementation for Vibefun
 *
 * The Lexer is responsible for converting source code into a stream of tokens.
 * It maintains position tracking for accurate error reporting and handles
 * character-by-character navigation through the source code.
 */

import type { Location, Token } from "../types/index.js";

import { isBoolLiteral, isKeyword } from "../types/token.js";
import { LexerError } from "../utils/index.js";

/**
 * Lexer state management and tokenization
 */
export class Lexer {
    private position: number = 0; // Current position in source (0-indexed)
    private line: number = 1; // Current line number (1-indexed)
    private column: number = 1; // Current column number (1-indexed)
    private readonly source: string;
    private readonly filename: string;

    constructor(source: string, filename: string = "<input>") {
        this.source = source;
        this.filename = filename;
    }

    /**
     * Get the current character without consuming it
     * @param offset - How many characters ahead to look (default: 0)
     * @returns The character at position + offset, or empty string if at/past end
     */
    peek(offset: number = 0): string {
        const pos = this.position + offset;
        if (pos >= this.source.length) {
            return "";
        }
        return this.source[pos] ?? "";
    }

    /**
     * Check if we've reached the end of the source
     * @returns true if at or past the end of source
     */
    isAtEnd(): boolean {
        return this.position >= this.source.length;
    }

    /**
     * Consume the current character and advance position
     * Updates position, line, and column tracking
     * @returns The consumed character, or empty string if at end
     */
    advance(): string {
        if (this.isAtEnd()) {
            return "";
        }

        const char = this.source[this.position];
        if (char === undefined) {
            return "";
        }

        this.position++;

        // Handle newlines for line/column tracking
        if (char === "\n") {
            this.line++;
            this.column = 1;
        } else {
            this.column++;
        }

        return char;
    }

    /**
     * Create a location snapshot at the current position
     * @returns Location object with current file, line, column, and offset
     */
    makeLocation(): Location {
        return {
            file: this.filename,
            line: this.line,
            column: this.column,
            offset: this.position,
        };
    }

    /**
     * Create a token with the current location
     * @param type - The token type
     * @param value - The token value (defaults to empty string)
     * @returns A token object with type, value, and location
     */
    makeToken<T extends Token["type"]>(type: T, value: string = ""): Extract<Token, { type: T }> {
        const loc = this.makeLocation();

        // We need to cast here because TypeScript can't narrow the union type
        // based on the generic parameter T. This is safe because we're constructing
        // the token with the correct shape for the given type.
        return {
            type,
            value,
            loc,
        } as Extract<Token, { type: T }>;
    }

    /**
     * Check if a character can start an identifier
     * Identifiers can start with Unicode letters or underscore
     * @param char - The character to check
     * @returns true if char can start an identifier
     */
    private isIdentifierStart(char: string): boolean {
        if (char === "_") return true;
        // Check if it's a Unicode letter using Unicode property escapes
        // \p{L} matches any Unicode letter character
        return /\p{L}/u.test(char);
    }

    /**
     * Check if a character can continue an identifier
     * Identifiers can continue with Unicode letters, digits, or underscore
     * @param char - The character to check
     * @returns true if char can continue an identifier
     */
    private isIdentifierContinue(char: string): boolean {
        if (char === "_") return true;
        if (char >= "0" && char <= "9") return true;
        // Check if it's a Unicode letter
        return /\p{L}/u.test(char);
    }

    /**
     * Read an identifier from the source
     * Handles keywords, boolean literals, and regular identifiers
     * @returns A token (KEYWORD, BOOL_LITERAL, or IDENTIFIER)
     */
    private readIdentifier(): Token {
        const start = this.makeLocation();
        let value = "";

        // Read identifier characters
        while (!this.isAtEnd() && this.isIdentifierContinue(this.peek())) {
            value += this.advance();
        }

        // Check if it's a keyword
        if (isKeyword(value)) {
            return {
                type: "KEYWORD",
                value,
                keyword: value,
                loc: start,
            };
        }

        // Check if it's a boolean literal
        if (isBoolLiteral(value)) {
            return {
                type: "BOOL_LITERAL",
                value: value === "true",
                loc: start,
            };
        }

        // Regular identifier
        return {
            type: "IDENTIFIER",
            value,
            loc: start,
        };
    }

    /**
     * Skip whitespace and comments
     * Whitespace (spaces, tabs, carriage returns) is skipped
     * Newlines are preserved as significant tokens
     * Comments are skipped (both single-line and multi-line with nesting)
     */
    private skipWhitespaceAndComments(): void {
        while (!this.isAtEnd()) {
            const char = this.peek();

            // Skip whitespace (but not newlines - they're significant)
            if (char === " " || char === "\t" || char === "\r") {
                this.advance();
                continue;
            }

            // Check for single-line comment
            if (char === "/" && this.peek(1) === "/") {
                this.skipSingleLineComment();
                continue;
            }

            // Check for multi-line comment
            if (char === "/" && this.peek(1) === "*") {
                this.skipMultiLineComment();
                continue;
            }

            // No more whitespace or comments to skip
            break;
        }
    }

    /**
     * Skip a single-line comment (//)
     * Consumes characters until newline or EOF
     */
    private skipSingleLineComment(): void {
        // Skip '//'
        this.advance();
        this.advance();

        // Skip until newline or EOF
        while (!this.isAtEnd() && this.peek() !== "\n") {
            this.advance();
        }
    }

    /**
     * Skip a multi-line comment with nesting support
     * Handles nested comments (slash-star ... star-slash) by tracking depth
     * @throws {LexerError} If comment is unterminated
     */
    private skipMultiLineComment(): void {
        const start = this.makeLocation();

        // Skip '/*'
        this.advance();
        this.advance();

        let depth = 1;

        while (!this.isAtEnd() && depth > 0) {
            // Check for nested opening /*
            if (this.peek() === "/" && this.peek(1) === "*") {
                this.advance();
                this.advance();
                depth++;
            }
            // Check for closing */
            else if (this.peek() === "*" && this.peek(1) === "/") {
                this.advance();
                this.advance();
                depth--;
            }
            // Regular character
            else {
                this.advance();
            }
        }

        // Check if comment was properly closed
        if (depth > 0) {
            throw new LexerError("Unterminated multi-line comment", start, "Add closing */");
        }
    }

    /**
     * Check if a character is a decimal digit (0-9)
     * @param char - The character to check
     * @returns true if char is 0-9
     */
    private isDigit(char: string): boolean {
        return char >= "0" && char <= "9";
    }

    /**
     * Check if a character is a hexadecimal digit (0-9, a-f, A-F)
     * @param char - The character to check
     * @returns true if char is a hex digit
     */
    private isHexDigit(char: string): boolean {
        return this.isDigit(char) || (char >= "a" && char <= "f") || (char >= "A" && char <= "F");
    }

    /**
     * Read a number literal from the source
     * Dispatches to specific parser based on prefix (0x, 0b) or defaults to decimal
     * @returns A token (INT_LITERAL or FLOAT_LITERAL)
     * @throws {LexerError} If number format is invalid
     */
    private readNumber(): Token {
        const start = this.makeLocation();

        // Check for hexadecimal prefix
        if (this.peek() === "0" && (this.peek(1) === "x" || this.peek(1) === "X")) {
            return this.readHexNumber(start);
        }

        // Check for binary prefix
        if (this.peek() === "0" && (this.peek(1) === "b" || this.peek(1) === "B")) {
            return this.readBinaryNumber(start);
        }

        // Default to decimal number
        return this.readDecimalNumber(start);
    }

    /**
     * Read a decimal number (integer or float with optional scientific notation)
     * Formats: 42, 3.14, 1e10, 3.14e-2
     * @param start - The starting location of the number
     * @returns INT_LITERAL or FLOAT_LITERAL token
     * @throws {LexerError} If number format is invalid
     */
    private readDecimalNumber(start: Location): Token {
        let value = "";
        let isFloat = false;

        // Read integer part
        while (this.isDigit(this.peek())) {
            value += this.advance();
        }

        // Check for decimal point (must be followed by a digit)
        if (this.peek() === "." && this.isDigit(this.peek(1))) {
            isFloat = true;
            value += this.advance(); // consume '.'

            // Read fractional part
            while (this.isDigit(this.peek())) {
                value += this.advance();
            }
        }

        // Check for scientific notation
        if (this.peek() === "e" || this.peek() === "E") {
            isFloat = true;
            value += this.advance(); // consume 'e' or 'E'

            // Optional sign
            if (this.peek() === "+" || this.peek() === "-") {
                value += this.advance();
            }

            // Must have at least one digit after exponent
            if (!this.isDigit(this.peek())) {
                throw new LexerError(
                    "Invalid scientific notation: expected digit after exponent",
                    this.makeLocation(),
                    "Add at least one digit after 'e' or 'E'",
                );
            }

            // Read exponent digits
            while (this.isDigit(this.peek())) {
                value += this.advance();
            }
        }

        const numValue = isFloat ? parseFloat(value) : parseInt(value, 10);

        return {
            type: isFloat ? "FLOAT_LITERAL" : "INT_LITERAL",
            value: numValue,
            loc: start,
        };
    }

    /**
     * Read a hexadecimal number (0x prefix)
     * Format: 0x1A, 0xFF, 0x0
     * @param start - The starting location of the number
     * @returns INT_LITERAL token
     * @throws {LexerError} If hex format is invalid
     */
    private readHexNumber(start: Location): Token {
        // Skip '0x' or '0X'
        this.advance();
        this.advance();

        let value = "";

        // Read hex digits
        while (this.isHexDigit(this.peek())) {
            value += this.advance();
        }

        // Must have at least one hex digit
        if (value.length === 0) {
            throw new LexerError(
                "Invalid hex literal: expected at least one hex digit after 0x",
                this.makeLocation(),
                "Add hex digits (0-9, a-f, A-F) after 0x",
            );
        }

        return {
            type: "INT_LITERAL",
            value: parseInt(value, 16),
            loc: start,
        };
    }

    /**
     * Read a binary number (0b prefix)
     * Format: 0b1010, 0b11111111
     * @param start - The starting location of the number
     * @returns INT_LITERAL token
     * @throws {LexerError} If binary format is invalid
     */
    private readBinaryNumber(start: Location): Token {
        // Skip '0b' or '0B'
        this.advance();
        this.advance();

        let value = "";

        // Read binary digits (0 or 1)
        while (this.peek() === "0" || this.peek() === "1") {
            value += this.advance();
        }

        // Must have at least one binary digit
        if (value.length === 0) {
            throw new LexerError(
                "Invalid binary literal: expected at least one binary digit after 0b",
                this.makeLocation(),
                "Add binary digits (0 or 1) after 0b",
            );
        }

        return {
            type: "INT_LITERAL",
            value: parseInt(value, 2),
            loc: start,
        };
    }

    /**
     * Tokenize the entire source code
     * @returns Array of tokens representing the source code
     * @throws {LexerError} If an invalid token is encountered
     */
    tokenize(): Token[] {
        const tokens: Token[] = [];

        while (!this.isAtEnd()) {
            // Skip whitespace and comments
            this.skipWhitespaceAndComments();

            // Check for EOF after skipping
            if (this.isAtEnd()) {
                break;
            }

            const char = this.peek();

            // Newlines
            if (char === "\n") {
                const start = this.makeLocation();
                this.advance();
                tokens.push({ type: "NEWLINE", value: "\n", loc: start });
                continue;
            }

            // Numbers
            if (this.isDigit(char)) {
                tokens.push(this.readNumber());
                continue;
            }

            // Identifiers and keywords
            if (this.isIdentifierStart(char)) {
                tokens.push(this.readIdentifier());
                continue;
            }

            // Single-character punctuation and operators
            const start = this.makeLocation();
            this.advance();

            switch (char) {
                case "(":
                    tokens.push({ type: "LPAREN", value: "(", loc: start });
                    continue;
                case ")":
                    tokens.push({ type: "RPAREN", value: ")", loc: start });
                    continue;
                case "{":
                    tokens.push({ type: "LBRACE", value: "{", loc: start });
                    continue;
                case "}":
                    tokens.push({ type: "RBRACE", value: "}", loc: start });
                    continue;
                case "[":
                    tokens.push({ type: "LBRACKET", value: "[", loc: start });
                    continue;
                case "]":
                    tokens.push({ type: "RBRACKET", value: "]", loc: start });
                    continue;
                case ",":
                    tokens.push({ type: "COMMA", value: ",", loc: start });
                    continue;
                case ".":
                    tokens.push({ type: "DOT", value: ".", loc: start });
                    continue;
                case ":":
                    tokens.push({ type: "COLON", value: ":", loc: start });
                    continue;
                case ";":
                    tokens.push({ type: "SEMICOLON", value: ";", loc: start });
                    continue;
                case "+":
                    tokens.push({ type: "PLUS", value: "+", loc: start });
                    continue;
                case "-":
                    tokens.push({ type: "MINUS", value: "-", loc: start });
                    continue;
                case "*":
                    tokens.push({ type: "STAR", value: "*", loc: start });
                    continue;
                case "/":
                    tokens.push({ type: "SLASH", value: "/", loc: start });
                    continue;
                case "%":
                    tokens.push({ type: "PERCENT", value: "%", loc: start });
                    continue;
                case "<":
                    tokens.push({ type: "LT", value: "<", loc: start });
                    continue;
                case ">":
                    tokens.push({ type: "GT", value: ">", loc: start });
                    continue;
                case "=":
                    tokens.push({ type: "EQ", value: "=", loc: start });
                    continue;
                case "!":
                    tokens.push({ type: "BANG", value: "!", loc: start });
                    continue;
                case "~":
                    tokens.push({ type: "TILDE", value: "~", loc: start });
                    continue;
                case "|":
                    tokens.push({ type: "PIPE", value: "|", loc: start });
                    continue;

                default:
                    throw new LexerError(
                        `Unexpected character: '${char}'`,
                        start,
                        "This character is not valid in vibefun syntax",
                    );
            }
        }

        // Add EOF token
        tokens.push(this.makeToken("EOF", ""));

        return tokens;
    }
}
