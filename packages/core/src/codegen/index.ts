/**
 * Code generator module - transforms typed Core AST to JavaScript
 *
 * This module provides the main entry point for code generation.
 * Currently supports ES2020 target. Future versions may support additional targets.
 */

import type { TypedModule } from "../typechecker/typechecker.js";

import { generate as generateES2020 } from "./es2020/index.js";

/**
 * Supported ES targets
 * Currently only ES2020 is supported.
 */
export type ESTarget = "es2020";

/**
 * Options for code generation
 */
export interface GenerateOptions {
    /** Source filename (for output comments) */
    readonly filename?: string;

    /** Target ES version (default: "es2020") */
    readonly target?: ESTarget;
}

/**
 * Result of code generation
 */
export interface GenerateResult {
    /** The generated JavaScript code */
    readonly code: string;
}

/**
 * Generate JavaScript from a typed module
 *
 * @param typedModule - The type-checked module to generate code for
 * @param options - Code generation options
 * @returns Generated JavaScript code
 *
 * @example
 * ```typescript
 * const typedModule = typeCheck(desugarModule(parsedModule));
 * const { code } = generate(typedModule, { filename: "main.vf" });
 * fs.writeFileSync("main.js", code);
 * ```
 */
export function generate(typedModule: TypedModule, options?: GenerateOptions): GenerateResult {
    const target = options?.target ?? "es2020";

    switch (target) {
        case "es2020":
            return generateES2020(typedModule, options?.filename ? { filename: options.filename } : undefined);

        default: {
            // Exhaustiveness check
            const _exhaustive: never = target;
            throw new Error(`Internal error: Unknown ES target: ${_exhaustive}`);
        }
    }
}

// Re-export ES2020 types for convenience
export type { EmitContext } from "./es2020/index.js";
