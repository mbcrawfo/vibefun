/**
 * Declaration emission for ES2020 code generation
 *
 * This module handles the emission of all CoreDeclaration nodes to JavaScript.
 */

import type {
    CoreDeclaration,
    CoreExternalDecl,
    CoreImportDecl,
    CoreLetDecl,
    CoreLetRecGroup,
    CorePattern,
    CoreTypeDecl,
    CoreVariantConstructor,
} from "../../types/core-ast.js";
import type { EmitContext } from "./context.js";

import { addExport, getIndent, markNeedsRefHelper, withPrecedence } from "./context.js";
import { escapeIdentifier } from "./reserved-words.js";

// =============================================================================
// Dependency Injection for Circular Dependencies
// =============================================================================

// Forward declaration for expression emission (set by generator.ts)
let emitExprFn: (expr: unknown, ctx: EmitContext) => string = () => {
    throw new Error("emitExprFn not initialized - setEmitExpr must be called first");
};

// Forward declaration for pattern emission (set by generator.ts)
let emitPatternFn: (pattern: unknown, ctx: EmitContext) => string = () => {
    throw new Error("emitPatternFn not initialized - setEmitPattern must be called first");
};

/**
 * Set the expression emission function (called during initialization)
 */
export function setEmitExpr(fn: typeof emitExprFn): void {
    emitExprFn = fn;
}

/**
 * Set the pattern emission function (called during initialization)
 */
export function setEmitPattern(fn: typeof emitPatternFn): void {
    emitPatternFn = fn;
}

// =============================================================================
// Pattern Name Extraction
// =============================================================================

/**
 * Extract all variable names bound by a pattern
 *
 * Used for collecting exports when a declaration uses pattern destructuring.
 * For example: `let (a, b) = tuple` should export both `a` and `b`.
 *
 * @param pattern - The pattern to extract names from
 * @returns Array of bound variable names
 */
export function extractPatternNames(pattern: CorePattern): string[] {
    switch (pattern.kind) {
        case "CoreWildcardPattern":
            return [];

        case "CoreVarPattern":
            return [pattern.name];

        case "CoreLiteralPattern":
            return [];

        case "CoreTuplePattern":
            return pattern.elements.flatMap(extractPatternNames);

        case "CoreRecordPattern":
            return pattern.fields.flatMap((f) => extractPatternNames(f.pattern));

        case "CoreVariantPattern":
            return pattern.args.flatMap(extractPatternNames);

        default: {
            const _exhaustive: never = pattern;
            throw new Error(`Internal error: Unknown pattern kind: ${(_exhaustive as CorePattern).kind}`);
        }
    }
}

// =============================================================================
// Main Declaration Emitter
// =============================================================================

/**
 * Emit a CoreDeclaration to JavaScript code
 *
 * @param decl - The declaration to emit
 * @param ctx - Emission context
 * @returns JavaScript code string (may be empty for type-only declarations)
 */
export function emitDeclaration(decl: CoreDeclaration, ctx: EmitContext): string {
    switch (decl.kind) {
        case "CoreLetDecl":
            return emitLetDecl(decl, ctx);

        case "CoreLetRecGroup":
            return emitLetRecGroup(decl, ctx);

        case "CoreTypeDecl":
            return emitTypeDecl(decl, ctx);

        case "CoreExternalDecl":
            return emitExternalDecl(decl, ctx);

        case "CoreExternalTypeDecl":
            // External type declarations have no runtime representation
            return "";

        case "CoreImportDecl":
            return emitImportDecl(decl, ctx);

        default: {
            const _exhaustive: never = decl;
            throw new Error(`Internal error: Unknown declaration kind: ${(_exhaustive as CoreDeclaration).kind}`);
        }
    }
}

// =============================================================================
// Let Declaration Emission
// =============================================================================

/**
 * Emit a let declaration
 *
 * Handles:
 * - Simple bindings: `const x = value;`
 * - Pattern destructuring: `const [a, b] = tuple;`
 * - Mutable bindings: `const x = { $value: value };`
 * - Recursive bindings: `let f; f = value;` (allows self-reference)
 */
