/**
 * ES2020 Code Generator
 *
 * Generates ES2020-compatible JavaScript from typed Vibefun Core AST.
 *
 * @module codegen/es2020
 */

// Re-export public types and functions from generator
export { generate, type GenerateOptions, type GenerateResult } from "./generator.js";

// Re-export utilities for advanced usage
export { createContext, type EmitContext } from "./context.js";
export { escapeIdentifier, isReservedWord, RESERVED_WORDS } from "./reserved-words.js";
export {
    ATOM_PRECEDENCE,
    CALL_PRECEDENCE,
    getBinaryPrecedence,
    getUnaryPrecedence,
    JS_BINARY_OP,
    JS_UNARY_OP,
    MEMBER_PRECEDENCE,
    needsParens,
    PRECEDENCE,
} from "./emit-operators.js";
