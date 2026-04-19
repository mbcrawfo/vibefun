/**
 * End-to-end try/catch tests.
 *
 * Compiles and runs Vibefun programs that use try/catch inside unsafe
 * blocks, asserting both that the catch branch runs when the try body
 * throws and that the try value is returned on the happy path. Also
 * confirms the compiler rejects try/catch used outside unsafe.
 */

import { describe, expect, it } from "vitest";

import { runSource, withOutput } from "./helpers.js";

describe("e2e try/catch", () => {
    it("runs the catch branch when the try body throws", () => {
        const source = withOutput(
            `external json_parse: (String) -> Int = "JSON.parse";
let result = unsafe {
  try {
    json_parse("not json");
  } catch (e) {
    0;
  }
};`,
            `String.fromInt(result)`,
        );
        const result = runSource(source);
        expect(result.exitCode).toBe(0);
        expect(result.stdout.trim()).toBe("0");
    });

    it("returns the try body's value on the happy path", () => {
        const source = withOutput(
            `external identity: (Int) -> Int = "((x) => x)";
let result = unsafe {
  try {
    identity(7);
  } catch (e) {
    0;
  }
};`,
            `String.fromInt(result)`,
        );
        const result = runSource(source);
        expect(result.exitCode).toBe(0);
        expect(result.stdout.trim()).toBe("7");
    });

    it("rejects try/catch outside of an unsafe block", () => {
        const source = `let r = try { 1 } catch (e) { 0 };`;
        const result = runSource(source);
        expect(result.exitCode).not.toBe(0);
        expect(result.stderr).toContain("VF4806");
    });
});
