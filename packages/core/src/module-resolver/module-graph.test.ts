/**
 * Tests for ModuleGraph
 */

import type { Location } from "../types/index.js";

import { describe, expect, it } from "vitest";

import { ModuleGraph } from "./module-graph.js";

// Helper to create test locations
function testLoc(file: string, line: number = 1, column: number = 1): Location {
    return { file, line, column, offset: 0 };
}

describe("ModuleGraph", () => {
    describe("addModule", () => {
        it("should add a module to the graph", () => {
            const graph = new ModuleGraph();
            graph.addModule("/path/to/main.vf");

            expect(graph.hasModule("/path/to/main.vf")).toBe(true);
            expect(graph.getModuleCount()).toBe(1);
        });

        it("should not duplicate modules", () => {
            const graph = new ModuleGraph();
            graph.addModule("/path/to/main.vf");
            graph.addModule("/path/to/main.vf");

            expect(graph.getModuleCount()).toBe(1);
        });

        it("should add multiple modules", () => {
            const graph = new ModuleGraph();
            graph.addModule("/path/to/a.vf");
            graph.addModule("/path/to/b.vf");
            graph.addModule("/path/to/c.vf");

            expect(graph.getModuleCount()).toBe(3);
            expect(graph.hasModule("/path/to/a.vf")).toBe(true);
            expect(graph.hasModule("/path/to/b.vf")).toBe(true);
            expect(graph.hasModule("/path/to/c.vf")).toBe(true);
        });
    });

    describe("addDependency", () => {
        it("should add a dependency edge between modules", () => {
            const graph = new ModuleGraph();
            const loc = testLoc("/path/to/main.vf", 1, 1);

            graph.addDependency("/path/to/main.vf", "/path/to/utils.vf", false, loc);

            const edges = graph.getDependencyEdges("/path/to/main.vf");
            expect(edges).toHaveLength(1);
            expect(edges[0]).toMatchObject({
                to: "/path/to/utils.vf",
                isTypeOnly: false,
                isReExport: false,
            });
        });

        it("should automatically add both modules to the graph", () => {
            const graph = new ModuleGraph();
            const loc = testLoc("/path/to/main.vf");

            graph.addDependency("/path/to/main.vf", "/path/to/utils.vf", false, loc);

            expect(graph.hasModule("/path/to/main.vf")).toBe(true);
            expect(graph.hasModule("/path/to/utils.vf")).toBe(true);
        });

        it("should track type-only imports", () => {
            const graph = new ModuleGraph();
            const loc = testLoc("/path/to/main.vf");

            graph.addDependency("/path/to/main.vf", "/path/to/types.vf", true, loc);

            expect(graph.isTypeOnlyEdge("/path/to/main.vf", "/path/to/types.vf")).toBe(true);
        });

        it("should track re-export edges", () => {
            const graph = new ModuleGraph();
            const loc = testLoc("/path/to/main.vf");

            graph.addDependency("/path/to/main.vf", "/path/to/utils.vf", false, loc, true);

            const edges = graph.getDependencyEdges("/path/to/main.vf");
            expect(edges).toHaveLength(1);
            expect(edges[0]?.isReExport).toBe(true);
        });

        it("should store import location on edges", () => {
            const graph = new ModuleGraph();
            const loc = testLoc("/path/to/main.vf", 5, 10);

            graph.addDependency("/path/to/main.vf", "/path/to/utils.vf", false, loc);

            const edge = graph.getEdge("/path/to/main.vf", "/path/to/utils.vf");
            expect(edge?.importLoc).toEqual(loc);
        });
    });

    describe("dual import edge handling", () => {
        it("should upgrade type-only edge to value edge", () => {
            const graph = new ModuleGraph();
            const loc1 = testLoc("/path/to/main.vf", 1, 1);
            const loc2 = testLoc("/path/to/main.vf", 2, 1);

            // First add type-only import
            graph.addDependency("/path/to/main.vf", "/path/to/mod.vf", true, loc1);
            expect(graph.isTypeOnlyEdge("/path/to/main.vf", "/path/to/mod.vf")).toBe(true);

            // Then add value import - should upgrade
            graph.addDependency("/path/to/main.vf", "/path/to/mod.vf", false, loc2);
            expect(graph.isTypeOnlyEdge("/path/to/main.vf", "/path/to/mod.vf")).toBe(false);
        });

        it("should keep value edge when adding type-only", () => {
            const graph = new ModuleGraph();
            const loc1 = testLoc("/path/to/main.vf", 1, 1);
            const loc2 = testLoc("/path/to/main.vf", 2, 1);

            // First add value import
            graph.addDependency("/path/to/main.vf", "/path/to/mod.vf", false, loc1);

            // Then add type-only import - should stay value
            graph.addDependency("/path/to/main.vf", "/path/to/mod.vf", true, loc2);
            expect(graph.isTypeOnlyEdge("/path/to/main.vf", "/path/to/mod.vf")).toBe(false);
        });

        it("should create only one edge for multiple imports to same module", () => {
            const graph = new ModuleGraph();
            const loc1 = testLoc("/path/to/main.vf", 1, 1);
            const loc2 = testLoc("/path/to/main.vf", 2, 1);
            const loc3 = testLoc("/path/to/main.vf", 3, 1);

            graph.addDependency("/path/to/main.vf", "/path/to/mod.vf", true, loc1);
            graph.addDependency("/path/to/main.vf", "/path/to/mod.vf", true, loc2);
            graph.addDependency("/path/to/main.vf", "/path/to/mod.vf", false, loc3);

            const edges = graph.getDependencyEdges("/path/to/main.vf");
            expect(edges).toHaveLength(1);
        });

        it("should keep the first location when merging edges", () => {
            const graph = new ModuleGraph();
            const loc1 = testLoc("/path/to/main.vf", 1, 1);
            const loc2 = testLoc("/path/to/main.vf", 5, 1);

            graph.addDependency("/path/to/main.vf", "/path/to/mod.vf", true, loc1);
            graph.addDependency("/path/to/main.vf", "/path/to/mod.vf", false, loc2);

            const edge = graph.getEdge("/path/to/main.vf", "/path/to/mod.vf");
            expect(edge?.importLoc.line).toBe(1); // First location kept
        });
    });

    describe("getDependencies", () => {
        it("should return all dependency paths", () => {
            const graph = new ModuleGraph();
            const loc = testLoc("/path/to/main.vf");

            graph.addDependency("/path/to/main.vf", "/path/to/a.vf", false, loc);
            graph.addDependency("/path/to/main.vf", "/path/to/b.vf", false, loc);
            graph.addDependency("/path/to/main.vf", "/path/to/c.vf", false, loc);

            const deps = graph.getDependencies("/path/to/main.vf");
            expect(deps).toHaveLength(3);
            expect(deps).toContain("/path/to/a.vf");
            expect(deps).toContain("/path/to/b.vf");
            expect(deps).toContain("/path/to/c.vf");
        });

        it("should return empty array for module with no dependencies", () => {
            const graph = new ModuleGraph();
            graph.addModule("/path/to/leaf.vf");

            const deps = graph.getDependencies("/path/to/leaf.vf");
            expect(deps).toHaveLength(0);
        });

        it("should return empty array for unknown module", () => {
            const graph = new ModuleGraph();
            const deps = graph.getDependencies("/path/to/unknown.vf");
            expect(deps).toHaveLength(0);
        });
    });

    describe("getModules", () => {
        it("should return all modules", () => {
            const graph = new ModuleGraph();
            const loc = testLoc("/path/to/main.vf");

            graph.addModule("/path/to/a.vf");
            graph.addDependency("/path/to/b.vf", "/path/to/c.vf", false, loc);

            const modules = graph.getModules();
            expect(modules).toHaveLength(3);
            expect(modules).toContain("/path/to/a.vf");
            expect(modules).toContain("/path/to/b.vf");
            expect(modules).toContain("/path/to/c.vf");
        });
    });

    describe("hasCycle", () => {
        it("should return false for acyclic graph", () => {
            const graph = new ModuleGraph();
            const loc = testLoc("/test.vf");

            // A -> B -> C (chain, no cycle)
            graph.addDependency("/a.vf", "/b.vf", false, loc);
            graph.addDependency("/b.vf", "/c.vf", false, loc);

            expect(graph.hasCycle()).toBe(false);
        });

        it("should detect simple cycle A -> B -> A", () => {
            const graph = new ModuleGraph();
            const loc = testLoc("/test.vf");

            graph.addDependency("/a.vf", "/b.vf", false, loc);
            graph.addDependency("/b.vf", "/a.vf", false, loc);

            expect(graph.hasCycle()).toBe(true);
        });

        it("should detect longer cycle A -> B -> C -> A", () => {
            const graph = new ModuleGraph();
            const loc = testLoc("/test.vf");

            graph.addDependency("/a.vf", "/b.vf", false, loc);
            graph.addDependency("/b.vf", "/c.vf", false, loc);
            graph.addDependency("/c.vf", "/a.vf", false, loc);

            expect(graph.hasCycle()).toBe(true);
        });

        it("should detect self-loop A -> A", () => {
            const graph = new ModuleGraph();
            const loc = testLoc("/a.vf");

            graph.addDependency("/a.vf", "/a.vf", false, loc);

            expect(graph.hasCycle()).toBe(true);
        });

        it("should return false for empty graph", () => {
            const graph = new ModuleGraph();
            expect(graph.hasCycle()).toBe(false);
        });

        it("should return false for disconnected acyclic components", () => {
            const graph = new ModuleGraph();
            const loc = testLoc("/test.vf");

            // Component 1: A -> B
            graph.addDependency("/a.vf", "/b.vf", false, loc);

            // Component 2: C -> D
            graph.addDependency("/c.vf", "/d.vf", false, loc);

            expect(graph.hasCycle()).toBe(false);
        });

        it("should detect cycle in one of multiple components", () => {
            const graph = new ModuleGraph();
            const loc = testLoc("/test.vf");

            // Component 1: A -> B (no cycle)
            graph.addDependency("/a.vf", "/b.vf", false, loc);

            // Component 2: C -> D -> C (cycle)
            graph.addDependency("/c.vf", "/d.vf", false, loc);
            graph.addDependency("/d.vf", "/c.vf", false, loc);

            expect(graph.hasCycle()).toBe(true);
        });
    });

    describe("getTopologicalOrder", () => {
        it("should return correct order for simple chain", () => {
            const graph = new ModuleGraph();
            const loc = testLoc("/test.vf");

            // A -> B -> C
            graph.addDependency("/a.vf", "/b.vf", false, loc);
            graph.addDependency("/b.vf", "/c.vf", false, loc);

            const result = graph.getTopologicalOrder();
            expect(result.hasCycles).toBe(false);

            // C should come before B, B before A
            const order = result.order;
            expect(order.indexOf("/c.vf")).toBeLessThan(order.indexOf("/b.vf"));
            expect(order.indexOf("/b.vf")).toBeLessThan(order.indexOf("/a.vf"));
        });

        it("should return correct order for diamond dependency", () => {
            const graph = new ModuleGraph();
            const loc = testLoc("/test.vf");

            // A -> B, A -> C, B -> D, C -> D
            graph.addDependency("/a.vf", "/b.vf", false, loc);
            graph.addDependency("/a.vf", "/c.vf", false, loc);
            graph.addDependency("/b.vf", "/d.vf", false, loc);
            graph.addDependency("/c.vf", "/d.vf", false, loc);

            const result = graph.getTopologicalOrder();
            expect(result.hasCycles).toBe(false);

            // D should come before B and C, B and C before A
            const order = result.order;
            expect(order.indexOf("/d.vf")).toBeLessThan(order.indexOf("/b.vf"));
            expect(order.indexOf("/d.vf")).toBeLessThan(order.indexOf("/c.vf"));
            expect(order.indexOf("/b.vf")).toBeLessThan(order.indexOf("/a.vf"));
            expect(order.indexOf("/c.vf")).toBeLessThan(order.indexOf("/a.vf"));
        });

        it("should detect cycles and return all modules", () => {
            const graph = new ModuleGraph();
            const loc = testLoc("/test.vf");

            // A -> B -> A (cycle)
            graph.addDependency("/a.vf", "/b.vf", false, loc);
            graph.addDependency("/b.vf", "/a.vf", false, loc);

            const result = graph.getTopologicalOrder();
            expect(result.hasCycles).toBe(true);
            expect(result.order).toHaveLength(2);
            expect(result.order).toContain("/a.vf");
            expect(result.order).toContain("/b.vf");
        });

        it("should return deterministic order for cyclic modules", () => {
            const graph = new ModuleGraph();
            const loc = testLoc("/test.vf");

            // X -> Y -> Z -> X (cycle, alphabetical order)
            graph.addDependency("/z.vf", "/x.vf", false, loc);
            graph.addDependency("/x.vf", "/y.vf", false, loc);
            graph.addDependency("/y.vf", "/z.vf", false, loc);

            const result1 = graph.getTopologicalOrder();
            const result2 = graph.getTopologicalOrder();

            // Same order every time
            expect(result1.order).toEqual(result2.order);
            // Cyclic modules in alphabetical order
            expect(result1.order).toEqual(["/x.vf", "/y.vf", "/z.vf"]);
        });

        it("should handle mixed cyclic and acyclic modules", () => {
            const graph = new ModuleGraph();
            const loc = testLoc("/test.vf");

            // Acyclic: D -> E
            // Cyclic: A -> B -> A
            // Connection: A -> D
            graph.addDependency("/d.vf", "/e.vf", false, loc);
            graph.addDependency("/a.vf", "/b.vf", false, loc);
            graph.addDependency("/b.vf", "/a.vf", false, loc);
            graph.addDependency("/a.vf", "/d.vf", false, loc);

            const result = graph.getTopologicalOrder();
            expect(result.hasCycles).toBe(true);
            expect(result.order).toHaveLength(4);

            // E should come before D (acyclic part)
            expect(result.order.indexOf("/e.vf")).toBeLessThan(result.order.indexOf("/d.vf"));
        });

        it("should return single module for graph with one node", () => {
            const graph = new ModuleGraph();
            graph.addModule("/only.vf");

            const result = graph.getTopologicalOrder();
            expect(result.hasCycles).toBe(false);
            expect(result.order).toEqual(["/only.vf"]);
        });

        it("should return empty order for empty graph", () => {
            const graph = new ModuleGraph();
            const result = graph.getTopologicalOrder();
            expect(result.hasCycles).toBe(false);
            expect(result.order).toEqual([]);
        });
    });

    describe("getReverseDependencies", () => {
        it("should return modules that depend on target", () => {
            const graph = new ModuleGraph();
            const loc = testLoc("/test.vf");

            // A -> C, B -> C
            graph.addDependency("/a.vf", "/c.vf", false, loc);
            graph.addDependency("/b.vf", "/c.vf", false, loc);

            const reverseDeps = graph.getReverseDependencies("/c.vf");
            expect(reverseDeps).toHaveLength(2);
            expect(reverseDeps).toContain("/a.vf");
            expect(reverseDeps).toContain("/b.vf");
        });

        it("should return empty array for module with no dependents", () => {
            const graph = new ModuleGraph();
            const loc = testLoc("/test.vf");

            graph.addDependency("/a.vf", "/b.vf", false, loc);

            const reverseDeps = graph.getReverseDependencies("/a.vf");
            expect(reverseDeps).toHaveLength(0);
        });
    });

    describe("clone", () => {
        it("should create independent copy of graph", () => {
            const graph = new ModuleGraph();
            const loc = testLoc("/test.vf");

            graph.addDependency("/a.vf", "/b.vf", false, loc);

            const clone = graph.clone();

            // Verify clone has same structure
            expect(clone.hasModule("/a.vf")).toBe(true);
            expect(clone.hasModule("/b.vf")).toBe(true);
            expect(clone.getDependencies("/a.vf")).toContain("/b.vf");

            // Modify original - clone should be unaffected
            graph.addModule("/c.vf");
            expect(clone.hasModule("/c.vf")).toBe(false);

            // Modify clone - original should be unaffected
            clone.addModule("/d.vf");
            expect(graph.hasModule("/d.vf")).toBe(false);
        });

        it("should preserve edge properties in clone", () => {
            const graph = new ModuleGraph();
            const loc = testLoc("/a.vf", 5, 10);

            graph.addDependency("/a.vf", "/b.vf", true, loc, true);

            const clone = graph.clone();
            const edge = clone.getEdge("/a.vf", "/b.vf");

            expect(edge?.isTypeOnly).toBe(true);
            expect(edge?.isReExport).toBe(true);
            expect(edge?.importLoc).toEqual(loc);
        });
    });

    describe("isTypeOnlyEdge", () => {
        it("should return true for type-only edge", () => {
            const graph = new ModuleGraph();
            const loc = testLoc("/test.vf");

            graph.addDependency("/a.vf", "/b.vf", true, loc);
            expect(graph.isTypeOnlyEdge("/a.vf", "/b.vf")).toBe(true);
        });

        it("should return false for value edge", () => {
            const graph = new ModuleGraph();
            const loc = testLoc("/test.vf");

            graph.addDependency("/a.vf", "/b.vf", false, loc);
            expect(graph.isTypeOnlyEdge("/a.vf", "/b.vf")).toBe(false);
        });

        it("should return false for non-existent edge", () => {
            const graph = new ModuleGraph();
            graph.addModule("/a.vf");
            graph.addModule("/b.vf");

            expect(graph.isTypeOnlyEdge("/a.vf", "/b.vf")).toBe(false);
        });

        it("should return false for non-existent source module", () => {
            const graph = new ModuleGraph();
            expect(graph.isTypeOnlyEdge("/unknown.vf", "/b.vf")).toBe(false);
        });
    });

    describe("getEdge", () => {
        it("should return edge if exists", () => {
            const graph = new ModuleGraph();
            const loc = testLoc("/a.vf", 3, 7);

            graph.addDependency("/a.vf", "/b.vf", true, loc, true);

            const edge = graph.getEdge("/a.vf", "/b.vf");
            expect(edge).toBeDefined();
            expect(edge?.to).toBe("/b.vf");
            expect(edge?.isTypeOnly).toBe(true);
            expect(edge?.importLoc).toEqual(loc);
            expect(edge?.isReExport).toBe(true);
        });

        it("should return undefined for non-existent edge", () => {
            const graph = new ModuleGraph();
            graph.addModule("/a.vf");
            graph.addModule("/b.vf");

            expect(graph.getEdge("/a.vf", "/b.vf")).toBeUndefined();
        });
    });
});
