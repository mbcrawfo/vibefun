/**
 * Parser for Vibefun
 *
 * Converts a stream of tokens from the lexer into an Abstract Syntax Tree (AST).
 * Uses recursive descent parsing with operator precedence climbing for expressions.
 */

import type { Declaration, Expr, Location, Module, Pattern, TypeExpr } from "../types/index.js";
import type { Token, TokenType } from "../types/token.js";

import { ParserError } from "../utils/index.js";

/**
 * Parser class for converting tokens to AST
 */
export class Parser {
    private tokens: Token[];
    private current: number = 0;
    private hadError: boolean = false;
    private filename: string;

    /**
     * Create a new Parser
     * @param tokens - Array of tokens from the lexer
     * @param filename - Source filename for error reporting
     */
    constructor(tokens: Token[], filename: string = "<input>") {
        this.tokens = tokens;
        this.filename = filename;
    }

    /**
     * Parse a complete module
     * @returns Module AST node
     */
    parse(): Module {
        return this.parseModule();
    }

    /**
     * Check if there were any parsing errors
     */
    hasError(): boolean {
        return this.hadError;
    }

    // =========================================================================
    // Token Consumption
    // =========================================================================

    /**
     * Look ahead at a token without consuming it
     * @param offset - How many tokens ahead to look (default: 0 = current)
     * @returns The token at current + offset
     */
    private peek(offset: number = 0): Token {
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
    private advance(): Token {
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
    private isAtEnd(): boolean {
        return this.peek().type === "EOF";
    }

    /**
     * Check if current token matches the given type
     * @param type - Token type to check
     * @returns true if current token matches
     */
    private check(type: TokenType): boolean {
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
    private match(...types: TokenType[]): Token | null {
        for (const type of types) {
            if (this.check(type)) {
                return this.advance();
            }
        }
        return null;
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
    private error(message: string, location: Location, help?: string): ParserError {
        this.hadError = true;
        return new ParserError(message, location, help);
    }

    // =========================================================================
    // Module Parsing
    // =========================================================================

    /**
     * Parse a module (top-level)
     * module = import* declaration*
     */
    private parseModule(): Module {
        const startLoc = this.peek().loc;
        const imports: Declaration[] = [];
        const declarations: Declaration[] = [];

        // Skip leading newlines
        while (this.match("NEWLINE")) {
            // Skip
        }

        // For Phase 1, just return empty module
        // Parsing will be implemented in subsequent phases

        return {
            imports,
            declarations,
            loc: startLoc,
        };
    }

    // =========================================================================
    // Declaration Parsing (Stubs)
    // =========================================================================
    // Will be implemented in later phases

    // =========================================================================
    // Expression Parsing (Stubs)
    // =========================================================================

    parseExpression(): Expr {
        throw this.error("Not implemented: parseExpression", this.peek().loc);
    }

    // =========================================================================
    // Pattern Parsing (Stubs)
    // =========================================================================

    parsePattern(): Pattern {
        throw this.error("Not implemented: parsePattern", this.peek().loc);
    }

    // =========================================================================
    // Type Expression Parsing (Stubs)
    // =========================================================================

    parseTypeExpr(): TypeExpr {
        throw this.error("Not implemented: parseTypeExpr", this.peek().loc);
    }

    // =========================================================================
    // Utilities
    // =========================================================================

    /**
     * Create an EOF token for safety
     */
    private makeEOF(): Token {
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
