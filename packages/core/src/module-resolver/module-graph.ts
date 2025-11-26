/**
 * Module Graph
 *
 * This module provides the dependency graph representation for Vibefun modules.
 * It tracks dependency edges between modules, distinguishing between type-only
 * and value imports for proper cycle detection.
 *
 * The graph is built from parsed Module ASTs and supports:
 * - Dual import edge handling (type + value → value)
 * - Re-export dependency tracking
 * - Import location tracking for warning messages
 * - Topological sorting for compilation order
 *
 * @module module-resolver
 */

import type { Location } from "../types/index.js";

// =============================================================================
// Types
// =============================================================================

/**
 * A dependency edge in the module graph.
 * Stores information about an import from one module to another.
 */
export type DependencyEdge = {
    /** Target module path (absolute real path) */
    to: string;
    /** Whether this is a type-only import */
    isTypeOnly: boolean;
    /** Source location of the import statement (for warning messages) */
    importLoc: Location;
    /** Whether this edge comes from a re-export */
    isReExport: boolean;
};

/**
 * Result of topological sort.
 * If the graph has cycles, returns modules in best-effort order.
 */
export type TopologicalSortResult = {
    /** Modules in topological order (dependencies before dependents) */
    order: string[];
    /** Whether the graph has cycles (topological sort is still valid, just best-effort) */
    hasCycles: boolean;
};

// =============================================================================
// ModuleGraph Class
// =============================================================================

/**
 * Represents the dependency graph of modules.
 *
 * Nodes are absolute real file paths (after symlink resolution).
 * Edges represent import dependencies with metadata about the import type.
 *
 * @example
 * ```typescript
 * const graph = new ModuleGraph();
 *
 * // Add modules
 * graph.addModule('/path/to/main.vf');
 * graph.addModule('/path/to/utils.vf');
 *
 * // Add dependencies
 * graph.addDependency('/path/to/main.vf', '/path/to/utils.vf', false, loc);
 *
 * // Query
 * const deps = graph.getDependencies('/path/to/main.vf');
 * const order = graph.getTopologicalOrder();
 * ```
 */
export class ModuleGraph {
    /** Set of all module paths in the graph */
    private modules: Set<string> = new Set();

    /** Adjacency list: from → edges[] */
    private edges: Map<string, DependencyEdge[]> = new Map();

    /**
     * Add a module to the graph.
     * Does nothing if the module is already in the graph.
     *
     * @param modulePath - Absolute real path to the module
     */
    addModule(modulePath: string): void {
        if (!this.modules.has(modulePath)) {
            this.modules.add(modulePath);
            this.edges.set(modulePath, []);
        }
    }

    /**
     * Add a dependency edge between two modules.
     *
     * If an edge already exists between these modules, the edge is upgraded
     * to a value edge if the new edge is a value import (value subsumes type).
     *
     * Both modules are automatically added to the graph if not already present.
     *
     * @param from - Source module path
     * @param to - Target module path
     * @param isTypeOnly - Whether this is a type-only import
     * @param importLoc - Source location of the import statement
     * @param isReExport - Whether this edge comes from a re-export (default: false)
     */
    addDependency(
        from: string,
        to: string,
        isTypeOnly: boolean,
        importLoc: Location,
        isReExport: boolean = false,
    ): void {
        // Ensure both modules are in the graph
        this.addModule(from);
        this.addModule(to);

        // Get existing edges from 'from'
        const existingEdges = this.edges.get(from);
        if (!existingEdges) {
            // This shouldn't happen since addModule creates the array
            this.edges.set(from, [{ to, isTypeOnly, importLoc, isReExport }]);
            return;
        }

        // Check if edge to this target already exists
        const existingEdge = existingEdges.find((e) => e.to === to);
        if (existingEdge) {
            // Edge exists - upgrade to value if new edge is value
            // Value import always wins over type-only
            if (!isTypeOnly) {
                existingEdge.isTypeOnly = false;
            }
            // Don't update location or isReExport - keep the first one
        } else {
            // New edge
            existingEdges.push({ to, isTypeOnly, importLoc, isReExport });
        }
    }

    /**
     * Get all dependency edges from a module.
     *
     * @param from - Source module path
     * @returns Array of dependency edges, or empty array if module not found
     */
    getDependencyEdges(from: string): readonly DependencyEdge[] {
        return this.edges.get(from) ?? [];
    }

    /**
     * Get all dependency paths from a module (just the target paths).
     *
     * @param from - Source module path
     * @returns Array of target module paths
     */
    getDependencies(from: string): string[] {
        const edges = this.edges.get(from);
        return edges ? edges.map((e) => e.to) : [];
    }

    /**
     * Get all modules in the graph.
     *
     * @returns Array of all module paths
     */
    getModules(): string[] {
        return Array.from(this.modules);
    }

    /**
     * Get the number of modules in the graph.
     */
    getModuleCount(): number {
        return this.modules.size;
    }

    /**
     * Check if a module exists in the graph.
     *
     * @param modulePath - Path to check
     * @returns true if module exists
     */
    hasModule(modulePath: string): boolean {
        return this.modules.has(modulePath);
    }

