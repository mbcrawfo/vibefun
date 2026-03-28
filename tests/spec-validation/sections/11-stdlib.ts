/**
 * Spec validation tests for Section 11: Standard Library
 *
 * Covers: List, Option, Result, String, Int, Float, Math operations.
 * Tests stdlib functions available through the compiler's built-in modules.
 */

import { expectCompiles, expectRunOutput, withOutput } from "../framework/helpers.ts";
import { test } from "../framework/runner.ts";

const S = "11-stdlib";

// --- String Functions ---

test(S, "11-stdlib/string.md", "String.fromInt", () =>
    expectRunOutput(withOutput(`let x = String.fromInt(42);`, `x`), "42"),
);

test(S, "11-stdlib/string.md", "String.fromFloat", () =>
    expectRunOutput(withOutput(`let x = String.fromFloat(3.14);`, `x`), "3.14"),
);

test(S, "11-stdlib/string.md", "String.fromBool", () =>
    expectRunOutput(withOutput(`let x = String.fromBool(true);`, `x`), "true"),
);

test(S, "11-stdlib/string.md", "String.length", () =>
    expectRunOutput(withOutput(`let x = String.length("hello");`, `String.fromInt(x)`), "5"),
);

test(S, "11-stdlib/string.md", "String concatenation with &", () =>
    expectRunOutput(withOutput(`let x = "hello" & " " & "world";`, `x`), "hello world"),
);

// --- Numeric Conversions ---

test(S, "11-stdlib/numeric.md", "Float.fromInt conversion", () =>
    expectRunOutput(withOutput(`let x = Float.fromInt(42);`, `String.fromFloat(x)`), "42"),
);

test(S, "11-stdlib/numeric.md", "Int.fromFloat truncation", () =>
    expectRunOutput(withOutput(`let x = Int.fromFloat(3.7);`, `String.fromInt(x)`), "3"),
);

// --- List Functions ---

test(S, "11-stdlib/list.md", "List.map", () =>
    expectRunOutput(
        withOutput(
            `let xs = [1, 2, 3];
let doubled = List.map(xs, (x: Int) => x * 2);`,
            `String.fromInt(List.head(doubled))`,
        ),
        "2",
    ),
);

test(S, "11-stdlib/list.md", "List.filter", () =>
    expectRunOutput(
        withOutput(
            `let xs = [1, 2, 3, 4, 5];
let evens = List.filter(xs, (x: Int) => x % 2 == 0);
let first = List.head(evens);`,
            `String.fromInt(first)`,
        ),
        "2",
    ),
);

test(S, "11-stdlib/list.md", "List.head", () =>
    expectRunOutput(
        withOutput(
            `let xs = [42, 1, 2];
let h = List.head(xs);`,
            `String.fromInt(h)`,
        ),
        "42",
    ),
);

test(S, "11-stdlib/list.md", "List.tail", () =>
    expectCompiles(
        `let xs = [1, 2, 3];
let rest = List.tail(xs);`,
    ),
);

test(S, "11-stdlib/list.md", "List.length", () =>
    expectRunOutput(
        withOutput(
            `let xs = [1, 2, 3];
let n = List.length(xs);`,
            `String.fromInt(n)`,
        ),
        "3",
    ),
);

test(S, "11-stdlib/list.md", "List.reverse", () =>
    expectRunOutput(
        withOutput(
            `let xs = [1, 2, 3];
let rev = List.reverse(xs);
let first = List.head(rev);`,
            `String.fromInt(first)`,
        ),
        "3",
    ),
);

test(S, "11-stdlib/list.md", "List.fold", () =>
    expectRunOutput(
        withOutput(
            `let xs = [1, 2, 3, 4, 5];
let sum = List.fold(xs, 0, (acc: Int, x: Int) => acc + x);`,
            `String.fromInt(sum)`,
        ),
        "15",
    ),
);

test(S, "11-stdlib/list.md", "List.concat", () =>
    expectRunOutput(
        withOutput(
            `let a = [1, 2];
let b = [3, 4];
let c = List.concat(a, b);
let len = List.length(c);`,
            `String.fromInt(len)`,
        ),
        "4",
    ),
);

test(S, "11-stdlib/list.md", "empty list", () =>
    expectRunOutput(
        withOutput(
            `let xs: List<Int> = [];
let n = List.length(xs);`,
            `String.fromInt(n)`,
        ),
        "0",
    ),
);

// --- Math Functions ---

test(S, "11-stdlib/math.md", "Math.sqrt", () =>
    expectRunOutput(
        withOutput(
            `external math_sqrt: (Float) -> Float = "Math.sqrt";
let result = unsafe { math_sqrt(9.0) };`,
            `String.fromFloat(result)`,
        ),
        "3",
    ),
);

test(S, "11-stdlib/math.md", "Math.floor", () =>
    expectRunOutput(
        withOutput(
            `external math_floor: (Float) -> Float = "Math.floor";
let result = unsafe { math_floor(3.7) };`,
            `String.fromFloat(result)`,
        ),
        "3",
    ),
);

test(S, "11-stdlib/math.md", "Math.ceil", () =>
    expectRunOutput(
        withOutput(
            `external math_ceil: (Float) -> Float = "Math.ceil";
let result = unsafe { math_ceil(3.2) };`,
            `String.fromFloat(result)`,
        ),
        "4",
    ),
);

test(S, "11-stdlib/math.md", "Math.abs", () =>
    expectRunOutput(
        withOutput(
            `external math_abs: (Float) -> Float = "Math.abs";
let result = unsafe { math_abs(-5.0) };`,
            `String.fromFloat(result)`,
        ),
        "5",
    ),
);
