/**
 * Variable reference emission for ES2020 code generation.
 */

import type { EmitContext } from "../context.js";

import { escapeIdentifier } from "../reserved-words.js";

/**
 * Emit a variable reference
 *
 * Checks if the variable is an external binding and uses jsName if so.
 * Also escapes reserved words.
 */
export function emitVar(name: string, ctx: EmitContext): string {
    // Check if this is an external binding
    const binding = ctx.env.values.get(name);
    if (binding) {
        if (binding.kind === "External" || binding.kind === "ExternalOverload") {
            // Use the JavaScript name instead of the vibefun name
            // Don't escape external JS names (they may be dotted like Math.floor)
            return binding.jsName;
        }
    }

    // Regular variable - escape if reserved
    return escapeIdentifier(name);
}
