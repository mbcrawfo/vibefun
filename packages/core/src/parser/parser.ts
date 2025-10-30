/**
 * Parser for Vibefun
 *
 * Converts a stream of tokens from the lexer into an Abstract Syntax Tree (AST).
 * Uses recursive descent parsing with operator precedence climbing for expressions.
 */

import type {
    Declaration,
    Expr,
    ExternalBlockItem,
    ImportItem,
    Location,
    MatchCase,
    Module,
    Pattern,
    RecordField,
    RecordPatternField,
    RecordTypeField,
    TypeDefinition,
    TypeExpr,
    VariantConstructor,
} from "../types/index.js";
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
    // @ts-expect-error - Method reserved for future error recovery
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

        // Parse declarations
        while (!this.isAtEnd()) {
            // Skip newlines between declarations
            while (this.match("NEWLINE"));

            if (this.isAtEnd()) {
                break;
            }

            const decl = this.parseDeclaration();

            // Separate imports from other declarations
            if (decl.kind === "ImportDecl") {
                imports.push(decl);
            } else {
                declarations.push(decl);
            }

            // Skip trailing newlines
            while (this.match("NEWLINE"));
        }

        return {
            imports,
            declarations,
            loc: startLoc,
        };
    }

    // =========================================================================
    // Expression Parsing
    // =========================================================================

    /**
     * Parse an expression
     * Entry point for expression parsing with operator precedence
     */
    parseExpression(): Expr {
        return this.parseTypeAnnotation();
    }

    /**
     * Parse type annotation: expr : Type
     * Precedence level 1 (lowest - only above sequence/statements)
     */
    private parseTypeAnnotation(): Expr {
        const expr = this.parsePipe();

        // Check for type annotation
        // We need to be careful not to consume : in other contexts (record fields, etc.)
        // Type annotations are only valid in expression context, not in record construction
        if (this.check("COLON")) {
            // Lookahead: if the next token can start a type, it's a type annotation
            const nextToken = this.peek(1);
            const canStartType =
                nextToken.type === "IDENTIFIER" || nextToken.type === "LPAREN" || nextToken.type === "LBRACE";

            if (canStartType) {
                this.advance(); // consume :
                const typeExpr = this.parseTypeExpr();
                return {
                    kind: "TypeAnnotation",
                    expr,
                    typeExpr,
                    loc: expr.loc,
                };
            }
        }

        return expr;
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
        let left = this.parseEquality();

        while (this.match("AMP_AMP")) {
            const right = this.parseEquality();
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
        let left = this.parseComposition();

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
            const right = this.parseComposition();
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
     * Parse function composition: f >> g (forward) or f << g (backward)
     * Precedence level 10 (between comparison and additive)
     */
    private parseComposition(): Expr {
        let left = this.parseAdditive();

        while (this.match("GT_GT", "LT_LT")) {
            const opToken = this.peek(-1);
            const op = opToken.type === "GT_GT" ? "ForwardCompose" : "BackwardCompose";
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
     * Parse additive: +, -, &
     * Precedence level 11
     */
    private parseAdditive(): Expr {
        let left = this.parseMultiplicative();

        while (this.match("PLUS", "MINUS", "AMP")) {
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
     * Parse unary operators: -, !
     * Precedence level 13 (higher than binary operators)
     */
    private parseUnary(): Expr {
        // Check for unary operators
        if (this.match("MINUS", "BANG")) {
            const opToken = this.peek(-1);
            const startLoc = opToken.loc;
            const expr = this.parseUnary(); // Right-associative (unary operators can stack)

            const op = opToken.type === "MINUS" ? "Negate" : "LogicalNot";

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
     * Parse lambda or parenthesized expression starting with LPAREN
     * Handles: () => expr, (x) => expr, (x, y) => expr, or (expr)
     * Note: LPAREN has already been consumed by caller
     */
    private parseLambdaOrParen(startLoc: Location): Expr {
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

    /**
     * Parse match expression
     * Syntax: match expr { | pattern => body | pattern when guard => body ... }
     * Note: 'match' keyword has already been consumed by caller
     */
    private parseMatchExpr(startLoc: Location): Expr {
        const expr = this.parseExpression();

        this.expect("LBRACE", "Expected '{' after match expression");

        const cases: MatchCase[] = [];

        // Parse match cases
        // Skip any leading newlines
        while (this.match("NEWLINE"));

        // First case can optionally start with |
        this.match("PIPE");

        while (!this.check("RBRACE") && !this.isAtEnd()) {
            // Parse pattern
            const pattern = this.parsePattern();

            // Optional guard: when expr
            let guard: Expr | undefined;
            if (this.check("KEYWORD") && this.peek().value === "when") {
                this.advance(); // consume 'when'
                // Guard should not consume the |> pipe operator or | case separator
                guard = this.parseLogicalAnd();
            }

            // Fat arrow
            this.expect("FAT_ARROW", "Expected '=>' after match pattern");

            // Body - parse at precedence level that avoids consuming | as a separator
            // parseLogicalAnd stops before any operators that use PIPE token
            const body = this.parseLogicalAnd();

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

    /**
     * Parse record construction or update expression
     * Syntax: { field: value } or { record | field: value }
     * Note: LBRACE has already been consumed by caller
     */
    private parseRecordExpr(startLoc: Location): Expr {
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

    /**
     * Parse block expression
     * Syntax: { expr; expr; ... result }
     * Note: LBRACE has already been consumed by caller
     */
    private parseBlockExpr(startLoc: Location): Expr {
        // Already consumed {
        // Leading newlines already skipped by caller

        const exprs: Expr[] = [];

        // Parse expressions separated by semicolons
        while (!this.check("RBRACE") && !this.isAtEnd()) {
            const expr = this.parseExpression();
            exprs.push(expr);

            // Skip optional newlines after expression
            while (this.match("NEWLINE"));

            // Check for semicolon or closing brace
            if (this.check("RBRACE")) {
                break; // Last expression, no semicolon needed
            }

            // Require semicolon between expressions
            this.expect("SEMICOLON", "Expected ';' or '}' after expression in block");

            // Skip newlines after semicolon
            while (this.match("NEWLINE"));

            // Check if closing brace follows (trailing semicolon case)
            if (this.check("RBRACE")) {
                break;
            }
        }

        this.expect("RBRACE", "Expected '}' to close block");

        return {
            kind: "Block",
            exprs,
            loc: startLoc,
        };
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
            return this.parseLambdaOrParen(startLoc);
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
            return this.parseMatchExpr(startLoc);
        }

        // Unsafe block: unsafe { expr }
        if (this.check("KEYWORD") && this.peek().value === "unsafe") {
            const startLoc = this.peek().loc;
            this.advance(); // consume 'unsafe'

            this.expect("LBRACE", "Expected '{' after 'unsafe'");

            const expr = this.parseExpression();

            this.expect("RBRACE", "Expected '}' after unsafe expression");

            return {
                kind: "Unsafe",
                expr,
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

        // Record construction, update, or block expression: { ... }
        if (this.check("LBRACE")) {
            const startLoc = this.peek().loc;
            this.advance(); // consume {

            // Skip leading newlines
            while (this.match("NEWLINE"));

            // Empty braces - treat as empty record (existing behavior)
            if (this.check("RBRACE")) {
                this.advance();
                return {
                    kind: "Record",
                    fields: [],
                    loc: startLoc,
                };
            }

            // Disambiguate: block vs. record
            // Strategy:
            // 1. If starts with keyword (let, if, match, unsafe) → block
            // 2. If identifier followed by PIPE → record update
            // 3. If identifier followed by COLON → record construction
            // 4. Parse first expression and check for SEMICOLON → block
            // 5. Otherwise → error for ambiguous case

            // Check for block starting with keyword
            if (this.check("KEYWORD")) {
                const keyword = this.peek().value as string;
                if (["if", "match", "unsafe"].includes(keyword)) {
                    return this.parseBlockExpr(startLoc);
                }
            }

            // Check for record update: { id | ... }
            if (this.check("IDENTIFIER") && this.peek(1).type === "PIPE") {
                return this.parseRecordExpr(startLoc);
            }

            // Check for record construction: { id : ... }
            if (this.check("IDENTIFIER") && this.peek(1).type === "COLON") {
                return this.parseRecordExpr(startLoc);
            }

            // Need to parse first expression to check for semicolon
            // Save position for potential rollback
            const checkpoint = this.current;
            try {
                this.parseExpression();

                // Check for semicolon → block
                if (this.check("SEMICOLON")) {
                    // Rollback and parse as block
                    this.current = checkpoint;
                    return this.parseBlockExpr(startLoc);
                }

                // Check for closing brace → single expression could be block or ambiguous
                if (this.check("RBRACE")) {
                    // Ambiguous case: { expr }
                    // This could be a record field shorthand OR a single-expression block
                    // Decision: require semicolon for blocks, so this is an error
                    throw this.error(
                        "Ambiguous syntax: single expression in braces",
                        startLoc,
                        "Use semicolon for block ({ expr; }) or field:value syntax for record ({ field: value })",
                    );
                }

                // If we get here, there's more content but no semicolon
                // This is likely a malformed record or block
                throw this.error(
                    "Expected semicolon, closing brace, or colon",
                    this.peek().loc,
                    "Use semicolons to separate statements in blocks, or use field:value syntax for records",
                );
            } catch (error) {
                // If expression parsing failed, restore position and throw
                this.current = checkpoint;
                throw error;
            }
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
    // Pattern Parsing
    // =========================================================================

    /**
     * Parse a pattern (with or-pattern support)
     * Syntax: pattern ('|' pattern)*
     */
    parsePattern(): Pattern {
        const patterns: Pattern[] = [this.parsePrimaryPattern()];

        // Or patterns: pattern1 | pattern2 | pattern3
        // Need to be careful not to consume case separators in match expressions
        // The caller (match expression) will handle case separators
        while (this.check("PIPE")) {
            // Lookahead to distinguish or-pattern from case separator
            // If next token after PIPE can start a pattern, it's an or-pattern
            // Otherwise, it's a case separator (let match handle it)
            const nextToken = this.peek(1);
            if (
                nextToken.type === "IDENTIFIER" ||
                nextToken.type === "INT_LITERAL" ||
                nextToken.type === "FLOAT_LITERAL" ||
                nextToken.type === "STRING_LITERAL" ||
                nextToken.type === "KEYWORD" ||
                nextToken.type === "LBRACE" ||
                nextToken.type === "LBRACKET"
            ) {
                this.advance(); // consume |
                patterns.push(this.parsePrimaryPattern());
            } else {
                break; // Not an or-pattern, stop
            }
        }

        if (patterns.length === 1) {
            const pattern = patterns[0];
            if (!pattern) {
                throw new ParserError("Internal error: empty patterns array", this.peek().loc);
            }
            return pattern;
        }

        const firstPattern = patterns[0];
        if (!firstPattern) {
            throw new ParserError("Internal error: empty patterns array", this.peek().loc);
        }

        return {
            kind: "OrPattern",
            patterns,
            loc: firstPattern.loc,
        };
    }

    /**
     * Parse a primary pattern (non-or)
     */
    private parsePrimaryPattern(): Pattern {
        const startLoc = this.peek().loc;

        // Wildcard pattern: _
        if (this.check("IDENTIFIER") && this.peek().value === "_") {
            this.advance();
            return { kind: "WildcardPattern", loc: startLoc };
        }

        // Literal patterns: numbers, strings, booleans, null
        if (this.check("INT_LITERAL") || this.check("FLOAT_LITERAL")) {
            const token = this.advance();
            const literal = token.value as number;
            return { kind: "LiteralPattern", literal, loc: startLoc };
        }

        if (this.check("STRING_LITERAL")) {
            const token = this.advance();
            const literal = token.value as string;
            return { kind: "LiteralPattern", literal, loc: startLoc };
        }

        if (this.check("BOOL_LITERAL")) {
            const token = this.advance();
            const literal = token.value as boolean;
            return { kind: "LiteralPattern", literal, loc: startLoc };
        }

        // Constructor pattern or variable pattern
        if (this.check("IDENTIFIER")) {
            const nameToken = this.advance();
            const name = nameToken.value as string;

            // Check for null literal
            if (name === "null") {
                return { kind: "LiteralPattern", literal: null, loc: startLoc };
            }

            // Constructor pattern: PascalCase identifier followed by (
            // Variable pattern: camelCase identifier (or PascalCase without args)
            const firstChar = name.charAt(0);
            const isPascalCase = firstChar >= "A" && firstChar <= "Z";

            if (isPascalCase && this.check("LPAREN")) {
                // Constructor pattern with arguments: Constructor(arg1, arg2, ...)
                this.advance(); // consume (

                const args: Pattern[] = [];

                if (!this.check("RPAREN")) {
                    do {
                        args.push(this.parsePattern());
                    } while (this.match("COMMA"));
                }

                this.expect("RPAREN", "Expected ')' after constructor pattern arguments");

                return {
                    kind: "ConstructorPattern",
                    constructor: name,
                    args,
                    loc: startLoc,
                };
            }

            // Variable pattern (including PascalCase without args - treated as variable)
            return { kind: "VarPattern", name, loc: startLoc };
        }

        // Record pattern: { field1, field2: pattern, ... }
        if (this.check("LBRACE")) {
            this.advance(); // consume {

            const fields: RecordPatternField[] = [];

            if (!this.check("RBRACE")) {
                do {
                    const fieldNameToken = this.expect("IDENTIFIER", "Expected field name in record pattern");
                    const fieldName = fieldNameToken.value as string;

                    // Check for field rename: { field: pattern }
                    if (this.match("COLON")) {
                        const pattern = this.parsePattern();
                        fields.push({
                            name: fieldName,
                            pattern,
                            loc: fieldNameToken.loc,
                        });
                    } else {
                        // Field binding: { field } is shorthand for { field: field }
                        fields.push({
                            name: fieldName,
                            pattern: { kind: "VarPattern", name: fieldName, loc: fieldNameToken.loc },
                            loc: fieldNameToken.loc,
                        });
                    }
                } while (this.match("COMMA"));
            }

            this.expect("RBRACE", "Expected '}' after record pattern");

            return { kind: "RecordPattern", fields, loc: startLoc };
        }

        // List pattern: [elem1, elem2, ...rest]
        if (this.check("LBRACKET")) {
            this.advance(); // consume [

            const elements: Pattern[] = [];
            let rest: Pattern | undefined;

            if (!this.check("RBRACKET")) {
                while (true) {
                    // Check for rest pattern: ...rest or ..._
                    if (this.check("DOT_DOT_DOT")) {
                        this.advance(); // consume ...

                        // Parse rest pattern (can be variable or wildcard)
                        rest = this.parsePrimaryPattern();

                        // Rest must be the last element
                        break;
                    }

                    elements.push(this.parsePattern());

                    if (!this.match("COMMA")) {
                        break;
                    }
                }
            }

            this.expect("RBRACKET", "Expected ']' after list pattern");

            const listPattern: {
                kind: "ListPattern";
                elements: Pattern[];
                rest?: Pattern;
                loc: Location;
            } = {
                kind: "ListPattern",
                elements,
                loc: startLoc,
            };

            // Only add rest if it exists (exactOptionalPropertyTypes)
            if (rest !== undefined) {
                listPattern.rest = rest;
            }

            return listPattern;
        }

        throw this.error(
            "Expected pattern",
            startLoc,
            "Expected a pattern (variable, wildcard, literal, constructor, record, or list)",
        );
    }

    // =========================================================================
    // Type Expression Parsing
    // =========================================================================

    /**
     * Parse a type expression (with union support)
     * Syntax: type ('|' type)*
     * Note: VariantType is constructed in type declarations, not type expressions
     */
    parseTypeExpr(): TypeExpr {
        const types: TypeExpr[] = [this.parseFunctionType()];

        // Check for union separators
        while (this.check("PIPE")) {
            // Lookahead to check if this is a union separator
            const nextToken = this.peek(1);
            if (nextToken.type === "IDENTIFIER" || nextToken.type === "LPAREN" || nextToken.type === "LBRACE") {
                this.advance(); // consume |
                types.push(this.parseFunctionType());
            } else {
                break; // Not a union separator
            }
        }

        if (types.length === 1) {
            const type = types[0];
            if (!type) {
                throw new ParserError("Internal error: empty types array", this.peek().loc);
            }
            return type;
        }

        const firstType = types[0];
        if (!firstType) {
            throw new ParserError("Internal error: empty types array", this.peek().loc);
        }

        return {
            kind: "UnionType",
            types,
            loc: firstType.loc,
        };
    }

    /**
     * Parse function type
     * Syntax: type '->' type  or  (type, type, ...) -> type
     */
    private parseFunctionType(): TypeExpr {
        const left = this.parsePrimaryType();

        // Check for function type arrow
        if (this.check("ARROW")) {
            this.advance(); // consume ->

            // Left side becomes parameter(s)
            const params: TypeExpr[] = left.kind === "UnionType" ? left.types : [left];
            const return_ = this.parseFunctionType(); // Right-associative

            return {
                kind: "FunctionType",
                params,
                return_,
                loc: left.loc,
            };
        }

        return left;
    }

    /**
     * Parse primary type (variables, constants, applications, records, parenthesized)
     */
    private parsePrimaryType(): TypeExpr {
        const startLoc = this.peek().loc;

        // Parenthesized type or tuple-style function params: (T) or (T, U, V) -> R
        if (this.check("LPAREN")) {
            this.advance(); // consume (

            if (this.check("RPAREN")) {
                // Unit type: ()
                this.advance();
                return { kind: "TypeConst", name: "Unit", loc: startLoc };
            }

            const types: TypeExpr[] = [];
            do {
                types.push(this.parseTypeExpr());
            } while (this.match("COMMA"));

            this.expect("RPAREN", "Expected ')' after type");

            // If single type, return it; if multiple, return UnionType (will be converted to params if followed by ->)
            if (types.length === 1) {
                const type = types[0];
                if (!type) {
                    throw new ParserError("Internal error: empty types array", this.peek().loc);
                }
                return type;
            }

            return {
                kind: "UnionType",
                types,
                loc: startLoc,
            };
        }

        // Record type: { field: Type, ... }
        if (this.check("LBRACE")) {
            this.advance(); // consume {

            const fields: RecordTypeField[] = [];

            if (!this.check("RBRACE")) {
                do {
                    const fieldNameToken = this.expect("IDENTIFIER", "Expected field name in record type");
                    const fieldName = fieldNameToken.value as string;

                    this.expect("COLON", "Expected ':' after field name in record type");

                    const typeExpr = this.parseTypeExpr();

                    fields.push({
                        name: fieldName,
                        typeExpr,
                        loc: fieldNameToken.loc,
                    });
                } while (this.match("COMMA"));
            }

            this.expect("RBRACE", "Expected '}' after record type");

            return { kind: "RecordType", fields, loc: startLoc };
        }

        // Type variable or type constant
        if (this.check("IDENTIFIER")) {
            const token = this.advance();
            const name = token.value as string;

            // Type application: List<T>, Option<Int>, Map<K, V>
            if (this.check("LT")) {
                this.advance(); // consume <

                const args: TypeExpr[] = [];
                do {
                    args.push(this.parseTypeExpr());
                } while (this.match("COMMA"));

                // Handle >> as two > tokens for nested generics
                if (this.check("GT_GT")) {
                    // Split >> into > and >
                    // Consume one > and leave the other for the outer type application
                    const token = this.advance();
                    // Insert a synthetic GT token for the outer level
                    this.tokens.splice(this.current, 0, {
                        type: "GT",
                        value: ">",
                        loc: token.loc,
                    });
                } else {
                    this.expect("GT", "Expected '>' after type arguments");
                }

                // Constructor is the identifier we just parsed
                const constructor: TypeExpr = {
                    kind: "TypeConst",
                    name,
                    loc: token.loc,
                };

                return {
                    kind: "TypeApp",
                    constructor,
                    args,
                    loc: startLoc,
                };
            }

            // Check if constructor with args (for variant types): Some(T)
            if (this.check("LPAREN")) {
                this.advance(); // consume (

                const args: TypeExpr[] = [];

                if (!this.check("RPAREN")) {
                    do {
                        args.push(this.parseTypeExpr());
                    } while (this.match("COMMA"));
                }

                this.expect("RPAREN", "Expected ')' after constructor arguments");

                // This is TypeApp with TypeConst constructor
                const constructor: TypeExpr = {
                    kind: "TypeConst",
                    name,
                    loc: token.loc,
                };

                return {
                    kind: "TypeApp",
                    constructor,
                    args,
                    loc: startLoc,
                };
            }

            // Determine if type variable or type constant by case
            // Type variables: lowercase (a, t, elem)
            // Type constants: PascalCase (Int, String, List)
            const firstChar = name.charAt(0);
            const isTypeVar = firstChar >= "a" && firstChar <= "z";

            if (isTypeVar) {
                return { kind: "TypeVar", name, loc: token.loc };
            } else {
                return { kind: "TypeConst", name, loc: token.loc };
            }
        }

        throw this.error(
            "Expected type expression",
            startLoc,
            "Expected a type (variable, constant, function type, record type, or parenthesized type)",
        );
    }

    // =========================================================================
    // Declaration Parsing
    // =========================================================================

    /**
     * Parse a top-level declaration
     */
    private parseDeclaration(): Declaration {
        // Check for export modifier
        let exported = false;
        if (this.check("KEYWORD") && this.peek().value === "export") {
            exported = true;
            this.advance(); // consume 'export'
        }

        // Skip newlines
        while (this.match("NEWLINE"));

        if (!this.check("KEYWORD")) {
            throw this.error("Expected declaration keyword", this.peek().loc);
        }

        const keyword = this.peek().value as string;

        switch (keyword) {
            case "let":
                return this.parseLetDecl(exported);
            case "type":
                return this.parseTypeDecl(exported);
            case "external":
                return this.parseExternalDeclOrBlock(exported);
            case "import":
                return this.parseImportDecl();
            default:
                throw this.error(`Unexpected keyword in declaration: ${keyword}`, this.peek().loc);
        }
    }

    /**
     * Parse let declaration
     * Syntax: let [mut] [rec] pattern [: type] = expr
     */
    private parseLetDecl(exported: boolean): Declaration {
        const startLoc = this.peek().loc;
        this.advance(); // consume 'let'

        // Check for modifiers
        let mutable = false;
        let recursive = false;

        while (this.check("KEYWORD")) {
            const mod = this.peek().value as string;
            if (mod === "mut" && !mutable) {
                mutable = true;
                this.advance();
            } else if (mod === "rec" && !recursive) {
                recursive = true;
                this.advance();
            } else {
                break;
            }
        }

        // Parse pattern (left side of =)
        const pattern = this.parsePattern();

        // Optional type annotation
        if (this.match("COLON")) {
            // Skip type annotation for now (will be used by type checker)
            this.parseTypeExpr();
        }

        // Expect =
        this.expect("EQ", "Expected '=' after let pattern");

        // Parse value expression
        const value = this.parseExpression();

        return {
            kind: "LetDecl",
            pattern,
            value,
            mutable,
            recursive,
            exported,
            loc: startLoc,
        };
    }

    /**
     * Parse type declaration
     * Syntax: type Name<T, U> = definition
     */
    private parseTypeDecl(exported: boolean): Declaration {
        const startLoc = this.peek().loc;
        this.advance(); // consume 'type'

        // Parse type name
        const nameToken = this.expect("IDENTIFIER", "Expected type name");
        const name = nameToken.value as string;

        // Parse type parameters: <T, U, V>
        const params: string[] = [];
        if (this.match("LT")) {
            do {
                const paramToken = this.expect("IDENTIFIER", "Expected type parameter");
                params.push(paramToken.value as string);
            } while (this.match("COMMA"));

            // Handle >> as two > tokens for nested generics
            if (this.check("GT_GT")) {
                const token = this.advance();
                this.tokens.splice(this.current, 0, {
                    type: "GT",
                    value: ">",
                    loc: token.loc,
                });
            } else {
                this.expect("GT", "Expected '>' after type parameters");
            }
        }

        // Expect =
        this.expect("EQ", "Expected '=' after type name");

        // Parse type definition
        const definition = this.parseTypeDefinition();

        return {
            kind: "TypeDecl",
            name,
            params,
            definition,
            exported,
            loc: startLoc,
        };
    }

    /**
     * Parse type definition (alias, record, or variant)
     */
    private parseTypeDefinition(): TypeDefinition {
        const startLoc = this.peek().loc;

        // Record type: { ... }
        if (this.check("LBRACE")) {
            this.advance(); // consume {

            const fields: RecordTypeField[] = [];

            if (!this.check("RBRACE")) {
                do {
                    const fieldNameToken = this.expect("IDENTIFIER", "Expected field name");
                    const fieldName = fieldNameToken.value as string;

                    this.expect("COLON", "Expected ':' after field name");

                    const typeExpr = this.parseTypeExpr();

                    fields.push({
                        name: fieldName,
                        typeExpr,
                        loc: fieldNameToken.loc,
                    });
                } while (this.match("COMMA"));
            }

            this.expect("RBRACE", "Expected '}' after record type fields");

            return {
                kind: "RecordTypeDef",
                fields,
                loc: startLoc,
            };
        }

        // Skip newlines after = sign
        while (this.match("NEWLINE"));

        // Check for optional leading pipe (for multiline variant syntax)
        // type Result<t, e> =
        //     | Ok(t)
        //     | Err(e)
        if (this.check("PIPE")) {
            this.advance(); // consume leading |
            // Skip newlines after pipe
            while (this.match("NEWLINE"));
        }

        // Variant or alias - parse first constructor/type
        const firstType = this.parseFunctionType();

        // Check if this is a variant type (has | separator)
        if (this.check("PIPE")) {
            // Variant type: Constructor1(T) | Constructor2(U) | ...
            const constructors: VariantConstructor[] = [];

            // Process first constructor
            if (firstType.kind === "TypeApp" && firstType.constructor.kind === "TypeConst") {
                // Constructor with args: Some(T)
                constructors.push({
                    name: (firstType.constructor as Extract<TypeExpr, { kind: "TypeConst" }>).name,
                    args: firstType.args,
                    loc: firstType.loc,
                });
            } else if (firstType.kind === "TypeConst") {
                // Nullary constructor: None
                constructors.push({
                    name: firstType.name,
                    args: [],
                    loc: firstType.loc,
                });
            } else {
                throw this.error("Expected constructor in variant type", firstType.loc);
            }

            // Parse remaining constructors
            while (this.match("PIPE")) {
                // Skip optional newlines
                while (this.match("NEWLINE"));

                const constrType = this.parseFunctionType();

                if (constrType.kind === "TypeApp" && constrType.constructor.kind === "TypeConst") {
                    constructors.push({
                        name: (constrType.constructor as Extract<TypeExpr, { kind: "TypeConst" }>).name,
                        args: constrType.args,
                        loc: constrType.loc,
                    });
                } else if (constrType.kind === "TypeConst") {
                    constructors.push({
                        name: constrType.name,
                        args: [],
                        loc: constrType.loc,
                    });
                } else {
                    throw this.error("Expected constructor in variant type", constrType.loc);
                }
            }

            return {
                kind: "VariantTypeDef",
                constructors,
                loc: startLoc,
            };
        }

        // Type alias: type Alias = OtherType
        return {
            kind: "AliasType",
            typeExpr: firstType,
            loc: startLoc,
        };
    }

    /**
     * Parse external declaration or block
     * Syntax: external name: type = "jsName" [from "module"]
     *         external { ... }
     *         external from "module" { ... }
     */
    private parseExternalDeclOrBlock(exported: boolean): Declaration {
        const startLoc = this.peek().loc;
        this.advance(); // consume 'external'

        // Check for block syntax
        if (this.check("LBRACE")) {
            this.advance(); // consume '{'
            return this.parseExternalBlock(exported, startLoc, undefined);
        }

        // Check for "from" clause before block
        if (this.check("KEYWORD") && this.peek().value === "from") {
            this.advance(); // consume 'from'
            const moduleToken = this.expect("STRING_LITERAL", "Expected module name after 'from'");
            const from = moduleToken.value as string;

            // Must be followed by block
            this.expect("LBRACE", "Expected '{' after 'from \"module\"'");
            return this.parseExternalBlock(exported, startLoc, from);
        }

        // Single external declaration
        return this.parseExternalDecl(exported, startLoc);
    }

    /**
     * Parse single external declaration
     * Syntax: name: type = "jsName" [from "module"]
     * Note: 'external' keyword already consumed by caller
     */
    private parseExternalDecl(exported: boolean, startLoc: Location): Declaration {
        // Parse name
        const nameToken = this.expect("IDENTIFIER", "Expected external name");
        const name = nameToken.value as string;

        // Expect :
        this.expect("COLON", "Expected ':' after external name");

        // Parse type
        const typeExpr = this.parseTypeExpr();

        // Expect =
        this.expect("EQ", "Expected '=' after external type");

        // Parse JS name (string literal)
        const jsNameToken = this.expect("STRING_LITERAL", "Expected string literal for JS name");
        const jsName = jsNameToken.value as string;

        // Optional: from "module"
        let from: string | undefined;
        if (this.check("KEYWORD") && this.peek().value === "from") {
            this.advance(); // consume 'from'
            const moduleToken = this.expect("STRING_LITERAL", "Expected module name");
            from = moduleToken.value as string;
        }

        return {
            kind: "ExternalDecl",
            name,
            typeExpr,
            jsName,
            ...(from !== undefined && { from }),
            exported,
            loc: startLoc,
        };
    }

    /**
     * Parse external block
     * Syntax: item1, item2, ...
     * Note: '{' already consumed by caller, this parses items until '}'
     */
    private parseExternalBlock(exported: boolean, startLoc: Location, from: string | undefined): Declaration {
        // '{' already consumed by caller, parse items until '}'

        const items: ExternalBlockItem[] = [];

        // Skip leading newlines
        while (this.match("NEWLINE"));

        // Parse items until we hit }
        while (!this.check("RBRACE") && !this.isAtEnd()) {
            // Skip newlines between items
            while (this.match("NEWLINE"));

            if (this.check("RBRACE")) break;

            // Parse item (value or type)
            const item = this.parseExternalBlockItem();
            items.push(item);

            // Newlines act as separators (like record syntax)
            while (this.match("NEWLINE"));
        }

        this.expect("RBRACE", "Expected '}' after external block");

        return {
            kind: "ExternalBlock",
            items,
            ...(from !== undefined && { from }),
            exported,
            loc: startLoc,
        };
    }

    /**
     * Parse external block item (value or type)
     * Syntax: name: type = "jsName"
     *         type Name = TypeExpr
     */
    private parseExternalBlockItem(): ExternalBlockItem {
        const startLoc = this.peek().loc;

        // Check for "type" keyword (external type)
        if (this.check("KEYWORD") && this.peek().value === "type") {
            this.advance(); // consume 'type'

            // Parse type name
            const nameToken = this.expect("IDENTIFIER", "Expected type name");
            const name = nameToken.value as string;

            // Expect =
            this.expect("EQ", "Expected '=' after type name");

            // Parse type expression
            const typeExpr = this.parseTypeExpr();

            return {
                kind: "ExternalType",
                name,
                typeExpr,
                loc: startLoc,
            };
        }

        // External value: name: type = "jsName"
        const nameToken = this.expect("IDENTIFIER", "Expected name");
        const name = nameToken.value as string;

        // Expect :
        this.expect("COLON", "Expected ':' after name");

        // Parse type
        const typeExpr = this.parseTypeExpr();

        // Expect =
        this.expect("EQ", "Expected '=' after type");

        // Parse JS name (string literal)
        const jsNameToken = this.expect("STRING_LITERAL", "Expected string literal for JS name");
        const jsName = jsNameToken.value as string;

        return {
            kind: "ExternalValue",
            name,
            typeExpr,
            jsName,
            loc: startLoc,
        };
    }

    /**
     * Parse import declaration
     * Syntax: import { name, type T, name as alias } from "module"
     *         import * as Name from "module"
     */
    private parseImportDecl(): Declaration {
        const startLoc = this.peek().loc;
        this.advance(); // consume 'import'

        const items: ImportItem[] = [];

        // import * as Name
        if (this.match("STAR")) {
            this.expect("KEYWORD", "Expected 'as' after '*'");
            if (this.peek(-1).value !== "as") {
                throw this.error("Expected 'as' after '*'", this.peek(-1).loc);
            }

            const aliasToken = this.expect("IDENTIFIER", "Expected alias name");
            const alias = aliasToken.value as string;

            items.push({
                name: "*",
                alias,
                isType: false,
            });
        }
        // import { ... }
        else if (this.match("LBRACE")) {
            do {
                // Check for type import
                let isType = false;
                if (this.check("KEYWORD") && this.peek().value === "type") {
                    isType = true;
                    this.advance();
                }

                const nameToken = this.expect("IDENTIFIER", "Expected import name");
                const name = nameToken.value as string;

                // Optional: as alias
                let alias: string | undefined;
                if (this.check("KEYWORD") && this.peek().value === "as") {
                    this.advance(); // consume 'as'
                    const aliasToken = this.expect("IDENTIFIER", "Expected alias name");
                    alias = aliasToken.value as string;
                }

                items.push({ name, ...(alias !== undefined && { alias }), isType });
            } while (this.match("COMMA"));

            this.expect("RBRACE", "Expected '}' after import items");
        } else {
            throw this.error("Expected '{' or '*' after 'import'", this.peek().loc);
        }

        // Expect from
        this.expect("KEYWORD", "Expected 'from' after import items");
        if (this.peek(-1).value !== "from") {
            throw this.error("Expected 'from' keyword", this.peek(-1).loc);
        }

        // Parse module path
        const fromToken = this.expect("STRING_LITERAL", "Expected module path");
        const from = fromToken.value as string;

        return {
            kind: "ImportDecl",
            items,
            from,
            loc: startLoc,
        };
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
