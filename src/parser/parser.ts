/**
 * Parser for Vibefun
 *
 * Converts a stream of tokens from the lexer into an Abstract Syntax Tree (AST).
 * Uses recursive descent parsing with operator precedence climbing for expressions.
 */

import type { Declaration, Expr, Location, MatchCase, Module, Pattern, RecordField, TypeExpr } from "../types/index.js";
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

    /**
     * Require a token of the given type, or throw an error
     * @param type - Required token type
     * @param message - Error message if not found
     * @returns The consumed token
     * @throws ParserError if token doesn't match
     */
    private expect(type: TokenType, message?: string): Token {
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
    private error(message: string, location: Location, help?: string): ParserError {
        this.hadError = true;
        return new ParserError(message, location, help);
    }

    /**
     * Synchronize after an error to continue parsing
     * Skips tokens until reaching a safe synchronization point
     */
    // @ts-expect-error - Will be used in Phase 7+
    private synchronize(): void {
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

        // Note: Full parsing will be implemented in subsequent phases
        // For now, we validate that the module is well-formed (empty or only whitespace/comments)

        // If there are any tokens other than EOF, we need to skip them for now
        // This demonstrates error handling and synchronization
        if (!this.isAtEnd()) {
            // Peek at unexpected token for error message (but don't fail yet)
            // In later phases, this is where we'll parse imports and declarations
        }

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
    // Expression Parsing
    // =========================================================================

    /**
     * Parse an expression
     * Entry point for expression parsing with operator precedence
     */
    parseExpression(): Expr {
        return this.parsePipe();
    }

    /**
     * Parse pipe expressions: expr |> func
     * Precedence level 2 (lowest binary operator)
     */
    private parsePipe(): Expr {
        let expr = this.parseRefAssign();

        while (this.match("PIPE_GT")) {
            const func = this.parseRefAssign();
            expr = {
                kind: "Pipe",
                expr,
                func,
                loc: expr.loc,
            };
        }

        return expr;
    }

    /**
     * Parse reference assignment: ref := value
     * Precedence level 1 (right-associative)
     */
    private parseRefAssign(): Expr {
        const expr = this.parseCons();

        if (this.match("COLON_EQ")) {
            const value = this.parseRefAssign(); // Right-associative
            return {
                kind: "BinOp",
                op: "RefAssign",
                left: expr,
                right: value,
                loc: expr.loc,
            };
        }

        return expr;
    }

    /**
     * Parse list cons: head :: tail
     * Precedence level 3 (right-associative)
     */
    private parseCons(): Expr {
        const expr = this.parseLogicalOr();

        if (this.match("COLON_COLON")) {
            const tail = this.parseCons(); // Right-associative
            return {
                kind: "ListCons",
                head: expr,
                tail,
                loc: expr.loc,
            };
        }

        return expr;
    }

    /**
     * Parse logical OR: expr || expr
     * Precedence level 4
     */
    private parseLogicalOr(): Expr {
        let left = this.parseLogicalAnd();

        while (this.match("PIPE_PIPE")) {
            const right = this.parseLogicalAnd();
            left = {
                kind: "BinOp",
                op: "LogicalOr",
                left,
                right,
                loc: left.loc,
            };
        }

        return left;
    }

    /**
     * Parse logical AND: expr && expr
     * Precedence level 5
     */
    private parseLogicalAnd(): Expr {
        let left = this.parseBitwiseOr();

        while (this.match("AMP_AMP")) {
            const right = this.parseBitwiseOr();
            left = {
                kind: "BinOp",
                op: "LogicalAnd",
                left,
                right,
                loc: left.loc,
            };
        }

        return left;
    }

    /**
     * Parse bitwise OR: expr | expr
     * Precedence level 6
     */
    private parseBitwiseOr(): Expr {
        let left = this.parseBitwiseAnd();

        while (this.match("PIPE")) {
            const right = this.parseBitwiseAnd();
            left = {
                kind: "BinOp",
                op: "BitwiseOr",
                left,
                right,
                loc: left.loc,
            };
        }

        return left;
    }

    /**
     * Parse bitwise AND: expr & expr
     * Precedence level 7
     */
    private parseBitwiseAnd(): Expr {
        let left = this.parseEquality();

        while (this.match("AMP")) {
            const right = this.parseEquality();
            left = {
                kind: "BinOp",
                op: "BitwiseAnd",
                left,
                right,
                loc: left.loc,
            };
        }

        return left;
    }

    /**
     * Parse equality: expr == expr, expr != expr
     * Precedence level 8
     */
    private parseEquality(): Expr {
        let left = this.parseComparison();

        while (this.match("EQ_EQ", "BANG_EQ")) {
            const opToken = this.peek(-1);
            const op = opToken.type === "EQ_EQ" ? "Equal" : "NotEqual";
            const right = this.parseComparison();
            left = {
                kind: "BinOp",
                op,
                left,
                right,
                loc: left.loc,
            };
        }

        return left;
    }

    /**
     * Parse comparison: <, <=, >, >=
     * Precedence level 9
     */
    private parseComparison(): Expr {
        let left = this.parseShift();

        while (this.match("LT", "LT_EQ", "GT", "GT_EQ")) {
            const opToken = this.peek(-1);
            const op =
                opToken.type === "LT"
                    ? "LessThan"
                    : opToken.type === "LT_EQ"
                      ? "LessEqual"
                      : opToken.type === "GT"
                        ? "GreaterThan"
                        : "GreaterEqual";
            const right = this.parseShift();
            left = {
                kind: "BinOp",
                op,
                left,
                right,
                loc: left.loc,
            };
        }

        return left;
    }

    /**
     * Parse shift: <<, >>
     * Precedence level 10
     */
    private parseShift(): Expr {
        let left = this.parseAdditive();

        while (this.match("LT_LT", "GT_GT")) {
            const opToken = this.peek(-1);
            const op = opToken.type === "LT_LT" ? "LeftShift" : "RightShift";
            const right = this.parseAdditive();
            left = {
                kind: "BinOp",
                op,
                left,
                right,
                loc: left.loc,
            };
        }

        return left;
    }

    /**
     * Parse additive: +, -, ++
     * Precedence level 11
     */
    private parseAdditive(): Expr {
        let left = this.parseMultiplicative();

        while (this.match("PLUS", "MINUS", "PLUS_PLUS")) {
            const opToken = this.peek(-1);
            const op = opToken.type === "PLUS" ? "Add" : opToken.type === "MINUS" ? "Subtract" : "Concat";
            const right = this.parseMultiplicative();
            left = {
                kind: "BinOp",
                op,
                left,
                right,
                loc: left.loc,
            };
        }

        return left;
    }

    /**
     * Parse multiplicative: *, /, %
     * Precedence level 12
     */
    private parseMultiplicative(): Expr {
        let left = this.parseUnary();

        while (this.match("STAR", "SLASH", "PERCENT")) {
            const opToken = this.peek(-1);
            const op = opToken.type === "STAR" ? "Multiply" : opToken.type === "SLASH" ? "Divide" : "Modulo";
            const right = this.parseUnary();
            left = {
                kind: "BinOp",
                op,
                left,
                right,
                loc: left.loc,
            };
        }

        return left;
    }

    /**
     * Parse unary operators: -, !, ~
     * Precedence level 13 (higher than binary operators)
     */
    private parseUnary(): Expr {
        // Check for unary operators
        if (this.match("MINUS", "BANG", "TILDE")) {
            const opToken = this.peek(-1);
            const startLoc = opToken.loc;
            const expr = this.parseUnary(); // Right-associative (unary operators can stack)

            const op = opToken.type === "MINUS" ? "Negate" : opToken.type === "BANG" ? "LogicalNot" : "BitwiseNot";

            return {
                kind: "UnaryOp",
                op,
                expr,
                loc: startLoc,
            };
        }

        // No unary operator, continue to postfix (calls)
        return this.parseCall();
    }

    /**
     * Parse function calls and postfix operators
     * Precedence level 14 (highest - postfix)
     */
    private parseCall(): Expr {
        let expr = this.parsePrimary();

        // Parse postfix operators (function calls, record field access)
        while (true) {
            // Function call: func(arg1, arg2, ...)
            if (this.match("LPAREN")) {
                const args: Expr[] = [];

                // Check for empty argument list
                if (!this.check("RPAREN")) {
                    // Parse arguments
                    do {
                        args.push(this.parseExpression());
                    } while (this.match("COMMA"));
                }

                this.expect("RPAREN", "Expected closing parenthesis after function arguments");

                expr = {
                    kind: "App",
                    func: expr,
                    args,
                    loc: expr.loc,
                };
            }
            // Record field access: record.field
            else if (this.match("DOT")) {
                const fieldToken = this.expect("IDENTIFIER", "Expected field name after '.'");
                const field = fieldToken.value as string;

                expr = {
                    kind: "RecordAccess",
                    record: expr,
                    field,
                    loc: expr.loc,
                };
            } else {
                // No more postfix operators
                break;
            }
        }

        return expr;
    }

    /**
     * Parse primary expressions (literals, variables, parenthesized)
     */
    private parsePrimary(): Expr {
        // Integer literal
        if (this.check("INT_LITERAL")) {
            const token = this.advance();
            return {
                kind: "IntLit",
                value: token.value as number,
                loc: token.loc,
            };
        }

        // Float literal
        if (this.check("FLOAT_LITERAL")) {
            const token = this.advance();
            return {
                kind: "FloatLit",
                value: token.value as number,
                loc: token.loc,
            };
        }

        // String literal
        if (this.check("STRING_LITERAL")) {
            const token = this.advance();
            return {
                kind: "StringLit",
                value: token.value as string,
                loc: token.loc,
            };
        }

        // Boolean literal
        if (this.check("BOOL_LITERAL")) {
            const token = this.advance();
            return {
                kind: "BoolLit",
                value: token.value as boolean,
                loc: token.loc,
            };
        }

        // Lambda, unit literal, or parenthesized expression
        if (this.check("LPAREN")) {
            const startLoc = this.peek().loc;
            this.advance(); // consume (

            // Check for closing paren immediately
            if (this.check("RPAREN")) {
                this.advance(); // consume )

                // Check if it's a lambda: () => expr
                if (this.check("FAT_ARROW")) {
                    this.advance(); // consume =>
                    const body = this.parseExpression();
                    return {
                        kind: "Lambda",
                        params: [],
                        body,
                        loc: startLoc,
                    };
                }

                // Otherwise, it's a unit literal
                return {
                    kind: "UnitLit",
                    loc: startLoc,
                };
            }

            // Lookahead to distinguish lambda from parenthesized expression
            // Lambda: (id) => or (id, id, ...) =>
            // Paren expr: (expr)
            //
            // Strategy: If we see identifier, peek ahead to see if next is ) or ,
            // - If ), peek ahead again for =>
            // - If ,, it must be lambda parameters
            // - Otherwise, it's a parenthesized expression

            if (this.check("IDENTIFIER")) {
                const nextToken = this.peek(1);

                // Check if it looks like lambda parameters
                if (nextToken.type === "RPAREN") {
                    // Could be (x) => or (x)
                    // Need to check if there's => after the )
                    const afterParen = this.peek(2);
                    if (afterParen.type === "FAT_ARROW") {
                        // It's a lambda: (x) => expr
                        const param = {
                            kind: "VarPattern" as const,
                            name: this.advance().value as string,
                            loc: this.peek(-1).loc,
                        };
                        this.expect("RPAREN");
                        this.expect("FAT_ARROW");
                        const body = this.parseExpression();
                        return {
                            kind: "Lambda",
                            params: [param],
                            body,
                            loc: startLoc,
                        };
                    } else {
                        // It's a parenthesized variable: (x)
                        const name = this.advance().value as string;
                        const varLoc = this.peek(-1).loc;
                        this.expect("RPAREN");
                        return {
                            kind: "Var",
                            name,
                            loc: varLoc,
                        };
                    }
                } else if (nextToken.type === "COMMA") {
                    // It's lambda parameters: (x, y, ...) => expr
                    const params: Pattern[] = [];
                    params.push({
                        kind: "VarPattern",
                        name: this.advance().value as string,
                        loc: this.peek(-1).loc,
                    });

                    while (this.match("COMMA")) {
                        const nameToken = this.expect("IDENTIFIER", "Expected parameter name after comma");
                        params.push({
                            kind: "VarPattern",
                            name: nameToken.value as string,
                            loc: nameToken.loc,
                        });
                    }

                    this.expect("RPAREN", "Expected closing parenthesis after parameters");
                    this.expect("FAT_ARROW", "Expected '=>' after lambda parameters");

                    const body = this.parseExpression();
                    return {
                        kind: "Lambda",
                        params,
                        body,
                        loc: startLoc,
                    };
                }
            }

            // Not a lambda, parse as parenthesized expression
            const expr = this.parseExpression();
            this.expect("RPAREN", "Expected closing parenthesis");
            return expr;
        }

        // If expression: if condition then expr1 else expr2
        if (this.check("KEYWORD") && this.peek().value === "if") {
            const startLoc = this.peek().loc;
            this.advance(); // consume 'if'

            const condition = this.parseExpression();

            this.expect("KEYWORD", "Expected 'then' after if condition");
            if (this.peek(-1).value !== "then") {
                throw this.error("Expected 'then' after if condition", this.peek(-1).loc);
            }

            const thenExpr = this.parseExpression();

            this.expect("KEYWORD", "Expected 'else' after then expression");
            if (this.peek(-1).value !== "else") {
                throw this.error("Expected 'else' after then expression", this.peek(-1).loc);
            }

            const elseExpr = this.parseExpression();

            return {
                kind: "If",
                condition,
                then: thenExpr,
                else_: elseExpr,
                loc: startLoc,
            };
        }

        // Match expression: match expr { | pattern => body | pattern when guard => body ... }
        if (this.check("KEYWORD") && this.peek().value === "match") {
            const startLoc = this.peek().loc;
            this.advance(); // consume 'match'

            const expr = this.parseExpression();

            this.expect("LBRACE", "Expected '{' after match expression");

            const cases: MatchCase[] = [];

            // Parse match cases
            // First case can optionally start with |
            this.match("PIPE");

            while (!this.check("RBRACE") && !this.isAtEnd()) {
                // For now, parse simple variable pattern (Phase 5 will add full patterns)
                // Simple pattern: identifier or wildcard (_)
                let pattern: Pattern;

                if (this.check("IDENTIFIER")) {
                    const token = this.advance();
                    const name = token.value as string;

                    // Check if it's wildcard
                    if (name === "_") {
                        pattern = {
                            kind: "WildcardPattern",
                            loc: token.loc,
                        };
                    } else {
                        pattern = {
                            kind: "VarPattern",
                            name,
                            loc: token.loc,
                        };
                    }
                } else {
                    throw this.error("Expected pattern in match case", this.peek().loc);
                }

                // Optional guard: when expr
                let guard: Expr | undefined;
                if (this.check("KEYWORD") && this.peek().value === "when") {
                    this.advance(); // consume 'when'
                    // Guard should not consume the => so parse at higher precedence than bitwise OR
                    guard = this.parseBitwiseAnd();
                }

                // Fat arrow
                this.expect("FAT_ARROW", "Expected '=>' after match pattern");

                // Body - parse at precedence level higher than bitwise OR (level 6)
                // This prevents consuming | as bitwise OR when it's actually a case separator
                // parseBitwiseAnd is level 7, which stops before bitwise OR
                const body = this.parseBitwiseAnd();

                const matchCase: MatchCase = {
                    pattern,
                    body,
                    loc: pattern.loc,
                };

                // Only add guard if it exists (exactOptionalPropertyTypes)
                if (guard !== undefined) {
                    matchCase.guard = guard;
                }

                cases.push(matchCase);

                // Check for more cases (separated by | or newline)
                if (this.check("RBRACE")) {
                    break;
                }

                // Skip optional newlines
                while (this.match("NEWLINE"));

                // If next is a pipe, consume it as case separator
                if (this.match("PIPE")) {
                    // Continue to next case
                    continue;
                } else if (!this.check("RBRACE")) {
                    // No pipe and not end of match - error
                    throw this.error(
                        "Expected '|' or '}' after match case",
                        this.peek().loc,
                        "Match cases should be separated by '|'",
                    );
                }
            }

            this.expect("RBRACE", "Expected '}' after match cases");

            return {
                kind: "Match",
                expr,
                cases,
                loc: startLoc,
            };
        }

        // List literal: [1, 2, 3]
        if (this.check("LBRACKET")) {
            const startLoc = this.peek().loc;
            this.advance(); // consume [

            const elements: Expr[] = [];

            // Check for empty list
            if (!this.check("RBRACKET")) {
                // Parse elements
                do {
                    elements.push(this.parseExpression());
                } while (this.match("COMMA"));
            }

            this.expect("RBRACKET", "Expected closing bracket after list elements");

            return {
                kind: "List",
                elements,
                loc: startLoc,
            };
        }

        // Record construction or update: { field: value } or { record | field: value }
        if (this.check("LBRACE")) {
            const startLoc = this.peek().loc;
            this.advance(); // consume {

            // Check for empty record
            if (this.check("RBRACE")) {
                this.advance();
                return {
                    kind: "Record",
                    fields: [],
                    loc: startLoc,
                };
            }

            // Check if it's a record update: { record | field: value }
            // Lookahead: if we see identifier/expression followed by |, it's an update
            // For simplicity, we'll try to parse first element and check for |

            // Parse first identifier or expression
            // If followed by PIPE, it's an update
            // If followed by COLON, it's a field

            // Check if starts with identifier followed by PIPE (update syntax)
            if (this.check("IDENTIFIER") && this.peek(1).type === "PIPE") {
                // Record update: { record | field: value, ... }
                const recordName = this.advance().value as string;
                const record: Expr = {
                    kind: "Var",
                    name: recordName,
                    loc: this.peek(-1).loc,
                };

                this.expect("PIPE", "Expected '|' after record in update");

                // Parse update fields
                const updates: RecordField[] = [];
                do {
                    const fieldName = this.expect("IDENTIFIER", "Expected field name").value as string;
                    this.expect("COLON", "Expected ':' after field name");
                    const value = this.parseExpression();

                    updates.push({
                        name: fieldName,
                        value,
                        loc: this.peek(-1).loc,
                    });
                } while (this.match("COMMA"));

                this.expect("RBRACE", "Expected '}' after record update");

                return {
                    kind: "RecordUpdate",
                    record,
                    updates,
                    loc: startLoc,
                };
            }

            // Otherwise, it's record construction: { field: value, ... }
            const fields: RecordField[] = [];

            do {
                const fieldName = this.expect("IDENTIFIER", "Expected field name").value as string;
                this.expect("COLON", "Expected ':' after field name");
                const value = this.parseExpression();

                fields.push({
                    name: fieldName,
                    value,
                    loc: this.peek(-1).loc,
                });
            } while (this.match("COMMA"));

            this.expect("RBRACE", "Expected '}' after record fields");

            return {
                kind: "Record",
                fields,
                loc: startLoc,
            };
        }

        // Variable (identifier)
        if (this.check("IDENTIFIER")) {
            const token = this.advance();
            return {
                kind: "Var",
                name: token.value as string,
                loc: token.loc,
            };
        }

        // If we get here, unexpected token
        throw this.error(
            `Unexpected token: ${this.peek().type}`,
            this.peek().loc,
            "Expected an expression (literal, variable, or parenthesized expression)",
        );
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
