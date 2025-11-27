/**
 * Circular Dependency Detector
 *
 * This module implements cycle detection for the module dependency graph using
 * Tarjan's Strongly Connected Components (SCC) algorithm. Unlike simple DFS,
 * Tarjan's algorithm finds ALL cycles in a single O(V+E) pass.
 *
 * Key features:
 * - Detects all cycles (not just the first one)
 * - Distinguishes type-only cycles from value cycles
 * - Detects self-imports (module importing itself) as errors
 * - Returns deterministic results (alphabetical ordering)
 *
 * Self-imports are treated as compile-time ERRORS because they serve no
 * useful purpose and indicate a mistake. Circular dependencies between
 * different modules are WARNINGS (value cycles) or allowed (type-only cycles).
 *
 * @module module-resolver
 */

import type { Location } from "../types/index.js";
import type { DependencyEdge, ModuleGraph } from "./module-graph.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Represents a circular dependency cycle in the module graph.
 */
export type Cycle = {
    /** Module paths in the cycle (e.g., [A, B, C] for A → B → C → A) */
    path: string[];

    /**
     * Whether ALL edges in the cycle are type-only imports.
     * Type-only cycles are safe at runtime and don't trigger warnings.
     */
    isTypeOnly: boolean;

    /**
     * Import locations for each edge in the cycle.
     * Parallel array with path: locations[i] is the import from path[i] to path[i+1]
     * The last location is the import from path[last] back to path[0]
     */
    locations: Location[];
};

/**
 * Result of cycle detection.
 */
export type CycleDetectionResult = {
    /** All cycles found in the graph */
    cycles: Cycle[];

    /**
     * Self-imports found (module importing itself).
     * These are compile-time errors, not warnings.
     */
    selfImports: SelfImport[];
};

/**
 * A self-import (module importing itself).
 */
export type SelfImport = {
    /** Module path that imports itself */
    modulePath: string;

    /** Location of the self-import statement */
    location: Location;
};

// =============================================================================
// Internal Types for Tarjan's Algorithm
// =============================================================================

type TarjanNode = {
    path: string;
    index: number;
    lowlink: number;
    onStack: boolean;
};

// =============================================================================
// CircularDependencyDetector Class
// =============================================================================

/**
 * Detects circular dependencies in a module graph using Tarjan's SCC algorithm.
 *
 * Tarjan's algorithm finds all strongly connected components (SCCs) in a
 * directed graph in O(V+E) time. An SCC with 2+ nodes represents a cycle.
 * A 1-node SCC with a self-edge represents a self-import.
 *
 * @example
 * ```typescript
 * const detector = new CircularDependencyDetector();
 * const result = detector.detectCycles(graph);
 *
 * // Handle self-imports as errors
 * for (const selfImport of result.selfImports) {
 *   throwDiagnostic("VF5004", selfImport.location, { path: selfImport.modulePath });
 * }
 *
 * // Handle cycles as warnings (if not type-only)
 * for (const cycle of result.cycles) {
 *   if (!cycle.isTypeOnly) {
 *     const warning = createDiagnostic("VF5900", cycle.locations[0], {
 *       cycle: formatCyclePath(cycle)
 *     });
 *     warningCollector.add(warning);
 *   }
 * }
 * ```
 */
export class CircularDependencyDetector {
    private graph!: ModuleGraph;
    private index = 0;
    private stack: TarjanNode[] = [];
    private nodes: Map<string, TarjanNode> = new Map();
    private sccs: string[][] = [];

