// export * from "./parser.js";
// export * from "./desugarer.js";
// export * from "./typechecker.js";
// export * from "./modules.js";
// export * from "./codegen.js";

import { registerLexerCodes } from "./lexer.js";

/**
 * Aggregate exports for all diagnostic code definitions
 *
 * This module exports all VFxxxx diagnostic definitions organized by compiler phase.
 * Each phase has its own file with codes in the assigned range.
 *
 * Code Ranges:
 * - VF1xxx: Lexer (VF1000-VF1899 errors, VF1900-VF1999 warnings)
 * - VF2xxx: Parser (VF2000-VF2899 errors, VF2900-VF2999 warnings)
 * - VF3xxx: Desugarer (VF3000-VF3899 errors, VF3900-VF3999 warnings)
 * - VF4xxx: Type System (VF4000-VF4899 errors, VF4900-VF4999 warnings)
 * - VF5xxx: Module System (VF5000-VF5899 errors, VF5900-VF5999 warnings)
 * - VF6xxx: Code Generator (VF6000-VF6899 errors, VF6900-VF6999 warnings)
 * - VF7xxx: Runtime (VF7000-VF7899 errors, VF7900-VF7999 warnings)
 *
 * See codes/README.md for instructions on adding new error codes.
 */

// Phase-specific code exports
export * from "./lexer.js";

let initialized = false;

/**
 * Initialize all diagnostic codes by registering them with the global registry.
 * This function is idempotent and can be called multiple times safely.
 * It's called automatically when importing from diagnostics.
 */
export function initializeDiagnosticCodes(): void {
    if (initialized) return;
    initialized = true;

    registerLexerCodes();
    // Additional phase registrations will be added as they are implemented
}

// Auto-initialize when this module is imported
initializeDiagnosticCodes();