    /**
     * Check if a specific edge is type-only.
     *
     * @param from - Source module path
     * @param to - Target module path
     * @returns true if edge exists and is type-only, false otherwise
     */
    isTypeOnlyEdge(from: string, to: string): boolean {
        const edges = this.edges.get(from);
        if (!edges) return false;
        const edge = edges.find((e) => e.to === to);
        return edge?.isTypeOnly ?? false;
    }

    /**
     * Get the edge between two modules, if it exists.
     *
     * @param from - Source module path
     * @param to - Target module path
     * @returns The edge, or undefined if not found
     */
    getEdge(from: string, to: string): DependencyEdge | undefined {
        const edges = this.edges.get(from);
        return edges?.find((e) => e.to === to);
    }

    /**
     * Check if the graph has any cycles.
     * Uses DFS to detect back edges.
     *
     * @returns true if the graph contains at least one cycle
     */
    hasCycle(): boolean {
        const visited = new Set<string>();
        const inStack = new Set<string>();

        const dfs = (node: string): boolean => {
            if (inStack.has(node)) {
                return true; // Back edge found - cycle!
            }
            if (visited.has(node)) {
                return false; // Already fully processed
            }

            visited.add(node);
            inStack.add(node);

            const edges = this.edges.get(node) ?? [];
            for (const edge of edges) {
                if (dfs(edge.to)) {
                    return true;
                }
            }

            inStack.delete(node);
            return false;
        };

        for (const module of this.modules) {
            if (dfs(module)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Get topological ordering of modules (dependencies before dependents).
     *
     * If the graph has cycles, returns a best-effort ordering where as many
     * dependencies as possible come before their dependents. Modules in cycles
     * are returned in alphabetical order (for determinism).
     *
     * @returns Topological sort result with order and cycle detection
     */
    getTopologicalOrder(): TopologicalSortResult {
        // Use DFS-based topological sort on the reversed graph
        // This gives us dependencies before dependents (compilation order)

        // Build reverse graph (edges point from dependency to dependent)
        const reverseEdges = new Map<string, string[]>();
        for (const module of this.modules) {
            reverseEdges.set(module, []);
        }
        for (const [from, edges] of this.edges) {
            for (const edge of edges) {
                // Original: from imports edge.to
                // Reverse: edge.to is depended on by from
                const deps = reverseEdges.get(edge.to);
                if (deps) {
                    deps.push(from);
                }
            }
        }

        // Kahn's algorithm on reverse graph
        // In-degree in reverse = out-degree in original = number of imports
        const inDegree = new Map<string, number>();
        for (const module of this.modules) {
            inDegree.set(module, 0);
        }

        for (const deps of reverseEdges.values()) {
            for (const dep of deps) {
                const current = inDegree.get(dep) ?? 0;
                inDegree.set(dep, current + 1);
            }
        }

        // Queue of nodes with no incoming edges in reverse graph
        // These are leaf modules (don't import anything)
        const queue: string[] = [];
        for (const [module, degree] of inDegree) {
            if (degree === 0) {
                queue.push(module);
            }
        }
        // Sort for determinism (alphabetically)
        queue.sort();

        const result: string[] = [];

        // Process nodes
        while (queue.length > 0) {
            const node = queue.shift();
            if (!node) continue;

            result.push(node);

            // Reduce in-degree of neighbors in reverse graph
            const deps = reverseEdges.get(node) ?? [];
            for (const dep of deps) {
                const newDegree = (inDegree.get(dep) ?? 1) - 1;
                inDegree.set(dep, newDegree);
                if (newDegree === 0) {
                    // Insert in sorted position for determinism
                    const insertIdx = queue.findIndex((q) => q > dep);
                    if (insertIdx === -1) {
                        queue.push(dep);
                    } else {
                        queue.splice(insertIdx, 0, dep);
                    }
                }
            }
        }

        // Check for cycles - if not all nodes processed, there are cycles
        const hasCycles = result.length < this.modules.size;

        if (hasCycles) {
            // Add remaining nodes (those in cycles) in alphabetical order
            const remaining = Array.from(this.modules).filter((m) => !result.includes(m));
            remaining.sort();
            result.push(...remaining);
        }

        return { order: result, hasCycles };
    }

    /**
     * Get reverse dependencies (modules that depend on the given module).
     *
     * @param target - Target module path
     * @returns Array of modules that import the target
     */
    getReverseDependencies(target: string): string[] {
        const result: string[] = [];
        for (const [from, edges] of this.edges) {
            if (edges.some((e) => e.to === target)) {
                result.push(from);
            }
        }
        return result;
    }

    /**
     * Create a deep copy of this graph.
     *
     * @returns A new ModuleGraph with the same nodes and edges
     */
    clone(): ModuleGraph {
        const copy = new ModuleGraph();
        for (const module of this.modules) {
            copy.addModule(module);
        }
        for (const [from, edges] of this.edges) {
            for (const edge of edges) {
                // Directly push to avoid re-checking logic
                const targetEdges = copy.edges.get(from);
                if (targetEdges) {
                    targetEdges.push({ ...edge });
                }
            }
        }
        return copy;
    }
}
