/**
 * Spec validation: Section 09 — Error Handling.
 *
 * Covers division by zero, integer overflow, float special values,
 * panic, Result/Option types.
 */

import { describe, it } from "vitest";

import { expectRunOutput, expectRuntimeError, withOutput } from "./helpers.js";

describe("09-error-handling", () => {
    describe("division by zero", () => {
        it("integer division by zero panics", () => {
            expectRuntimeError(`let x: Int = 1 / 0;`);
        });

        it("integer modulo by zero panics", () => {
            expectRuntimeError(`let x: Int = 1 % 0;`);
        });

        it("float division by zero returns Infinity", () => {
            expectRunOutput(withOutput(`let x = 1.0 / 0.0;`, `String.fromFloat(x)`), "Infinity");
        });

        it("float 0/0 returns NaN", () => {
            expectRunOutput(withOutput(`let x = 0.0 / 0.0;`, `String.fromFloat(x)`), "NaN");
        });

        it("negative float division by zero returns -Infinity", () => {
            expectRunOutput(withOutput(`let x = -1.0 / 0.0;`, `String.fromFloat(x)`), "-Infinity");
        });
    });

    describe("float special values", () => {
        it("NaN self-equality is false", () => {
            expectRunOutput(
                withOutput(
                    `let nan = 0.0 / 0.0;
let result = nan == nan;`,
                    `String.fromBool(result)`,
                ),
                "false",
            );
        });

        it("Infinity plus one is still Infinity", () => {
            expectRunOutput(
                withOutput(
                    `let inf = 1.0 / 0.0;
let result = inf + 1.0;`,
                    `String.fromFloat(result)`,
                ),
                "Infinity",
            );
        });

        it("Infinity minus Infinity is NaN", () => {
            expectRunOutput(
                withOutput(
                    `let inf = 1.0 / 0.0;
let result = inf - inf;`,
                    `String.fromFloat(result)`,
                ),
                "NaN",
            );
        });

        it("Infinity comparison with finite number", () => {
            expectRunOutput(
                withOutput(
                    `let inf = 1.0 / 0.0;
let result = inf > 1000000.0;`,
                    `String.fromBool(result)`,
                ),
                "true",
            );
        });
    });

    describe("Result type", () => {
        it("Result type - Ok variant", () => {
            expectRunOutput(
                withOutput(
                    `type Result<T, E> = Ok(T) | Err(E);
let x: Result<Int, String> = Ok(42);
let result = match x {
  | Ok(v) => String.fromInt(v)
  | Err(e) => e
};`,
                    `result`,
                ),
                "42",
            );
        });

        it("Result type - Err variant", () => {
            expectRunOutput(
                withOutput(
                    `type Result<T, E> = Ok(T) | Err(E);
let x: Result<Int, String> = Err("failed");
let result = match x {
  | Ok(v) => String.fromInt(v)
  | Err(e) => e
};`,
                    `result`,
                ),
                "failed",
            );
        });
    });

    describe("Option type", () => {
        it("Option type - Some variant", () => {
            expectRunOutput(
                withOutput(
                    `type Option<T> = Some(T) | None;
let x = Some(42);
let result = match x {
  | Some(v) => String.fromInt(v)
  | None => "none"
};`,
                    `result`,
                ),
                "42",
            );
        });

        it("Option type - None variant", () => {
            expectRunOutput(
                withOutput(
                    `type Option<T> = Some(T) | None;
let x: Option<Int> = None;
let result = match x {
  | Some(v) => String.fromInt(v)
  | None => "none"
};`,
                    `result`,
                ),
                "none",
            );
        });
    });

    describe("composition", () => {
        it("nested Result in Option", () => {
            expectRunOutput(
                withOutput(
                    `type Option<T> = Some(T) | None;
type Result<T, E> = Ok(T) | Err(E);
let x: Option<Result<Int, String>> = Some(Ok(42));
let result = match x {
  | Some(Ok(v)) => String.fromInt(v)
  | Some(Err(e)) => e
  | None => "none"
};`,
                    `result`,
                ),
                "42",
            );
        });
    });
});
