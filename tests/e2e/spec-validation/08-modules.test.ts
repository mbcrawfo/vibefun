/**
 * Spec validation: Section 08 — Modules.
 *
 * Covers exports, imports (named/namespace/type), re-exports, module
 * initialization, circular dependencies. Module tests need real files
 * on disk, so each test materializes a temp project via
 * `createTempProject` and disposes it in `afterEach`.
 */

import { afterEach, describe, expect, it } from "vitest";

import { compileFile, createTempProject, runFile } from "../helpers.js";

let activeProjects: Array<{ dir: string; dispose: () => void }> = [];

afterEach(() => {
    for (const p of activeProjects) {
        p.dispose();
    }
    activeProjects = [];
});

function runModuleTest(
    files: Record<string, string>,
    mainFile: string,
    check: "compiles" | "compileError" | "runs" | "output",
    expected?: string,
): void {
    const project = createTempProject(files);
    activeProjects.push(project);

    if (check === "compiles") {
        const r = compileFile(mainFile, project.dir);
        expect(r.exitCode, `expected compile success\nstderr:\n${r.stderr}`).toBe(0);
        return;
    }
    if (check === "compileError") {
        const r = compileFile(mainFile, project.dir);
        expect(r.exitCode, `expected compile error, got exit code 0`).not.toBe(0);
        return;
    }
    const r = runFile(mainFile, project.dir);
    if (check === "runs") {
        expect(r.exitCode, `expected successful run\nstderr:\n${r.stderr}`).toBe(0);
        return;
    }
    expect(r.exitCode, `expected successful run\nstderr:\n${r.stderr}`).toBe(0);
    if (expected !== undefined) {
        expect(r.stdout.trim()).toBe(expected.trim());
    }
}

