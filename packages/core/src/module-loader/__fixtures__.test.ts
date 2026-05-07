/**
 * Meta-test that every `__fixtures__` subdirectory under this module is a
 * valid `.vf` project — i.e. the full pipeline (load → resolve → desugar
 * → typecheck → codegen) runs to completion without errors.
 *
 * If a fixture stops compiling, its owning test relied on the loader
 * accepting input that no longer matches the spec. That's a real bug —
 * file it; do not "fix" the fixture in this chunk.
 */

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { generate } from "../codegen/index.js";
import { desugarModule } from "../desugarer/index.js";
import { loadAndResolveModules } from "../module-resolver/index.js";
import { typeCheck } from "../typechecker/index.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(HERE, "__fixtures__");

/**
 * Pick an entry-point .vf file for a fixture: prefer `main.vf`, otherwise
 * the lexicographically-first .vf at the fixture root. (No fixture today
 * has a deeper layout; keep this simple until one does.)
 */
function findEntryPoint(fixtureDir: string): string | null {
    const entries = fs.readdirSync(fixtureDir).filter((f) => f.endsWith(".vf"));
    if (entries.length === 0) return null;
    if (entries.includes("main.vf")) return path.join(fixtureDir, "main.vf");
    entries.sort();
    return path.join(fixtureDir, entries[0]!);
}

// Wrapped in try/catch so a missing __fixtures__ directory surfaces as a
// failing guard test below instead of a cryptic "failed to import test
// file" error during module evaluation.
const fixtureNames: string[] = (() => {
    try {
        return fs
            .readdirSync(FIXTURES_DIR, { withFileTypes: true })
            .filter((d) => d.isDirectory())
            .map((d) => d.name)
            .sort();
    } catch {
        return [];
    }
})();

describe("findEntryPoint", () => {
    let tmpDir: string;
    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "vf-fixture-meta-"));
    });
    afterEach(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it("returns null when the directory has no .vf files", () => {
        fs.writeFileSync(path.join(tmpDir, "README.md"), "");
        expect(findEntryPoint(tmpDir)).toBeNull();
    });

    it("prefers main.vf when present", () => {
        fs.writeFileSync(path.join(tmpDir, "a.vf"), "");
        fs.writeFileSync(path.join(tmpDir, "main.vf"), "");
        expect(findEntryPoint(tmpDir)).toBe(path.join(tmpDir, "main.vf"));
    });

    it("falls back to the lexicographically-first .vf when main.vf is absent", () => {
        fs.writeFileSync(path.join(tmpDir, "b.vf"), "");
        fs.writeFileSync(path.join(tmpDir, "a.vf"), "");
        expect(findEntryPoint(tmpDir)).toBe(path.join(tmpDir, "a.vf"));
    });
});

describe("module-loader fixtures", () => {
    it("at least one fixture exists (catches accidental directory deletion)", () => {
        expect(fixtureNames.length).toBeGreaterThan(0);
    });

    for (const name of fixtureNames) {
        it(`${name} compiles end-to-end without errors`, () => {
            const fixtureDir = path.join(FIXTURES_DIR, name);
            const entry = findEntryPoint(fixtureDir);
            expect(entry, `${name}: no .vf entry point found`).not.toBeNull();

            const resolution = loadAndResolveModules(entry as string);
            expect(resolution.errors, `${name}: load/resolve errors`).toHaveLength(0);

            for (const modulePath of resolution.compilationOrder) {
                const surface = resolution.modules.get(modulePath);
                expect(surface, `${name}: missing module ${modulePath}`).toBeDefined();
                const core = desugarModule(surface!);
                const typed = typeCheck(core);
                const { code } = generate(typed, { filename: modulePath });
                expect(code.length, `${name}: empty codegen for ${modulePath}`).toBeGreaterThan(0);
            }
        });
    }
});
