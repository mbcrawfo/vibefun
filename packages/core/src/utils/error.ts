/**
 * Error handling and reporting utilities
 */

import type { Location } from "../types/index.js";

/**
 * Base class for all Vibefun compiler errors
 */
export class VibefunError extends Error {
    constructor(
        message: string,
        public readonly location?: Location,
        public readonly help?: string,
    ) {
        super(message);
        this.name = "VibefunError";
    }

    /**
     * Format the error message with location and context
     */
    format(source?: string): string {
        let output = `\nError: ${this.message}\n`;

        if (this.location) {
            const { file, line, column } = this.location;
            output += `  Location: ${file}:${line}:${column}\n`;

            if (source) {
                output += "\n" + this.showSourceContext(source) + "\n";
            }
        }

        if (this.help) {
            output += `\nHelp: ${this.help}\n`;
        }

        return output;
    }

    /**
     * Show source code context with error location highlighted
     */
    private showSourceContext(source: string): string {
        if (!this.location) {
            return "";
        }

        const lines = source.split("\n");
        const { line, column } = this.location;
        const lineIndex = line - 1;

        if (lineIndex < 0 || lineIndex >= lines.length) {
            return "";
        }

        const lineNumber = line.toString().padStart(4, " ");
        const sourceLine = lines[lineIndex];
        if (sourceLine === undefined) {
            return "";
        }

        const pointer = " ".repeat(lineNumber.length + 3 + column - 1) + "^";

        return `${lineNumber} | ${sourceLine}\n${pointer}`;
    }
}

/**
 * Lexer error
 */
export class LexerError extends VibefunError {
    constructor(message: string, location: Location, help?: string) {
        super(message, location, help);
        this.name = "LexerError";
    }
}

/**
 * Parser error
 */
export class ParserError extends VibefunError {
    constructor(message: string, location?: Location, help?: string) {
        super(message, location, help);
        this.name = "ParserError";
    }
}

/**
 * Type error
 */
export class TypeError extends VibefunError {
    constructor(message: string, location?: Location, help?: string) {
        super(message, location, help);
        this.name = "TypeError";
    }
}

/**
 * Compilation error
 */
export class CompilationError extends VibefunError {
    constructor(message: string, location?: Location, help?: string) {
        super(message, location, help);
        this.name = "CompilationError";
    }
}

/**
 * Runtime error
 */
export class RuntimeError extends VibefunError {
    constructor(message: string, location?: Location, help?: string) {
        super(message, location, help);
        this.name = "RuntimeError";
    }
}
