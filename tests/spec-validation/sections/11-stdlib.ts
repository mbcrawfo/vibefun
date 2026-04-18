/**
 * Spec validation tests for Section 11: Standard Library
 *
 * Covers: List, Option, Result, String, Int, Float, Math operations.
 * Tests stdlib functions available through the compiler's built-in modules.
 */

import { expectRunOutput, withOutput } from "../framework/helpers.ts";
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

test(S, "11-stdlib/string.md", "String.toUpperCase", () =>
    expectRunOutput(withOutput(`let x = String.toUpperCase("hello");`, `x`), "HELLO"),
);

test(S, "11-stdlib/string.md", "String.toLowerCase", () =>
    expectRunOutput(withOutput(`let x = String.toLowerCase("HELLO");`, `x`), "hello"),
);

test(S, "11-stdlib/string.md", "String.trim", () =>
    expectRunOutput(withOutput(`let x = String.trim("  hello  ");`, `x`), "hello"),
);

test(S, "11-stdlib/string.md", "String.contains", () =>
    expectRunOutput(withOutput(`let x = String.contains("hello world", "world");`, `String.fromBool(x)`), "true"),
);

test(S, "11-stdlib/string.md", "String.startsWith", () =>
    expectRunOutput(withOutput(`let x = String.startsWith("hello world", "hello");`, `String.fromBool(x)`), "true"),
);

test(S, "11-stdlib/string.md", "String.endsWith", () =>
    expectRunOutput(withOutput(`let x = String.endsWith("hello world", "world");`, `String.fromBool(x)`), "true"),
);

test(S, "11-stdlib/string.md", "String.split", () =>
    expectRunOutput(withOutput(`let parts = String.split("a,b,c", ",");`, `String.fromInt(List.length(parts))`), "3"),
);

test(S, "11-stdlib/string.md", "String.toInt returns Option", () =>
    expectRunOutput(
        withOutput(
            `let result = String.toInt("42");`,
            `match result {
  | Some(n) => String.fromInt(n)
  | None => "none"
}`,
        ),
        "42",
    ),
);

test(S, "11-stdlib/string.md", "String.toFloat returns Option", () =>
    expectRunOutput(
        withOutput(
            `let result = String.toFloat("3.14");`,
            `match result {
  | Some(f) => String.fromFloat(f)
  | None => "none"
}`,
        ),
        "3.14",
    ),
);

// --- Numeric Conversions ---

test(S, "11-stdlib/numeric.md", "Int.toFloat conversion", () =>
    expectRunOutput(withOutput(`let x = Int.toFloat(42);`, `String.fromFloat(x)`), "42"),
);

test(S, "11-stdlib/numeric.md", "Float.toInt truncation", () =>
    expectRunOutput(withOutput(`let x = Float.toInt(3.7);`, `String.fromInt(x)`), "3"),
);

test(S, "11-stdlib/numeric.md", "Int.abs", () =>
    expectRunOutput(withOutput(`let x = Int.abs(-5);`, `String.fromInt(x)`), "5"),
);

test(S, "11-stdlib/numeric.md", "Int.max", () =>
    expectRunOutput(withOutput(`let x = Int.max(3, 7);`, `String.fromInt(x)`), "7"),
);

test(S, "11-stdlib/numeric.md", "Int.min", () =>
    expectRunOutput(withOutput(`let x = Int.min(3, 7);`, `String.fromInt(x)`), "3"),
);

test(S, "11-stdlib/numeric.md", "Float.abs", () =>
    expectRunOutput(withOutput(`let x = Float.abs(-3.14);`, `String.fromFloat(x)`), "3.14"),
);

test(S, "11-stdlib/numeric.md", "Float.isNaN", () =>
    expectRunOutput(withOutput(`let x = Float.isNaN(0.0 / 0.0);`, `String.fromBool(x)`), "true"),
);

test(S, "11-stdlib/numeric.md", "Float.isInfinite", () =>
    expectRunOutput(withOutput(`let x = Float.isInfinite(1.0 / 0.0);`, `String.fromBool(x)`), "true"),
);

