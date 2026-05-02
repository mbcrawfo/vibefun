/**
 * Spec validation: Section 05 — Pattern Matching.
 *
 * Covers literal/variable/wildcard patterns, variant/list/record
 * patterns, nested patterns, guards, or-patterns, exhaustiveness.
 */

import { describe, it } from "vitest";

import { expectCompileError, expectCompiles, expectRunOutput, withOutput } from "./helpers.js";

describe("05-pattern-matching", () => {
    describe("pattern basics", () => {
        it("match expression basic structure", () => {
            expectRunOutput(
                withOutput(
                    `let x = 42;
let result = match x {
  | 42 => "found"
  | _ => "other"
};`,
                    `result`,
                ),
                "found",
            );
        });

        it("literal pattern matching - int", () => {
            expectRunOutput(
                withOutput(
                    `let result = match 1 {
  | 0 => "zero"
  | 1 => "one"
  | _ => "other"
};`,
                    `result`,
                ),
                "one",
            );
        });

        it("literal pattern matching - string", () => {
            expectRunOutput(
                withOutput(
                    `let result = match "hello" {
  | "hello" => "hi"
  | _ => "unknown"
};`,
                    `result`,
                ),
                "hi",
            );
        });

        it("literal pattern matching - bool", () => {
            expectRunOutput(
                withOutput(
                    `let result = match true {
  | true => "yes"
  | false => "no"
};`,
                    `result`,
                ),
                "yes",
            );
        });

        it("variable pattern binds value", () => {
            expectRunOutput(
                withOutput(
                    `let result = match 42 {
  | x => String.fromInt(x)
};`,
                    `result`,
                ),
                "42",
            );
        });

        it("wildcard pattern matches anything", () => {
            expectRunOutput(
                withOutput(
                    `let result = match 99 {
  | 0 => "zero"
  | _ => "other"
};`,
                    `result`,
                ),
                "other",
            );
        });

        it("first matching pattern wins", () => {
            expectRunOutput(
                withOutput(
                    `let result = match 1 {
  | 1 => "first"
  | 1 => "second"
  | _ => "other"
};`,
                    `result`,
                ),
                "first",
            );
        });
    });

    describe("variant patterns", () => {
        it("variant pattern - Some", () => {
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

        it("variant pattern - None", () => {
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

    describe("list patterns", () => {
        it("list pattern - empty", () => {
            expectRunOutput(
                withOutput(
                    `let xs: List<Int> = [];
let result = match xs {
  | [] => "empty"
  | _ => "not empty"
};`,
                    `result`,
                ),
                "empty",
            );
        });

        it("list pattern - single element", () => {
            expectRunOutput(
                withOutput(
                    `let xs = [42];
let result = match xs {
  | [x] => String.fromInt(x)
  | _ => "other"
};`,
                    `result`,
                ),
                "42",
            );
        });

        it("list pattern - head and tail", () => {
            expectRunOutput(
                withOutput(
                    `let xs = [1, 2, 3];
let result = match xs {
  | [head, ...tail] => String.fromInt(head)
  | [] => "empty"
};`,
                    `result`,
                ),
                "1",
            );
        });

        it("list pattern - specific length", () => {
            expectRunOutput(
                withOutput(
                    `let xs = [1, 2];
let result = match xs {
  | [a, b] => String.fromInt(a + b)
  | _ => "other"
};`,
                    `result`,
                ),
                "3",
            );
        });

        it("multiple list length patterns", () => {
            expectRunOutput(
                withOutput(
                    `let describe = (xs: List<Int>) => match xs {
  | [] => "empty"
  | [_] => "one"
  | [_, _] => "two"
  | _ => "many"
};
let result = describe([1, 2]);`,
                    `result`,
                ),
                "two",
            );
        });

        it("list spread not at end is error", () => {
            expectCompileError(
                `let f = (xs: List<Int>) => match xs {
  | [a, ...middle, z] => a
  | _ => 0
};`,
            );
        });
    });

    describe("record patterns", () => {
        it("record pattern - partial match", () => {
            expectRunOutput(
                withOutput(
                    `let p = { name: "Alice", age: 30 };
let result = match p {
  | { name } => name
};`,
                    `result`,
                ),
                "Alice",
            );
        });

        it("record pattern with literal value", () => {
            expectRunOutput(
                withOutput(
                    `let p = { status: "active", name: "Alice" };
let result = match p {
  | { status: "active", name } => "active: " & name
  | { name } => "inactive: " & name
};`,
                    `result`,
                ),
                "active: Alice",
            );
        });

        it("record pattern - nested", () => {
            expectRunOutput(
                withOutput(
                    `let obj = { profile: { name: "Bob" } };
let result = match obj {
  | { profile: { name } } => name
};`,
                    `result`,
                ),
                "Bob",
            );
        });

        it("record pattern with field rename", () => {
            expectRunOutput(
                withOutput(
                    `let p = { name: "Alice", age: 30 };
let result = match p {
  | { name: n } => n
};`,
                    `result`,
                ),
                "Alice",
            );
        });

        it("record pattern with keyword field binding", () => {
            expectRunOutput(
                withOutput(
                    `let node = { type: "identifier", value: "x" };
let result = match node {
  | { type: t, value: v } => t & ": " & v
};`,
                    `result`,
                ),
                "identifier: x",
            );
        });
    });

    describe("advanced patterns", () => {
        it("nested variant in variant", () => {
            expectRunOutput(
                withOutput(
                    `type Option<T> = Some(T) | None;
type Result<T, E> = Ok(T) | Err(E);
let x: Result<Option<Int>, String> = Ok(Some(42));
let result = match x {
  | Ok(Some(v)) => String.fromInt(v)
  | Ok(None) => "none"
  | Err(e) => e
};`,
                    `result`,
                ),
                "42",
            );
        });

        it("pattern guard (when clause)", () => {
            expectRunOutput(
                withOutput(
                    `let classify = (n: Int) => match n {
  | x when x > 0 => "positive"
  | x when x < 0 => "negative"
  | _ => "zero"
};
let result = classify(5);`,
                    `result`,
                ),
                "positive",
            );
        });

        it("pattern guard - zero case", () => {
            expectRunOutput(
                withOutput(
                    `let classify = (n: Int) => match n {
  | x when x > 0 => "positive"
  | x when x < 0 => "negative"
  | _ => "zero"
};
let result = classify(0);`,
                    `result`,
                ),
                "zero",
            );
        });

        it("or-pattern with literals", () => {
            expectRunOutput(
                withOutput(
                    `let result = match 2 {
  | 0 | 1 | 2 => "small"
  | _ => "big"
};`,
                    `result`,
                ),
                "small",
            );
        });

        it("or-pattern with variant constructors", () => {
            expectRunOutput(
                withOutput(
                    `type Color = Red | Green | Blue;
let c = Green;
let result = match c {
  | Red | Green | Blue => "primary"
};`,
                    `result`,
                ),
                "primary",
            );
        });

        it("or-pattern cannot bind variables", () => {
            expectCompileError(
                `type Option<T> = Some(T) | None;
let f = (o: Option<Int>) => match o {
  | Some(x) | None => 0
};`,
            );
        });

        it("or-pattern nested in constructor", () => {
            expectRunOutput(
                withOutput(
                    `type Result<T, E> = Ok(T) | Err(E);
let x: Result<String, String> = Ok("a");
let result = match x {
  | Ok("a" | "b") => "matched"
  | Ok(_) => "other"
  | Err(_) => "error"
};`,
                    `result`,
                ),
                "matched",
            );
        });

        it("nested variant in list", () => {
            expectRunOutput(
                withOutput(
                    `type Option<T> = Some(T) | None;
let xs: List<Option<Int>> = [Some(1), Some(2)];
let result = match xs {
  | [Some(a), Some(b), ...rest] => String.fromInt(a + b)
  | _ => "other"
};`,
                    `result`,
                ),
                "3",
            );
        });

        it("nested list in variant", () => {
            expectRunOutput(
                withOutput(
                    `type Result<T, E> = Ok(T) | Err(E);
let x: Result<List<Int>, String> = Ok([10, 20, 30]);
let result = match x {
  | Ok([first, ...rest]) => String.fromInt(first)
  | Ok([]) => "empty"
  | Err(e) => e
};`,
                    `result`,
                ),
                "10",
            );
        });

        it("nested record in list", () => {
            expectRunOutput(
                withOutput(
                    `let items = [{ name: "Alice" }, { name: "Bob" }];
let result = match items {
  | [{ name }, ...rest] => name
  | [] => "empty"
};`,
                    `result`,
                ),
                "Alice",
            );
        });

        it("failing guard falls through to next pattern", () => {
            expectRunOutput(
                withOutput(
                    `let classify = (n: Int) => match n {
  | x when x > 100 => "big"
  | x when x > 0 => "positive"
  | _ => "other"
};
let result = classify(50);`,
                    `result`,
                ),
                "positive",
            );
        });
    });

    describe("exhaustiveness", () => {
        it("exhaustive match on bool", () => {
            expectCompiles(
                `let f = (b: Bool) => match b {
  | true => "yes"
  | false => "no"
};`,
            );
        });

        it("exhaustive match on variant", () => {
            expectCompiles(
                `type Option<T> = Some(T) | None;
let f = (o: Option<Int>) => match o {
  | Some(x) => x
  | None => 0
};`,
            );
        });

        it("exhaustive match on list with wildcard", () => {
            expectCompiles(
                `let f = (xs: List<Int>) => match xs {
  | [] => 0
  | [x, ...rest] => x
};`,
            );
        });

        it("non-exhaustive match produces warning or error", () => {
            expectCompileError(
                `type Option<T> = Some(T) | None;
let f = (o: Option<Int>) => match o {
  | Some(x) => x
};`,
            );
        });

        it("wildcard catches all Int values", () => {
            expectCompiles(
                `let f = (n: Int) => match n {
  | 0 => "zero"
  | _ => "other"
};`,
            );
        });

        it("tuple pattern matching with correct arity", () => {
            expectRunOutput(
                withOutput(
                    `let pair = (1, 2);
let result = match pair {
  | (a, b) => String.fromInt(a + b)
};`,
                    `result`,
                ),
                "3",
            );
        });

        it("guards do not affect exhaustiveness", () => {
            expectCompileError(
                `let classify = (n: Int) => match n {
  | x when x > 0 => "positive"
  | x when x < 0 => "negative"
};`,
            );
        });

        it("tuple pattern with literal values", () => {
            expectRunOutput(
                withOutput(
                    `let classify = (pair: (Int, Int)) => match pair {
  | (0, 0) => "origin"
  | (0, _) => "y-axis"
  | (_, 0) => "x-axis"
  | _ => "general"
};
let result = classify((0, 0));`,
                    `result`,
                ),
                "origin",
            );
        });

        it("unreachable pattern after wildcard", () => {
            expectCompileError(
                `let f = (n: Int) => match n {
  | _ => "any"
  | 0 => "zero"
};`,
            );
        });
    });
});
