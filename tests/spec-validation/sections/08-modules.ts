/**
 * Spec validation tests for Section 08: Modules
 *
 * Covers: exports, imports (named/namespace/type), re-exports,
 * module initialization, circular dependencies.
 *
 * Note: Module tests require actual files on disk, so they use temp directories.
 */

import type { TestResult } from "../framework/types.ts";

import { cleanupTempDir, compileFile, createTempDir, runFile, writeTempFile } from "../framework/helpers.ts";
import { test } from "../framework/runner.ts";

const S = "08-modules";

// Helper to run a multi-file module test
function moduleTest(
    files: Record<string, string>,
    mainFile: string,
    check: "compiles" | "compileError" | "runs" | "output",
    expected?: string,
): TestResult {
    const dir = createTempDir();
    try {
        for (const [path, content] of Object.entries(files)) {
            writeTempFile(dir, path, content);
        }

        if (check === "compiles") {
            const result = compileFile(mainFile, dir);
            if (result.exitCode === 0) {
                return { status: "pass" };
            }
            return {
                status: "fail",
                message: `Expected compilation success, got exit code ${result.exitCode}`,
            };
        }

        if (check === "compileError") {
            const result = compileFile(mainFile, dir);
            if (result.exitCode !== 0) {
                return { status: "pass" };
            }
            return {
                status: "fail",
                message: `Expected compile error, but compilation succeeded`,
            };
        }

        const result = runFile(mainFile, dir);
        if (check === "runs") {
            if (result.exitCode === 0) {
                return { status: "pass" };
            }
            return {
                status: "fail",
                message: `Expected successful run, got exit code ${result.exitCode}`,
            };
        }

        // check === "output"
        if (result.exitCode !== 0) {
            return {
                status: "fail",
                message: `Expected successful run, got exit code ${result.exitCode}`,
            };
        }
        const actual = result.stdout.trim();
        const wanted = expected?.trim();
        if (wanted !== undefined && actual !== wanted) {
            return {
                status: "fail",
                message: `Expected output "${wanted}", got "${actual}"`,
            };
        }
        return { status: "pass" };
    } finally {
        cleanupTempDir(dir);
    }
}

// --- Basic Exports ---

test(S, "08-modules.md", "export let binding", () =>
    moduleTest(
        {
            "lib.vf": `export let x = 42;`,
            "main.vf": `import { x } from "./lib";
external console_log: (String) -> Unit = "console.log";
let _ = unsafe { console_log(String.fromInt(x)) };`,
        },
        "main.vf",
        "output",
        "42",
    ),
);

test(S, "08-modules.md", "export type definition", () =>
    moduleTest(
        {
            "types.vf": `export type Color = Red | Green | Blue;`,
            "main.vf": `import { Color, Red } from "./types";
let c: Color = Red;`,
        },
        "main.vf",
        "compiles",
    ),
);

test(S, "08-modules.md", "export function", () =>
    moduleTest(
        {
            "math.vf": `export let add = (x: Int, y: Int) => x + y;`,
            "main.vf": `import { add } from "./math";
external console_log: (String) -> Unit = "console.log";
let _ = unsafe { console_log(String.fromInt(add(2, 3))) };`,
        },
        "main.vf",
        "output",
        "5",
    ),
);

// --- Named Imports ---

test(S, "08-modules.md", "named import", () =>
    moduleTest(
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
    ),
);

// --- Namespace Imports ---

test(S, "08-modules.md", "namespace import with * as", () =>
    moduleTest(
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
    ),
);

// --- File Extension Resolution ---

test(S, "08-modules.md", ".vf extension optional in imports", () =>
    moduleTest(
        {
            "lib.vf": `export let x = 42;`,
            "main.vf": `import { x } from "./lib";
let y = x;`,
        },
        "main.vf",
        "compiles",
    ),
);

// --- Module Initialization Order ---

test(S, "08-modules.md", "module initializes exactly once", () =>
    moduleTest(
        {
            "counter.vf": `external console_log: (String) -> Unit = "console.log";
let _ = unsafe { console_log("init") };
export let value = 42;`,
            "a.vf": `import { value } from "./counter";
export let a = value;`,
            "main.vf": `import { value } from "./counter";
import { a } from "./a";
external console_log: (String) -> Unit = "console.log";
let _ = unsafe { console_log(String.fromInt(value + a)) };`,
        },
        "main.vf",
        "output",
        "init\n84",
    ),
);

// --- Re-exports ---

test(S, "08-modules.md", "re-export from another module", () =>
    moduleTest(
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
    ),
);

// --- Index Files ---

test(S, "08-modules.md", "index.vf resolution for directory imports", () =>
    moduleTest(
        {
            "lib/index.vf": `export let x = 42;`,
            "main.vf": `import { x } from "./lib";
external console_log: (String) -> Unit = "console.log";
let _ = unsafe { console_log(String.fromInt(x)) };`,
        },
        "main.vf",
        "output",
        "42",
    ),
);

// --- Additional Module Tests ---

test(S, "08-modules.md", "type import", () =>
    moduleTest(
        {
            "types.vf": `export type Color = Red | Green | Blue;`,
            "main.vf": `import type { Color } from "./types";
import { Red } from "./types";
let c: Color = Red;`,
        },
        "main.vf",
        "compiles",
    ),
);

test(S, "08-modules.md", "mixed type and value import", () =>
    moduleTest(
        {
            "lib.vf": `export type Color = Red | Green | Blue;
export let defaultColor = Red;`,
            "main.vf": `import { type Color, defaultColor } from "./lib";
let c: Color = defaultColor;`,
        },
        "main.vf",
        "compiles",
    ),
);

test(S, "08-modules.md", "self-import is error", () =>
    moduleTest(
        {
            "main.vf": `import { x } from "./main";
export let x = 42;`,
        },
        "main.vf",
        "compileError",
    ),
);

test(S, "08-modules.md", "export wildcard re-export", () =>
    moduleTest(
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
    ),
);

test(S, "08-modules.md", "import with explicit .vf extension", () =>
    moduleTest(
        {
            "lib.vf": `export let x = 42;`,
            "main.vf": `import { x } from "./lib.vf";
let y = x;`,
        },
        "main.vf",
        "compiles",
    ),
);

test(S, "08-modules.md", "import missing module is error", () =>
    moduleTest(
        {
            "main.vf": `import { x } from "./nonexistent";
let y = x;`,
        },
        "main.vf",
        "compileError",
    ),
);

test(S, "08-modules.md", "exported external declaration", () =>
    moduleTest(
        {
            "ffi.vf": `export external math_floor: (Float) -> Int = "Math.floor";`,
            "main.vf": `import { math_floor } from "./ffi";
external console_log: (String) -> Unit = "console.log";
let result = unsafe { math_floor(3.7) };
let _ = unsafe { console_log(String.fromInt(result)) };`,
        },
        "main.vf",
        "output",
        "3",
    ),
);
