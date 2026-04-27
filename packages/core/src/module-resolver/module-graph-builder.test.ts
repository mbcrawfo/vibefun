/**
 * Tests for ModuleGraphBuilder
 */

import type { Declaration, ImportItem, Location, Module, Pattern } from "../types/index.js";

import * as fc from "fast-check";
import { describe, expect, it } from "vitest";

import { VibefunDiagnostic } from "../diagnostics/index.js";
import { buildModuleGraph, ModuleGraphBuilder } from "./module-graph-builder.js";

// =============================================================================
// Test Helpers
// =============================================================================

function testLoc(file: string, line: number = 1, column: number = 1): Location {
    return { file, line, column, offset: 0 };
}

/**
 * Helper to create a minimal Module AST
 */
function createModule(file: string, imports: Declaration[] = [], declarations: Declaration[] = []): Module {
    return {
        imports,
        declarations,
        loc: testLoc(file),
    };
}

/**
 * Helper to create an ImportDecl
 */
function createImportDecl(from: string, items: ImportItem[], loc: Location): Declaration {
    return {
        kind: "ImportDecl",
        items,
        from,
        loc,
    };
}

/**
 * Helper to create an ImportItem
 */
function createImportItem(name: string, isType: boolean = false, alias?: string): ImportItem {
    const item: ImportItem = { name, isType };
    if (alias !== undefined) {
        item.alias = alias;
    }
    return item;
}

/**
 * Helper to create a ReExportDecl
 */
function createReExportDecl(from: string, items: ImportItem[] | null, loc: Location): Declaration {
    return {
        kind: "ReExportDecl",
        items,
        from,
        loc,
    };
}

/**
 * Helper to create a LetDecl with a simple variable pattern
 */
function createLetDecl(name: string, loc: Location, exported: boolean = false): Declaration {
    const pattern: Pattern = { kind: "VarPattern", name, loc };
    return {
        kind: "LetDecl",
        recursive: false,
        pattern,
        value: { kind: "IntLit", value: 0, loc },
        mutable: false,
        exported,
        loc,
    };
}

// =============================================================================
// Tests
// =============================================================================

