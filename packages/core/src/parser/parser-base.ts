/**
 * Parser Base Class
 *
 * Provides core parser state and token consumption utilities.
 * All parsing modules build on this base class.
 */

import type { Location } from "../types/index.js";
import type { Token, TokenType } from "../types/token.js";

import { ParserError } from "../utils/index.js";

/**
 * Base class for parser with state management and token utilities
 */
export class ParserBase {
    /** Token stream */
    protected tokens: Token[];

    /** Current position in token stream */
    protected current: number = 0;

    /** Error flag */
    protected hadError: boolean = false;

    /** Source filename for error reporting */
    protected filename: string;

    /** Used by ASI to disable automatic semicolon insertion inside records */
    protected inRecordContext: boolean = false;

    /** Multi-error collection */
    protected errors: ParserError[] = [];

    /** Maximum errors before stopping */
    protected readonly maxErrors = 10;

    /**
     * Create a new Parser
     * @param tokens - Array of tokens from the lexer
     * @param filename - Source filename for error reporting
     */
    constructor(tokens: Token[], filename: string = "<input>") {
        this.tokens = tokens;
        this.filename = filename;
    }

    // =========================================================================
    // Token Consumption
    // =========================================================================

    /**
     * Look ahead at a token without consuming it
     * @param offset - How many tokens ahead to look (default: 0 = current)
     * @returns The token at current + offset
     */
    public peek(offset: number = 0): Token {
        const index = this.current + offset;
        if (index >= this.tokens.length) {
            // Return EOF token if past end
            return this.tokens[this.tokens.length - 1] ?? this.makeEOF();
        }
        return this.tokens[index] ?? this.makeEOF();
    }

    /**
     * Consume and return the current token
     * @returns The consumed token
     */
    public advance(): Token {
        const token = this.peek();
        if (!this.isAtEnd()) {
            this.current++;
        }
        return token;
    }

    /**
     * Check if we're at the end of the token stream
     * @returns true if at EOF
     */
    public isAtEnd(): boolean {
        return this.peek().type === "EOF";
    }

    /**
     * Check if current token matches the given type
     * @param type - Token type to check
     * @returns true if current token matches
     */
    public check(type: TokenType): boolean {
        if (this.isAtEnd()) {
            return false;
        }
        return this.peek().type === type;
    }

    /**
     * Conditionally consume a token if it matches any of the given types
     * @param types - Token types to match
     * @returns The consumed token if matched, null otherwise
     */
    public match(...types: TokenType[]): Token | null {
        for (const type of types) {
            if (this.check(type)) {
                return this.advance();
            }
        }
        return null;
    }

    /**
     * Require a token of the given type, or throw an error
     * @param type - Required token type
     * @param message - Error message if not found
     * @returns The consumed token
     * @throws ParserError if token doesn't match
     */
    public expect(type: TokenType, message?: string): Token {
        if (this.check(type)) {
            return this.advance();
        }

        const actualType = this.peek().type;
        const errorMessage = message || `Expected ${type}, but found ${actualType}`;

        throw this.error(errorMessage, this.peek().loc);
    }

    // =========================================================================
    // Error Handling
    // =========================================================================

    /**
     * Create a parser error
     * @param message - Error message
     * @param location - Location of the error
     * @param help - Optional help text
     * @returns ParserError
     */
    public error(message: string, location: Location, help?: string): ParserError {
        this.hadError = true;
        const err = new ParserError(message, location, help);
        this.errors.push(err);

        if (this.errors.length >= this.maxErrors) {
            // Stop parsing after max errors
            throw new Error(`Too many parse errors (${this.maxErrors}). Stopping.`);
        }

        return err;
    }

    /**
     * Get all collected parser errors
     * @returns Array of parser errors
     */
    public getErrors(): ParserError[] {
        return this.errors;
    }

    /**
     * Synchronize after an error to continue parsing
     * Skips tokens until reaching a safe synchronization point
     */
    public synchronize(): void {
        this.advance();

        while (!this.isAtEnd()) {
            // Sync on statement boundaries
            const prevType = this.peek(-1).type;
            if (prevType === "SEMICOLON" || prevType === "NEWLINE") {
                return;
            }

            // Sync on declaration keywords
            if (this.check("KEYWORD")) {
                const keyword = this.peek().value;
                if (["let", "type", "import", "export", "external"].includes(keyword as string)) {
                    return;
                }
            }

            this.advance();
        }
    }

    /**
     * Check if there were any parsing errors
     */
    public hasError(): boolean {
        return this.hadError;
    }

    // =========================================================================
    // Utilities
    // =========================================================================

    /**
     * Create an EOF token for safety
     */
    protected makeEOF(): Token {
        return {
            type: "EOF",
            value: "",
            loc: {
                file: this.filename,
                line: 1,
                column: 1,
                offset: 0,
            },
        };
    }
}
