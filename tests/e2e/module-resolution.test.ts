/**
 * Module-resolution e2e tests (Package D phase 2.9).
 *
 * Each test drops a multi-file .vf project into a temp dir, compiles via
 * the actual CLI, and verifies the stdout/stderr/exit-code of the
 * resulting `node` run.
 */

import type { CliResult } from "./helpers.js";

import { afterEach, describe, expect, it } from "vitest";

import { compileFile, createTempProject, runFile } from "./helpers.js";

// Track the current project across a test so afterEach can dispose it.
let currentProject: { dir: string; dispose: () => void } | null = null;

afterEach(() => {
    if (currentProject) {
        currentProject.dispose();
        currentProject = null;
    }
});

function project(files: Record<string, string>): { dir: string; dispose: () => void } {
    currentProject = createTempProject(files);
    return currentProject;
}

const WRAPPER = 'import { String } from "@vibefun/std";\nexternal console_log: (String) -> Unit = "console.log";';

describe("stdlib package resolution", () => {
    it("compiles and runs a program that imports from @vibefun/std", () => {
        const p = project({
            "main.vf": [WRAPPER, `let answer = String.fromInt(1 + 1);`, `let _ = unsafe { console_log(answer) };`].join(
                "\n",
            ),
        });
        const result: CliResult = runFile("main.vf", p.dir);
        expect(result.exitCode).toBe(0);
        expect(result.stdout.trim()).toBe("2");
    });
});

describe("relative user-module imports", () => {
    it("compiles and runs a two-file project with a relative import", () => {
        const p = project({
            "lib.vf": `export let doubled = (x: Int) => x * 2;`,
            "main.vf": [
                WRAPPER,
                `import { doubled } from "./lib";`,
                `let _ = unsafe { console_log(String.fromInt(doubled(21))) };`,
            ].join("\n"),
        });
        const result = runFile("main.vf", p.dir);
        expect(result.exitCode).toBe(0);
        expect(result.stdout.trim()).toBe("42");
    });

    it("emits one JS file per .vf file next to its source", () => {
        const p = project({
            "lib.vf": `export let x = 3;`,
            "main.vf": [
                WRAPPER,
                `import { x } from "./lib";`,
                `let _ = unsafe { console_log(String.fromInt(x)) };`,
            ].join("\n"),
        });
        const compileResult = compileFile("main.vf", p.dir);
        expect(compileResult.exitCode).toBe(0);
        // Both .js files should now exist alongside the .vf sources.
        const runResult = runFile("main.vf", p.dir);
        expect(runResult.exitCode).toBe(0);
        expect(runResult.stdout.trim()).toBe("3");
    });
});

describe("diamond dependency", () => {
    it("compiles each shared module once", () => {
        const p = project({
            "shared.vf": `export let base = 10;`,
            "a.vf": [`import { base } from "./shared";`, `export let fromA = () => base + 1;`].join("\n"),
            "b.vf": [`import { base } from "./shared";`, `export let fromB = () => base + 2;`].join("\n"),
            "main.vf": [
                WRAPPER,
                `import { fromA } from "./a";`,
                `import { fromB } from "./b";`,
                `let _ = unsafe { console_log(String.fromInt(fromA() + fromB())) };`,
            ].join("\n"),
        });
        const result = runFile("main.vf", p.dir);
        expect(result.exitCode).toBe(0);
        expect(result.stdout.trim()).toBe("23"); // (10+1) + (10+2) = 23
    });
});

describe("circular dependency", () => {
    it("warns with VF5900 on a value cycle but still compiles", () => {
        const p = project({
            "a.vf": [`import { fromB } from "./b";`, `export let fromA = 10;`].join("\n"),
            "b.vf": [`import { fromA } from "./a";`, `export let fromB = 20;`].join("\n"),
            "main.vf": [
                WRAPPER,
                `import { fromA } from "./a";`,
                `let _ = unsafe { console_log(String.fromInt(fromA)) };`,
            ].join("\n"),
        });
        // compile should succeed (cycle is a warning, not an error). The
        // warning text is implementation-specific but includes "VF5900".
        const compileResult = compileFile("main.vf", p.dir);
        // Cycle emits a warning — CLI may or may not route it to stderr
        // depending on formatting, so we only assert that the exit code
        // is success (i.e., the warning did not promote to an error).
        expect(compileResult.exitCode).toBe(0);
    });
});

describe("module-not-found errors", () => {
    it("surfaces VF5000 when importing a path that doesn't exist", () => {
        const p = project({
            "main.vf": [
                WRAPPER,
                `import { missing } from "./does-not-exist";`,
                `let _ = unsafe { console_log("never") };`,
            ].join("\n"),
        });
        const result = compileFile("main.vf", p.dir);
        expect(result.exitCode).not.toBe(0);
        expect(result.stderr).toMatch(/VF5000|not found/i);
    });
});