    /**
     * Detect all cycles in the module graph.
     *
     * @param graph - The module dependency graph to analyze
     * @returns Cycle detection result with cycles and self-imports
     */
    detectCycles(graph: ModuleGraph): CycleDetectionResult {
        this.graph = graph;
        this.index = 0;
        this.stack = [];
        this.nodes = new Map();
        this.sccs = [];

        // Run Tarjan's algorithm starting from each unvisited node
        for (const modulePath of graph.getModules()) {
            if (!this.nodes.has(modulePath)) {
                this.strongConnect(modulePath);
            }
        }

        // Separate self-imports from multi-node cycles
        const selfImports: SelfImport[] = [];
        const cycles: Cycle[] = [];

        for (const scc of this.sccs) {
            if (scc.length === 1) {
                // Single-node SCC - check for self-edge
                const modulePath = scc[0];
                if (modulePath === undefined) continue;
                const selfEdge = this.getSelfEdge(modulePath);
                if (selfEdge) {
                    selfImports.push({
                        modulePath,
                        location: selfEdge.importLoc,
                    });
                }
                // Otherwise, not a cycle (just a node with no cycle through it)
            } else {
                // Multi-node SCC - this is a cycle
                const cycle = this.buildCycle(scc);
                cycles.push(cycle);
            }
        }

        return { cycles, selfImports };
    }

    /**
     * Tarjan's strongConnect function - the heart of the algorithm.
     */
    private strongConnect(path: string): void {
        // Create node and set index/lowlink
        const node: TarjanNode = {
            path,
            index: this.index,
            lowlink: this.index,
            onStack: true,
        };
        this.index++;
        this.nodes.set(path, node);
        this.stack.push(node);

        // Visit all successors (dependencies)
        const edges = this.graph.getDependencyEdges(path);
        for (const edge of edges) {
            const successor = this.nodes.get(edge.to);

            if (!successor) {
                // Successor has not been visited; recurse
                this.strongConnect(edge.to);
                const successorNode = this.nodes.get(edge.to);
                if (successorNode) {
                    node.lowlink = Math.min(node.lowlink, successorNode.lowlink);
                }
            } else if (successor.onStack) {
                // Successor is on stack - part of current SCC
                node.lowlink = Math.min(node.lowlink, successor.index);
            }
            // If successor visited but not on stack, it's in a different SCC - ignore
        }

        // If this is a root node (start of an SCC), pop the SCC
        if (node.lowlink === node.index) {
            const scc: string[] = [];
            let poppedNode: TarjanNode | undefined;

            do {
                poppedNode = this.stack.pop();
                if (poppedNode) {
                    poppedNode.onStack = false;
                    scc.push(poppedNode.path);
                }
            } while (poppedNode && poppedNode.path !== path);

            // Store the SCC
            this.sccs.push(scc);
        }
    }

    /**
     * Check if a module has a self-edge (imports itself).
     */
    private getSelfEdge(modulePath: string): DependencyEdge | undefined {
        const edges = this.graph.getDependencyEdges(modulePath);
        return edges.find((e) => e.to === modulePath);
    }

    /**
     * Build a Cycle object from an SCC (set of module paths).
     *
     * The path is sorted alphabetically for deterministic output.
     * We then extract the actual cycle path following edges in the graph.
     */
    private buildCycle(scc: string[]): Cycle {
        // Sort SCC alphabetically for deterministic starting point
        const sortedScc = [...scc].sort();

        // Build the cycle path by following edges
        // Start from the first module (alphabetically) and follow edges
        const cyclePath = this.findCyclePath(sortedScc);

        // Check if all edges in the cycle are type-only
        const isTypeOnly = this.isTypeOnlyCycle(cyclePath);

        // Get import locations for each edge in the cycle
        const locations = this.getCycleLocations(cyclePath);

        return {
            path: cyclePath,
            isTypeOnly,
            locations,
        };
    }

    /**
     * Find a cycle path through the SCC starting from the first module.
     *
     * This finds a meaningful path through the cycle by following edges.
     * The result is a path [A, B, C, ...] where A → B → C → ... → A.
     */
    private findCyclePath(scc: string[]): string[] {
        if (scc.length === 0) return [];
        if (scc.length === 1) return scc;

        const sccSet = new Set(scc);
        const startNode = scc[0];
        if (startNode === undefined) return scc;

        // Use DFS to find a cycle starting and ending at startNode
        const path: string[] = [];
        const visited = new Set<string>();

        const dfs = (current: string): boolean => {
            path.push(current);
            visited.add(current);

            const edges = this.graph.getDependencyEdges(current);
            for (const edge of edges) {
                // Only follow edges within the SCC
                if (!sccSet.has(edge.to)) continue;

                if (edge.to === startNode && path.length > 1) {
                    // Found cycle back to start
                    return true;
                }

                if (!visited.has(edge.to)) {
                    if (dfs(edge.to)) {
                        return true;
                    }
                }
            }

            // Backtrack
            path.pop();
            visited.delete(current);
            return false;
        };

        dfs(startNode);

        // If DFS didn't find a cycle (shouldn't happen for valid SCC), return sorted SCC
        if (path.length === 0) {
            return scc;
        }

        return path;
    }

