import type { TypedModule } from "../typechecker/typechecker.js";
import type { CoreModule } from "../types/core-ast.js";
import type { TypeEnv } from "../types/environment.js";

import { describe, expect, it } from "vitest";

import { generate } from "./index.js";

/**
 * Create a minimal typed module for testing
 */
function createTypedModule(declarationCount = 0): TypedModule {
    const emptyModule: CoreModule = {
        imports: [],
        declarations: [],
        loc: { file: "test.vf", line: 1, column: 1, offset: 0 },
    };

    const emptyEnv: TypeEnv = {
        values: new Map(),
        types: new Map(),
    };

    const declarationTypes = new Map<string, unknown>();
    for (let i = 0; i < declarationCount; i++) {
        declarationTypes.set(`decl${i}`, { type: "Const", name: "Int" });
    }

    return {
        module: emptyModule,
        env: emptyEnv,
        declarationTypes: declarationTypes as Map<string, never>,
    };
}

describe("generate", () => {
    it("should produce valid ES module output", () => {
        const typedModule = createTypedModule();
        const { code } = generate(typedModule);

        expect(code).toContain("export {};");
    });

    it("should include source filename in comment", () => {
        const typedModule = createTypedModule();
        const { code } = generate(typedModule, { filename: "main.vf" });

        expect(code).toContain("// Source: main.vf");
    });

    it("should use 'unknown' for missing filename", () => {
        const typedModule = createTypedModule();
        const { code } = generate(typedModule);

        expect(code).toContain("// Source: unknown");
    });

    it("should include target ES version in comment", () => {
        const typedModule = createTypedModule();
        const { code } = generate(typedModule);

        expect(code).toContain("// Target: ES2020");
    });

    it("should include vibefun header comment", () => {
        const typedModule = createTypedModule();
        const { code } = generate(typedModule);

        expect(code).toContain("// Vibefun compiled output");
    });

    it("should produce valid ES module structure", () => {
        const typedModule = createTypedModule(5);
        const { code } = generate(typedModule, { filename: "program.vf" });

        // The output should be a valid ES module with export statement
        expect(code).toMatch(/export\s*\{/);
        // Should start with comments
        expect(code).toMatch(/^\/\//);
    });

    describe("target option", () => {
        it("should default to es2020 when target is not specified", () => {
            const typedModule = createTypedModule();
            const { code } = generate(typedModule);

            expect(code).toContain("// Target: ES2020");
        });

        it("should accept explicit es2020 target", () => {
            const typedModule = createTypedModule();
            const { code } = generate(typedModule, { target: "es2020" });

            expect(code).toContain("// Target: ES2020");
        });

        it("should combine target with filename option", () => {
            const typedModule = createTypedModule();
            const { code } = generate(typedModule, {
                target: "es2020",
                filename: "test.vf",
            });

            expect(code).toContain("// Target: ES2020");
            expect(code).toContain("// Source: test.vf");
        });
    });
});
