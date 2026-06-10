/**
 * Variable reference emission for ES2020 code generation.
 */

import type { EmitContext } from "../context.js";

import { markNeedsPanicHelper } from "../context.js";
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

    // The `panic` builtin has no JS global behind it — map it to the gated
    // $panic runtime helper. The builtin-location check keeps a user
    // binding that shadows the name untouched. [BUG: VF-FC-0006]
    if (name === "panic" && binding?.kind === "Value" && binding.loc.file === "<builtin>") {
        markNeedsPanicHelper(ctx);
        return "$panic";
    }

    if (binding) {
        if (binding.kind === "External" || binding.kind === "ExternalOverload") {
            // Wrapped externals (multi-param calling convention and/or
            // Option-return marshalling — see emitExternalDecl) are
            // referenced by their vibefun name instead of inlining the
            // raw jsName.
            if (ctx.shared.wrappedExternals.has(name)) {
                return escapeIdentifier(name);
            }
            // Use the JavaScript name instead of the vibefun name
            // Don't escape external JS names (they may be dotted like Math.floor)
            return binding.jsName;
        }
    }

    // Regular variable - escape if reserved
    return escapeIdentifier(name);
}