function emitLetDecl(decl: CoreLetDecl, ctx: EmitContext): string {
    const indent = getIndent(ctx);

    // Track mutable ref helper usage
    if (decl.mutable) {
        markNeedsRefHelper(ctx);
    }

    // Collect exports
    if (decl.exported) {
        const names = extractPatternNames(decl.pattern);
        for (const name of names) {
            addExport(ctx, escapeIdentifier(name));
        }
    }

    const patternCode = emitPatternFn(decl.pattern, ctx);
    const valueCode = decl.mutable
        ? `{ $value: ${emitExprFn(decl.value, withPrecedence(ctx, 0))} }`
        : emitExprFn(decl.value, withPrecedence(ctx, 0));

    // For recursive bindings, use let + assignment to allow self-reference
    if (decl.recursive) {
        // For simple variable patterns, we can use let + assignment
        if (decl.pattern.kind === "CoreVarPattern") {
            return `${indent}let ${patternCode};\n${indent}${patternCode} = ${valueCode};`;
        }
        // For complex patterns with recursion, still use const (edge case)
        return `${indent}const ${patternCode} = ${valueCode};`;
    }

    return `${indent}const ${patternCode} = ${valueCode};`;
}

// =============================================================================
// Let Rec Group Emission (Mutual Recursion)
// =============================================================================

/**
 * Emit a mutually recursive let group
 *
 * Uses a two-phase approach for forward references:
 * 1. Declare all names with `let`
 * 2. Assign the values
 *
 * Example:
 * ```javascript
 * let f, g;
 * f = (x) => g(x);
 * g = (x) => f(x);
 * ```
 */
function emitLetRecGroup(decl: CoreLetRecGroup, ctx: EmitContext): string {
    const indent = getIndent(ctx);
    const lines: string[] = [];

    // Collect all names for declaration and export
    const allNames: string[] = [];
    for (const binding of decl.bindings) {
        const names = extractPatternNames(binding.pattern);
        for (const name of names) {
            allNames.push(escapeIdentifier(name));
            if (decl.exported) {
                addExport(ctx, escapeIdentifier(name));
            }
        }
    }

    // Phase 1: Declare all names with let
    lines.push(`${indent}let ${allNames.join(", ")};`);

    // Phase 2: Assign values
    for (const binding of decl.bindings) {
        if (binding.mutable) {
            markNeedsRefHelper(ctx);
        }

        const patternCode = emitPatternFn(binding.pattern, ctx);
        const valueCode = binding.mutable
            ? `{ $value: ${emitExprFn(binding.value, withPrecedence(ctx, 0))} }`
            : emitExprFn(binding.value, withPrecedence(ctx, 0));

        lines.push(`${indent}${patternCode} = ${valueCode};`);
    }

    return lines.join("\n");
}

// =============================================================================
// Type Declaration Emission
// =============================================================================

/**
 * Emit a type declaration
 *
 * Only variant types produce runtime output (constructor functions).
 * Aliases and record types are purely compile-time and produce no output.
 */
function emitTypeDecl(decl: CoreTypeDecl, ctx: EmitContext): string {
    const def = decl.definition;

    switch (def.kind) {
        case "CoreAliasType":
            // Type aliases have no runtime representation
            return "";

        case "CoreRecordTypeDef":
            // Record types have no runtime representation
            return "";

        case "CoreVariantTypeDef":
            return emitVariantConstructors(def.constructors, decl.exported, ctx);

        default: {
            const _exhaustive: never = def;
            throw new Error(`Internal error: Unknown type definition kind: ${(_exhaustive as { kind: string }).kind}`);
        }
    }
}

/**
 * Emit variant constructors
 *
 * Zero-arg: `const None = { $tag: "None" };`
 * One-arg: `const Some = ($$0) => ({ $tag: "Some", $0: $$0 });`
 * Multi-arg: `const Node = ($$0) => ($$1) => ($$2) => ({ $tag: "Node", $0: $$0, $1: $$1, $2: $$2 });`
 */