describe("08-modules", () => {
    describe("basic exports", () => {
        it("export let binding", () => {
            runModuleTest(
                {
                    "lib.vf": `export let x = 42;`,
                    "main.vf": `import { String } from "@vibefun/std";
import { x } from "./lib";
external console_log: (String) -> Unit = "console.log";
let _ = unsafe { console_log(String.fromInt(x)) };`,
                },
                "main.vf",
                "output",
                "42",
            );
        });

        it("export type definition", () => {
            runModuleTest(
                {
                    "types.vf": `export type Color = Red | Green | Blue;`,
                    "main.vf": `import { Color, Red } from "./types";
let c: Color = Red;`,
                },
                "main.vf",
                "compiles",
            );
        });

        it("export function", () => {
            runModuleTest(
                {
                    "math.vf": `export let add = (x: Int, y: Int) => x + y;`,
                    "main.vf": `import { String } from "@vibefun/std";
import { add } from "./math";
external console_log: (String) -> Unit = "console.log";
let _ = unsafe { console_log(String.fromInt(add(2, 3))) };`,
                },
                "main.vf",
                "output",
                "5",
            );
        });
    });

    describe("named imports", () => {
        it("named import", () => {
            runModuleTest(
                {
                    "lib.vf": `export let x = 42;
export let y = "hello";`,
                    "main.vf": `import { x, y } from "./lib";
external console_log: (String) -> Unit = "console.log";
let _ = unsafe { console_log(y) };`,
                },
                "main.vf",
                "output",
                "hello",
            );
        });
    });

    describe("namespace imports", () => {
        it("namespace import with * as", () => {
            runModuleTest(
                {
                    "lib.vf": `export let x = 42;`,
                    "main.vf": `import { String } from "@vibefun/std";
import * as Lib from "./lib";
external console_log: (String) -> Unit = "console.log";
let _ = unsafe { console_log(String.fromInt(Lib.x)) };`,
                },
                "main.vf",
                "output",
                "42",
            );
        });
    });

    describe("file extension resolution", () => {
        it(".vf extension optional in imports", () => {
            runModuleTest(
                {
                    "lib.vf": `export let x = 42;`,
                    "main.vf": `import { x } from "./lib";
let y = x;`,
                },
                "main.vf",
                "compiles",
            );
        });

        it("import with explicit .vf extension", () => {
            runModuleTest(
                {
                    "lib.vf": `export let x = 42;`,
                    "main.vf": `import { x } from "./lib.vf";
let y = x;`,
                },
                "main.vf",
                "compiles",
            );
        });
    });

    describe("module initialization order", () => {
        it("module initializes exactly once", () => {
            runModuleTest(
                {
                    "counter.vf": `external console_log: (String) -> Unit = "console.log";
let _ = unsafe { console_log("init") };
export let value = 42;`,
                    "a.vf": `import { value } from "./counter";
export let a = value;`,
                    "main.vf": `import { String } from "@vibefun/std";
import { value } from "./counter";
import { a } from "./a";
external console_log: (String) -> Unit = "console.log";
let _ = unsafe { console_log(String.fromInt(value + a)) };`,
                },
                "main.vf",
                "output",
                "init\n84",
            );
        });
    });

    describe("re-exports", () => {
        it("re-export from another module", () => {
            runModuleTest(
                {
                    "inner.vf": `export let x = 42;`,
                    "outer.vf": `export { x } from "./inner";`,
                    "main.vf": `import { String } from "@vibefun/std";
import { x } from "./outer";
external console_log: (String) -> Unit = "console.log";
let _ = unsafe { console_log(String.fromInt(x)) };`,
                },
                "main.vf",
                "output",
                "42",
            );
        });

        it("export wildcard re-export", () => {
            runModuleTest(
                {
                    "inner.vf": `export let x = 42;
export let y = "hello";`,
                    "outer.vf": `export * from "./inner";`,
                    "main.vf": `import { x, y } from "./outer";
external console_log: (String) -> Unit = "console.log";
let _ = unsafe { console_log(y) };`,
                },
                "main.vf",
                "output",
                "hello",
            );
        });
    });

    describe("index files", () => {
        it("index.vf resolution for directory imports", () => {
            runModuleTest(
                {
                    "lib/index.vf": `export let x = 42;`,
                    "main.vf": `import { String } from "@vibefun/std";
import { x } from "./lib";
external console_log: (String) -> Unit = "console.log";
let _ = unsafe { console_log(String.fromInt(x)) };`,
                },
                "main.vf",
                "output",
                "42",
            );
        });
    });

    describe("type imports", () => {
        it("type import", () => {
            runModuleTest(
                {
                    "types.vf": `export type Color = Red | Green | Blue;`,
                    "main.vf": `import type { Color } from "./types";
import { Red } from "./types";
let c: Color = Red;`,
                },
                "main.vf",
                "compiles",
            );
        });

        it("mixed type and value import", () => {
            runModuleTest(
                {
                    "lib.vf": `export type Color = Red | Green | Blue;
export let defaultColor = Red;`,
                    "main.vf": `import { type Color, defaultColor } from "./lib";
let c: Color = defaultColor;`,
                },
                "main.vf",
                "compiles",
            );
        });
    });

    describe("error cases", () => {
        it("self-import is error", () => {
            runModuleTest(
                {
                    "main.vf": `import { x } from "./main";
export let x = 42;`,
                },
                "main.vf",
                "compileError",
            );
        });

        it("import missing module is error", () => {
            runModuleTest(
                {
                    "main.vf": `import { x } from "./nonexistent";
let y = x;`,
                },
                "main.vf",
                "compileError",
            );
        });
    });

    describe("external declarations", () => {
        it("exported external declaration", () => {
            runModuleTest(
                {
                    "ffi.vf": `export external math_floor: (Float) -> Int = "Math.floor";`,
                    "main.vf": `import { String } from "@vibefun/std";
import { math_floor } from "./ffi";
external console_log: (String) -> Unit = "console.log";
let result = unsafe { math_floor(3.7) };
let _ = unsafe { console_log(String.fromInt(result)) };`,
                },
                "main.vf",
                "output",
                "3",
            );
        });
    });
});
