/**
 * Parser Helper Functions
 *
 * Utility functions for ASI (Automatic Semicolon Insertion) and other parser logic.
 */

import type { TokenType } from "../types/token.js";
import type { ParserBase } from "./parser-base.js";

// =========================================================================
// Automatic Semicolon Insertion (ASI)
// =========================================================================

/**
 * Check if a semicolon should be automatically inserted
 * Rules:
 * - Never insert inside record literals (inRecordContext = true)
 * - Never insert before => (allows newlines before arrow in lambdas)
 * - Must be on different lines
 * - Don't insert if previous token continues expression
 * - Don't insert if current token continues line
 * - Insert if current token starts new statement
 */
export function shouldInsertSemicolon(parser: ParserBase): boolean {
    // Access protected members via type assertion
    const p = parser as unknown as {
        current: number;
        inRecordContext: boolean;
        peek(offset?: number): { loc: { line: number }; type: TokenType; value: unknown };
    };

    if (p.current === 0) return false;

    // NEVER insert semicolons inside record literals
    if (p.inRecordContext) return false;

    const prev = p.peek(-1);
    const curr = p.peek();

    // Must be on different lines
    if (curr.loc.line <= prev.loc.line) return false;

    // Don't insert before arrow (allows newlines before =>)
    // Supports: (x, y)\n=> body and x\n=> body
    if (curr.type === "FAT_ARROW") return false;

    // Previous token prevents insertion (expression continues)
    if (isExpressionContinuation(prev.type, prev.value)) return false;

    // Current token prevents insertion (line continuation)
    if (isLineContinuation(curr.type)) return false;

    // Current token triggers insertion (new statement)
    if (isStatementStart(parser, curr.type)) return true;

    // Check for closing delimiter (also triggers)
    if (curr.type === "RBRACE") return true;

    // Default: insert semicolon on new line
    return true;
}

/**
 * Check if a token type continues an expression (prevents ASI after it)
 */
function isExpressionContinuation(type: TokenType, value: unknown): boolean {
    return (
        type === "OP_PLUS" ||
        type === "OP_MINUS" ||
        type === "OP_STAR" ||
        type === "OP_SLASH" ||
        type === "OP_PERCENT" ||
        type === "OP_AMPERSAND" ||
        type === "OP_AND" ||
        type === "OP_OR" ||
        type === "OP_PIPE_GT" ||
        type === "OP_GT_GT" ||
        type === "OP_LT_LT" ||
        type === "DOT" ||
        type === "LPAREN" ||
        type === "COMMA" ||
        (type === "KEYWORD" && (value === "then" || value === "else"))
    );
}

/**
 * Check if a token type continues a line (prevents ASI before it)
 */
function isLineContinuation(type: TokenType): boolean {
    return (
        type === "OP_PLUS" ||
        type === "OP_MINUS" ||
        type === "OP_STAR" ||
        type === "OP_SLASH" ||
        type === "OP_PERCENT" ||
        type === "OP_AMPERSAND" ||
        type === "OP_AND" ||
        type === "OP_OR" ||
        type === "OP_PIPE_GT" ||
        type === "OP_GT_GT" ||
        type === "OP_LT_LT" ||
        type === "DOT" ||
        type === "COMMA"
    );
}

/**
 * Check if a token type starts a new statement (triggers ASI)
 */
function isStatementStart(parser: ParserBase, type: TokenType): boolean {
    if (type === "KEYWORD") {
        const keyword = parser.peek().value as string;
        return ["let", "type", "match", "if", "external", "import", "export", "while"].includes(keyword);
    }
    return false;
}
