/**
 * ES2020 Code Generator
 *
 * Main entry point for generating ES2020 JavaScript from typed Vibefun Core AST.
 * This module:
 * 1. Wires up dependency injection between emit modules
 * 2. Collects and deduplicates imports
 * 3. Emits declarations with proper export tracking
 * 4. Conditionally includes runtime helpers
 */

import type { TypedModule } from "../../typechecker/typechecker.js";
import type { CoreExpr, CoreExternalDecl, CoreImportDecl, CoreModule } from "../../types/core-ast.js";
import type { EmitContext } from "./context.js";
import type { MatchPatternResult } from "./emit-patterns.js";

import { visitExpr } from "../../utils/ast-transform.js";
import { createContext } from "./context.js";
import * as Declarations from "./emit-declarations.js";
import * as Expressions from "./emit-expressions/index.js";
import * as Patterns from "./emit-patterns.js";
import { renameTopLevelShadows } from "./rename-shadows.js";
import { escapeIdentifier } from "./reserved-words.js";
import { generateRuntimeHelpers } from "./runtime-helpers.js";

/**
 * Names that @vibefun/std provides and are *ambient* in user code — they
 * are reachable via the typechecker's builtin env (or pre-seeded as
 * `__std__`), so the user never writes an explicit import for them. When
 * the emitted JS references any of these, we auto-inject a matching
 * `import { … } from "@vibefun/std"` so the runtime resolves correctly.
 */
const STDLIB_AMBIENT_RUNTIME_NAMES: ReadonlySet<string> = new Set([
    "__std__",
    "Cons",
    "Nil",
    "Some",
    "None",
    "Ok",
    "Err",
]);
const STDLIB_PACKAGE = "@vibefun/std";

// =============================================================================
// Dependency Injection Initialization
// =============================================================================

let initialized = false;

/**
 * Initialize dependency injection wiring between modules
 *
 * This must be called once before generating code. It sets up the circular
 * dependencies between expression, pattern, and declaration emission.
 */
