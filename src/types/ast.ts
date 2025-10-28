/**
 * Abstract Syntax Tree (AST) type definitions for Vibefun
 *
 * This module defines location information used throughout the compiler
 * for error reporting and source mapping.
 */

/**
 * Source location information for error reporting and source maps
 */
export type Location = {
    /** Source file path */
    file: string;
    /** Line number (1-indexed) */
    line: number;
    /** Column number (1-indexed) */
    column: number;
    /** Character offset from start of file (0-indexed) */
    offset: number;
};
