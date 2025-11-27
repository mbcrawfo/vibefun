/**
 * Tests for Module Resolver API
 *
 * Tests the main resolveModules and loadAndResolveModules functions.
 */

import type { Declaration, Location, Module } from "../types/index.js";
import type { ModuleResolution } from "./resolver.js";

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
    formatErrors,
    formatWarnings,
    hasErrors,
    hasWarnings,
    loadAndResolveModules,
    resolveModules,
} from "./resolver.js";

// =============================================================================
// Test Utilities
// =============================================================================

/**
 * Create a minimal Location for testing.
 */
function loc(file: string, line = 1, column = 1): Location {
    return { file, line, column, offset: 0 };
}

/**
 * Create a minimal Module AST for testing.
 */
function createModule(
    filePath: string,
    imports: Array<{ from: string; items?: Array<{ name: string; isType: boolean }>; isTypeOnly?: boolean }> = [],
    declarations: Declaration[] = [],
): Module {
    const importDecls: Declaration[] = imports.map((imp) => ({
        kind: "ImportDecl" as const,
        items: (imp.items ?? []).map((item) => ({
            name: item.name,
            isType: item.isType,
        })),
        from: imp.from,
        loc: loc(filePath),
    }));

    return {
        imports: importDecls,
        declarations: declarations,
        loc: loc(filePath),
    };
}

/**
 * Create a temp directory for file-based tests.
 */
function createTempDir(): string {
    return fs.mkdtempSync(path.join(os.tmpdir(), "vibefun-resolver-test-"));
}

/**
 * Write a vibefun file for testing.
 */
function writeVfFile(dir: string, name: string, content: string): string {
    const filePath = path.join(dir, name);
    const dirPath = path.dirname(filePath);
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
    fs.writeFileSync(filePath, content, "utf-8");
    return filePath;
}

// =============================================================================
// resolveModules Tests (Pure Function)
// =============================================================================

