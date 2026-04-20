/**
 * Pipeline tests for re-export and namespace-import emission.
 *
 * Drives Vibefun source through the full pipeline (lexer → parser →
 * desugarer → typechecker → codegen) and asserts on the emitted JS
 * shape. We can't VM-execute the output because the target modules
 * live in separate files, so these tests stop at codegen — runtime
 * behaviour is exercised end-to-end via `pnpm run spec:validate`.
 */

import { describe, expect, it } from "vitest";

import { compileToJs } from "./execution-test-helpers.js";

describe("re-export emission (full pipeline)", () => {
    it("emits named re-export verbatim", () => {
        const js = compileToJs(`export { x } from "./inner";`);
        expect(js).toContain('export { x } from "./inner.js";');
    });

    it("emits named re-export with alias", () => {
        const js = compileToJs(`export { x as y } from "./inner";`);
        expect(js).toContain('export { x as y } from "./inner.js";');
    });

    it("emits wildcard re-export", () => {
        const js = compileToJs(`export * from "./inner";`);
        expect(js).toContain('export * from "./inner.js";');
    });

    it("emits multiple re-exports side by side", () => {
        const js = compileToJs(`
            export { a, b as bb } from "./one";
            export * from "./two";
        `);
        expect(js).toContain('export { a, b as bb } from "./one.js";');
        expect(js).toContain('export * from "./two.js";');
    });
});

describe("namespace import emission (full pipeline)", () => {
    it("emits `import * as Alias` on its own line", () => {
        const js = compileToJs(`
            import * as Lib from "./lib";
            let y = Lib.x;
        `);
        expect(js).toContain('import * as Lib from "./lib.js";');
        // And must not collapse into an invalid `import { * as Lib }`.
        expect(js).not.toMatch(/import\s*\{\s*\*/);
    });

    it("splits namespace + named specifiers into separate statements", () => {
        const js = compileToJs(`
            import * as Lib from "./lib";
            import { specific } from "./lib";
            let y = Lib.x;
            let z = specific;
        `);
        expect(js).toContain('import * as Lib from "./lib.js";');
        expect(js).toContain('import { specific } from "./lib.js";');
    });
});
