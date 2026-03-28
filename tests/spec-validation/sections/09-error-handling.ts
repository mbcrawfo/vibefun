/**
 * Spec validation tests for Section 09: Error Handling
 *
 * Covers: division by zero, integer overflow, float special values,
 * panic, Result/Option types.
 */

import { expectRunOutput, expectRuntimeError, withOutput } from "../framework/helpers.js";
import { test } from "../framework/runner.js";

const S = "09-error-handling";

// --- Division by Zero ---

test(S, "09-error-handling.md", "integer division by zero panics", () => expectRuntimeError(`let x: Int = 1 / 0;`));

test(S, "09-error-handling.md", "float division by zero returns Infinity", () =>
    expectRunOutput(withOutput(`let x = 1.0 / 0.0;`, `String.fromFloat(x)`), "Infinity"),
);

test(S, "09-error-handling.md", "float 0/0 returns NaN", () =>
    expectRunOutput(withOutput(`let x = 0.0 / 0.0;`, `String.fromFloat(x)`), "NaN"),
);

// --- Float Special Values ---

test(S, "09-error-handling.md", "negative float division by zero returns -Infinity", () =>
    expectRunOutput(withOutput(`let x = -1.0 / 0.0;`, `String.fromFloat(x)`), "-Infinity"),
);

// --- Result Type ---

test(S, "09-error-handling.md", "Result type - Ok variant", () =>
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
    ),
);

test(S, "09-error-handling.md", "Result type - Err variant", () =>
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
    ),
);

// --- Option Type ---

test(S, "09-error-handling.md", "Option type - Some variant", () =>
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
    ),
);

test(S, "09-error-handling.md", "Option type - None variant", () =>
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
    ),
);

// --- Result/Option composition ---

test(S, "09-error-handling.md", "nested Result in Option", () =>
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
    ),
);
