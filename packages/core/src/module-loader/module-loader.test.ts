/**
 * Tests for Module Loader
 *
 * Tests the ModuleLoader class which discovers and parses modules transitively.
 */

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { VibefunDiagnostic } from "../diagnostics/index.js";
import { loadModules, ModuleLoader } from "./module-loader.js";

// =============================================================================
// Test Helpers
// =============================================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FIXTURES_DIR = path.join(__dirname, "__fixtures__");

/**
 * Get the path to a fixture
 */
function fixture(...parts: string[]): string {
    return path.join(FIXTURES_DIR, ...parts);
}

/**
 * Create a temporary directory for tests
 */
function createTempDir(): string {
    return fs.mkdtempSync(path.join(os.tmpdir(), "vibefun-module-loader-test-"));
}

/**
 * Remove a temporary directory
 */
function removeTempDir(dir: string): void {
    fs.rmSync(dir, { recursive: true, force: true });
}

/**
 * Write a .vf file
 */
function writeVfFile(dir: string, name: string, content: string): string {
    const filePath = path.join(dir, name);
    fs.writeFileSync(filePath, content, "utf-8");
    return filePath;
}

// =============================================================================
// Tests: Fixture-based
// =============================================================================

describe("ModuleLoader", () => {
    describe("fixture: single-module", () => {
        it("should load a single module with no imports", () => {
            const result = loadModules(fixture("single-module", "main.vf"));

            expect(result.modules.size).toBe(1);
            expect(result.warnings).toHaveLength(0);

            // Entry point should be in modules
            const mainModule = result.modules.get(result.entryPoint);
            expect(mainModule).toBeDefined();
            expect(mainModule?.imports).toHaveLength(0);
            expect(mainModule?.declarations).toHaveLength(2); // let x, let y
        });
    });

    describe("fixture: simple-import", () => {
        it("should load two modules with simple import", () => {
            const result = loadModules(fixture("simple-import", "main.vf"));

            expect(result.modules.size).toBe(2);
            expect(result.warnings).toHaveLength(0);

            // Both modules should be loaded
            const paths = Array.from(result.modules.keys());
            expect(paths.some((p) => p.endsWith("main.vf"))).toBe(true);
            expect(paths.some((p) => p.endsWith("helper.vf"))).toBe(true);
        });
    });

    describe("fixture: diamond-dependency", () => {
        it("should load all modules in diamond pattern (shared once)", () => {
            const result = loadModules(fixture("diamond-dependency", "main.vf"));

            // main imports a and b, both import shared
            // shared should only be loaded once (4 modules total)
            expect(result.modules.size).toBe(4);

            const paths = Array.from(result.modules.keys());
            expect(paths.some((p) => p.endsWith("main.vf"))).toBe(true);
            expect(paths.some((p) => p.endsWith("a.vf"))).toBe(true);
            expect(paths.some((p) => p.endsWith("b.vf"))).toBe(true);
            expect(paths.some((p) => p.endsWith("shared.vf"))).toBe(true);
        });
    });

    describe("fixture: circular", () => {
        it("should handle circular imports without infinite loop", () => {
            const result = loadModules(fixture("circular", "a.vf"));

            // Both modules should be loaded despite circular dependency
            expect(result.modules.size).toBe(2);

            const paths = Array.from(result.modules.keys());
            expect(paths.some((p) => p.endsWith("a.vf"))).toBe(true);
            expect(paths.some((p) => p.endsWith("b.vf"))).toBe(true);
        });
    });

    describe("fixture: re-export", () => {
        it("should discover modules through re-exports", () => {
            const result = loadModules(fixture("re-export", "main.vf"));

            // main -> barrel -> helper
            expect(result.modules.size).toBe(3);

            const paths = Array.from(result.modules.keys());
            expect(paths.some((p) => p.endsWith("main.vf"))).toBe(true);
            expect(paths.some((p) => p.endsWith("barrel.vf"))).toBe(true);
            expect(paths.some((p) => p.endsWith("helper.vf"))).toBe(true);
        });
    });
});

// =============================================================================
// Tests: Temp directory based (for edge cases)
// =============================================================================

