/**
 * Expression Parsing Module - Aggregator
 *
 * Wires together all expression parsing modules with dependency injection
 * to avoid circular dependencies.
 */

import type { Expr, Location, Pattern, TypeExpr } from "../types/index.js";
import type { ParserBase } from "./parser-base.js";

import * as Complex from "./parse-expression-complex.js";
import * as Lambda from "./parse-expression-lambda.js";
import * as Operators from "./parse-expression-operators.js";
import * as Primary from "./parse-expression-primary.js";

// Forward declarations for pattern and type parsing (injected from parser.ts)
// Initialized to error-throwing functions for type safety and better error messages
let parsePattern: (parser: ParserBase) => Pattern = () => {
    throw new Error("parsePattern not initialized - setParsePattern must be called first");
};
let parseTypeExpr: (parser: ParserBase) => TypeExpr = () => {
    throw new Error("parseTypeExpr not initialized - setParseTypeExpr must be called first");
};

/**
 * Set the pattern parsing function (called during initialization from parser.ts)
 */
export function setParsePattern(fn: (parser: ParserBase) => Pattern): void {
    parsePattern = fn;
}

/**
 * Set the type expression parsing function (called during initialization from parser.ts)
 */
export function setParseTypeExpr(fn: (parser: ParserBase) => TypeExpr): void {
    parseTypeExpr = fn;
}

/**
 * Initialize all dependency injection for expression parsing modules
 * This must be called before using any expression parsing functions
 */
function initializeDependencies(): void {
    // Wire up Primary module
    Primary.setComplexParsers({
        parseLambdaOrParen: Lambda.parseLambdaOrParen,
        parseMatchExpr: Complex.parseMatchExpr,
        parseRecordExpr: Complex.parseRecordExpr,
        parseBlockExpr: Complex.parseBlockExpr,
        parseLetExpr: Complex.parseLetExpr,
        parseExpression: Operators.parseExpression,
    });

    // Wire up Operators module
    Operators.setParsePrimary(Primary.parsePrimary);
    Operators.setParseTypeExpr(parseTypeExpr);

    // Wire up Lambda module
    Lambda.setDependencies({
        parsePattern,
        parseTypeExpr,
        parseExpression: Operators.parseExpression,
        parseLambda: Operators.parseLambda,
    });

    // Wire up Complex module
    Complex.setDependencies({
        parsePattern,
        parseTypeExpr,
        parseExpression: Operators.parseExpression,
        parseLogicalOr: Operators.parseLogicalOr,
    });
}

// Track initialization state
let initialized = false;

// Initialize dependencies immediately when module loads
// This ensures all functions are wired up before any parsing happens
function initializeOnce(): void {
    if (!initialized) {
        initializeDependencies();
        initialized = true;
    }
}

/**
 * Parse an expression
 * Entry point for expression parsing with operator precedence
 */
export function parseExpression(parser: ParserBase): Expr {
    initializeOnce();
    return Operators.parseExpression(parser);
}

/**
 * Parse block expression (exported for use by while loops, etc.)
 * Syntax: { expr; expr; ... result }
 */
export function parseBlockExpr(parser: ParserBase, startLoc: Location): Expr {
    initializeOnce();
    return Complex.parseBlockExpr(parser, startLoc);
}
