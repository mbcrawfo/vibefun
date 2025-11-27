/**
 * Tests for the Circular Dependency Detector
 *
 * Tests Tarjan's SCC algorithm implementation for detecting:
 * - Simple cycles (A → B → A)
 * - Complex cycles (A → B → C → A)
 * - Long cycles (10+ modules)
 * - Multiple independent cycles
 * - Self-imports (A → A)
 * - Type-only vs value cycles
 * - Mixed cycles (some type, some value edges)
 */

import type { Location } from "../types/index.js";

import { describe, expect, it } from "vitest";

import { CircularDependencyDetector, detectCycles, formatCyclePath, formatCyclePathShort } from "./cycle-detector.js";
import { ModuleGraph } from "./module-graph.js";

// =============================================================================
// Test Helpers
// =============================================================================

function makeLoc(file: string, line: number = 1): Location {
    return {
        file,
        line,
        column: 1,
        offset: 0,
    };
}

function createGraph(): ModuleGraph {
    return new ModuleGraph();
}

// =============================================================================
// Basic Functionality
// =============================================================================

describe("CircularDependencyDetector", () => {
    describe("no cycles", () => {
        it("should return empty result for empty graph", () => {
            const graph = createGraph();
            const result = detectCycles(graph);

            expect(result.cycles).toHaveLength(0);
            expect(result.selfImports).toHaveLength(0);
        });

        it("should return empty result for single module with no edges", () => {
            const graph = createGraph();
            graph.addModule("/a.vf");

            const result = detectCycles(graph);

            expect(result.cycles).toHaveLength(0);
            expect(result.selfImports).toHaveLength(0);
        });

        it("should return empty result for linear chain A → B → C", () => {
            const graph = createGraph();
            graph.addDependency("/a.vf", "/b.vf", false, makeLoc("/a.vf"));
            graph.addDependency("/b.vf", "/c.vf", false, makeLoc("/b.vf"));

            const result = detectCycles(graph);

            expect(result.cycles).toHaveLength(0);
            expect(result.selfImports).toHaveLength(0);
        });

        it("should return empty result for tree structure", () => {
            const graph = createGraph();
            // A imports B and C
            // B imports D
            // C imports D
            graph.addDependency("/a.vf", "/b.vf", false, makeLoc("/a.vf"));
            graph.addDependency("/a.vf", "/c.vf", false, makeLoc("/a.vf"));
            graph.addDependency("/b.vf", "/d.vf", false, makeLoc("/b.vf"));
            graph.addDependency("/c.vf", "/d.vf", false, makeLoc("/c.vf"));

            const result = detectCycles(graph);

            expect(result.cycles).toHaveLength(0);
            expect(result.selfImports).toHaveLength(0);
        });
    });

    describe("simple cycles", () => {
        it("should detect simple cycle A → B → A", () => {
            const graph = createGraph();
            graph.addDependency("/a.vf", "/b.vf", false, makeLoc("/a.vf"));
            graph.addDependency("/b.vf", "/a.vf", false, makeLoc("/b.vf"));

            const result = detectCycles(graph);

            expect(result.selfImports).toHaveLength(0);
            expect(result.cycles).toHaveLength(1);

            const cycle = result.cycles[0]!;
            expect(cycle.path).toHaveLength(2);
            expect(cycle.path).toContain("/a.vf");
            expect(cycle.path).toContain("/b.vf");
            expect(cycle.isTypeOnly).toBe(false);
            expect(cycle.locations).toHaveLength(2);
        });

        it("should detect cycle A → B → C → A", () => {
            const graph = createGraph();
            graph.addDependency("/a.vf", "/b.vf", false, makeLoc("/a.vf"));
            graph.addDependency("/b.vf", "/c.vf", false, makeLoc("/b.vf"));
            graph.addDependency("/c.vf", "/a.vf", false, makeLoc("/c.vf"));

            const result = detectCycles(graph);

            expect(result.cycles).toHaveLength(1);

            const cycle = result.cycles[0]!;
            expect(cycle.path).toHaveLength(3);
            expect(cycle.isTypeOnly).toBe(false);
            expect(cycle.locations).toHaveLength(3);
        });

        it("should return deterministic cycle order (alphabetical)", () => {
            const graph = createGraph();
            // Add in non-alphabetical order
            graph.addDependency("/c.vf", "/a.vf", false, makeLoc("/c.vf"));
            graph.addDependency("/a.vf", "/b.vf", false, makeLoc("/a.vf"));
            graph.addDependency("/b.vf", "/c.vf", false, makeLoc("/b.vf"));

            const result = detectCycles(graph);

            expect(result.cycles).toHaveLength(1);
            // Cycle should start with alphabetically first module
            expect(result.cycles[0]!.path[0]).toBe("/a.vf");
        });
    });

    describe("self-imports", () => {
        it("should detect self-import A → A", () => {
            const graph = createGraph();
            const loc = makeLoc("/a.vf", 5);
            graph.addDependency("/a.vf", "/a.vf", false, loc);

            const result = detectCycles(graph);

            expect(result.cycles).toHaveLength(0);
            expect(result.selfImports).toHaveLength(1);
            expect(result.selfImports[0]).toEqual({
                modulePath: "/a.vf",
                location: loc,
            });
        });

        it("should detect type-only self-import", () => {
            const graph = createGraph();
            const loc = makeLoc("/a.vf", 3);
            graph.addDependency("/a.vf", "/a.vf", true, loc);

            const result = detectCycles(graph);

            expect(result.selfImports).toHaveLength(1);
            expect(result.selfImports[0]!.modulePath).toBe("/a.vf");
        });

        it("should detect multiple self-imports", () => {
            const graph = createGraph();
            graph.addDependency("/a.vf", "/a.vf", false, makeLoc("/a.vf"));
            graph.addDependency("/b.vf", "/b.vf", false, makeLoc("/b.vf"));
            graph.addDependency("/c.vf", "/c.vf", false, makeLoc("/c.vf"));

            const result = detectCycles(graph);

            expect(result.cycles).toHaveLength(0);
            expect(result.selfImports).toHaveLength(3);
        });

        it("should distinguish self-import from regular cycle", () => {
            const graph = createGraph();
            // Self-import
            graph.addDependency("/a.vf", "/a.vf", false, makeLoc("/a.vf"));
            // Regular cycle
            graph.addDependency("/b.vf", "/c.vf", false, makeLoc("/b.vf"));
            graph.addDependency("/c.vf", "/b.vf", false, makeLoc("/c.vf"));

            const result = detectCycles(graph);

            expect(result.selfImports).toHaveLength(1);
            expect(result.selfImports[0]!.modulePath).toBe("/a.vf");
            expect(result.cycles).toHaveLength(1);
            expect(result.cycles[0]!.path).toContain("/b.vf");
            expect(result.cycles[0]!.path).toContain("/c.vf");
        });
    });

    describe("type-only cycles", () => {
        it("should mark type-only cycle correctly", () => {
            const graph = createGraph();
            graph.addDependency("/a.vf", "/b.vf", true, makeLoc("/a.vf"));
            graph.addDependency("/b.vf", "/a.vf", true, makeLoc("/b.vf"));

            const result = detectCycles(graph);

            expect(result.cycles).toHaveLength(1);
            expect(result.cycles[0]!.isTypeOnly).toBe(true);
        });

        it("should mark mixed cycle (type + value) as not type-only", () => {
            const graph = createGraph();
            graph.addDependency("/a.vf", "/b.vf", true, makeLoc("/a.vf")); // type-only
            graph.addDependency("/b.vf", "/a.vf", false, makeLoc("/b.vf")); // value

            const result = detectCycles(graph);

            expect(result.cycles).toHaveLength(1);
            expect(result.cycles[0]!.isTypeOnly).toBe(false);
        });

        it("should mark all-value cycle as not type-only", () => {
            const graph = createGraph();
            graph.addDependency("/a.vf", "/b.vf", false, makeLoc("/a.vf"));
            graph.addDependency("/b.vf", "/a.vf", false, makeLoc("/b.vf"));

            const result = detectCycles(graph);

            expect(result.cycles).toHaveLength(1);
            expect(result.cycles[0]!.isTypeOnly).toBe(false);
        });

        it("should handle 3-node type-only cycle", () => {
            const graph = createGraph();
            graph.addDependency("/a.vf", "/b.vf", true, makeLoc("/a.vf"));
            graph.addDependency("/b.vf", "/c.vf", true, makeLoc("/b.vf"));
            graph.addDependency("/c.vf", "/a.vf", true, makeLoc("/c.vf"));

            const result = detectCycles(graph);

            expect(result.cycles).toHaveLength(1);
            expect(result.cycles[0]!.isTypeOnly).toBe(true);
        });

        it("should detect single value edge in otherwise type-only cycle", () => {
            const graph = createGraph();
            graph.addDependency("/a.vf", "/b.vf", true, makeLoc("/a.vf"));
            graph.addDependency("/b.vf", "/c.vf", true, makeLoc("/b.vf"));
            graph.addDependency("/c.vf", "/d.vf", false, makeLoc("/c.vf")); // value!
            graph.addDependency("/d.vf", "/a.vf", true, makeLoc("/d.vf"));

            const result = detectCycles(graph);

            expect(result.cycles).toHaveLength(1);
            expect(result.cycles[0]!.isTypeOnly).toBe(false);
        });
    });

    describe("complex and long cycles", () => {
        it("should detect 4-node cycle", () => {
            const graph = createGraph();
            graph.addDependency("/a.vf", "/b.vf", false, makeLoc("/a.vf"));
            graph.addDependency("/b.vf", "/c.vf", false, makeLoc("/b.vf"));
            graph.addDependency("/c.vf", "/d.vf", false, makeLoc("/c.vf"));
            graph.addDependency("/d.vf", "/a.vf", false, makeLoc("/d.vf"));

            const result = detectCycles(graph);

            expect(result.cycles).toHaveLength(1);
            expect(result.cycles[0]!.path).toHaveLength(4);
        });

        it("should detect 10+ module cycle", () => {
            const graph = createGraph();
            const modules = Array.from({ length: 12 }, (_, i) => `/mod${i.toString().padStart(2, "0")}.vf`);

            // Create cycle: mod00 → mod01 → ... → mod11 → mod00
            for (let i = 0; i < modules.length; i++) {
                const from = modules[i]!;
                const to = modules[(i + 1) % modules.length]!;
                graph.addDependency(from, to, false, makeLoc(from));
            }

            const result = detectCycles(graph);

            expect(result.cycles).toHaveLength(1);
            expect(result.cycles[0]!.path).toHaveLength(12);
        });

        it("should handle cycle with extra modules hanging off", () => {
            const graph = createGraph();
            // Cycle: A → B → C → A
            graph.addDependency("/a.vf", "/b.vf", false, makeLoc("/a.vf"));
            graph.addDependency("/b.vf", "/c.vf", false, makeLoc("/b.vf"));
            graph.addDependency("/c.vf", "/a.vf", false, makeLoc("/c.vf"));
            // Extra modules
            graph.addDependency("/a.vf", "/d.vf", false, makeLoc("/a.vf"));
            graph.addDependency("/d.vf", "/e.vf", false, makeLoc("/d.vf"));

            const result = detectCycles(graph);

            expect(result.cycles).toHaveLength(1);
            expect(result.cycles[0]!.path).toHaveLength(3);
            expect(result.cycles[0]!.path).not.toContain("/d.vf");
            expect(result.cycles[0]!.path).not.toContain("/e.vf");
        });
    });

    describe("multiple independent cycles", () => {
        it("should detect two independent cycles", () => {
            const graph = createGraph();
            // Cycle 1: A → B → A
            graph.addDependency("/a.vf", "/b.vf", false, makeLoc("/a.vf"));
            graph.addDependency("/b.vf", "/a.vf", false, makeLoc("/b.vf"));
            // Cycle 2: C → D → C
            graph.addDependency("/c.vf", "/d.vf", false, makeLoc("/c.vf"));
            graph.addDependency("/d.vf", "/c.vf", false, makeLoc("/d.vf"));

            const result = detectCycles(graph);

            expect(result.cycles).toHaveLength(2);
        });

        it("should detect three independent cycles", () => {
            const graph = createGraph();
            // Cycle 1
            graph.addDependency("/a1.vf", "/b1.vf", false, makeLoc("/a1.vf"));
            graph.addDependency("/b1.vf", "/a1.vf", false, makeLoc("/b1.vf"));
            // Cycle 2
            graph.addDependency("/a2.vf", "/b2.vf", false, makeLoc("/a2.vf"));
            graph.addDependency("/b2.vf", "/a2.vf", false, makeLoc("/b2.vf"));
            // Cycle 3
            graph.addDependency("/a3.vf", "/b3.vf", false, makeLoc("/a3.vf"));
            graph.addDependency("/b3.vf", "/a3.vf", false, makeLoc("/b3.vf"));

            const result = detectCycles(graph);

            expect(result.cycles).toHaveLength(3);
        });

        it("should detect both type-only and value cycles", () => {
            const graph = createGraph();
            // Type-only cycle
            graph.addDependency("/a.vf", "/b.vf", true, makeLoc("/a.vf"));
            graph.addDependency("/b.vf", "/a.vf", true, makeLoc("/b.vf"));
            // Value cycle
            graph.addDependency("/c.vf", "/d.vf", false, makeLoc("/c.vf"));
            graph.addDependency("/d.vf", "/c.vf", false, makeLoc("/d.vf"));

            const result = detectCycles(graph);

            expect(result.cycles).toHaveLength(2);

            const typeOnlyCycle = result.cycles.find((c) => c.isTypeOnly);
            const valueCycle = result.cycles.find((c) => !c.isTypeOnly);

            expect(typeOnlyCycle).toBeDefined();
            expect(valueCycle).toBeDefined();
        });
    });

    describe("re-exports in cycles", () => {
        it("should detect cycle through re-exports", () => {
            const graph = createGraph();
            // A exports from B, B exports from C, C imports A
            graph.addDependency("/a.vf", "/b.vf", false, makeLoc("/a.vf"), true); // re-export
            graph.addDependency("/b.vf", "/c.vf", false, makeLoc("/b.vf"), true); // re-export
            graph.addDependency("/c.vf", "/a.vf", false, makeLoc("/c.vf"));

            const result = detectCycles(graph);

            expect(result.cycles).toHaveLength(1);
            expect(result.cycles[0]!.path).toHaveLength(3);
        });
    });

    describe("location tracking", () => {
        it("should track import locations for each edge in cycle", () => {
            const graph = createGraph();
            const locA = makeLoc("/a.vf", 10);
            const locB = makeLoc("/b.vf", 20);

            graph.addDependency("/a.vf", "/b.vf", false, locA);
            graph.addDependency("/b.vf", "/a.vf", false, locB);

            const result = detectCycles(graph);

            expect(result.cycles).toHaveLength(1);
            const cycle = result.cycles[0]!;

            expect(cycle.locations).toHaveLength(2);
            // Locations should match the edges in cycle order
        });

        it("should track self-import location", () => {
            const graph = createGraph();
            const loc = makeLoc("/a.vf", 42);
            graph.addDependency("/a.vf", "/a.vf", false, loc);

            const result = detectCycles(graph);

            expect(result.selfImports).toHaveLength(1);
            expect(result.selfImports[0]!.location.line).toBe(42);
        });
    });
});