function emitVariantConstructors(constructors: CoreVariantConstructor[], exported: boolean, ctx: EmitContext): string {
    const indent = getIndent(ctx);
    const lines: string[] = [];

    for (const ctor of constructors) {
        const name = escapeIdentifier(ctor.name);

        if (exported) {
            addExport(ctx, name);
        }

        if (ctor.args.length === 0) {
            // Zero-arg constructor: emit as constant object
            lines.push(`${indent}const ${name} = { $tag: "${ctor.name}" };`);
        } else {
            // Multi-arg constructor: emit as curried function
            const params: string[] = [];
            const fields: string[] = [];

            for (let i = 0; i < ctor.args.length; i++) {
                params.push(`$$${i}`);
                fields.push(`$${i}: $$${i}`);
            }

            // Build curried arrow function chain
            let funcCode = `({ $tag: "${ctor.name}", ${fields.join(", ")} })`;
            for (let i = params.length - 1; i >= 0; i--) {
                funcCode = `(${params[i]}) => ${funcCode}`;
            }

            lines.push(`${indent}const ${name} = ${funcCode};`);
        }
    }

    return lines.join("\n");
}

// =============================================================================
// External Declaration Emission
// =============================================================================

/**
 * Emit an external declaration
 *
 * Generates:
 * - Import statement (if `from` is specified)
 * - Const binding that aliases the JS name to the vibefun name
 *
 * Example:
 * ```javascript
 * // external floor: Float -> Int = "Math.floor"
 * const floor = Math.floor;
 *
 * // external log: String -> Unit = "console.log" from "node:console"
 * import { log as console_log } from "node:console";
 * const log = console_log;
 * ```
 */
function emitExternalDecl(decl: CoreExternalDecl, ctx: EmitContext): string {
    const indent = getIndent(ctx);
    const vfName = escapeIdentifier(decl.name);

    if (decl.exported) {
        addExport(ctx, vfName);
    }

    // If the jsName equals the vfName (after escaping), we might not need a binding
    // But for consistency and to ensure proper export handling, always emit the binding

    if (decl.from) {
        // External from a module - handled by import collection in generator
        // The const binding maps vfName to jsName
        // For dotted names like "Foo.bar", we need to handle specially
        if (decl.jsName.includes(".")) {
            // Dotted name from module - emit namespace import and access
            // This is a complex case; for now, emit direct binding
            // The import will be handled separately
            return `${indent}const ${vfName} = ${decl.jsName};`;
        }
        // Simple name - the generator will collect the import
        // Emit const binding if names differ
        if (vfName !== decl.jsName) {
            return `${indent}const ${vfName} = ${decl.jsName};`;
        }
        // Names match - no binding needed (import handles it)
        return "";
    }

    // No module - using a global JS name
    // Only emit binding if names differ
    if (vfName !== decl.jsName) {
        return `${indent}const ${vfName} = ${decl.jsName};`;
    }

    // Using global directly with same name - no binding needed
    return "";
}

// =============================================================================
// Import Declaration Emission
// =============================================================================

/**
 * Emit an import declaration
 *
 * Filters out type-only imports (they have no runtime representation).
 * If ALL imports are type-only, returns empty string.
 *
 * @param decl - Import declaration
 * @param ctx - Emission context
 * @returns JavaScript import statement or empty string
 */
export function emitImportDecl(decl: CoreImportDecl, ctx: EmitContext): string {
    const indent = getIndent(ctx);

    // Filter out type-only imports
    const valueImports = decl.items.filter((item) => !item.isType);

    // If all imports were type-only, emit nothing
    if (valueImports.length === 0) {
        return "";
    }

    // Build import specifiers
    const specifiers = valueImports.map((item) => {
        const name = escapeIdentifier(item.name);
        if (item.alias) {
            const alias = escapeIdentifier(item.alias);
            return `${name} as ${alias}`;
        }
        return name;
    });

    // Build the path - add .js extension for relative imports
    const path = formatImportPath(decl.from);

    return `${indent}import { ${specifiers.join(", ")} } from "${path}";`;
}

/**
 * Format import path according to rules:
 * - Relative (./foo) -> append .js
 * - Absolute (/lib/foo) -> append .js
 * - Package (lodash) -> pass through
 * - Scoped (@vibefun/std) -> pass through
 */
function formatImportPath(path: string): string {
    // Relative or absolute paths get .js extension
    if (path.startsWith("./") || path.startsWith("../") || path.startsWith("/")) {
        // Don't add .js if already present
        if (!path.endsWith(".js")) {
            return path + ".js";
        }
    }
    return path;
}
