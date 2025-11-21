/**
 * Parser for Vibefun
 *
 * Converts a stream of tokens from the lexer into an Abstract Syntax Tree (AST).
 * Uses recursive descent parsing with operator precedence climbing for expressions.
 *
 * The parser is modular, with separate files for different parsing responsibilities:
 * - parser-base.ts: Core state and token utilities
 * - parse-expressions.ts: Expression parsing
 * - parse-patterns.ts: Pattern parsing
 * - parse-types.ts: Type expression parsing
 * - parse-declarations.ts: Declaration parsing
 */

import type { Declaration, Expr, Module, Pattern, TypeExpr } from "../types/index.js";
import type { Token } from "../types/token.js";

import { ParserError } from "../utils/index.js";
import * as Declarations from "./parse-declarations.js";
import * as Expressions from "./parse-expressions.js";
import * as Patterns from "./parse-patterns.js";
import * as Types from "./parse-types.js";
import { ParserBase } from "./parser-base.js";

// Initialize circular dependencies between modules
// This allows each module to call functions from other modules without importing them directly
Expressions.setParsePattern(Patterns.parsePattern);
Expressions.setParseTypeExpr(Types.parseTypeExpr);

Patterns.setParseTypeExpr(Types.parseTypeExpr);

Declarations.setParseExpression(Expressions.parseExpression);
Declarations.setParsePattern(Patterns.parsePattern);
Declarations.setParseTypeExpr(Types.parseTypeExpr);
Declarations.setParseFunctionType(Types.parseFunctionType);

/**
 * Parser class for converting tokens to AST
 * Maintains the same public API as the original monolithic parser
 */
export class Parser extends ParserBase {
    /**
     * Create a new Parser
     * @param tokens - Array of tokens from the lexer
     * @param filename - Source filename for error reporting
     */
    constructor(tokens: Token[], filename: string = "<input>") {
        super(tokens, filename);
    }

    /**
     * Parse a complete module
     * @returns Module AST node
     * @throws ParserError if any parsing errors occurred
     */
    parse(): Module {
        const module = this.parseModule();

        // If any errors were collected, throw the first one
        if (this.errors.length > 0) {
            const firstError = this.errors[0];
            if (firstError) {
                throw firstError;
            }
        }

        return module;
    }

    /**
     * Parse an expression
     * Public entry point for expression parsing
     */
    parseExpression(): Expr {
        return Expressions.parseExpression(this);
    }

    /**
     * Parse a pattern
     * Public entry point for pattern parsing (used by tests)
     */
    parsePattern(): Pattern {
        return Patterns.parsePattern(this);
    }

    /**
     * Parse a type expression
     * Public entry point for type parsing (used by tests)
     */
    parseTypeExpr(): TypeExpr {
        return Types.parseTypeExpr(this);
    }

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

        // Parse declarations
        while (!this.isAtEnd()) {
            // Skip newlines between declarations
            while (this.match("NEWLINE"));

            if (this.isAtEnd()) {
                break;
            }

            try {
                const decl = Declarations.parseDeclaration(this);

                // Separate imports from other declarations
                if (decl.kind === "ImportDecl") {
                    imports.push(decl);
                } else {
                    declarations.push(decl);
                }

                // Require explicit semicolon after every declaration
                if (!this.check("SEMICOLON")) {
                    throw this.error(
                        "Expected ';' after declaration",
                        this.peek().loc,
                        "All declarations must end with a semicolon",
                    );
                }
                this.advance(); // Consume the semicolon

                // Skip trailing newlines
                while (this.match("NEWLINE"));
            } catch (error) {
                // Error during declaration parsing - synchronize and continue
                if (error instanceof ParserError) {
                    // Error already collected, synchronize and continue
                    this.synchronize();
                } else {
                    // Unexpected error, re-throw
                    throw error;
                }
            }
        }

        return {
            imports,
            declarations,
            loc: startLoc,
        };
    }
}