describe("ModuleLoader - edge cases", () => {
    let tempDir: string;

    beforeEach(() => {
        tempDir = createTempDir();
    });

    afterEach(() => {
        removeTempDir(tempDir);
    });

    describe("entry point validation", () => {
        it("should throw VF5005 for missing entry point", () => {
            expect(() => loadModules(path.join(tempDir, "nonexistent.vf"))).toThrow(VibefunDiagnostic);

            try {
                loadModules(path.join(tempDir, "nonexistent.vf"));
            } catch (e) {
                expect(e).toBeInstanceOf(VibefunDiagnostic);
                const diag = e as VibefunDiagnostic;
                expect(diag.code).toBe("VF5005");
            }
        });

        it("should resolve entry point with .vf extension added", () => {
            writeVfFile(tempDir, "main.vf", "let x = 1;");

            // Load without .vf extension
            const result = loadModules(path.join(tempDir, "main"));

            expect(result.modules.size).toBe(1);
        });

        it("should resolve directory entry point to index.vf", () => {
            const subdir = path.join(tempDir, "mymodule");
            fs.mkdirSync(subdir);
            writeVfFile(subdir, "index.vf", "let x = 1;");

            // Load directory
            const result = loadModules(subdir);

            expect(result.modules.size).toBe(1);
            expect(result.entryPoint.endsWith("index.vf")).toBe(true);
        });
    });

    describe("import path resolution", () => {
        it("should resolve relative imports ./", () => {
            writeVfFile(tempDir, "main.vf", 'import { x } from "./helper";\nlet y = x;');
            writeVfFile(tempDir, "helper.vf", "export let x = 1;");

            const result = loadModules(path.join(tempDir, "main.vf"));

            expect(result.modules.size).toBe(2);
        });

        it("should resolve relative imports ../", () => {
            const subdir = path.join(tempDir, "sub");
            fs.mkdirSync(subdir);
            writeVfFile(subdir, "main.vf", 'import { x } from "../helper";\nlet y = x;');
            writeVfFile(tempDir, "helper.vf", "export let x = 1;");

            const result = loadModules(path.join(subdir, "main.vf"));

            expect(result.modules.size).toBe(2);
        });

        it("should resolve directory imports to index.vf", () => {
            const utilsDir = path.join(tempDir, "utils");
            fs.mkdirSync(utilsDir);
            writeVfFile(tempDir, "main.vf", 'import { x } from "./utils";\nlet y = x;');
            writeVfFile(utilsDir, "index.vf", "export let x = 1;");

            const result = loadModules(path.join(tempDir, "main.vf"));

            expect(result.modules.size).toBe(2);
        });

        it("should prefer file over directory when both exist", () => {
            const utilsDir = path.join(tempDir, "utils");
            fs.mkdirSync(utilsDir);
            writeVfFile(tempDir, "main.vf", 'import { x } from "./utils";\nlet y = x;');
            writeVfFile(tempDir, "utils.vf", "export let x = 1;"); // File
            writeVfFile(utilsDir, "index.vf", "export let x = 2;"); // Directory

            const result = loadModules(path.join(tempDir, "main.vf"));

            expect(result.modules.size).toBe(2);
            // Should have loaded utils.vf, not utils/index.vf
            const paths = Array.from(result.modules.keys());
            expect(paths.some((p) => p.endsWith("utils.vf"))).toBe(true);
            expect(paths.some((p) => p.endsWith("index.vf"))).toBe(false);
        });
    });

    describe("error handling", () => {
        it("should throw VF5000 for missing imports", () => {
            writeVfFile(tempDir, "main.vf", 'import { x } from "./nonexistent";\nlet y = x;');

            expect(() => loadModules(path.join(tempDir, "main.vf"))).toThrow(VibefunDiagnostic);

            try {
                loadModules(path.join(tempDir, "main.vf"));
            } catch (e) {
                expect(e).toBeInstanceOf(VibefunDiagnostic);
                const diag = e as VibefunDiagnostic;
                expect(diag.code).toBe("VF5000");
            }
        });

        it("should throw VF5004 for self-import", () => {
            writeVfFile(tempDir, "main.vf", 'import { x } from "./main";\nexport let x = 1;');

            expect(() => loadModules(path.join(tempDir, "main.vf"))).toThrow(VibefunDiagnostic);

            try {
                loadModules(path.join(tempDir, "main.vf"));
            } catch (e) {
                expect(e).toBeInstanceOf(VibefunDiagnostic);
                const diag = e as VibefunDiagnostic;
                expect(diag.code).toBe("VF5004");
            }
        });

        it("should collect parse errors", () => {
            writeVfFile(tempDir, "main.vf", 'import { x } from "./bad";\nlet y = x;');
            writeVfFile(tempDir, "bad.vf", "let x = @#$"); // Invalid syntax

            expect(() => loadModules(path.join(tempDir, "main.vf"))).toThrow(VibefunDiagnostic);
        });
    });

    describe("module caching", () => {
        it("should cache modules by real path (not load twice)", () => {
            // Create a diamond: main -> a, b -> shared
            writeVfFile(tempDir, "main.vf", 'import { a } from "./a";\nimport { b } from "./b";');
            writeVfFile(tempDir, "a.vf", 'import { shared } from "./shared";\nexport let a = shared;');
            writeVfFile(tempDir, "b.vf", 'import { shared } from "./shared";\nexport let b = shared;');
            writeVfFile(tempDir, "shared.vf", "export let shared = 1;");

            const result = loadModules(path.join(tempDir, "main.vf"));

            // shared.vf should only be loaded once
            expect(result.modules.size).toBe(4);
        });

        it("should normalize ./utils and ./utils.vf to same module", () => {
            writeVfFile(tempDir, "main.vf", 'import { x } from "./utils";\nimport { y } from "./utils.vf";');
            writeVfFile(tempDir, "utils.vf", "export let x = 1;\nexport let y = 2;");

            const result = loadModules(path.join(tempDir, "main.vf"));

            // utils.vf should only be loaded once
            expect(result.modules.size).toBe(2);
        });
    });

    describe("type-only imports", () => {
        it("should discover type-only imports", () => {
            writeVfFile(tempDir, "main.vf", 'import type { MyType } from "./types";\nlet x = 1;');
            writeVfFile(tempDir, "types.vf", "export type MyType = Int;");

            const result = loadModules(path.join(tempDir, "main.vf"));

            expect(result.modules.size).toBe(2);
        });
    });

    describe("empty modules", () => {
        it("should handle modules with no imports or exports", () => {
            writeVfFile(tempDir, "main.vf", "// Empty module with just a comment");

            const result = loadModules(path.join(tempDir, "main.vf"));

            expect(result.modules.size).toBe(1);
        });
    });

    describe("deep import chains", () => {
        it("should handle deep import chains", () => {
            // Create chain: main -> a -> b -> c -> d
            writeVfFile(tempDir, "main.vf", 'import { x } from "./a";');
            writeVfFile(tempDir, "a.vf", 'import { x } from "./b";\nexport let x = 1;');
            writeVfFile(tempDir, "b.vf", 'import { x } from "./c";\nexport let x = 1;');
            writeVfFile(tempDir, "c.vf", 'import { x } from "./d";\nexport let x = 1;');
            writeVfFile(tempDir, "d.vf", "export let x = 1;");

            const result = loadModules(path.join(tempDir, "main.vf"));

            expect(result.modules.size).toBe(5);
        });
    });

    describe("mixed imports", () => {
        it("should handle files with multiple imports", () => {
            writeVfFile(
                tempDir,
                "main.vf",
                'import { a } from "./a";\nimport { b } from "./b";\nimport { c } from "./c";\nlet result = a + b + c;',
            );
            writeVfFile(tempDir, "a.vf", "export let a = 1;");
            writeVfFile(tempDir, "b.vf", "export let b = 2;");
            writeVfFile(tempDir, "c.vf", "export let c = 3;");

            const result = loadModules(path.join(tempDir, "main.vf"));

            expect(result.modules.size).toBe(4);
        });
    });
});