function initializeDependencies(): void {
    if (initialized) {
        return;
    }

    // Wire expressions -> patterns
    Expressions.setEmitPattern(Patterns.emitPattern as (pattern: unknown, ctx: EmitContext) => string);
    Expressions.setEmitMatchPattern(
        Patterns.emitMatchPattern as (pattern: unknown, scrutinee: string, ctx: EmitContext) => MatchPatternResult,
    );
    Expressions.setExtractPatternNames(Patterns.extractPatternNames as (pattern: unknown) => string[]);

    // Wire patterns -> expressions
    Patterns.setEmitExpr(Expressions.emitExpr as (expr: unknown, ctx: EmitContext) => string);

    // Wire declarations -> expressions + patterns
    Declarations.setEmitExpr(Expressions.emitExpr as (expr: unknown, ctx: EmitContext) => string);
    Declarations.setEmitPattern(Patterns.emitPattern as (pattern: unknown, ctx: EmitContext) => string);

    initialized = true;
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Options for ES2020 code generation
 */
export interface GenerateOptions {
    /** Source filename (included in header comment) */
    readonly filename?: string;
}

/**
 * Result of ES2020 code generation
 */
export interface GenerateResult {
    /** The generated JavaScript code */
    readonly code: string;
}

/**
 * Generate ES2020 JavaScript from a typed module
 *
 * @param typedModule - The type-checked module to generate code for
 * @param options - Code generation options
 * @returns Generated JavaScript code
 *
 * @example
 * ```typescript
 * const typedModule = typeCheck(desugar(parse(source)));
 * const { code } = generate(typedModule, { filename: "main.vf" });
 * fs.writeFileSync("main.js", code);
 * ```
 */
export function generate(typedModule: TypedModule, options?: GenerateOptions): GenerateResult {
    // Ensure DI is initialized
    initializeDependencies();

    // α-rename top-level shadowed bindings BEFORE codegen runs. JS forbids
    // redeclaring a `const` / `let` in the same scope, so `let x = 1; let x = 2;`
    // becomes `const x = 1; const x$1 = 2;` with all subsequent free
    // references rewritten. See rename-shadows.ts for details.
    const { module: renamedModule, exportAliases } = renameTopLevelShadows(typedModule.module);
    const module = renamedModule;
    const filename = options?.filename ?? "unknown";

    // Create emission context
    const ctx = createContext({
        env: typedModule.env,
        declarationTypes: typedModule.declarationTypes,
    });

    // Generate code sections
    const header = generateHeader(filename);
    const imports = generateImports(module, ctx);
    const declarations = generateDeclarations(module, ctx);
    const helpers = generateRuntimeHelpers({
        needsRef: ctx.shared.needsRefHelper,
        needsEq: ctx.shared.needsEqHelper,
        needsIntDiv: ctx.shared.needsIntDivHelper,
        needsIntMod: ctx.shared.needsIntModHelper,
    });
    const exports = generateExports(ctx, exportAliases);

    // Assemble final output
    const sections: string[] = [];

    sections.push(header);

    if (imports.length > 0) {
        sections.push(imports);
    }

    if (helpers.length > 0) {
        sections.push(helpers);
    }

    if (declarations.length > 0) {
        sections.push(declarations);
    }

    // Always emit export statement (even if empty for valid ES module)
    sections.push(exports);

    const code = sections.join("\n") + "\n";

    return { code };
}

// =============================================================================
// Header Generation
// =============================================================================

/**
 * Generate the file header comment
 *
 * Sanitizes filename to prevent newline injection into comment.
 */
function generateHeader(filename: string): string {
    const safeFilename = filename.replace(/\r?\n/g, " ");
    return `// Vibefun compiled output
// Source: ${safeFilename}
// Target: ES2020`;
}

// =============================================================================
// Import Generation
// =============================================================================

/**
 * Tracked import for deduplication
 */
type TrackedImport = {
    name: string;
    alias: string | undefined;
    isType: boolean;
};

/**
 * Generate import statements
 *
 * Handles:
 * - Vibefun import declarations
 * - External declarations with `from` clause
 * - Deduplication (same name from same module)
 * - Type-only filtering
 */
function generateImports(module: CoreModule, _ctx: EmitContext): string {
    // Collect all imports by source module
    const importsByModule = new Map<string, TrackedImport[]>();

    // Process CoreImportDecl (vibefun imports)
    for (const imp of module.imports) {
        collectImportItems(imp, importsByModule);
    }

    // Process CoreExternalDecl with `from` clause
    for (const decl of module.declarations) {
        if (decl.kind === "CoreExternalDecl" && decl.from) {
            collectExternalImport(decl, importsByModule);
        }
    }

    // Auto-inject imports for any stdlib-ambient runtime name referenced by
    // the emitted JS (e.g. `__std__` from desugarer-synthesized list-spread
    // concat, or a variant constructor like `Some` used in user code). The
    // typechecker resolves these against the ambient env or `__std__`
    // binding, but the emitted JS still needs a real module import for the
    // runtime to locate the symbol.
    collectSynthesizedStdlibImports(module, importsByModule);

    // Generate import statements
    const lines: string[] = [];

    for (const [from, items] of importsByModule) {
        const line = generateImportStatement(from, items);
        if (line.length > 0) {
            lines.push(line);
        }
    }

    return lines.join("\n");
}

/**
 * Walk the module tree and add synthetic @vibefun/std imports for every
 * stdlib-ambient runtime name that appears as a reachable `CoreVar`.
 * Deduplication with user-written imports happens through addOrMergeImport.
 */
function collectSynthesizedStdlibImports(module: CoreModule, importsByModule: Map<string, TrackedImport[]>): void {
    // Names already bound at the top level of the emitted module. Auto-
    // importing a colliding name from @vibefun/std would trigger a JS
    // re-declaration error. Two sources of collision:
    //   1. User-declared variant types emit an inline `const Some = …`.
    //   2. Explicit imports from other packages may bring in a value
    //      named `Some`, `Ok`, etc.
    const locallyBoundNames = new Set<string>();
    for (const imp of module.imports) {
        for (const item of imp.items) {
            if (!item.isType) {
                locallyBoundNames.add(item.alias ?? item.name);
            }
        }
    }
    for (const decl of module.declarations) {
        if (decl.kind === "CoreTypeDecl" && decl.definition.kind === "CoreVariantTypeDef") {
            for (const ctor of decl.definition.constructors) {
                locallyBoundNames.add(ctor.name);
            }
        }
    }

    const referenced = new Set<string>();
    const check = (expr: CoreExpr): void => {
        if (
            expr.kind === "CoreVar" &&
            STDLIB_AMBIENT_RUNTIME_NAMES.has(expr.name) &&
            !locallyBoundNames.has(expr.name)
        ) {
            referenced.add(expr.name);
        }
    };
    for (const decl of module.declarations) {
        switch (decl.kind) {
            case "CoreLetDecl":
                visitExpr(decl.value, check);
                break;
            case "CoreLetRecGroup":
                for (const binding of decl.bindings) {
                    visitExpr(binding.value, check);
                }
                break;
            default:
                break;
        }
    }

    if (referenced.size === 0) return;

    let items = importsByModule.get(STDLIB_PACKAGE);
    if (!items) {
        items = [];
        importsByModule.set(STDLIB_PACKAGE, items);
    }
    for (const name of referenced) {
        addOrMergeImport(items, { name, alias: undefined, isType: false });
    }
}

/**
 * Collect import items from a CoreImportDecl
 */
function collectImportItems(decl: CoreImportDecl, importsByModule: Map<string, TrackedImport[]>): void {
    const from = decl.from;
    let items = importsByModule.get(from);
    if (!items) {
        items = [];
        importsByModule.set(from, items);
    }

    for (const item of decl.items) {
        addOrMergeImport(items, {
            name: item.name,
            alias: item.alias,
            isType: item.isType,
        });
    }
}

/**
 * Collect import from an external declaration
 */
function collectExternalImport(decl: CoreExternalDecl, importsByModule: Map<string, TrackedImport[]>): void {
    if (!decl.from) return;

    const from = decl.from;
    let items = importsByModule.get(from);
    if (!items) {
        items = [];
        importsByModule.set(from, items);
    }

    // For externals, jsName may differ from vibefun name
    // If jsName contains a dot, it's a namespace access (e.g., "Foo.bar")
    // In that case, we need to import the namespace, not the method
    let importName = decl.jsName;
    let alias: string | undefined;

    if (decl.jsName.includes(".")) {
        // Dotted name - import the namespace portion
        const parts = decl.jsName.split(".");
        importName = parts[0]!;
        // No alias needed for namespace imports
    } else if (decl.jsName !== decl.name) {
        // Different names - import jsName, may need alias
        // The binding is handled in declaration emission
    }

    addOrMergeImport(items, {
        name: importName,
        alias,
        isType: false,
    });
}

/**
 * Add import to list, merging if same name already exists
 *
 * Rules:
 * - type + value → value (types are erased)
 * - same name twice → keep one
 */
function addOrMergeImport(items: TrackedImport[], newItem: TrackedImport): void {
    const existing = items.find((i) => i.name === newItem.name && i.alias === newItem.alias);
    if (existing) {
        // Merge: if either is value import, result is value import
        if (!newItem.isType) {
            existing.isType = false;
        }
        return;
    }
    items.push(newItem);
}

/**
 * Generate import statement(s) for one source module.
 *
 * Namespace specifiers (`{ name: "*" }`, produced by `import * as Name`)
 * cannot share a `{ ... }` list with named specifiers in ES2020, so each
 * namespace specifier is emitted as its own `import * as Alias from ...`
 * line. Named specifiers collapse into a single `import { ... }` line.
 */
function generateImportStatement(from: string, items: TrackedImport[]): string {
    const valueImports = items.filter((i) => !i.isType);
    if (valueImports.length === 0) {
        return "";
    }

    const path = formatImportPath(from);
    const namespaceItems = valueImports.filter((i) => i.name === "*");
    const namedItems = valueImports.filter((i) => i.name !== "*");

    const lines: string[] = [];
    for (const item of namespaceItems) {
        // The parser requires an alias for `import * as …`, but the
        // tracked-import shape is shared with the named path, so assert
        // here to surface any regression that drops the alias.
        if (!item.alias) {
            throw new Error("Namespace import is missing its alias");
        }
        // The alias is a local binding; escape it so a reserved-word
        // alias (`import * as class`) doesn't emit invalid JS.
        lines.push(`import * as ${escapeIdentifier(item.alias)} from "${path}";`);
    }

    if (namedItems.length > 0) {
        const specifiers = namedItems.map((item) => {
            // Remote export names stay verbatim; only the local binding
            // needs reserved-word escaping. See `emit-declarations.ts`
            // for the longer note — same rule applies to both emitters.
            const importedName = item.name;
            const localName = escapeIdentifier(item.alias ?? item.name);
            return localName === importedName ? importedName : `${importedName} as ${localName}`;
        });
        lines.push(`import { ${specifiers.join(", ")} } from "${path}";`);
    }

    return lines.join("\n");
}

/**
 * Format import path according to rules:
 * - Relative (./foo) → append .js
 * - Absolute (/lib/foo) → append .js
 * - Package (lodash) → pass through
 * - Scoped (@vibefun/std) → pass through
 */
function formatImportPath(path: string): string {
    if (path.startsWith("./") || path.startsWith("../") || path.startsWith("/")) {
        if (!path.endsWith(".js")) {
            return path + ".js";
        }
    }
    return path;
}

// =============================================================================
// Declaration Generation
// =============================================================================

/**
 * Generate all declarations
 */
function generateDeclarations(module: CoreModule, ctx: EmitContext): string {
    const lines: string[] = [];

    for (const decl of module.declarations) {
        // Skip import declarations (handled separately)
        if (decl.kind === "CoreImportDecl") {
            continue;
        }

        const code = Declarations.emitDeclaration(decl, ctx);
        if (code.length > 0) {
            lines.push(code);
        }
    }

    return lines.join("\n");
}

// =============================================================================
// Export Generation
// =============================================================================

/**
 * Generate the export statement
 *
 * All exports are collected during declaration emission and emitted
 * as a single `export { ... }` statement at the end of the module.
 *
 * `exportAliases` maps original (source-level) names to the α-renamed
 * names produced by the top-level shadow renaming pass; the renamed
 * binding is exported under the original name via `as` aliasing so the
 * module's public API stays stable across shadow renaming.
 */
function generateExports(ctx: EmitContext, exportAliases: Map<string, string>): string {
    const names = Array.from(ctx.exportedNames).sort();

    if (names.length === 0) {
        return "export {};";
    }

    // Reverse the map so we can look up "renamed name → original name" in
    // ctx.exportedNames (which holds the renamed names, since
    // emitLetDecl reads them off the rewritten pattern).
    const renamedToSource = new Map<string, string>();
    for (const [source, renamed] of exportAliases) {
        renamedToSource.set(renamed, source);
    }

    const specifiers = names.map((name) => {
        const sourceName = renamedToSource.get(name);
        return sourceName !== undefined ? `${name} as ${sourceName}` : name;
    });

    return `export { ${specifiers.join(", ")} };`;
}