describe("resolveModules", () => {
    describe("basic functionality", () => {
        it("should return empty result for empty modules map", () => {
            const modules = new Map<string, Module>();
            const resolution = resolveModules(modules);

            expect(resolution.compilationOrder).toEqual([]);
            expect(resolution.warnings).toEqual([]);
            expect(resolution.errors).toEqual([]);
            expect(resolution.modules.size).toBe(0);
            expect(resolution.cycles).toEqual([]);
            expect(resolution.selfImports).toEqual([]);
        });

        it("should handle single module with no imports", () => {
            const modules = new Map<string, Module>();
            modules.set("/path/to/main.vf", createModule("/path/to/main.vf"));

            const resolution = resolveModules(modules);

            expect(resolution.compilationOrder).toEqual(["/path/to/main.vf"]);
            expect(resolution.warnings).toEqual([]);
            expect(resolution.errors).toEqual([]);
            expect(resolution.modules.size).toBe(1);
        });

        it("should order modules in topological order (dependencies first)", () => {
            const modules = new Map<string, Module>();

            // main imports utils
            modules.set("/path/to/main.vf", createModule("/path/to/main.vf", [{ from: "./utils" }]));
            modules.set("/path/to/utils.vf", createModule("/path/to/utils.vf"));

            const resolution = resolveModules(modules);

            // utils should come before main (dependency first)
            const mainIdx = resolution.compilationOrder.indexOf("/path/to/main.vf");
            const utilsIdx = resolution.compilationOrder.indexOf("/path/to/utils.vf");
            expect(utilsIdx).toBeLessThan(mainIdx);
        });

        it("should handle diamond dependency pattern", () => {
            const modules = new Map<string, Module>();

            // Diamond: A -> B,C -> D
            modules.set("/path/to/a.vf", createModule("/path/to/a.vf", [{ from: "./b" }, { from: "./c" }]));
            modules.set("/path/to/b.vf", createModule("/path/to/b.vf", [{ from: "./d" }]));
            modules.set("/path/to/c.vf", createModule("/path/to/c.vf", [{ from: "./d" }]));
            modules.set("/path/to/d.vf", createModule("/path/to/d.vf"));

            const resolution = resolveModules(modules);

            // D should come first, then B and C, then A
            const order = resolution.compilationOrder;
            const aIdx = order.indexOf("/path/to/a.vf");
            const bIdx = order.indexOf("/path/to/b.vf");
            const cIdx = order.indexOf("/path/to/c.vf");
            const dIdx = order.indexOf("/path/to/d.vf");

            expect(dIdx).toBeLessThan(bIdx);
            expect(dIdx).toBeLessThan(cIdx);
            expect(bIdx).toBeLessThan(aIdx);
            expect(cIdx).toBeLessThan(aIdx);
        });
    });

    describe("cycle detection", () => {
        it("should detect value cycle and generate warning", () => {
            const modules = new Map<string, Module>();

            // Cycle: A -> B -> A
            modules.set(
                "/path/to/a.vf",
                createModule("/path/to/a.vf", [
                    {
                        from: "./b",
                        items: [{ name: "x", isType: false }],
                    },
                ]),
            );
            modules.set(
                "/path/to/b.vf",
                createModule("/path/to/b.vf", [
                    {
                        from: "./a",
                        items: [{ name: "y", isType: false }],
                    },
                ]),
            );

            const resolution = resolveModules(modules);

            expect(resolution.cycles.length).toBeGreaterThan(0);
            expect(resolution.warnings.length).toBeGreaterThan(0);
            expect(resolution.warnings[0]?.code).toBe("VF5900");
        });

        it("should not warn for type-only cycles", () => {
            const modules = new Map<string, Module>();

            // Type-only cycle: A -type-> B -type-> A
            modules.set(
                "/path/to/a.vf",
                createModule("/path/to/a.vf", [
                    {
                        from: "./b",
                        items: [{ name: "T", isType: true }],
                    },
                ]),
            );
            modules.set(
                "/path/to/b.vf",
                createModule("/path/to/b.vf", [
                    {
                        from: "./a",
                        items: [{ name: "U", isType: true }],
                    },
                ]),
            );

            const resolution = resolveModules(modules);

            // Should have cycles but no warnings (type-only cycles are safe)
            expect(resolution.cycles.length).toBeGreaterThan(0);
            expect(resolution.warnings.length).toBe(0);
        });
    });

    describe("helper functions", () => {
        it("hasErrors should return true when errors exist", () => {
            const resolution: ModuleResolution = {
                compilationOrder: [],
                warnings: [],
                errors: [
                    {
                        code: "VF5004",
                        format: () => "error",
                    } as unknown as import("../diagnostics/index.js").VibefunDiagnostic,
                ],
                graph: {
                    getModules: () => [],
                    getDependencies: () => [],
                } as unknown as import("./module-graph.js").ModuleGraph,
                modules: new Map(),
                cycles: [],
                selfImports: [],
                entryPoint: null,
                projectRoot: null,
            };

            expect(hasErrors(resolution)).toBe(true);
        });

        it("hasErrors should return false when no errors", () => {
            const resolution: ModuleResolution = {
                compilationOrder: [],
                warnings: [],
                errors: [],
                graph: {
                    getModules: () => [],
                    getDependencies: () => [],
                } as unknown as import("./module-graph.js").ModuleGraph,
                modules: new Map(),
                cycles: [],
                selfImports: [],
                entryPoint: null,
                projectRoot: null,
            };

            expect(hasErrors(resolution)).toBe(false);
        });

        it("hasWarnings should return true when warnings exist", () => {
            const resolution: ModuleResolution = {
                compilationOrder: [],
                warnings: [
                    {
                        code: "VF5900",
                        format: () => "warning",
                    } as unknown as import("../diagnostics/index.js").VibefunDiagnostic,
                ],
                errors: [],
                graph: {
                    getModules: () => [],
                    getDependencies: () => [],
                } as unknown as import("./module-graph.js").ModuleGraph,
                modules: new Map(),
                cycles: [],
                selfImports: [],
                entryPoint: null,
                projectRoot: null,
            };

            expect(hasWarnings(resolution)).toBe(true);
        });

        it("formatErrors should format all errors", () => {
            const resolution: ModuleResolution = {
                compilationOrder: [],
                warnings: [],
                errors: [
                    {
                        code: "VF5004",
                        format: () => "Error 1",
                    } as unknown as import("../diagnostics/index.js").VibefunDiagnostic,
                    {
                        code: "VF5002",
                        format: () => "Error 2",
                    } as unknown as import("../diagnostics/index.js").VibefunDiagnostic,
                ],
                graph: {
                    getModules: () => [],
                    getDependencies: () => [],
                } as unknown as import("./module-graph.js").ModuleGraph,
                modules: new Map(),
                cycles: [],
                selfImports: [],
                entryPoint: null,
                projectRoot: null,
            };

            const formatted = formatErrors(resolution);
            expect(formatted).toEqual(["Error 1", "Error 2"]);
        });

        it("formatWarnings should format all warnings", () => {
            const resolution: ModuleResolution = {
                compilationOrder: [],
                warnings: [
                    {
                        code: "VF5900",
                        format: () => "Warning 1",
                    } as unknown as import("../diagnostics/index.js").VibefunDiagnostic,
                ],
                errors: [],
                graph: {
                    getModules: () => [],
                    getDependencies: () => [],
                } as unknown as import("./module-graph.js").ModuleGraph,
                modules: new Map(),
                cycles: [],
                selfImports: [],
                entryPoint: null,
                projectRoot: null,
            };

            const formatted = formatWarnings(resolution);
            expect(formatted).toEqual(["Warning 1"]);
        });
    });
});