// =============================================================================
// Format Functions
// =============================================================================

describe("formatCyclePath", () => {
    it("should format simple cycle", () => {
        const cycle = {
            path: ["/a.vf", "/b.vf"],
            isTypeOnly: false,
            locations: [],
        };

        expect(formatCyclePath(cycle)).toBe("/a.vf → /b.vf → /a.vf");
    });

    it("should format 3-node cycle", () => {
        const cycle = {
            path: ["/a.vf", "/b.vf", "/c.vf"],
            isTypeOnly: false,
            locations: [],
        };

        expect(formatCyclePath(cycle)).toBe("/a.vf → /b.vf → /c.vf → /a.vf");
    });

    it("should handle empty cycle", () => {
        const cycle = {
            path: [],
            isTypeOnly: false,
            locations: [],
        };

        expect(formatCyclePath(cycle)).toBe("");
    });

    it("should handle single-node cycle", () => {
        const cycle = {
            path: ["/a.vf"],
            isTypeOnly: false,
            locations: [],
        };

        expect(formatCyclePath(cycle)).toBe("/a.vf → /a.vf");
    });
});

describe("formatCyclePathShort", () => {
    it("should format with basenames only", () => {
        const cycle = {
            path: ["/path/to/a.vf", "/path/to/b.vf"],
            isTypeOnly: false,
            locations: [],
        };

        expect(formatCyclePathShort(cycle)).toBe("a.vf → b.vf → a.vf");
    });

    it("should handle mixed paths", () => {
        const cycle = {
            path: ["/foo/a.vf", "/bar/b.vf", "/baz/c.vf"],
            isTypeOnly: false,
            locations: [],
        };

        expect(formatCyclePathShort(cycle)).toBe("a.vf → b.vf → c.vf → a.vf");
    });

    it("should handle empty cycle", () => {
        const cycle = {
            path: [],
            isTypeOnly: false,
            locations: [],
        };

        expect(formatCyclePathShort(cycle)).toBe("");
    });
});

