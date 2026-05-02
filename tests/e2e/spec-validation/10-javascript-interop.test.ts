/**
 * Spec validation: Section 10 — JavaScript Interop.
 *
 * Covers external declarations, unsafe blocks, type safety at the FFI
 * boundary.
 */

import { describe, it } from "vitest";

import { expectCompileError, expectCompiles, expectRunOutput, withOutput } from "./helpers.js";

describe("10-javascript-interop", () => {
    describe("external declarations", () => {
        it("external function declaration", () => {
            expectCompiles(`external console_log: (String) -> Unit = "console.log";`);
        });

        it("external with module import", () => {
            expectRunOutput(
                withOutput(
                    `external basename: (String) -> String = "basename" from "node:path";
let result = unsafe { basename("/tmp/file.txt") };`,
                    `result`,
                ),
                "file.txt",
            );
        });

        it("external block syntax", () => {
            expectCompiles(
                `external {
  log: (String) -> Unit = "console.log";
  warn: (String) -> Unit = "console.warn";
};`,
            );
        });

        it("generic external declaration", () => {
            expectCompiles(`external json_stringify: <T>(T) -> String = "JSON.stringify";`);
        });

        it("exported external declaration", () => {
            expectCompiles(`export external console_log: (String) -> Unit = "console.log";`);
        });
    });

    describe("unsafe blocks", () => {
        it("unsafe block required for external calls", () => {
            expectRunOutput(
                `external console_log: (String) -> Unit = "console.log";
let _ = unsafe { console_log("hello") };`,
                "hello",
            );
        });

        it("unsafe block as expression returns value", () => {
            expectRunOutput(
                withOutput(
                    `external math_floor: (Float) -> Int = "Math.floor";
let result = unsafe { math_floor(3.7) };`,
                    `String.fromInt(result)`,
                ),
                "3",
            );
        });

        it("calling external without unsafe is error", () => {
            expectCompileError(
                `external console_log: (String) -> Unit = "console.log";
let _ = console_log("hello");`,
                "VF4805",
            );
        });

        it("nested unsafe blocks allowed", () => {
            expectRunOutput(
                withOutput(
                    `external math_abs: (Int) -> Int = "Math.abs";
let result = unsafe {
  let inner = unsafe { math_abs(-5) };
  inner;
};`,
                    `String.fromInt(result)`,
                ),
                "5",
            );
        });

        it("try-catch in unsafe block", () => {
            expectRunOutput(
                withOutput(
                    `external json_parse: (String) -> Int = "JSON.parse";
let result = unsafe {
  try {
    json_parse("not json");
  } catch (e) {
    0;
  }
};`,
                    `String.fromInt(result)`,
                ),
                "0",
            );
        });
    });

    describe("type safety", () => {
        it("external declaration type checked at use site", () => {
            expectCompileError(
                `external parseInt: (String) -> Int = "parseInt";
let result = unsafe { parseInt(42) };`,
            );
        });

        it("external function used in pipe", () => {
            expectRunOutput(
                withOutput(
                    `external math_abs: (Int) -> Int = "Math.abs";
let result = unsafe { -5 |> math_abs };`,
                    `String.fromInt(result)`,
                ),
                "5",
            );
        });

        it("wrap external in safe function", () => {
            expectRunOutput(
                withOutput(
                    `external math_sqrt: (Float) -> Float = "Math.sqrt";
let safeSqrt = (x: Float) => unsafe { math_sqrt(x) };
let result = safeSqrt(9.0);`,
                    `String.fromFloat(result)`,
                ),
                "3",
            );
        });
    });
});
