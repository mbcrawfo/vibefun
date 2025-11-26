/**
 * Module Graph Builder
 *
 * This module builds a ModuleGraph from a collection of parsed Module ASTs.
 * It extracts import relationships from each module and creates dependency edges.
 *
 * Responsibilities:
 * - Extract imports from ImportDecl and ReExportDecl nodes
 * - Distinguish type-only vs value imports
 * - Handle dual imports (both type and value from same module → value edge)
 * - Track re-exports as dependencies
 * - Detect import conflicts (duplicates, shadowing)
 *
 * Import conflict detection is handled here during graph construction because
 * conflicts are related to module structure rather than type checking.
 *
 * @module module-resolver
 */

import type { Declaration, ImportItem, Location, Module, Pattern } from "../types/index.js";

import { createDiagnostic, VibefunDiagnostic } from "../diagnostics/index.js";
import { ModuleGraph } from "./module-graph.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Result of building a module graph.
 */
export type ModuleGraphBuildResult = {
    /** The constructed module graph */
    graph: ModuleGraph;
    /** Import conflict errors detected during construction */
    errors: VibefunDiagnostic[];
};

/**
 * Information about an imported name for conflict detection.
 */
type ImportedName = {
    /** The name as it appears in the importing module */
    name: string;
    /** The module the name was imported from */
    fromModule: string;
    /** Source location of the import */
    loc: Location;
    /** Whether this is a type-only import */
    isTypeOnly: boolean;
};

/**
 * Information about a local declaration for shadowing detection.
 */
type LocalDeclaration = {
    /** The declared name */
    name: string;
    /** Source location of the declaration */
    loc: Location;
};

// =============================================================================
// ModuleGraphBuilder Class
// =============================================================================

/**
 * Builds a ModuleGraph from a collection of parsed Module ASTs.
 *
 * @example
 * ```typescript
 * const modules = new Map<string, Module>();
 * modules.set('/path/to/main.vf', mainModule);
 * modules.set('/path/to/utils.vf', utilsModule);
 *
 * const builder = new ModuleGraphBuilder(modules);
 * const result = builder.build();
 *
 * if (result.errors.length > 0) {
 *     // Handle import conflicts
 * }
 *
 * const graph = result.graph;
 * ```
 */
export class ModuleGraphBuilder {
    /** The modules to build the graph from */
    private modules: Map<string, Module>;

    /** Import path to resolved path mapping (needs to be provided externally) */
    private pathMap: Map<string, Map<string, string>>;

    /** Collected errors during building */
    private errors: VibefunDiagnostic[] = [];

    /**
     * Create a new ModuleGraphBuilder.
     *
     * @param modules - Map of module paths to parsed Module ASTs
     * @param pathMap - Map of module path → (import path → resolved path)
     *                  This mapping is needed because the AST only contains
     *                  the original import path strings, not resolved paths.
     */
    constructor(modules: Map<string, Module>, pathMap: Map<string, Map<string, string>>) {
        this.modules = modules;
        this.pathMap = pathMap;
    }

    /**
     * Build the module graph from all modules.
     *
     * @returns Result containing the graph and any import conflict errors
     */
    build(): ModuleGraphBuildResult {
        const graph = new ModuleGraph();
        this.errors = [];

        // Add all modules to the graph
        for (const modulePath of this.modules.keys()) {
            graph.addModule(modulePath);
        }

        // Process each module's imports
        for (const [modulePath, module] of this.modules) {
            this.processModule(modulePath, module, graph);
        }

        return { graph, errors: this.errors };
    }

    /**
     * Process a single module, extracting imports and detecting conflicts.
     */
    private processModule(modulePath: string, module: Module, graph: ModuleGraph): void {
        // Track imported names for conflict detection
        const importedNames = new Map<string, ImportedName>();

        // Collect local declarations for shadowing detection
        const localDeclarations: LocalDeclaration[] = this.collectLocalDeclarations(module);

        // Process imports array
        for (const decl of module.imports) {
            this.processDeclaration(modulePath, decl, graph, importedNames);
        }

        // Process declarations (may contain re-exports)
        for (const decl of module.declarations) {
            this.processDeclaration(modulePath, decl, graph, importedNames);
        }

        // Check for import/local shadowing
        this.checkImportShadowing(importedNames, localDeclarations, modulePath);
    }

