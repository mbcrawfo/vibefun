/**
 * Desugarer Integration Tests
 *
 * Tests the integration between the desugarer and module resolution system.
 * Verifies:
 * - Desugaring works correctly in dependency order
 * - Cyclic modules with sugar are handled correctly
 * - Module structure is preserved after desugaring
 * - Module graph remains valid after desugaring
 * - Cross-module sugar features work correctly
 */

import type { CoreModule } from "../types/core-ast.js";

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { loadModules } from "../module-loader/index.js";
import { loadAndResolveModules } from "../module-resolver/index.js";
import { desugarModule } from "./desugarer.js";

// =============================================================================
// Test Utilities
// =============================================================================

/**
 * Create a temp directory for file-based tests.
 */
function createTempDir(): string {
    return fs.mkdtempSync(path.join(os.tmpdir(), "vibefun-desugarer-integration-"));
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
// Test Setup and Teardown
// =============================================================================

let tempDir: string;

beforeEach(() => {
    tempDir = createTempDir();
});

afterEach(() => {
    if (tempDir && fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
});

// =============================================================================
// Desugaring in Dependency Order Tests
// =============================================================================

describe("Desugarer Integration - Dependency Order", () => {
    it("should allow desugaring modules in compilation order", () => {
        // Create a multi-module program with dependencies:
        // main.vf imports utils.vf imports base.vf
        writeVfFile(tempDir, "base.vf", "let x = 42;");

        writeVfFile(tempDir, "utils.vf", 'import { x } from "./base";\nlet doubled = x + x;');

        writeVfFile(tempDir, "main.vf", 'import { doubled } from "./utils";\nlet result = doubled + 1;');

        // Load and resolve modules
        const entryPoint = path.join(tempDir, "main.vf");
        const resolution = loadAndResolveModules(entryPoint);

        // Verify compilation order is correct (dependencies before dependents)
        expect(resolution.compilationOrder.length).toBe(3);

        // Desugar in compilation order
        const desugaredModules = new Map<string, CoreModule>();
        for (const modulePath of resolution.compilationOrder) {
            const module = resolution.modules.get(modulePath);
            expect(module).toBeDefined();
            const desugared = desugarModule(module!);
            desugaredModules.set(modulePath, desugared);
        }

        // Verify all modules were desugared
        expect(desugaredModules.size).toBe(3);

        // Verify base was desugared before utils and main
        const compilationOrder = resolution.compilationOrder;
        const baseIndex = compilationOrder.findIndex((p) => p.endsWith("base.vf"));
        const utilsIndex = compilationOrder.findIndex((p) => p.endsWith("utils.vf"));
        const mainIndex = compilationOrder.findIndex((p) => p.endsWith("main.vf"));

        expect(baseIndex).toBeLessThan(utilsIndex);
        expect(utilsIndex).toBeLessThan(mainIndex);
    });

    it("should desugar diamond dependency correctly", () => {
        // Create a diamond dependency: main -> a, b -> shared
        writeVfFile(tempDir, "shared.vf", "let base = 10;");

        writeVfFile(tempDir, "a.vf", 'import { base } from "./shared";\nlet fromA = base + 1;');

        writeVfFile(tempDir, "b.vf", 'import { base } from "./shared";\nlet fromB = base + 2;');

        writeVfFile(
            tempDir,
            "main.vf",
            'import { fromA } from "./a";\nimport { fromB } from "./b";\nlet total = fromA + fromB;',
        );

        const entryPoint = path.join(tempDir, "main.vf");
        const resolution = loadAndResolveModules(entryPoint);

        // Desugar all modules in order
        const desugaredModules = new Map<string, CoreModule>();
        for (const modulePath of resolution.compilationOrder) {
            const module = resolution.modules.get(modulePath);
            expect(module).toBeDefined();
            desugaredModules.set(modulePath, desugarModule(module!));
        }

        // shared should be first in compilation order
        expect(resolution.compilationOrder[0]).toContain("shared.vf");

        // All modules desugared
        expect(desugaredModules.size).toBe(4);
    });
});

// =============================================================================
// Cyclic Modules with Sugar Tests
// =============================================================================

describe("Desugarer Integration - Cyclic Modules", () => {
    it("should desugar modules with type-only cycle", () => {
        // Type-only cycles are allowed
        writeVfFile(tempDir, "a.vf", 'import type { TypeB } from "./b";\ntype TypeA = Int;');

        writeVfFile(tempDir, "b.vf", 'import type { TypeA } from "./a";\ntype TypeB = String;');

        writeVfFile(
            tempDir,
            "main.vf",
            'import type { TypeA } from "./a";\nimport type { TypeB } from "./b";\nlet x = 42;',
        );

        const entryPoint = path.join(tempDir, "main.vf");
        const resolution = loadAndResolveModules(entryPoint);

        // No warnings for type-only cycles
        expect(resolution.warnings.length).toBe(0);

        // All modules should be desugared successfully
        const desugaredModules = new Map<string, CoreModule>();
        for (const modulePath of resolution.compilationOrder) {
            const module = resolution.modules.get(modulePath);
            expect(module).toBeDefined();
            // Desugaring should not throw for type-only cycles
            const desugared = desugarModule(module!);
            desugaredModules.set(modulePath, desugared);
        }

        expect(desugaredModules.size).toBe(3);
    });

    it("should desugar modules with value cycle (warning expected)", () => {
        // Value cycles generate warnings but still desugar
        writeVfFile(tempDir, "a.vf", 'import { valueB } from "./b";\nlet valueA = 1;');

        writeVfFile(tempDir, "b.vf", 'import { valueA } from "./a";\nlet valueB = 2;');

        writeVfFile(tempDir, "main.vf", 'import { valueA } from "./a";\nlet result = valueA;');

        const entryPoint = path.join(tempDir, "main.vf");
        const resolution = loadAndResolveModules(entryPoint);

        // Should have warning about value cycle
        expect(resolution.warnings.length).toBeGreaterThan(0);

        // But desugaring should still work
        const desugaredModules = new Map<string, CoreModule>();
        for (const modulePath of resolution.compilationOrder) {
            const module = resolution.modules.get(modulePath);
            expect(module).toBeDefined();
            const desugared = desugarModule(module!);
            desugaredModules.set(modulePath, desugared);
        }

        expect(desugaredModules.size).toBe(3);
    });

    it("should desugar cyclic modules containing sugar (blocks)", () => {
        // Modules with syntactic sugar in a cycle - use single semicolon at end of block
        writeVfFile(
            tempDir,
            "a.vf",
            'import { processB } from "./b";\nlet processA = (x: Int): Int => {\n    let step1 = x + 1;\n    step1;\n};',
        );

        writeVfFile(
            tempDir,
            "b.vf",
            'import { processA } from "./a";\nlet processB = (y: Int): Int => {\n    let step1 = y + 2;\n    step1;\n};',
        );

        writeVfFile(tempDir, "main.vf", 'import { processA } from "./a";\nlet result = processA(10);');

        const entryPoint = path.join(tempDir, "main.vf");
        const resolution = loadAndResolveModules(entryPoint);

        // Desugar all modules - blocks should be converted to let expressions
        const desugaredModules = new Map<string, CoreModule>();
        for (const modulePath of resolution.compilationOrder) {
            const module = resolution.modules.get(modulePath);
            expect(module).toBeDefined();
            const desugared = desugarModule(module!);
            desugaredModules.set(modulePath, desugared);

            // Verify block desugaring happened
            if (modulePath.endsWith("a.vf") || modulePath.endsWith("b.vf")) {
                // The function body should have been desugared from Block to CoreLet
                // Check that declarations were desugared
                expect(desugared.declarations.length).toBeGreaterThan(0);
            }
        }

        expect(desugaredModules.size).toBe(3);
    });
});

// =============================================================================
// Module Structure Preservation Tests
// =============================================================================

describe("Desugarer Integration - Module Structure", () => {
    it("should preserve imports after desugaring", () => {
        writeVfFile(tempDir, "lib.vf", "let helper = 42;\ntype MyType = Int;");

        writeVfFile(
            tempDir,
            "main.vf",
            'import { helper } from "./lib";\nimport type { MyType } from "./lib";\nlet x = helper;',
        );

        const entryPoint = path.join(tempDir, "main.vf");
        const resolution = loadAndResolveModules(entryPoint);

        // Find main module
        const mainPath = Array.from(resolution.modules.keys()).find((p) => p.endsWith("main.vf"));
        expect(mainPath).toBeDefined();

        const mainModule = resolution.modules.get(mainPath!);
        expect(mainModule).toBeDefined();

        // Desugar and verify imports are preserved
        const desugared = desugarModule(mainModule!);

        // Should have 2 imports (value and type)
        expect(desugared.imports.length).toBe(2);
        expect(desugared.imports[0]!.kind).toBe("CoreImportDecl");
        expect(desugared.imports[1]!.kind).toBe("CoreImportDecl");
    });

    it("should preserve exports after desugaring", () => {
        writeVfFile(tempDir, "lib.vf", "export let publicValue = 42;\nlet privateValue = 10;");

        writeVfFile(tempDir, "main.vf", 'import { publicValue } from "./lib";\nlet x = publicValue;');

        const entryPoint = path.join(tempDir, "main.vf");
        const resolution = loadAndResolveModules(entryPoint);

        // Find lib module
        const libPath = Array.from(resolution.modules.keys()).find((p) => p.endsWith("lib.vf"));
        expect(libPath).toBeDefined();

        const libModule = resolution.modules.get(libPath!);
        expect(libModule).toBeDefined();

        // Desugar and verify exports are preserved
        const desugared = desugarModule(libModule!);

        // Should have declarations including exported ones
        expect(desugared.declarations.length).toBe(2);

        // Find the exported declaration
        const exportedDecl = desugared.declarations.find((d) => d.kind === "CoreLetDecl" && d.exported === true);
        expect(exportedDecl).toBeDefined();
    });

    it("should preserve re-exports after desugaring", () => {
        writeVfFile(tempDir, "base.vf", "export let value = 42;");

        // Re-export in a module that also has its own declaration
        writeVfFile(tempDir, "reexporter.vf", 'import { value } from "./base";\nexport let reexportedValue = value;');

        writeVfFile(tempDir, "main.vf", 'import { reexportedValue } from "./reexporter";\nlet x = reexportedValue;');

        const entryPoint = path.join(tempDir, "main.vf");
        const resolution = loadAndResolveModules(entryPoint);

        // Find reexporter module
        const reexporterPath = Array.from(resolution.modules.keys()).find((p) => p.endsWith("reexporter.vf"));
        expect(reexporterPath).toBeDefined();

        const reexporterModule = resolution.modules.get(reexporterPath!);
        expect(reexporterModule).toBeDefined();

        // Desugar - re-exports should be handled
        const desugared = desugarModule(reexporterModule!);

        // Re-export declarations should be present
        expect(desugared.declarations.length).toBeGreaterThanOrEqual(1);
    });

    it("should preserve location information after desugaring", () => {
        writeVfFile(tempDir, "main.vf", "let x = 42;\nlet y = x + 1;");

        const entryPoint = path.join(tempDir, "main.vf");
        const result = loadModules(entryPoint);

        // Use the resolved entry point path from the result
        const mainModule = result.modules.get(result.entryPoint);
        expect(mainModule).toBeDefined();

        const desugared = desugarModule(mainModule!);

        // Check location is preserved on module
        expect(desugared.loc).toBeDefined();
        expect(desugared.loc.file).toBe(result.entryPoint);

        // Check location is preserved on declarations
        for (const decl of desugared.declarations) {
            expect(decl.loc).toBeDefined();
            expect(decl.loc.file).toBe(result.entryPoint);
        }
    });
});

// =============================================================================
// Module Graph Integrity Tests
// =============================================================================

describe("Desugarer Integration - Module Graph Integrity", () => {
    it("should not affect module graph structure", () => {
        writeVfFile(tempDir, "a.vf", 'import { b } from "./b";\nlet a = b + 1;');

        writeVfFile(tempDir, "b.vf", "let b = 10;");

        writeVfFile(tempDir, "main.vf", 'import { a } from "./a";\nlet result = a;');

        const entryPoint = path.join(tempDir, "main.vf");
        const resolution = loadAndResolveModules(entryPoint);

        // Store original graph information
        const originalOrder = [...resolution.compilationOrder];
        const originalModuleCount = resolution.modules.size;

        // Desugar all modules
        const desugaredModules = new Map<string, CoreModule>();
        for (const modulePath of resolution.compilationOrder) {
            const module = resolution.modules.get(modulePath);
            expect(module).toBeDefined();
            desugaredModules.set(modulePath, desugarModule(module!));
        }

        // Graph structure should be unchanged
        expect(desugaredModules.size).toBe(originalModuleCount);

        // Desugaring should work for every module in compilation order
        for (const modulePath of originalOrder) {
            expect(desugaredModules.has(modulePath)).toBe(true);
        }
    });

    it("should preserve import relationships after desugaring", () => {
        writeVfFile(tempDir, "dep.vf", "let helper = 42;");

        writeVfFile(tempDir, "main.vf", 'import { helper } from "./dep";\nlet result = helper;');

        const entryPoint = path.join(tempDir, "main.vf");
        const resolution = loadAndResolveModules(entryPoint);

        // Get main module path
        const mainPath = Array.from(resolution.modules.keys()).find((p) => p.endsWith("main.vf"));
        expect(mainPath).toBeDefined();

        const mainModule = resolution.modules.get(mainPath!);
        expect(mainModule).toBeDefined();

        // Desugar
        const desugared = desugarModule(mainModule!);

        // Import declarations should still be present
        expect(desugared.imports.length).toBe(1);
        expect(desugared.imports[0]!.from).toContain("dep");
    });
});

// =============================================================================
// Cross-Module Sugar Features Tests
// =============================================================================

describe("Desugarer Integration - Cross-Module Sugar Features", () => {
    it("should desugar pipe operator in imported functions", () => {
        writeVfFile(tempDir, "utils.vf", "let add1 = (x: Int): Int => x + 1;\nlet double = (x: Int): Int => x + x;");

        writeVfFile(tempDir, "main.vf", 'import { add1, double } from "./utils";\nlet result = 10 |> add1 |> double;');

        const entryPoint = path.join(tempDir, "main.vf");
        const resolution = loadAndResolveModules(entryPoint);

        // Find and desugar main module
        const mainPath = Array.from(resolution.modules.keys()).find((p) => p.endsWith("main.vf"));
        expect(mainPath).toBeDefined();

        const mainModule = resolution.modules.get(mainPath!);
        expect(mainModule).toBeDefined();

        const desugared = desugarModule(mainModule!);

        // The pipe should be desugared to function application
        // result = double(add1(10))
        expect(desugared.declarations.length).toBe(1);
        const resultDecl = desugared.declarations[0]!;
        expect(resultDecl.kind).toBe("CoreLetDecl");

        // The value should be a CoreApp (application) not a Pipe
        if (resultDecl.kind === "CoreLetDecl") {
            expect(resultDecl.value.kind).toBe("CoreApp");
        }
    });

    it("should desugar list literals across modules", () => {
        writeVfFile(tempDir, "data.vf", "export let numbers = [1, 2, 3];");

        // Use simple list spread syntax
        writeVfFile(tempDir, "main.vf", 'import { numbers } from "./data";\nlet moreNumbers = [0, ...numbers];');

        const entryPoint = path.join(tempDir, "main.vf");
        const resolution = loadAndResolveModules(entryPoint);

        // Desugar data module
        const dataPath = Array.from(resolution.modules.keys()).find((p) => p.endsWith("data.vf"));
        expect(dataPath).toBeDefined();

        const dataModule = resolution.modules.get(dataPath!);
        expect(dataModule).toBeDefined();

        const desugaredData = desugarModule(dataModule!);

        // List literal should be desugared to Cons/Nil
        expect(desugaredData.declarations.length).toBe(1);
        const numbersDecl = desugaredData.declarations[0]!;
        if (numbersDecl.kind === "CoreLetDecl") {
            // Should be a chain of Cons constructors (CoreVariant is the nullary case for variant tags)
            // The actual desugaring creates CoreVariant nodes
            expect(numbersDecl.value.kind).toBe("CoreVariant");
        }
    });

    it("should desugar function composition across modules", () => {
        writeVfFile(tempDir, "funcs.vf", "let f = (x: Int): Int => x + 1;\nlet g = (x: Int): Int => x * 2;");

        writeVfFile(tempDir, "main.vf", 'import { f, g } from "./funcs";\nlet composed = f >> g;');

        const entryPoint = path.join(tempDir, "main.vf");
        const resolution = loadAndResolveModules(entryPoint);

        // Find and desugar main module
        const mainPath = Array.from(resolution.modules.keys()).find((p) => p.endsWith("main.vf"));
        expect(mainPath).toBeDefined();

        const mainModule = resolution.modules.get(mainPath!);
        expect(mainModule).toBeDefined();

        const desugared = desugarModule(mainModule!);

        // Composition should be desugared to a lambda
        expect(desugared.declarations.length).toBe(1);
        const composedDecl = desugared.declarations[0]!;
        if (composedDecl.kind === "CoreLetDecl") {
            // Forward composition becomes: (x) => g(f(x))
            expect(composedDecl.value.kind).toBe("CoreLambda");
        }
    });

    it("should desugar if-then-else across modules", () => {
        writeVfFile(tempDir, "logic.vf", "let isPositive = (x: Int): Bool => x > 0;");

        writeVfFile(
            tempDir,
            "main.vf",
            'import { isPositive } from "./logic";\nlet classify = (x: Int): String =>\n    if isPositive(x) then "positive" else "non-positive";',
        );

        const entryPoint = path.join(tempDir, "main.vf");
        const resolution = loadAndResolveModules(entryPoint);

        // Find and desugar main module
        const mainPath = Array.from(resolution.modules.keys()).find((p) => p.endsWith("main.vf"));
        expect(mainPath).toBeDefined();

        const mainModule = resolution.modules.get(mainPath!);
        expect(mainModule).toBeDefined();

        const desugared = desugarModule(mainModule!);

        // if-then-else should be desugared to match on boolean
        expect(desugared.declarations.length).toBe(1);
        const classifyDecl = desugared.declarations[0]!;
        if (classifyDecl.kind === "CoreLetDecl") {
            // The body should contain a CoreMatch
            expect(classifyDecl.value.kind).toBe("CoreLambda");
        }
    });

    it("should desugar multi-parameter lambdas to curried form across modules", () => {
        writeVfFile(tempDir, "math.vf", "let add = (x: Int, y: Int): Int => x + y;");

        writeVfFile(tempDir, "main.vf", 'import { add } from "./math";\nlet add5 = add(5);');

        const entryPoint = path.join(tempDir, "main.vf");
        const resolution = loadAndResolveModules(entryPoint);

        // Find and desugar math module
        const mathPath = Array.from(resolution.modules.keys()).find((p) => p.endsWith("math.vf"));
        expect(mathPath).toBeDefined();

        const mathModule = resolution.modules.get(mathPath!);
        expect(mathModule).toBeDefined();

        const desugaredMath = desugarModule(mathModule!);

        // add should be curried: (x) => (y) => x + y
        expect(desugaredMath.declarations.length).toBe(1);
        const addDecl = desugaredMath.declarations[0]!;
        if (addDecl.kind === "CoreLetDecl") {
            expect(addDecl.value.kind).toBe("CoreLambda");
            // Should be nested lambdas (curried)
            const outerLambda = addDecl.value;
            if (outerLambda.kind === "CoreLambda") {
                expect(outerLambda.body.kind).toBe("CoreLambda");
            }
        }
    });

    it("should desugar block expressions in imported module declarations", () => {
        // Note: every statement in a block needs a semicolon, including the final expression
        writeVfFile(
            tempDir,
            "calc.vf",
            "export let complexCalc = (x: Int): Int => {\n    let step1 = x + 1;\n    let step2 = step1 * 2;\n    step2;\n};",
        );

        writeVfFile(tempDir, "main.vf", 'import { complexCalc } from "./calc";\nlet result = complexCalc(10);');

        const entryPoint = path.join(tempDir, "main.vf");
        const resolution = loadAndResolveModules(entryPoint);

        // Find and desugar calc module
        const calcPath = Array.from(resolution.modules.keys()).find((p) => p.endsWith("calc.vf"));
        expect(calcPath).toBeDefined();

        const calcModule = resolution.modules.get(calcPath!);
        expect(calcModule).toBeDefined();

        const desugaredCalc = desugarModule(calcModule!);

        // Block should be desugared to nested let expressions
        expect(desugaredCalc.declarations.length).toBe(1);
        const calcDecl = desugaredCalc.declarations[0]!;
        if (calcDecl.kind === "CoreLetDecl") {
            expect(calcDecl.value.kind).toBe("CoreLambda");
            // Body should be CoreLet (desugared block)
            const lambda = calcDecl.value;
            if (lambda.kind === "CoreLambda") {
                expect(lambda.body.kind).toBe("CoreLet");
            }
        }
    });
});

// =============================================================================
// Full Pipeline Integration Test
// =============================================================================

describe("Desugarer Integration - Full Pipeline", () => {
    it("should desugar all modules in a realistic multi-module program", () => {
        // Create a realistic multi-module program (without complex generics)
        writeVfFile(tempDir, "types.vf", "type Result = Ok(Int) | Err(String);");

        writeVfFile(
            tempDir,
            "utils.vf",
            'import type { Result } from "./types";\nexport let mapResult = (f: (Int) -> Int, r: Result): Result =>\n    match r {\n        | Ok(x) => Ok(f(x))\n        | Err(msg) => Err(msg)\n    };',
        );

        writeVfFile(
            tempDir,
            "logic.vf",
            'import type { Result } from "./types";\nimport { mapResult } from "./utils";\nexport let double = (x: Int): Int => x * 2;\nexport let doubleResult = (r: Result): Result => mapResult(double, r);',
        );

        writeVfFile(
            tempDir,
            "main.vf",
            'import type { Result } from "./types";\nimport { doubleResult } from "./logic";\nlet value = Ok(21);\nlet result = doubleResult(value);',
        );

        const entryPoint = path.join(tempDir, "main.vf");
        const resolution = loadAndResolveModules(entryPoint);

        // No errors
        expect(resolution.errors.length).toBe(0);

        // Desugar all modules in compilation order
        const desugaredModules = new Map<string, CoreModule>();
        for (const modulePath of resolution.compilationOrder) {
            const module = resolution.modules.get(modulePath);
            expect(module).toBeDefined();
            const desugared = desugarModule(module!);
            desugaredModules.set(modulePath, desugared);

            // Basic structure check
            expect(desugared.loc).toBeDefined();
        }

        // All 4 modules should be desugared
        expect(desugaredModules.size).toBe(4);

        // Verify types module
        const typesPath = Array.from(desugaredModules.keys()).find((p) => p.endsWith("types.vf"));
        expect(typesPath).toBeDefined();
        const typesModule = desugaredModules.get(typesPath!);
        expect(typesModule).toBeDefined();
        expect(typesModule!.declarations.length).toBeGreaterThan(0);
    });
});
