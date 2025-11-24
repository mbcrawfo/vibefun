/**
 * Shared test helpers for parser integration tests
 */

import type { Module } from "../types/index.js";

import { Lexer } from "../lexer/index.js";
import { Parser } from "./parser.js";

/**
 * Helper to parse a complete module from source code
 */
export function parseModule(source: string): Module {
    const lexer = new Lexer(source, "test.vf");
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens, "test.vf");
    return parser.parse();
}