    /**
     * Process a single declaration, extracting import dependencies.
     */
    private processDeclaration(
        modulePath: string,
        decl: Declaration,
        graph: ModuleGraph,
        importedNames: Map<string, ImportedName>,
    ): void {
        if (decl.kind === "ImportDecl") {
            this.processImportDecl(modulePath, decl.from, decl.items, decl.loc, graph, importedNames);
        } else if (decl.kind === "ReExportDecl") {
            this.processReExportDecl(modulePath, decl.from, decl.items, decl.loc, graph);
        }
    }

    /**
     * Process an import declaration.
     */
    private processImportDecl(
        modulePath: string,
        importPath: string,
        items: ImportItem[],
        loc: Location,
        graph: ModuleGraph,
        importedNames: Map<string, ImportedName>,
    ): void {
        // Resolve the import path
        const resolvedPath = this.resolveImportPath(modulePath, importPath);
        if (!resolvedPath) {
            // Module not found - this should have been caught by the loader
            // Just skip it here
            return;
        }

        // Determine if this is a type-only import
        // An import is type-only if ALL items are type-only
        // Empty items list (side-effect import) is a value import
        const isTypeOnly = items.length > 0 && items.every((item) => item.isType);

        // Add dependency edge
        graph.addDependency(modulePath, resolvedPath, isTypeOnly, loc, false);

        // Track imported names for conflict detection
        for (const item of items) {
            // Use alias if provided, otherwise use original name
            const localName = item.alias ?? item.name;

            // Check for duplicate import
            const existing = importedNames.get(localName);
            if (existing) {
                // Check if it's from the same module
                if (existing.fromModule !== resolvedPath) {
                    // Duplicate import from different modules - error
                    this.errors.push(
                        createDiagnostic("VF5002", loc, {
                            name: localName,
                        }),
                    );
                }
                // Same module, same name - allowed (deduplicate)
                // But still upgrade to value if this one is value
                if (!item.isType && existing.isTypeOnly) {
                    existing.isTypeOnly = false;
                }
            } else {
                // New import
                importedNames.set(localName, {
                    name: localName,
                    fromModule: resolvedPath,
                    loc,
                    isTypeOnly: item.isType,
                });
            }
        }
    }

    /**
     * Process a re-export declaration.
     */
    private processReExportDecl(
        modulePath: string,
        importPath: string,
        items: ImportItem[] | null,
        loc: Location,
        graph: ModuleGraph,
    ): void {
        // Resolve the import path
        const resolvedPath = this.resolveImportPath(modulePath, importPath);
        if (!resolvedPath) {
            // Module not found - skip
            return;
        }

        // Re-exports are always treated as value imports (conservative approach)
        // This ensures cycles through re-exports are detected as value cycles
        // Exception: if items is non-null and all items are type-only
        let isTypeOnly = false;
        if (items && items.length > 0 && items.every((item) => item.isType)) {
            isTypeOnly = true;
        }

        // Add dependency edge, marked as re-export
        graph.addDependency(modulePath, resolvedPath, isTypeOnly, loc, true);
    }

    /**
     * Collect all local declarations from a module (for shadowing detection).
     */
    private collectLocalDeclarations(module: Module): LocalDeclaration[] {
        const declarations: LocalDeclaration[] = [];

        for (const decl of module.declarations) {
            if (decl.kind === "LetDecl") {
                // Extract names from pattern
                const names = this.extractPatternNames(decl.pattern);
                for (const name of names) {
                    declarations.push({ name, loc: decl.loc });
                }
            } else if (decl.kind === "LetRecGroup") {
                // Extract names from all bindings
                for (const binding of decl.bindings) {
                    const names = this.extractPatternNames(binding.pattern);
                    for (const name of names) {
                        declarations.push({ name, loc: binding.loc });
                    }
                }
            } else if (decl.kind === "TypeDecl") {
                // Type declarations don't shadow value imports
                // But we track them for completeness
            }
        }

        return declarations;
    }

