/**
 * Spec validation: Section 08 — Modules.
 *
 * Covers exports, imports (named/namespace/type), re-exports, module
 * initialization, circular dependencies. Module tests need real files
 * on disk, so each test materializes a temp project via
 * `createTempProject` and disposes it in `afterEach`.
 */

import { afterEach, describe, it } from "vitest";

import { createTempProject, expectFileCompileError, expectFileCompiles, expectFileRunOutput } from "./helpers.js";

let activeProjects: Array<{ dir: string; dispose: () => void }> = [];

afterEach(() => {
    for (const p of activeProjects) {
        p.dispose();
    }
    activeProjects = [];
});

function project(files: Record<string, string>): { dir: string; dispose: () => void } {
    const p = createTempProject(files);
    activeProjects.push(p);
    return p;
}

describe("08-modules", () => {
    describe("basic exports", () => {
        it("export let binding", () => {
            const p = project({
                "lib.vf": `export let x = 42;`,
                "main.vf": `import { String } from "@vibefun/std";
import { x } from "./lib";
external console_log: (String) -> Unit = "console.log";
let _ = unsafe { console_log(String.fromInt(x)) };`,
            });
            expectFileRunOutput("main.vf", p.dir, "42");
        });

        it("export type definition", () => {
            const p = project({
                "types.vf": `export type Color = Red | Green | Blue;`,
                "main.vf": `import { Color, Red } from "./types";
let c: Color = Red;`,
            });
            expectFileCompiles("main.vf", p.dir);
        });

        it("export function", () => {
            const p = project({
                "math.vf": `export let add = (x: Int, y: Int) => x + y;`,
                "main.vf": `import { String } from "@vibefun/std";
import { add } from "./math";
external console_log: (String) -> Unit = "console.log";
let _ = unsafe { console_log(String.fromInt(add(2, 3))) };`,
            });
            expectFileRunOutput("main.vf", p.dir, "5");
        });
    });

    describe("named imports", () => {
        it("named import", () => {
            const p = project({
                "lib.vf": `export let x = 42;
export let y = "hello";`,
                "main.vf": `import { x, y } from "./lib";
external console_log: (String) -> Unit = "console.log";
let _ = unsafe { console_log(y) };`,
            });
            expectFileRunOutput("main.vf", p.dir, "hello");
        });
    });

    describe("namespace imports", () => {
        it("namespace import with * as", () => {
            const p = project({
                "lib.vf": `export let x = 42;`,
                "main.vf": `import { String } from "@vibefun/std";
import * as Lib from "./lib";
external console_log: (String) -> Unit = "console.log";
let _ = unsafe { console_log(String.fromInt(Lib.x)) };`,
            });
            expectFileRunOutput("main.vf", p.dir, "42");
        });
    });

    describe("file extension resolution", () => {
        it(".vf extension optional in imports", () => {
            const p = project({
                "lib.vf": `export let x = 42;`,
                "main.vf": `import { x } from "./lib";
let y = x;`,
            });
            expectFileCompiles("main.vf", p.dir);
        });

        it("import with explicit .vf extension", () => {
            const p = project({
                "lib.vf": `export let x = 42;`,
                "main.vf": `import { x } from "./lib.vf";
let y = x;`,
            });
            expectFileCompiles("main.vf", p.dir);
        });
    });

    describe("module initialization order", () => {
        it("module initializes exactly once", () => {
            const p = project({
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
            });
            expectFileRunOutput("main.vf", p.dir, "init\n84");
        });
    });

    describe("re-exports", () => {
        it("re-export from another module", () => {
            const p = project({
                "inner.vf": `export let x = 42;`,
                "outer.vf": `export { x } from "./inner";`,
                "main.vf": `import { String } from "@vibefun/std";
import { x } from "./outer";
external console_log: (String) -> Unit = "console.log";
let _ = unsafe { console_log(String.fromInt(x)) };`,
            });
            expectFileRunOutput("main.vf", p.dir, "42");
        });

        it("export wildcard re-export", () => {
            const p = project({
                "inner.vf": `export let x = 42;
export let y = "hello";`,
                "outer.vf": `export * from "./inner";`,
                "main.vf": `import { x, y } from "./outer";
external console_log: (String) -> Unit = "console.log";
let _ = unsafe { console_log(y) };`,
            });
            expectFileRunOutput("main.vf", p.dir, "hello");
        });
    });

    describe("index files", () => {
        it("index.vf resolution for directory imports", () => {
            const p = project({
                "lib/index.vf": `export let x = 42;`,
                "main.vf": `import { String } from "@vibefun/std";
import { x } from "./lib";
external console_log: (String) -> Unit = "console.log";
let _ = unsafe { console_log(String.fromInt(x)) };`,
            });
            expectFileRunOutput("main.vf", p.dir, "42");
        });
    });

    describe("type imports", () => {
        it("type import", () => {
            const p = project({
                "types.vf": `export type Color = Red | Green | Blue;`,
                "main.vf": `import type { Color } from "./types";
import { Red } from "./types";
let c: Color = Red;`,
            });
            expectFileCompiles("main.vf", p.dir);
        });

        it("mixed type and value import", () => {
            const p = project({
                "lib.vf": `export type Color = Red | Green | Blue;
export let defaultColor = Red;`,
                "main.vf": `import { type Color, defaultColor } from "./lib";
let c: Color = defaultColor;`,
            });
            expectFileCompiles("main.vf", p.dir);
        });
    });

    describe("error cases", () => {
        it("self-import is error", () => {
            const p = project({
                "main.vf": `import { x } from "./main";
export let x = 42;`,
            });
            expectFileCompileError("main.vf", p.dir);
        });

        it("import missing module is error", () => {
            const p = project({
                "main.vf": `import { x } from "./nonexistent";
let y = x;`,
            });
            expectFileCompileError("main.vf", p.dir);
        });
    });

    describe("external declarations", () => {
        it("exported external declaration", () => {
            const p = project({
                "ffi.vf": `export external math_floor: (Float) -> Int = "Math.floor";`,
                "main.vf": `import { String } from "@vibefun/std";
import { math_floor } from "./ffi";
external console_log: (String) -> Unit = "console.log";
let result = unsafe { math_floor(3.7) };
let _ = unsafe { console_log(String.fromInt(result)) };`,
            });
            expectFileRunOutput("main.vf", p.dir, "3");
        });
    });
});
