/**
 * Shared test helpers for expression parsing tests
 */

import { Lexer } from "../lexer/index.js";
import { Parser } from "./parser.js";

/**
 * Helper to create a parser and parse an expression
 */
export function parseExpression(source: string) {
    const lexer = new Lexer(source, "test.vf");
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens, "test.vf");
    return parser.parseExpression();
}