describe("ModuleGraphBuilder", () => {
    describe("basic graph construction", () => {
        it("should build graph with no imports", () => {
            const modules = new Map<string, Module>();
            modules.set("/main.vf", createModule("/main.vf"));

            const pathMap = new Map<string, Map<string, string>>();
            pathMap.set("/main.vf", new Map());

            const result = buildModuleGraph(modules, pathMap);

            expect(result.errors).toHaveLength(0);
            expect(result.graph.hasModule("/main.vf")).toBe(true);
            expect(result.graph.getDependencies("/main.vf")).toHaveLength(0);
        });

        it("should build graph with single import", () => {
            const mainModule = createModule("/main.vf", [
                createImportDecl("./utils", [createImportItem("foo")], testLoc("/main.vf", 1, 1)),
            ]);
            const utilsModule = createModule("/utils.vf");

            const modules = new Map<string, Module>();
            modules.set("/main.vf", mainModule);
            modules.set("/utils.vf", utilsModule);

            const pathMap = new Map<string, Map<string, string>>();
            pathMap.set("/main.vf", new Map([["./utils", "/utils.vf"]]));
            pathMap.set("/utils.vf", new Map());

            const result = buildModuleGraph(modules, pathMap);

            expect(result.errors).toHaveLength(0);
            expect(result.graph.getDependencies("/main.vf")).toEqual(["/utils.vf"]);
        });

        it("should build graph with multiple imports", () => {
            const mainModule = createModule("/main.vf", [
                createImportDecl("./a", [createImportItem("a")], testLoc("/main.vf", 1, 1)),
                createImportDecl("./b", [createImportItem("b")], testLoc("/main.vf", 2, 1)),
                createImportDecl("./c", [createImportItem("c")], testLoc("/main.vf", 3, 1)),
            ]);

            const modules = new Map<string, Module>();
            modules.set("/main.vf", mainModule);
            modules.set("/a.vf", createModule("/a.vf"));
            modules.set("/b.vf", createModule("/b.vf"));
            modules.set("/c.vf", createModule("/c.vf"));

            const pathMap = new Map<string, Map<string, string>>();
            pathMap.set(
                "/main.vf",
                new Map([
                    ["./a", "/a.vf"],
                    ["./b", "/b.vf"],
                    ["./c", "/c.vf"],
                ]),
            );
            pathMap.set("/a.vf", new Map());
            pathMap.set("/b.vf", new Map());
            pathMap.set("/c.vf", new Map());

            const result = buildModuleGraph(modules, pathMap);

            expect(result.errors).toHaveLength(0);
            const deps = result.graph.getDependencies("/main.vf");
            expect(deps).toHaveLength(3);
            expect(deps).toContain("/a.vf");
            expect(deps).toContain("/b.vf");
            expect(deps).toContain("/c.vf");
        });

        it("should handle transitive dependencies", () => {
            // A -> B -> C
            const moduleA = createModule("/a.vf", [createImportDecl("./b", [createImportItem("b")], testLoc("/a.vf"))]);
            const moduleB = createModule("/b.vf", [createImportDecl("./c", [createImportItem("c")], testLoc("/b.vf"))]);
            const moduleC = createModule("/c.vf");

            const modules = new Map<string, Module>();
            modules.set("/a.vf", moduleA);
            modules.set("/b.vf", moduleB);
            modules.set("/c.vf", moduleC);

            const pathMap = new Map<string, Map<string, string>>();
            pathMap.set("/a.vf", new Map([["./b", "/b.vf"]]));
            pathMap.set("/b.vf", new Map([["./c", "/c.vf"]]));
            pathMap.set("/c.vf", new Map());

            const result = buildModuleGraph(modules, pathMap);

            expect(result.errors).toHaveLength(0);
            expect(result.graph.getDependencies("/a.vf")).toEqual(["/b.vf"]);
            expect(result.graph.getDependencies("/b.vf")).toEqual(["/c.vf"]);
        });
    });

    describe("type-only imports", () => {
        it("should mark edge as type-only when all items are type-only", () => {
            const mainModule = createModule("/main.vf", [
                createImportDecl(
                    "./types",
                    [createImportItem("T", true), createImportItem("U", true)],
                    testLoc("/main.vf"),
                ),
            ]);

            const modules = new Map<string, Module>();
            modules.set("/main.vf", mainModule);
            modules.set("/types.vf", createModule("/types.vf"));

            const pathMap = new Map<string, Map<string, string>>();
            pathMap.set("/main.vf", new Map([["./types", "/types.vf"]]));
            pathMap.set("/types.vf", new Map());

            const result = buildModuleGraph(modules, pathMap);

            expect(result.errors).toHaveLength(0);
            expect(result.graph.isTypeOnlyEdge("/main.vf", "/types.vf")).toBe(true);
        });

        it("should mark edge as value when any item is value", () => {
            const mainModule = createModule("/main.vf", [
                createImportDecl(
                    "./mod",
                    [createImportItem("T", true), createImportItem("value", false)],
                    testLoc("/main.vf"),
                ),
            ]);

            const modules = new Map<string, Module>();
            modules.set("/main.vf", mainModule);
            modules.set("/mod.vf", createModule("/mod.vf"));

            const pathMap = new Map<string, Map<string, string>>();
            pathMap.set("/main.vf", new Map([["./mod", "/mod.vf"]]));
            pathMap.set("/mod.vf", new Map());

            const result = buildModuleGraph(modules, pathMap);

            expect(result.errors).toHaveLength(0);
            expect(result.graph.isTypeOnlyEdge("/main.vf", "/mod.vf")).toBe(false);
        });

        it("should treat empty import list (side-effect import) as value import", () => {
            const mainModule = createModule("/main.vf", [createImportDecl("./side-effect", [], testLoc("/main.vf"))]);

            const modules = new Map<string, Module>();
            modules.set("/main.vf", mainModule);
            modules.set("/side-effect.vf", createModule("/side-effect.vf"));

            const pathMap = new Map<string, Map<string, string>>();
            pathMap.set("/main.vf", new Map([["./side-effect", "/side-effect.vf"]]));
            pathMap.set("/side-effect.vf", new Map());

            const result = buildModuleGraph(modules, pathMap);

            expect(result.errors).toHaveLength(0);
            expect(result.graph.isTypeOnlyEdge("/main.vf", "/side-effect.vf")).toBe(false);
        });
    });

    describe("re-export handling", () => {
        it("should create dependency edge for re-export", () => {
            const mainModule = createModule(
                "/main.vf",
                [],
                [createReExportDecl("./utils", [createImportItem("foo")], testLoc("/main.vf"))],
            );

            const modules = new Map<string, Module>();
            modules.set("/main.vf", mainModule);
            modules.set("/utils.vf", createModule("/utils.vf"));

            const pathMap = new Map<string, Map<string, string>>();
            pathMap.set("/main.vf", new Map([["./utils", "/utils.vf"]]));
            pathMap.set("/utils.vf", new Map());

            const result = buildModuleGraph(modules, pathMap);

            expect(result.errors).toHaveLength(0);
            expect(result.graph.getDependencies("/main.vf")).toEqual(["/utils.vf"]);

            const edge = result.graph.getEdge("/main.vf", "/utils.vf");
            expect(edge?.isReExport).toBe(true);
        });

        it("should create dependency edge for wildcard re-export", () => {
            const mainModule = createModule(
                "/main.vf",
                [],
                [createReExportDecl("./all", null, testLoc("/main.vf"))], // null = export *
            );

            const modules = new Map<string, Module>();
            modules.set("/main.vf", mainModule);
            modules.set("/all.vf", createModule("/all.vf"));

            const pathMap = new Map<string, Map<string, string>>();
            pathMap.set("/main.vf", new Map([["./all", "/all.vf"]]));
            pathMap.set("/all.vf", new Map());

            const result = buildModuleGraph(modules, pathMap);

            expect(result.errors).toHaveLength(0);
            expect(result.graph.getDependencies("/main.vf")).toEqual(["/all.vf"]);
        });

        it("should treat re-exports as value imports (conservative)", () => {
            const mainModule = createModule(
                "/main.vf",
                [],
                [createReExportDecl("./mod", [createImportItem("foo")], testLoc("/main.vf"))],
            );

            const modules = new Map<string, Module>();
            modules.set("/main.vf", mainModule);
            modules.set("/mod.vf", createModule("/mod.vf"));

            const pathMap = new Map<string, Map<string, string>>();
            pathMap.set("/main.vf", new Map([["./mod", "/mod.vf"]]));
            pathMap.set("/mod.vf", new Map());

            const result = buildModuleGraph(modules, pathMap);

            // Re-exports are treated as value imports unless explicitly type-only
            expect(result.graph.isTypeOnlyEdge("/main.vf", "/mod.vf")).toBe(false);
        });

        it("should treat type-only re-exports as type-only", () => {
            const mainModule = createModule(
                "/main.vf",
                [],
                [createReExportDecl("./types", [createImportItem("T", true)], testLoc("/main.vf"))],
            );

            const modules = new Map<string, Module>();
            modules.set("/main.vf", mainModule);
            modules.set("/types.vf", createModule("/types.vf"));

            const pathMap = new Map<string, Map<string, string>>();
            pathMap.set("/main.vf", new Map([["./types", "/types.vf"]]));
            pathMap.set("/types.vf", new Map());

            const result = buildModuleGraph(modules, pathMap);

            expect(result.graph.isTypeOnlyEdge("/main.vf", "/types.vf")).toBe(true);
        });

        it("should handle circular re-exports without infinite loop", () => {
            // A re-exports from B, B re-exports from A
            const moduleA = createModule("/a.vf", [], [createReExportDecl("./b", null, testLoc("/a.vf"))]);
            const moduleB = createModule("/b.vf", [], [createReExportDecl("./a", null, testLoc("/b.vf"))]);

            const modules = new Map<string, Module>();
            modules.set("/a.vf", moduleA);
            modules.set("/b.vf", moduleB);

            const pathMap = new Map<string, Map<string, string>>();
            pathMap.set("/a.vf", new Map([["./b", "/b.vf"]]));
            pathMap.set("/b.vf", new Map([["./a", "/a.vf"]]));

            // Should complete without infinite loop
            const result = buildModuleGraph(modules, pathMap);

            expect(result.errors).toHaveLength(0);
            expect(result.graph.getDependencies("/a.vf")).toEqual(["/b.vf"]);
            expect(result.graph.getDependencies("/b.vf")).toEqual(["/a.vf"]);
            expect(result.graph.hasCycle()).toBe(true);
        });
    });

    describe("import conflict detection", () => {
        describe("duplicate imports from different modules", () => {
            it("should detect duplicate import from different modules", () => {
                const mainModule = createModule("/main.vf", [
                    createImportDecl("./a", [createImportItem("x")], testLoc("/main.vf", 1, 1)),
                    createImportDecl("./b", [createImportItem("x")], testLoc("/main.vf", 2, 1)),
                ]);

                const modules = new Map<string, Module>();
                modules.set("/main.vf", mainModule);
                modules.set("/a.vf", createModule("/a.vf"));
                modules.set("/b.vf", createModule("/b.vf"));

                const pathMap = new Map<string, Map<string, string>>();
                pathMap.set(
                    "/main.vf",
                    new Map([
                        ["./a", "/a.vf"],
                        ["./b", "/b.vf"],
                    ]),
                );
                pathMap.set("/a.vf", new Map());
                pathMap.set("/b.vf", new Map());

                const result = buildModuleGraph(modules, pathMap);

                expect(result.errors).toHaveLength(1);
                expect(result.errors[0]?.code).toBe("VF5002");
            });

            it("should allow same name from same module (deduplicate)", () => {
                const mainModule = createModule("/main.vf", [
                    createImportDecl("./utils", [createImportItem("x")], testLoc("/main.vf", 1, 1)),
                    createImportDecl("./utils", [createImportItem("x")], testLoc("/main.vf", 2, 1)),
                ]);

                const modules = new Map<string, Module>();
                modules.set("/main.vf", mainModule);
                modules.set("/utils.vf", createModule("/utils.vf"));

                const pathMap = new Map<string, Map<string, string>>();
                pathMap.set("/main.vf", new Map([["./utils", "/utils.vf"]]));
                pathMap.set("/utils.vf", new Map());

                const result = buildModuleGraph(modules, pathMap);

                expect(result.errors).toHaveLength(0);
            });

            it("should detect duplicate with alias", () => {
                // import { x } from './a'
                // import { y as x } from './b'  <- conflict: both become 'x'
                const mainModule = createModule("/main.vf", [
                    createImportDecl("./a", [createImportItem("x")], testLoc("/main.vf", 1, 1)),
                    createImportDecl("./b", [createImportItem("y", false, "x")], testLoc("/main.vf", 2, 1)),
                ]);

                const modules = new Map<string, Module>();
                modules.set("/main.vf", mainModule);
                modules.set("/a.vf", createModule("/a.vf"));
                modules.set("/b.vf", createModule("/b.vf"));

                const pathMap = new Map<string, Map<string, string>>();
                pathMap.set(
                    "/main.vf",
                    new Map([
                        ["./a", "/a.vf"],
                        ["./b", "/b.vf"],
                    ]),
                );
                pathMap.set("/a.vf", new Map());
                pathMap.set("/b.vf", new Map());

                const result = buildModuleGraph(modules, pathMap);

                expect(result.errors).toHaveLength(1);
                expect(result.errors[0]?.code).toBe("VF5002");
            });

            it("should detect type import + value import same name from different modules", () => {
                const mainModule = createModule("/main.vf", [
                    createImportDecl("./types", [createImportItem("T", true)], testLoc("/main.vf", 1, 1)),
                    createImportDecl("./values", [createImportItem("T", false)], testLoc("/main.vf", 2, 1)),
                ]);

                const modules = new Map<string, Module>();
                modules.set("/main.vf", mainModule);
                modules.set("/types.vf", createModule("/types.vf"));
                modules.set("/values.vf", createModule("/values.vf"));

                const pathMap = new Map<string, Map<string, string>>();
                pathMap.set(
                    "/main.vf",
                    new Map([
                        ["./types", "/types.vf"],
                        ["./values", "/values.vf"],
                    ]),
                );
                pathMap.set("/types.vf", new Map());
                pathMap.set("/values.vf", new Map());

                const result = buildModuleGraph(modules, pathMap);

                expect(result.errors).toHaveLength(1);
                expect(result.errors[0]?.code).toBe("VF5002");
            });
        });

        describe("import shadowing by local declarations", () => {
            it("should detect import shadowed by let declaration", () => {
                const mainModule = createModule(
                    "/main.vf",
                    [createImportDecl("./utils", [createImportItem("x")], testLoc("/main.vf", 1, 1))],
                    [createLetDecl("x", testLoc("/main.vf", 2, 1))],
                );

                const modules = new Map<string, Module>();
                modules.set("/main.vf", mainModule);
                modules.set("/utils.vf", createModule("/utils.vf"));

                const pathMap = new Map<string, Map<string, string>>();
                pathMap.set("/main.vf", new Map([["./utils", "/utils.vf"]]));
                pathMap.set("/utils.vf", new Map());

                const result = buildModuleGraph(modules, pathMap);

                expect(result.errors).toHaveLength(1);
                expect(result.errors[0]?.code).toBe("VF5003");
            });

            it("should not error when different names are used", () => {
                const mainModule = createModule(
                    "/main.vf",
                    [createImportDecl("./utils", [createImportItem("x")], testLoc("/main.vf", 1, 1))],
                    [createLetDecl("y", testLoc("/main.vf", 2, 1))],
                );

                const modules = new Map<string, Module>();
                modules.set("/main.vf", mainModule);
                modules.set("/utils.vf", createModule("/utils.vf"));

                const pathMap = new Map<string, Map<string, string>>();
                pathMap.set("/main.vf", new Map([["./utils", "/utils.vf"]]));
                pathMap.set("/utils.vf", new Map());

                const result = buildModuleGraph(modules, pathMap);

                expect(result.errors).toHaveLength(0);
            });

            it("should detect shadowing with import alias", () => {
                // import { x as y } from './utils'
                // let y = 1  <- shadows the aliased import
                const mainModule = createModule(
                    "/main.vf",
                    [createImportDecl("./utils", [createImportItem("x", false, "y")], testLoc("/main.vf", 1, 1))],
                    [createLetDecl("y", testLoc("/main.vf", 2, 1))],
                );

                const modules = new Map<string, Module>();
                modules.set("/main.vf", mainModule);
                modules.set("/utils.vf", createModule("/utils.vf"));

                const pathMap = new Map<string, Map<string, string>>();
                pathMap.set("/main.vf", new Map([["./utils", "/utils.vf"]]));
                pathMap.set("/utils.vf", new Map());

                const result = buildModuleGraph(modules, pathMap);

                expect(result.errors).toHaveLength(1);
                expect(result.errors[0]?.code).toBe("VF5003");
            });
        });

        describe("edge cases", () => {
            it("should upgrade import from type-only to value when duplicate from same module", () => {
                // import type { T } from './mod'
                // import { T } from './mod'  <- same module, should upgrade to value
                const mainModule = createModule("/main.vf", [
                    createImportDecl("./mod", [createImportItem("T", true)], testLoc("/main.vf", 1, 1)),
                    createImportDecl("./mod", [createImportItem("T", false)], testLoc("/main.vf", 2, 1)),
                ]);

                const modules = new Map<string, Module>();
                modules.set("/main.vf", mainModule);
                modules.set("/mod.vf", createModule("/mod.vf"));

                const pathMap = new Map<string, Map<string, string>>();
                pathMap.set("/main.vf", new Map([["./mod", "/mod.vf"]]));
                pathMap.set("/mod.vf", new Map());

                const result = buildModuleGraph(modules, pathMap);

                // No error - same module
                expect(result.errors).toHaveLength(0);
                // Edge should be value (upgraded from type-only)
                expect(result.graph.isTypeOnlyEdge("/main.vf", "/mod.vf")).toBe(false);
            });

            it("should handle empty import list (side effect import)", () => {
                const mainModule = createModule("/main.vf", [
                    createImportDecl("./side-effect", [], testLoc("/main.vf")),
                ]);

                const modules = new Map<string, Module>();
                modules.set("/main.vf", mainModule);
                modules.set("/side-effect.vf", createModule("/side-effect.vf"));

                const pathMap = new Map<string, Map<string, string>>();
                pathMap.set("/main.vf", new Map([["./side-effect", "/side-effect.vf"]]));
                pathMap.set("/side-effect.vf", new Map());

                const result = buildModuleGraph(modules, pathMap);

                expect(result.errors).toHaveLength(0);
                expect(result.graph.getDependencies("/main.vf")).toEqual(["/side-effect.vf"]);
            });

            it("should handle module not in path map (skip silently)", () => {
                const mainModule = createModule("/main.vf", [
                    createImportDecl("./unknown", [createImportItem("x")], testLoc("/main.vf")),
                ]);

                const modules = new Map<string, Module>();
                modules.set("/main.vf", mainModule);

                const pathMap = new Map<string, Map<string, string>>();
                pathMap.set("/main.vf", new Map()); // No mapping for ./unknown

                const result = buildModuleGraph(modules, pathMap);

                // Should not error - resolution errors are handled by loader
                expect(result.errors).toHaveLength(0);
                expect(result.graph.getDependencies("/main.vf")).toHaveLength(0);
            });
        });
    });

    describe("aliased imports", () => {
        it("should create edge for aliased import", () => {
            const mainModule = createModule("/main.vf", [
                createImportDecl("./mod", [createImportItem("x", false, "y")], testLoc("/main.vf")),
            ]);

            const modules = new Map<string, Module>();
            modules.set("/main.vf", mainModule);
            modules.set("/mod.vf", createModule("/mod.vf"));

            const pathMap = new Map<string, Map<string, string>>();
            pathMap.set("/main.vf", new Map([["./mod", "/mod.vf"]]));
            pathMap.set("/mod.vf", new Map());

            const result = buildModuleGraph(modules, pathMap);

            expect(result.errors).toHaveLength(0);
            expect(result.graph.getDependencies("/main.vf")).toEqual(["/mod.vf"]);
        });
    });

    describe("ModuleGraphBuilder class", () => {
        it("should be reusable via class interface", () => {
            const modules = new Map<string, Module>();
            modules.set("/main.vf", createModule("/main.vf"));

            const pathMap = new Map<string, Map<string, string>>();
            pathMap.set("/main.vf", new Map());

            const builder = new ModuleGraphBuilder(modules, pathMap);
            const result = builder.build();

            expect(result.graph.hasModule("/main.vf")).toBe(true);
        });
    });
});

