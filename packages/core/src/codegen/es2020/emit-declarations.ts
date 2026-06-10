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
    CoreReExportDecl,
    CoreTypeDecl,
    CoreTypeExpr,
    CoreVariantConstructor,
} from "../../types/core-ast.js";
import type { EmitContext } from "./context.js";

import { addExport, getIndent, markNeedsFfiOptionHelper, markNeedsRefHelper, withPrecedence } from "./context.js";
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

        case "CoreReExportDecl":
            return emitReExportDecl(decl, ctx);

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

    // Collect exports
    if (decl.exported) {
        const names = extractPatternNames(decl.pattern);
        for (const name of names) {
            addExport(ctx, escapeIdentifier(name));
        }
    }

    // Mutable bindings are shaped `let mut x = ref(v)` at the parser —
    // the explicit `ref(...)` call handles the `{ $value }` wrapping, so
    // codegen emits the value as-is. The runtime helper still needs to be
    // emitted so the call resolves. `mut` only influences the declaration
    // keyword so the binding itself can be reassigned to a new ref.
    if (decl.mutable) {
        markNeedsRefHelper(ctx);
    }
    const patternCode = emitPatternFn(decl.pattern, ctx);
    const valueCode = emitExprFn(decl.value, withPrecedence(ctx, 0));

    // `CoreLetDecl` is always non-recursive post-Phase-C; recursive forms
    // (single or grouped) emit through `emitLetRecGroup` instead.
    const keyword = decl.mutable ? "let" : "const";
    return `${indent}${keyword} ${patternCode} = ${valueCode};`;
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

    // Phase 2: Assign values. Mutable bindings use an explicit `ref(...)`
    // in the value position (enforced at the parser); codegen emits that
    // value as-is and must not add another `{ $value: ... }` wrapper. The
    // helper must still be emitted for the call to resolve.
    for (const binding of decl.bindings) {
        if (binding.mutable) {
            markNeedsRefHelper(ctx);
        }
        const patternCode = emitPatternFn(binding.pattern, ctx);
        const valueCode = emitExprFn(binding.value, withPrecedence(ctx, 0));

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

    // Overloaded externals: the group shares one name across several
    // declarations, and call sites emit the n-ary jsName directly (see
    // emitApp), so only the first member may emit the alias const — JS
    // forbids re-declaring it.
    if (ctx.env.values.get(decl.name)?.kind === "ExternalOverload") {
        if (ctx.shared.emittedOverloadAliases.has(decl.name)) {
            return "";
        }
        ctx.shared.emittedOverloadAliases.add(decl.name);
        if (vfName === decl.jsName) {
            // The import or same-named global already provides the binding.
            return "";
        }
        return `${indent}const ${vfName} = ${decl.jsName};`;
    }

    // Wrapped externals: a wrapper const bridges the calling conventions
    // when the declared surface shape takes ≥2 parameters (the desugarer
    // curries every application into single-argument calls, but the JS
    // function is n-ary) and/or marshals an Option<T> return through
    // $ffiOption (null/undefined → None, value → Some). `emitVar`
    // references the wrapper instead of inlining the raw jsName (see
    // wrappedExternals in the shared emit state).
    if (externalNeedsWrapper(decl)) {
        return `${indent}const ${vfName} = ${externalWrapper(decl, vfName, ctx)};`;
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

/**
 * The JS calling shape an external's declared surface type promises.
 *
 * Each `CoreFunctionType` level is one JS call segment: `(A, B) -> R` is a
 * single binary call, `(A) -> (B) -> R` two unary calls. `finalReturn` is
 * the type after following every function level.
 */
type ExternalCallShape = { segments: number[]; finalReturn: CoreTypeExpr };

function externalCallShape(decl: CoreExternalDecl): ExternalCallShape | null {
    if (decl.typeExpr.kind !== "CoreFunctionType") return null;
    const segments: number[] = [];
    let current: CoreTypeExpr = decl.typeExpr;
    while (current.kind === "CoreFunctionType") {
        segments.push(current.params.length);
        current = current.return_;
    }
    return { segments, finalReturn: current };
}

/**
 * Wrap a jsName in parentheses when it is not a plain (possibly dotted)
 * identifier path, so using it in call position keeps its own grouping:
 * `(b) => b ? 5 : null` called as-is would parse the call into the arrow
 * body, while `((b) => b ? 5 : null)(x)` calls the function. Already
 * fully-parenthesized expressions are left alone.
 */
export function jsCallTarget(jsName: string): string {
    const identifierPath = /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*$/;
    if (identifierPath.test(jsName) || isFullyParenthesized(jsName)) {
        return jsName;
    }
    return `(${jsName})`;
}

/**
 * True when the string is one parenthesized group: starts with `(` whose
 * matching `)` is the final character. The scan does not track string
 * literals inside the expression — a misdetection only adds a redundant
 * (harmless) pair of parentheses.
 */
function isFullyParenthesized(s: string): boolean {
    if (!s.startsWith("(") || !s.endsWith(")")) return false;
    let depth = 0;
    for (let i = 0; i < s.length; i++) {
        const ch = s[i];
        if (ch === "(") depth++;
        else if (ch === ")") {
            depth--;
            if (depth === 0) return i === s.length - 1;
        }
    }
    return false;
}

/**
 * True for a surface type expression denoting `Option<...>`.
 */
export function isOptionTypeExpr(typeExpr: CoreTypeExpr): boolean {
    return (
        typeExpr.kind === "CoreTypeApp" &&
        typeExpr.constructor.kind === "CoreTypeConst" &&
        typeExpr.constructor.name === "Option"
    );
}

/**
 * True when an external must be emitted as a wrapper const. Two triggers:
 *
 * - The outer surface shape takes ≥2 parameters: `(A, B) -> R` means the
 *   underlying JS function expects all arguments in one call, while emitted
 *   vibefun applications are single-argument chains. (An explicitly curried
 *   declaration `(A) -> (B) -> R` already matches the emitted call shape.)
 * - The final return type is `Option<T>`: the result must be marshalled
 *   through $ffiOption (null/undefined → None, value → Some) per
 *   type-safety.md, unconditionally.
 */
export function externalNeedsWrapper(decl: CoreExternalDecl): boolean {
    const shape = externalCallShape(decl);
    if (!shape) return false;
    return (shape.segments[0] ?? 0) >= 2 || isOptionTypeExpr(shape.finalReturn);
}

/**
 * Import alias for a wrapped external imported from a module under the same
 * name as its vibefun binding. The wrapper const occupies the vibefun name,
 * so the raw import needs an alias (`g` → `g$raw`) to avoid redeclaring it.
 * Returns undefined when no alias is needed. Used by the generator's import
 * collection; `externalWrapper` references the same alias.
 */
export function externalWrapperImportAlias(decl: CoreExternalDecl): string | undefined {
    if (!externalNeedsWrapper(decl)) return undefined;
    if (!decl.from || decl.jsName.includes(".")) return undefined;
    // Compare ESCAPED forms: the import statement escapes its local binding
    // name and the wrapper const is the escaped vibefun name, so the
    // collision happens between the escaped identifiers (e.g. an external
    // named `default` importing jsName "default" — both escape to
    // `default$`).
    if (escapeIdentifier(decl.jsName) !== escapeIdentifier(decl.name)) return undefined;
    return `${decl.jsName}$raw`;
}

/**
 * Build the wrapper expression for an external:
 * `($a0) => ($a1) => jsRef($a0, $a1)` for a 2-param shape, with the call
 * wrapped in `$ffiOption(...)` when the declared return type is Option<T>.
 */
function externalWrapper(decl: CoreExternalDecl, vfName: string, ctx: EmitContext): string {
    const shape = externalCallShape(decl);
    if (!shape) {
        throw new Error("Internal error: externalWrapper called for a non-function external");
    }

    // Reference to the raw JS function being wrapped.
    let jsRef = jsCallTarget(decl.jsName);
    const importAlias = externalWrapperImportAlias(decl);
    if (importAlias !== undefined) {
        jsRef = importAlias;
    } else if (decl.from && !decl.jsName.includes(".")) {
        // The import statement escapes its LOCAL binding name
        // (`import { default as default$ }`), so the wrapper must reference
        // the escaped local, not the raw remote name.
        jsRef = escapeIdentifier(decl.jsName);
    } else if (!decl.from && decl.jsName === vfName) {
        // A same-named global: a bare reference inside the initializer would
        // hit the temporal dead zone of the const being declared, so go
        // through globalThis instead.
        jsRef = `globalThis.${decl.jsName}`;
    }

    // Parameters are curried one at a time on the vibefun side; the raw
    // call groups them by the declared segments.
    const totalParams = shape.segments.reduce((a, b) => a + b, 0);
    const params = Array.from({ length: totalParams }, (_, i) => `$a${i}`);

    let call = jsRef;
    let next = 0;
    for (const segment of shape.segments) {
        call = `${call}(${params.slice(next, next + segment).join(", ")})`;
        next += segment;
    }

    if (isOptionTypeExpr(shape.finalReturn)) {
        markNeedsFfiOptionHelper(ctx);
        call = `$ffiOption(${call})`;
    }

    // Zero-param shape still needs a thunk — a bare call would run at
    // module-init time instead of at the call site.
    const chain = params.length > 0 ? params.map((p) => `(${p}) => `).join("") : "() => ";
    return `${chain}${call}`;
}

// =============================================================================
// Import Declaration Emission
// =============================================================================

/**
 * Emit an import declaration.
 *
 * Filters out type-only imports (they have no runtime representation).
 * If ALL imports are type-only, returns empty string.
 *
 * Namespace specifiers (`{ name: "*" }`, produced by `import * as Name`)
 * are emitted as their own `import * as Alias from …` line, because
 * ES2020 does not allow `*` to share a `{ … }` list with named
 * specifiers.
 */
export function emitImportDecl(decl: CoreImportDecl, ctx: EmitContext): string {
    const indent = getIndent(ctx);
    const valueImports = decl.items.filter((item) => !item.isType);
    if (valueImports.length === 0) {
        return "";
    }

    const path = formatImportPath(decl.from);
    const namespaceItems = valueImports.filter((item) => item.name === "*");
    const namedItems = valueImports.filter((item) => item.name !== "*");

    const lines: string[] = [];
    for (const item of namespaceItems) {
        if (!item.alias) {
            throw new Error("Namespace import is missing its alias");
        }
        const alias = escapeIdentifier(item.alias);
        lines.push(`${indent}import * as ${alias} from "${path}";`);
    }

    if (namedItems.length > 0) {
        const specifiers = namedItems.map((item) => {
            // `item.name` is the remote export name and must stay verbatim
            // — escaping it would try to import a different symbol. Only
            // the local binding (`alias`, or `name` when no alias) is the
            // JS identifier that needs to dodge reserved words.
            const importedName = item.name;
            const localName = escapeIdentifier(item.alias ?? item.name);
            return localName === importedName ? importedName : `${importedName} as ${localName}`;
        });
        lines.push(`${indent}import { ${specifiers.join(", ")} } from "${path}";`);
    }

    return lines.join("\n");
}

// =============================================================================
// Re-Export Declaration Emission
// =============================================================================

/**
 * Emit a re-export declaration (`export { x } from "./mod"` or
 * `export * from "./mod"`).
 *
 * Filters out type-only specifiers (the emitted JS has no type namespace).
 * When every specifier is type-only the function returns "", mirroring
 * `emitImportDecl`.
 */
export function emitReExportDecl(decl: CoreReExportDecl, ctx: EmitContext): string {
    const indent = getIndent(ctx);
    const path = formatImportPath(decl.from);

    if (decl.items === null) {
        return `${indent}export * from "${path}";`;
    }

    const valueItems = decl.items.filter((item) => !item.isType);
    if (valueItems.length === 0) {
        return "";
    }

    // Re-export specifiers name remote exports on both sides and create
    // no local binding, so neither position needs reserved-word escaping.
    const specifiers = valueItems.map((item) => {
        return item.alias ? `${item.name} as ${item.alias}` : item.name;
    });

    return `${indent}export { ${specifiers.join(", ")} } from "${path}";`;
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
