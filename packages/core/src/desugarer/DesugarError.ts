/**
 * Error thrown during desugaring
 */

import type { Location } from "../types/ast.js";

export class DesugarError extends Error {
    constructor(
        message: string,
        public loc: Location,
        public hint?: string,
    ) {
        super(message);
        this.name = "DesugarError";
    }

    /**
     * Format the error with location information
     */
    format(): string {
        const { file, line, column } = this.loc;
        const parts = [`Error: ${this.message}`, `  at ${file}:${line}:${column}`];

        if (this.hint) {
            parts.push(`  Hint: ${this.hint}`);
        }

        return parts.join("\n");
    }
}