// =============================================================================
// loadAndResolveModules Tests (File-based)
// =============================================================================

describe("loadAndResolveModules", () => {
    let tempDir: string;

    beforeEach(() => {
        tempDir = createTempDir();
    });

    afterEach(() => {
        if (tempDir) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    describe("basic loading", () => {
        it("should load and resolve single module", () => {
            const mainPath = writeVfFile(tempDir, "main.vf", "let x = 1;");

            const resolution = loadAndResolveModules(mainPath);

            expect(resolution.compilationOrder.length).toBe(1);
            expect(resolution.modules.size).toBe(1);
            expect(resolution.errors).toEqual([]);
            // Entry point may have symlinks resolved (e.g., /var vs /private/var on macOS)
            expect(resolution.entryPoint).toMatch(/main\.vf$/);
        });

        it("should load and resolve two modules", () => {
            writeVfFile(tempDir, "utils.vf", "export let x = 42;");
            const mainPath = writeVfFile(tempDir, "main.vf", 'import { x } from "./utils";\nlet result = x + 1;');

            const resolution = loadAndResolveModules(mainPath);

            expect(resolution.modules.size).toBe(2);
            expect(resolution.errors).toEqual([]);

            // utils should be compiled before main
            const mainIdx = resolution.compilationOrder.findIndex((p) => p.endsWith("main.vf"));
            const utilsIdx = resolution.compilationOrder.findIndex((p) => p.endsWith("utils.vf"));
            expect(utilsIdx).toBeLessThan(mainIdx);
        });

        it("should handle diamond dependency", () => {
            writeVfFile(tempDir, "d.vf", "export let base = 1;");
            writeVfFile(tempDir, "b.vf", 'import { base } from "./d";\nexport let b = base + 1;');
            writeVfFile(tempDir, "c.vf", 'import { base } from "./d";\nexport let c = base + 2;');
            const mainPath = writeVfFile(
                tempDir,
                "a.vf",
                'import { b } from "./b";\nimport { c } from "./c";\nlet result = b + c;',
            );

            const resolution = loadAndResolveModules(mainPath);

            expect(resolution.modules.size).toBe(4);
            expect(resolution.errors).toEqual([]);
        });
    });

    describe("cycle detection with files", () => {
        it("should detect circular dependency from files", () => {
            writeVfFile(tempDir, "a.vf", 'import { y } from "./b";\nexport let x = 1;');
            const mainPath = writeVfFile(tempDir, "b.vf", 'import { x } from "./a";\nexport let y = 2;');

            const resolution = loadAndResolveModules(mainPath);

            // Both modules should be loaded
            expect(resolution.modules.size).toBe(2);

            // Should detect cycle
            expect(resolution.cycles.length).toBeGreaterThan(0);

            // Should generate warning for value cycle
            expect(resolution.warnings.length).toBeGreaterThan(0);
        });

        it("should not warn for type-only cycle in files", () => {
            writeVfFile(tempDir, "types-a.vf", 'import type { TypeB } from "./types-b";\ntype TypeA = Int;');
            const mainPath = writeVfFile(
                tempDir,
                "types-b.vf",
                'import type { TypeA } from "./types-a";\ntype TypeB = String;',
            );

            const resolution = loadAndResolveModules(mainPath);

            expect(resolution.modules.size).toBe(2);

            // Should detect cycle
            expect(resolution.cycles.length).toBeGreaterThan(0);

            // But no warnings (type-only)
            const circularWarnings = resolution.warnings.filter((w) => w.code === "VF5900");
            expect(circularWarnings.length).toBe(0);
        });
    });

    describe("error handling", () => {
        it("should throw for missing entry point", () => {
            expect(() => {
                loadAndResolveModules(path.join(tempDir, "nonexistent.vf"));
            }).toThrow();
        });

        it("should throw for missing import", () => {
            const mainPath = writeVfFile(tempDir, "main.vf", 'import { x } from "./missing";\nlet y = x;');

            expect(() => {
                loadAndResolveModules(mainPath);
            }).toThrow();
        });
    });

    describe("project root detection", () => {
        it("should detect project root from vibefun.json", () => {
            // Create vibefun.json
            fs.writeFileSync(path.join(tempDir, "vibefun.json"), JSON.stringify({ compilerOptions: {} }));

            const mainPath = writeVfFile(tempDir, "src/main.vf", "let x = 1;");

            const resolution = loadAndResolveModules(mainPath);

            expect(resolution.projectRoot).toBe(tempDir);
        });
    });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe("integration", () => {
    let tempDir: string;

    beforeEach(() => {
        tempDir = createTempDir();
    });

    afterEach(() => {
        if (tempDir) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    it("should handle realistic multi-module program", () => {
        // Create a realistic project structure
        writeVfFile(tempDir, "lib/math.vf", "export let addNum = 10;");
        writeVfFile(tempDir, "lib/string.vf", "export let strVal = 20;");
        writeVfFile(
            tempDir,
            "utils/helpers.vf",
            'import { addNum } from "../lib/math";\nexport let helperVal = addNum + 1;',
        );
        const mainPath = writeVfFile(
            tempDir,
            "main.vf",
            'import { helperVal } from "./utils/helpers";\nimport { strVal } from "./lib/string";\nlet result = helperVal + strVal;',
        );

        const resolution = loadAndResolveModules(mainPath);

        expect(resolution.modules.size).toBe(4);
        expect(resolution.errors).toEqual([]);

        // Verify topological order
        const order = resolution.compilationOrder;
        const mainIdx = order.findIndex((p) => p.endsWith("main.vf"));
        const helpersIdx = order.findIndex((p) => p.endsWith("helpers.vf"));
        const mathIdx = order.findIndex((p) => p.endsWith("math.vf"));
        const stringIdx = order.findIndex((p) => p.endsWith("string.vf"));

        // Dependencies should come before dependents
        expect(mathIdx).toBeLessThan(helpersIdx);
        expect(helpersIdx).toBeLessThan(mainIdx);
        expect(stringIdx).toBeLessThan(mainIdx);
    });
});