// =============================================================================
// Property-Based Tests
// =============================================================================

describe("ModuleGraphBuilder — property-based", () => {
    /**
     * Build a Module value from a list of imports. Each import gets a unique
     * local name (`sym0`, `sym1`, …) so the builder cannot collapse them as
     * shadowing/duplicate-import errors (`VF5002`/`VF5003`); we want to
     * exercise edge resolution, not the duplicate-detection path.
     */
    function makeModule(file: string, importPaths: string[]): Module {
        const loc = testLoc(file);
        const decls: Declaration[] = importPaths.map((p, idx) =>
            createImportDecl(p, [createImportItem(`sym${idx}`)], loc),
        );
        return createModule(file, decls, []);
    }

    /**
     * A small generator producing a (modules, pathMap) pair where each
     * generated module imports zero or more of the others. The per-module
     * import indices are deduplicated so each import path is unique within
     * a module — a single module never imports the same target twice (which
     * would also surface as a duplicate-import error and obscure the
     * properties we actually want to test).
     */
    const moduleSetArb = fc.integer({ min: 1, max: 5 }).chain((n) => {
        const files = Array.from({ length: n }, (_, i) => `/m${i}.vf`);
        return fc
            .array(fc.uniqueArray(fc.integer({ min: 0, max: n - 1 }), { maxLength: n }), { minLength: n, maxLength: n })
            .map((importIndices) => {
                const modules = new Map<string, Module>();
                const pathMap = new Map<string, Map<string, string>>();
                for (let i = 0; i < n; i++) {
                    const indices = (importIndices[i] ?? []).filter((j) => j !== i);
                    const importPaths = indices.map((j) => `./m${j}`);
                    const file = files[i] as string;
                    modules.set(file, makeModule(file, importPaths));
                    const m = new Map<string, string>();
                    for (const j of indices) {
                        m.set(`./m${j}`, files[j] as string);
                    }
                    pathMap.set(file, m);
                }
                return { modules, pathMap };
            });
    });

    it("property: build is total — does not throw on a generated module set", () => {
        fc.assert(
            fc.property(moduleSetArb, ({ modules, pathMap }) => {
                const result = buildModuleGraph(modules, pathMap);
                return result !== undefined && result.graph !== undefined && Array.isArray(result.errors);
            }),
        );
    });

    it("property: every input module appears as a node in the resulting graph", () => {
        fc.assert(
            fc.property(moduleSetArb, ({ modules, pathMap }) => {
                const result = buildModuleGraph(modules, pathMap);
                return Array.from(modules.keys()).every((file) => result.graph.hasModule(file));
            }),
        );
    });

    it("property: getDependencies(file) equals the resolved targets in pathMap", () => {
        // Edge resolution is the load-bearing part of the builder. Asserting
        // module count alone lets a build that drops or rewires dependencies
        // pass; comparing the resolved targets per file catches that. The
        // generator emits unique value imports with all targets resolved, so
        // a clean run must produce no errors and no type-only edges — a
        // regression that spuriously raises VF5002/VF5003 or flips edge
        // metadata would now fail this property.
        fc.assert(
            fc.property(moduleSetArb, ({ modules, pathMap }) => {
                const result = buildModuleGraph(modules, pathMap);
                if (result.errors.length !== 0) return false;
                return Array.from(modules.keys()).every((file) => {
                    const expected = Array.from(pathMap.get(file)?.values() ?? [])
                        .slice()
                        .sort();
                    const actual = result.graph.getDependencies(file).slice().sort();
                    return (
                        expected.length === actual.length &&
                        expected.every((dep, i) => dep === actual[i]) &&
                        actual.every((dep) => result.graph.isTypeOnlyEdge(file, dep) === false)
                    );
                });
            }),
        );
    });

    it("property: build is deterministic — same inputs ⇒ same per-file dependency lists", () => {
        // Determinism on counts alone would let two runs produce different
        // diagnostics with the same length and still pass; compare a
        // normalized signature (code + location) for each diagnostic too.
        // Defensive: today's `Diagnostic.location` is required, but using
        // optional-chaining future-proofs the signature against a diagnostic
        // shape that omits location — the property would still report a
        // deterministic mismatch instead of throwing.
        const errorSig = (e: VibefunDiagnostic): string => {
            const loc = e.diagnostic.location;
            return `${e.code}:${loc?.file ?? ""}:${loc?.line ?? -1}:${loc?.column ?? -1}`;
        };
        fc.assert(
            fc.property(moduleSetArb, ({ modules, pathMap }) => {
                // Each run gets independently cloned inputs so a build that
                // mutates `modules` or `pathMap` in place can no longer pass
                // by sharing the mutated state across runs.
                const cloneModule = (m: Module): Module => JSON.parse(JSON.stringify(m)) as Module;
                const cloneModules = (): Map<string, Module> =>
                    new Map(Array.from(modules.entries(), ([file, mod]) => [file, cloneModule(mod)]));
                const clonePathMap = (): Map<string, Map<string, string>> =>
                    new Map(Array.from(pathMap.entries(), ([file, m]) => [file, new Map(m)]));

                const a = buildModuleGraph(cloneModules(), clonePathMap());
                const b = buildModuleGraph(cloneModules(), clonePathMap());
                if (a.graph.getModuleCount() !== b.graph.getModuleCount()) return false;
                const aErr = a.errors.map(errorSig).slice().sort();
                const bErr = b.errors.map(errorSig).slice().sort();
                if (aErr.length !== bErr.length || aErr.some((s, i) => s !== bErr[i])) return false;
                return Array.from(modules.keys()).every((file) => {
                    const left = a.graph.getDependencies(file).slice().sort();
                    const right = b.graph.getDependencies(file).slice().sort();
                    return left.length === right.length && left.every((dep, i) => dep === right[i]);
                });
            }),
        );
    });
});
