/**
 * Spec validation: Section 11 — Standard Library.
 *
 * Covers List, Option, Result, String, Int, Float, Math operations
 * available through the compiler's built-in modules.
 */

import { describe, it } from "vitest";

import { expectRunOutput, withOutput } from "./helpers.js";

describe("11-stdlib", () => {
    describe("string", () => {
        it("String.fromInt", () => {
            expectRunOutput(withOutput(`let x = String.fromInt(42);`, `x`), "42");
        });

        it("String.fromFloat", () => {
            expectRunOutput(withOutput(`let x = String.fromFloat(3.14);`, `x`), "3.14");
        });

        it("String.fromBool", () => {
            expectRunOutput(withOutput(`let x = String.fromBool(true);`, `x`), "true");
        });

        it("String.length", () => {
            expectRunOutput(withOutput(`let x = String.length("hello");`, `String.fromInt(x)`), "5");
        });

        it("String concatenation with &", () => {
            expectRunOutput(withOutput(`let x = "hello" & " " & "world";`, `x`), "hello world");
        });

        it("String.toUpperCase", () => {
            expectRunOutput(withOutput(`let x = String.toUpperCase("hello");`, `x`), "HELLO");
        });

        it("String.toLowerCase", () => {
            expectRunOutput(withOutput(`let x = String.toLowerCase("HELLO");`, `x`), "hello");
        });

        it("String.trim", () => {
            expectRunOutput(withOutput(`let x = String.trim("  hello  ");`, `x`), "hello");
        });

        it("String.contains", () => {
            expectRunOutput(
                withOutput(`let x = String.contains("hello world", "world");`, `String.fromBool(x)`),
                "true",
            );
        });

        it("String.startsWith", () => {
            expectRunOutput(
                withOutput(`let x = String.startsWith("hello world", "hello");`, `String.fromBool(x)`),
                "true",
            );
        });

        it("String.endsWith", () => {
            expectRunOutput(
                withOutput(`let x = String.endsWith("hello world", "world");`, `String.fromBool(x)`),
                "true",
            );
        });

        it("String.split", () => {
            expectRunOutput(
                withOutput(`let parts = String.split("a,b,c", ",");`, `String.fromInt(List.length(parts))`),
                "3",
            );
        });

        it("String.toInt returns Option", () => {
            expectRunOutput(
                withOutput(
                    `let result = String.toInt("42");`,
                    `match result {
  | Some(n) => String.fromInt(n)
  | None => "none"
}`,
                ),
                "42",
            );
        });

        it("String.toFloat returns Option", () => {
            expectRunOutput(
                withOutput(
                    `let result = String.toFloat("3.14");`,
                    `match result {
  | Some(f) => String.fromFloat(f)
  | None => "none"
}`,
                ),
                "3.14",
            );
        });
    });

    describe("numeric conversions", () => {
        it("Int.toFloat conversion", () => {
            expectRunOutput(withOutput(`let x = Int.toFloat(42);`, `String.fromFloat(x)`), "42");
        });

        it("Float.toInt truncation", () => {
            expectRunOutput(withOutput(`let x = Float.toInt(3.7);`, `String.fromInt(x)`), "3");
        });

        it("Int.abs", () => {
            expectRunOutput(withOutput(`let x = Int.abs(-5);`, `String.fromInt(x)`), "5");
        });

        it("Int.max", () => {
            expectRunOutput(withOutput(`let x = Int.max(3, 7);`, `String.fromInt(x)`), "7");
        });

        it("Int.min", () => {
            expectRunOutput(withOutput(`let x = Int.min(3, 7);`, `String.fromInt(x)`), "3");
        });

        it("Float.abs", () => {
            expectRunOutput(withOutput(`let x = Float.abs(-3.14);`, `String.fromFloat(x)`), "3.14");
        });

        it("Float.isNaN", () => {
            expectRunOutput(withOutput(`let x = Float.isNaN(0.0 / 0.0);`, `String.fromBool(x)`), "true");
        });

        it("Float.isInfinite", () => {
            expectRunOutput(withOutput(`let x = Float.isInfinite(1.0 / 0.0);`, `String.fromBool(x)`), "true");
        });

        it("Float.isFinite", () => {
            expectRunOutput(withOutput(`let x = Float.isFinite(3.14);`, `String.fromBool(x)`), "true");
        });

        it("Float.floor", () => {
            expectRunOutput(withOutput(`let x = Float.floor(3.7);`, `String.fromInt(x)`), "3");
        });

        it("Float.ceil", () => {
            expectRunOutput(withOutput(`let x = Float.ceil(3.2);`, `String.fromInt(x)`), "4");
        });

        it("Float.round", () => {
            expectRunOutput(withOutput(`let x = Float.round(3.5);`, `String.fromInt(x)`), "4");
        });
    });

    describe("list", () => {
        it("List.map", () => {
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
            );
        });

        it("List.filter", () => {
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
            );
        });

        it("List.head returns Option", () => {
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
            );
        });

        it("List.head on empty list returns None", () => {
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
            );
        });

        it("List.tail returns Option", () => {
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
            );
        });

        it("List.length", () => {
            expectRunOutput(
                withOutput(
                    `let xs = [1, 2, 3];
let n = List.length(xs);`,
                    `String.fromInt(n)`,
                ),
                "3",
            );
        });

        it("List.reverse", () => {
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
            );
        });

        it("List.fold", () => {
            expectRunOutput(
                withOutput(
                    `let xs = [1, 2, 3, 4, 5];
let sum = List.fold(xs, 0, (acc: Int, x: Int) => acc + x);`,
                    `String.fromInt(sum)`,
                ),
                "15",
            );
        });

        it("List.foldRight", () => {
            expectRunOutput(
                withOutput(
                    `let xs = [1, 2, 3];
let result = List.foldRight(xs, "", (x: Int, acc: String) => acc & String.fromInt(x));`,
                    `result`,
                ),
                "321",
            );
        });

        it("List.concat", () => {
            expectRunOutput(
                withOutput(
                    `let a = [1, 2];
let b = [3, 4];
let c = List.concat(a, b);
let len = List.length(c);`,
                    `String.fromInt(len)`,
                ),
                "4",
            );
        });

        it("List.flatten", () => {
            expectRunOutput(
                withOutput(
                    `let nested = [[1, 2], [3, 4], [5]];
let flat = List.flatten(nested);
let len = List.length(flat);`,
                    `String.fromInt(len)`,
                ),
                "5",
            );
        });

        it("empty list length", () => {
            expectRunOutput(
                withOutput(
                    `let xs: List<Int> = [];
let n = List.length(xs);`,
                    `String.fromInt(n)`,
                ),
                "0",
            );
        });
    });

    describe("option", () => {
        it("Option.map", () => {
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
            );
        });

        it("Option.flatMap", () => {
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
            );
        });

        it("Option.getOrElse", () => {
            expectRunOutput(
                withOutput(
                    `let x: Option<Int> = None;
let result = Option.getOrElse(x, 42);`,
                    `String.fromInt(result)`,
                ),
                "42",
            );
        });

        it("Option.isSome", () => {
            expectRunOutput(
                withOutput(
                    `let x: Option<Int> = Some(5);
let result = Option.isSome(x);`,
                    `String.fromBool(result)`,
                ),
                "true",
            );
        });

        it("Option.isNone", () => {
            expectRunOutput(
                withOutput(
                    `let x: Option<Int> = None;
let result = Option.isNone(x);`,
                    `String.fromBool(result)`,
                ),
                "true",
            );
        });
    });

    describe("result", () => {
        it("Result.map", () => {
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
            );
        });

        it("Result.mapErr", () => {
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
            );
        });

        it("Result.flatMap", () => {
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
            );
        });

        it("Result.unwrapOr", () => {
            expectRunOutput(
                withOutput(
                    `let x: Result<Int, String> = Err("failed");
let result = Result.unwrapOr(x, 0);`,
                    `String.fromInt(result)`,
                ),
                "0",
            );
        });

        it("Result.isOk", () => {
            expectRunOutput(
                withOutput(
                    `let x: Result<Int, String> = Ok(42);
let result = Result.isOk(x);`,
                    `String.fromBool(result)`,
                ),
                "true",
            );
        });

        it("Result.isErr", () => {
            expectRunOutput(
                withOutput(
                    `let x: Result<Int, String> = Err("bad");
let result = Result.isErr(x);`,
                    `String.fromBool(result)`,
                ),
                "true",
            );
        });
    });

    describe("math (via external)", () => {
        it("Math.sqrt via external", () => {
            expectRunOutput(
                withOutput(
                    `external math_sqrt: (Float) -> Float = "Math.sqrt";
let result = unsafe { math_sqrt(9.0) };`,
                    `String.fromFloat(result)`,
                ),
                "3",
            );
        });

        it("Math.floor via external", () => {
            expectRunOutput(
                withOutput(
                    `external math_floor: (Float) -> Float = "Math.floor";
let result = unsafe { math_floor(3.7) };`,
                    `String.fromFloat(result)`,
                ),
                "3",
            );
        });

        it("Math.ceil via external", () => {
            expectRunOutput(
                withOutput(
                    `external math_ceil: (Float) -> Float = "Math.ceil";
let result = unsafe { math_ceil(3.2) };`,
                    `String.fromFloat(result)`,
                ),
                "4",
            );
        });

        it("Math.abs via external", () => {
            expectRunOutput(
                withOutput(
                    `external math_abs: (Float) -> Float = "Math.abs";
let result = unsafe { math_abs(-5.0) };`,
                    `String.fromFloat(result)`,
                ),
                "5",
            );
        });
    });
});
