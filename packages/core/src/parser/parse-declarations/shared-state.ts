/**
 * Shared DI state for the parse-declarations sub-modules.
 *
 * The parser wires expression, pattern, and type-expression parsing via
 * setter functions (the cycle is broken by initializing these at parser
 * boot). Sub-files call the getter wrappers below, keeping the mutable
 * function references private to this module.
 */

import type { Expr, Pattern, TypeExpr } from "../../types/index.js";
import type { ParserBase } from "../parser-base.js";

// Forward declarations for circular dependencies. Each arrow stub is a
// load-bearing safety net that only fires if parser.ts forgot to wire the
// corresponding setter before parsing begins — unreachable in practice,
// so excluded from coverage counting.
/* v8 ignore next 3 */
let _parseExpression: (parser: ParserBase) => Expr = () => {
    throw new Error("parseExpression not initialized - setParseExpression must be called first");
};
/* v8 ignore next 3 */
let _parsePattern: (parser: ParserBase) => Pattern = () => {
    throw new Error("parsePattern not initialized - setParsePattern must be called first");
};
/* v8 ignore next 3 */
let _parseTypeExpr: (parser: ParserBase) => TypeExpr = () => {
    throw new Error("parseTypeExpr not initialized - setParseTypeExpr must be called first");
};
/* v8 ignore next 3 */
let _parseFunctionType: (parser: ParserBase) => TypeExpr = () => {
    throw new Error("parseFunctionType not initialized - setParseFunctionType must be called first");
};

/**
 * Set the expression parsing function (called during initialization)
 */
export function setParseExpression(fn: typeof _parseExpression): void {
    _parseExpression = fn;
}

/**
 * Set the pattern parsing function (called during initialization)
 */
export function setParsePattern(fn: typeof _parsePattern): void {
    _parsePattern = fn;
}

/**
 * Set the type expression parsing function (called during initialization)
 */
export function setParseTypeExpr(fn: typeof _parseTypeExpr): void {
    _parseTypeExpr = fn;
}

/**
 * Set the function type parsing function (called during initialization)
 * This is needed for type definitions which need to parse function types directly
 */
export function setParseFunctionType(fn: typeof _parseFunctionType): void {
    _parseFunctionType = fn;
}

/**
 * Parse an expression via the injected expression parser.
 */
export function parseExpression(parser: ParserBase): Expr {
    return _parseExpression(parser);
}

/**
 * Parse a pattern via the injected pattern parser.
 */
export function parsePattern(parser: ParserBase): Pattern {
    return _parsePattern(parser);
}

/**
 * Parse a type expression via the injected type-expression parser.
 */
export function parseTypeExpr(parser: ParserBase): TypeExpr {
    return _parseTypeExpr(parser);
}

/**
 * Parse a function type via the injected function-type parser.
 */
export function parseFunctionType(parser: ParserBase): TypeExpr {
    return _parseFunctionType(parser);
}