    /**
     * Extract variable names from a pattern.
     */
    private extractPatternNames(pattern: Pattern): string[] {
        const names: string[] = [];

        switch (pattern.kind) {
            case "VarPattern":
                names.push(pattern.name);
                break;
            case "WildcardPattern":
            case "LiteralPattern":
                // No names to extract
                break;
            case "ConstructorPattern":
                for (const arg of pattern.args) {
                    names.push(...this.extractPatternNames(arg));
                }
                break;
            case "RecordPattern":
                for (const field of pattern.fields) {
                    names.push(...this.extractPatternNames(field.pattern));
                }
                break;
            case "ListPattern":
                for (const elem of pattern.elements) {
                    names.push(...this.extractPatternNames(elem));
                }
                if (pattern.rest) {
                    names.push(...this.extractPatternNames(pattern.rest));
                }
                break;
            case "OrPattern":
                // All alternatives should bind the same names
                // Just take from first pattern
                if (pattern.patterns.length > 0) {
                    const firstPattern = pattern.patterns[0];
                    if (firstPattern) {
                        names.push(...this.extractPatternNames(firstPattern));
                    }
                }
                break;
            case "TuplePattern":
                for (const elem of pattern.elements) {
                    names.push(...this.extractPatternNames(elem));
                }
                break;
            case "TypeAnnotatedPattern":
                names.push(...this.extractPatternNames(pattern.pattern));
                break;
        }

        return names;
    }

    /**
     * Check for import/local shadowing.
     * An import is shadowed if there's a local declaration with the same name.
     */
    private checkImportShadowing(
        importedNames: Map<string, ImportedName>,
        localDeclarations: LocalDeclaration[],
        _modulePath: string,
    ): void {
        for (const local of localDeclarations) {
            const imported = importedNames.get(local.name);
            if (imported) {
                // Import is shadowed by local declaration - error
                // Note: We use the local declaration's location for the error
                // because that's where the shadowing occurs
                this.errors.push(
                    createDiagnostic("VF5003", local.loc, {
                        name: local.name,
                    }),
                );
            }
        }
    }

    /**
     * Resolve an import path to an absolute path using the path map.
     */
    private resolveImportPath(modulePath: string, importPath: string): string | null {
        const modulePathMap = this.pathMap.get(modulePath);
        if (!modulePathMap) {
            return null;
        }
        return modulePathMap.get(importPath) ?? null;
    }
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Build a module graph from a collection of parsed Module ASTs.
 *
 * This is the main entry point for graph construction. It processes all
 * modules and extracts their import relationships.
 *
 * @param modules - Map of module paths to parsed Module ASTs
 * @param pathMap - Map of module path → (import path → resolved path)
 * @returns Result containing the graph and any import conflict errors
 *
 * @example
 * ```typescript
 * // After loading modules
 * const loadResult = loadModules('src/main.vf');
 *
 * // Build path map from loader's resolution
 * const pathMap = buildPathMap(loadResult);
 *
 * // Build graph
 * const graphResult = buildModuleGraph(loadResult.modules, pathMap);
 *
 * if (graphResult.errors.length > 0) {
 *     // Report import conflicts
 *     for (const error of graphResult.errors) {
 *         console.error(error.format());
 *     }
 * }
 * ```
 */
export function buildModuleGraph(
    modules: Map<string, Module>,
    pathMap: Map<string, Map<string, string>>,
): ModuleGraphBuildResult {
    const builder = new ModuleGraphBuilder(modules, pathMap);
    return builder.build();
}