// =============================================================================
// Detector Class Direct Usage
// =============================================================================

describe("CircularDependencyDetector class", () => {
    it("should be reusable for multiple graphs", () => {
        const detector = new CircularDependencyDetector();

        // First graph with cycle
        const graph1 = createGraph();
        graph1.addDependency("/a.vf", "/b.vf", false, makeLoc("/a.vf"));
        graph1.addDependency("/b.vf", "/a.vf", false, makeLoc("/b.vf"));

        const result1 = detector.detectCycles(graph1);
        expect(result1.cycles).toHaveLength(1);

        // Second graph without cycle
        const graph2 = createGraph();
        graph2.addDependency("/x.vf", "/y.vf", false, makeLoc("/x.vf"));

        const result2 = detector.detectCycles(graph2);
        expect(result2.cycles).toHaveLength(0);
    });
});

// =============================================================================
// Edge Cases and Performance
// =============================================================================

describe("edge cases", () => {
    it("should handle disconnected components", () => {
        const graph = createGraph();
        // Component 1 with cycle
        graph.addDependency("/a.vf", "/b.vf", false, makeLoc("/a.vf"));
        graph.addDependency("/b.vf", "/a.vf", false, makeLoc("/b.vf"));
        // Component 2 without cycle
        graph.addDependency("/x.vf", "/y.vf", false, makeLoc("/x.vf"));
        // Component 3 - isolated node
        graph.addModule("/z.vf");

        const result = detectCycles(graph);

        expect(result.cycles).toHaveLength(1);
        expect(result.selfImports).toHaveLength(0);
    });

    it("should handle overlapping cycles (figure-8 pattern)", () => {
        const graph = createGraph();
        // Two cycles sharing a common node B
        // Cycle 1: A → B → A
        // Cycle 2: B → C → B
        graph.addDependency("/a.vf", "/b.vf", false, makeLoc("/a.vf"));
        graph.addDependency("/b.vf", "/a.vf", false, makeLoc("/b.vf"));
        graph.addDependency("/b.vf", "/c.vf", false, makeLoc("/b.vf"));
        graph.addDependency("/c.vf", "/b.vf", false, makeLoc("/c.vf"));

        const result = detectCycles(graph);

        // Tarjan will find these as one larger SCC
        expect(result.cycles.length).toBeGreaterThanOrEqual(1);
    });

    it("should handle nested cycles", () => {
        const graph = createGraph();
        // Outer cycle: A → B → C → D → A
        // Inner cycle: B → C → B
        graph.addDependency("/a.vf", "/b.vf", false, makeLoc("/a.vf"));
        graph.addDependency("/b.vf", "/c.vf", false, makeLoc("/b.vf"));
        graph.addDependency("/c.vf", "/b.vf", false, makeLoc("/c.vf")); // Inner cycle back edge
        graph.addDependency("/c.vf", "/d.vf", false, makeLoc("/c.vf"));
        graph.addDependency("/d.vf", "/a.vf", false, makeLoc("/d.vf"));

        const result = detectCycles(graph);

        // Should find the combined SCC
        expect(result.cycles.length).toBeGreaterThanOrEqual(1);
    });
});