// =============================================================================
// Tests: ModuleLoader class API
// =============================================================================

describe("ModuleLoader class", () => {
    let tempDir: string;

    beforeEach(() => {
        tempDir = createTempDir();
    });

    afterEach(() => {
        removeTempDir(tempDir);
    });

    it("should be instantiable with default options", () => {
        const loader = new ModuleLoader();
        expect(loader).toBeDefined();
    });

    it("should be instantiable with custom options", () => {
        const loader = new ModuleLoader({ checkCaseSensitivity: false });
        expect(loader).toBeDefined();
    });

    it("should be reusable for multiple load operations", () => {
        writeVfFile(tempDir, "a.vf", "let x = 1;");
        writeVfFile(tempDir, "b.vf", "let y = 2;");

        const loader = new ModuleLoader();

        const result1 = loader.loadModules(path.join(tempDir, "a.vf"));
        expect(result1.modules.size).toBe(1);

        const result2 = loader.loadModules(path.join(tempDir, "b.vf"));
        expect(result2.modules.size).toBe(1);

        // Each call should have independent caches
        expect(result1.entryPoint).not.toBe(result2.entryPoint);
    });
});

// =============================================================================
// Tests: loadModules function API
// =============================================================================

describe("loadModules function", () => {
    let tempDir: string;

    beforeEach(() => {
        tempDir = createTempDir();
    });

    afterEach(() => {
        removeTempDir(tempDir);
    });

    it("should return ModuleLoadResult with all required fields", () => {
        writeVfFile(tempDir, "main.vf", "let x = 1;");

        const result = loadModules(path.join(tempDir, "main.vf"));

        expect(result).toHaveProperty("modules");
        expect(result).toHaveProperty("warnings");
        expect(result).toHaveProperty("entryPoint");
        expect(result).toHaveProperty("projectRoot");

        expect(result.modules).toBeInstanceOf(Map);
        expect(Array.isArray(result.warnings)).toBe(true);
        expect(typeof result.entryPoint).toBe("string");
    });

    it("should accept options", () => {
        writeVfFile(tempDir, "main.vf", "let x = 1;");

        const result = loadModules(path.join(tempDir, "main.vf"), {
            checkCaseSensitivity: false,
        });

        expect(result.modules.size).toBe(1);
    });
});
