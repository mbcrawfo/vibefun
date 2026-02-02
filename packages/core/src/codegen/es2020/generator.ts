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
import type { CoreExternalDecl, CoreImportDecl, CoreModule } from "../../types/core-ast.js";
import type { EmitContext } from "./context.js";
import type { MatchPatternResult } from "./emit-patterns.js";

import { createContext } from "./context.js";
import * as Declarations from "./emit-declarations.js";
import * as Expressions from "./emit-expressions.js";
import * as Patterns from "./emit-patterns.js";
import { generateRuntimeHelpers } from "./runtime-helpers.js";

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

    const module = typedModule.module;
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
    const helpers = generateRuntimeHelpers(ctx.needsRefHelper, ctx.needsEqHelper);
    const exports = generateExports(ctx);

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
 */
function generateHeader(filename: string): string {
    return `// Vibefun compiled output
// Source: ${filename}
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
 * Generate a single import statement
 */
function generateImportStatement(from: string, items: TrackedImport[]): string {
    // Filter out type-only imports
    const valueImports = items.filter((i) => !i.isType);

    if (valueImports.length === 0) {
        return "";
    }

    // Build specifiers
    const specifiers = valueImports.map((item) => {
        if (item.alias) {
            return `${item.name} as ${item.alias}`;
        }
        return item.name;
    });

    // Format path
    const path = formatImportPath(from);

    return `import { ${specifiers.join(", ")} } from "${path}";`;
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
 */
function generateExports(ctx: EmitContext): string {
    const names = Array.from(ctx.exportedNames).sort();

    if (names.length === 0) {
        return "export {};";
    }

    return `export { ${names.join(", ")} };`;
}