describe("performance", () => {
    it("should handle 100+ module graph efficiently", () => {
        const graph = createGraph();
        const count = 100;

        // Create a large cycle
        for (let i = 0; i < count; i++) {
            const from = `/mod${i}.vf`;
            const to = `/mod${(i + 1) % count}.vf`;
            graph.addDependency(from, to, false, makeLoc(from));
        }

        const start = Date.now();
        const result = detectCycles(graph);
        const elapsed = Date.now() - start;

        expect(result.cycles).toHaveLength(1);
        expect(result.cycles[0]!.path).toHaveLength(count);
        expect(elapsed).toBeLessThan(1000); // Should complete in under 1 second
    });

    it("should handle 1000-module graph", () => {
        const graph = createGraph();
        const count = 1000;

        // Create a large cycle
        for (let i = 0; i < count; i++) {
            const from = `/mod${i}.vf`;
            const to = `/mod${(i + 1) % count}.vf`;
            graph.addDependency(from, to, false, makeLoc(from));
        }

        const start = Date.now();
        const result = detectCycles(graph);
        const elapsed = Date.now() - start;

        expect(result.cycles).toHaveLength(1);
        expect(result.cycles[0]!.path).toHaveLength(count);
        expect(elapsed).toBeLessThan(5000); // Should complete in under 5 seconds
    });

    it("should handle wide graph (one module imports 100)", () => {
        const graph = createGraph();

        // Main module imports 100 modules, each of which imports main (100 cycles)
        for (let i = 0; i < 100; i++) {
            graph.addDependency("/main.vf", `/dep${i}.vf`, false, makeLoc("/main.vf"));
            graph.addDependency(`/dep${i}.vf`, "/main.vf", false, makeLoc(`/dep${i}.vf`));
        }

        const start = Date.now();
        const result = detectCycles(graph);
        const elapsed = Date.now() - start;

        // All modules form one large SCC
        expect(result.cycles.length).toBeGreaterThanOrEqual(1);
        expect(elapsed).toBeLessThan(1000);
    });
});