test(S, "11-stdlib/numeric.md", "Float.isFinite", () =>
    expectRunOutput(withOutput(`let x = Float.isFinite(3.14);`, `String.fromBool(x)`), "true"),
);

test(S, "11-stdlib/numeric.md", "Float.floor", () =>
    expectRunOutput(withOutput(`let x = Float.floor(3.7);`, `String.fromInt(x)`), "3"),
);

test(S, "11-stdlib/numeric.md", "Float.ceil", () =>
    expectRunOutput(withOutput(`let x = Float.ceil(3.2);`, `String.fromInt(x)`), "4"),
);

test(S, "11-stdlib/numeric.md", "Float.round", () =>
    expectRunOutput(withOutput(`let x = Float.round(3.5);`, `String.fromInt(x)`), "4"),
);

// --- List Functions ---

test(S, "11-stdlib/list.md", "List.map", () =>
    expectRunOutput(
        withOutput(
            `let xs = [1, 2, 3];
let doubled = List.map(xs, (x: Int) => x * 2);
let first = List.head(doubled);`,
            `match first {
  | Some(v) => String.fromInt(v)
  | None => "empty"
}`,
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
            `match first {
  | Some(v) => String.fromInt(v)
  | None => "empty"
}`,
        ),
        "2",
    ),
);

test(S, "11-stdlib/list.md", "List.head returns Option", () =>
    expectRunOutput(
        withOutput(
            `let xs = [42, 1, 2];
let h = List.head(xs);`,
            `match h {
  | Some(v) => String.fromInt(v)
  | None => "empty"
}`,
        ),
        "42",
    ),
);

test(S, "11-stdlib/list.md", "List.head on empty list returns None", () =>
    expectRunOutput(
        withOutput(
            `let xs: List<Int> = [];
let h = List.head(xs);`,
            `match h {
  | Some(v) => String.fromInt(v)
  | None => "empty"
}`,
        ),
        "empty",
    ),
);