    /**
     * Check if all edges in a cycle path are type-only.
     */
    private isTypeOnlyCycle(cyclePath: string[]): boolean {
        if (cyclePath.length < 2) return true;

        for (let i = 0; i < cyclePath.length; i++) {
            const from = cyclePath[i];
            const toIndex = (i + 1) % cyclePath.length;
            const to = cyclePath[toIndex];
            if (from === undefined || to === undefined) continue;

            const edge = this.graph.getEdge(from, to);
            if (edge && !edge.isTypeOnly) {
                return false; // At least one value edge - not type-only
            }
        }

        return true;
    }

    /**
     * Get import locations for each edge in the cycle.
     */
    private getCycleLocations(cyclePath: string[]): Location[] {
        const locations: Location[] = [];

        for (let i = 0; i < cyclePath.length; i++) {
            const from = cyclePath[i];
            const toIndex = (i + 1) % cyclePath.length;
            const to = cyclePath[toIndex];
            if (from === undefined || to === undefined) continue;

            const edge = this.graph.getEdge(from, to);
            if (edge) {
                locations.push(edge.importLoc);
            } else {
                // Fallback - shouldn't happen for valid cycle
                locations.push({
                    file: from,
                    line: 1,
                    column: 1,
                    offset: 0,
                });
            }
        }

        return locations;
    }
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Detect all cycles in a module graph.
 *
 * This is a convenience function that creates a detector and runs detection.
 *
 * @param graph - The module dependency graph to analyze
 * @returns Cycle detection result with cycles and self-imports
 *
 * @example
 * ```typescript
 * const result = detectCycles(graph);
 *
 * for (const selfImport of result.selfImports) {
 *   console.error(`Module cannot import itself: ${selfImport.modulePath}`);
 * }
 *
 * for (const cycle of result.cycles) {
 *   if (!cycle.isTypeOnly) {
 *     console.warn(`Circular dependency: ${cycle.path.join(' → ')} → ${cycle.path[0]}`);
 *   }
 * }
 * ```
 */
export function detectCycles(graph: ModuleGraph): CycleDetectionResult {
    const detector = new CircularDependencyDetector();
    return detector.detectCycles(graph);
}

/**
 * Format a cycle path as a human-readable string.
 *
 * @param cycle - The cycle to format
 * @returns String like "A → B → C → A"
 *
 * @example
 * ```typescript
 * const cycle = { path: ['/a.vf', '/b.vf', '/c.vf'], ... };
 * formatCyclePath(cycle); // "/a.vf → /b.vf → /c.vf → /a.vf"
 * ```
 */
export function formatCyclePath(cycle: Cycle): string {
    if (cycle.path.length === 0) return "";
    return [...cycle.path, cycle.path[0]].join(" → ");
}

/**
 * Format a cycle path using base filenames (without directory paths).
 *
 * @param cycle - The cycle to format
 * @returns String like "a.vf → b.vf → c.vf → a.vf"
 *
 * @example
 * ```typescript
 * const cycle = { path: ['/path/to/a.vf', '/path/to/b.vf'], ... };
 * formatCyclePathShort(cycle); // "a.vf → b.vf → a.vf"
 * ```
 */
export function formatCyclePathShort(cycle: Cycle): string {
    if (cycle.path.length === 0) return "";
    const basenames = cycle.path.map((p) => p.split("/").pop() ?? p);
    return [...basenames, basenames[0]].join(" → ");
}
