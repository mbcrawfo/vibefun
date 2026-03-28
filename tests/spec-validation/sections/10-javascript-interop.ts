/**
 * Spec validation tests for Section 10: JavaScript Interop
 *
 * Covers: external declarations, unsafe blocks, type safety at FFI boundary.
 */

import { expectCompileError, expectCompiles, expectRunOutput, withOutput } from "../framework/helpers.ts";
import { test } from "../framework/runner.ts";

const S = "10-javascript-interop";

// --- External Declarations ---

test(S, "10-javascript-interop/external-declarations.md", "external function declaration", () =>
    expectCompiles(`external console_log: (String) -> Unit = "console.log";`),
);

test(S, "10-javascript-interop/external-declarations.md", "external with module import", () =>
    expectCompiles(`external readFile: (String) -> String = "readFileSync" from "node:fs";`),
);

test(S, "10-javascript-interop/external-declarations.md", "external block syntax", () =>
    expectCompiles(
        `external {
  log: (String) -> Unit = "console.log";
  warn: (String) -> Unit = "console.warn";
};`,
    ),
);

// --- Unsafe Blocks ---

test(S, "10-javascript-interop/unsafe-blocks.md", "unsafe block required for external calls", () =>
    expectRunOutput(
        `external console_log: (String) -> Unit = "console.log";
let _ = unsafe { console_log("hello") };`,
        "hello",
    ),
);

test(S, "10-javascript-interop/unsafe-blocks.md", "unsafe block as expression returns value", () =>
    expectRunOutput(
        withOutput(
            `external math_floor: (Float) -> Int = "Math.floor";
let result = unsafe { math_floor(3.7) };`,
            `String.fromInt(result)`,
        ),
        "3",
    ),
);

test(S, "10-javascript-interop/unsafe-blocks.md", "calling external without unsafe is error", () =>
    expectCompileError(
        `external console_log: (String) -> Unit = "console.log";
let _ = console_log("hello");`,
    ),
);

// --- Type Safety ---

test(S, "10-javascript-interop/type-safety.md", "external declaration type checked at use site", () =>
    expectCompileError(
        `external parseInt: (String) -> Int = "parseInt";
let result = unsafe { parseInt(42) };`,
    ),
);

test(S, "10-javascript-interop/type-safety.md", "external function used in pipe", () =>
    expectRunOutput(
        withOutput(
            `external math_abs: (Int) -> Int = "Math.abs";
let result = unsafe { -5 |> math_abs };`,
            `String.fromInt(result)`,
        ),
        "5",
    ),
);

// --- Wrapping Externals in Safe Functions ---

test(S, "10-javascript-interop/type-safety.md", "wrap external in safe function", () =>
    expectRunOutput(
        withOutput(
            `external math_sqrt: (Float) -> Float = "Math.sqrt";
let safeSqrt = (x: Float) => unsafe { math_sqrt(x) };
let result = safeSqrt(9.0);`,
            `String.fromFloat(result)`,
        ),
        "3",
    ),
);