test(S, "11-stdlib/list.md", "List.tail returns Option", () =>
    expectRunOutput(
        withOutput(
            `let xs = [1, 2, 3];
let t = List.tail(xs);`,
            `match t {
  | Some(rest) => String.fromInt(List.length(rest))
  | None => "empty"
}`,
        ),
        "2",
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
            `match first {
  | Some(v) => String.fromInt(v)
  | None => "empty"
}`,
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

test(S, "11-stdlib/list.md", "List.foldRight", () =>
    expectRunOutput(
        withOutput(
            `let xs = [1, 2, 3];
let result = List.foldRight(xs, "", (x: Int, acc: String) => acc & String.fromInt(x));`,
            `result`,
        ),
        "321",
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

test(S, "11-stdlib/list.md", "List.flatten", () =>
    expectRunOutput(
        withOutput(
            `let nested = [[1, 2], [3, 4], [5]];
let flat = List.flatten(nested);
let len = List.length(flat);`,
            `String.fromInt(len)`,
        ),
        "5",
    ),
);

test(S, "11-stdlib/list.md", "empty list length", () =>
    expectRunOutput(
        withOutput(
            `let xs: List<Int> = [];
let n = List.length(xs);`,
            `String.fromInt(n)`,
        ),
        "0",
    ),
);

// --- Option Functions ---

test(S, "11-stdlib/option.md", "Option.map", () =>
    expectRunOutput(
        withOutput(
            `let x: Option<Int> = Some(5);
let result = Option.map(x, (n: Int) => n * 2);`,
            `match result {
  | Some(v) => String.fromInt(v)
  | None => "none"
}`,
        ),
        "10",
    ),
);

test(S, "11-stdlib/option.md", "Option.flatMap", () =>
    expectRunOutput(
        withOutput(
            `let x: Option<Int> = Some(5);
let result = Option.flatMap(x, (n: Int) => if n > 0 then Some(n * 2) else None);`,
            `match result {
  | Some(v) => String.fromInt(v)
  | None => "none"
}`,
        ),
        "10",
    ),
);

test(S, "11-stdlib/option.md", "Option.getOrElse", () =>
    expectRunOutput(
        withOutput(
            `let x: Option<Int> = None;
let result = Option.getOrElse(x, 42);`,
            `String.fromInt(result)`,
        ),
        "42",
    ),
);

test(S, "11-stdlib/option.md", "Option.isSome", () =>
    expectRunOutput(
        withOutput(
            `let x: Option<Int> = Some(5);
let result = Option.isSome(x);`,
            `String.fromBool(result)`,
        ),
        "true",
    ),
);

test(S, "11-stdlib/option.md", "Option.isNone", () =>
    expectRunOutput(
        withOutput(
            `let x: Option<Int> = None;
let result = Option.isNone(x);`,
            `String.fromBool(result)`,
        ),
        "true",
    ),
);

// --- Result Functions ---

test(S, "11-stdlib/result.md", "Result.map", () =>
    expectRunOutput(
        withOutput(
            `let x: Result<Int, String> = Ok(5);
let result = Result.map(x, (n: Int) => n * 2);`,
            `match result {
  | Ok(v) => String.fromInt(v)
  | Err(e) => e
}`,
        ),
        "10",
    ),
);

test(S, "11-stdlib/result.md", "Result.mapErr", () =>
    expectRunOutput(
        withOutput(
            `let x: Result<Int, String> = Err("bad");
let result = Result.mapErr(x, (e: String) => "error: " & e);`,
            `match result {
  | Ok(v) => String.fromInt(v)
  | Err(e) => e
}`,
        ),
        "error: bad",
    ),
);

test(S, "11-stdlib/result.md", "Result.flatMap", () =>
    expectRunOutput(
        withOutput(
            `let x: Result<Int, String> = Ok(5);
let result = Result.flatMap(x, (n: Int) => if n > 0 then Ok(n * 2) else Err("negative"));`,
            `match result {
  | Ok(v) => String.fromInt(v)
  | Err(e) => e
}`,
        ),
        "10",
    ),
);

test(S, "11-stdlib/result.md", "Result.unwrapOr", () =>
    expectRunOutput(
        withOutput(
            `let x: Result<Int, String> = Err("failed");
let result = Result.unwrapOr(x, 0);`,
            `String.fromInt(result)`,
        ),
        "0",
    ),
);

test(S, "11-stdlib/result.md", "Result.isOk", () =>
    expectRunOutput(
        withOutput(
            `let x: Result<Int, String> = Ok(42);
let result = Result.isOk(x);`,
            `String.fromBool(result)`,
        ),
        "true",
    ),
);

test(S, "11-stdlib/result.md", "Result.isErr", () =>
    expectRunOutput(
        withOutput(
            `let x: Result<Int, String> = Err("bad");
let result = Result.isErr(x);`,
            `String.fromBool(result)`,
        ),
        "true",
    ),
);

// --- Math Functions (via external declarations, no stdlib Math module yet) ---

test(S, "11-stdlib/math.md", "Math.sqrt via external", () =>
    expectRunOutput(
        withOutput(
            `external math_sqrt: (Float) -> Float = "Math.sqrt";
let result = unsafe { math_sqrt(9.0) };`,
            `String.fromFloat(result)`,
        ),
        "3",
    ),
);

test(S, "11-stdlib/math.md", "Math.floor via external", () =>
    expectRunOutput(
        withOutput(
            `external math_floor: (Float) -> Float = "Math.floor";
let result = unsafe { math_floor(3.7) };`,
            `String.fromFloat(result)`,
        ),
        "3",
    ),
);

test(S, "11-stdlib/math.md", "Math.ceil via external", () =>
    expectRunOutput(
        withOutput(
            `external math_ceil: (Float) -> Float = "Math.ceil";
let result = unsafe { math_ceil(3.2) };`,
            `String.fromFloat(result)`,
        ),
        "4",
    ),
);

test(S, "11-stdlib/math.md", "Math.abs via external", () =>
    expectRunOutput(
        withOutput(
            `external math_abs: (Float) -> Float = "Math.abs";
let result = unsafe { math_abs(-5.0) };`,
            `String.fromFloat(result)`,
        ),
        "5",
    ),
);
